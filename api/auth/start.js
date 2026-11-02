// Step 1: send the browser to Google's sign-in page.
const crypto = require('crypto');
const G = require('../_g');
module.exports = (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('base64url');
    G.setCookie(res, G.STATE, state, 600);
    const q = new URLSearchParams({
      client_id: G.CLIENT_ID, redirect_uri: G.REDIRECT, response_type: 'code', scope: G.SCOPES,
      access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state
    });
    res.statusCode = 302;
    res.setHeader('Location', 'https://accounts.google.com/o/oauth2/v2/auth?' + q);
    res.setHeader('Cache-Control', 'no-store');
    res.end();
  } catch (e) { res.statusCode = 500; res.end('Auth error'); }
};
