const { default: axios } = require('axios')
const FormData = require('form-data')

// Cloudflare Images cannot fetch from Cloudflare Images (another account's
// imagedelivery.net or /cdn-cgi/imagedelivery/ URLs, error 5454), so those are
// downloaded here and uploaded as a file
const CLOUDFLARE_DELIVERY_URL =
    /^https:\/\/(?:imagedelivery\.net|[^/]+\/cdn-cgi\/imagedelivery)\//

// Cloudflare's error when it could not fetch the source URL (it answers 424
// for some fetch failures, with a code shared with other errors)
const FETCH_ERROR_CODE = 5454
const FETCH_ERROR_STATUS = 424

// Cloudflare's error for an image over its size limits, and those limits
const TOO_LARGE_CODE = 5443
const MAX_DIMENSION = 12000
const MAX_AREA = 100000000

// Some hosts (e.g. imgur) answer axios's default user agent with a 429
const USER_AGENT = 'keebdex-catalog-sync (+https://keebdex.org)'

// imgur answers a deleted image with a redirect to a placeholder image, which
// Cloudflare would store as if it were the real one
const IMGUR_URL = /^https?:\/\/(?:i\.)?imgur\.com\//
const IMGUR_REMOVED_URL = 'https://i.imgur.com/removed.png'

async function isRemovedImgur(url) {
    if (!IMGUR_URL.test(url)) {
        return false
    }

    // A failed check falls back to a normal upload
    return axios
        .head(url, { headers: { 'User-Agent': USER_AGENT } })
        .then(({ request }) => request.res.responseUrl === IMGUR_REMOVED_URL)
        .catch(() => false)
}

// A source URL as { data, contentType }; resolves to { status } instead when
// the download fails
async function fetchSource(url) {
    return axios
        .get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': USER_AGENT },
        })
        .then(({ data, headers }) => ({
            data,
            contentType: headers['content-type'],
        }))
        .catch(({ response, message }) => {
            console.error(
                'unable to download image',
                url,
                response?.status,
                message,
            )

            return { status: response?.status, message }
        })
}

// Formats kept when downscaling; anything else becomes a JPEG
const RESIZE_FORMATS = new Set(['jpeg', 'png', 'webp'])

// A file within Cloudflare's dimension and area limits: the file itself, or a
// downscaled copy. sharp is loaded only when needed, since most scripts that
// import this module never upload a file.
async function fitImage(file) {
    const sharp = require('sharp')
    const image = sharp(file.data)
    const { width, height, format } = await image.metadata()
    const scale = Math.min(
        MAX_DIMENSION / Math.max(width, height),
        Math.sqrt(MAX_AREA / (width * height)),
    )

    if (scale >= 1) {
        return file
    }

    const output = RESIZE_FORMATS.has(format) ? format : 'jpeg'

    return {
        data: await image
            .resize(Math.floor(width * scale))
            .toFormat(output, { quality: 90 })
            .toBuffer(),
        contentType: `image/${output}`,
    }
}

// Downloads a URL and uploads it as a file
async function uploadDownloaded(filename, url, promise) {
    const file = await fetchSource(url)

    if (!file.data) {
        return { ok: false, status: file.status, message: file.message }
    }

    return uploadImage(filename, file, promise)
}

// Uploads an image under the id `filename`. `source` is a URL for Cloudflare
// to fetch, or a file as { data, contentType } (e.g. an R2 backup restored
// under its old id). URLs Cloudflare cannot fetch (Cloudflare Images of other
// accounts, sites that block its fetcher) and URLs of images over its size
// limits are downloaded and sent as a file, downscaled to fit if needed. A
// deleted imgur image resolves to { ok: false, status: 404 }, like a missing
// source.
// `promise`, if any (e.g. the row update), is awaited only after the upload
// succeeded.
// Resolves to { ok } and never throws; failures are logged.
async function uploadImage(filename, source, promise) {
    if (typeof source === 'string' && (await isRemovedImgur(source))) {
        console.error('source image was deleted', filename, source)

        return { ok: false, status: 404, message: 'deleted on imgur' }
    }

    if (typeof source === 'string' && CLOUDFLARE_DELIVERY_URL.test(source)) {
        return uploadDownloaded(filename, source, promise)
    }

    let data = new FormData()

    if (typeof source === 'string') {
        data.append('url', source)
    } else {
        // Not an image sharp can read (e.g. an HTML page): upload it as is and
        // let Cloudflare reject it
        const file = await fitImage(source).catch(() => source)

        data.append('file', file.data, {
            filename: filename.split('/').pop(),
            contentType: file.contentType,
        })
    }

    data.append('id', filename)

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_IMAGES_ACCOUNT_ID}/images/v1`,
        headers: {
            Authorization: `Bearer ${process.env.CF_IMAGES_API_KEY}`,
        },
        data,
    }

    return axios(config)
        .then(async () => {
            if (promise) {
                await promise
            }

            return { ok: true }
        })
        .catch(async ({ response, message }) => {
            const { data, status } = response || {}
            const hasError = (errorCode) =>
                data?.errors?.some(({ code }) => code === errorCode)

            // Cloudflare could not fetch the URL, or the image is too large to
            // store; download it here and upload it as a file
            const retryAsFile =
                typeof source === 'string' &&
                status !== 404 &&
                (status === FETCH_ERROR_STATUS ||
                    hasError(FETCH_ERROR_CODE) ||
                    hasError(TOO_LARGE_CODE))

            if (retryAsFile) {
                return uploadDownloaded(filename, source, promise)
            }

            console.error(
                'unable to upload image',
                filename,
                status,
                message,
                JSON.stringify(data),
            )

            return { ok: false, status, message, data }
        })
}

// Every image on the account as { id, uploaded }
async function listImages(images = [], token) {
    const config = {
        method: 'get',
        url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_IMAGES_ACCOUNT_ID}/images/v2`,
        headers: {
            Authorization: `Bearer ${process.env.CF_IMAGES_API_KEY}`,
        },
        params: {
            per_page: 5000,
            continuation_token: token,
        },
    }

    return axios(config).then(({ data: { result } }) => {
        images = images.concat(
            result.images.map(({ id, uploaded }) => ({ id, uploaded })),
        )

        if (result.continuation_token) {
            return listImages(images, result.continuation_token)
        }

        return images
    })
}

async function getListImages() {
    const images = await listImages()

    return images.map((image) => image.id)
}

// The original file as uploaded, through the API rather than a delivery URL
// (which would return a resized variant). Account-owned tokens get a 403 here
// for images Cloudflare named itself (Keebdex app uploads), so a user token
// with Images read access can be passed as CF_IMAGES_READ_TOKEN.
async function downloadOriginal(imageId) {
    const token =
        process.env.CF_IMAGES_READ_TOKEN || process.env.CF_IMAGES_API_KEY

    const config = {
        method: 'get',
        url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_IMAGES_ACCOUNT_ID}/images/v1/${imageId}/blob`,
        headers: {
            Authorization: `Bearer ${token}`,
        },
        responseType: 'arraybuffer',
    }

    const { data, headers } = await axios(config)

    return { data, contentType: headers['content-type'] }
}

async function deleteImage(imageId) {
    const config = {
        method: 'delete',
        url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_IMAGES_ACCOUNT_ID}/images/v1/${imageId}`,
        headers: {
            Authorization: `Bearer ${process.env.CF_IMAGES_API_KEY}`,
        },
    }

    return axios(config).catch(({ message }) => {
        console.error('unable to delete image', imageId, message)
    })
}

module.exports = {
    uploadImage,
    listImages,
    getListImages,
    downloadOriginal,
    deleteImage,
}
