-- db/schema.sql - PostgreSQL 14+ schema for the bookkeep server.
--
-- Run it once on an empty database: Supabase SQL editor, or
--   psql "$DATABASE_URL" -f db/schema.sql
--
-- Design rules, in the order they matter:
--   1. Money is stored in whole minor units (paisa/cents) as BIGINT. Never a float.
--   2. `ledger_entries` + `ledger_lines` are the book. The database itself refuses an unbalanced entry,
--      and refuses to edit or delete one (a correction is a new entry that points at the old one).
--   3. Every row that can sync carries created_at/updated_at/device_id/deleted_at, and a client-supplied
--      `client_uuid` that the server uses to make retries harmless (a retried payment cannot post twice).
--   4. A "book" is one business. Every table that holds business data carries book_id, so one server can
--      host many businesses without them ever seeing each other.

-- gen_random_uuid() is built into PostgreSQL 13 and later; no extension is required. (On PostgreSQL 12 or
-- older, `create extension pgcrypto;` first.)

-- =====================================================================================================
-- 1. Businesses, people, roles
-- =====================================================================================================
create table books (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  currency    char(3) not null default 'PKR',
  country     text,
  settings    jsonb not null default '{}'::jsonb,  -- company profile, templates, preferences
  created_at  timestamptz not null default now()
);

create table users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text unique,
  phone         text,
  pin_hash      text not null,              -- argon2/bcrypt, never the PIN itself
  created_at    timestamptz not null default now(),
  disabled_at   timestamptz
);

create table book_users (
  book_id  uuid not null references books(id) on delete cascade,
  user_id  uuid not null references users(id) on delete cascade,
  role     text not null check (role in ('admin','manager','cashier','viewer')),
  primary key (book_id, user_id)
);

create table parties (
  id                uuid primary key default gen_random_uuid(),
  book_id           uuid not null references books(id) on delete cascade,
  name              text not null,
  business_name     text,
  phone             text,
  whatsapp          text,
  email             text,
  address           text,
  city              text,
  country           text,
  tax_id_type       text,
  tax_id            text,
  credit_limit      bigint not null default 0,   -- minor units
  payment_terms     int not null default 0,      -- days
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  device_id         text,
  deleted_at        timestamptz,
  client_uuid       uuid not null default gen_random_uuid(),
  unique (book_id, client_uuid)
);

create table party_roles (
  party_id  uuid not null references parties(id) on delete cascade,
  role      text not null check (role in ('customer','supplier','distributor','agent')),
  primary key (party_id, role)
);

-- =====================================================================================================
-- 2. Catalogue and stock
-- =====================================================================================================
create table products (
  id             uuid primary key default gen_random_uuid(),
  book_id        uuid not null references books(id) on delete cascade,
  name           text not null,
  brand          text,
  code           text,
  unit           text not null default 'pcs',
  sale_price     bigint not null default 0,
  expected_cost  bigint not null default 0,   -- what the product form types (BUY in the prototype)
  distributor_price bigint,
  low_stock      numeric(14,3) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  device_id      text,
  deleted_at     timestamptz,
  client_uuid    uuid not null default gen_random_uuid(),
  unique (book_id, client_uuid)
);
create unique index products_code_uq on products (book_id, code) where code is not null and deleted_at is null;

-- The cost pool: total quantity bought and total amount paid. The average cost is a query, never a number
-- somebody edits, which is what makes a corrected purchase exact (see HANDOFF.md, "Priority 2").
create table product_costs (
  product_id  uuid primary key references products(id) on delete cascade,
  qty_in      numeric(14,3) not null default 0,
  value_in    bigint not null default 0,       -- minor units
  updated_at  timestamptz not null default now()
);

create table stock_movements (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid not null references books(id) on delete cascade,
  product_id   uuid not null references products(id),
  document_id  uuid,                           -- invoice/purchase/return that caused it, when there is one
  kind         text not null check (kind in ('opening','purchase','sale','sale_return','purchase_return',
                                             'adjustment','correction')),
  qty          numeric(14,3) not null check (qty <> 0),   -- signed: in +, out -
  unit_cost    bigint not null default 0,      -- minor units per unit at the moment it moved
  moved_on     date not null,
  lot          text,
  expiry       date,
  created_at   timestamptz not null default now(),
  device_id    text,
  client_uuid  uuid not null default gen_random_uuid(),
  unique (book_id, client_uuid)
);
create index stock_movements_product_idx on stock_movements (product_id, moved_on);

