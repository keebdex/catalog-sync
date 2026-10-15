# Keebdex Catalog Sync

Collects, normalizes, and syncs artisan, keyset, and image data from Google Docs plus maker and vendor websites into the Keebdex Supabase database.

## Structure

- `artisans/` — Google Docs importer (`gdocs-importer.js`) and per-maker website scrapers (`maker-scraper.js`, `makers/`). Shared sync logic lives in `artisans/utils/database.js`.
- `keysets/` — vendor keyset scraper (`vendor-scraper.js`) with per-vendor adapters in `adapters/`.
- `jobs/` — one-off/maintenance scripts (image pruning/syncing, maker id changes, catalogue metadata sync).
- `utils/` — shared constants (table names, Cloudflare image delivery URL) and Cloudflare Images helpers.
- `db/` — local JSON dumps written per maker in development for debugging parsed data.
- `.github/workflows/` — scheduled CI jobs that run the importer/scraper/image jobs against production.

## Data ownership model

Artisan colorway rows are either `source: 'gdoc'` (owned by the Google Docs importer), `source: 'scraper'` (owned by the maker scrapers), or `source: 'keebdex'` (added in the Keebdex app). Each sync only reads and writes rows of its own source. Pipeline-owned rows are only ever patched on a small allow-list of fields (see `GDOC_SYNCABLE_FIELDS` / `GDOC_SCULPT_SYNCABLE_FIELDS` in `artisans/utils/database.js`); a per-row `overridden_fields` array lets the Keebdex app lock individual fields from being overwritten by future syncs.

Schema migrations live in the Keebdex Supabase repository (`keebdex/supabase`), not here. Agent instructions are in [AGENTS.md](AGENTS.md).

## Scripts

```bash
npm run gdocs-importer   # import artisan catalogues from Google Docs
npm run maker-scraper    # scrape artisan maker websites
npm run vendor-scraper   # scrape vendor keyset listings
npm run sync-images      # sync images to Cloudflare Images
npm run prune-images     # remove orphaned Cloudflare images
npm run lint / lint:fix  # eslint
npm run format           # prettier
```

Pass `--dry-run` to the importer, scraper, and image scripts to log intended database changes and skip image uploads without writing anything.

## Environment variables

`SUPABASE_URL`, `SUPABASE_KEY`, `CF_IMAGES_API_KEY`, `CF_IMAGES_ACCOUNT_ID`, `CF_IMAGES_ACCOUNT_HASH`, `GOOGLE_SERVICE_ACCOUNT` (JSON key written to `keebdex.json`).
