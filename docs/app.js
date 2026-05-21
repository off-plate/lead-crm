import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://afdyosgcumozhkbmhrne.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZHlvc2djdW1vemhrYm1ocm5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODQyODUsImV4cCI6MjA5MzM2MDI4NX0.5wsC2hUeLjd0dh5YASoml_SMRZJvrdGFbarbJwIVk3s';

const STATUSES = [
  ['new', 'New'],
  ['to_contact', 'To contact'],
  ['contacted', 'Contacted'],
  ['replied', 'Replied'],
  ['meeting', 'Meeting'],
  ['proposal', 'Proposal'],
  ['won', 'Won'],
  ['lost', 'Lost'],
  ['not_interested', 'Not interested'],
];

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
const tbody = document.querySelector('#leads tbody');
const search = document.querySelector('#search');
const statusFilter = document.querySelector('#statusFilter');
const hideExternal = document.querySelector('#hideExternal');
const countEl = document.querySelector('#count');

let leads = [];

async function load() {
  const { data, error } = await sb
    .from('lead_crm_leads')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) { console.error(error); return; }
  leads = data;
  render();
}

function render() {
  const q = search.value.trim().toLowerCase();
  const s = statusFilter.value;
  const hideExt = hideExternal.checked;
  const visible = leads.filter(l => {
    if (s && l.status !== s) return false;
    if (hideExt && l.external_website_search) return false;
    if (q && ![l.name, l.address, l.category].some(v => (v || '').toLowerCase().includes(q))) return false;
    return true;
  });
  countEl.textContent = `${visible.length} / ${leads.length}`;
  tbody.innerHTML = '';
  for (const lead of visible) tbody.appendChild(row(lead));
}

function row(l) {
  const tr = document.createElement('tr');

  const tdStatus = document.createElement('td');
  const sel = document.createElement('select');
  sel.className = 'status';
  sel.dataset.status = l.status;
  for (const [v, label] of STATUSES) {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = label;
    if (v === l.status) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', async () => {
    const newStatus = sel.value;
    sel.dataset.status = newStatus;
    const { error } = await sb.from('lead_crm_leads').update({ status: newStatus }).eq('id', l.id);
    if (error) { alert('Save failed: ' + error.message); return; }
    l.status = newStatus;
  });
  tdStatus.appendChild(sel);
  tr.appendChild(tdStatus);

  const tdName = document.createElement('td');
  tdName.textContent = l.name;
  if (l.external_website_search) {
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = 'has site';
    b.title = 'Profile is missing a website, but search found one. Probably already online.';
    tdName.appendChild(b);
  }
  tr.appendChild(tdName);

  tr.appendChild(td(l.category));
  tr.appendChild(td(l.address));

  const tdPhone = document.createElement('td');
  if (l.phone) {
    const a = document.createElement('a');
    a.href = `tel:${l.phone}`;
    a.textContent = l.phone;
    tdPhone.appendChild(a);
  }
  tr.appendChild(tdPhone);

  const tdReview = document.createElement('td');
  tdReview.className = 'review';
  if (l.latest_review_text) {
    const stale = (l.latest_review_months_ago ?? 99) > 12;
    const span = document.createElement('span');
    span.textContent = l.latest_review_text;
    if (stale) span.className = 'stale';
    tdReview.appendChild(span);
  }
  tr.appendChild(tdReview);

  const tdExt = document.createElement('td');
  if (l.external_website_search) {
    const a = document.createElement('a');
    a.href = l.external_website_search; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = new URL(l.external_website_search).hostname.replace(/^www\./, '');
    tdExt.appendChild(a);
  }
  tr.appendChild(tdExt);

  const tdMaps = document.createElement('td');
  if (l.maps_url) {
    const a = document.createElement('a');
    a.href = l.maps_url; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = 'open';
    tdMaps.appendChild(a);
  }
  tr.appendChild(tdMaps);

  const tdNotes = document.createElement('td');
  const ta = document.createElement('textarea');
  ta.className = 'notes';
  ta.value = l.notes || '';
  ta.placeholder = '…';
  let saveTimer;
  ta.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const { error } = await sb.from('lead_crm_leads').update({ notes: ta.value }).eq('id', l.id);
      if (error) console.error(error);
      else l.notes = ta.value;
    }, 600);
  });
  tdNotes.appendChild(ta);
  tr.appendChild(tdNotes);

  return tr;
}

function td(text) {
  const el = document.createElement('td');
  el.textContent = text || '';
  return el;
}

search.addEventListener('input', render);
statusFilter.addEventListener('change', render);
hideExternal.addEventListener('change', render);

load();
