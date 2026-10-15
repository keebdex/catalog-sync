// Helper function to remove HTML tags from a string
const removeHtmlTags = (str) => {
    if (str === null || str === '') {
        return ''
    } else {
        return str.toString().replace(/<[^>]*>/g, '')
    }
}

// Vendor title prefix → Keebdex keyset_profiles.id. MTNU sets are sold as
// "GMK MTNU", so that prefix must win over plain "GMK".
const profileIdMapping = {
    'GMK CYL': 'gmk',
    'GMK MTNU': 'mtnu',
    GMK: 'gmk',
    CYL: 'gmk',
    MTNU: 'mtnu',
    ePBT: 'epbt',
    JTK: 'jtk',
    'Key Kobo': 'keykobo',
    KKB: 'keykobo',
    PBTfans: 'pbtfans',
    'Signature Plastics': 'sa',
    DCS: 'dcs',
    DSA: 'dsa',
    KAT: 'kat',
    KAM: 'kam',
    MT3: 'mt3',
    MW: 'mw',
    XDA: 'xda',
}

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Longest names first, matched as whole words, so "GMK MTNU" beats "GMK"
// and "KAT" doesn't match inside another word.
const profilePatterns = Object.keys(profileIdMapping)
    .sort((a, b) => b.length - a.length)
    .map((name) => ({
        profileId: profileIdMapping[name],
        regex: new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i'),
    }))

// Function to find the profile_id and clean the keyset name
const getProfileInfo = (keysetName) => {
    for (const { profileId, regex } of profilePatterns) {
        if (regex.test(keysetName)) {
            const cleanedName = keysetName
                .replace(regex, '')
                .replace(/\s+/g, ' ')
                .trim()

            return { profileId, cleanedName }
        }
    }

    return { profileId: null, cleanedName: keysetName }
}

module.exports = { removeHtmlTags, getProfileInfo }
