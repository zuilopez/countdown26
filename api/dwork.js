// D-Work API for CTD: reads/updates the Notion "D-Work" database.
// Env: NOTION_TOKEN (Notion internal integration secret), CTD_PASSWORD.
const DS = process.env.DWORK_DATA_SOURCE || '7ace5e5a-203f-485d-a15d-0ae8c5353436';
const NV = '2025-09-03';
const LEVELS = ['P0 · Khẩn', 'P1 · Quan trọng', 'P2 · Kế hoạch', 'P3 · Khi rảnh', 'Chờ', 'Xong'];
const REPEATS = ['Một lần', 'Hằng ngày', 'Hằng tuần', 'Hằng tháng'];

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
    deadline: date(P['Deadline']),
    remind: date(P['Nhắc lại']),
    repeat: sel(P['Lặp']),
    note: txt(P['Ghi chú'] && P['Ghi chú'].rich_text),
    thumb: thumb(P['Thumb']),
    edited: pg.last_edited_time
  };
}

// Next occurrence (Asia/Ho_Chi_Minh calendar day) for a repeating task.
function nextDate(repeat) {
  const d = new Date(Date.now() + 7 * 3600e3); // shift to UTC+7, then read UTC fields
  if (repeat === 'Hằng ngày') d.setUTCDate(d.getUTCDate() + 1);
  else if (repeat === 'Hằng tuần') d.setUTCDate(d.getUTCDate() + 7);
  else if (repeat === 'Hằng tháng') d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
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
    if (req.method === 'GET') {
      let rows = [], cursor;
      do {
        const j = await notion('/data_sources/' + DS + '/query', 'POST', cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 });
        rows = rows.concat(j.results.map(row));
        cursor = j.has_more ? j.next_cursor : null;
      } while (cursor);
      return res.status(200).json({ levels: LEVELS, repeats: REPEATS, tasks: rows, at: new Date().toISOString() });
    }
    if (req.method === 'PATCH') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (!b.id) return res.status(400).json({ error: 'bad', message: 'Thiếu id.' });
      const props = {};
      let rescheduled = false;
      if (b.repeat !== undefined) {
        if (!REPEATS.includes(b.repeat)) return res.status(400).json({ error: 'bad', message: 'Kiểu lặp không hợp lệ.' });
        props['Lặp'] = { select: { name: b.repeat } };
      }
      if (b.level !== undefined) {
        if (!LEVELS.includes(b.level)) return res.status(400).json({ error: 'bad', message: 'Mức không hợp lệ.' });
        const rep = b.repeat !== undefined ? b.repeat : b.currentRepeat;
        if (b.level === 'Xong' && rep && rep !== 'Một lần' && LEVELS.includes(b.prevLevel) && b.prevLevel !== 'Xong') {
          // Repeating task: finishing it schedules the next round instead of archiving it.
          props['Mức'] = { select: { name: b.prevLevel } };
          props['Nhắc lại'] = { date: { start: nextDate(rep) } };
          rescheduled = true;
        } else {
          props['Mức'] = { select: { name: b.level } };
        }
      }
      if (!Object.keys(props).length) return res.status(400).json({ error: 'bad', message: 'Không có gì để cập nhật.' });
      const pg = await notion('/pages/' + b.id, 'PATCH', { properties: props });
      return res.status(200).json({ task: row(pg), rescheduled });
    }
    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).end();
  } catch (e) {
    return res.status(e.status === 404 ? 404 : 502).json({
      error: 'notion',
      message: e.status === 404 ? 'Integration chưa được thêm vào trang Daily C(laude) trong Notion.' : e.message
    });
  }
};
