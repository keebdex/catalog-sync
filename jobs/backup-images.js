require('dotenv').config()

const Promise = require('bluebird')
const { listImages, downloadOriginal } = require('../utils/image')
const { listKeys, putObject } = require('../utils/r2')

// Check for dry-run flag from command line arguments
const isDryRun = process.argv.includes('--dry-run')

// --limit <n> backs up at most n images, to try the job on a small batch
const limitIndex = process.argv.indexOf('--limit')
const limit = limitIndex > -1 ? Number(process.argv[limitIndex + 1]) : Infinity

// Backups are keyed by Cloudflare image id, so a restore re-uploads each file
// under its old id and every stored delivery URL works again
const PREFIX = 'images/'

const backup = async () => {
    const [images, backedUp] = await Promise.all([
        listImages(),
        listKeys(PREFIX),
    ])

    // Each image is fetched once: a backed-up id is never fetched again.
    // Nothing is deleted from the backup when an image is pruned: guarding
    // against a bad prune is the point.
    const missing = images
        .filter(({ id }) => !backedUp.has(`${PREFIX}${id}`))
        .slice(0, limit)

    console.log('remote images', images.length)
    console.log('backed up images', backedUp.size)
    console.log('images to back up', missing.length)

    if (isDryRun) {
        console.log(
            `[DRY RUN] Would back up ${missing.length} images`,
            missing.map(({ id }) => id),
        )

        return
    }

    let saved = 0
    let failed = 0

    await Promise.map(
        missing,
        async ({ id, uploaded }) => {
            try {
                const { data, contentType } = await downloadOriginal(id)

                await putObject(`${PREFIX}${id}`, data, contentType, {
                    uploaded,
                })
                saved++
            } catch (error) {
                // deleted since it was listed
                if (error?.response?.status === 404) return

                failed++
                console.error('unable to back up image', id, error?.message)
            }
        },
        { concurrency: 5 },
    )

    console.log('backed up', saved, 'images')

    if (failed) {
        throw new Error(`${failed} images failed to back up`)
    }
}

backup().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
