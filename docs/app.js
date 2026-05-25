import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://afdyosgcumozhkbmhrne.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZHlvc2djdW1vemhrYm1ocm5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODQyODUsImV4cCI6MjA5MzM2MDI4NX0.5wsC2hUeLjd0dh5YASoml_SMRZJvrdGFbarbJwIVk3s';

const STATUSES = [
  ['new',            'New'],
  ['to_contact',     'To contact'],
  ['contacted',      'Contacted'],
  ['replied',        'Replied'],
  ['meeting',        'Meeting'],
  ['proposal',       'Proposal'],
  ['won',            'Won'],
  ['lost',           'Lost'],
  ['not_interested', 'Not interested'],
];
const STATUS_LABEL = Object.fromEntries(STATUSES.map(([k, l]) => [k, l]));

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

const el = {
  metrics:        document.getElementById('metrics'),
  tabs:           document.getElementById('tabs'),
  leadsBody:      document.getElementById('leadsBody'),
  search:         document.getElementById('search'),
  hideExtBtn:     document.getElementById('hideExternalBtn'),
  hideExtLabel:   document.getElementById('hideExternalLabel'),
  totalCount:     document.getElementById('totalCount'),
  totalCount2:    document.getElementById('totalCount2'),
  visibleCount:   document.getElementById('visibleCount'),
  drawerRoot:     document.getElementById('drawerRoot'),
  toastRoot:      document.getElementById('toastRoot'),
};

let leads = [];
let tab = 'all';
let query = '';
let hideExternal = false;

const AVATAR_COLORS = [
  ['oklch(70% 0.15 30)',  'oklch(60% 0.18 20)'],
  ['oklch(70% 0.14 180)', 'oklch(58% 0.16 200)'],
  ['oklch(72% 0.14 290)', 'oklch(60% 0.18 280)'],
  ['oklch(72% 0.14 140)', 'oklch(58% 0.16 150)'],
  ['oklch(72% 0.14 50)',  'oklch(60% 0.18 40)'],
  ['oklch(70% 0.14 340)', 'oklch(58% 0.18 350)'],
  ['oklch(70% 0.14 220)', 'oklch(58% 0.18 240)'],
  ['oklch(72% 0.14 100)', 'oklch(58% 0.16 110)'],
];
function initials(name) {
  return (name || '?').split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}
