require('dotenv').config()

const { createClient } = require('@supabase/supabase-js')
const Promise = require('bluebird')
const { uploadImage } = require('../utils/image')
const { urlSlugify, DELIVERY_BASE_URL } = require('../utils')

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
)

// Check for dry-run flag from command line arguments
const isDryRun = process.argv.includes('--dry-run')

const makeKeysetImageId = (k) => `keyset/${k.profile_keyset_id}`
const makeKeysetKitImageId = (k) =>
    `keyset/${k.profile_keyset_id}/kit/${k.id}/${k.kit_id || urlSlugify(k.name)}`
const makeKeyboardImageId = (k) =>
    `keyboard/${k.brand_keyboard_slug}/${k.release_id}/${urlSlugify(k.variant_name)}`

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

const getKeysets = () =>
    fetchAll(() =>
        supabase
            .from('keysets')
            .select('img, profile_keyset_id')
            .or(OFFICIAL)
            .not('img', 'is', null)
            .neq('img', ''),
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

const getKeyboardVariants = async () => {
    const [variants, keyboards] = await Promise.all([
        fetchAll(() =>
            supabase
                .from('keyboard_variants')
                .select('*')
                .or(OFFICIAL)
                .not('img_front', 'is', null)
                .neq('img_front', '')
                .not('img_back', 'is', null)
                .neq('img_back', ''),
        ),
        getOfficialKeys('keyboards', 'brand_keyboard_slug'),
    ])

    return variants.filter((variant) =>
        keyboards.has(variant.brand_keyboard_slug),
    )
}

const syncNewKeyset = async (keyset) => {
    const filename = makeKeysetImageId(keyset)

    const promise = supabase
        .from('keysets')
        .update({
            img: `${DELIVERY_BASE_URL}/keyset/${keyset.profile_keyset_id}/public`,
        })
        .eq('profile_keyset_id', keyset.profile_keyset_id)

    const { ok, status } = await uploadImage(filename, keyset.img, promise)

    if (!ok && status === 404) {
        const { error } = await supabase
            .from('keysets')
            .update({ img: null })
            .eq('profile_keyset_id', keyset.profile_keyset_id)

        if (error) {
            console.error(
                `Failed to remove image url for keyset ${keyset.profile_keyset_id}`,
                error,
            )
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
    const filename = makeKeyboardImageId(variant)

    if (variant.img_front && !variant.img_front.includes(DELIVERY_BASE_URL)) {
        const promiseFront = supabase
            .from('keyboard_variants')
            .update({
                img_front: `${DELIVERY_BASE_URL}/${filename}/front/public`,
            })
            .eq('id', variant.id)
        await uploadImage(`${filename}/front`, variant.img_front, promiseFront)
    }

    if (variant.img_back && !variant.img_back.includes(DELIVERY_BASE_URL)) {
        const promiseBack = supabase
            .from('keyboard_variants')
            .update({
                img_back: `${DELIVERY_BASE_URL}/${filename}/back/public`,
            })
            .eq('id', variant.id)
        await uploadImage(`${filename}/back`, variant.img_back, promiseBack)
    }
}

Promise.all([getKeysets(), getKeysetKits(), getKeyboardVariants()])
    .then(async ([keysets, kits, variants]) => {
        const unsyncedKeysets = keysets.filter(
            (keyset) => keyset.img && !keyset.img.includes(DELIVERY_BASE_URL),
        )

        const unsyncedKits = kits.filter(
            (kit) => kit.img && !kit.img.includes(DELIVERY_BASE_URL),
        )

        const unsyncedVariants = variants.filter(
            (variant) =>
                (variant.img_front &&
                    !variant.img_front.includes(DELIVERY_BASE_URL)) ||
                (variant.img_back &&
                    !variant.img_back.includes(DELIVERY_BASE_URL)),
        )

        console.log('keysets to sync', unsyncedKeysets.length)
        console.log('keyset kits to sync', unsyncedKits.length)
        console.log('keyboard variants to sync', unsyncedVariants.length)

        if (isDryRun) {
            console.log(
                '[DRY RUN] Would upload',
                unsyncedKeysets.map(makeKeysetImageId),
                unsyncedKits.map(makeKeysetKitImageId),
                unsyncedVariants.map(makeKeyboardImageId),
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
    })
    .catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
