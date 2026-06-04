// Push scraped Maps results (JSON files from maps-leads/scrape.js) into the CRM.
// Usage:  node push.js  <path-to-scrape-output.json>  [more.json …]
//
// Preserves status & notes on existing rows. Inserts new rows with status='new'.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1); }

const files = process.argv.slice(2);
if (!files.length) { console.error('Usage: node push.js <json> [json …]'); process.exit(1); }

const sb = createClient(url, key);

function placeIdFromMapsUrl(u) {
  if (!u) return null;
  const m = u.match(/!19s([^?]+)/) || u.match(/!1s([^!]+)/);
  return m ? decodeURIComponent(m[1]) : u;
}

const incoming = [];
for (const f of files) {
  const data = JSON.parse(readFileSync(f, 'utf-8'));
  for (const r of data) {
    const place_id = placeIdFromMapsUrl(r.url || r.maps_url);
    if (!place_id) continue;
    incoming.push({
      place_id,
      name: r.name,
      category: r.category || null,
      rating_text: r.ratingText || null,
      address: r.address || null,
      phone: r.phone || null,
      maps_url: r.url || r.maps_url || null,
      website: r.website || null,
      latest_review_text: r.latest_review_text || null,
      latest_review_months_ago: r.latest_review_months_ago ?? null,
      external_website_search: r.external_website_search || null,
      found_via_query: r.found_via || null,
      what: r.what || null,
      why_fit: r.why_fit || null,
      hook: r.hook || null,
    });
  }
}

const ids = incoming.map(r => r.place_id);
const { data: existing, error: selErr } = await sb
  .from('lead_crm_leads')
  .select('place_id')
  .in('place_id', ids);
if (selErr) { console.error(selErr); process.exit(1); }
const existingSet = new Set(existing.map(r => r.place_id));

const toInsert = incoming.filter(r => !existingSet.has(r.place_id));
const toUpdate = incoming.filter(r =>  existingSet.has(r.place_id));

if (toInsert.length) {
  const { error } = await sb.from('lead_crm_leads').insert(
    toInsert.map(r => ({ ...r, status: 'new' }))
  );
  if (error) { console.error('insert failed:', error); process.exit(1); }
}
for (const r of toUpdate) {
  const { place_id, ...patch } = r;
  const { error } = await sb.from('lead_crm_leads').update(patch).eq('place_id', place_id);
  if (error) { console.error(`update ${place_id} failed:`, error); }
}

console.log(`✓ +${toInsert.length} new, ~${toUpdate.length} updated.`);