function avatarColors(name) {
  const i = [...(name || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}
function avatarEl(name, size = 30) {
  const [c1, c2] = avatarColors(name);
  const d = document.createElement('div');
  d.className = 'lead-avatar';
  d.style.width = d.style.height = `${size}px`;
  d.style.fontSize = `${Math.round(size * 0.38)}px`;
  d.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
  d.textContent = initials(name);
  return d;
}

async function load() {
  const { data, error } = await sb
    .from('lead_crm_leads')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) { console.error(error); toast('Failed to load: ' + error.message); return; }
  leads = data || [];
  render();
}

function counts() {
  const c = { all: leads.length };
  for (const [k] of STATUSES) c[k] = 0;
  for (const l of leads) c[l.status] = (c[l.status] || 0) + 1;
  return c;
}

function renderMetrics() {
  const c = counts();
  const active = (c.to_contact || 0) + (c.contacted || 0) + (c.replied || 0) + (c.meeting || 0) + (c.proposal || 0);
  const trulyNoSite = leads.filter(l => !l.external_website_search).length;
  const cards = [
    { label: 'Total leads',       value: leads.length, delta: 'in the pipeline' },
    { label: 'New',               value: c.new || 0,   delta: 'awaiting triage' },
    { label: 'Active deals',      value: active,       delta: 'contacted → proposal' },
    { label: 'Truly no website',  value: trulyNoSite,  delta: 'highest-priority targets' },
  ];
  el.metrics.innerHTML = '';
  for (const card of cards) {
    const d = document.createElement('div');
    d.className = 'metric';
    d.innerHTML = `
      <div class="label">${card.label}</div>
      <div class="value mono">${card.value}</div>
      <div class="delta">${card.delta}</div>
    `;
    el.metrics.appendChild(d);
  }
}

function renderTabs() {
  const c = counts();
  const TABS = [
    ['all',         'All',           c.all],
    ['new',         'New',           c.new || 0],
    ['to_contact',  'To contact',    c.to_contact || 0],
    ['contacted',   'Contacted',     c.contacted || 0],
    ['replied',     'Replied',       c.replied || 0],
    ['meeting',     'Meeting',       c.meeting || 0],
    ['proposal',    'Proposal',      c.proposal || 0],
    ['won',         'Won',           c.won || 0],
    ['lost',        'Lost',          c.lost || 0],
  ];
  el.tabs.innerHTML = '';
  for (const [k, label, count] of TABS) {
    const b = document.createElement('button');
    b.className = 'tab' + (tab === k ? ' active' : '');
    b.innerHTML = `${label} <span class="badge">${count}</span>`;
    b.addEventListener('click', () => { tab = k; render(); });
    el.tabs.appendChild(b);
  }
}

function renderTable() {
  const q = query.trim().toLowerCase();
  const visible = leads.filter(l => {
    if (tab !== 'all' && l.status !== tab) return false;
    if (hideExternal && l.external_website_search) return false;
    if (q && ![l.name, l.address, l.category].some(v => (v || '').toLowerCase().includes(q))) return false;
    return true;
  });
  el.visibleCount.textContent = visible.length;
  el.totalCount.textContent = `${leads.length} total`;
  el.totalCount2.textContent = leads.length;

  el.leadsBody.innerHTML = '';
  if (!visible.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="8"><div class="empty">Žádné leady neodpovídají filtru.</div></td>`;
    el.leadsBody.appendChild(tr);
    return;
  }
  for (const l of visible) el.leadsBody.appendChild(rowFor(l));
}

function rowFor(l) {
  const tr = document.createElement('tr');
  tr.addEventListener('click', () => openDrawer(l));

  const tdName = document.createElement('td');
  const wrap = document.createElement('div');
  wrap.className = 'lead-name';
  wrap.appendChild(avatarEl(l.name));
  const nm = document.createElement('span');
  nm.textContent = l.name;
  wrap.appendChild(nm);
  if (l.external_website_search) {
    const b = document.createElement('span');
    b.className = 'badge-soft';
    b.title = 'Profile is missing a website on Maps, but search found one online.';
    b.textContent = 'has site';
    wrap.appendChild(b);
  }
  tdName.appendChild(wrap);
  tr.appendChild(tdName);

  const tdCat = document.createElement('td');
  tdCat.style.color = 'var(--text-2)';
  tdCat.textContent = l.category || '';
  tr.appendChild(tdCat);

  const tdStatus = document.createElement('td');
  tdStatus.addEventListener('click', e => e.stopPropagation());
  tdStatus.appendChild(pillSelect(l));
  tr.appendChild(tdStatus);

  const tdRev = document.createElement('td');
  if (l.latest_review_text) {
    const span = document.createElement('span');
    const stale = (l.latest_review_months_ago ?? 99) > 12;
    span.className = 'review-cell' + (stale ? ' stale' : '');
    span.textContent = l.latest_review_text;
    tdRev.appendChild(span);
  } else {
    tdRev.innerHTML = '<span class="review-cell">—</span>';
  }
  tr.appendChild(tdRev);

  const tdRate = document.createElement('td');
  tdRate.className = 'mono';
  tdRate.style.color = 'var(--text-2)';
  tdRate.textContent = l.rating_text || '—';
  tr.appendChild(tdRate);

  const tdPhone = document.createElement('td');
  if (l.phone) {
    const a = document.createElement('a');
    a.href = `tel:${l.phone}`;
    a.className = 'muted-link mono';
    a.textContent = l.phone;
    a.addEventListener('click', e => e.stopPropagation());
    tdPhone.appendChild(a);
  } else tdPhone.textContent = '—';
  tr.appendChild(tdPhone);

  const tdAddr = document.createElement('td');
  tdAddr.className = 'address-cell';
  tdAddr.title = l.address || '';
  tdAddr.textContent = l.address || '';
  tr.appendChild(tdAddr);

  const tdMaps = document.createElement('td');
  if (l.maps_url) {
    const a = document.createElement('a');
    a.href = l.maps_url; a.target = '_blank'; a.rel = 'noopener';
    a.className = 'link';
    a.textContent = 'open';
    a.addEventListener('click', e => e.stopPropagation());
    tdMaps.appendChild(a);
  }
  tr.appendChild(tdMaps);

  return tr;
}

function pillSelect(l) {
  const wrap = document.createElement('span');
  wrap.style.position = 'relative';
  wrap.style.display = 'inline-block';

  const pill = document.createElement('button');
  pill.className = `pill ${l.status}`;
  pill.innerHTML = `<span class="dot"></span>${STATUS_LABEL[l.status] || l.status}`;

  const select = document.createElement('select');
  Object.assign(select.style, { position: 'absolute', inset: '0', opacity: '0', cursor: 'pointer', width: '100%', height: '100%' });
  for (const [v, label] of STATUSES) {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = label;
    if (v === l.status) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', async () => {
    const newStatus = select.value;
    const { error } = await sb.from('lead_crm_leads').update({ status: newStatus }).eq('id', l.id);
    if (error) { toast('Save failed: ' + error.message); return; }
    l.status = newStatus;
    toast(`${l.name} → ${STATUS_LABEL[newStatus]}`);
    render();
  });

  wrap.appendChild(pill);
  wrap.appendChild(select);
  return wrap;
}

function openDrawer(l) {
  el.drawerRoot.innerHTML = '';
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';
  backdrop.addEventListener('click', closeDrawer);

  const drawer = document.createElement('div');
  drawer.className = 'drawer';

  const head = document.createElement('div');
  head.className = 'drawer-head';
  head.appendChild(avatarEl(l.name, 44));
  const titleWrap = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.textContent = l.name;
  const org = document.createElement('div');
  org.className = 'org';
  org.textContent = l.category || '';
  titleWrap.appendChild(h2);
  titleWrap.appendChild(org);
  head.appendChild(titleWrap);
  const close = document.createElement('button');
  close.className = 'drawer-close';
  close.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
  close.addEventListener('click', closeDrawer);
  head.appendChild(close);

  const body = document.createElement('div');
  body.className = 'drawer-body';
  body.innerHTML = `
    <div class="section-title">Status</div>
    <div class="status-options" id="drawerStatuses"></div>

    <div class="section-title">Detaily</div>
    <div class="kv-grid">
      <div class="k">Kategorie</div><div class="v">${esc(l.category)}</div>
      <div class="k">Hodnocení</div><div class="v mono">${esc(l.rating_text) || '—'}</div>
      <div class="k">Adresa</div><div class="v">${esc(l.address)}</div>
      <div class="k">Telefon</div><div class="v">${l.phone ? `<a class="link" href="tel:${esc(l.phone)}">${esc(l.phone)}</a>` : '—'}</div>
      <div class="k">Recenze</div><div class="v">${esc(l.latest_review_text) || '—'}</div>
      <div class="k">Maps</div><div class="v">${l.maps_url ? `<a class="link" target="_blank" rel="noopener" href="${esc(l.maps_url)}">Otevřít v Google Maps</a>` : '—'}</div>
      <div class="k">Externí web</div><div class="v">${l.external_website_search ? `<a class="link" target="_blank" rel="noopener" href="${esc(l.external_website_search)}">${esc(hostnameOf(l.external_website_search))}</a>` : '<span style="color:var(--text-3)">žádný</span>'}</div>
      <div class="k">Nalezeno přes</div><div class="v" style="color:var(--text-3)">${esc(l.found_via_query) || '—'}</div>
    </div>

    <div class="section-title">Poznámky</div>
    <textarea class="notes" id="drawerNotes" placeholder="Co se stalo, kdy zavolat, kontext…"></textarea>
  `;

  const statusBox = body.querySelector('#drawerStatuses');
  for (const [v, label] of STATUSES) {
    const p = document.createElement('button');
    p.className = `pill ${v}`;
    p.style.opacity = v === l.status ? '1' : '0.5';
    p.innerHTML = `<span class="dot"></span>${label}`;
    p.addEventListener('click', async () => {
      const { error } = await sb.from('lead_crm_leads').update({ status: v }).eq('id', l.id);
      if (error) { toast('Save failed: ' + error.message); return; }
      l.status = v;
      toast(`${l.name} → ${label}`);
      statusBox.querySelectorAll('.pill').forEach(p2 => p2.style.opacity = '0.5');
      p.style.opacity = '1';
      render();
    });
    statusBox.appendChild(p);
  }

  const ta = body.querySelector('#drawerNotes');
  ta.value = l.notes || '';
  let timer;
  ta.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const { error } = await sb.from('lead_crm_leads').update({ notes: ta.value }).eq('id', l.id);
      if (error) toast('Save failed: ' + error.message);
      else l.notes = ta.value;
    }, 500);
  });

  const foot = document.createElement('div');
  foot.className = 'drawer-foot';
  foot.textContent = `Aktualizováno: ${l.updated_at ? new Date(l.updated_at).toLocaleString('cs-CZ') : '—'}`;

  drawer.appendChild(head);
  drawer.appendChild(body);
  drawer.appendChild(foot);

  el.drawerRoot.appendChild(backdrop);
  el.drawerRoot.appendChild(drawer);

  document.addEventListener('keydown', escClose);
}
function escClose(e) { if (e.key === 'Escape') closeDrawer(); }
function closeDrawer() {
  el.drawerRoot.innerHTML = '';
  document.removeEventListener('keydown', escClose);
}

function toast(msg) {
  el.toastRoot.innerHTML = '';
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  el.toastRoot.appendChild(t);
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.toastRoot.innerHTML = ''; }, 2400);
}

function hostnameOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } }
function esc(s) {
  return (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function render() {
  renderMetrics();
  renderTabs();
  renderTable();
}

el.search.addEventListener('input', () => { query = el.search.value; renderTable(); });
el.hideExtBtn.addEventListener('click', () => {
  hideExternal = !hideExternal;
  el.hideExtBtn.style.background = hideExternal ? 'var(--primary-soft)' : '';
  el.hideExtBtn.style.color = hideExternal ? 'var(--primary)' : '';
  el.hideExtLabel.textContent = hideExternal ? 'Zobrazit všechny' : 'Skrýt s externím webem';
  renderTable();
});

load();
