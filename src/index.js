const ImageRequest = require('./image-request')
const ImageHandler = require('./image-handler')
const utils = require('./helpers/utils')

exports.handler = async (event) => {
    try {
        const imageRequest = new ImageRequest(event)
        await imageRequest.setup(event)

        const imageHandler = new ImageHandler(imageRequest)
        const processedRequest = await imageHandler.process()

        const response = {
            'statusCode': 200,
            'headers' : getResponseHeaders(processedRequest),
            'body': processedRequest.body,
            'isBase64Encoded': true
        }
        return response
    } catch (err) {
        // Uncomment for debugging
        console.log(err)
        const response = {
            'statusCode': err.status,
            'headers' : getResponseHeaders(null, true),
            'body': JSON.stringify(err),
            'isBase64Encoded': false
        }
        return response
    }
}

/**
 * Generates the appropriate set of response headers based on a success 
 * or error condition.
 * @param {boolean} isError - Has an error been thrown? 
 */
const getResponseHeaders = (request, isError) => {
    const corsEnabled = utils.externalVariableIsSet('CORS_ENABLED', 'Yes')
    const headers = {
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': true,
    }

    if (corsEnabled) {
        headers['Access-Control-Allow-Origin'] = process.env.CORS_ORIGIN
    }

    if (!isError) {
        headerKeys = {
            Expires: 'Expires',
            ContentType: 'Content-Type',
            LastModified: 'Last-Modified',
            CacheControl: 'Cache-Control'
        }

        for (const [key, value] of Object.entries(headerKeys)) {
            if (request.headers[key] !== undefined) {
                headers[value] = request.headers[key]
            }
        }
    } else {
        headers['Content-Type'] = 'application/json'
    }
    
    return headers
}