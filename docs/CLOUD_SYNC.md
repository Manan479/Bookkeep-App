# Cloud sync (Supabase free tier)

Status: **built, not yet connected to a real project.** The client and the SQL are in place; creating the project
is a five-minute job only the account owner can do.

## One-time setup

1. Create a free project at [supabase.com](https://supabase.com). Remember the database password it asks for.
2. Open **SQL Editor**, paste the whole of `db/supabase.sql`, run it.
3. **Authentication → Providers → Email**: for the simplest start, switch **Confirm email** off. Otherwise every
   new account has to confirm by email before it can sign in.
4. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
5. In the app: Settings → Cloud sync, paste both, save, then **Create account** or **Sign in**.
6. On the second device, sign in with the *same* email. It adopts the existing book; it does not create another.

The anon key is public by design. It grants nothing without a signed-in user because every row is protected by
row-level security in `db/supabase.sql`.

## What syncs

One row per book in `sync_state`, holding **exactly the JSON the app saves locally**, plus a `version` number.
That is deliberate for this phase: it makes phone and desktop share one book with almost no new code, while the
normalized PostgreSQL design in `docs/DATABASE_PLAN.md` waits until posting moves to the server.

## How a conflict is prevented

Every push says "I am updating version N". The database only applies it if the row is still at version N; the
number goes up by one. If another device got there first the update matches no row, the push is refused, and the
app shows a conflict instead of overwriting.

| This device | Server | Result |
|---|---|---|
| version N, no local changes | version N | nothing to do |
| version N, no local changes | version N+1 | download the server copy and apply it |
| version N, local changes | version N+1 | **conflict** — the user chooses |
| version N, local changes | version N | upload; version becomes N+1 |

The three choices on the Cloud sync screen:

- **Sync now** — the safe default; never overwrites.
- **Use cloud copy** — a local snapshot is taken first, then the server copy replaces the book.
- **Upload this device's copy** — forces this device's book over the server copy (the server copy is not kept by
  the server; take a backup first if it matters).

## What it deliberately does not do

- **No real-time collaboration.** Sync happens on save (debounced), at startup, and when you press Sync now.
- **Not encrypted end to end.** The project owner and Supabase can read the JSON. Row-level security stops other
  users; it does not stop the provider. Client-side encryption is a later decision (and needs a recovery code).
- **No per-document merge yet.** Two people editing *different* invoices on two devices is fine (last writer's
  whole book wins), but the device that syncs second will overwrite the other's unsynced work — which is why the
  version check refuses instead of guessing. Per-document sync is phase 3 in `docs/DATABASE_PLAN.md`.
- **The PIN is local.** Signing in to sync is separate from unlocking the book on the device.

## Testing without a project

`cloudVersionState` and the hash are covered by `tests/cloud.test.js`. The HTTP flow was exercised against a
local stand-in server that follows the same PostgREST rules (version-filtered PATCH): create book, push v1, pull,
detect a conflict at v2, force-upload, and confirm a clean pull. That is not a substitute for one real run
against the project, which needs your credentials.
