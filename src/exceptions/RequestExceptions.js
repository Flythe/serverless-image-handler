class RequestTypeException extends Error {
    constructor (message) {
        super()
        this.status = 400,
        this.code = 'Request::RequestTypeError',
        this.message = 'The type of request you are making could not be processed. Please ensure that your original image is of a supported file type (jpg, png, tiff, webp) and that your image request is provided in the correct syntax. Refer to the documentation for additional guidance on forming image requests.'
    }
}

class EmptyException extends Error {
    constructor (status, code, message) {
        super()
        this.status = status,
        this.code = code,
        this.message = message
    }
}

class NotFoundException extends Error {
    constructor (code, message) {
        super()
        this.status = 404,
        this.code = code,
        this.message = message
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

class NoSecurityHash extends Error {
    constructor (message) {
        super()
        this.status = 403,
        this.code = 'Request::NoSecurityHash',
        this.message = 'The SECURITY_KEY variable is set but no hash was provided.'
    }
}

class HashException extends Error {
    constructor (message) {
        super()
        this.status = 403,
        this.code = 'Request::HashException',
        this.message = 'Invalid hash.'
    }
}

module.exports.RequestTypeException = RequestTypeException
module.exports.EmptyException = EmptyException
module.exports.NotFoundException = NotFoundException
module.exports.CannotAccessBucketException = CannotAccessBucketException
module.exports.NoSourceBucketException = NoSourceBucketException
module.exports.NoSecurityHash = NoSecurityHash
module.exports.HashException = HashException