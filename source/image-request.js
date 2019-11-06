/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance        *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://aws.amazon.com/asl/                                                                                    *
 *                                                                                                                    *
 *  or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

class ImageRequest {

    /**
     * Initializer function for creating a new image request, used by the image
     * handler to perform image modifications.
     * @param {Object} event - Lambda request body.
     */
    async setup(event) {
        try {
            this.isValidRequest(event);

            this.bucket = this.parseImageBucket(event);
            this.key = this.decodeRequest(event).key;
            this.edits = this.decodeRequest(event).edits;
            this.edits = this.checkResize(this.edits);
            this.originalImage = await this.getOriginalImage(this.bucket, this.key)

            const outputFormat = this.getOutputFormat(event);

            if (outputFormat !== null) {
                this.outputFormat = outputFormat;
            }

            return Promise.resolve(this);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    /**
     * Gets the original image from an Amazon S3 bucket.
     * @param {String} bucket - The name of the bucket containing the image.
     * @param {String} key - The key name corresponding to the image.
     * @return {Promise} - The original image or an error.
     */
    async getOriginalImage(bucket, key) {
        const S3 = require('aws-sdk/clients/s3');
        const s3 = new S3();
        const imageLocation = { Bucket: bucket, Key: key };
        const request = s3.getObject(imageLocation).promise();
        try {
            const originalImage = await request;
            this.ContentType = originalImage.ContentType;
            this.Expires = originalImage.Expires;
            this.LastModified = originalImage.LastModified;
            this.CacheControl = originalImage.CacheControl;
            return Promise.resolve(originalImage.Body);
        }
        catch(err) {
            return Promise.reject({
                status: 404,
                code: err.code,
                message: err.message
            })
        }
    }

    /**
    * Return the output format depending on the accepts headers
    * @param {Object} event - The request body.
    */
    getOutputFormat(event) {
        const autoWebP = process.env.AUTO_WEBP;
        const requestFormat = event.outputFormat;
        let returnFormat = null;

        if (autoWebP && event.headers.Accept && event.headers.Accept.includes("image/webp") && requestFormat === undefined) {
            returnFormat = "webp";
        } else if (requestFormat !== undefined) {
            returnFormat = requestFormat;
        }

        if (returnFormat !== null) {
            this.ContentType = 'image/' + returnFormat;
        }
        
        return returnFormat;
    }

    /**
     * If resizing is restricted this function checks whether
     * the request asks for a valid resize. When an image is
     * requested without a resize specified and the DEFAULT_TO_FIRST_SIZE
     * setting is set to 'Yes' it will add the default size to
     * the request.
     * @param {Object} edits - JSON object defining the edits that should be applied to the image.
     */
    checkResize(edits) {
        if (!this.sizesRestricted()) {
            return edits;    
        } else if (this.resizeInRequest(edits)) {
            edits = this.isAllowedResize(edits);
        } else {
            edits = this.addSizeToRequest(edits);
        }
        
        if (edits.resize.width === 0) {
            delete edits.resize.width;
        } else if (edits.resize.height === 0) {
            delete edits.resize.height;
        }

        return edits;
    }

    /**
     * Checks whether the external variable ALLOWED_SIZES is set.
     * This means that resizing the image is bound to a set of
     * allowed sizes.
     */
    sizesRestricted() {
        return this.externalVariableIsSet('ALLOWED_SIZES');
    }

    /**
     * Checks whether a size is defined in the request.
     * @param {Object} edits - JSON object defining the edits that should be applied to the image.
     */
    resizeInRequest(edits) {
        return (edits.resize !== undefined &&
            edits.resize !== ""
            && (Object.keys(edits.resize).length !== 0 && edits.resize.constructor === Object));
    }

    /**
     * Checks whether the requested image size is allowed by the
     * ALLOWED_SIZES config.
     * @param {Object} edits - JSON object defining the edits that should be applied to the image.
     */
    isAllowedResize(edits) {
        const allowedSizes = process.env.ALLOWED_SIZES.split(',');
        const requestedSize = edits.resize.width + 'x' + edits.resize.height;

        if (allowedSizes.includes(requestedSize)) {
            return edits;
        } else {
            throw ({
                status: 400,
                code: 'Resize::SizeNotAllowed',
                message: 'The size you specified is not allowed. Please check the sizes specified in ALLOWED_SIZES.'
            })
        }
    }

    /**
     * When an image is requested without a resize specified and
     * the DEFAULT_TO_FIRST_SIZE setting is set to 'Yes' this will
     * add the default size to the request.
     */
    addSizeToRequest(edits) {
        const defaultToFirstSize = (process.env.DEFAULT_TO_FIRST_SIZE === "Yes");
        let firstSize = process.env.ALLOWED_SIZES.split(',')[0];

        if (defaultToFirstSize) {
            let [defaultWidth, defaultHeight] = firstSize.split('x');
            
            edits.resize = {
                width: Number(defaultWidth),
                height: Number(defaultHeight)
            }

            return edits;
        } else {
            throw ({
                status: 400,
                code: 'Resize::NoDefault',
                message: 'No resize was specified and no default size is defined.'
            })
        }
    }

    /**
     * Checks whether an externally set variable exists and is not empty.
     * @param {String} key - Key to the variable.
     */
    externalVariableIsSet(key) {
        if (process.env[key] !== "" && process.env[key] !== undefined) {
            return true;
        }

        return false;
    }

    /**
     * Parses the name of the appropriate Amazon S3 bucket to source the
     * original image from.
     * @param {String} event - Lambda request body.
     */
    parseImageBucket(event) {
        // Decode the image request
        const decoded = this.decodeRequest(event);
        if (decoded.bucket !== undefined) {
            // Check the provided bucket against the whitelist
            const sourceBuckets = this.getAllowedSourceBuckets();
            if (sourceBuckets.includes(decoded.bucket)) {
                return decoded.bucket;
            } else {
                throw ({
                    status: 403,
                    code: 'ImageBucket::CannotAccessBucket',
                    message: 'The bucket you specified could not be accessed. Please check that the bucket is specified in your SOURCE_BUCKETS.'
                });
            }
        } else {
            // Try to use the default image source bucket env var
            const sourceBuckets = this.getAllowedSourceBuckets();
            return sourceBuckets[0];
        }
    }

    /**
     * Determines whether a valid path is passed otherwise throws an error.
     * @param {Object} event - Lambda request body.
    */
    isValidRequest(event) {
        const path = event["path"];
        // ----
        const matchDefault = new RegExp(/^(\/?)([0-9a-zA-Z+\/]{4})*(([0-9a-zA-Z+\/]{2}==)|([0-9a-zA-Z+\/]{3}=))?$/);
        // ----
        if (matchDefault.test(path)) {  // use sharp
            return 'Default';
        } else {
            throw {
                status: 400,
                code: 'RequestTypeError',
                message: 'The type of request you are making could not be processed. Please ensure that your original image is of a supported file type (jpg, png, tiff, webp) and that your image request is provided in the correct syntax. Refer to the documentation for additional guidance on forming image requests.'
            };
        }
    }

    /**
     * Decodes the base64-encoded image request path associated with default
     * image requests. Provides error handling for invalid or undefined path values.
     * @param {Object} event - The proxied request object.
     */
    decodeRequest(event) {
        const path = event["path"];
        if (path !== undefined) {
            const splitPath = path.split("/");
            const encoded = splitPath[splitPath.length - 1];
            const toBuffer = Buffer.from(encoded, 'base64');
            try {
                return JSON.parse(toBuffer.toString('ascii'));
            } catch (e) {
                throw ({
                    status: 400,
                    code: 'DecodeRequest::CannotDecodeRequest',
                    message: 'The image request you provided could not be decoded. Please check that your request is base64 encoded properly and refer to the documentation for additional guidance.'
                });
            }
        } else {
            throw ({
                status: 400,
                code: 'DecodeRequest::CannotReadPath',
                message: 'The URL path you provided could not be read. Please ensure that it is properly formed according to the solution documentation.'
            });
        }
    }

    /**
     * Returns a formatted image source bucket whitelist as specified in the 
     * SOURCE_BUCKETS environment variable of the image handler Lambda
     * function. Provides error handling for missing/invalid values.
     */
    getAllowedSourceBuckets() {
        const sourceBuckets = process.env.SOURCE_BUCKETS;
        if (sourceBuckets === undefined) {
            throw ({
                status: 400,
                code: 'GetAllowedSourceBuckets::NoSourceBuckets',
                message: 'The SOURCE_BUCKETS variable could not be read. Please check that it is not empty and contains at least one source bucket, or multiple buckets separated by commas. Spaces can be provided between commas and bucket names, these will be automatically parsed out when decoding.'
            });
        } else {
            const formatted = sourceBuckets.replace(/\s+/g, '');
            const buckets = formatted.split(',');
            return buckets;
        }
    }
}

// Exports
module.exports = ImageRequest;