// Who is signed in? GET → {email,name}. GET ?setup=1 also makes sure the Drive folder + sheet exist.
const G = require('../_g');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  try {
    const s = await G.session(req);
    if (!s) { res.statusCode = 401; return res.end(JSON.stringify({ signedIn: false })); }
    const out = { signedIn: true, email: s.email, name: s.name, picture: s.picture };
    if (new URL(req.url, 'https://x').searchParams.get('setup')) Object.assign(out, await G.ensureDb(s.access));
    res.end(JSON.stringify(out));
  } catch (e) { res.statusCode = e.status || 500; res.end(JSON.stringify({ error: e.message })); }
};
