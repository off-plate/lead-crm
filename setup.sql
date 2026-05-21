-- Run once in Supabase SQL editor:
-- https://supabase.com/dashboard/project/afdyosgcumozhkbmhrne/sql/new

create table if not exists lead_crm_leads (
  id              bigserial primary key,
  place_id        text unique not null,         -- stable dedupe key from Google Maps
  name            text not null,
  category        text,
  rating_text     text,
  address         text,
  phone           text,
  maps_url        text,
  latest_review_text     text,
  latest_review_months_ago int,
  external_website_search text,                 -- url found via web search (not on Maps profile)
  found_via_query text,
  status          text not null default 'new',  -- new | to_contact | contacted | replied | meeting | proposal | won | lost | not_interested
  notes           text default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists lead_crm_leads_status_idx on lead_crm_leads(status);

alter table lead_crm_leads enable row level security;

drop policy if exists "public read"   on lead_crm_leads;
drop policy if exists "public update" on lead_crm_leads;
drop policy if exists "public insert" on lead_crm_leads;

create policy "public read"   on lead_crm_leads for select using (true);
create policy "public update" on lead_crm_leads for update using (true) with check (true);
create policy "public insert" on lead_crm_leads for insert with check (true);

create or replace function lead_crm_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists lead_crm_leads_updated_at on lead_crm_leads;
create trigger lead_crm_leads_updated_at
  before update on lead_crm_leads
  for each row execute function lead_crm_set_updated_at();
