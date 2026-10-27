// CTD look presets, stored in the Notion database "CTD Presets" so every device sees the same list.
// Env: NOTION_TOKEN, CTD_PASSWORD (same as /api/dwork). Optional CTD_PRESETS_SOURCE.
// GET            → { presets: [{ id, name, data, def, edited }] }
// POST   {name, data, def?}       → create
// PATCH  {id, name?, data?, def?} → update (def:true clears the flag on the others)
// DELETE {id}                     → move to Notion trash
const DS = process.env.CTD_PRESETS_SOURCE || 'c3295a25-b5aa-455c-9877-a6bdecc672ce';
const NV = '2025-09-03';

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
const bad = m => Object.assign(new Error(m), { status: 400, bad: true });
// Notion text objects hold max 2000 characters each; a preset is split into chunks.
const chunks = s => {
  const out = [];
  for (let i = 0; i < s.length; i += 1900) out.push({ type: 'text', text: { content: s.slice(i, i + 1900) } });
  return out.slice(0, 100);
};

function row(pg) {
  const P = pg.properties || {};
  return {
    id: pg.id,
    name: txt(P['Tên'] && P['Tên'].title),
    data: txt(P['Data'] && P['Data'].rich_text),
    def: !!(P['Mặc định'] && P['Mặc định'].checkbox),
    edited: pg.last_edited_time
  };
}

function props(b) {
  const p = {};
  if (b.name !== undefined) {
    const n = String(b.name).trim().slice(0, 120);
    if (!n) throw bad('Thiếu tên preset.');
    p['Tên'] = { title: [{ type: 'text', text: { content: n } }] };
  }
  if (b.data !== undefined) {
    const d = typeof b.data === 'string' ? b.data : JSON.stringify(b.data);
    try { if (typeof JSON.parse(d) !== 'object') throw 0; } catch (e) { throw bad('Preset không hợp lệ.'); }
    if (d.length > 150000) throw bad('Preset quá lớn.');
    p['Data'] = { rich_text: chunks(d) };
  }
  if (b.def !== undefined) p['Mặc định'] = { checkbox: !!b.def };
  return p;
}

async function list() {
  let rows = [], cursor;
  do {
    const body = { page_size: 100, sorts: [{ timestamp: 'created_time', direction: 'descending' }] };
    if (cursor) body.start_cursor = cursor;
    const j = await notion('/data_sources/' + DS + '/query', 'POST', body);
    rows = rows.concat(j.results.map(row));
    cursor = j.has_more ? j.next_cursor : null;
  } while (cursor);
  return rows;
}

// only one default preset at a time
async function clearDefault(except) {
  const others = (await list()).filter(r => r.def && r.id !== except);
  await Promise.all(others.map(r => notion('/pages/' + r.id, 'PATCH', { properties: { 'Mặc định': { checkbox: false } } })));
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

    if (req.method === 'GET') return res.status(200).json({ presets: await list() });

    if (req.method === 'POST') {
      const p = props(Object.assign({ name: 'Preset' }, b));
      if (!p['Data']) throw bad('Thiếu dữ liệu preset.');
      const pg = await notion('/pages', 'POST', { parent: { type: 'data_source_id', data_source_id: DS }, properties: p });
      if (b.def) await clearDefault(pg.id);
      return res.status(200).json({ preset: row(pg) });
    }

    if (req.method === 'PATCH') {
      if (!b.id) throw bad('Thiếu id.');
      const fields = Object.assign({}, b); delete fields.id;
      const p = props(fields);
      if (!Object.keys(p).length) throw bad('Không có gì để cập nhật.');
      const pg = await notion('/pages/' + b.id, 'PATCH', { properties: p });
      if (b.def) await clearDefault(b.id);
      return res.status(200).json({ preset: row(pg) });
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
      message: e.status === 404 ? 'Integration chưa thấy database CTD Presets trong Notion.' : e.message
    });
  }
};
