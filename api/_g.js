// Shared Google helpers for CTD sign-in (no database, no extra env).
// Env: GOOGLE_CLIENT_SECRET (Vercel). The long-lived refresh token lives ONLY in an encrypted HttpOnly cookie
// on the user's own device (AES-256-GCM, key derived from the client secret). Nothing is stored server-side.
const crypto = require('crypto');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '465674449798-dfrg34vjrg0t7vmbrupkdsrqhb58nmli.apps.googleusercontent.com';
const ORIGIN = process.env.CTD_ORIGIN || 'https://ctd-luiz.vercel.app';
const REDIRECT = ORIGIN + '/api/auth/callback';
const SCOPES = [
  'openid', 'email', 'profile',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar.events'
].join(' ');
const COOKIE = 'ctd_g', STATE = 'ctd_st';
const YEAR = 60 * 60 * 24 * 365;

function key() {
  const s = process.env.GOOGLE_CLIENT_SECRET;
  if (!s) throw Object.assign(new Error('GOOGLE_CLIENT_SECRET missing'), { status: 500 });
  return Buffer.from(crypto.hkdfSync('sha256', s, 'ctd-cookie', 'v1', 32));
}
function seal(obj) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), ct].map(b => b.toString('base64url')).join('.');
}
function open(v) {
  try {
    const [iv, tag, ct] = String(v).split('.').map(x => Buffer.from(x, 'base64url'));
    const d = crypto.createDecipheriv('aes-256-gcm', key(), iv); d.setAuthTag(tag);
    return JSON.parse(Buffer.concat([d.update(ct), d.final()]).toString('utf8'));
  } catch (e) { return null; }
}
function cookies(req) {
  const o = {};
  String(req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return o;
}
function setCookie(res, name, value, maxAge) {
  const c = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, c) : c);
}
async function tokenCall(params) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET || '', ...params })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error_description || j.error || 'token error'), { status: r.status, code: j.error });
  return j;
}
// Returns {access, email, name} from the cookie, or null if not signed in / revoked.
async function session(req) {
  const s = open(cookies(req)[COOKIE]);
  if (!s || !s.rt) return null;
  try {
    const t = await tokenCall({ grant_type: 'refresh_token', refresh_token: s.rt });
    return { access: t.access_token, expires: t.expires_in, email: s.email, name: s.name || '', picture: s.pic || '' };
  } catch (e) { if (e.code === 'invalid_grant') return null; throw e; }
}
async function g(access, url, method, body) {
  const r = await fetch(url, {
    method: method || 'GET',
    headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((j.error && j.error.message) || 'Google error'), { status: r.status });
  return j;
}

const FOLDER = 'CTD Database', SHEET = 'CTD Data';
const TABS = {
  Tasks: ['id', 'title', 'level', 'project', 'type', 'size', 'start', 'deadline', 'repeat', 'note', 'order', 'done'],
  Log: ['taskId', 'title', 'doneAt', 'deadline'],
  Presets: ['name', 'json', 'default'],
  Settings: ['key', 'value']
};
// Finds (or creates) the folder "CTD Database" and the sheet "CTD Data" inside it in the user's own Drive.
async function ensureDb(access) {
  const D = 'https://www.googleapis.com/drive/v3/files';
  const find = async q => (await g(access, D + '?spaces=drive&fields=files(id,name)&q=' + encodeURIComponent(q))).files[0];
  let folder = await find(`name='${FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  if (!folder) folder = await g(access, D + '?fields=id,name', 'POST', { name: FOLDER, mimeType: 'application/vnd.google-apps.folder' });
  let sheet = await find(`name='${SHEET}' and mimeType='application/vnd.google-apps.spreadsheet' and '${folder.id}' in parents and trashed=false`);
  let created = false;
  if (!sheet) {
    sheet = await g(access, D + '?fields=id,name', 'POST', { name: SHEET, mimeType: 'application/vnd.google-apps.spreadsheet', parents: [folder.id] });
    const S = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheet.id;
    const names = Object.keys(TABS);
    const info = await g(access, S + '?fields=sheets.properties');
    const first = info.sheets[0].properties.sheetId;
    await g(access, S + ':batchUpdate', 'POST', { requests: [
      { updateSheetProperties: { properties: { sheetId: first, title: names[0] }, fields: 'title' } },
      ...names.slice(1).map(title => ({ addSheet: { properties: { title } } }))
    ] });
    await g(access, S + '/values:batchUpdate', 'POST', {
      valueInputOption: 'RAW',
      data: names.map(n => ({ range: n + '!A1', values: [TABS[n]] }))
    });
    created = true;
  }
  return { folderId: folder.id, sheetId: sheet.id, created };
}

module.exports = { CLIENT_ID, REDIRECT, SCOPES, COOKIE, STATE, YEAR, seal, open, cookies, setCookie, tokenCall, session, ensureDb };