-- =====================================================================================================
-- 3. The chart of accounts and the double-entry book
-- =====================================================================================================
create table accounts (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references books(id) on delete cascade,
  name        text not null,
  kind        text not null check (kind in ('asset','liability','equity','revenue','expense')),
  cash_kind   text check (cash_kind in ('cash','bank')),   -- the real cash accounts behind 'Cash and bank'
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (book_id, name)
);

create table ledger_entries (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid not null references books(id) on delete cascade,
  entry_date   date not null,
  narration    text,
  source       text not null,     -- sale, purchase, payment, expense, stock_adjustment, opening, manual...
  ref          text,              -- document number/id this entry belongs to
  cost         jsonb,             -- anything the posting rules carried (e.g. FIFO layers consumed)
  is_void      boolean not null default false,
  void_by      uuid references users(id),
  void_at      timestamptz,
  reverses_id  uuid references ledger_entries(id),   -- set on the entry that corrects another
  created_by   uuid references users(id),
  created_at   timestamptz not null default now(),
  device_id    text,
  client_uuid  uuid not null default gen_random_uuid(),
  unique (book_id, client_uuid)
);
create index ledger_entries_book_date_idx on ledger_entries (book_id, entry_date);
create index ledger_entries_ref_idx on ledger_entries (book_id, ref);

create table ledger_lines (
  entry_id    uuid not null references ledger_entries(id) on delete restrict,
  line_no     smallint not null,
  account_id  uuid not null references accounts(id),
  debit       bigint not null default 0 check (debit  >= 0),
  credit      bigint not null default 0 check (credit >= 0),
  primary key (entry_id, line_no),
  -- one side or the other, never both and never neither
  check ((debit > 0) <> (credit > 0))
);
create index ledger_lines_account_idx on ledger_lines (account_id);

-- An entry is only allowed to exist if its lines balance. DEFERRABLE means the lines may be inserted one at a
-- time; the check runs at COMMIT. This is the rule that makes a whole class of bugs impossible on the server.
create or replace function ledger_entry_must_balance() returns trigger
language plpgsql as $$
declare
  eid uuid := coalesce(new.entry_id, old.entry_id);
  d bigint; c bigint;
begin
  select coalesce(sum(debit),0), coalesce(sum(credit),0) into d, c
    from ledger_lines where entry_id = eid;
  if d <> c then
    raise exception 'ledger entry % is unbalanced: debit %, credit %', eid, d, c;
  end if;
  return null;
end $$;

create constraint trigger ledger_balanced
  after insert or update or delete on ledger_lines
  deferrable initially deferred
  for each row execute function ledger_entry_must_balance();

-- The book is append-only. Voiding is a flag; nothing else about a posted entry may change.
create or replace function ledger_entry_immutable() returns trigger
language plpgsql as $$
begin
  if (new.book_id, new.entry_date, new.narration, new.source, new.ref, new.cost)
     is distinct from (old.book_id, old.entry_date, old.narration, old.source, old.ref, old.cost) then
    raise exception 'ledger entry % is posted and cannot be edited; post a reversal', old.id;
  end if;
  return new;
end $$;

create trigger ledger_entry_immutable_trg before update on ledger_entries
  for each row execute function ledger_entry_immutable();

create or replace function ledger_line_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'ledger lines cannot be changed; post a reversal';
end $$;

create trigger ledger_line_immutable_trg before update or delete on ledger_lines
  for each row execute function ledger_line_immutable();

-- An entry cannot be deleted either. The foreign key would stop it while lines exist, but this says why.
create or replace function ledger_entry_no_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'ledger entry % cannot be deleted; post a reversal', old.id;
end $$;

create trigger ledger_entry_no_delete_trg before delete on ledger_entries
  for each row execute function ledger_entry_no_delete();

