class RequestTypeException extends Error {
    constructor (message) {
        super()
        this.status = 400,
        this.code = 'Request::RequestTypeError',
        this.message = 'The type of request you are making could not be processed. Please ensure that your original image is of a supported file type (jpg, png, tiff, webp) and that your image request is provided in the correct syntax. Refer to the documentation for additional guidance on forming image requests.'
    }
}

class FileNotFoundException extends Error {
    constructor (message) {
        super()
        this.status = 404,
        this.code = 'Not Found',
        this.message = ''
    }
}

class CannotAccessBucketException extends Error {
    constructor (message) {
        super()
        this.status = 403,
        this.code = 'Request::CannotAccessBucket',
        this.message = 'The bucket you specified could not be accessed. Please check that the bucket is specified in your SOURCE_BUCKETS.'
    }
}

class NoSourceBucketException extends Error {
    constructor (message) {
        super()
        this.status = 400,
        this.code = 'Request::NoSourceBuckets',
        this.message = 'The SOURCE_BUCKETS variable could not be read. Please check that it is not empty and contains at least one source bucket, or multiple buckets separated by commas. Spaces can be provided between commas and bucket names, these will be automatically parsed out when decoding.'
    }
}

module.exports.RequestTypeException = RequestTypeException
module.exports.FileNotFoundException = FileNotFoundException
module.exports.CannotAccessBucketException = CannotAccessBucketException
module.exports.NoSourceBucketException = NoSourceBucketException