// Step 2: Google sends the user back here with ?code. We swap it for a refresh token and keep it in an
// encrypted HttpOnly cookie on this device. Nothing is stored on the server.
const G = require('../_g');
const back = (res, q) => { res.statusCode = 302; res.setHeader('Location', '/?g=' + q); res.setHeader('Cache-Control', 'no-store'); res.end(); };
module.exports = async (req, res) => {
  try {
    const u = new URL(req.url, 'https://x');
    const code = u.searchParams.get('code'), state = u.searchParams.get('state');
    const ck = G.cookies(req);
    G.setCookie(res, G.STATE, '', 0);
    if (u.searchParams.get('error')) return back(res, 'denied');
    if (!code || !state || state !== ck[G.STATE]) return back(res, 'state');
    const t = await G.tokenCall({ grant_type: 'authorization_code', code, redirect_uri: G.REDIRECT });
    if (!t.refresh_token) return back(res, 'norefresh');
    const idp = JSON.parse(Buffer.from(String(t.id_token).split('.')[1], 'base64url').toString('utf8'));
    G.setCookie(res, G.COOKIE, G.seal({ rt: t.refresh_token, email: idp.email, name: idp.name || '', pic: idp.picture || '' }), G.YEAR);
    back(res, 'ok');
  } catch (e) { back(res, 'error'); }
};
