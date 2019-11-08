const AWS = require('aws-sdk')
const sharp = require('sharp')

const RequestExceptions = require('./exceptions/RequestExceptions')
const parser = require('./parsers/request-parser')
const resizeParser = require('./parsers/resize-request-parser')
const utils = require('./helpers/utils')

class ImageRequest {
    /**
     * @param {Object} event - Lambda request body.
     */
    constructor (event) {
        this.event = event

        parser.isValid(event)

        this.request = parser.decodeRequest(event)

        parser.isSecure(this.request)

        this.bucket = parser.parseBucket(this.request.bucket)

        this.key = this.request.key
        this.edits = this.request.edits

        this.requestFormat = event.outputFormat
        this.headers = event.headers
    }

    /**
     * Initializer function for creating a new image request, used by the image
     * handler to perform image modifications.
     */
    async setup() {
        const parserObj = new resizeParser()
        this.edits = parserObj.checkResize(this.edits)
        
        this.originalImageObj = await this.getOriginalImage(this.bucket, this.key)
        this.originalImage = this.originalImageObj.Body

        const requiredFormat = this.getOutputFormat(this.headers, this.requestFormat)
        
        if (requiredFormat !== false) {
            this.originalImageObj.finalFormat = requiredFormat
            this.requiredFormat = requiredFormat
        } else {
            this.originalImageObj.finalFormat = await this.getImageFormat(this.originalImage)
        }
    }

    /**
     * Gets the original image from an Amazon S3 bucket.
     * @param {String} bucket - Requested bucket name.
     * @param {String} key - Requested file key.
     * @return {Promise} - The original image or an error.
     */
    async getOriginalImage(bucket, key) {
        const s3 = new AWS.S3()
        const imageLocation = { Bucket: bucket, Key: key }

        try {
            const originalImage = await s3.getObject(imageLocation).promise()

            return Promise.resolve(originalImage)
        } catch(err) {
            return Promise.reject(
                new RequestExceptions.NotFoundException(err.code, err.message)
            )
        }
    }

    /**
    * Return the output format depending on the accepts headers.
    * @param {Object} headers - HTTP headers provided by the client.
    * @param {String} requestFormat - Requested output format.
    * @return {String} - The final output format of the image.
    */
    getOutputFormat(headers, requestFormat) {
        const autoWebP = utils.externalVariableIsSet('AUTO_WEBP', 'Yes')

        if (autoWebP && headers.Accept && headers.Accept.includes('image/webp') && requestFormat === undefined) {
            return 'webp'
        }

        if (requestFormat !== undefined) {
            return requestFormat
        }
        
        return false
    }

    async getImageFormat(originalImage) {
        const image = sharp(originalImage)
        const metadata = await image.metadata()

        const returnFormat = metadata.format.toLowerCase()

        return returnFormat
    }
}

// Exports
module.exports = ImageRequest