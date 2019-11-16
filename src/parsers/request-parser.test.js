const crypto = require('crypto')

const RequestExceptions = require('../exceptions/RequestExceptions')
const DecodeExceptions = require('../exceptions/DecodeExceptions')

const requestParser = require('./request-parser')

getPath = (edits, hash) => {
    const defaultObj = {
        bucket: 'validBucket',
        key: 'validKey',
        edits: edits
    }

    if (hash !== undefined) {
        defaultObj.hash = hash
    }

    const jsonStr = JSON.stringify(defaultObj)

    return btoa(jsonStr)
}

beforeEach(() => {
    process.env = {}
})

// ----------------------------------------------------------------------------
// getHash()
// ----------------------------------------------------------------------------
describe('getHash()', () => {
    test('001/hashInQueryParameter', () => {
        event = {
            multiValueQueryStringParameters: {
                hash: ['hash']
            }
        }

        expect(requestParser.getHash(event)).toBe('hash')
    })
    test('002/noHashInQueryParameter', () => {
        event = {
            multiValueQueryStringParameters: {}
        }

        expect(requestParser.getHash(event)).toBe(false)
    })
})

// ----------------------------------------------------------------------------
// isValid()
// ----------------------------------------------------------------------------
describe('isValid()', () => {
    test('001/defaultRequestType', () => {
        const event = { path: getPath({ grayscale: true }) }
        
        expect(requestParser.isValid(event)).toBe(true)
    })
    test('002/faviconRequest', () => {
        const event = { path: '/favicon.ico' }

        expect(() => {
            requestParser.isValid(event)
        }).toThrow(new RequestExceptions.NotFoundException('Not Found', ''))
    })
    test('003/elseCondition', () => { 
        const event = { path: 'invalidPath' }
        
        expect(() => {
            requestParser.isValid(event)
        }).toThrow(RequestExceptions.RequestTypeException)
    })
})

// ----------------------------------------------------------------------------
// decodeRequest()
// ----------------------------------------------------------------------------
describe('decodeRequest()', () => {
    test('001/validRequestPathSpecified', () => {
        const event = { path: getPath({}) }
        const expectedResult = {
            hash: false,
            request: {
                bucket: 'validBucket',
                key: 'validKey',
                edits: {}
            }
        }

        expect(requestParser.decodeRequest(event)).toEqual(expectedResult)
    })
    test('002/invalidRequestPathSpecified', () => {
        const event = {
            path: '/someNonBase64EncodedContentHere'
        }
        
        expect(() => {
            requestParser.decodeRequest(event)
        }).toThrow(DecodeExceptions.DecodeRequestException)
    })
    test('003/noPathSpecified', () => {
        const event = {}
        
        expect(() => {
            requestParser.decodeRequest(event)
        }).toThrow(DecodeExceptions.CannotReadBucketPathException)
    })
})

// ----------------------------------------------------------------------------
// isSecure()
// ----------------------------------------------------------------------------
describe('isSecure()', () => {
    test('001/noSecurity', () => {
        process.env = {}
        
        expect(requestParser.isSecure({})).toBe(true)
    })
    test('002/withSecurity/noHash', () => { 
        process.env.SECURITY_KEY = 'validSecurityKey'

        expect(() => {
            requestParser.isSecure({}, false)
        }).toThrow(RequestExceptions.NoSecurityHash)
    })
    test('003/withSecurity/withHash', () => { 
        process.env.SECURITY_KEY = 'validSecurityKey'

        const edits = { flip: true }
        const editsString = JSON.stringify(edits)
        const imageKey = 'validKey'
        const source = process.env.SECURITY_KEY + imageKey + editsString
        const hash = crypto.createHash('md5').update(source).digest('hex')

        const request = {
            key: imageKey,
            edits: edits
        }
        
        expect(requestParser.isSecure(request, hash)).toBe(true)
    })
    test('003/withSecurity/withInvalidHash', () => { 
        process.env.SECURITY_KEY = 'validSecurityKey'

        const edits = { flip: true }
        const editsString = JSON.stringify(edits)
        const imageKey = 'validKey'
        const source = 'invalidSecurityKey' + imageKey + editsString
        const hash = crypto.createHash('md5').update(source).digest('hex')

        const request = {
            key: imageKey,
            edits: edits
        }

        expect(() => {
            requestParser.isSecure(request, hash)
        }).toThrow(RequestExceptions.HashException)
    })
})