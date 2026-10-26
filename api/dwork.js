// D-Work API for CTD: reads and writes the Notion "D-Work" database.
// Env: NOTION_TOKEN (Notion internal integration secret), CTD_PASSWORD.
// GET            → list tasks
// POST   {title, level?, project?, type?, size?, start?, deadline?, remind?, repeat?, note?, thumb?} → create
// PATCH  {id, ...same fields, prevLevel?, currentRepeat?} → update (finishing a repeating task reschedules it)
// DELETE {id}    → move the page to Notion trash
const DS = process.env.DWORK_DATA_SOURCE || '7ace5e5a-203f-485d-a15d-0ae8c5353436';
const NV = '2025-09-03';
const LEVELS = ['P1 · Khẩn', 'P2 · Quan trọng', 'P3 · Kế hoạch', 'P4 · Khi rảnh', 'Xong'];
const REPEATS = ['Một lần', 'Hằng ngày', 'Hằng tuần', 'Hằng tháng'];
const TYPES = ['Khách', 'Tiền', 'Content', 'Học', 'Cá nhân'];
const SIZES = ['S', 'M', 'L'];

function notion(path, method, body) {
  return fetch('https://api.notion.com/v1' + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + process.env.NOTION_TOKEN,
      'Notion-Version': NV,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  }).then(async r => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.message || 'Notion error'), { status: r.status });
    return j;
  });
}

const txt = a => (a || []).map(x => x.plain_text).join('');
const sel = p => (p && p.select ? p.select.name : '');
const date = p => (p && p.date ? p.date.start : '');
function thumb(p) {
  const f = p && p.files && p.files[0];
  if (!f) return '';
  return f.type === 'external' ? f.external.url : f.file ? f.file.url : '';
}

function row(pg) {
  const P = pg.properties || {};
  return {
    id: pg.id,
    url: pg.url,
    title: txt(P['Việc'] && P['Việc'].title),
    level: sel(P['Mức']),
    project: sel(P['Dự án']),
    type: sel(P['Loại']),
    size: sel(P['Size']),
    start: date(P['Bắt đầu']),
    deadline: date(P['Deadline']),
    remind: date(P['Nhắc lại']),
    repeat: sel(P['Lặp']),
    note: txt(P['Ghi chú'] && P['Ghi chú'].rich_text),
    thumb: thumb(P['Thumb']),
    order: P['Thứ tự'] && typeof P['Thứ tự'].number === 'number' ? P['Thứ tự'].number : null,
    created: pg.created_time,
    edited: pg.last_edited_time
  };
}

