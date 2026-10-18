-- db/supabase.sql - the cloud-sync layer for a free-tier Supabase project.
--
-- Run AFTER db/schema.sql (or on its own on a fresh project: this file does not reference those tables).
-- This is deliberately NOT the normalized book yet. It is phase 2 of docs/DATABASE_PLAN.md: one row per book
-- holding the same JSON the app already saves, with a version number so two devices can never silently
-- overwrite each other. The normalized tables in db/schema.sql come at phase 4.
--
-- Security model: every row is reachable only through sync_members, checked against auth.uid() by row-level
-- security. The anon key in the app is public by design; it grants nothing without a signed-in user.

-- ---------------------------------------------------------------------------------------------------------
create table if not exists sync_books (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'My books',
  owner      uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists sync_members (
  book_id  uuid not null references sync_books(id) on delete cascade,
  user_id  uuid not null,
  role     text not null default 'owner' check (role in ('owner','editor','viewer')),
  primary key (book_id, user_id)
);

create table if not exists sync_state (
  book_id    uuid primary key references sync_books(id) on delete cascade,
  version    bigint not null default 0,
  payload    jsonb not null default '{}'::jsonb,   -- exactly what the app saves locally
  updated_at timestamptz not null default now(),
  updated_by uuid,
  device_id  text
);

alter table sync_books   enable row level security;
alter table sync_members enable row level security;
alter table sync_state   enable row level security;

-- SECURITY DEFINER so the membership check itself is not subject to the policy it is used inside.
create or replace function sync_is_member(b uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from sync_members m where m.book_id = b and m.user_id = auth.uid());
$$;

drop policy if exists sync_books_select on sync_books;
create policy sync_books_select on sync_books for select
  using (owner = auth.uid() or sync_is_member(id));
drop policy if exists sync_books_insert on sync_books;
create policy sync_books_insert on sync_books for insert
  with check (owner = auth.uid());
drop policy if exists sync_books_update on sync_books;
create policy sync_books_update on sync_books for update
  using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists sync_members_select on sync_members;
create policy sync_members_select on sync_members for select
  using (user_id = auth.uid() or sync_is_member(book_id));
drop policy if exists sync_members_insert on sync_members;
create policy sync_members_insert on sync_members for insert
  with check (exists(select 1 from sync_books b where b.id = book_id and b.owner = auth.uid()));
drop policy if exists sync_members_delete on sync_members;
create policy sync_members_delete on sync_members for delete
  using (exists(select 1 from sync_books b where b.id = book_id and b.owner = auth.uid()));

drop policy if exists sync_state_select on sync_state;
create policy sync_state_select on sync_state for select
  using (sync_is_member(book_id));
drop policy if exists sync_state_insert on sync_state;
create policy sync_state_insert on sync_state for insert
  with check (sync_is_member(book_id));
drop policy if exists sync_state_update on sync_state;
create policy sync_state_update on sync_state for update
  using (sync_is_member(book_id)) with check (sync_is_member(book_id));

-- Creating a book must create the owner's membership and the empty state row in one transaction, or the first
-- push would be refused by the very policy that protects it.
create or replace function create_sync_book(p_name text default 'My books')
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare b uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into sync_books(name, owner) values (coalesce(nullif(trim(p_name),''),'My books'), auth.uid())
    returning id into b;
  insert into sync_members(book_id, user_id, role) values (b, auth.uid(), 'owner');
  insert into sync_state(book_id, version, payload, updated_by) values (b, 0, '{}'::jsonb, auth.uid());
  return b;
end $$;

revoke all on function create_sync_book(text) from public;
grant execute on function create_sync_book(text) to authenticated;

-- Every device asks "what changed since version N". Keeping updated_at honest is useful for support even though
-- the version number is what decides conflicts.
create or replace function sync_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists sync_state_touch on sync_state;
create trigger sync_state_touch before update on sync_state
  for each row execute function sync_touch();
