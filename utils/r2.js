const {
    S3Client,
    CopyObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
} = require('@aws-sdk/client-s3')

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
    process.env

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

module.exports = { listObjects, moveObject, putObject }
