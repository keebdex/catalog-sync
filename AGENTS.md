# Keebdex Catalog Sync Agent Instructions

This is the canonical instruction file for every AI coding agent working in this repository (Claude Code, OpenAI Codex, Cursor, GitHub Copilot, and others). `CLAUDE.md` imports it and `.github/copilot-instructions.md` points here. Update this file instead of creating agent-specific copies; a tool-specific file only points here and holds what is specific to that tool.

## What this repo is

Node.js ETL scripts that pull artisan and keyset data from Google Docs and maker or vendor websites, normalize it, and write it into the Keebdex Supabase (Postgres) database, plus Cloudflare Images maintenance jobs. There is no web server and no build step: scripts run directly with `node` (see `package.json` scripts) or on a schedule from `.github/workflows/*.yml`.

The Keebdex app lives in the sibling repository `../keebdex`. Its `AGENTS.md` describes the schema, the review (submission) workflow, and the server contract these scripts must stay compatible with.

## Layout

- `artisans/gdocs-importer.js`: Google Docs import job. Downloads each maker's docs, tags parsed rows with their source doc, merges the docs, then calls `updateMakerDatabase`.
- `artisans/maker-scraper.js` + `artisans/makers/*.js`: per-maker website scrapers (one file per maker, file name = `maker_id`) feeding the same `updateMakerDatabase` sync with `source: 'scraper'`.
- `artisans/utils/database.js`: all Supabase reads and writes for artisan sculpts and colorways. Touch this file for sync-logic changes.
- `artisans/utils/docs.js`: Google Drive/Docs helpers (`downloadDoc`, `getFile`, `getRevisions`). `downloadDoc` returns a native Promise and rejects with `code: 404` when a doc was deleted.
- `artisans/utils/parser.js`: turns the raw Google Docs API response into sculpt/colorway objects.
- `keysets/vendor-scraper.js` + `keysets/adapters/*.js`: vendor keyset scraper. Each adapter exports `{ name, fetchKeysets }` returning `{ keyset, kits }[]`; adapters earlier in `priorityMap` win when two return the same `profile_keyset_id`.
- `keysets/utils/index.js`: `getProfileInfo` (vendor title → Keebdex `keyset_profiles.profile_id` and cleaned keyset name) and `removeHtmlTags`.
- `jobs/`: maintenance scripts. `sync-images.js` / `prune-images.js` / `restore-images.js` (scheduled, all support `--dry-run`; see "Cloudflare Images"), `backup-images.js` (scheduled, `--dry-run`; see "Backups"), and `sync-catalogue-metadata.js`, which has no `--dry-run` and writes to production when run.
- `utils/index.js`: `createSupabase(source)` (see "Revision sources"), shared table names (`ARTISAN_MAKERS_TABLE`, …), `urlSlugify`, `DELIVERY_BASE_URL`, `PARTIAL_MAKERS`. Import table names from here instead of hardcoding strings.
- `utils/image.js`: Cloudflare Images helpers.
- `utils/r2.js`: R2 backup bucket helpers (S3 API).
- `types/database.types.ts`: Supabase types copied from the Keebdex app. Generated; never edit by hand.
- Local only (untracked): `db/` (per-maker JSON dumps written in development), `keebdex.json` (Google service account key), `.env`, and `supabase/` (Supabase CLI scratch; migrations don't live here).

## Commands

- `npm run gdocs-importer`, `npm run maker-scraper`, `npm run vendor-scraper`: append `-- --dry-run` to log intended writes instead of making them.
- `npm run sync-images`, `npm run prune-images`, `npm run backup-images`: also take `-- --dry-run`. `backup-images` also takes `-- --limit <n>` and `-- --force-trash`.
- `npm run lint` / `npx eslint <files>`, `npm run format`.
- There is no test suite. `.vscode/launch.json` has dry-run launch configs for the three sync scripts.

Environment: `SUPABASE_URL`, `SUPABASE_KEY` (service role; RLS does not apply, so the scripts must set moderation fields itself), `CF_IMAGES_API_KEY`, `CF_IMAGES_ACCOUNT_ID`, `CF_IMAGES_ACCOUNT_HASH`, `GOOGLE_SERVICE_ACCOUNT` (written to `keebdex.json` in CI), `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (`backup-images`), `CF_IMAGES_READ_TOKEN` (optional user token for `backup-images`; account tokens get a 403 downloading originals of Cloudflare-named images, i.e. Keebdex app uploads), `SUPABASE_DB_URL` (CI only, for `pg_dump`), `R2_API_TOKEN` (optional, read-only; lets `backup-images` read the bucket lock rules, see "Backups"). `NODE_ENV=production` in CI; other values enable development-only output such as the `db/` dumps.

CI (`.github/workflows/`, all against production): `artisan-sync` runs the gdocs importer then the maker scraper daily at 23:00 UTC and on pushes to `main` that touch `artisans/`, `utils/`, the package files, or the workflow itself; `image-sync` runs daily at 01:00 UTC; `image-prune` on the 1st and 15th; `backup` daily at 02:00 UTC. Each can be started by hand (always a real run), has a concurrency group so runs never overlap, and a timeout (except `backup`, whose first runs copy tens of thousands of images and resume where they stopped). Scripts must exit non-zero on failure (`process.exitCode = 1` in the final catch), or a crashed run shows as a success. The vendor scraper has no workflow and is run manually.

## Working agreements

- **Verify before finishing.** Run `npx eslint <changed files>`. For sync-logic changes, run the job with `--dry-run` and read the `[DRY RUN]` output, or reproduce the scenario in a throwaway script.
- **Never test against the real database.** Don't run an import, scraper, or image job without `--dry-run`, or any other `jobs/` script, just to check a change. Read-only queries are fine.
- **Schema changes ship with a migration** in the Keebdex Supabase repository (`../keebdex/supabase/migrations/`, its own Git repo with its own `AGENTS.md`), not here. If code writes a new column, draft the migration in the same change and call it out in your summary. Insert and update errors are only logged, so a missing column drops data silently.
- **Stay inside the allow-lists.** Don't widen `GDOC_SYNCABLE_FIELDS`, `GDOC_SCULPT_SYNCABLE_FIELDS`, or the `*_ALWAYS_SYNCED_FIELDS` lists without saying why.
- **Commits** follow Conventional Commits (`type(scope): summary`, enforced by commitlint) with a body explaining why. Husky runs Prettier and `eslint --fix` on staged files. Don't commit unless asked.

## Review status (Keebdex submission workflow)

Keebdex tables that accept community submissions carry `review_status` (`Pending` / `Approved` / `Rejected`), `submitted_by`, `verified_at`, `verified_by`, and `review_note`. A `null` status means "added by staff": implicitly approved, public, and never shown in a review queue. Anything these scripts insert must fit that model, or reviewers can't see or act on it.

- **Artisans** (gdoc and scraper rows) are trusted maker data: sculpts and colorways are inserted with `review_status` null and published directly. Sync updates only patch allow-listed fields and never touch moderation columns.
- **Keysets** from vendor sites need review: `vendor-scraper.js` inserts the keyset and every kit as `Pending` (`PENDING_REVIEW`: no submitter, no verifier). Kits must carry their own status, because the Keebdex keyset queue lists kits grouped by keyset; a Pending keyset with status-less kits never appears there. Approving a kit approves its keyset. Keysets without kits are skipped, and a keyset whose kit insert fails is deleted again, so no orphan Pending keyset is left.
- Adapters send no `status`: the column defaults to _Confirmed_ (the other values are _Interest Check_ and _Cancelled_, set by staff), and Keebdex tells a live group buy from `start_date` and `end_date`, which adapters send when the vendor page has them.
- Existing keysets (any status, including Rejected) are skipped, so a rejected keyset is not re-added. Only keysets whose `profile_id` is a published profile (`review_status` null or `Approved`) in `keyset_profiles` are inserted.
- `getProfileInfo` matches vendor prefixes as whole words, longest first (`GMK MTNU` → `mtnu` before `GMK` → `gmk`), and strips the prefix from the name. Map prefixes to real `keyset_profiles.profile_id` values.
- `submitted_by` stays null for synced rows, so Keebdex sends no notifications about them (`push_notification` skips a null recipient).

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

Image columns: `artisan_colorways.img`, `keysets.img` / `order_graph` / `order_history`, `keyset_kits.img`, `keyboard_variants.img_front` / `img_back`. A synced image is stored as `${DELIVERY_BASE_URL}/<id>/public` (ids may contain slashes); anything else is an external URL. The Keebdex app shows external URLs as they are, and its upload endpoint stores community and staff uploads on Cloudflare with random UUID ids.

- `sync-images.js` uploads external keyset, kit, and keyboard variant images under readable ids ending in a CRC32 of the source URL (`keyset/<profile_keyset_id>/kit/<id>/<kit>/<hash>`, …) and rewrites the row. The hash gives a replaced image (a new external URL on a synced row) a new id: Cloudflare rejects an existing id with a 409, and an id must never change content or the R2 backup keeps the old file. The previous upload is left for `prune-images.js`. Keyboard variants sync each side (`img_front`, `img_back`) on its own, and keysets each of `KEYSET_IMAGE_COLUMNS`: the cover (`img`, `keyset/<profile_keyset_id>/<hash>`) and the order graph and history shown on the keyset page (`keyset/<profile_keyset_id>/order-graph/<hash>`, `…/order-history/<hash>`), which are mostly external postimg and imgur links. It only syncs published rows: the row's own `review_status` is null or `Approved`, and so is its keyset or keyboard. Rows in review keep their original URL so reviewers see the source image and rejected rows leave no upload behind; they sync on the first run after approval. It also uploads external `artisan_colorways.img` URLs (colorways added in the Keebdex app) under the importer's id scheme plus the URL hash (`artisan/<maker_id>/<sculpt_id>/<colorway_id>/<hash>`), requiring the colorway and its sculpt to be published. A 404 from the source clears the row's image. `uploadImage` downloads and sends as a file what Cloudflare cannot fetch: other accounts' Cloudflare Images URLs (`imagedelivery.net`, `/cdn-cgi/imagedelivery/`, always refused with error 5454) up front, and any other URL after a 5454 fetch error. Gdoc and scraper colorway images are uploaded by the importer and scraper themselves, which store the Cloudflare URL directly.
- `prune-images.js` deletes Cloudflare images no row references, counting rows of every review status and image URLs in the `changes` of Pending `edit_suggestions` (an Add Photo upload lives only there until approved), and skips images uploaded in the last 7 days (an app upload isn't referenced until its form is saved). Every read must succeed and at least one image must be referenced, or it deletes nothing. The referenced set comes from `utils/referenced-images.js` (`IMAGE_COLUMNS`, `toImageId`, `getReferencedImages`), shared with `restore-images.js`; add a column to `IMAGE_COLUMNS` whenever a new table stores Cloudflare images, or its images get pruned.
- `restore-images.js` (daily, in the image-sync workflow after `sync-images`) re-uploads, from their R2 backup (`images/<id>`, `getObject`) and under the same id (`uploadImage`, which takes a URL or a file), the images the database references that Cloudflare no longer has. That happens when a record points at an older image again after `prune-images.js` deleted it: an Undo or Restore in Keebdex's revision history, or an approved edit suggestion. An image with no backup is logged and left alone. It refuses to run when Cloudflare lists no images, or when more than `MAX_RESTORE_RATIO` (10%) of the referenced images are missing, since a bad listing would make it re-upload everything; `--force` lifts the ratio. Keebdex's revision history relies on this instead of keeping pruned images: it only works while R2 keeps `images/` (locked indefinitely today). If the trash is enabled with an N-day lock, images pruned and trashed more than N days earlier can no longer come back, so decide how long Keebdex keeps revisions together with N.

## Backups

Cloudflare images and the database are copied to an R2 bucket (`R2_BUCKET`). The only thing these scripts remove from it is a backup moved to the trash.

- `images/<id>`: original of every Cloudflare image, including Keebdex app uploads, which exist nowhere else. `backup-images.js` lists Cloudflare Images, fetches only ids not yet in R2 through the API (`/blob`, not a delivery URL), using `CF_IMAGES_READ_TOKEN` when set: an account-owned token such as `CF_IMAGES_API_KEY` gets a 403 on `/blob` for images whose id Cloudflare generated (the app's UUID uploads), while a user token with Images read access does not. Restoring re-uploads a file under its old id, so stored delivery URLs work again; `restore-images.js` does this for every referenced image missing from Cloudflare.
- `trash/images/<id>`: backups of images no longer on Cloudflare (pruned, or replaced in a doc), moved there by `backup-images.js` once no bucket lock rule retains them any more. The job reads the lock rules through the Cloudflare API (`getLockRules`, `R2_API_TOKEN`) and checks each backup against every enabled rule covering its key (`Age`, `Date`; `Indefinite` or an unknown condition always retains), so the bucket's infrastructure alone decides when the trash runs: while `images/` is locked indefinitely nothing moves. Rules that can't be read count as a lock on everything, and the trash is skipped with a warning. It refuses to trash more than `MAX_TRASH_RATIO` (10%) of the backups in one run, or anything when Cloudflare lists no images, since a bad listing would make every backup look orphaned; `--force-trash` lifts the ratio for a deliberate mass deletion. A move is copy then delete, so a failure leaves the backup in both places, never in neither.
- `db/daily/<date>.dump` and `db/monthly/<yyyy-mm>.dump`: `pg_dump --format=custom` of the whole database from the `backup` workflow. Restore into a scratch database with `pg_restore`, then copy back what's needed.
- Retention and protection are set on the bucket by infrastructure, not in code: a lifecycle rule expiring `db/daily/` (30 days) and an indefinite bucket lock on `images/`. A finite lock on `images/` (e.g. 30 days) enables the trash; README "Enabling the trash" is the step-by-step checklist (read token, `trash/` rules, then the `images/` lock), so keep it in sync with any change to the trash. What happens in `trash/` is up to its own rules: e.g. an indefinite lock keeps everything, and a 90-day lock plus a 90-day expiry later starts deleting. Use S3 keys scoped to this bucket only, and a read-only token for `R2_API_TOKEN`.

## Revision sources

Keebdex records every insert, update, and delete on sculpts, colorways, keysets, kits, keyboards, releases, and variants as a revision (`record_revisions`), which staff read and can revert. With the service role key it trusts two request headers to tell which job made a change: `x-keebdex-source` and `x-keebdex-run` (`GITHUB_RUN_ID` in CI, otherwise a UUID per process), so a run's changes read as one entry. Without them a sync's changes are recorded as `sql`.

- Every Supabase client goes through `createSupabase(source)` in `utils/index.js`; never call `createClient` directly.
- Sources: `gdoc` (`gdocs-importer.js`), `scraper` (`maker-scraper.js`), `vendor` (`vendor-scraper.js`), `image-sync` (`sync-images.js`), `maintenance` (`sync-catalogue-metadata.js`). `prune-images.js` writes none of these tables and sends no source. A new source must also be added to the whitelist in Keebdex's `record_revision()` trigger and the `record_revisions_source_check` constraint.
- `artisans/utils/database.js` is shared by the gdoc importer and the maker scraper, so it starts with a `gdoc` client and each entry script calls `setSource()` before any query.
- Updates that change only `order`, `source_document_id`, or `overridden_fields` write no revision, and `updateRows` already skips unchanged rows, so a no-op sync records nothing.

## Dry-run convention

Entry scripts detect `--dry-run` in `process.argv`. The artisan scripts call `setDryRun(true)`, and every write helper in `database.js` (`insertRows`, `updateRows`, `deleteRows`, `updateMetadata`) then logs `[DRY RUN] Would ...` with the payload instead of calling Supabase. Scripts also skip side effects they own directly (image uploads in `gdocs-importer.js`). `vendor-scraper.js`, `sync-images.js`, `prune-images.js`, and `restore-images.js` write inline, so they check `isDryRun` themselves and log the rows, uploads, or deletions they would make. Reads still hit the real database in a dry run.

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
