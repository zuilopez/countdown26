/* D-Work panel for CTD — reads the Notion D-Work database through /api/dwork. */
(function () {
  const LV = [
    { k: 'P0 · Khẩn', s: 'P0', c: '#f0705a', r: 'Tiền/khách ≤48h, quá hạn' },
    { k: 'P1 · Quan trọng', s: 'P1', c: '#f0b04a', r: 'Deadline ≤7 ngày' },
    { k: 'P2 · Kế hoạch', s: 'P2', c: '#6fb0e8', r: 'Mốc >7 ngày' },
    { k: 'P3 · Khi rảnh', s: 'P3', c: '#a7adb0', r: 'Chưa có mốc' },
    { k: 'Chờ', s: 'Chờ', c: '#e6d25a', r: 'Chờ phản hồi / hàng về' },
    { k: 'Xong', s: 'Xong', c: '#7cc98c', r: 'Đã hoàn thành' }
  ];
  const PK = 'ctd_dwork_pass';
  let tasks = [], pass = '', busy = false, filter = '';
  const get = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const set = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const day0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const left = s => s ? Math.round((new Date(s.slice(0, 10) + 'T00:00:00') - day0()) / 864e5) : null;
  const dm = s => { const d = new Date(s.slice(0, 10) + 'T00:00:00'); return d.getDate() + '/' + (d.getMonth() + 1); };

  const css = `
#dw-fab{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:60;
 display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;border:1px solid var(--ln,rgba(255,255,255,.2));
 background:var(--pbg,rgba(16,16,26,.86));color:var(--tx,#f2f2f4);font:600 14px/1 system-ui,sans-serif;cursor:pointer;
 -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 8px 28px rgba(0,0,0,.35)}
#dw-fab b{min-width:20px;padding:2px 6px;border-radius:999px;background:var(--ac,#22d3ee);color:#081014;font-size:12px;text-align:center}
#dw-ov{position:fixed;inset:0;z-index:61;background:rgba(6,8,12,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
 overflow:auto;padding:calc(16px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) calc(24px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));
 color:var(--tx,#f2f2f4);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
#dw-ov *{box-sizing:border-box}
.dw-wrap{max-width:1500px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
.dw-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:10px}
.dw-head h2{margin:0;font-size:22px;letter-spacing:.01em}
.dw-sub{font-size:12.5px;opacity:.7;margin-top:2px}
.dw-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.dw-btn,.dw-sel{font:inherit;font-size:13px;color:inherit;background:var(--pbg,rgba(16,16,26,.86));border:1px solid var(--ln,rgba(255,255,255,.2));border-radius:8px;padding:7px 12px;cursor:pointer}
.dw-btn:focus-visible,.dw-sel:focus-visible,.dw-card:focus-visible{outline:2px solid var(--ac,#22d3ee);outline-offset:2px}
.dw-stat{font:12px ui-monospace,monospace;padding:5px 9px;border-radius:6px;border:1px solid var(--ln,rgba(255,255,255,.2));background:var(--pbg,rgba(16,16,26,.86))}
.dw-stat.warn{border-color:#f0705a;color:#f0a090}
.dw-msg{padding:10px 14px;border-radius:10px;border:1px solid var(--ln,rgba(255,255,255,.2));background:var(--pbg,rgba(16,16,26,.86));font-size:14px}
.dw-login{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.dw-login input{font:inherit;color:inherit;background:rgba(0,0,0,.3);border:1px solid var(--ln,rgba(255,255,255,.2));border-radius:8px;padding:8px 10px;min-width:0}
.dw-board{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;align-items:start}
@media (max-width:1200px){.dw-board{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:640px){.dw-board{grid-template-columns:1fr}}
.dw-lane{min-width:0;border:1px solid var(--ln,rgba(255,255,255,.2));border-radius:12px;background:var(--pbg,rgba(16,16,26,.86));display:flex;flex-direction:column}
.dw-lane.over{outline:2px dashed var(--ac,#22d3ee);outline-offset:-4px}
.dw-lh{padding:10px 12px;border-bottom:1px solid var(--ln,rgba(255,255,255,.2));display:flex;justify-content:space-between;align-items:baseline;gap:6px}
.dw-lh b{font-size:13px}.dw-lh i{display:block;font-style:normal;font-size:11.5px;opacity:.65}.dw-lh span{font:12px ui-monospace,monospace;opacity:.7}
.dw-cards{padding:10px;display:flex;flex-direction:column;gap:8px;min-height:70px}
.dw-empty{font-size:12px;opacity:.55;text-align:center;padding:12px 4px}
.dw-card{border:1px solid var(--ln,rgba(255,255,255,.2));border-left:4px solid var(--lc);background:rgba(0,0,0,.28);padding:9px 10px;display:flex;flex-direction:column;gap:6px;cursor:grab}
.dw-card.drag{opacity:.4}.dw-card.done{opacity:.6}.dw-card.done .dw-t{text-decoration:line-through}
.dw-th{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;border:1px solid var(--ln,rgba(255,255,255,.2))}
.dw-t{font-weight:600;font-size:14px;overflow-wrap:anywhere}
.dw-meta{display:flex;flex-wrap:wrap;gap:5px}
.dw-chip{font:11.5px ui-monospace,monospace;padding:2px 6px;border-radius:4px;border:1px solid var(--ln,rgba(255,255,255,.2));opacity:.85;white-space:nowrap}
.dw-chip.late{border-color:#f0705a;color:#f6a594;opacity:1}.dw-chip.soon{border-color:#f0b04a;color:#f5c97c;opacity:1}.dw-chip.rem{border-color:#e6d25a;color:#efe08c;opacity:1}
.dw-note{font-size:12.5px;opacity:.72;overflow-wrap:anywhere}
.dw-row{display:flex;gap:6px;align-items:center}.dw-row .dw-sel{padding:3px 6px;font-size:12px}
.dw-row a{font-size:12px;color:var(--ac,#22d3ee)}
@media (prefers-reduced-motion:reduce){#dw-ov,#dw-fab{transition:none}}`;

  function el(t, a, h) { const e = document.createElement(t); if (a) Object.assign(e, a); if (h != null) e.innerHTML = h; return e; }

  const st = el('style', null, css); document.head.appendChild(st);
  const fab = el('button', { id: 'dw-fab', type: 'button', title: 'Mở D-Work' }, 'D-Work <b id="dw-n">·</b>');
  const ov = el('div', { id: 'dw-ov', hidden: true });
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'D-Work');
  document.body.append(fab, ov);

  function api(method, body) {
    return fetch('api/dwork', {
      method, headers: { 'x-ctd-pass': pass, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined
    }).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.message || 'Lỗi ' + r.status), { code: j.error, status: r.status }); return j; });
  }

  function shell(inner) {
    ov.innerHTML = `<div class="dw-wrap"><div class="dw-head"><div><h2>D-Work</h2><div class="dw-sub">Đồng bộ với Notion · kéo thẻ để đổi mức</div></div>
      <div class="dw-tools" id="dw-tools"></div></div>${inner}</div>`;
    const tools = ov.querySelector('#dw-tools');
    tools.innerHTML = (pass ? `<span id="dw-stats" class="dw-tools"></span><select class="dw-sel" id="dw-f" aria-label="Lọc dự án"><option value="">Tất cả dự án</option></select>
      <button class="dw-btn" id="dw-re" type="button">Làm mới</button><button class="dw-btn" id="dw-out" type="button">Khoá</button>` : '') +
      `<button class="dw-btn" id="dw-x" type="button">Đóng</button>`;
  }

  function login(msg) {
    shell(`<div class="dw-msg"><form class="dw-login" id="dw-lf"><label for="dw-pw">Mật khẩu CTD</label>
      <input id="dw-pw" type="password" autocomplete="current-password" required><button class="dw-btn" type="submit">Mở</button></form>
      ${msg ? `<div style="margin-top:8px;color:#f6a594;font-size:13px">${esc(msg)}</div>` : ''}</div>`);
    setTimeout(() => ov.querySelector('#dw-pw')?.focus(), 30);
  }

  function load() {
    if (!pass) return login();
    if (busy) return; busy = true;
    if (!tasks.length) shell('<div class="dw-msg">Đang tải từ Notion…</div>');
    api('GET').then(j => { tasks = j.tasks; busy = false; render(); badge(); })
      .catch(e => { busy = false; if (e.code === 'auth') { pass = ''; set(PK, ''); login('Sai mật khẩu.'); } else shell(`<div class="dw-msg">${esc(e.message)}</div>`); });
  }

  function badge() {
    const n = tasks.filter(t => t.level === 'P0 · Khẩn' || (t.remind && left(t.remind) <= 0 && t.level !== 'Xong')).length;
    document.getElementById('dw-n').textContent = n || '✓';
  }

  function card(t, L) {
    const n = left(t.deadline), r = left(t.remind);
    let due = '';
    if (n !== null) due = n < 0 ? `<span class="dw-chip late">quá ${-n} ngày · ${dm(t.deadline)}</span>` : n === 0 ? `<span class="dw-chip late">hôm nay</span>` : n <= 7 ? `<span class="dw-chip soon">còn ${n} ngày · ${dm(t.deadline)}</span>` : `<span class="dw-chip">${dm(t.deadline)}</span>`;
    const rem = r !== null && t.level !== 'Xong' ? `<span class="dw-chip rem">🔁 ${r <= 0 ? 'nhắc hôm nay' : 'nhắc ' + dm(t.remind)}${t.repeat && t.repeat !== 'Một lần' ? ' · ' + esc(t.repeat) : ''}</span>` : '';
    return `<article class="dw-card${L.k === 'Xong' ? ' done' : ''}" draggable="true" tabindex="0" data-id="${t.id}" style="--lc:${L.c}">
      ${/^https?:\/\//.test(t.thumb) ? `<img class="dw-th" src="${esc(t.thumb)}" alt="" loading="lazy" draggable="false">` : ''}
      <div class="dw-t">${esc(t.title)}</div>
      <div class="dw-meta">${t.project ? `<span class="dw-chip">${esc(t.project)}</span>` : ''}${t.type ? `<span class="dw-chip">${esc(t.type)}</span>` : ''}${t.size ? `<span class="dw-chip">${esc(t.size)}</span>` : ''}${due}${rem}</div>
      ${t.note ? `<div class="dw-note">${esc(t.note)}</div>` : ''}
      <div class="dw-row"><select class="dw-sel" data-mv="${t.id}" aria-label="Chuyển cột">${LV.map(x => `<option value="${x.k}"${x.k === t.level ? ' selected' : ''}>${x.s}</option>`).join('')}</select>
      <a href="${esc(t.url)}" target="_blank" rel="noopener">Mở Notion</a></div></article>`;
  }

  function render() {
    shell(`<div class="dw-board" id="dw-b"></div>`);
    const projs = [...new Set(tasks.map(t => t.project).filter(Boolean))].sort();
    const f = ov.querySelector('#dw-f'); f.innerHTML += projs.map(p => `<option${p === filter ? ' selected' : ''}>${esc(p)}</option>`).join('');
    const open = tasks.filter(t => t.level !== 'Xong' && t.level !== 'Chờ');
    const late = open.filter(t => left(t.deadline) !== null && left(t.deadline) < 0).length;
    const act = new Set(tasks.filter(t => t.level.startsWith('P0') || t.level.startsWith('P1')).map(t => t.project || '—')).size;
    ov.querySelector('#dw-stats').innerHTML = `<span class="dw-stat">${open.length} việc mở</span><span class="dw-stat${late ? ' warn' : ''}">${late} quá hạn</span><span class="dw-stat${act > 3 ? ' warn' : ''}">${act}/3 dự án chạy</span>`;
    const shown = tasks.filter(t => !filter || t.project === filter);
    ov.querySelector('#dw-b').innerHTML = LV.map(L => {
      const list = shown.filter(t => t.level === L.k).sort((a, b) => (a.deadline || a.remind || '9') < (b.deadline || b.remind || '9') ? -1 : 1);
      return `<section class="dw-lane" data-l="${L.k}"><div class="dw-lh"><b style="color:${L.c}">${L.k}<i>${L.r}</i></b><span>${list.length}</span></div>
        <div class="dw-cards">${list.length ? list.map(t => card(t, L)).join('') : '<div class="dw-empty">Kéo thẻ vào đây</div>'}</div></section>`;
    }).join('');
  }

  function move(id, level) {
    const t = tasks.find(x => x.id === id); if (!t || t.level === level) return;
    const prev = t.level; t.level = level; render(); badge();
    api('PATCH', { id, level }).catch(e => { t.level = prev; render(); badge(); shellMsg(e.message); });
  }
  function shellMsg(m) { const d = el('div', { className: 'dw-msg' }, 'Không lưu được: ' + esc(m)); ov.querySelector('.dw-wrap')?.insertBefore(d, ov.querySelector('.dw-board')); }

  fab.addEventListener('click', () => { ov.hidden = false; document.documentElement.style.overflow = 'hidden'; load(); });
  function close() { ov.hidden = true; document.documentElement.style.overflow = ''; }
  ov.addEventListener('click', e => {
    const id = e.target.id;
    if (id === 'dw-x' || e.target === ov) close();
    else if (id === 'dw-re') { tasks = []; load(); }
    else if (id === 'dw-out') { pass = ''; set(PK, ''); tasks = []; login(); }
  });
  ov.addEventListener('submit', e => { if (e.target.id !== 'dw-lf') return; e.preventDefault(); pass = ov.querySelector('#dw-pw').value; set(PK, pass); load(); });
  ov.addEventListener('change', e => {
    if (e.target.id === 'dw-f') { filter = e.target.value; render(); }
    else if (e.target.dataset.mv) move(e.target.dataset.mv, e.target.value);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !ov.hidden) close(); });
  ov.addEventListener('dragstart', e => { const c = e.target.closest('.dw-card'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('drag'); });
  ov.addEventListener('dragend', e => e.target.closest('.dw-card')?.classList.remove('drag'));
  ov.addEventListener('dragover', e => { const l = e.target.closest('.dw-lane'); if (!l) return; e.preventDefault(); ov.querySelectorAll('.dw-lane.over').forEach(x => x !== l && x.classList.remove('over')); l.classList.add('over'); });
  ov.addEventListener('dragleave', e => { const l = e.target.closest('.dw-lane'); if (l && !l.contains(e.relatedTarget)) l.classList.remove('over'); });
  ov.addEventListener('drop', e => { const l = e.target.closest('.dw-lane'); if (!l) return; e.preventDefault(); l.classList.remove('over'); move(e.dataTransfer.getData('text/plain'), l.dataset.l); });

  pass = get(PK);
  if (pass) api('GET').then(j => { tasks = j.tasks; badge(); }).catch(() => {});
})();
