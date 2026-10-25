/* AI Console — UI admin provider/model/prompt + monitoring (vanilla JS, tanpa build) */
(function () {
  'use strict';

  const API = location.pathname.replace(/\/ui(\/.*)?$/, '');
  const TOKEN_KEY = 'ai-console-token';
  const PURPOSES = { chat: 'Chat asisten', analysis: 'Analisis transkrip' };
  const app = document.getElementById('app');

  // ---------- util ----------
  const store = {
    get() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
    set(v) { try { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); } catch { /* abaikan */ } },
  };

  // Semua teks dimasukkan sebagai text node (aman dari XSS)
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = Boolean(v);
      else if (k === 'style') el.setAttribute('style', v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    children.flat(Infinity).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    });
    return el;
  }

  let toastTimer;
  function toast(message, isError) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = `toast${isError ? ' error' : ''}`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, isError ? 6000 : 2500);
  }

  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(store.get() ? { Authorization: `Bearer ${store.get()}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let json = {};
    try { json = await res.json(); } catch { /* respons bukan JSON */ }
    if (res.status === 401 && path !== '/login') {
      store.set(null);
      renderLogin('Sesi berakhir, silakan login kembali');
      throw new Error(json.message || 'Unauthorized');
    }
    if (!res.ok || json.success === false) throw new Error(json.message || `HTTP ${res.status}`);
    return json.data;
  }

  const fmt = {
    num: (n) => (n === null || n === undefined ? '-' : Number(n).toLocaleString('id-ID')),
    ms: (n) => (n === null || n === undefined ? '-' : n >= 1000 ? `${(n / 1000).toFixed(1)} dtk` : `${n} ms`),
    pct: (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '-'),
    date: (d) => (d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }) : '-'),
  };

  function modal(content, { wide } = {}) {
    const bg = h('div', { class: 'modal-bg' });
    const box = h('div', { class: `modal${wide ? ' wide' : ''}` });
    const close = () => bg.remove();
    bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
    box.append(...[].concat(content(close)));
    bg.appendChild(box);
    document.body.appendChild(bg);
    const first = box.querySelector('input, textarea, select');
    if (first) first.focus();
    return close;
  }

  function confirmDialog(message) {
    return new Promise((resolve) => {
      modal((close) => [
        h('h2', null, 'Konfirmasi'),
        h('p', null, message),
        h('div', { class: 'actions' },
          h('button', { class: 'btn ghost', onclick: () => { close(); resolve(false); } }, 'Batal'),
          h('button', { class: 'btn', onclick: () => { close(); resolve(true); } }, 'Ya, lanjutkan')),
      ]);
    });
  }

  const field = (label, input, hint) => h('label', { class: 'field' }, h('span', null, label), input, hint ? h('small', { class: 'muted' }, hint) : null);
  const badge = (text, kind) => h('span', { class: `badge${kind ? ` ${kind}` : ''}` }, text);
  const purposeBadges = (list) => (list || []).map((p) => badge(PURPOSES[p] || p, p === 'chat' ? 'primary' : ''));

  // ---------- login ----------
  function renderLogin(message) {
    stopRefresh();
    let error = message || '';
    const user = h('input', { autocomplete: 'username', required: true });
    const pass = h('input', { type: 'password', autocomplete: 'current-password', required: true });
    const alert = h('div');
    const showError = () => alert.replaceChildren(error ? h('div', { class: 'alert error' }, error) : '');
    showError();
    const form = h('form', {
      class: 'card login',
      onsubmit: async (e) => {
        e.preventDefault();
        try {
          const data = await api('/login', { method: 'POST', body: { username: user.value, password: pass.value } });
          store.set(data.token);
          route();
        } catch (err) {
          error = err.message;
          showError();
        }
      },
    },
    h('h1', null, 'AI Console'),
    h('p', { class: 'muted' }, 'Masuk dengan akun admin (ADMIN_USERNAME / ADMIN_PASSWORD).'),
    alert,
    field('Username', user),
    field('Password', pass),
    h('button', { class: 'btn', style: 'width:100%' }, 'Masuk'));
    app.replaceChildren(h('div', { class: 'login-wrap' }, form));
    user.focus();
  }

  // ---------- layout ----------
  const PAGES = {
    dashboard: { title: 'Dashboard', render: renderDashboard },
    providers: { title: 'Provider AI', render: renderProviders },
    models: { title: 'Model AI', render: renderModels },
    prompts: { title: 'Prompt', render: renderPrompts },
    logs: { title: 'Log', render: renderLogs },
    settings: { title: 'Pengaturan', render: renderSettings },
  };

  let refreshTimer;
  function stopRefresh() { clearInterval(refreshTimer); refreshTimer = null; }

  function route() {
    if (!store.get()) return renderLogin();
    stopRefresh();
    const name = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('?')[0];
    const page = PAGES[name] ? name : 'dashboard';
    const main = h('main', { class: 'main' });
    const nav = h('nav', { class: 'nav' }, Object.entries(PAGES).map(([key, p]) => h('a', { href: `#/${key}`, class: key === page ? 'active' : '' }, p.title)));
    app.replaceChildren(h('div', { class: 'layout' },
      h('aside', { class: 'sidebar' },
        h('div', { class: 'brand' }, 'AI Console', h('small', null, 'Mosa AI Assistant')),
        nav,
        h('div', { class: 'spacer' }),
        h('button', { class: 'btn ghost sm', onclick: () => { store.set(null); renderLogin(); } }, 'Keluar')),
      main));
    document.title = `${PAGES[page].title} — AI Console`;
    PAGES[page].render(main).catch((err) => main.replaceChildren(h('div', { class: 'alert error' }, err.message)));
  }

  window.addEventListener('hashchange', route);

  const pageHead = (title, desc, ...actions) => h('div', { class: 'page-head' },
    h('div', { class: 'row' }, h('h1', null, title), h('div', { class: 'spacer' }), actions),
    desc ? h('p', { class: 'muted' }, desc) : null);

  // ---------- dashboard ----------
  async function renderDashboard(main) {
    let range = '24h';
    const body = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Memuat...'));
    const rangeSelect = h('select', { style: 'width:auto', onchange: (e) => { range = e.target.value; load(); } },
      [['1h', '1 jam'], ['24h', '24 jam'], ['7d', '7 hari'], ['30d', '30 hari']].map(([v, l]) => h('option', { value: v, selected: v === range }, l)));
    main.replaceChildren(
      pageHead('Dashboard', 'Pemakaian model AI dan konfigurasi yang sedang berlaku. Diperbarui otomatis setiap 30 detik.', rangeSelect),
      body);

    async function load() {
      const d = await api(`/overview?range=${range}`);
      const t = d.totals || {};
      const stt = Object.fromEntries((d.transcriptions || []).map((r) => [r.status, r.total]));
      const sttTotal = Object.values(stt).reduce((a, b) => a + b, 0);

      const stats = h('div', { class: 'grid stats' },
        stat('Panggilan AI', fmt.num(t.total), `${fmt.num(t.total - t.success)} gagal`),
        stat('Tingkat sukses', fmt.pct(t.success, t.total), `${fmt.num(t.success)} sukses`),
        stat('Rata-rata latency', fmt.ms(t.avg_latency_ms), 'panggilan sukses'),
        stat('Token', fmt.num(Number(t.prompt_tokens) + Number(t.completion_tokens)), `${fmt.num(t.prompt_tokens)} in · ${fmt.num(t.completion_tokens)} out`),
        stat('Speech-to-text', fmt.num(sttTotal), Object.entries(stt).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'tidak ada'),
        stat('Sesi chat aktif', fmt.num(d.conversations), 'diperbarui dalam rentang ini'));

      const chain = (purpose) => {
        const list = d.active[purpose] || [];
        return h('div', { class: 'card' },
          h('h3', null, `Urutan model — ${PURPOSES[purpose]}`),
          list.some((c) => c.source === 'env')
            ? h('div', { class: 'alert warn small' }, 'Belum ada model aktif di database untuk kegunaan ini. Sistem memakai konfigurasi .env.')
            : null,
          h('ol', { class: 'chain' }, list.map((c, i) => h('li', null,
            h('b', null, c.model), h('span', { class: 'muted' }, c.provider),
            i === 0 ? badge('utama', 'ok') : badge('fallback'),
            c.has_key ? null : badge('API key kosong', 'err')))),
          d.settings.use_fallback === false ? h('p', { class: 'small muted' }, 'Fallback nonaktif: hanya model pertama yang dipakai.') : null);
      };

      const errors = h('div', { class: 'card table-wrap' },
        h('div', { style: 'padding:16px 16px 0' }, h('h3', null, 'Error terbaru')),
        d.recent_errors.length
          ? h('table', null, h('thead', null, h('tr', null, h('th', null, 'Waktu'), h('th', null, 'Model'), h('th', null, 'Error'))),
            h('tbody', null, d.recent_errors.map((e) => h('tr', null,
              h('td', { class: 'small' }, fmt.date(e.created_at)),
              h('td', null, h('div', { class: 'mono' }, e.model_id), h('div', { class: 'small muted' }, `${e.provider_code} · ${e.purpose}`)),
              h('td', { class: 'small err-text' }, e.error)))))
          : h('p', { class: 'muted', style: 'padding:0 16px 16px' }, 'Tidak ada error.'));

      const byModel = h('div', { class: 'card table-wrap' },
        h('div', { style: 'padding:16px 16px 0' }, h('h3', null, 'Pemakaian per model')),
        d.by_model.length
          ? h('table', null,
            h('thead', null, h('tr', null, ['Model', 'Kegunaan', 'Panggilan', 'Sukses', 'Latency', 'Terakhir'].map((x, i) => h('th', { class: i >= 2 && i <= 4 ? 'num' : '' }, x)))),
            h('tbody', null, d.by_model.map((m) => h('tr', null,
              h('td', null, h('div', { class: 'mono' }, m.model_id), h('div', { class: 'small muted' }, m.provider_code)),
              h('td', null, badge(PURPOSES[m.purpose] || m.purpose)),
              h('td', { class: 'num' }, fmt.num(m.total)),
              h('td', { class: 'num' }, fmt.pct(m.success, m.total)),
              h('td', { class: 'num' }, fmt.ms(m.avg_latency_ms)),
              h('td', { class: 'small' }, fmt.date(m.last_used_at))))))
          : h('p', { class: 'muted', style: 'padding:0 16px 16px' }, 'Belum ada panggilan AI pada rentang ini.'));

      body.replaceChildren(
        stats,
        h('div', { class: 'grid two' }, chain('chat'), chain('analysis')),
        h('div', { class: 'card' },
          h('div', { class: 'row' }, h('h3', { style: 'margin:0' }, 'Panggilan AI'), h('div', { class: 'spacer' }),
            h('div', { class: 'legend' }, h('span', null, h('i', { style: 'background:var(--chart-ok)' }), 'Sukses'), h('span', null, h('i', { style: 'background:var(--chart-err)' }), 'Gagal'))),
          timelineChart(d.timeline, d.bucket)),
        byModel,
        errors);
    }

    await load();
    refreshTimer = setInterval(() => load().catch(() => {}), 30000);
  }

  function stat(label, value, sub) {
    return h('div', { class: 'card stat' }, h('div', { class: 'label' }, label), h('div', { class: 'value' }, value), h('div', { class: 'sub' }, sub));
  }

  // Grafik batang bertumpuk (sukses + gagal) per bucket waktu, SVG murni
  function timelineChart(rows, bucket) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = (tag, attrs) => {
      const el = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      return el;
    };
    if (!rows.length) return h('p', { class: 'muted' }, 'Belum ada data.');
    const W = 800; const H = 180; const PAD = { l: 34, r: 8, t: 8, b: 22 };
    const max = Math.max(1, ...rows.map((r) => r.success + r.failed));
    const bw = (W - PAD.l - PAD.r) / rows.length;
    const y = (v) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / max);
    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', preserveAspectRatio: 'none', role: 'img', 'aria-label': 'Grafik panggilan AI' });
    [0, 0.5, 1].forEach((f) => {
      const v = Math.round(max * f);
      root.appendChild(svg('line', { x1: PAD.l, x2: W - PAD.r, y1: y(v), y2: y(v), class: 'grid-line' }));
      const label = svg('text', { x: PAD.l - 6, y: y(v) + 3, 'text-anchor': 'end', class: 'axis' });
      label.textContent = v;
      root.appendChild(label);
    });
    const step = Math.ceil(rows.length / 8);
    rows.forEach((r, i) => {
      // Batang maksimal 36px, di tengah slot-nya (agar data sedikit tidak memenuhi lebar grafik)
      const w = Math.max(1, Math.min(36, bw - Math.min(4, bw * 0.3)));
      const x = PAD.l + i * bw + (bw - w) / 2;
      const okH = (H - PAD.t - PAD.b) * (r.success / max);
      const errH = (H - PAD.t - PAD.b) * (r.failed / max);
      const g = svg('g', {});
      const title = svg('title', {});
      const when = new Date(r.bucket);
      title.textContent = `${when.toLocaleString('id-ID')}: ${r.success} sukses, ${r.failed} gagal`;
      g.appendChild(title);
      g.appendChild(svg('rect', { x, width: w, y: y(r.success + r.failed) + errH, height: okH, fill: 'var(--chart-ok)', rx: 1 }));
      if (r.failed) g.appendChild(svg('rect', { x, width: w, y: y(r.success + r.failed), height: errH, fill: 'var(--chart-err)', rx: 1 }));
      root.appendChild(g);
      if (i % step === 0) {
        const label = svg('text', { x: x + w / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis' });
        label.textContent = bucket === 'day'
          ? when.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
          : when.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        root.appendChild(label);
      }
    });
    return root;
  }

  // ---------- providers ----------
  async function renderProviders(main) {
    const list = await api('/providers');
    const reload = () => renderProviders(main);
    main.replaceChildren(
      pageHead('Provider AI',
        'Semua provider memakai format OpenAI-compatible (/chat/completions). API key bisa disimpan di database, atau diambil dari variabel .env yang namanya diisi di kolom "Env API key". Perubahan berlaku tanpa rebuild.',
        h('button', { class: 'btn', onclick: () => providerForm({}, reload) }, '+ Provider')),
      h('div', { class: 'card table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ['Provider', 'Base URL', 'API key', 'Model', 'Aktif', ''].map((x) => h('th', null, x)))),
        h('tbody', null, list.length ? list.map((p) => h('tr', { class: p.enabled ? '' : 'dim' },
          h('td', null, h('b', null, p.name), h('div', { class: 'small muted mono' }, p.code), p.notes ? h('div', { class: 'small muted' }, p.notes) : null),
          h('td', { class: 'mono' }, p.base_url),
          h('td', null,
            !p.requires_key ? badge('tidak perlu', 'ok') : p.has_key ? badge(`${p.key_source} ${p.key_preview}`, 'ok') : badge('belum ada', 'err'),
            p.api_key_env ? h('div', { class: 'small muted mono' }, `env: ${p.api_key_env}`) : null),
          h('td', { class: 'num' }, p.model_count),
          h('td', null, h('input', {
            type: 'checkbox', checked: p.enabled,
            onchange: async (e) => {
              try { await api(`/providers/${p.id}`, { method: 'PUT', body: { enabled: e.target.checked } }); toast('Provider diperbarui'); reload(); } catch (err) { toast(err.message, true); e.target.checked = !e.target.checked; }
            },
          })),
          h('td', null, h('div', { class: 'row', style: 'flex-wrap:nowrap' },
            h('button', { class: 'btn sm ghost', onclick: () => providerForm(p, reload) }, 'Edit'),
            h('button', { class: 'btn sm ghost', onclick: () => syncModels(p, reload) }, 'Sync model'),
            h('button', {
              class: 'btn sm danger',
              onclick: async () => {
                if (!await confirmDialog(`Hapus provider ${p.name} beserta ${p.model_count} modelnya?`)) return;
                try { await api(`/providers/${p.id}`, { method: 'DELETE' }); toast('Provider dihapus'); reload(); } catch (err) { toast(err.message, true); }
              },
            }, 'Hapus'))))) : h('tr', null, h('td', { colspan: 6, class: 'muted' }, 'Belum ada provider.'))))));
  }

  function providerForm(p, onSaved) {
    const isEdit = Boolean(p.id);
    const v = {
      code: h('input', { value: p.code || '', required: true, placeholder: 'openrouter', disabled: isEdit }),
      name: h('input', { value: p.name || '', required: true, placeholder: 'OpenRouter' }),
      base_url: h('input', { value: p.base_url || '', required: true, placeholder: 'https://openrouter.ai/api/v1', class: 'mono' }),
      api_key: h('input', { type: 'password', autocomplete: 'off', placeholder: isEdit && p.key_source === 'database' ? `tersimpan (${p.key_preview}) — isi untuk mengganti` : 'sk-...' }),
      clear_api_key: h('input', { type: 'checkbox' }),
      api_key_env: h('input', { value: p.api_key_env || '', placeholder: 'OPENROUTER_API_KEY', class: 'mono' }),
      extra_headers: h('input', { value: JSON.stringify(p.extra_headers || {}), class: 'mono' }),
      notes: h('textarea', { rows: 2, value: p.notes || '' }),
      requires_key: h('input', { type: 'checkbox', checked: p.requires_key !== false }),
      enabled: h('input', { type: 'checkbox', checked: p.enabled !== false }),
    };
    modal((close) => {
      const alert = h('div');
      return h('form', {
        onsubmit: async (e) => {
          e.preventDefault();
          let headers;
          try { headers = JSON.parse(v.extra_headers.value || '{}'); } catch { alert.replaceChildren(h('div', { class: 'alert error' }, 'Extra headers harus JSON valid')); return; }
          const body = {
            name: v.name.value, base_url: v.base_url.value, api_key_env: v.api_key_env.value,
            extra_headers: headers, notes: v.notes.value, requires_key: v.requires_key.checked, enabled: v.enabled.checked,
          };
          if (!isEdit) body.code = v.code.value;
          if (v.api_key.value) body.api_key = v.api_key.value;
          if (v.clear_api_key.checked) body.clear_api_key = true;
          try {
            await api(isEdit ? `/providers/${p.id}` : '/providers', { method: isEdit ? 'PUT' : 'POST', body });
            close(); toast('Provider disimpan'); onSaved();
          } catch (err) { alert.replaceChildren(h('div', { class: 'alert error' }, err.message)); }
        },
      },
      h('h2', null, isEdit ? `Edit ${p.name}` : 'Provider baru'),
      alert,
      h('div', { class: 'form-grid' }, field('Kode (unik)', v.code), field('Nama', v.name)),
      field('Base URL (OpenAI-compatible, tanpa /chat/completions)', v.base_url),
      h('div', { class: 'form-grid' },
        field('API key (disimpan di DB)', v.api_key, isEdit ? 'Kosongkan jika tidak diubah' : null),
        field('Env API key (nama variabel .env)', v.api_key_env, 'Dipakai jika API key di DB kosong')),
      isEdit && p.key_source === 'database' ? h('label', { class: 'check small', style: 'margin-bottom:12px' }, v.clear_api_key, 'Hapus API key yang tersimpan di DB') : null,
      field('Extra headers (JSON)', v.extra_headers),
      field('Catatan', v.notes),
      h('div', { class: 'actions' },
        h('label', { class: 'check small' }, v.requires_key, 'Butuh API key'),
        h('label', { class: 'check small' }, v.enabled, 'Aktif'),
        h('div', { style: 'flex:1' }),
        h('button', { type: 'button', class: 'btn ghost', onclick: close }, 'Batal'),
        h('button', { class: 'btn' }, 'Simpan')));
    });
  }

  function syncModels(provider, onDone) {
    modal((close) => {
      const body = h('div', null, h('p', { class: 'muted' }, 'Mengambil daftar model dari provider...'));
      const counter = h('span', { class: 'muted small' }, '0 dipilih');
      const purposeSel = h('select', { style: 'width:auto' }, Object.entries(PURPOSES).map(([k, l]) => h('option', { value: k }, l)));
      const selected = new Set();
      const addBtn = h('button', {
        class: 'btn', disabled: true,
        onclick: async () => {
          const rows = [...selected].map((id, i) => ({
            provider_id: provider.id, model_id: id, label: id, purposes: [purposeSel.value], priority: 200 + i, enabled: false,
          }));
          try {
            const created = await api('/models', { method: 'POST', body: rows });
            toast(`${created.length} model ditambahkan (nonaktif). Aktifkan di halaman Model AI.`);
            close(); onDone();
          } catch (err) { toast(err.message, true); }
        },
      }, 'Tambahkan');

      api(`/providers/${provider.id}/remote-models`).then((items) => {
        const filter = h('input', { placeholder: 'Filter model (mis. gpt, gemini, claude)' });
        const tbody = h('tbody');
        const draw = () => {
          const q = filter.value.toLowerCase();
          tbody.replaceChildren(...items.filter((m) => !q || m.id.toLowerCase().includes(q)).slice(0, 500).map((m) => h('tr', null,
            h('td', null, h('input', {
              type: 'checkbox', disabled: m.exists, checked: selected.has(m.id),
              onchange: (e) => {
                e.target.checked ? selected.add(m.id) : selected.delete(m.id);
                counter.textContent = `${selected.size} dipilih`;
                addBtn.disabled = !selected.size;
              },
            })),
            h('td', { class: 'mono' }, m.id),
            h('td', null, m.exists ? badge('sudah ada') : null))));
        };
        filter.addEventListener('input', draw);
        draw();
        body.replaceChildren(
          h('p', { class: 'muted small' }, `${items.length} model tersedia.`),
          filter,
          h('div', { style: 'max-height:420px;overflow:auto;margin-top:8px' }, h('table', null, tbody)));
        filter.focus();
      }).catch((err) => body.replaceChildren(h('div', { class: 'alert error' }, err.message)));

      return [
        h('h2', null, `Model di ${provider.name}`),
        body,
        h('div', { class: 'actions' }, counter, h('div', { style: 'flex:1' }), h('span', { class: 'small muted' }, 'Kegunaan:'), purposeSel,
          h('button', { class: 'btn ghost', onclick: close }, 'Tutup'), addBtn),
      ];
    }, { wide: true });
  }

  // ---------- models ----------
  async function renderModels(main) {
    const [models, providers] = await Promise.all([api('/models'), api('/providers')]);
    const reload = () => renderModels(main);
    const filters = { purpose: '', provider: '' };
    const tbody = h('tbody');
    const results = {};

    const update = async (m, patch) => {
      try { await api(`/models/${m.id}`, { method: 'PUT', body: patch }); toast('Model diperbarui'); reload(); } catch (err) { toast(err.message, true); reload(); }
    };

    const draw = () => {
      const shown = models.filter((m) => (!filters.purpose || m.purposes.includes(filters.purpose)) && (!filters.provider || m.provider_id === filters.provider));
      tbody.replaceChildren(...(shown.length ? shown.map((m) => {
        const res = results[m.id];
        const testCell = h('td', { style: 'max-width:260px' },
          h('button', {
            class: 'btn sm ghost', disabled: res === 'loading',
            onclick: async () => {
              results[m.id] = 'loading'; draw();
              try { results[m.id] = await api(`/models/${m.id}/test`, { method: 'POST', body: {} }); } catch (err) { results[m.id] = { ok: false, error: err.message }; }
              draw();
            },
          }, res === 'loading' ? 'Menguji...' : 'Tes'),
          res && res !== 'loading' ? h('div', { class: 'small' },
            res.ok ? badge(`OK ${fmt.ms(res.ms)}`, 'ok') : badge('Gagal', 'err'), ' ',
            h('span', { class: res.ok ? 'muted' : 'err-text' }, res.ok ? res.text : res.error)) : null);
        return h('tr', { class: m.enabled && m.provider_enabled ? '' : 'dim' },
          h('td', null, h('input', { type: 'checkbox', checked: m.enabled, onchange: (e) => update(m, { enabled: e.target.checked }) })),
          h('td', null, h('input', {
            type: 'number', value: m.priority, style: 'width:76px',
            onchange: (e) => update(m, { priority: Number(e.target.value) }),
          })),
          h('td', null, h('div', { class: 'mono' }, m.model_id), m.label ? h('div', { class: 'small muted' }, m.label) : null),
          h('td', null, m.provider_name,
            m.provider_has_key ? null : h('div', null, badge('API key kosong', 'err')),
            m.provider_enabled ? null : h('div', null, badge('provider nonaktif', 'warn'))),
          h('td', null, h('div', { class: 'row' }, purposeBadges(m.purposes))),
          h('td', { class: 'small' }, `${m.temperature ?? 'default'} / ${m.max_tokens ?? 'default'}`),
          testCell,
          h('td', null, h('div', { class: 'row', style: 'flex-wrap:nowrap' },
            h('button', { class: 'btn sm ghost', onclick: () => modelForm(m, providers, reload) }, 'Edit'),
            h('button', {
              class: 'btn sm danger',
              onclick: async () => {
                if (!await confirmDialog(`Hapus model ${m.model_id}?`)) return;
                try { await api(`/models/${m.id}`, { method: 'DELETE' }); toast('Model dihapus'); reload(); } catch (err) { toast(err.message, true); }
              },
            }, 'Hapus'))));
      }) : [h('tr', null, h('td', { colspan: 8, class: 'muted' }, 'Tidak ada model.'))]));
    };

    main.replaceChildren(
      pageHead('Model AI',
        'Untuk tiap kegunaan, model aktif dengan priority terkecil dipakai lebih dulu. Jika gagal, sistem mencoba model berikutnya (fallback). "Chat asisten" dipakai endpoint chat/stream dan validasi customer; "Analisis transkrip" dipakai terjemahan, ringkasan, analisis, dan summarize-all.',
        h('button', { class: 'btn', disabled: !providers.length, onclick: () => modelForm({}, providers, reload) }, '+ Model')),
      h('div', { class: 'row', style: 'margin-bottom:12px' },
        h('select', { style: 'width:200px', onchange: (e) => { filters.purpose = e.target.value; draw(); } },
          h('option', { value: '' }, 'Semua kegunaan'), Object.entries(PURPOSES).map(([k, l]) => h('option', { value: k }, l))),
        h('select', { style: 'width:220px', onchange: (e) => { filters.provider = e.target.value; draw(); } },
          h('option', { value: '' }, 'Semua provider'), providers.map((p) => h('option', { value: p.id }, p.name)))),
      h('div', { class: 'card table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ['Aktif', 'Priority', 'Model', 'Provider', 'Kegunaan', 'Temp / Max token', 'Tes', ''].map((x) => h('th', null, x)))),
        tbody)));
    draw();
  }

  function modelForm(m, providers, onSaved) {
    const isEdit = Boolean(m.id);
    const v = {
      provider_id: h('select', null, providers.map((p) => h('option', { value: p.id, selected: p.id === m.provider_id }, p.name))),
      model_id: h('input', { value: m.model_id || '', required: true, class: 'mono', placeholder: 'gpt-5.4' }),
      label: h('input', { value: m.label || '' }),
      priority: h('input', { type: 'number', value: m.priority ?? 100, min: 0 }),
      temperature: h('input', { type: 'number', step: '0.05', min: 0, max: 2, value: m.temperature ?? '', placeholder: 'default provider' }),
      max_tokens: h('input', { type: 'number', min: 1, value: m.max_tokens ?? '', placeholder: 'default provider' }),
      timeout_ms: h('input', { type: 'number', min: 1000, value: m.timeout_ms ?? 120000 }),
      enabled: h('input', { type: 'checkbox', checked: m.enabled !== false }),
    };
    const purposeBoxes = Object.fromEntries(Object.keys(PURPOSES).map((k) => [k, h('input', { type: 'checkbox', checked: (m.purposes || ['chat']).includes(k) })]));
    modal((close) => {
      const alert = h('div');
      return h('form', {
        onsubmit: async (e) => {
          e.preventDefault();
          const body = {
            provider_id: v.provider_id.value, model_id: v.model_id.value, label: v.label.value,
            purposes: Object.keys(purposeBoxes).filter((k) => purposeBoxes[k].checked),
            priority: v.priority.value, temperature: v.temperature.value, max_tokens: v.max_tokens.value,
            timeout_ms: v.timeout_ms.value, enabled: v.enabled.checked,
          };
          try {
            if (isEdit) await api(`/models/${m.id}`, { method: 'PUT', body });
            else {
              const created = await api('/models', { method: 'POST', body });
              if (!created.length) throw new Error('Model ini sudah ada untuk provider tersebut');
            }
            close(); toast('Model disimpan'); onSaved();
          } catch (err) { alert.replaceChildren(h('div', { class: 'alert error' }, err.message)); }
        },
      },
      h('h2', null, isEdit ? 'Edit model' : 'Model baru'),
      alert,
      h('div', { class: 'form-grid' },
        field('Provider', v.provider_id),
        field('Model ID (persis seperti di provider)', v.model_id),
        field('Label', v.label),
        field('Priority (kecil = dicoba duluan)', v.priority),
        field('Temperature', v.temperature, 'Kosong = tidak dikirim. Analisis memakai temperature tetap per tugas'),
        field('Max tokens', v.max_tokens, 'Kosong = tidak dikirim'),
        field('Timeout (ms)', v.timeout_ms)),
      h('div', { class: 'field' }, h('span', null, 'Kegunaan'),
        h('div', { class: 'row' }, Object.entries(PURPOSES).map(([k, l]) => h('label', { class: 'check' }, purposeBoxes[k], l)))),
      h('div', { class: 'actions' },
        h('label', { class: 'check small' }, v.enabled, 'Aktif'),
        h('div', { style: 'flex:1' }),
        h('button', { type: 'button', class: 'btn ghost', onclick: close }, 'Batal'),
        h('button', { class: 'btn' }, 'Simpan')));
    });
  }

  // ---------- prompts ----------
  async function renderPrompts(main) {
    const prompts = await api('/prompts');
    const reload = () => renderPrompts(main);
    main.replaceChildren(
      pageHead('Prompt',
        'System prompt asisten disimpan di database. Setiap perubahan isi menyimpan versi lama ke riwayat dan menaikkan versi otomatis. Prompt yang dipakai chat dipilih di Pengaturan atau lewat tombol "Pakai untuk chat".',
        h('button', { class: 'btn', onclick: () => promptForm({}, reload) }, '+ Prompt')),
      h('div', { class: 'card table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ['Key', 'Versi', 'Status', 'Panjang', 'Diperbarui', ''].map((x) => h('th', null, x)))),
        h('tbody', null, prompts.length ? prompts.map((p) => h('tr', { class: p.is_active ? '' : 'dim' },
          h('td', null, h('div', { class: 'mono' }, p.key), p.description ? h('div', { class: 'small muted' }, p.description) : null),
          h('td', null, p.version),
          h('td', null, h('div', { class: 'row' },
            p.used_for_chat ? badge('dipakai chat', 'primary') : null,
            p.is_active ? badge('aktif', 'ok') : badge('nonaktif'))),
          h('td', { class: 'num' }, `${fmt.num(p.content.length)} kar`),
          h('td', { class: 'small' }, fmt.date(p.updated_at)),
          h('td', null, h('div', { class: 'row', style: 'flex-wrap:nowrap' },
            h('button', { class: 'btn sm ghost', onclick: () => promptForm(p, reload) }, 'Edit'),
            h('button', { class: 'btn sm ghost', onclick: () => promptHistory(p, reload) }, 'Riwayat'),
            !p.used_for_chat && p.is_active ? h('button', {
              class: 'btn sm ghost',
              onclick: async () => {
                if (!await confirmDialog(`Pakai prompt "${p.key}" untuk chat asisten?`)) return;
                try { await api('/settings', { method: 'PUT', body: { chat_prompt_key: p.key } }); toast('Prompt chat diganti'); reload(); } catch (err) { toast(err.message, true); }
              },
            }, 'Pakai untuk chat') : null,
            !p.used_for_chat ? h('button', {
              class: 'btn sm danger',
              onclick: async () => {
                if (!await confirmDialog(`Hapus prompt "${p.key}"?`)) return;
                try { await api(`/prompts/${encodeURIComponent(p.key)}`, { method: 'DELETE' }); toast('Prompt dihapus'); reload(); } catch (err) { toast(err.message, true); }
              },
            }, 'Hapus') : null)))) : h('tr', null, h('td', { colspan: 6, class: 'muted' }, 'Belum ada prompt.'))))));
  }

  function promptForm(p, onSaved) {
    const isEdit = Boolean(p.key);
    const key = h('input', { value: p.key || '', required: true, class: 'mono', disabled: isEdit, placeholder: 'system_prompt_custom' });
    const description = h('input', { value: p.description || '', maxlength: 255 });
    const content = h('textarea', { class: 'prompt', value: p.content || '', required: true });
    const active = h('input', { type: 'checkbox', checked: p.is_active !== false, disabled: p.used_for_chat });
    const counter = h('span', { class: 'small muted' });
    const count = () => { counter.textContent = `${content.value.length.toLocaleString('id-ID')} karakter`; };
    content.addEventListener('input', count);
    count();
    modal((close) => {
      const alert = h('div');
      return h('form', {
        onsubmit: async (e) => {
          e.preventDefault();
          const body = { content: content.value, description: description.value, is_active: active.checked };
          try {
            if (isEdit) await api(`/prompts/${encodeURIComponent(p.key)}`, { method: 'PUT', body });
            else await api('/prompts', { method: 'POST', body: { ...body, key: key.value } });
            close(); toast('Prompt disimpan, berlaku dalam beberapa detik'); onSaved();
          } catch (err) { alert.replaceChildren(h('div', { class: 'alert error' }, err.message)); }
        },
      },
      h('h2', null, isEdit ? `Edit prompt ${p.key} (v${p.version})` : 'Prompt baru'),
      alert,
      h('div', { class: 'form-grid' }, field('Key', key), field('Deskripsi', description)),
      field('Isi prompt', content),
      h('div', { class: 'actions' },
        counter,
        h('label', { class: 'check small' }, active, 'Aktif'),
        h('div', { style: 'flex:1' }),
        h('button', { type: 'button', class: 'btn ghost', onclick: close }, 'Batal'),
        h('button', { class: 'btn' }, 'Simpan')));
    }, { wide: true });
  }

  function promptHistory(p, onRestored) {
    modal((close) => {
      const body = h('div', null, h('p', { class: 'muted' }, 'Memuat riwayat...'));
      api(`/prompts/${encodeURIComponent(p.key)}/history`).then((rows) => {
        if (!rows.length) { body.replaceChildren(h('p', { class: 'muted' }, 'Belum ada riwayat perubahan.')); return; }
        const preview = h('pre', { class: 'view' }, rows[0].content);
        let current = rows[0];
        const restoreBtn = h('button', {
          class: 'btn',
          onclick: async () => {
            if (!await confirmDialog(`Kembalikan isi prompt ke versi ${current.version}? Isi sekarang akan disimpan ke riwayat.`)) return;
            try { await api(`/prompts/${encodeURIComponent(p.key)}/restore/${current.id}`, { method: 'POST', body: {} }); toast('Prompt dikembalikan'); close(); onRestored(); } catch (err) { toast(err.message, true); }
          },
        }, 'Kembalikan versi ini');
        const select = h('select', {
          onchange: (e) => { current = rows.find((r) => r.id === e.target.value); preview.textContent = current.content; },
        }, rows.map((r) => h('option', { value: r.id }, `v${r.version || '-'} · ${fmt.date(r.created_at)}${r.changed_by ? ` · ${r.changed_by}` : ''}`)));
        body.replaceChildren(field('Versi sebelumnya', select), preview, h('div', { class: 'actions' }, restoreBtn));
      }).catch((err) => body.replaceChildren(h('div', { class: 'alert error' }, err.message)));
      return [h('h2', null, `Riwayat ${p.key}`), body, h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: close }, 'Tutup'))];
    }, { wide: true });
  }

  // ---------- logs ----------
  async function renderLogs(main) {
    const q = { page: 1, limit: 50, purpose: '', success: '', model: '' };
    const body = h('div');
    const load = async () => {
      const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== '')).toString();
      const d = await api(`/logs?${params}`);
      const pages = Math.max(1, Math.ceil(d.total / d.limit));
      body.replaceChildren(
        h('div', { class: 'card table-wrap' }, h('table', null,
          h('thead', null, h('tr', null, ['Waktu', 'Kegunaan', 'Model', 'Status', 'Latency', 'Token', 'Error'].map((x, i) => h('th', { class: i === 4 || i === 5 ? 'num' : '' }, x)))),
          h('tbody', null, d.rows.length ? d.rows.map((r) => h('tr', null,
            h('td', { class: 'small', style: 'white-space:nowrap' }, fmt.date(r.created_at)),
            h('td', null, badge(PURPOSES[r.purpose] || r.purpose), r.streaming ? h('div', { class: 'small muted' }, 'stream') : null),
            h('td', null, h('div', { class: 'mono' }, r.model_id), h('div', { class: 'small muted' }, r.provider_code)),
            h('td', null, r.success ? badge('sukses', 'ok') : badge('gagal', 'err')),
            h('td', { class: 'num' }, fmt.ms(r.latency_ms)),
            h('td', { class: 'num small' }, r.prompt_tokens !== null ? `${fmt.num(r.prompt_tokens)} / ${fmt.num(r.completion_tokens)}` : '-'),
            h('td', { class: 'small err-text', style: 'max-width:420px' }, r.error || ''))) : h('tr', null, h('td', { colspan: 7, class: 'muted' }, 'Tidak ada log.'))))),
        h('div', { class: 'row', style: 'margin-top:12px' },
          h('span', { class: 'muted small' }, `${fmt.num(d.total)} log · halaman ${d.page} dari ${pages}`),
          h('div', { class: 'spacer' }),
          h('button', { class: 'btn sm ghost', disabled: q.page <= 1, onclick: () => { q.page -= 1; load(); } }, '← Sebelumnya'),
          h('button', { class: 'btn sm ghost', disabled: q.page >= pages, onclick: () => { q.page += 1; load(); } }, 'Berikutnya →')));
    };
    const onFilter = (key) => (e) => { q[key] = e.target.value; q.page = 1; load().catch((err) => toast(err.message, true)); };
    let modelTimer;
    main.replaceChildren(
      pageHead('Log panggilan AI', 'Setiap panggilan model (termasuk percobaan fallback dan tombol Tes) dicatat di tabel ai_logs.'),
      h('div', { class: 'row', style: 'margin-bottom:12px' },
        h('select', { style: 'width:200px', onchange: onFilter('purpose') }, h('option', { value: '' }, 'Semua kegunaan'),
          Object.entries({ ...PURPOSES, test: 'Tes manual' }).map(([k, l]) => h('option', { value: k }, l))),
        h('select', { style: 'width:160px', onchange: onFilter('success') }, h('option', { value: '' }, 'Semua status'), h('option', { value: 'true' }, 'Sukses'), h('option', { value: 'false' }, 'Gagal')),
        h('input', { placeholder: 'Cari model...', style: 'width:220px', oninput: (e) => { clearTimeout(modelTimer); modelTimer = setTimeout(() => onFilter('model')(e), 300); } })),
      body);
    await load();
  }

  // ---------- settings ----------
  async function renderSettings(main) {
    const [settings, prompts] = await Promise.all([api('/settings'), api('/prompts')]);
    const promptSel = h('select', null, prompts.filter((p) => p.is_active).map((p) => h('option', { value: p.key, selected: p.key === settings.chat_prompt_key }, `${p.key} (v${p.version})`)));
    const fallback = h('input', { type: 'checkbox', checked: settings.use_fallback !== false });
    main.replaceChildren(
      pageHead('Pengaturan', 'Pengaturan runtime disimpan di tabel ai_settings dan berlaku tanpa restart. Container lain membaca ulang konfigurasi paling lambat sesuai AI_CONFIG_CACHE_TTL_MS (default 15 detik).'),
      h('form', {
        class: 'card', style: 'max-width:640px',
        onsubmit: async (e) => {
          e.preventDefault();
          try { await api('/settings', { method: 'PUT', body: { chat_prompt_key: promptSel.value, use_fallback: fallback.checked } }); toast('Pengaturan disimpan'); } catch (err) { toast(err.message, true); }
        },
      },
      field('Prompt untuk chat asisten', promptSel, 'Dipakai endpoint /chat dan /chat/stream'),
      h('label', { class: 'check', style: 'margin-bottom:16px' }, fallback, 'Jika model gagal, coba model berikutnya sesuai priority (fallback)'),
      h('div', { class: 'actions' }, h('button', { class: 'btn' }, 'Simpan'))));
  }

  route();
}());
