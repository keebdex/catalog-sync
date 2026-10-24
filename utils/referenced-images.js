const { ARTISAN_COLORWAYS_TABLE, DELIVERY_BASE_URL } = require('.')

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
// every image of that table look unreferenced (deleted by prune-images, or
// left missing by restore-images).
const fetchAll = async (
    supabase,
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
        return fetchAll(supabase, table, columns, filter, rows)
    }

    return rows
}

// Ids of every Cloudflare image the database references, shared by
// prune-images (keep these) and restore-images (bring these back).
const getReferencedImages = async (supabase) => {
    const referenced = new Set()

    for (const [table, columns] of IMAGE_COLUMNS) {
        const rows = await fetchAll(supabase, table, columns)

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
        supabase,
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

module.exports = { IMAGE_COLUMNS, getReferencedImages, toImageId }
