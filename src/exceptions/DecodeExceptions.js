class DecodeRequestException extends Error {
    constructor (message) {
        super()
        this.status = 400,
        this.code = 'DecodeRequest::CannotDecodeRequest',
        this.message = 'The image request you provided could not be decoded. Please check that your request is base64 encoded properly and refer to the documentation for additional guidance.'
    }
}

module.exports.DecodeRequestException = DecodeRequestException