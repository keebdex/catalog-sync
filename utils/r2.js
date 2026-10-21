const {
    S3Client,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
} = require('@aws-sdk/client-s3')

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
    process.env

const isR2Configured = () =>
    Boolean(
        R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET,
    )

let client

// R2 speaks the S3 API. Checksums only when required: R2 rejects some of the
// integrity headers newer SDKs send by default.
const getClient = () => {
    if (!isR2Configured()) {
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

// Every key under a prefix, as a Set
async function listKeys(prefix, keys = new Set(), token) {
    const { Contents = [], NextContinuationToken } = await getClient().send(
        new ListObjectsV2Command({
            Bucket: R2_BUCKET,
            Prefix: prefix,
            ContinuationToken: token,
        }),
    )

    Contents.forEach(({ Key }) => keys.add(Key))

    if (NextContinuationToken) {
        return listKeys(prefix, keys, NextContinuationToken)
    }

    return keys
}

async function objectExists(key) {
    try {
        await getClient().send(
            new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }),
        )

        return true
    } catch (error) {
        if (error?.$metadata?.httpStatusCode === 404) return false

        throw error
    }
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

module.exports = { isR2Configured, listKeys, objectExists, putObject }