// Next occurrence (Asia/Ho_Chi_Minh calendar day) for a repeating task.
function nextDate(repeat) {
  const d = new Date(Date.now() + 7 * 3600e3);
  if (repeat === 'Hằng ngày') d.setUTCDate(d.getUTCDate() + 1);
  else if (repeat === 'Hằng tuần') d.setUTCDate(d.getUTCDate() + 7);
  else if (repeat === 'Hằng tháng') d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

// a date (YYYY-MM-DD) or a date with time (YYYY-MM-DDTHH:MM[:SS][offset]); a time without offset is Vietnam time
const isDate = s => /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/.test(s);
const withTz = s => s.length > 10 && !/(Z|[+-]\d{2}:\d{2})$/.test(s) ? s + (s.length === 16 ? ':00' : '') + '+07:00' : s;
const bad = m => Object.assign(new Error(m), { status: 400, bad: true });
const rt = s => [{ type: 'text', text: { content: String(s).slice(0, 2000) } }];
const opt = (v, list, name) => {
  if (v === '' || v == null) return { select: null };
  if (list && !list.includes(v)) throw bad(name + ' không hợp lệ.');
  return { select: { name: String(v).slice(0, 100) } };
};

// Map request fields to Notion properties. Only fields present in the body are written.
function props(b) {
  const p = {};
  if (b.title !== undefined) {
    const t = String(b.title).trim();
    if (!t) throw bad('Thiếu tên việc.');
    p['Việc'] = { title: rt(t) };
  }
  if (b.level !== undefined) p['Mức'] = opt(b.level, LEVELS, 'Mức');
  if (b.project !== undefined) p['Dự án'] = opt(String(b.project || '').trim(), null, 'Dự án');
  if (b.type !== undefined) p['Loại'] = opt(b.type, TYPES, 'Loại');
  if (b.size !== undefined) p['Size'] = opt(b.size, SIZES, 'Size');
  if (b.repeat !== undefined) p['Lặp'] = opt(b.repeat, REPEATS, 'Kiểu lặp');
  for (const [k, n] of [['start', 'Bắt đầu'], ['deadline', 'Deadline'], ['remind', 'Nhắc lại']]) {
    if (b[k] === undefined) continue;
    if (b[k] && !isDate(b[k])) throw bad(n + ' không hợp lệ.');
    p[n] = { date: b[k] ? { start: withTz(b[k]) } : null };
  }
  if (b.order !== undefined) {
    if (b.order !== null && !Number.isFinite(+b.order)) throw bad('Thứ tự không hợp lệ.');
    p['Thứ tự'] = { number: b.order === null ? null : +b.order };
  }
  if (b.note !== undefined) p['Ghi chú'] = { rich_text: b.note ? rt(b.note) : [] };
  if (b.thumb !== undefined) {
    const u = String(b.thumb || '').trim();
    if (u && !/^https:\/\//.test(u)) throw bad('Link ảnh phải bắt đầu bằng https://');
    p['Thumb'] = { files: u ? [{ name: 'thumb', type: 'external', external: { url: u } }] : [] };
  }
  return p;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.NOTION_TOKEN || !process.env.CTD_PASSWORD) {
    return res.status(503).json({ error: 'setup', message: 'Chưa đặt NOTION_TOKEN hoặc CTD_PASSWORD trên Vercel.' });
  }
  if (req.headers['x-ctd-pass'] !== process.env.CTD_PASSWORD) {
    return res.status(401).json({ error: 'auth', message: 'Sai mật khẩu.' });
  }
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    if (req.method === 'GET') {
      let rows = [], cursor;
      do {
        const j = await notion('/data_sources/' + DS + '/query', 'POST', cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 });
        rows = rows.concat(j.results.map(row));
        cursor = j.has_more ? j.next_cursor : null;
      } while (cursor);
      return res.status(200).json({ levels: LEVELS, repeats: REPEATS, types: TYPES, tasks: rows, at: new Date().toISOString() });
    }

    if (req.method === 'POST') {
      const p = props(Object.assign({ level: 'P4 · Khi rảnh', size: 'S', repeat: 'Một lần' }, b));
      if (!p['Việc']) throw bad('Thiếu tên việc.');
      const pg = await notion('/pages', 'POST', { parent: { type: 'data_source_id', data_source_id: DS }, properties: p });
      return res.status(200).json({ task: row(pg) });
    }

    if (req.method === 'PATCH') {
      if (!b.id) throw bad('Thiếu id.');
      const fields = Object.assign({}, b);
      delete fields.id; delete fields.prevLevel; delete fields.currentRepeat;
      const p = props(fields);
      let rescheduled = false;
      const rep = b.repeat !== undefined ? b.repeat : b.currentRepeat;
      if (b.level === 'Xong' && rep && rep !== 'Một lần' && LEVELS.includes(b.prevLevel) && b.prevLevel !== 'Xong') {
        // Repeating task: finishing it schedules the next round instead of archiving it.
        p['Mức'] = { select: { name: b.prevLevel } };
        p['Nhắc lại'] = { date: { start: nextDate(rep) } };
        rescheduled = true;
      }
      if (!Object.keys(p).length) throw bad('Không có gì để cập nhật.');
      const pg = await notion('/pages/' + b.id, 'PATCH', { properties: p });
      return res.status(200).json({ task: row(pg), rescheduled });
    }

    if (req.method === 'DELETE') {
      if (!b.id) throw bad('Thiếu id.');
      await notion('/pages/' + b.id, 'PATCH', { in_trash: true });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).end();
  } catch (e) {
    if (e.bad) return res.status(400).json({ error: 'bad', message: e.message });
    return res.status(e.status === 404 ? 404 : 502).json({
      error: 'notion',
      message: e.status === 404 ? 'Integration chưa được thêm vào trang Daily C(laude) trong Notion.' : e.message
    });
  }
};
