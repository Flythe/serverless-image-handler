const AWS = require('aws-sdk')
const sharp = require('sharp')

class ImageHandler {
    /**
     * @param {ImageRequest} request - An ImageRequest object.
     */
    constructor (request) {
        this.request = request
    }

    /**
     * Applies edits to the original image and reformats the image into the requested
     * output format.
     * @return {Object} - Object containing the forwarded HTTP headers and the modified
     * image.
     */
    async process() {
        const originalImageObj = this.request.originalImageObj
        const originalImage = this.request.originalImage
        
        let modifiedImage = await this.applyEdits(originalImage, this.request.edits)

        if (this.request.requiredFormat !== undefined) {
            modifiedImage = modifiedImage.toFormat(this.request.requiredFormat)
        }

        const bufferImage = await modifiedImage.toBuffer()

        return {
            headers: this.forwardHTTPHeaders(originalImageObj),
            body: bufferImage.toString('base64')
        }
    }

    /**
     * Checks original image HTTP headers and forwards them to the output, also makes
     * sure that the Content-Type header is set correctly after reformatting the image
     * using sharp.
     * @param {Object} originalImageObj - The image object as returned by S3.getObject()
     */
    forwardHTTPHeaders(originalImageObj) {
        const headers = {
            CacheControl: originalImageObj.CacheControl
        }

        if (originalImageObj.LastModified !== undefined) {
            const formattedLastModified = new Date(originalImageObj.LastModified).toUTCString()

            headers.LastModified = formattedLastModified
        }

        if (originalImageObj.Expires !== undefined) {
            const formattedExpires = new Date(originalImageObj.Expires).toUTCString()

            headers.Expires = formattedExpires
        }

        let contentType

        switch (originalImageObj.finalFormat.toLowerCase()) {
            case 'jpeg':
            case 'jpg':
                contentType = 'image/jpeg'
                break
            case 'png':
                contentType = 'image/png'
                break
            case 'webp':
                contentType = 'image/webp'
                break
            case 'gif':
                contentType = 'image/gif'
                break
        }

        headers.ContentType = contentType

        return headers
    }

    /**
     * Applies image modifications to the original image based on edits
     * specified in the ImageRequest.
     * @param {Buffer} originalImage - The original image.
     * @param {Object} edits - The edits to be made to the original image.
     * @return {Object} - The modified image.
     */
    async applyEdits(originalImage, edits) {
        const image = sharp(originalImage)

        if (edits === undefined || !Object.keys(edits).length) {
            return image
        }

        const keys = Object.keys(edits)

        for (const [key, value] of Object.entries(edits)) {
            if (key === 'composite') {
                let overlay = await this.getOverlayImage(value.bucket, value.key)
                let metadata = await image.metadata()

                if (keys.includes('resize')) {
                    metadata.width = edits.resize.width
                    metadata.height = edits.resize.height
                }

                let overlayResize = await sharp(overlay).resize(metadata.width, metadata.height).toBuffer()
               
                image.composite([{ input: overlayResize }])
            } else {
                image[key](value)
            }
        }

        // Return the modified image
        return image
    }
   
    /**
     * Gets an image to be used as an overlay to the primary image from an
     * Amazon S3 bucket.
     * @param {String} bucket - The name of the bucket containing the overlay.
     * @param {String} key - The keyname corresponding to the overlay.
     * @return {Object} - The original image object.
     */
    async getOverlayImage(bucket, key) {
        const s3 = new AWS.S3()
        const params = { Bucket: bucket, Key: key }
        
        try {
            const overlayImage = await s3.getObject(params).promise()
            return Promise.resolve(overlayImage.Body)
        } catch (err) {
            return Promise.reject({
                status: 500,
                code: err.code,
                message: err.message
            })
        }
    }
}

// Exports
module.exports = ImageHandler