# Lead CRM

Public, static lead-tracker for businesses scraped from Google Maps.
Shared Jarvis Supabase project, table prefix `lead_crm_`.

## Setup (one time)

1. Open the SQL editor on the shared Supabase project and run `setup.sql`:
   https://supabase.com/dashboard/project/afdyosgcumozhkbmhrne/sql/new
2. `npm install`
3. Verify `.env` has `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

## Push leads from the Maps scraper

```bash
node push.js "../maps-leads/out/2026-05-21_stavebn-firma-praha-9.json"
```

Re-running keeps existing `status` and `notes` intact — only refreshes facts.

## Local preview of the UI

```bash
cd web && python3 -m http.server 5173
```

Then open http://localhost:5173

## Public site

Repo: `off-plate/lead-crm` → GitHub Pages from `/web`.
URL: https://off-plate.github.io/lead-crm/

> The site is **publicly writable** (anon-key + open RLS). Statuses & notes are
> visible to anyone with the URL. Don't put sensitive info in notes.
