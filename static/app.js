'use strict';
(() => {

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const enc = encodeURIComponent;

  const FOLDER = '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>';
  const FILE = '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>';
  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
    folder: FOLDER,
    folderPlus: FOLDER + '<path d="M12 10.5v5"/><path d="M9.5 13h5"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
    power: '<path d="M12 2v10"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
    tablet: '<rect x="4" y="2" width="16" height="20" rx="3"/><path d="M11 18h2"/>',
    laptop: '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19h20"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    arrow: '<path d="M7 17L17 7"/><path d="M9 7h8v8"/>',
    upload: '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/>',
    download: '<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    restart: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
    trash: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    file: FILE,
    doc: FILE + '<path d="M8 13h8"/><path d="M8 17h5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    video: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 10l4-2v8l-4-2"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
    design: '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.3"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="15.5" cy="10" r="1.3"/><path d="M12 21a3 3 0 0 1 0-6h1.5"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    play: '<path d="M7 5v14l12-7z"/>',
    x: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
  };
  const icon = (n, cls = '') => `<span class="i ${cls}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg></span>`;

  const storageName = () => S.session?.storage_name || 'Storage';
  const fmtNum = (n) => Number(n || 0).toLocaleString();
  const gb = (b) => (b / 1024 ** 3).toFixed(1) + ' GB';
  function fmtBytes(b) {
    if (b == null) return '';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return (i === 0 ? b : b.toFixed(b < 10 ? 1 : 0)) + ' ' + u[i];
  }
  function fmtUptime(s) {
    s = Math.floor(s || 0);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    return `${m}m`;
  }
  function fmtDate(sec) {
    const d = new Date(sec * 1000), now = new Date();
    const t = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return `Today ${t}`;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
  }
  function timeAgo(iso) {
    const t = Date.parse(iso);
    if (!t || t < 86400000) return '';
    const s = (Date.now() - t) / 1000;
    if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
    if (s < 86400) return `${Math.round(s / 3600)}h ago`;
    return `${Math.round(s / 86400)}d ago`;
  }
  function fileKind(name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tif', 'tiff', 'svg', 'avif'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg'].includes(ext)) return 'music';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'xz'].includes(ext)) return 'archive';
    if (['psd', 'ai', 'fig', 'xd', 'sketch', 'kra', 'xcf', 'afdesign', 'afphoto', 'blend', 'indd'].includes(ext)) return 'design';
    if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'key', 'pages'].includes(ext)) return 'doc';
    return 'file';
  }
  function setHTML(el, html) {
    if (el && el._h !== html) { el.innerHTML = html; el._h = html; }
  }

  class ApiError extends Error { constructor(msg, status) { super(msg); this.status = status; } }

  async function api(path, { method = 'GET', body, poll = false } = {}) {
    const headers = {};
    if (method !== 'GET') headers['X-Pi-Home'] = '1';
    if (poll) headers['X-Pi-Home-Poll'] = '1';
    const opts = { method, headers, credentials: 'same-origin', cache: 'no-store' };
    if (body !== undefined) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    let res;
    try { res = await fetch(path, opts); } catch (e) { setOffline(true); throw new ApiError("Can't reach your Pi.", 0); }
    setOffline(false);
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401 && path !== '/api/unlock') { showLock(); throw new ApiError('Locked', 401); }
    if (!res.ok) throw new ApiError(data.error || `Something went wrong (${res.status}).`, res.status);
    return data;
  }

  function setOffline(off) {
    S.offline = off;
    $('#offline').hidden = !off;
  }

  const S = {
    session: null, unlocked: false, offline: false,
    status: null, pihole: null, piholeErr: null, history: null, historyErr: null,
    devices: null, devicesErr: null, top: null, about: null,
    files: { path: '', items: null, disk: null, query: '', err: null, loading: false },
    jobs: {}, uploads: [],
  };

  const POLLS = [
    { name: 'status', ms: 5000, run: async () => { S.status = await api('/api/status', { poll: true }); } },
    { name: 'pihole', ms: 15000, run: async () => {
      try { S.pihole = await api('/api/pihole', { poll: true }); S.piholeErr = null; } catch (e) { if (e.status === 401) throw e; S.piholeErr = e.message; }
    } },
    { name: 'history', ms: 300000, run: async () => {
      try { S.history = (await api('/api/pihole/history', { poll: true })).days; S.historyErr = null; } catch (e) { if (e.status === 401) throw e; S.historyErr = e.message; }
    } },
    { name: 'devices', ms: 30000, run: async () => {
      try { S.devices = await api('/api/devices', { poll: true }); S.devicesErr = null; } catch (e) { if (e.status === 401) throw e; S.devicesErr = e.message; }
    } },
    { name: 'top', ms: 60000, when: () => current === 'ads', run: async () => {
      try { S.top = (await api('/api/pihole/top', { poll: true })).domains; } catch (e) { if (e.status === 401) throw e; }
    } },
    { name: 'about', ms: 600000, when: () => current === 'control' || current === 'settings', run: async () => { S.about = await api('/api/about', { poll: true }); } },
  ];
  POLLS.forEach((p) => { p.next = 0; p.busy = false; });

  function kick(...names) { POLLS.forEach((p) => { if (!names.length || names.includes(p.name)) p.next = 0; }); tick(); }

  function tick() {
    if (!S.unlocked || document.hidden) return;
    const now = Date.now();
    for (const p of POLLS) {
      if (p.busy || now < p.next || (p.when && !p.when())) continue;
      p.busy = true;
      p.run().then(refresh, () => {}).finally(() => { p.busy = false; p.next = Date.now() + p.ms; });
    }
  }
  setInterval(tick, 1000);

  function initials(name) {
    const parts = String(name || 'Pi').trim().split(/\s+/);
    return ((parts[0] || '')[0] || '') + ((parts[1] || '')[0] || '');
  }

  function refreshChrome() {
    const name = S.session?.name || '';
    const av = S.session?.avatar;
    const avatarHTML = av ? `<img src="/api/avatar?v=${av}" alt="">` : esc(initials(name).toUpperCase() || 'PH');
    $$('[data-avatar]').forEach((el) => setHTML(el, avatarHTML));
    const lockPhoto = $('#lock-photo');
    lockPhoto.classList.toggle('is-photo', !!av);
    setHTML(lockPhoto, av ? `<img src="/api/avatar?v=${av}" alt="">` : '<img src="/icons/logo.svg" alt="">');
    $('#lock-title').textContent = av && name ? `Hi, ${name.split(' ')[0]}` : 'Pi Home';
    $$('[data-user-name]').forEach((el) => { el.textContent = name.split(' ')[0] || 'Pi Home'; });
    const st = S.status;
    $$('[data-host-line]').forEach((el) => { el.textContent = S.offline ? 'Not reachable' : st ? `${st.host} · Online` : 'Connecting…'; });
    $$('[data-online-dot]').forEach((el) => { el.className = 'dot ' + (S.offline ? 'dot-red' : st ? 'dot-green' : 'dot-gray'); });
    const alerts = st?.alerts || [];
    const danger = alerts.some((a) => a.level === 'danger');
    const dot = $('#bell-dot');
    dot.hidden = !alerts.length;
    dot.classList.toggle('warn', !danger);
    $('#bell').setAttribute('aria-label', alerts.length ? `Alerts, ${alerts.length}` : 'Alerts, none');
    if (!$('#alerts-pop').hidden) renderAlerts();
  }

  function renderAlerts() {
    const alerts = S.status?.alerts || [];
    const cls = { danger: 'dot-red', warn: 'dot-yellow', info: 'dot-yellow' };
    setHTML($('#alerts-pop'), `<div class="pop-title">Alerts</div>${alerts.length
      ? alerts.map((a) => `<div class="alert-row"><span class="dot ${cls[a.level] || 'dot-gray'}"></span><span>${esc(a.text)}</span></div>`).join('')
      : '<div class="alert-row"><span class="dot dot-green"></span><span>All good. Nothing needs your attention.</span></div>'}`);
  }

  function toggleAlerts(force) {
    const pop = $('#alerts-pop');
    const open = force ?? pop.hidden;
    pop.hidden = !open;
    $('#bell').setAttribute('aria-expanded', String(open));
    if (open) renderAlerts();
  }

  function toast(msg, kind = '') {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.textContent = msg;
    $('#toasts').append(t);
    setTimeout(() => t.remove(), kind === 'error' ? 5200 : 3200);
  }

  let modalClose = null;
  function modal({ title, text = '', html = '', input = null, confirm = 'Confirm', variant = 'black', cancel = 'Cancel', onConfirm }) {
    closeModal();
    const prevFocus = document.activeElement;
    return new Promise((resolve) => {
      const root = $('#modal-root');
      const isPin = input?.kind === 'pin';
      root.innerHTML = `<div class="modal-back"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">
        <h2 id="m-title">${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}${html}
        ${input ? `<label class="sr-only" for="m-input">${esc(input.label)}</label>
          <input id="m-input" class="input ${isPin ? '' : 'input-text'}" ${isPin ? 'type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="PIN"' : 'type="text"'}
            autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(input.value || '')}">` : ''}
        <p class="form-msg error" id="m-err" role="alert"></p>
        <div class="modal-actions">${cancel ? `<button type="button" class="btn btn-ghost" data-m="cancel">${esc(cancel)}</button>` : ''}
          <button type="button" class="btn btn-${variant}" data-m="ok">${esc(confirm)}</button></div>
      </div></div>`;
      const back = $('.modal-back', root), field = $('#m-input', root), ok = $('[data-m="ok"]', root), err = $('#m-err', root);
      const finish = (value) => { root.innerHTML = ''; modalClose = null; document.removeEventListener('keydown', onKey, true); prevFocus?.focus?.(); resolve(value); };
      const submit = async () => {
        const value = field ? field.value.trim() : true;
        if (field && !value) { field.focus(); return; }
        if (!onConfirm) { finish(value); return; }
        ok.disabled = true; err.textContent = '';
        try { await onConfirm(value); finish(true); } catch (e) {
          if (e.status === 401) { finish(false); return; }
          err.textContent = e.message; ok.disabled = false;
          if (field) { if (isPin) field.value = ''; field.focus(); }
        }
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); finish(false); }
        if (e.key === 'Enter' && document.activeElement === field) { e.preventDefault(); submit(); }
        if (e.key === 'Tab') {
          const items = $$('button, input', root);
          const first = items[0], last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      };
      document.addEventListener('keydown', onKey, true);
      back.addEventListener('click', (e) => { if (e.target === back) finish(false); });
      $('[data-m="cancel"]', root)?.addEventListener('click', () => finish(false));
      ok.addEventListener('click', submit);
      modalClose = () => finish(false);
      setTimeout(() => (field || ok).focus(), 30);
      if (field && !isPin) field.select();
    });
  }
  function closeModal() { if (modalClose) modalClose(); }

  const withPin = (opts, fn) => modal({ ...opts, input: { kind: 'pin', label: 'Your PIN' }, onConfirm: fn });

  function overlay(title, text, spin = true) {
    const d = document.createElement('div');
    d.className = 'overlay';
    d.innerHTML = `<div>${spin ? '<div class="spinner"></div>' : ''}<h2>${esc(title)}</h2><p>${esc(text)}</p></div>`;
    document.body.append(d);
    return d;
  }

  let pinBusy = false;
  const pinLength = () => S.session?.pin_length || 4;
  const pinInput = () => $('#pin-input');

  function renderDots() {
    const typed = pinInput().value.length;
    $('#pin-dots').innerHTML = Array.from({ length: pinLength() }, (_, i) => `<span class="${i < typed ? 'on' : ''}"></span>`).join('');
  }

  function focusPin() {
    const el = pinInput();
    if (!$('#lock').hidden && document.activeElement !== el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
  }

  function showLock(msg = '') {
    S.unlocked = false;
    closeModal();
    toggleAlerts(false);
    $('#app').hidden = true;
    $('#tabs').hidden = true;
    $('#lock').hidden = false;
    const noPin = S.session && !S.session.pin_set;
    $('#lock-sub').textContent = noPin ? 'No PIN set yet. On the Pi, run: sudo pi-home pin' : 'Enter your PIN to open';
    $('#pin-field').hidden = !!noPin;
    $('#lock-hint').hidden = !!noPin;
    $('#lock-error').textContent = msg;
    pinInput().value = '';
    pinInput().maxLength = pinLength();
    renderDots();
    refreshChrome();
    setTimeout(focusPin, 60);
  }

  async function onPinInput() {
    const el = pinInput();
    const clean = el.value.replace(/\D/g, '').slice(0, pinLength());
    if (clean !== el.value) el.value = clean;
    if (clean) $('#lock-error').textContent = '';
    renderDots();
    if (clean.length < pinLength() || pinBusy) return;
    pinBusy = true;
    const field = $('#pin-field');
    field.classList.add('busy');
    try {
      await api('/api/unlock', { method: 'POST', body: { pin: clean } });
      el.value = '';
      el.blur();
      onUnlocked();
    } catch (e) {
      field.classList.remove('shake'); void field.offsetWidth; field.classList.add('shake');
      $('#lock-error').textContent = e.message;
      el.value = '';
      focusPin();
    } finally {
      field.classList.remove('busy');
      pinBusy = false;
      renderDots();
    }
  }

  const lockAfter = () => S.session?.lock_after ?? 0;
  const LEFT_KEY = 'pihome-left-at';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  let lastActive = Date.now(), hiddenAt = 0, leaveOkUntil = 0;

  function allowLeave(ms = 120000) { leaveOkUntil = Date.now() + ms; }

  function lockNow() {
    if (!S.unlocked) return;
    try { fetch('/api/lock', { method: 'POST', headers: { 'X-Pi-Home': '1' }, keepalive: true, credentials: 'same-origin' }).catch(() => {}); } catch (e) {}
    showLock();
  }

  function onLeave() {
    if (!S.unlocked || hiddenAt) return;
    hiddenAt = Date.now();
    store.set(LEFT_KEY, String(hiddenAt));
    if (lockAfter() === 0 && Date.now() > leaveOkUntil && !uploading) lockNow();
  }

  function onReturn() {
    const away = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = 0;
    leaveOkUntil = 0;
    store.del(LEFT_KEY);
    if (!S.unlocked) { setTimeout(focusPin, 60); return; }
    if (away > (lockAfter() ? lockAfter() * 1000 : 300000)) { lockNow(); return; }
    lastActive = Date.now();
    kick('status', 'pihole');
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) onLeave(); else onReturn(); });
  window.addEventListener('pagehide', onLeave);
  setInterval(() => {
    if (S.unlocked && !document.hidden && lockAfter() > 0 && Date.now() - lastActive > lockAfter() * 1000) lockNow();
  }, 5000);

  function onUnlocked() {
    S.unlocked = true;
    $('#lock').hidden = true;
    $('#app').hidden = false;
    $('#tabs').hidden = false;
    current = null;
    route();
    kick();
  }

  function chartHTML(days) {
    const max = Math.max(1, ...days.map((d) => d.blocked));
    return `<div class="chart">${days.map((d) => {
      const today = d.label === 'Today';
      const pct = d.blocked ? Math.max(8, Math.round((d.blocked / max) * 100)) : 8;
      return `<div class="chart-col ${today ? 'today' : ''}" tabindex="0" aria-label="${esc(d.label)}: ${fmtNum(d.blocked)} blocked">
        <div class="chart-track"><div class="chart-bar ${today ? 'today' : ''} ${d.blocked ? '' : 'zero'}" style="height:${pct}%"><span class="chart-val">${fmtNum(d.blocked)}</span></div></div>
        <div class="chart-day ${today ? 'today' : ''}">${esc(d.label)}</div></div>`;
    }).join('')}</div>`;
  }

  function pauseLabel() {
    const p = S.pihole;
    if (!p) return { text: 'Pause ads · 5 min', blocking: true };
    if (p.blocking) return { text: 'Pause ads · 5 min', blocking: true };
    const left = p.timer ? Math.max(1, Math.ceil(p.timer / 60)) : null;
    return { text: left ? `Resume ads · ${left} min left` : 'Resume ads', blocking: false };
  }

  function servicesRows(withRestart) {
    const svc = S.status?.services;
    if (!svc) return '<div class="empty">Loading…</div>';
    return svc.map((s) => {
      const dot = s.active ? 'dot-green' : 'dot-red';
      const label = s.active ? 'Running' : (s.state === 'unknown' ? 'Unknown' : 'Stopped');
      if (!withRestart) {
        return `<div class="row"><div class="row-left"><span class="dot ${dot}"></span>${esc(s.name)}</div><span class="row-meta">${label}</span></div>`;
      }
      return `<div class="svc-row"><span class="dot ${dot}"></span><div><div class="svc-name">${esc(s.name)}</div><div class="svc-state">${label} · ${esc(s.unit)}</div></div>
        ${s.restartable ? `<button type="button" class="btn btn-outline btn-sm" data-action="restart-svc" data-unit="${esc(s.unit)}" data-name="${esc(s.name)}">${icon('restart')}Restart</button>` : ''}</div>`;
    }).join('');
  }

  function jobBlock(name) {
    const j = S.jobs[name];
    if (!j || (!j.running && !j.done)) return '';
    const head = j.running ? '<span class="chip chip-yellow">Running…</span>' : j.ok ? '<span class="chip chip-green">Done</span>' : '<span class="chip chip-red">Failed</span>';
    return `<div class="line" style="margin-top:14px">${head}</div><pre class="joblog mono" data-log="${name}">${esc(j.log || 'Starting…')}</pre>`;
  }

  function scrollLogs() { $$('[data-log]').forEach((el) => { el.scrollTop = el.scrollHeight; }); }

  const watching = new Set();
  async function watchJob(name) {
    if (watching.has(name)) return;
    watching.add(name);
    try { await followJob(name); } finally { watching.delete(name); }
  }
  async function followJob(name) {
    for (;;) {
      try { S.jobs[name] = await api(`/api/jobs/${name}`, { poll: true }); } catch (e) { if (e.status === 401) return; }
      refresh();
      const j = S.jobs[name];
      if (!j || !j.running) {
        if (j?.done) toast(j.ok ? (name === 'update' ? 'Updates installed.' : 'Blocklists updated.') : 'That didn\'t finish. See the log.', j.ok ? '' : 'error');
        kick('status', 'pihole', 'history');
        return;
      }
      await sleep(1500);
    }
  }

  const views = {};

  views.dashboard = {
    title: 'Dashboard',
    mount: () => `
      <div class="page-head dash-head">
        <div><h1>Dashboard</h1><p>Your Raspberry Pi at a glance. Updates every 5 seconds.</p></div>
        <div class="head-actions"><button type="button" class="btn btn-black" data-action="upload">${icon('upload')}Upload file</button><span id="pause-slot"></span></div>
      </div>
      <div class="dash">
        <article class="card card-dark stat stat-temp" id="d-temp"></article>
        <article class="card stat" id="d-cpu"></article>
        <article class="card stat" id="d-mem"></article>
        <article class="card stat" id="d-storage"></article>
        <article class="card c-chart" id="d-chart"></article>
        <article class="card c-health" id="d-health"></article>
        <article class="card c-services" id="d-services"></article>
        <article class="card c-devices" id="d-devices"></article>
        <article class="card c-gauge" id="d-gauge"></article>
        <article class="card card-dark c-uptime" id="d-uptime"></article>
      </div>`,
    update() {
      const st = S.status, ph = S.pihole;
      const arrow = (href, label) => `<a class="arrow" href="${href}" aria-label="${label}">${icon('arrow')}</a>`;
      const pl = pauseLabel();
      setHTML($('#pause-slot'), `<button type="button" class="btn btn-outline" data-action="toggle-pause" ${!ph ? 'disabled' : ''}>${esc(pl.text)}</button>`);

      const t = st?.temp;
      const lvl = t == null ? null : t >= 75 ? ['chip-red', 'Hot', 'Too hot. Check airflow'] : t >= 65 ? ['chip-yellow', 'Warm', 'Getting warm'] : ['chip-green', 'Cool', 'Normal range'];
      setHTML($('#d-temp'), `<div class="card-head"><div class="card-title">Temperature</div>${arrow('#/control', 'Open Control')}</div>
        <div class="big">${t == null ? '–' : Math.round(t) + '°C'}</div>
        <div class="sub sub-row">${lvl ? `<span class="chip ${lvl[0]}">${lvl[1]}</span><span>${lvl[2]}</span>` : '<span>Reading…</span>'}</div>`);

      const cpu = st ? Math.round(st.cpu) : null;
      setHTML($('#d-cpu'), `<div class="card-head"><div class="card-title">CPU</div>${arrow('#/control', 'Open Control')}</div>
        <div class="big">${cpu == null ? '–' : cpu + '%'}</div>
        <div class="bar"><span class="${cpu > 85 ? 'danger' : cpu > 60 ? 'warn' : ''}" style="width:${cpu || 0}%"></span></div>`);

      const m = st?.mem;
      const mp = m && m.total ? Math.round((m.used / m.total) * 100) : null;
      setHTML($('#d-mem'), `<div class="card-head"><div class="card-title">Memory</div>${arrow('#/control', 'Open Control')}</div>
        <div class="big">${mp == null ? '–' : mp + '%'}</div>
        <div class="sub">${m ? `${gb(m.used)} of ${gb(m.total)} · ${gb(m.available)} free` : '&nbsp;'}</div>`);

      const ds = st?.disks?.storage, sd = st?.disks?.sd;
      setHTML($('#d-storage'), `<div class="card-head"><div class="card-title">${esc(storageName())}</div>${arrow('#/files', 'Open Files')}</div>
        <div class="big">${ds ? `${(ds.free / 1024 ** 3).toFixed(1)} <small>GB</small>` : '–'}</div>
        <div class="sub">${!st ? '&nbsp;' : ds ? `free of ${gb(ds.total)}${sd ? ` · SD card ${gb(sd.free)} free` : ''}` : `Drive not connected${sd ? ` · SD card ${gb(sd.free)} free` : ''}`}</div>`);

      setHTML($('#d-chart'), `<div class="card-head"><div class="card-title">Ads blocked this week</div><div class="card-note">${ph ? `${fmtNum(ph.domains)} domains on blocklist` : ''}</div></div>
        ${S.history ? chartHTML(S.history) : `<div class="empty">${esc(S.historyErr || 'Loading…')}</div>`}`);

      if (st) {
        const alerts = st.alerts || [];
        const danger = alerts.filter((a) => a.level === 'danger');
        const active = st.services.filter((s) => s.active).length;
        const title = danger.length ? 'Needs attention' : 'All systems running';
        const power = { ok: ['dot-green', 'Power OK'], past: ['dot-yellow', 'Power dipped since restart'], now: ['dot-red', 'Low power right now'] }[st.power];
        const upd = st.updates == null ? ['dot-gray', 'Checking for updates…'] : st.updates ? ['dot-yellow', `${st.updates} update${st.updates === 1 ? '' : 's'} available`] : ['dot-green', 'Up to date'];
        const job = S.jobs.update;
        const action = job?.running
          ? `<a class="btn btn-outline btn-block" href="#/control">Installing… see progress</a>`
          : st.updates ? `<button type="button" class="btn btn-black btn-block" data-action="run-update">${icon('download')}Install updates</button>`
            : `<a class="btn btn-outline btn-block" href="#/control">Open Control</a>`;
        setHTML($('#d-health'), `<div class="card-title">Server health</div>
          <div class="health-title">${title}</div>
          ${danger.slice(0, 2).map((a) => `<div class="line"><span class="dot dot-red"></span>${esc(a.text)}</div>`).join('')}
          <div class="line"><span class="dot ${active === st.services.length ? 'dot-green' : 'dot-red'}"></span>${active} of ${st.services.length} services active</div>
          ${power ? `<div class="line"><span class="dot ${power[0]}"></span>${power[1]}</div>` : ''}
          <div class="line"><span class="dot ${upd[0]}"></span>${upd[1]}</div>
          <div class="card-foot">${action}</div>`);
      } else setHTML($('#d-health'), '<div class="card-title">Server health</div><div class="empty">Loading…</div>');

      const allOk = st && st.services.every((s) => s.active);
      setHTML($('#d-services'), `<div class="card-head"><div class="card-title">Services</div>${st ? `<span class="chip ${allOk ? 'chip-green' : 'chip-red'}">${allOk ? 'All running' : 'Check'}</span>` : ''}</div>
        <div class="rows">${servicesRows(false)}</div>`);

      const dev = S.devices?.devices;
      const chip = { online: '<span class="chip chip-green">Online</span>', idle: '<span class="chip chip-yellow">Idle</span>', offline: '<span class="chip chip-gray">Offline</span>' };
      setHTML($('#d-devices'), `<div class="card-head"><div class="card-title">Your devices</div><div class="card-note">via Tailscale</div></div>
        ${dev ? (dev.length ? dev.slice(0, 5).map((d) => `<div class="device"><div class="device-icon">${icon(d.kind)}</div>
          <div><div class="device-name">${esc(d.title)}</div><div class="device-host">${esc(d.name)}${d.state === 'offline' && timeAgo(d.last_seen) ? ` · seen ${timeAgo(d.last_seen)}` : ''}${d.exit_node ? ' · exit node' : ''}</div></div>
          ${chip[d.state]}</div>`).join('') : '<div class="empty">No other devices yet.</div>')
        : `<div class="empty">${esc(S.devicesErr || 'Loading…')}</div>`}`);

      if (ph) {
        const pct = Math.max(0, Math.min(100, ph.percent || 0));
        const dash = (pct / 100) * 282.7;
        setHTML($('#d-gauge'), `<div class="card-head" style="align-self:stretch"><div class="card-title">Ad blocking</div>${ph.blocking ? '<span class="chip chip-green">On</span>' : '<span class="chip chip-yellow">Paused</span>'}</div>
          <div class="gauge"><svg viewBox="0 0 220 124" aria-hidden="true"><path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="#8DB355" stroke-width="26" stroke-linecap="round"/>
            ${pct > 0 ? `<path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="#D90000" stroke-width="26" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} 400"/>` : ''}</svg>
            <div class="gauge-text"><div class="gauge-num">${pct.toFixed(0)}%</div><div class="gauge-cap">blocked · last 24 hours</div></div></div>
          <div class="legend"><span><span class="dot dot-red"></span>Blocked ${fmtNum(ph.blocked)}</span><span><span class="dot dot-green"></span>Allowed ${fmtNum(Math.max(0, ph.total - ph.blocked))}</span></div>
          <button type="button" class="btn btn-outline gauge-pause" data-action="toggle-pause">${esc(pauseLabel().text)}</button>`);
      } else setHTML($('#d-gauge'), `<div class="card-title" style="align-self:flex-start">Ad blocking</div><div class="empty">${esc(S.piholeErr || 'Loading…')}</div>`);

      setHTML($('#d-uptime'), `<div class="card-head"><div class="card-title">Uptime</div>${st?.power === 'ok' ? '<span class="chip chip-green">Power OK</span>' : st?.power === 'now' ? '<span class="chip chip-red">Low power</span>' : st?.power === 'past' ? '<span class="chip chip-yellow">Power dipped</span>' : ''}</div>
        <div class="uptime-num">${st ? fmtUptime(st.uptime) : '–'}</div>
        <div class="sub">since last restart</div>
        <div class="btn-pair">
          <button type="button" class="btn btn-yellow" data-action="reboot">${icon('restart')}Restart</button>
          <button type="button" class="btn btn-red" data-action="poweroff">${icon('power')}Shut down</button>
        </div>`);
    },
  };

  views.files = {
    title: 'Files',
    mount: () => `
      <div class="page-head">
        <div><h1>Files</h1><p>Everything in ${esc(storageName())}, on your Pi.</p></div>
        <div class="head-actions">
          <button type="button" class="btn btn-black" data-action="upload">${icon('upload')}Upload</button>
          <button type="button" class="btn btn-outline" data-action="new-folder">${icon('folderPlus')}New folder</button>
        </div>
      </div>
      <form class="search only-small" id="files-search" role="search">
        ${icon('search')}<label class="sr-only" for="files-q">Search your files</label>
        <input id="files-q" type="search" placeholder="Search your files" autocomplete="off">
      </form>
      <div class="files-bar"><div class="crumbs" id="crumbs"></div><div class="storage-line" id="storage-line"></div></div>
      <div id="file-list"></div>`,
    enter(params) {
      const q = params.get('q') || '';
      const path = params.get('path') || '';
      const changed = q !== S.files.query || path !== S.files.path || !S.files.items;
      S.files.query = q;
      S.files.path = path;
      const field = $('#files-q');
      if (field && field.value !== q) field.value = q;
      if (changed) loadFiles();
    },
    update() {
      const f = S.files;

      let crumbs;
      if (f.query) {
        crumbs = `<span>Results for “${esc(f.query)}”</span><button type="button" data-action="clear-search">Clear</button>`;
      } else {
        const parts = f.path ? f.path.split('/') : [];
        crumbs = `<button type="button" data-action="open-dir" data-path="" ${parts.length ? '' : 'aria-current="page"'}>${esc(storageName())}</button>` +
          parts.map((p, i) => `<span class="crumb-sep">/</span><button type="button" data-action="open-dir" data-path="${esc(parts.slice(0, i + 1).join('/'))}" ${i === parts.length - 1 ? 'aria-current="page"' : ''}>${esc(p)}</button>`).join('');
      }
      setHTML($('#crumbs'), crumbs);
      const d = f.disk || S.status?.disks?.storage;
      setHTML($('#storage-line'), d ? `<div class="bar"><span class="${d.used / d.total > 0.9 ? 'danger' : ''}" style="width:${Math.round((d.used / d.total) * 100)}%"></span></div><span>${gb(d.free)} free of ${gb(d.total)}</span>` : '');

      if (f.err) { setHTML($('#file-list'), `<div class="card"><div class="empty">${esc(f.err)}</div></div>`); return; }
      if (!f.items) { setHTML($('#file-list'), '<div class="card"><div class="empty">Loading…</div></div>'); return; }
      if (!f.items.length) {
        setHTML($('#file-list'), `<div class="card" style="align-items:center;text-align:center;padding:40px 20px">
          <div class="file-icon folder" style="width:56px;height:56px">${icon('folder', 'i-lg')}</div>
          <div class="card-title" style="margin-top:14px">${f.query ? 'Nothing found' : 'This folder is empty'}</div>
          <div class="card-note" style="margin-top:4px">${f.query ? 'Try a shorter word.' : 'Upload files here, or drop them onto this page.'}</div></div>`);
        return;
      }
      const rows = f.items.map((it) => {
        const kind = it.dir ? 'folder' : fileKind(it.name);
        const folderOf = it.path.includes('/') ? it.path.slice(0, it.path.lastIndexOf('/')) : storageName();
        const sub = f.query ? esc(folderOf) : it.dir ? fmtDate(it.mtime) : `${fmtBytes(it.size)} · ${fmtDate(it.mtime)}`;
        const label = `<span class="file-icon ${it.dir ? 'folder' : ''}">${icon(kind)}</span><span style="min-width:0"><div class="file-name">${esc(it.name)}</div><div class="file-sub">${sub}</div></span>`;
        const open = it.dir
          ? `<button type="button" class="file-open" data-action="open-dir" data-path="${esc(it.path)}">${label}</button>`
          : `<a class="file-open" href="/api/file?path=${enc(it.path)}" target="_blank" rel="noopener">${label}</a>`;
        return `<div class="file-row">${open}
          <div class="file-meta">${f.query ? esc(folderOf) : it.dir ? '—' : fmtBytes(it.size)}</div>
          <div class="file-meta">${fmtDate(it.mtime)}</div>
          <div class="file-actions">
            ${it.dir ? '' : `<a class="icon-btn icon-btn-sm" href="/api/file?path=${enc(it.path)}&dl=1" download aria-label="Download ${esc(it.name)}">${icon('download')}</a>`}
            <button type="button" class="icon-btn icon-btn-sm" data-action="rename" data-path="${esc(it.path)}" data-name="${esc(it.name)}" aria-label="Rename ${esc(it.name)}">${icon('edit')}</button>
            <button type="button" class="icon-btn icon-btn-sm danger" data-action="delete" data-path="${esc(it.path)}" data-name="${esc(it.name)}" data-dir="${it.dir ? 1 : 0}" aria-label="Delete ${esc(it.name)}">${icon('trash')}</button>
          </div></div>`;
      }).join('');
      setHTML($('#file-list'), `<div class="file-list"><div class="file-row head"><span>NAME</span><span>${f.query ? 'FOLDER' : 'SIZE'}</span><span>MODIFIED</span><span></span></div>${rows}</div>
        ${f.more ? '<div class="empty">Showing the first 200 matches.</div>' : ''}`);
    },
  };

  async function loadFiles() {
    const f = S.files;
    const want = { path: f.path, query: f.query };
    f.err = null;
    if (f.items === null || f.loading) refresh();
    f.loading = true;
    try {
      const data = f.query ? await api(`/api/files/search?q=${enc(f.query)}`) : await api(`/api/files?path=${enc(f.path)}`);
      if (want.path !== f.path || want.query !== f.query) return;
      f.items = data.items;
      f.more = !!data.more;
      if (data.disk) f.disk = data.disk;
    } catch (e) {
      if (e.status === 401) return;
      f.items = [];
      f.err = e.message;
    } finally { f.loading = false; }
    refresh();
  }

  views.ads = {
    title: 'Ad blocking',
    mount: () => `
      <div class="page-head">
        <div><h1>Ad blocking</h1><p>Pi-hole blocks ads and trackers for every device that uses it.</p></div>
        <div class="head-actions"><a class="btn btn-outline" id="ph-admin" href="#" target="_blank" rel="noopener">${icon('external')}Pi-hole admin</a></div>
      </div>
      <div class="grid-4" id="ads-stats"></div>
      <div class="grid-2"><article class="card" id="ads-control"></article><article class="card" id="ads-chart"></article></div>
      <div class="grid-2"><article class="card" id="ads-top"></article><article class="card" id="ads-gravity"></article></div>`,
    enter() { if (!S.about) kick('about'); kick('top'); refreshJob('gravity'); },
    update() {
      const ph = S.pihole;
      const admin = S.about?.links?.[0]?.url;
      if (admin) $('#ph-admin').href = admin;
      const mini = (title, value) => `<article class="card mini"><div class="card-title">${title}</div><div class="big-md">${value}</div></article>`;
      setHTML($('#ads-stats'), ph
        ? mini('Blocked · 24 h', fmtNum(ph.blocked)) + mini('Requests · 24 h', fmtNum(ph.total)) + mini('Blocked share', `${(ph.percent || 0).toFixed(1)}%`) + mini('Blocklist', fmtNum(ph.domains))
        : `<article class="card mini" style="grid-column:1/-1"><div class="empty">${esc(S.piholeErr || 'Loading…')}</div></article>`);

      if (ph) {
        const left = ph.timer ? Math.max(1, Math.ceil(ph.timer / 60)) : null;
        setHTML($('#ads-control'), `<div class="card-title">Blocking</div>
          <div class="state-big"><span class="dot ${ph.blocking ? 'dot-green' : 'dot-yellow'}"></span>${ph.blocking ? 'On' : 'Paused'}${!ph.blocking && left ? `<span class="card-note" style="font-size:15px;font-weight:600">· ${left} min left</span>` : ''}</div>
          <div class="card-note">${ph.blocking ? 'Ads and trackers are blocked on every device using your Pi. Pause it if a site or link breaks.' : left ? 'Ads are showing for now. Blocking turns back on by itself.' : 'Ads are showing until you turn blocking back on.'}</div>
          <div class="choice">${ph.blocking
            ? [5, 30, 60].map((mn) => `<button type="button" class="btn btn-outline btn-sm" data-action="pause" data-min="${mn}">${mn === 60 ? '1 hour' : mn + ' min'}</button>`).join('') + '<button type="button" class="btn btn-outline btn-sm" data-action="pause" data-min="0">Until I resume</button>'
            : `<button type="button" class="btn btn-black" data-action="resume">${icon('play')}Turn blocking back on</button>`}</div>`);
      } else setHTML($('#ads-control'), `<div class="card-title">Blocking</div><div class="empty">${esc(S.piholeErr || 'Loading…')}</div>`);

      setHTML($('#ads-chart'), `<div class="card-head"><div class="card-title">Blocked this week</div><div class="card-note">per day</div></div>
        ${S.history ? chartHTML(S.history) : `<div class="empty">${esc(S.historyErr || 'Loading…')}</div>`}`);

      setHTML($('#ads-top'), `<div class="card-head"><div class="card-title">Most blocked</div><div class="card-note">last 24 hours</div></div>
        ${S.top ? (S.top.length ? `<div>${S.top.map((d) => `<div class="domain-row"><span class="mono">${esc(d.domain)}</span><span class="chip chip-gray">${fmtNum(d.count)}</span></div>`).join('')}</div>` : '<div class="empty">Nothing blocked yet.</div>') : '<div class="empty">Loading…</div>'}`);

      const job = S.jobs.gravity;
      setHTML($('#ads-gravity'), `<div class="card-title">Blocklists</div>
        <div class="card-note" style="margin-top:4px">${ph ? `${fmtNum(ph.domains)} domains are blocked. ` : ''}Pi-hole refreshes the lists every week by itself.</div>
        <div class="card-foot"><button type="button" class="btn btn-black" data-action="run-gravity" ${job?.running ? 'disabled' : ''}>${icon('restart')}${job?.running ? 'Updating…' : 'Update blocklists now'}</button></div>
        ${jobBlock('gravity')}`);
      scrollLogs();
    },
  };

  views.control = {
    title: 'Control',
    mount: () => `
      <div class="page-head"><div><h1>Control</h1><p>Restart, update and look after your Pi.</p></div></div>
      <div class="grid-2" style="align-items:start"><article class="card card-dark" id="ctl-power"></article><article class="card" id="ctl-updates"></article></div>
      <div class="grid-2"><article class="card" id="ctl-services"></article><article class="card" id="ctl-links"></article></div>`,
    enter() { kick('about'); refreshJob('update'); },
    update() {
      const st = S.status, ab = S.about;
      setHTML($('#ctl-power'), `<div class="card-head"><div class="card-title">Power</div>${st?.temp != null ? `<span class="chip ${st.temp >= 75 ? 'chip-red' : st.temp >= 65 ? 'chip-yellow' : 'chip-green'}">${Math.round(st.temp)}°C</span>` : ''}</div>
        <div class="uptime-num">${st ? fmtUptime(st.uptime) : '–'}</div>
        <div class="sub">uptime${ab ? ` · ${esc(ab.model)}` : ''}</div>
        <div class="btn-pair">
          <button type="button" class="btn btn-yellow" data-action="reboot">${icon('restart')}Restart Pi</button>
          <button type="button" class="btn btn-red" data-action="poweroff">${icon('power')}Shut down</button>
        </div>`);

      const job = S.jobs.update;
      const n = st?.updates;
      setHTML($('#ctl-updates'), `<div class="card-head"><div class="card-title">Updates</div>${n == null ? '' : n ? `<span class="chip chip-yellow">${n} waiting</span>` : '<span class="chip chip-green">Up to date</span>'}</div>
        <div class="card-note">${n ? 'Installs every waiting update for the Pi. It can take a few minutes, so keep the Pi plugged in.' : 'Security updates also install by themselves every day.'}</div>
        <div class="card-foot"><button type="button" class="btn btn-black" data-action="run-update" ${job?.running ? 'disabled' : ''}>${icon('download')}${job?.running ? 'Installing…' : n ? 'Install updates' : 'Check and install updates'}</button></div>
        ${jobBlock('update')}`);

      setHTML($('#ctl-services'), `<div class="card-head"><div class="card-title">Services</div></div><div>${servicesRows(true)}</div>`);
      setHTML($('#ctl-links'), `<div class="card-head"><div class="card-title">Quick links</div></div>
        ${ab ? ab.links.map((l) => `<a class="link-row" href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span>${icon('external')}</a>`).join('') : '<div class="empty">Loading…</div>'}`);
      scrollLogs();
    },
  };

  views.settings = {
    title: 'Settings',
    mount: () => `
      <div class="page-head"><div><h1>Settings</h1><p>Your profile, your PIN and details about this Pi.</p></div></div>
      <article class="card">
        <div class="card-title">Profile</div>
        <div class="card-note">Your photo shows at the top of the app and on the lock screen.</div>
        <div class="profile-edit">
          <span class="avatar avatar-xl" data-avatar></span>
          <div style="display:flex;flex-direction:column;gap:12px;min-width:0;flex:1 1 260px">
            <div class="choice">
              <button type="button" class="btn btn-black btn-sm" data-action="change-photo">${icon('image')}Change photo</button>
              <button type="button" class="btn btn-outline btn-sm" data-action="remove-photo" id="remove-photo">Remove photo</button>
            </div>
            <form id="name-form" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end" autocomplete="off">
              <div class="field" style="margin-top:0;flex:1;min-width:180px;max-width:360px"><label for="name-input">Your name</label>
                <input class="input" id="name-input" type="text" maxlength="40" required></div>
              <button type="submit" class="btn btn-outline">Save name</button>
            </form>
          </div>
        </div>
        <input type="file" id="photo-input" accept="image/*" hidden>
      </article>
      <div class="grid-2">
        <article class="card">
          <div class="card-title">Change PIN</div>
          <div class="card-note">4 to 6 digits. You'll use it to open Pi Home and to confirm big actions.</div>
          <form id="pin-form" autocomplete="off">
            <div class="field"><label for="pin-cur">Current PIN</label><input class="input" id="pin-cur" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" required></div>
            <div class="field"><label for="pin-new">New PIN</label><input class="input" id="pin-new" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" required></div>
            <div class="field"><label for="pin-new2">New PIN again</label><input class="input" id="pin-new2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" required></div>
            <p class="form-msg" id="pin-msg" role="status"></p>
            <button type="submit" class="btn btn-black">Save new PIN</button>
          </form>
        </article>
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
          <article class="card" id="set-about"></article>
          <article class="card">
            <div class="card-title">Auto-lock</div>
            <div class="card-note">When Pi Home asks for your PIN again.</div>
            <div class="choice" id="lock-choices"></div>
          </article>
          <article class="card">
            <div class="card-title">This device</div>
            <div class="card-note">Lock Pi Home now, or add it to this device's home screen.</div>
            <div class="choice">
              <button type="button" class="btn btn-black" data-action="lock">${icon('lock')}Lock now</button>
              <button type="button" class="btn btn-outline" data-action="install-help">${icon('phone')}Add to home screen</button>
            </div>
          </article>
        </div>
      </div>`,
    enter() { kick('about'); },
    update() {
      const ab = S.about;
      const nameInput = $('#name-input');
      if (nameInput && !nameInput.dataset.touched) nameInput.value = S.session?.name || '';
      $('#remove-photo').hidden = !S.session?.avatar;
      const opts = [[0, 'When I leave the app'], [60, 'After 1 min'], [300, 'After 5 min'], [1800, 'After 30 min']];
      setHTML($('#lock-choices'), opts.map(([sec, label]) => `<button type="button" class="btn btn-sm ${lockAfter() === sec ? 'btn-black' : 'btn-outline'}" data-action="set-lock" data-sec="${sec}" aria-pressed="${lockAfter() === sec}">${label}</button>`).join(''));
      setHTML($('#set-about'), `<div class="card-title">About this Pi</div>${ab ? `<dl class="kv">
        <dt>Model</dt><dd>${esc(ab.model)}</dd><dt>System</dt><dd>${esc(ab.os)}</dd><dt>Name</dt><dd>${esc(ab.host)}</dd>
        <dt>Home IP</dt><dd class="mono">${esc(ab.lan_ip || '–')}</dd><dt>Tailscale IP</dt><dd class="mono">${esc(ab.tailscale_ip || '–')}</dd>
        <dt>Pi Home</dt><dd>Version ${esc(ab.version)}</dd></dl>` : '<div class="empty">Loading…</div>'}`);
    },
  };

  let current = null;
  const view = $('#view');

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [name, qs] = h.split('?');
    return { name: views[name] ? name : 'dashboard', params: new URLSearchParams(qs || '') };
  }

  function route() {
    if (!S.unlocked) return;
    const { name, params } = parseHash();
    $$('[data-route]').forEach((a) => {
      const on = a.dataset.route === name;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (current !== name) {
      current = name;
      view.innerHTML = views[name].mount();
      $$('[data-icon]', view).forEach((el) => { el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[el.dataset.icon] || ''}</svg>`; });
      refreshChrome();
      document.title = `${views[name].title} · Pi Home`;
      window.scrollTo(0, 0);
    }
    views[name].enter?.(params);
    views[name].update();
  }
  window.addEventListener('hashchange', route);

  function refresh() {
    refreshChrome();
    if (S.unlocked && current) views[current].update();
  }

  async function refreshJob(name) {
    try { S.jobs[name] = await api(`/api/jobs/${name}`, { poll: true }); } catch (e) { return; }
    refresh();
    if (S.jobs[name]?.running) watchJob(name);
  }

  let uploading = false, uploadsHideTimer = null;

  function queueUploads(fileList, dir) {
    const files = [...fileList].filter((f) => f.size > 0 || f.type);
    if (!files.length) return;
    files.forEach((file) => S.uploads.push({ file, dir, loaded: 0, state: 'waiting', error: '' }));
    renderUploads();
    if (!uploading) runUploads();
  }

  function renderUploads() {
    const box = $('#uploads');
    const list = S.uploads;
    if (!list.length) { box.hidden = true; return; }
    box.hidden = false;
    const done = list.filter((u) => u.state === 'done').length;
    const failed = list.filter((u) => u.state === 'error').length;
    const active = list.some((u) => u.state === 'waiting' || u.state === 'sending');
    box.innerHTML = `<div class="up-head"><span>${active ? `Uploading ${done + 1} of ${list.length}` : `Uploaded ${done} of ${list.length}`}${failed ? ` · ${failed} failed` : ''}</span>
      ${active ? '' : `<button type="button" class="icon-btn icon-btn-sm" data-action="close-uploads" aria-label="Close">${icon('x')}</button>`}</div>
      ${list.slice(-6).map((u) => {
        const pct = u.state === 'done' ? 100 : Math.round((u.loaded / (u.file.size || 1)) * 100);
        const right = u.state === 'done' ? 'Done' : u.state === 'error' ? 'Failed' : u.state === 'sending' ? `${pct}%` : 'Waiting';
        return `<div class="up-item"><div class="up-name"><span>${esc(u.file.name)}</span><span class="card-note">${right}</span></div>
          ${u.error ? `<div class="form-msg error" style="margin:2px 0 0;min-height:0">${esc(u.error)}</div>` : `<div class="bar"><span class="${u.state === 'error' ? 'danger' : ''}" style="width:${pct}%"></span></div>`}</div>`;
      }).join('')}`;
  }

  function sendFile(u) {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open('PUT', `/api/upload?path=${enc(u.dir)}&name=${enc(u.file.name)}`);
      x.setRequestHeader('X-Pi-Home', '1');
      x.setRequestHeader('Content-Type', 'application/octet-stream');
      let last = 0;
      x.upload.onprogress = (e) => { u.loaded = e.loaded; if (Date.now() - last > 200) { last = Date.now(); renderUploads(); } };
      x.onload = () => {
        if (x.status >= 200 && x.status < 300) return resolve();
        let msg = '';
        try { msg = JSON.parse(x.responseText).error; } catch (e) {}
        if (x.status === 401) showLock();
        reject(new Error(msg || 'Upload failed.'));
      };
      x.onerror = () => reject(new Error("Can't reach your Pi."));
      x.send(u.file);
    });
  }

  async function runUploads() {
    uploading = true;
    clearTimeout(uploadsHideTimer);
    for (const u of S.uploads) {
      if (u.state !== 'waiting') continue;
      u.state = 'sending'; renderUploads();
      try { await sendFile(u); u.state = 'done'; } catch (e) { u.state = 'error'; u.error = e.message; }
      renderUploads();
    }
    uploading = false;
    const failed = S.uploads.filter((u) => u.state === 'error').length;
    const ok = S.uploads.filter((u) => u.state === 'done').length;
    if (ok) toast(`${ok} file${ok === 1 ? '' : 's'} saved to ${storageName()}.`);
    if (current === 'files') loadFiles();
    kick('status');
    if (!failed) uploadsHideTimer = setTimeout(() => { S.uploads = []; renderUploads(); }, 3500);
    if (document.hidden && lockAfter() === 0 && Date.now() > leaveOkUntil) lockNow();
  }

  const actions = {
    lock: async () => { try { await api('/api/lock', { method: 'POST' }); } catch (e) {} showLock(); },
    upload: () => { allowLeave(); $('#file-input').click(); },
    'close-uploads': () => { S.uploads = []; renderUploads(); },
    'install-help': async () => {
      if (installPrompt) { installPrompt.prompt(); installPrompt = null; return; }
      await modal({
        title: 'Add Pi Home to your home screen', confirm: 'Got it', cancel: '',
        html: `<ol class="modal-steps">
          <li><strong>iPhone or iPad:</strong> open this page in Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</li>
          <li><strong>Android (Chrome):</strong> tap <strong>⋮</strong>, then <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
          <li><strong>Computer (Chrome or Edge):</strong> click the install icon at the right of the address bar. In Firefox, bookmark it.</li></ol>`,
      });
    },
    'change-photo': () => { allowLeave(); $('#photo-input').click(); },
    'set-lock': async (el) => {
      const res = await api('/api/settings', { method: 'POST', body: { lock_after: Number(el.dataset.sec) } });
      S.session.lock_after = res.lock_after;
      refresh();
      toast('Auto-lock updated.');
    },
    'remove-photo': async () => {
      await api('/api/avatar', { method: 'DELETE' });
      S.session.avatar = null;
      refresh();
      toast('Photo removed.');
    },
    'open-dir': (el) => { location.hash = `#/files?path=${enc(el.dataset.path)}`; },
    'clear-search': () => { const s = $('#search-input'); if (s) s.value = ''; location.hash = `#/files?path=${enc(S.files.lastPath || '')}`; },
    'new-folder': () => modal({
      title: 'New folder', input: { label: 'Folder name', value: '' }, confirm: 'Create',
      onConfirm: async (name) => { await api('/api/mkdir', { method: 'POST', body: { path: S.files.query ? '' : S.files.path, name } }); toast('Folder created.'); loadFiles(); },
    }),
    rename: (el) => modal({
      title: 'Rename', input: { label: 'New name', value: el.dataset.name }, confirm: 'Rename',
      onConfirm: async (name) => { if (name === el.dataset.name) return; await api('/api/files/rename', { method: 'POST', body: { path: el.dataset.path, name } }); toast('Renamed.'); loadFiles(); },
    }),
    delete: (el) => withPin({
      title: `Delete “${el.dataset.name}”?`,
      text: el.dataset.dir === '1' ? `This folder and everything inside it will be deleted from ${storageName()}. This can't be undone.` : `It will be deleted from ${storageName()}. This can't be undone.`,
      confirm: 'Delete', variant: 'red',
    }, async (pin) => { await api('/api/files/delete', { method: 'POST', body: { path: el.dataset.path, pin } }); toast('Deleted.'); loadFiles(); kick('status'); }),
    'toggle-pause': async () => {
      if (!S.pihole) return;
      return S.pihole.blocking ? setBlocking(false, 5) : setBlocking(true);
    },
    pause: (el) => setBlocking(false, Number(el.dataset.min) || null),
    resume: () => setBlocking(true),
    reboot: async () => {
      const ok = await withPin({ title: 'Restart your Pi?', text: 'Everything stops for about a minute, then comes back by itself.', confirm: 'Restart', variant: 'yellow' },
        (pin) => api('/api/power', { method: 'POST', body: { action: 'reboot', pin } }));
      if (!ok) return;
      S.unlocked = false;
      overlay('Restarting your Pi…', 'This page reconnects by itself in about a minute.');
      await sleep(15000);
      for (;;) {
        try { const r = await fetch('/api/ping', { cache: 'no-store' }); if (r.ok) { location.reload(); return; } } catch (e) {}
        await sleep(3000);
      }
    },
    poweroff: async () => {
      const ok = await withPin({ title: 'Shut down your Pi?', text: 'Everything on the Pi, including this app, stops until you unplug the power and plug it back in.', confirm: 'Shut down', variant: 'red' },
        (pin) => api('/api/power', { method: 'POST', body: { action: 'poweroff', pin } }));
      if (!ok) return;
      S.unlocked = false;
      overlay('Your Pi is shutting down', 'Wait until the green light stops blinking, then you can unplug it. If your devices use Pi-hole, websites may not load until the Pi is back on.', false);
    },
    'restart-svc': (el) => withPin({ title: `Restart ${el.dataset.name}?`, text: el.dataset.unit === 'tailscaled' ? 'This app reconnects by itself in a few seconds.' : 'It\'s back in a few seconds.', confirm: 'Restart', variant: 'black' },
      async (pin) => { await api('/api/service', { method: 'POST', body: { unit: el.dataset.unit, pin } }); toast(`${el.dataset.name} restarted.`); setTimeout(() => kick('status', 'pihole'), 3000); }),
    'run-update': () => withPin({ title: 'Install updates?', text: 'The Pi downloads and installs every waiting update. Keep it plugged in until it finishes.', confirm: 'Install', variant: 'black' },
      async (pin) => { S.jobs.update = await api('/api/jobs/update', { method: 'POST', body: { pin } }); if (current !== 'control') location.hash = '#/control'; refresh(); watchJob('update'); }),
    'run-gravity': () => withPin({ title: 'Update blocklists now?', text: 'Pi-hole downloads the latest lists. It takes about a minute, and ad blocking keeps working.', confirm: 'Update', variant: 'black' },
      async (pin) => { S.jobs.gravity = await api('/api/jobs/gravity', { method: 'POST', body: { pin } }); refresh(); watchJob('gravity'); }),
  };

  async function squarePhoto(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("That photo couldn't be opened. Try a JPG or PNG."));
        i.src = url;
      });
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      canvas.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 512, 512);
      return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    } finally { URL.revokeObjectURL(url); }
  }

  async function savePhoto(file) {
    try {
      const blob = await squarePhoto(file);
      const res = await fetch('/api/avatar', { method: 'PUT', headers: { 'X-Pi-Home': '1', 'Content-Type': 'image/jpeg' }, body: blob, credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { showLock(); return; }
      if (!res.ok) throw new Error(data.error || 'The photo didn\'t save.');
      S.session.avatar = data.avatar;
      refresh();
      toast('Photo updated.');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function setBlocking(enable, minutes = null) {
    try {
      await api('/api/pihole/blocking', { method: 'POST', body: { enable, minutes } });
      toast(enable ? 'Ad blocking is back on.' : minutes ? `Ad blocking paused for ${minutes === 60 ? '1 hour' : minutes + ' minutes'}.` : 'Ad blocking paused until you turn it back on.');
    } catch (e) { if (e.status !== 401) toast(e.message, 'error'); }
    kick('pihole');
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('a[target="_blank"], a[download]')) allowLeave();
    const el = e.target.closest('[data-action]');
    if (el && actions[el.dataset.action] && !el.disabled) {
      e.preventDefault();
      Promise.resolve(actions[el.dataset.action](el, e)).catch((err) => { if (err?.status !== 401) toast(err.message || 'Something went wrong.', 'error'); });
    }
    const pop = $('#alerts-pop');
    if (!pop.hidden && !e.target.closest('.bell-wrap')) toggleAlerts(false);
  });

  let installPrompt = null;
  let lastTouch = Date.now();

  function wire() {
    $$('[data-icon]').forEach((el) => { el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[el.dataset.icon] || ''}</svg>`; });

    if (matchMedia('(pointer: coarse)').matches) document.documentElement.classList.add('touch');
    pinInput().addEventListener('input', onPinInput);
    $('#lock').addEventListener('click', (e) => { if (!e.target.closest('a, button')) focusPin(); });
    document.addEventListener('keydown', (e) => {
      if ($('#lock').hidden) {
        if (e.key === 'Escape') toggleAlerts(false);
        return;
      }

      if (document.activeElement !== pinInput() && /^[0-9]$/.test(e.key)) {
        e.preventDefault();
        pinInput().value += e.key;
        focusPin();
        onPinInput();
      }
    });
    window.addEventListener('focus', () => setTimeout(focusPin, 50));

    $('#bell').addEventListener('click', () => toggleAlerts());

    $('#search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('#search-input').value.trim();
      if (q) { if (!S.files.query) S.files.lastPath = S.files.path; location.hash = `#/files?q=${enc(q)}`; }
    });
    view.addEventListener('change', (e) => {
      if (e.target.id === 'photo-input' && e.target.files[0]) { savePhoto(e.target.files[0]); e.target.value = ''; }
    });
    view.addEventListener('input', (e) => { if (e.target.id === 'name-input') e.target.dataset.touched = '1'; });
    view.addEventListener('submit', async (e) => {
      if (e.target.id === 'name-form') {
        e.preventDefault();
        const field = $('#name-input');
        try {
          const res = await api('/api/profile', { method: 'POST', body: { name: field.value.trim() } });
          S.session.name = res.name;
          delete field.dataset.touched;
          refresh();
          toast('Name saved.');
        } catch (err) { if (err.status !== 401) toast(err.message, 'error'); }
        return;
      }
      if (e.target.id === 'files-search') {
        e.preventDefault();
        const q = $('#files-q').value.trim();
        if (!S.files.query) S.files.lastPath = S.files.path;
        location.hash = q ? `#/files?q=${enc(q)}` : `#/files?path=${enc(S.files.lastPath || '')}`;
      }
      if (e.target.id === 'pin-form') {
        e.preventDefault();
        const msg = $('#pin-msg');
        const cur = $('#pin-cur').value, a = $('#pin-new').value, b = $('#pin-new2').value;
        msg.className = 'form-msg error';
        if (!/^\d{4,6}$/.test(a)) { msg.textContent = 'The new PIN must be 4 to 6 digits.'; return; }
        if (a !== b) { msg.textContent = 'The new PINs don\'t match.'; return; }
        try {
          await api('/api/pin', { method: 'POST', body: { current: cur, new: a } });
          S.session.pin_length = a.length;
          e.target.reset();
          msg.className = 'form-msg ok'; msg.textContent = 'New PIN saved.';
        } catch (err) { if (err.status !== 401) msg.textContent = err.message; }
      }
    });

    $('#file-input').addEventListener('change', (e) => {
      const dir = current === 'files' && !S.files.query ? S.files.path : '';
      queueUploads(e.target.files, dir);
      e.target.value = '';
    });

    let dragDepth = 0, dropEl = null;
    const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
    window.addEventListener('dragenter', (e) => {
      if (!hasFiles(e) || current !== 'files' || !S.unlocked) return;
      dragDepth++;
      if (!dropEl) {
        dropEl = document.createElement('div');
        dropEl.className = 'drop';
        dropEl.innerHTML = `<div class="drop-box">${icon('upload')}<div>Drop to upload to ${esc(S.files.path ? S.files.path.split('/').pop() : storageName())}</div></div>`;
        document.body.append(dropEl);
      }
    });
    window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth && dropEl) { dropEl.remove(); dropEl = null; } });
    window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
    window.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth = 0;
      if (dropEl) { dropEl.remove(); dropEl = null; }
      if (current === 'files' && S.unlocked) queueUploads(e.dataTransfer.files, S.files.query ? '' : S.files.path);
    });

    const touch = () => {
      lastActive = Date.now();
      if (S.unlocked && Date.now() - lastTouch > 60000) { lastTouch = Date.now(); api('/api/touch').catch(() => {}); }
    };
    ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, touch, { passive: true }));

    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone) $('#install-card').hidden = true;

    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }

  async function boot() {
    wire();
    for (let attempt = 0; ; attempt++) {
      try { S.session = await api('/api/session'); break; } catch (e) {
        $('#lock').hidden = false;
        $('#pin-field').hidden = true;
        $('#lock-hint').hidden = true;
        $('#lock-sub').textContent = "Can't reach your Pi. Retrying…";
        await sleep(Math.min(10000, 2000 + attempt * 1000));
      }
    }
    $('#pin-field').hidden = false;
    refreshChrome();
    $('#lock-hint').hidden = false;

    const leftAt = Number(store.get(LEFT_KEY) || 0);
    if (S.session.unlocked && (lockAfter() === 0 || (leftAt && Date.now() - leftAt > lockAfter() * 1000))) {
      try { fetch('/api/lock', { method: 'POST', headers: { 'X-Pi-Home': '1' }, keepalive: true }).catch(() => {}); } catch (e) {}
      S.session.unlocked = false;
    }
    store.del(LEFT_KEY);
    if (S.session.unlocked) onUnlocked(); else showLock();
  }

  boot();
})();
