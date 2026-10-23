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

Pass `--dry-run` to the importer, scraper, and image scripts to log intended changes (database writes, uploads, deletions, backups) without making them. `backup-images` also takes `--limit <n>` to back up a small batch first.

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

The R2 bucket holds the original of every Cloudflare image under `images/<id>` (including uploads from the Keebdex app, which exist nowhere else) and daily database dumps under `db/daily/` (the dump of the 1st is also kept under `db/monthly/`). Nothing is ever deleted from it by these scripts. Retention is set on the bucket: a lifecycle rule expiring `db/daily/` and a bucket lock on `images/`.

To restore, re-upload images to Cloudflare under their old ids (the key without `images/`) so stored URLs work again, and restore a dump into a scratch database with `pg_restore` before copying back what's needed.

## Environment variables

`SUPABASE_URL`, `SUPABASE_KEY`, `CF_IMAGES_API_KEY`, `CF_IMAGES_ACCOUNT_ID`, `CF_IMAGES_ACCOUNT_HASH`, `GOOGLE_SERVICE_ACCOUNT` (JSON key written to `keebdex.json`), and for backups `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (a token scoped to the backup bucket), `R2_BUCKET`, `CF_IMAGES_READ_TOKEN` (a user API token with Images read access; account tokens can't download originals of Keebdex app uploads), and `SUPABASE_DB_URL` (session pooler connection string, CI only).
