require('dotenv').config()

const Promise = require('bluebird')
const { listImages, downloadOriginal } = require('../utils/image')
const { listObjects, moveObject, putObject } = require('../utils/r2')

// Check for dry-run flag from command line arguments
const isDryRun = process.argv.includes('--dry-run')

// --limit <n> backs up at most n images, to try the job on a small batch
const limitIndex = process.argv.indexOf('--limit')
const limit = limitIndex > -1 ? Number(process.argv[limitIndex + 1]) : Infinity

// --force-trash moves backups to the trash past MAX_TRASH_RATIO, for a
// deliberate mass deletion on Cloudflare
const forceTrash = process.argv.includes('--force-trash')

// Backups are keyed by Cloudflare image id, so a restore re-uploads each file
// under its old id and every stored delivery URL works again
const PREFIX = 'images/'

// The backup of an image deleted from Cloudflare moves here. A bucket lock
// keeps it for 90 days, then a lifecycle rule expires it, so an image deleted
// by mistake can be restored for at least that long.
const TRASH_PREFIX = 'trash/images/'

// images/ is locked for this long after upload, so younger backups can't be
// moved yet; they are picked up by a later run
const LOCK_DAYS = 30

// A bad Cloudflare listing would make every backup look orphaned
const MAX_TRASH_RATIO = 0.1

const backupMissing = async (images, backedUp) => {
    // Each image is fetched once: a backed-up id is never fetched again
    const missing = images
        .filter(({ id }) => !backedUp.has(`${PREFIX}${id}`))
        .slice(0, limit)

    console.log('images to back up', missing.length)

    if (isDryRun) {
        console.log(
            `[DRY RUN] Would back up ${missing.length} images`,
            missing.map(({ id }) => id),
        )

        return 0
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

    return failed
}

const trashOrphaned = async (images, backedUp) => {
    if (!images.length) {
        throw new Error('No Cloudflare images listed, refusing to trash')
    }

    const remoteIds = new Set(images.map(({ id }) => id))
    const cutoff = Date.now() - LOCK_DAYS * 24 * 60 * 60 * 1000

    const orphaned = [...backedUp]
        .filter(([key]) => !remoteIds.has(key.slice(PREFIX.length)))
        .filter(([, modified]) => modified.getTime() < cutoff)
        .map(([key]) => key)

    console.log('backups to trash', orphaned.length)

    if (!forceTrash && orphaned.length > backedUp.size * MAX_TRASH_RATIO) {
        throw new Error(
            `${orphaned.length} of ${backedUp.size} backups would be trashed, refusing (rerun with --force-trash if intended)`,
        )
    }

    if (isDryRun) {
        console.log(
            `[DRY RUN] Would trash ${orphaned.length} backups`,
            orphaned,
        )

        return 0
    }

    let trashed = 0
    let failed = 0

    await Promise.map(
        orphaned,
        async (key) => {
            try {
                await moveObject(
                    key,
                    `${TRASH_PREFIX}${key.slice(PREFIX.length)}`,
                )
                trashed++
            } catch (error) {
                failed++
                console.error('unable to trash backup', key, error?.message)
            }
        },
        { concurrency: 5 },
    )

    console.log('trashed', trashed, 'backups')

    return failed
}

const backup = async () => {
    const [images, backedUp] = await Promise.all([
        listImages(),
        listObjects(PREFIX),
    ])

    console.log('remote images', images.length)
    console.log('backed up images', backedUp.size)

    const failedBackups = await backupMissing(images, backedUp)
    const failedTrash = await trashOrphaned(images, backedUp)

    if (failedBackups || failedTrash) {
        throw new Error(
            `${failedBackups} images failed to back up, ${failedTrash} backups failed to trash`,
        )
    }
}

backup().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
