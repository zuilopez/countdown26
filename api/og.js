// Finds the main image of a web page (og:image / twitter:image) so a pasted link can become a card thumbnail.
const PRIVATE = /^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i;
const isPrivateHost = h => PRIVATE.test(h) || /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':') || h === '0.0.0.0';

function pick(html, base) {
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  const want = ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src'];
  const found = {};
  for (const m of metas) {
    const key = (m.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1];
    const val = (m.match(/content\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (key && val) found[key.toLowerCase()] = val;
  }
  let u = want.map(k => found[k]).find(Boolean);
  if (!u) { const l = html.match(/<link\b[^>]*rel\s*=\s*["']image_src["'][^>]*href\s*=\s*["']([^"']+)["']/i); u = l && l[1]; }
  if (!u) return '';
  u = u.replace(/&amp;/g, '&');
  try { const x = new URL(u, base); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.CTD_PASSWORD) return res.status(503).json({ error: 'setup' });
  if (req.headers['x-ctd-pass'] !== process.env.CTD_PASSWORD) return res.status(401).json({ error: 'auth' });
  let url;
  try { url = new URL(String(req.query.u || '')); } catch (e) { return res.status(400).json({ error: 'url' }); }
  if (url.protocol !== 'https:' || isPrivateHost(url.hostname)) return res.status(400).json({ error: 'url' });
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(url.href, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CTD-thumb/1.0)', Accept: 'text/html,application/xhtml+xml' } });
    clearTimeout(to);
    const ct = r.headers.get('content-type') || '';
    if (/^image\//i.test(ct)) return res.json({ image: url.href });
    if (!/html/i.test(ct)) return res.json({ image: '' });
    const html = (await r.text()).slice(0, 400000);
    return res.json({ image: pick(html, r.url || url.href) });
  } catch (e) {
    return res.json({ image: '' });
  }
};
