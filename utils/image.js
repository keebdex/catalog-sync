const { default: axios } = require('axios')
const fs = require('fs')
const FormData = require('form-data')

async function downloadImage(url, filename) {
    const response = await axios.get(url, { responseType: 'arraybuffer' })

    const [, ext] = response.headers['content-type'].split('/')

    fs.writeFile(
        `images/${filename}.${ext.toLowerCase()}`,
        response.data,
        (err) => {
            if (err) {
                console.error('unable to download image', filename, err)
            }

            // console.log('image downloaded successfully', filename)
        },
    )
}

// Cloudflare Images cannot fetch from Cloudflare Images (another account's
// imagedelivery.net or /cdn-cgi/imagedelivery/ URLs, error 5454), so those are
// downloaded here and uploaded as a file
const CLOUDFLARE_DELIVERY_URL =
    /^https:\/\/(?:imagedelivery\.net|[^/]+\/cdn-cgi\/imagedelivery)\//

// Cloudflare's error when it could not fetch the source URL
const FETCH_ERROR_CODE = 5454

// A source URL as { data, contentType }; resolves to { status } instead when
// the download fails
async function fetchSource(url) {
    return axios
        .get(url, { responseType: 'arraybuffer' })
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

// Uploads an image under the id `filename`. `source` is a URL for Cloudflare
// to fetch, or a file as { data, contentType } (e.g. an R2 backup restored
// under its old id). URLs Cloudflare cannot fetch (Cloudflare Images of other
// accounts, sites that block its fetcher) are downloaded and sent as a file.
// `promise`, if any (e.g. the row update), is awaited only after the upload
// succeeded.
// Resolves to { ok } and never throws; failures are logged.
async function uploadImage(filename, source, promise) {
    if (typeof source === 'string' && CLOUDFLARE_DELIVERY_URL.test(source)) {
        const file = await fetchSource(source)

        if (!file.data) {
            return { ok: false, status: file.status, message: file.message }
        }

        return uploadImage(filename, file, promise)
    }

    let data = new FormData()

    if (typeof source === 'string') {
        data.append('url', source)
    } else {
        data.append('file', source.data, {
            filename: filename.split('/').pop(),
            contentType: source.contentType,
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

            const fetchFailed =
                typeof source === 'string' &&
                status !== 404 &&
                data?.errors?.some(({ code }) => code === FETCH_ERROR_CODE)

            // Cloudflare could not fetch the URL; try downloading it here
            if (fetchFailed) {
                const file = await fetchSource(source)

                if (file.data) {
                    return uploadImage(filename, file, promise)
                }

                return { ok: false, status: file.status, message: file.message }
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
    downloadImage,
    uploadImage,
    listImages,
    getListImages,
    downloadOriginal,
    deleteImage,
}
