require('dotenv').config()

const Promise = require('bluebird')
const { listImages, downloadOriginal } = require('../utils/image')
const {
    IMAGES_PREFIX: PREFIX,
    getLockRules,
    listObjects,
    moveObject,
    putObject,
} = require('../utils/r2')

// Check for dry-run flag from command line arguments
const isDryRun = process.argv.includes('--dry-run')

// --limit <n> backs up at most n images, to try the job on a small batch
const limitIndex = process.argv.indexOf('--limit')
const limit = limitIndex > -1 ? Number(process.argv[limitIndex + 1]) : Infinity

// --force-trash moves backups to the trash past MAX_TRASH_RATIO, for a
// deliberate mass deletion on Cloudflare
const forceTrash = process.argv.includes('--force-trash')

// The backup of an image deleted from Cloudflare moves here; how long it stays
// is up to the bucket's lock and lifecycle rules for this prefix
const TRASH_PREFIX = 'trash/images/'

// A bad Cloudflare listing would make every backup look orphaned
const MAX_TRASH_RATIO = 0.1

// The bucket's lock rules, managed outside this repo, decide what may leave
// images/: a backup is movable once no enabled rule covering its key still
// retains it. An unknown condition counts as retaining.
const isUnlocked = (key, modified, rules, now) =>
    rules.every(({ enabled, prefix = '', condition }) => {
        if (!enabled || !key.startsWith(prefix)) return true

        switch (condition?.type) {
            case 'Age':
                return (
                    now - modified.getTime() >= condition.maxAgeSeconds * 1000
                )
            case 'Date':
                return now >= new Date(condition.date).getTime()
            default:
                return false
        }
    })

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

const trashOrphaned = async (images, backedUp, rules) => {
    if (!images.length) {
        throw new Error('No Cloudflare images listed, refusing to trash')
    }

    const remoteIds = new Set(images.map(({ id }) => id))
    const now = Date.now()

    const unused = [...backedUp].filter(
        ([key]) => !remoteIds.has(key.slice(PREFIX.length)),
    )
    const orphaned = unused
        .filter(([key, modified]) => isUnlocked(key, modified, rules, now))
        .map(([key]) => key)

    console.log('unused backups', unused.length)
    console.log('unused backups still locked', unused.length - orphaned.length)
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

    // Rules that can't be read are treated as a lock on everything
    let failedTrash = 0
    let rules = null

    try {
        rules = await getLockRules()
    } catch (error) {
        console.warn(
            'unable to read bucket lock rules, skipping trash',
            error?.message,
        )
    }

    if (rules) {
        failedTrash = await trashOrphaned(images, backedUp, rules)
    }

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
