require('dotenv').config()

const Promise = require('bluebird')
const { crc32 } = require('crc')
const { uploadImage } = require('../utils/image')
const {
    createSupabase,
    urlSlugify,
    ARTISAN_COLORWAYS_TABLE,
    ARTISAN_SCULPTS_TABLE,
    DELIVERY_BASE_URL,
} = require('../utils')

const supabase = createSupabase('image-sync')

// Check for dry-run flag from command line arguments
const isDryRun = process.argv.includes('--dry-run')

// Every id ends with a hash of the source URL. A row whose image is replaced
// by a new URL gets a new id (Cloudflare rejects an existing one), and an id
// never comes to hold different content, which the R2 backup relies on. The
// old upload is pruned once nothing references it.
const urlHash = (url) => crc32(url).toString(16)

// The cover keeps the original scheme; order graphs and histories get their
// own folder (`keyset/<profile_keyset_id>/order-graph/<hash>`)
const makeKeysetImageId = (k, column = 'img') =>
    column === 'img'
        ? `keyset/${k.profile_keyset_id}/${urlHash(k.img)}`
        : `keyset/${k.profile_keyset_id}/${column.replace('_', '-')}/${urlHash(k[column])}`
const makeKeysetKitImageId = (k) =>
    `keyset/${k.profile_keyset_id}/kit/${k.id}/${k.kit_id || urlSlugify(k.name)}/${urlHash(k.img)}`
const makeKeyboardImageId = (k, side) =>
    `keyboard/${k.brand_keyboard_slug}/${k.release_id}/${urlSlugify(k.variant_name)}/${side}/${urlHash(k[`img_${side}`])}`
// the artisan importer and scraper scheme, plus the URL hash
const makeColorwayImageId = (c) =>
    `artisan/${c.maker_id}/${c.sculpt_id}/${c.colorway_id}/${urlHash(c.img)}`

const KEYBOARD_SIDES = ['front', 'back']

// The cover, plus the order graph and order history shown on keyset pages
const KEYSET_IMAGE_COLUMNS = ['img', 'order_graph', 'order_history']

const isUnsynced = (url) => url && !url.includes(DELIVERY_BASE_URL)

const unsyncedSides = (variant) =>
    KEYBOARD_SIDES.filter((side) => isUnsynced(variant[`img_${side}`]))

const unsyncedKeysetColumns = (keyset) =>
    KEYSET_IMAGE_COLUMNS.filter((column) => isUnsynced(keyset[column]))

// Rows still in review keep their vendor/submitter URL: reviewers see the
// original image, and rejected rows never leave an upload behind. They get
// synced on the first run after approval.
const OFFICIAL = 'review_status.is.null,review_status.eq.Approved'

// Pages through a query (PostgREST caps responses at 1000 rows) and throws
// on any error, so a failed read never looks like "nothing to sync".
const fetchAll = async (buildQuery, rows = []) => {
    const { data, error } = await buildQuery()
        .order('id')
        .range(rows.length, rows.length + 999)

    if (error) {
        throw error
    }

    rows = rows.concat(data)

    if (data.length === 1000) {
        return fetchAll(buildQuery, rows)
    }

    return rows
}

const getOfficialKeys = async (table, column) => {
    const rows = await fetchAll(() =>
        supabase.from(table).select(`id, ${column}`).or(OFFICIAL),
    )

    return new Set(rows.map((row) => row[column]))
}

// Columns without an image are skipped later, so a keyset with only an order
// graph still syncs.
const getKeysets = () =>
    fetchAll(() =>
        supabase
            .from('keysets')
            .select(`id, profile_keyset_id, ${KEYSET_IMAGE_COLUMNS.join(', ')}`)
            .or(OFFICIAL),
    )

// A kit counts as published only when its keyset is too (older scraped kits
// have no status of their own under a Pending keyset).
const getKeysetKits = async () => {
    const [kits, keysets] = await Promise.all([
        fetchAll(() =>
            supabase
                .from('keyset_kits')
                .select('*')
                .or(OFFICIAL)
                .not('img', 'is', null)
                .neq('img', ''),
        ),
        getOfficialKeys('keysets', 'profile_keyset_id'),
    ])

    return kits.filter((kit) => keysets.has(kit.profile_keyset_id))
}

// Sides without an image are skipped later, so a variant with only a front or
// only a back image still syncs.
const getKeyboardVariants = async () => {
    const [variants, keyboards] = await Promise.all([
        fetchAll(() =>
            supabase.from('keyboard_variants').select('*').or(OFFICIAL),
        ),
        getOfficialKeys('keyboards', 'brand_keyboard_slug'),
    ])

    return variants.filter((variant) =>
        keyboards.has(variant.brand_keyboard_slug),
    )
}

