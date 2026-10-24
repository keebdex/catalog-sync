require('dotenv').config()

const Promise = require('bluebird')
const { listImages, uploadImage } = require('../utils/image')
const { IMAGES_PREFIX, getObject } = require('../utils/r2')
const { createSupabase } = require('../utils')
const { getReferencedImages } = require('../utils/referenced-images')

const supabase = createSupabase()

// Check for dry-run flag from command line arguments
const isDryRun = process.argv.includes('--dry-run')

// --force restores past MAX_RESTORE_RATIO, after checking that the images
// really are gone from Cloudflare
const force = process.argv.includes('--force')

// A record can point at an image prune-images already deleted: an Undo or
// Restore in the Keebdex revision history, or an approved suggestion, brings
// back an older URL. These are rare, so many missing images at once means a
// bad Cloudflare listing, and re-uploading them all would be a mistake.
const MAX_RESTORE_RATIO = 0.1

const restore = async () => {
    const [referenced, remoteImages] = await Promise.all([
        getReferencedImages(supabase),
        listImages(),
    ])

    if (!remoteImages.length) {
        throw new Error('No Cloudflare images listed, refusing to restore')
    }

    const remoteIds = new Set(remoteImages.map(({ id }) => id))
    const missing = [...referenced].filter((id) => !remoteIds.has(id))

    console.log('db images', referenced.size)
    console.log('remote images', remoteImages.length)
    console.log('missing images', missing.length, missing)

    if (!force && missing.length > referenced.size * MAX_RESTORE_RATIO) {
        throw new Error(
            `${missing.length} of ${referenced.size} referenced images are missing, refusing (rerun with --force if intended)`,
        )
    }

    if (isDryRun) {
        console.log(`[DRY RUN] Would restore up to ${missing.length} images`)

        return
    }

    let restored = 0
    let failed = 0

    await Promise.map(
        missing,
        async (id) => {
            let backup

            try {
                backup = await getObject(`${IMAGES_PREFIX}${id}`)
            } catch (error) {
                failed++
                console.error('unable to read backup', id, error?.message)

                return
            }

            if (!backup) {
                console.warn('no backup to restore image from', id)

                return
            }

            // uploadImage logs its own failures
            const { ok } = await uploadImage(id, backup)

            if (ok) restored++
            else failed++
        },
        { concurrency: 5 },
    )

    console.log('restored', restored, 'images')

    if (failed) {
        throw new Error(`${failed} images could not be restored`)
    }
}

restore().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