-- =====================================================================================================
-- 4. Documents (invoices, purchases, distributor invoices, quotations, credit/debit notes)
-- =====================================================================================================
create table documents (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid not null references books(id) on delete cascade,
  type         text not null check (type in ('sale','purchase','distributor','quote','credit_note','debit_note')),
  -- Null until the document is actually issued: two drafts may share the preview number, and a discarded draft
  -- must not burn a number out of the series. Uniqueness applies only to issued documents (see the index below).
  number       text,
  party_id     uuid references parties(id),
  doc_date     date not null,
  due_date     date,
  status       text not null default 'draft'
               check (status in ('draft','posted','paid','partial','unpaid','overdue','void',
                                 'sent','accepted','rejected','expired','converted')),
  subtotal     bigint not null default 0,
  discount     bigint not null default 0,
  tax          bigint not null default 0,
  total        bigint not null default 0,
  notes        text,
  -- what was printed: party details, branch, bank accounts, balance shown. Frozen at posting time.
  snapshot     jsonb,
  posted_at    timestamptz,
  void_at      timestamptz,
  void_by      uuid references users(id),
  created_by   uuid references users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  device_id    text,
  deleted_at   timestamptz,
  client_uuid  uuid not null default gen_random_uuid(),
  unique (book_id, client_uuid)
);
-- Two issued invoices may never share a number; drafts without a number are not constrained.
create unique index documents_number_uq on documents (book_id, type, number) where number is not null;
create index documents_book_date_idx on documents (book_id, type, doc_date);
create index documents_party_idx on documents (party_id);

create table document_lines (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references documents(id) on delete cascade,
  line_no       smallint not null,
  product_id    uuid references products(id),
  description   text,
  qty           numeric(14,3) not null check (qty > 0),
  rate          bigint not null,                       -- minor units
  discount      bigint not null default 0,
  discount_type text not null default 'amt' check (discount_type in ('amt','pct')),
  tax           bigint not null default 0,
  tax_type      text not null default 'pct' check (tax_type in ('amt','pct')),
  distributor_price bigint,
  lot           text,
  expiry        date,
  unique (document_id, line_no)
);

-- Per-type counters so two devices never issue the same number (SYNC.md, rule 6).
create table document_counters (
  book_id  uuid not null references books(id) on delete cascade,
  type     text not null,
  prefix   text not null,
  next_no  integer not null default 1,
  primary key (book_id, type)
);

-- =====================================================================================================
-- 5. Money in and out
-- =====================================================================================================
create table payments (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid not null references books(id) on delete cascade,
  direction    text not null check (direction in ('in','out')),
  party_id     uuid references parties(id),
  party_role   text check (party_role in ('customer','supplier','distributor','agent')),
  amount       bigint not null check (amount > 0),
  paid_on      date not null,
  method       text,
  account_id   uuid references accounts(id),   -- the cash/bank account money actually moved through
  reference    text,
  notes        text,
  is_void      boolean not null default false,
  void_by      uuid references users(id),
  created_by   uuid references users(id),
  created_at   timestamptz not null default now(),
  device_id    text,
  client_uuid  uuid not null default gen_random_uuid(),
  unique (book_id, client_uuid)
);
create index payments_party_idx on payments (party_id, paid_on);

create table payment_allocations (
  payment_id   uuid not null references payments(id) on delete cascade,
  document_id  uuid not null references documents(id),
  amount       bigint not null check (amount > 0),
  primary key (payment_id, document_id)
);

create table expenses (
  id               uuid primary key default gen_random_uuid(),
  book_id          uuid not null references books(id) on delete cascade,
  category         text not null,
  amount           bigint not null check (amount > 0),
  spent_on         date not null,
  payee            text,
  account_id       uuid references accounts(id),   -- null = "Pay later", which becomes a payable
  paid_by_employee uuid,                            -- set when a member of staff paid out of their pocket
  document_id      uuid references documents(id),
  receipt_url      text,
  notes            text,
  is_void          boolean not null default false,
  void_by          uuid references users(id),
  created_by       uuid references users(id),
  created_at       timestamptz not null default now(),
  device_id        text,
  client_uuid      uuid not null default gen_random_uuid(),
  unique (book_id, client_uuid)
);

create table transfers (
  id             uuid primary key default gen_random_uuid(),
  book_id        uuid not null references books(id) on delete cascade,
  from_account   uuid not null references accounts(id),
  to_account     uuid not null references accounts(id),
  amount         bigint not null check (amount > 0),
  transferred_on date not null,
  notes          text,
  created_by     uuid references users(id),
  created_at     timestamptz not null default now(),
  device_id      text,
  client_uuid    uuid not null default gen_random_uuid(),
  unique (book_id, client_uuid)
);

