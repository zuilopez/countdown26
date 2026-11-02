// Forget this device (clears the cookie). The Drive data stays untouched.
const G = require('../_g');
module.exports = (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
  G.setCookie(res, G.COOKIE, '', 0);
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = 204; res.end();
};
