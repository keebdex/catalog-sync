const {
    S3Client,
    CopyObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
} = require('@aws-sdk/client-s3')
const { default: axios } = require('axios')

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
    process.env

// Backups of Cloudflare images are keyed by image id (images/<id>), so
// restore-images re-uploads each file under its old id and every stored
// delivery URL works again
const IMAGES_PREFIX = 'images/'

let client

// R2 speaks the S3 API. Checksums only when required: R2 rejects some of the
// integrity headers newer SDKs send by default.
const getClient = () => {
    if (
        !R2_ACCOUNT_ID ||
        !R2_ACCESS_KEY_ID ||
        !R2_SECRET_ACCESS_KEY ||
        !R2_BUCKET
    ) {
        throw new Error(
            'R2 is not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)',
        )
    }

    client ||= new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
    })

    return client
}

// Every object under a prefix, as a Map of key → last modified date
async function listObjects(prefix, objects = new Map(), token) {
    const { Contents = [], NextContinuationToken } = await getClient().send(
        new ListObjectsV2Command({
            Bucket: R2_BUCKET,
            Prefix: prefix,
            ContinuationToken: token,
        }),
    )

    Contents.forEach(({ Key, LastModified }) => objects.set(Key, LastModified))

    if (NextContinuationToken) {
        return listObjects(prefix, objects, NextContinuationToken)
    }

    return objects
}

async function putObject(key, body, contentType, metadata) {
    return getClient().send(
        new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
            Metadata: metadata,
        }),
    )
}

// The object's bytes and type, or null when the key doesn't exist
async function getObject(key) {
    try {
        const { Body, ContentType } = await getClient().send(
            new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
        )

        return {
            data: Buffer.from(await Body.transformToByteArray()),
            contentType: ContentType,
        }
    } catch (error) {
        if (error?.name === 'NoSuchKey') return null

        throw error
    }
}

// Copy, then delete: a failed delete leaves the object in both places rather
// than in neither. Metadata is copied along.
async function moveObject(from, to) {
    const source = from.split('/').map(encodeURIComponent).join('/')

    await getClient().send(
        new CopyObjectCommand({
            Bucket: R2_BUCKET,
            CopySource: `${R2_BUCKET}/${source}`,
            Key: to,
        }),
    )

    await getClient().send(
        new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: from }),
    )
}

// The bucket's lock rules, through the Cloudflare API: the S3 API has no view
// of them. Needs R2_API_TOKEN, an API token with R2 read access; the S3 keys
// above can't read bucket settings.
async function getLockRules() {
    if (!process.env.R2_API_TOKEN) {
        throw new Error('R2_API_TOKEN is not set')
    }

    const { data } = await axios.get(
        `https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/lock`,
        { headers: { Authorization: `Bearer ${process.env.R2_API_TOKEN}` } },
    )

    return data.result?.rules || []
}

module.exports = {
    IMAGES_PREFIX,
    getLockRules,
    getObject,
    listObjects,
    moveObject,
    putObject,
}
