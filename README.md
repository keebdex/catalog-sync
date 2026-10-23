# Keebdex Catalog Sync

Collects, normalizes, and syncs artisan, keyset, keyboard, and image data from Google Docs plus maker and vendor websites into the Keebdex Supabase database, and backs up images and the database to Cloudflare R2.

## Structure

- `artisans/` — Google Docs importer (`gdocs-importer.js`) and per-maker website scrapers (`maker-scraper.js`, `makers/`). Shared sync logic lives in `artisans/utils/database.js`.
- `keysets/` — vendor keyset scraper (`vendor-scraper.js`) with per-vendor adapters in `adapters/`.
- `jobs/` — maintenance scripts (image syncing, pruning and R2 backup, catalogue metadata sync).
- `utils/` — shared constants (table names, Cloudflare image delivery URL), Cloudflare Images helpers, and R2 helpers.
- `db/` — local JSON dumps written per maker in development for debugging parsed data.
- `.github/workflows/` — scheduled CI jobs that run the sync, image, and backup jobs against production.

## Data ownership model

Artisan colorway rows are either `source: 'gdoc'` (owned by the Google Docs importer), `source: 'scraper'` (owned by the maker scrapers), or `source: 'keebdex'` (added in the Keebdex app). Each sync only reads and writes rows of its own source. Pipeline-owned rows are only ever patched on a small allow-list of fields (see `GDOC_SYNCABLE_FIELDS` / `GDOC_SCULPT_SYNCABLE_FIELDS` in `artisans/utils/database.js`); a per-row `overridden_fields` array lets the Keebdex app lock individual fields from being overwritten by future syncs. Sculpts are matched by slug; a sculpt renamed in Keebdex keeps its doc or website slug in `source_slug`, and the sync points incoming sculpts and colorways at the renamed slug (images keep their old path).

Schema migrations live in the Keebdex Supabase repository (`keebdex/supabase`), not here. Agent instructions are in [AGENTS.md](AGENTS.md).

## Scripts

```bash
npm run gdocs-importer   # import artisan catalogues from Google Docs
npm run maker-scraper    # scrape artisan maker websites
npm run vendor-scraper   # scrape vendor keyset listings
npm run sync-images      # sync images to Cloudflare Images
npm run prune-images     # remove orphaned Cloudflare images
npm run backup-images    # copy new Cloudflare images to the R2 backup bucket
npm run lint / lint:fix  # eslint
npm run format           # prettier
```

Pass `--dry-run` to the importer, scraper, and image scripts to log intended changes (database writes, uploads, deletions, backups) without making them. `backup-images` also takes `--limit <n>` to back up a small batch first, and `--force-trash` to trash more than 10% of the backups in one run.

## Workflows

All run against production and can be started by hand from the Actions tab.

| Workflow             | Schedule (UTC)                                                | Runs                                             |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| Keebdex Artisan Sync | daily 23:00, and on pushes to `main` that touch the sync code | `gdocs-importer`, then `maker-scraper`           |
| Keebdex Image Sync   | daily 01:00                                                   | `sync-images`                                    |
| Keebdex R2 Backup    | daily 02:00                                                   | `backup-images`, and a `pg_dump` of the database |
| Keebdex Image Prune  | 1st and 15th, 00:00                                           | `prune-images`                                   |

The vendor scraper has no workflow and is run manually.

## Backups

The R2 bucket holds the original of every Cloudflare image under `images/<id>` (including uploads from the Keebdex app, which exist nowhere else) and daily database dumps under `db/daily/` (the dump of the 1st is also kept under `db/monthly/`). Retention is set on the bucket by infrastructure:

| Prefix      | Lock         | Lifecycle            |
| ----------- | ------------ | -------------------- |
| `images/`   | indefinitely | none                 |
| `db/daily/` | none         | expire after 30 days |

### Trash (driven by the bucket rules)

`backup-images` moves the backup of an image that is gone from Cloudflare to `trash/images/<id>`, but only once the bucket's lock rules allow it to leave `images/`. It reads those rules on every run, so the infrastructure that owns the bucket decides everything:

- `images/` locked indefinitely (today): nothing moves.
- `images/` locked for N days: unused backups older than N days move to the trash.
- `trash/` follows its own rules: an indefinite lock keeps everything; a 90-day lock plus a 90-day expiry lifecycle rule deletes after 90 days.

Reading the rules needs `R2_API_TOKEN`, a read-only Cloudflare API token. Without it, or if the rules can't be read, the trash is skipped.

### Enabling the trash

The trash is shipped but idle: `images/` is locked indefinitely and `R2_API_TOKEN` isn't set. Nothing in this repo needs to change to turn it on; follow these steps in order.

1. **Read token (infrastructure).** Create a read-only token, either an R2 token with _Admin Read only_ or an API token with _Workers R2 Storage: Read_, and store it as the `R2_API_TOKEN` repository secret. Keep it separate from the `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` token: an R2 token's S3 secret is derived from the token itself, so giving the backup token admin rights would let it remove the bucket locks.
2. **Check the token.** Run `npm run backup-images -- --dry-run` with `R2_API_TOKEN` in `.env`. The log should show `unused backups still locked` with a count and no `unable to read bucket lock rules` warning; with `images/` still locked indefinitely, `backups to trash` is 0.
3. **Rules for `trash/` (infrastructure), before unlocking `images/`.** Decide how long trashed backups live: an indefinite lock keeps everything, while a 90-day lock plus a 90-day expiry lifecycle rule deletes them after 90 days. Set this first, so the first moved backup is already protected.
4. **Finite lock on `images/` (infrastructure).** Replace the indefinite lock with an `Age` lock of N days (e.g. 30). This is the switch: from the next run, unused backups older than N days move to `trash/images/`.
5. **Dry run again.** `npm run backup-images -- --dry-run` now lists the backups it would trash. If that's more than 10% of all backups the run refuses; check that the Cloudflare listing is complete before rerunning with `--force-trash`.
6. **Watch the first runs** of the Keebdex R2 Backup workflow: `trashed N backups`, no `unable to trash backup` errors, and the object count under `trash/images/` growing in the R2 dashboard.

To stop the trash again, put the indefinite lock back on `images/`. Backups already in `trash/images/` stay under the `trash/` rules.

### Restoring

To restore, re-upload images to Cloudflare under their old ids (the key without `images/` or `trash/images/`) so stored URLs work again, and restore a dump into a scratch database with `pg_restore` before copying back what's needed.

## Environment variables

`SUPABASE_URL`, `SUPABASE_KEY`, `CF_IMAGES_API_KEY`, `CF_IMAGES_ACCOUNT_ID`, `CF_IMAGES_ACCOUNT_HASH`, `GOOGLE_SERVICE_ACCOUNT` (JSON key written to `keebdex.json`), and for backups `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (a token scoped to the backup bucket), `R2_BUCKET`, `CF_IMAGES_READ_TOKEN` (a user API token with Images read access; account tokens can't download originals of Keebdex app uploads), and `SUPABASE_DB_URL` (session pooler connection string, CI only). `R2_API_TOKEN` (optional, read-only) lets `backup-images` read the bucket lock rules for the trash.