-- =====================================================================================================
-- 6. Staff
-- =====================================================================================================
create table employees (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid not null references books(id) on delete cascade,
  name         text not null,
  code         text,
  designation  text,
  phone        text,
  joined_on    date,
  basic_salary bigint not null default 0,
  recurring    boolean not null default true,
  pay_day      int check (pay_day between 1 and 31),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  client_uuid  uuid not null default gen_random_uuid(),
  unique (book_id, client_uuid)
);

create table salary_runs (
  id             uuid primary key default gen_random_uuid(),
  book_id        uuid not null references books(id) on delete cascade,
  employee_id    uuid not null references employees(id),
  run_on         date not null,
  basic          bigint not null default 0,
  bonus          bigint not null default 0,
  advance_recovered bigint not null default 0,
  net            bigint not null,
  ledger_entry_id uuid references ledger_entries(id),
  created_by     uuid references users(id),
  created_at     timestamptz not null default now(),
  client_uuid    uuid not null default gen_random_uuid(),
  unique (book_id, client_uuid)
);

create table staff_advances (
  id             uuid primary key default gen_random_uuid(),
  book_id        uuid not null references books(id) on delete cascade,
  employee_id    uuid not null references employees(id),
  amount         bigint not null check (amount > 0),
  given_on       date not null,
  account_id     uuid references accounts(id),
  ledger_entry_id uuid references ledger_entries(id),
  created_by     uuid references users(id),
  created_at     timestamptz not null default now(),
  client_uuid    uuid not null default gen_random_uuid(),
  unique (book_id, client_uuid)
);

-- =====================================================================================================
-- 7. Small reference lists, files, audit and sync
-- =====================================================================================================
create table lookup_values (
  book_id uuid not null references books(id) on delete cascade,
  kind    text not null,   -- 'expense_category', 'payment_method', 'unit', 'tax_rate'
  value   text not null,
  data    jsonb not null default '{}'::jsonb,
  sort    int not null default 0,
  primary key (book_id, kind, value)
);

create table attachments (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid not null references books(id) on delete cascade,
  owner_table  text not null,
  owner_id     uuid not null,
  url          text not null,          -- object storage key, not bytes in the database
  mime         text,
  bytes        bigint,
  created_at   timestamptz not null default now()
);

create table audit_log (
  id         bigserial primary key,
  book_id    uuid not null references books(id) on delete cascade,
  user_id    uuid references users(id),
  device_id  text,
  at         timestamptz not null default now(),
  action     text not null,            -- insert / update / void / login / restore
  table_name text,
  row_id     uuid,
  detail     jsonb
);

-- One row per change, for devices pulling "what changed since sequence N". Bigserial is the sync cursor.
create table sync_changes (
  seq        bigserial primary key,
  book_id    uuid not null references books(id) on delete cascade,
  table_name text not null,
  row_id     uuid not null,
  op         text not null check (op in ('insert','update','delete')),
  payload    jsonb,
  at         timestamptz not null default now()
);
create index sync_changes_book_seq_idx on sync_changes (book_id, seq);

-- Keep updated_at honest even when a write forgets it.
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger parties_touch   before update on parties   for each row execute function touch_updated_at();
create trigger products_touch  before update on products  for each row execute function touch_updated_at();
create trigger documents_touch before update on documents for each row execute function touch_updated_at();
create trigger employees_touch before update on employees for each row execute function touch_updated_at();

-- Cross references that had to wait for both tables to exist.
alter table stock_movements add constraint stock_movements_document_fk
  foreign key (document_id) references documents(id);
alter table expenses add constraint expenses_paid_by_fk
  foreign key (paid_by_employee) references employees(id);

-- =====================================================================================================
-- 8. Decisions left to you (deliberately not enforced above)
-- =====================================================================================================
-- * Row-level security (Supabase): enable on every table and add a policy comparing book_id against the
--   signed-in user's memberships in book_users. The API should never trust a book_id sent by a client.
-- * Encryption at rest for scanned receipts: object storage, not the database.
-- * Period locking / year-end close: a `closed_through date` on books, checked by the posting function.