// Colorways added in the Keebdex app can carry an external URL; gdoc and
// scraper rows are uploaded by their own jobs and already point here.
const getColorways = async () => {
    const [colorways, sculpts] = await Promise.all([
        fetchAll(() =>
            supabase
                .from(ARTISAN_COLORWAYS_TABLE)
                .select(
                    'id, maker_id, sculpt_id, maker_sculpt_id, colorway_id, img',
                )
                .or(OFFICIAL)
                .not('img', 'is', null)
                .neq('img', ''),
        ),
        getOfficialKeys(ARTISAN_SCULPTS_TABLE, 'maker_sculpt_id'),
    ])

    return colorways.filter((colorway) => sculpts.has(colorway.maker_sculpt_id))
}

const syncNewColorway = async (colorway) => {
    const filename = makeColorwayImageId(colorway)

    const promise = supabase
        .from(ARTISAN_COLORWAYS_TABLE)
        .update({ img: `${DELIVERY_BASE_URL}/${filename}/public` })
        .eq('id', colorway.id)

    const { ok, status } = await uploadImage(filename, colorway.img, promise)

    if (!ok && status === 404) {
        const { error } = await supabase
            .from(ARTISAN_COLORWAYS_TABLE)
            .update({ img: null })
            .eq('id', colorway.id)

        if (error) {
            console.error(
                `Failed to remove image url for colorway ${colorway.id}`,
                error,
            )
        }
    }
}

const syncNewKeyset = async (keyset) => {
    for (const column of unsyncedKeysetColumns(keyset)) {
        const filename = makeKeysetImageId(keyset, column)

        const promise = supabase
            .from('keysets')
            .update({ [column]: `${DELIVERY_BASE_URL}/${filename}/public` })
            .eq('profile_keyset_id', keyset.profile_keyset_id)

        const { ok, status } = await uploadImage(
            filename,
            keyset[column],
            promise,
        )

        if (!ok && status === 404) {
            const { error } = await supabase
                .from('keysets')
                .update({ [column]: null })
                .eq('profile_keyset_id', keyset.profile_keyset_id)

            if (error) {
                console.error(
                    `Failed to remove ${column} url for keyset ${keyset.profile_keyset_id}`,
                    error,
                )
            }
        }
    }
}

const syncNewKeysetKit = async (kit) => {
    const filename = makeKeysetKitImageId(kit)

    const promise = supabase
        .from('keyset_kits')
        .update({
            img: `${DELIVERY_BASE_URL}/${filename}/public`,
        })
        .eq('id', kit.id)

    const { ok, status } = await uploadImage(filename, kit.img, promise)

    if (!ok && status === 404) {
        const { error } = await supabase
            .from('keyset_kits')
            .update({ img: '' })
            .eq('id', kit.id)

        if (error) {
            console.error(
                `Failed to remove image url for keyset kit ${kit.id}`,
                error,
            )
        }
    }
}

const syncNewKeyboardVariant = async (variant) => {
    for (const side of unsyncedSides(variant)) {
        const filename = makeKeyboardImageId(variant, side)

        const promise = supabase
            .from('keyboard_variants')
            .update({
                [`img_${side}`]: `${DELIVERY_BASE_URL}/${filename}/public`,
            })
            .eq('id', variant.id)

        await uploadImage(filename, variant[`img_${side}`], promise)
    }
}

Promise.all([
    getKeysets(),
    getKeysetKits(),
    getKeyboardVariants(),
    getColorways(),
])
    .then(async ([keysets, kits, variants, colorways]) => {
        const unsyncedKeysets = keysets.filter(
            (keyset) => unsyncedKeysetColumns(keyset).length,
        )

        const unsyncedKits = kits.filter((kit) => isUnsynced(kit.img))

        const unsyncedVariants = variants.filter(
            (variant) => unsyncedSides(variant).length,
        )

        const unsyncedColorways = colorways.filter((colorway) =>
            isUnsynced(colorway.img),
        )

        console.log('keysets to sync', unsyncedKeysets.length)
        console.log('keyset kits to sync', unsyncedKits.length)
        console.log('keyboard variants to sync', unsyncedVariants.length)
        console.log('artisan colorways to sync', unsyncedColorways.length)

        if (isDryRun) {
            console.log(
                '[DRY RUN] Would upload',
                unsyncedKeysets.flatMap((keyset) =>
                    unsyncedKeysetColumns(keyset).map((column) =>
                        makeKeysetImageId(keyset, column),
                    ),
                ),
                unsyncedKits.map(makeKeysetKitImageId),
                unsyncedVariants.flatMap((variant) =>
                    unsyncedSides(variant).map((side) =>
                        makeKeyboardImageId(variant, side),
                    ),
                ),
                unsyncedColorways.map(makeColorwayImageId),
            )

            return
        }

        if (unsyncedKeysets.length) {
            await Promise.map(unsyncedKeysets, syncNewKeyset, {
                concurrency: 5,
            })
        }

        if (unsyncedKits.length) {
            await Promise.map(unsyncedKits, syncNewKeysetKit, {
                concurrency: 5,
            })
        }

        if (unsyncedVariants.length) {
            await Promise.map(unsyncedVariants, syncNewKeyboardVariant, {
                concurrency: 5,
            })
        }

        if (unsyncedColorways.length) {
            await Promise.map(unsyncedColorways, syncNewColorway, {
                concurrency: 5,
            })
        }
    })
    .catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
