const AWS = require('aws-sdk');
const sharp = require('sharp');

class ImageHandler {

    /**
     * Main method for processing image requests and outputting modified images.
     * @param {ImageRequest} request - An ImageRequest object.
     */
    async process(request) {
        const originalImage = request.originalImage;
        const edits = request.edits;
        const modifiedImage = await this.applyEdits(originalImage, edits);

        if (request.outputFormat !== undefined && request.outputFormat !== null) {
            await modifiedImage.toFormat(request.outputFormat);
        }

        const bufferImage = await modifiedImage.toBuffer();

        return Promise.resolve(bufferImage.toString('base64'));
    }

    /**
     * Applies image modifications to the original image based on edits
     * specified in the ImageRequest.
     * @param {Buffer} originalImage - The original image.
     * @param {Object} edits - The edits to be made to the original image.
     */
    async applyEdits(originalImage, edits) {
        const image = sharp(originalImage).rotate();

        if (edits === undefined) {
            return Promise.resolve(image);
        }

        const keys = Object.keys(edits);
        const values = Object.values(edits);

        // Apply the image edits
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = values[i];

            if (key === 'composite') {
                let overlay = await this.getOverlayImage(value.bucket, value.key);
                let metadata = await image.metadata();

                if (keys.includes('resize')) {
                    metadata.width = edits.resize.width;
                    metadata.height = edits.resize.height;
                }

                let overlayResize = await sharp(overlay).resize(metadata.width, metadata.height).toBuffer();
               
                image.composite([{ input: overlayResize }]);
            } else {
                image[key](value);
            }
        }

        // Return the modified image
        return Promise.resolve(image);
    }
   
    /**
     * Gets an image to be used as an overlay to the primary image from an
     * Amazon S3 bucket.
     * @param {string} bucket - The name of the bucket containing the overlay.
     * @param {string} key - The keyname corresponding to the overlay.
     */
    async getOverlayImage(bucket, key) {
        const s3 = new AWS.S3();
        const params = { Bucket: bucket, Key: key };
        // Request
        const request = s3.getObject(params).promise();
        // Response handling
        try {
            const overlayImage = await request;
            return Promise.resolve(overlayImage.Body);
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
module.exports = ImageHandler;