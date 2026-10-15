# Keebdex Data Pipeline Agent Instructions

This is the canonical instruction file for every AI coding agent working in this repository (Claude Code, OpenAI Codex, Cursor, GitHub Copilot, and others). `CLAUDE.md` imports it and `.github/copilot-instructions.md` points here. Update this file instead of creating agent-specific copies; a tool-specific file only points here and holds what is specific to that tool.

## What this repo is

Node.js ETL scripts that pull artisan and keyset data from Google Docs and maker or vendor websites, normalize it, and write it into the Keebdex Supabase (Postgres) database, plus Cloudflare Images maintenance jobs. There is no web server and no build step: scripts run directly with `node` (see `package.json` scripts) or on a schedule from `.github/workflows/*.yml`.

The Keebdex app lives in the sibling repository `../keebdex`. Its `AGENTS.md` describes the schema, the review (submission) workflow, and the server contract this pipeline must stay compatible with.

## Layout

- `artisans/gdocs-importer.js`: Google Docs import job. Downloads each maker's docs, tags parsed rows with their source doc, merges the docs, then calls `updateMakerDatabase`.
- `artisans/maker-scraper.js` + `artisans/makers/*.js`: per-maker website scrapers (one file per maker, file name = `maker_id`) feeding the same `updateMakerDatabase` sync with `source: 'scraper'`.
- `artisans/utils/database.js`: all Supabase reads and writes for artisan sculpts and colorways. Touch this file for sync-logic changes.
- `artisans/utils/docs.js`: Google Drive/Docs helpers (`downloadDoc`, `getFile`, `getRevisions`). `downloadDoc` returns a native Promise and rejects with `code: 404` when a doc was deleted.
- `artisans/utils/parser.js`: turns the raw Google Docs API response into sculpt/colorway objects.
- `keysets/vendor-scraper.js` + `keysets/adapters/*.js`: vendor keyset scraper. Each adapter exports `{ name, fetchKeysets }` returning `{ keyset, kits }[]`; adapters earlier in `priorityMap` win when two return the same `profile_keyset_id`.
- `keysets/utils/index.js`: `getProfileInfo` (vendor title → Keebdex `keyset_profiles.id` and cleaned keyset name) and `removeHtmlTags`.
- `jobs/`: maintenance scripts. `sync-images.js` / `prune-images.js` (scheduled, both support `--dry-run`; see "Cloudflare Images"), `sync-catalogue-metadata.js`, and the manual `change-maker-id.js <old> <new>` and `delete-maker.js <ids...>`. The last three have no `--dry-run` and write to production when run.
- `utils/index.js`: shared table names (`ARTISAN_MAKERS_TABLE`, …), `urlSlugify`, `DELIVERY_BASE_URL`, `PARTIAL_MAKERS`. Import table names from here instead of hardcoding strings.
- `utils/image.js`: Cloudflare Images helpers.
- `types/database.types.ts`: Supabase types copied from the Keebdex app. Generated; never edit by hand.
- Local only (untracked): `db/` (per-maker JSON dumps written in development), `keebdex.json` (Google service account key), `.env`, and `supabase/` (Supabase CLI scratch; migrations don't live here).

## Commands

- `npm run gdocs-importer`, `npm run maker-scraper`, `npm run vendor-scraper`: append `-- --dry-run` to log intended writes instead of making them.
- `npm run sync-images`, `npm run prune-images`: also take `-- --dry-run`.
- `npm run lint` / `npx eslint <files>`, `npm run format`.
- There is no test suite. `.vscode/launch.json` has dry-run launch configs for the three sync scripts.

Environment: `SUPABASE_URL`, `SUPABASE_KEY` (service role; RLS does not apply, so the pipeline must set moderation fields itself), `CF_IMAGES_API_KEY`, `CF_IMAGES_ACCOUNT_ID`, `CF_IMAGES_ACCOUNT_HASH`, `GOOGLE_SERVICE_ACCOUNT` (written to `keebdex.json` in CI). `NODE_ENV=production` in CI; other values enable development-only output such as the `db/` dumps.

CI (`.github/workflows/`): `artisan-sync` runs the gdocs importer then the maker scraper daily and on push to `main`; `image-sync` runs two hours later; `image-prune` twice a month. The vendor scraper is run manually.

## Working agreements

- **Verify before finishing.** Run `npx eslint <changed files>`. For sync-logic changes, run the job with `--dry-run` and read the `[DRY RUN]` output, or reproduce the scenario in a throwaway script.
- **Never test against the real database.** Don't run an import, scraper, or image job without `--dry-run`, or any other `jobs/` script, just to check a change. Read-only queries are fine.
- **Schema changes ship with a migration** in the Keebdex Supabase repository (`../keebdex/supabase/migrations/`, its own Git repo with its own `AGENTS.md`), not here. If code writes a new column, draft the migration in the same change and call it out in your summary. Insert and update errors are only logged, so a missing column drops data silently.
- **Stay inside the allow-lists.** Don't widen `GDOC_SYNCABLE_FIELDS`, `GDOC_SCULPT_SYNCABLE_FIELDS`, or the `*_ALWAYS_SYNCED_FIELDS` lists without saying why.
- **Commits** follow Conventional Commits (`type(scope): summary`, enforced by commitlint) with a body explaining why. Husky runs Prettier and `eslint --fix` on staged files. Don't commit unless asked.

## Review status (Keebdex submission workflow)

Keebdex tables that accept community submissions carry `review_status` (`Pending` / `Approved` / `Rejected`), `submitted_by`, `verified_at`, `verified_by`, and `review_note`. A `null` status means "added by staff": implicitly approved, public, and never shown in a review queue. Anything the pipeline inserts must fit that model, or reviewers can't see or act on it.

- **Artisans** (gdoc and scraper rows) are trusted maker data: sculpts and colorways are inserted with `review_status` null and published directly. Sync updates only patch allow-listed fields and never touch moderation columns.
- **Keysets** from vendor sites need review: `vendor-scraper.js` inserts the keyset and every kit as `Pending` (`PENDING_REVIEW`: no submitter, no verifier). Kits must carry their own status, because the Keebdex keyset queue lists kits grouped by keyset; a Pending keyset with status-less kits never appears there. Approving a kit approves its keyset. Keysets without kits are skipped, and a keyset whose kit insert fails is deleted again, so no orphan Pending keyset is left.
- Existing keysets (any status, including Rejected) are skipped, so a rejected keyset is not re-added. Only keysets whose `profile_id` exists in `keyset_profiles` are inserted.
- `getProfileInfo` matches vendor prefixes as whole words, longest first (`GMK MTNU` → `mtnu` before `GMK` → `gmk`), and strips the prefix from the name. Map prefixes to real `keyset_profiles.id` values.
- `submitted_by` stays null for pipeline rows, so Keebdex sends no notifications about them (`push_notification` skips a null recipient).

## Artisan data ownership (don't break this)

Sculpts and colorways have a `source` column (`'gdoc'` for the Google Docs importer, `'scraper'` for `maker-scraper.js`, `'keebdex'` for rows added in the Keebdex app) and an `overridden_fields` string array.

- `updateMakerDatabase(tables, { source })` (default `'gdoc'`) scopes every read and write to that source: it only sees, matches, updates, or deletes rows with that exact `source`. That lets a gdoc sync and a scraper sync for the same maker coexist without deleting each other's rows. `maker-scraper.js` passes `source: 'scraper'`; don't let it default to `'gdoc'`.
- Updates only patch fields in `GDOC_SYNCABLE_FIELDS` (colorways) / `GDOC_SCULPT_SYNCABLE_FIELDS` (sculpts), whatever the source. A field listed in the row's `overridden_fields` (locked in the app) is skipped.
- `GDOC_ALWAYS_SYNCED_FIELDS` (colorways: `order`, `source_document_id`) and `GDOC_SCULPT_ALWAYS_SYNCED_FIELDS` (sculpts: `source_document_id`) are metadata derived from the doc structure, never editable in the app, so they sync regardless of `overridden_fields`. Only add a field there if the app can't edit it.
- Compare array fields (e.g. `stem`) by sorted content with `isFieldChanged`, not `!==`.

## Colorway matching rules

1. Match an incoming colorway to a stored row by `colorway_id` first.
2. Otherwise fall back to `name` (rename detection), but only against _orphaned_ stored rows, those whose `colorway_id` matches no incoming row. Otherwise a brand-new colorway can steal an unrelated row that merely shares its name.
3. Name candidates are per-name queues (`groupBy`), and each stored row can be claimed once. Don't `keyBy` on name: duplicate or empty names collapse into one row and the others get deleted.
4. Stored rows nothing claimed are deleted (or soft-deleted with `deleted` when a user collection references them).

## Partial syncs (a maker's doc is missing)

A maker can have several docs (`document_ids`), and one sculpt's colorways can span docs (`customMerge` in `gdocs-importer.js` offsets `order` when merging).

- Download docs independently. `Promise` in `gdocs-importer.js` is bluebird, so use `Promise.resolve(downloadDoc(id)).reflect()`, not `Promise.allSettled` (unreliable on bluebird) or a bare `.reflect()` (`downloadDoc` returns a native Promise).
- A 404 on one doc: warn, skip it, sync the rest with `preserve_missing: true`. All docs 404: disable sync and mark the maker deleted. Any other error: throw, so the outer catch logs it and nothing is updated.
- Every parsed sculpt/colorway is tagged with `source_document_id`, and `updateMakerDatabase(tables, { preserve_missing, available_document_ids })` receives the docs that loaded. With `preserve_missing`, a stored row absent from `tables` is kept only if its `source_document_id` isn't in `available_document_ids` (its doc wasn't synced) or is null (can't tell, so keep it). A row absent from a doc that _was_ synced is a real deletion.
- `order` is only trustworthy for new colorways in a partial sync. Existing colorways keep their stored `order`; new ones get the sculpt's stored count plus their index. In a full sync the doc's `order` syncs normally.
- Use `availableDocumentIds`, not `document_ids`, for anything that touches Drive afterwards (e.g. `getFile`), since `document_ids` still contains the deleted docs.
- `maker-scraper.js` sets `preserve_missing` for makers in `PARTIAL_MAKERS` (source data is incomplete) but passes no `available_document_ids`, so every missing row is preserved. Scrapers may tag rows with `source_document_id` = the page/endpoint URL they came from. Don't pass `available_document_ids` from the scraper flow unless that scraper tolerates a single page failing.

## Writes are batched, not per-row

`insertRows` chunks at `INSERT_CHUNK_SIZE` and `deleteRows` chunks `.in()` at `IN_CHUNK_SIZE`, both needed once a maker has more rows than fit in one PostgREST request. `updateRows` groups `[id, values]` pairs by identical payload (`payloadKey`) and issues one `.update(values).in('id', ids)` per distinct payload; rows with no real change are dropped first, so a no-op sync costs zero requests. Rows that changed differently still cost one request each, since there is no bulk partial-column upsert that respects `overridden_fields`. Always build the `[id, values]` list and call `updateRows` once; don't `Promise.map` over single-row updates.

## Cloudflare Images

Image columns: `artisan_colorways.img`, `keysets.img`, `keyset_kits.img`, `keyboard_variants.img_front` / `img_back`. A synced image is stored as `${DELIVERY_BASE_URL}/<id>/public` (ids may contain slashes); anything else is an external URL. The Keebdex app shows external URLs as they are, and its upload endpoint stores community and staff uploads on Cloudflare with random UUID ids.

- `sync-images.js` uploads external keyset, kit, and keyboard variant images under readable ids (`keyset/<profile_keyset_id>/kit/<id>/<kit>`, …) and rewrites the row. It only syncs published rows: the row's own `review_status` is null or `Approved`, and so is its keyset or keyboard. Rows in review keep their original URL so reviewers see the source image and rejected rows leave no upload behind; they sync on the first run after approval. A 404 from the source clears the row's image. Artisan images are uploaded by the importer and scraper themselves.
- `prune-images.js` deletes Cloudflare images no row references, counting rows of every review status, and skips images uploaded in the last 7 days (an app upload isn't referenced until its form is saved). Every read must succeed and at least one image must be referenced, or it deletes nothing. Add a column to `IMAGE_COLUMNS` whenever a new table stores Cloudflare images, or its images get pruned.

## Dry-run convention

Entry scripts detect `--dry-run` in `process.argv`. The artisan scripts call `setDryRun(true)`, and every write helper in `database.js` (`insertRows`, `updateRows`, `deleteRows`, `updateMetadata`) then logs `[DRY RUN] Would ...` with the payload instead of calling Supabase. Scripts also skip side effects they own directly (image uploads in `gdocs-importer.js`). `vendor-scraper.js`, `sync-images.js`, and `prune-images.js` write inline, so they check `isDryRun` themselves and log the rows, uploads, or deletions they would make. Reads still hit the real database in a dry run.

## Code conventions

- CommonJS (`require` / `module.exports`), not ESM. Prettier: 4-space indent, single quotes, no semicolons, trailing commas.
- ESLint requires a blank line before `return`; prefix unused variables with `_`.
- Prefer `lodash` helpers already used in a file (`keyBy`, `isEmpty`, `groupBy`, …) over hand-rolled loops when they read cleaner. Prefer one `Set`/`Map` lookup over `Array.prototype.includes` inside loops (older code, including the `preserve_missing` filters, still does this; convert it when touching it).
- Comments explain _why_, stay short, and describe the general logic, not the history of a fix.

## Known caveats

- Sync reads are scoped by `source`, so a colorway added in the app and the same colorway later appearing in a doc are never reconciled; the doc copy is inserted as a new row (rare duplicates).
- Deleting a gdoc sculpt deletes colorways by `maker_sculpt_id` with no `source` filter, so app-added colorways under it go too, including Pending community submissions (their submitters are notified of the deletion).
- In the `preserve_missing` block, the index used for a new colorway's `order` is global across the flattened sculpts, not per sculpt. Gaps are harmless because only relative order matters.
- Deleting every kit of a Rejected keyset in Keebdex also deletes the keyset, so the vendor scraper will add it again as Pending on its next run.
