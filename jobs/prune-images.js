require('dotenv').config()

const Promise = require('bluebird')
const { listImages, deleteImage } = require('../utils/image')
const { createSupabase } = require('../utils')
const { getReferencedImages } = require('../utils/referenced-images')

const supabase = createSupabase()

// Check for dry-run flag from command line arguments
const isDryRun = process.argv.includes('--dry-run')

// Images uploaded in the Keebdex app before their record is saved (e.g. a
// submission still being filled in) aren't referenced yet, so recent uploads
// are never pruned.
const MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000

const prune = async () => {
    const [referenced, remoteImages] = await Promise.all([
        getReferencedImages(supabase),
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
