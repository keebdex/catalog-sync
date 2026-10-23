require('dotenv').config()

const Promise = require('bluebird')
const { listImages, deleteImage } = require('../utils/image')
const {
    createSupabase,
    ARTISAN_COLORWAYS_TABLE,
    DELIVERY_BASE_URL,
} = require('../utils')

const supabase = createSupabase()

// Check for dry-run flag from command line arguments
const isDryRun = process.argv.includes('--dry-run')

// Images uploaded in the Keebdex app before their record is saved (e.g. a
// submission still being filled in) aren't referenced yet, so recent uploads
// are never pruned.
const MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000

// Every column that can hold a Cloudflare Images URL. Rows of any review
// status count: a Pending submission's image must survive until it's decided.
const IMAGE_COLUMNS = [
    [ARTISAN_COLORWAYS_TABLE, ['img']],
    ['keysets', ['img']],
    ['keyset_kits', ['img']],
    ['keyboard_variants', ['img_front', 'img_back']],
]

// `${DELIVERY_BASE_URL}/<id>/<variant>` → <id> (ids may contain slashes);
// other URLs aren't Cloudflare images
const toImageId = (url) => {
    if (typeof url !== 'string' || !url.startsWith(`${DELIVERY_BASE_URL}/`))
        return null

    const path = url.slice(DELIVERY_BASE_URL.length + 1)

    return path.slice(0, path.lastIndexOf('/'))
}

// Pages through a table and throws on any error: a failed read would make
// every image of that table look unreferenced and get it deleted.
const fetchAll = async (
    table,
    columns,
    filter = (query) => query,
    rows = [],
) => {
    const { data, error } = await filter(
        supabase.from(table).select(['id', ...columns].join(', ')),
    )
        .order('id')
        .range(rows.length, rows.length + 999)

    if (error) {
        throw new Error(`Failed to read ${table}: ${error.message}`)
    }

    rows = rows.concat(data)

    if (data.length === 1000) {
        return fetchAll(table, columns, filter, rows)
    }

    return rows
}

const getReferencedImages = async () => {
    const referenced = new Set()

    for (const [table, columns] of IMAGE_COLUMNS) {
        const rows = await fetchAll(table, columns)

        rows.forEach((row) => {
            columns.forEach((column) => {
                const id = toImageId(row[column])

                if (id) referenced.add(id)
            })
        })
    }

    // An image added through an edit suggestion (e.g. Add Photo) is only in
    // the suggestion's `changes` ({ column: value }) until staff approve it.
    const suggestions = await fetchAll(
        'edit_suggestions',
        ['changes'],
        (query) => query.eq('review_status', 'Pending'),
    )

    suggestions.forEach(({ changes }) => {
        Object.values(changes ?? {}).forEach((value) => {
            const id = toImageId(value)

            if (id) referenced.add(id)
        })
    })

    return referenced
}

const prune = async () => {
    const [referenced, remoteImages] = await Promise.all([
        getReferencedImages(),
        listImages(),
    ])

    if (!referenced.size) {
        throw new Error('No referenced images found, refusing to prune')
    }

    const cutoff = Date.now() - MIN_AGE_MS
    const orphaned = remoteImages
        .filter(({ id }) => !referenced.has(id))
        .filter(({ uploaded }) => new Date(uploaded).getTime() < cutoff)
        .map(({ id }) => id)

    console.log('db images', referenced.size)
    console.log('remote images', remoteImages.length)
    console.log('prune images', orphaned.length, orphaned)

    if (isDryRun) {
        console.log(`[DRY RUN] Would delete ${orphaned.length} images`)

        return
    }

    await Promise.map(orphaned, deleteImage, { concurrency: 5 })
}

prune().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
