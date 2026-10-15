require('dotenv').config()

const { glob } = require('fs/promises')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
)

// Check for dry-run flag from command line arguments
const isDryRun = process.argv.includes('--dry-run')

// Scraped keysets and their kits go through Keebdex's review queue: every kit
// carries its own status, and approving one also approves its keyset. A null
// status would mean "added by staff" and skip review (kits) or hide the keyset
// from the queue for good (a Pending keyset whose kits have no status).
// submitted_by stays null: no user owns them, so no notifications are sent.
const PENDING_REVIEW = {
    review_status: 'Pending',
    submitted_by: null,
    verified_at: null,
    verified_by: null,
}

// Load adapters with priority order
async function loadAdapters() {
    const priorityMap = {
        NovelKeys: 1,
        ProtoTypist: 2,
    }

    const files = glob(path.join(__dirname, 'adapters/*.js'))

    let adapters = []
    for await (const file of files) {
        const adapter = require(file)

        const order = priorityMap[adapter.name] ?? 99
        adapters.push({ ...adapter, order })
    }

    adapters = await Promise.all(adapters)

    return adapters.sort((a, b) => a.order - b.order)
}

const syncKeysets = async () => {
    console.log('🚀 Starting Keyset Sync Script')

    if (isDryRun) {
        console.log('🧪 Dry run: nothing will be written to the database')
    }

    const adapters = await loadAdapters()
    const allKeysets = new Map() // key: profile_keyset_id, value: { keyset, kits }

    for (const { name, fetchKeysets } of adapters) {
        console.log(`\n📦 Fetching from ${name}...`)

        try {
            const keysets = await fetchKeysets()

            for (const { keyset, kits } of keysets) {
                const id = keyset.profile_keyset_id

                // Skip if already added from higher priority adapter
                if (allKeysets.has(id)) continue

                allKeysets.set(id, { keyset, kits })
            }
        } catch (err) {
            console.error(`‼️ Failed to fetch from ${name}:`, err.message)
        }
    }

    console.log(`\n📊 Total unique keysets: ${allKeysets.size}`)

    // keysets.profile_id references keyset_profiles, so a mapped profile that
    // Keebdex doesn't have yet would fail the insert
    const { data: profiles, error: profilesError } = await supabase
        .from('keyset_profiles')
        .select('id')
    if (profilesError) {
        console.error(
            '‼️ Failed to load keyset profiles:',
            profilesError.message,
        )

        return
    }
    const profileIds = new Set(profiles.map((p) => p.id))

    // Insert into Supabase
    for (const { keyset, kits } of allKeysets.values()) {
        if (!profileIds.has(keyset.profile_id)) {
            console.log(
                `⏭️ ${keyset.name}: unknown profile "${keyset.profile_id}". Skipping.`,
            )
            continue
        }

        const { data: existing } = await supabase
            .from('keysets')
            .select('profile_keyset_id')
            .eq('profile_keyset_id', keyset.profile_keyset_id)
            .single()

        if (existing) {
            console.log(`🔁 ${keyset.name} already exists. Skipping.`)
            continue
        }

        // Keebdex's review queue lists kits grouped by keyset, so a keyset
        // without kits could never be reviewed.
        if (kits.length === 0) {
            console.log(`⏭️ ${keyset.name} has no kits. Skipping.`)
            continue
        }

        const kitRows = kits.map((kit) => ({ ...kit, ...PENDING_REVIEW }))

        if (isDryRun) {
            console.log(`[DRY RUN] Would insert keyset ${keyset.name}`, {
                ...keyset,
                ...PENDING_REVIEW,
            })
            console.log(
                `[DRY RUN] Would insert ${kitRows.length} kits for ${keyset.name}`,
                kitRows,
            )
            continue
        }

        const { error: keysetError } = await supabase
            .from('keysets')
            .insert([{ ...keyset, ...PENDING_REVIEW }])
        if (keysetError) {
            console.error(
                `‼️ Error inserting keyset: ${keyset.name}`,
                keysetError.message,
            )
            continue
        }

        const { error: kitError } = await supabase
            .from('keyset_kits')
            .insert(kitRows)
        if (kitError) {
            console.error(
                `‼️ Error inserting kits for ${keyset.profile_keyset_id}`,
                kitError.message,
            )

            // Don't leave a Pending keyset that nothing in the queue points to
            await supabase
                .from('keysets')
                .delete()
                .eq('profile_keyset_id', keyset.profile_keyset_id)
        } else {
            console.log(`✅ Inserted ${kits.length} kits for ${keyset.name}`)
        }
    }

    console.log(
        isDryRun ? '\n🎉 Dry run finished!' : '\n🎉 All vendors synced!',
    )
}

syncKeysets()
