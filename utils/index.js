const { randomUUID } = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const slugify = require('slugify').default

const ARTISAN_MAKERS_TABLE = 'artisan_makers'
const ARTISAN_SCULPTS_TABLE = 'artisan_sculpts'
const ARTISAN_COLORWAYS_TABLE = 'artisan_colorways'

// One id per process: GitHub Actions runs are named by GITHUB_RUN_ID, local
// runs by a UUID.
const RUN_ID = process.env.GITHUB_RUN_ID || randomUUID()

// Supabase client for a job. Keebdex records every change to catalogue rows as
// a revision; these headers tell it which job made the change and group a
// run's changes together (only trusted with the service role key).
// Sources: gdoc, scraper, vendor, image-sync, maintenance.
exports.createSupabase = (source) =>
    createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
        global: {
            headers: source
                ? { 'x-keebdex-source': source, 'x-keebdex-run': RUN_ID }
                : {},
        },
    })

exports.urlSlugify = (text) => {
    text = text.replace(/[*+~.()'"!:@,/]/g, '')

    return slugify(text, { lower: true })
}

exports.ARTISAN_MAKERS_TABLE = ARTISAN_MAKERS_TABLE
exports.ARTISAN_SCULPTS_TABLE = ARTISAN_SCULPTS_TABLE
exports.ARTISAN_COLORWAYS_TABLE = ARTISAN_COLORWAYS_TABLE
exports.DELIVERY_BASE_URL = `https://imagedelivery.net/${process.env.CF_IMAGES_ACCOUNT_HASH}`

// List of makers that are known to have incomplete data
// and should not have missing items removed from the database
exports.PARTIAL_MAKERS = new Set(['keycat'])
