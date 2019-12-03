const RequestExceptions = require('../exceptions/RequestExceptions')
const DecodeExceptions = require('../exceptions/DecodeExceptions')

const utils = require('../helpers/utils')
const security = require('../helpers/security')

/**
 * Retrieves the hash from the query string parameters if present
 * @param {Object} event - The Lambda request body
 */
exports.getHash = (event) => {
    const queryParams = event['multiValueQueryStringParameters']
    
    if (queryParams === undefined || queryParams === null || !Object.keys(queryParams).includes('hash')) {
        return false
    }

    const hash = queryParams.hash[0]

    return hash
}

/**
 * Decodes the base64-encoded image request path. Provides error handling 
 * for invalid or undefined path values.
 * @param {Object} event - The Lambda request body.
 */
exports.decodeRequest = (event, requestType) => {
    let path = event['path']

    if (path !== undefined) {
        let pathStr = ''

        if (path.startsWith('/')) {
            path = path.substr(1)
        }

        if (requestType === 'base64') {
            pathStr = Buffer.from(path, 'base64').toString('ascii')
        } else if (requestType === 'json') {
            pathStr = decodeURIComponent(path)
        }

        const hash = this.getHash(event)

        try {
            const decodedPath = JSON.parse(pathStr)

            return {
                hash: hash,
                request: decodedPath
            }
        } catch (e) {
            throw new DecodeExceptions.DecodeRequestException()
        }
    }

    throw new DecodeExceptions.CannotReadBucketPathException()
}

/**
 * Determines whether a valid path is passed otherwise throws an error.
 * @param {Object} event - Lambda request body.
*/
exports.isValid = (event) => {
    const path = event['path']

    const matchDefault = new RegExp(/^(\/?)([0-9a-zA-Z+\/]{4})*(([0-9a-zA-Z+\/]{2}==)|([0-9a-zA-Z+\/]{3}=))?$/)
    const matchJson = new RegExp(/(\{.*\:)?\{.*\:.*\}(\})?/g)
    const matchFavicon = new RegExp(/^(\/?)favicon\.ico$/)
    
    if (matchDefault.test(path)) {
        return 'base64'
    } else if (matchJson.test(decodeURIComponent(path))) {
        return 'json'
    } else if (matchFavicon.test(path)) {
        // Always return 404 Not Found exception when request for
        // favicon comes in.
        throw new RequestExceptions.NotFoundException('Not Found', '')
    }

    throw new RequestExceptions.RequestTypeException()
}

exports.isSecure = (request, hash) => {
    const needsCheck = utils.externalVariableIsSet('SECURITY_KEY')
    
    if (!needsCheck) {
        return true
    }

    if (hash === false) {
        throw new RequestExceptions.NoSecurityHash()
    }

    const isValid = security.verifyHash(request.key, request.edits, hash)

    if (!isValid) {
        throw new RequestExceptions.HashException()
    }

    return true
}