let btoa = require('btoa')
const S3 = require('aws-sdk')

const ResizeExceptions = require('./exceptions/ResizeExceptions')
const RequestExceptions = require('./exceptions/RequestExceptions')
const DecodeExceptions = require('./exceptions/DecodeExceptions')

const ImageRequest = require('./image-request')

const defaultHeaders = {
    ContentType: 'image/jpg',
    Expires: 'never',
    CacheControl: 'max-age=86400',
    LastModified: '2019-11-06T21:36:00.000z'
}

const defaultResponseHeaders = {
    ContentType: 'image/jpg',
    Expires: 'never',
    CacheControl: 'max-age=86400',
    LastModified: 'Wed, 06 Nov 2019 21:36:00 GMT'
}

const acceptHeader = {
    Accept: "application/xml;q=0.9,image/webp,*/*;q=0.8,application/signed-exchange;v=b3"
}

// Set up S3 getObject mocking
const mockS3GetObject = jest.fn()

jest.mock('aws-sdk', () => {
    return {
        S3: jest.fn(() => ({
            getObject: mockS3GetObject
        }))
    }
})

beforeEach(() => {
    jest.resetModules()
    mockS3GetObject.mockReset()
    process.env = {}
})

getPath = (edits) => {
    const defaultObj = {
        bucket: 'validBucket',
        key: 'validKey',
        edits: edits
    }

    const jsonStr = JSON.stringify(defaultObj)

    return btoa(jsonStr)
}

// ----------------------------------------------------------------------------
// setup()
// ----------------------------------------------------------------------------
describe('setup()', () => {
    test('001/defaultImageRequest', () => {
        mockS3GetObject.mockImplementation((params) => {
            return {
                promise() { return Promise.resolve({ Body: Buffer.from('testValue'), ...defaultHeaders }) }
            }
        })

        process.env.SOURCE_BUCKETS = 'validBucket, validBucket2'

        const expectedResult = {
          ...defaultResponseHeaders,
          bucket: 'validBucket',
          key: 'validKey',
          edits: { grayscale: true },
          originalImage: Buffer.from('testValue')
        }
        const event = { path: getPath(expectedResult.edits) }

        const imageRequest = new ImageRequest()
        
        expect(imageRequest.setup(event))
            .resolves
            .toMatchObject(expectedResult)
    })
    test('002/resizeImageRequest', () => {
        mockS3GetObject.mockImplementation((params) => {
            return {
                promise() { return Promise.resolve({ Body: Buffer.from('testValue'), ...defaultHeaders }) }
            }
        })

        process.env.SOURCE_BUCKETS = 'validBucket, validBucket2'

        const expectedResult = {
            ...defaultResponseHeaders,
            bucket: 'validBucket',
            key: 'validKey',
            edits: {
                resize: {
                    height: 200,
                    width: 200
                }
            },
            originalImage: Buffer.from('testValue')
        }
        const event = { path: getPath(expectedResult.edits) }
        
        const imageRequest = new ImageRequest()
        
        expect(imageRequest.setup(event))
            .resolves
            .toMatchObject(expectedResult)
    })
    test('003/webPFormatRequest', () => {
        mockS3GetObject.mockImplementation((params) => {
            return {
                promise() { return Promise.resolve({ Body: Buffer.from('testValue'), ...defaultHeaders }) }
            }
        })

        process.env.SOURCE_BUCKETS = 'validBucket, validBucket2'
        process.env.AUTO_WEBP = 'Yes'

        const alteredHeaders = {
            ...defaultResponseHeaders
        }

        alteredHeaders.ContentType = 'image/webp'

        const expectedResult = {
            ...alteredHeaders,
            bucket: 'validBucket',
            key: 'validKey',
            outputFormat: 'webp',
            edits: {
                resize: {
                    height: 200,
                    width: 200
                }
            },
            originalImage: Buffer.from('testValue')
        }
        const event = {
            path: getPath(expectedResult.edits),
            headers: acceptHeader
        }

        const imageRequest = new ImageRequest()
        
        expect(imageRequest.setup(event))
            .resolves
            .toMatchObject(expectedResult)
    })
    test('004/errorCase', () => {
        const event = { path: 'invalidPath' }

        const imageRequest = new ImageRequest()

        expect(imageRequest.setup(event))
            .rejects
            .toThrow(RequestExceptions.RequestTypeException)
    })
})

// ----------------------------------------------------------------------------
// getOriginalImage()
// ----------------------------------------------------------------------------
describe('getOriginalImage()', () => {
    test('001/imageExists', () => {
        mockS3GetObject.mockImplementation((params) => {
            return {
                promise() { return Promise.resolve({ Body: Buffer.from('testValue') }) }
            }
        })

        const imageRequest = new ImageRequest()
        expect(imageRequest.getOriginalImage('validBucket', 'validKey'))
            .resolves
            .toMatchObject(Buffer.from('testValue'))
    })
    test('002/imageDoesNotExist', () => {
        mockS3GetObject.mockImplementation((params) => {
            return {
                promise() { return Promise.reject({
                    code: 500,
                    message: 'SimulatedInvalidParameterException'
                }) }
            }
        })

        const imageRequest = new ImageRequest()
        
        expect(imageRequest.getOriginalImage('invalidBucket', 'invalidKey'))
            .rejects
            .toThrow(Error)
    })
})

// ----------------------------------------------------------------------------
// parseImageBucket()
// ----------------------------------------------------------------------------
describe('parseImageBucket()', () => {
    test('001/defaultRequestType/bucketSpecifiedInRequest/allowed', () => {
        const event = { path: getPath({}) }
        
        process.env.SOURCE_BUCKETS = 'validBucket, validBucket2'

        const imageRequest = new ImageRequest()

        expect(imageRequest.parseImageBucket(event)).toBe('validBucket')
    })
    test('002/defaultRequestType/bucketSpecifiedInRequest/notAllowed', () => {
        const event = { path: getPath({}) }
        
        process.env.SOURCE_BUCKETS = 'invalidBucket, invalidBucket2'

        const imageRequest = new ImageRequest()
      
        expect(() => {
            imageRequest.parseImageBucket(event)
        }).toThrow(RequestExceptions.CannotAccessBucketException)
    })
    test('003/defaultRequestType/bucketNotSpecifiedInRequest', () => {
        const pathObj = { key: 'validKey' }
        const event = { path: btoa(JSON.stringify(pathObj)) }

        process.env.SOURCE_BUCKETS = 'validBucket, validBucket2'

        const imageRequest = new ImageRequest()

        expect(imageRequest.parseImageBucket(event)).toBe('validBucket')
    })
})

// ----------------------------------------------------------------------------
// isValidRequest()
// ----------------------------------------------------------------------------
describe('isValidRequest()', () => {
    test('001/defaultRequestType', () => {
        const event = { path: getPath({ grayscale: true }) }

        const imageRequest = new ImageRequest()
        
        expect(imageRequest.isValidRequest(event)).toBe('Default')
    })
    test('002/faviconRequest', () => {
        const event = { path: '/favicon.ico' }

        const imageRequest = new ImageRequest()

        expect(() => {
            imageRequest.isValidRequest(event)
        }).toThrow(RequestExceptions.FileNotFoundException)
    })
    test('003/elseCondition', () => { 
        const event = { path: 'invalidPath' }

        const imageRequest = new ImageRequest()
        
        expect(() => {
            imageRequest.isValidRequest(event)
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
            bucket: 'validBucket',
            key: 'validKey',
            edits: {}
        }

        const imageRequest = new ImageRequest()

        expect(imageRequest.decodeRequest(event)).toEqual(expectedResult)
    })
    test('002/invalidRequestPathSpecified', () => {
        const event = {
            path: '/someNonBase64EncodedContentHere'
        }

        const imageRequest = new ImageRequest()
        
        expect(() => {
            imageRequest.decodeRequest(event)
        }).toThrow(DecodeExceptions.DecodeRequestException)
    })
    test('003/noPathSpecified', () => {
        const event = {}

        const imageRequest = new ImageRequest()
        
        expect(() => {
            imageRequest.decodeRequest(event)
        }).toThrow(DecodeExceptions.CannotReadBucketPathException)
    })
})

// ----------------------------------------------------------------------------
// getAllowedSourceBuckets()
// ----------------------------------------------------------------------------
describe('getAllowedSourceBuckets()', () => {
    test('001/sourceBucketsSpecified', () => {
        process.env.SOURCE_BUCKETS = 'validBucket, validBucket2'

        const imageRequest = new ImageRequest()
        
        const expectedResult = ['validBucket', 'validBucket2']
        
        expect(imageRequest.getAllowedSourceBuckets()).toEqual(expectedResult)
    })
    test('002/noSourceBucketsSpecified', () => { 
        process.env = {}

        const imageRequest = new ImageRequest()
        
        expect(() => {
            imageRequest.getAllowedSourceBuckets()
        }).toThrow(RequestExceptions.NoSourceBucketException)
    })
})

// ----------------------------------------------------------------------------
// isAllowedResize()
// ----------------------------------------------------------------------------
describe('isAllowedResize()', () => {
    test('001/allowedResizeRequest', () => {
        process.env.ALLOWED_SIZES = '300x300'

        const edits = {
            resize: {
                width: 300,
                height: 300
            }
        }
        const expectedResult = edits

        const imageRequest = new ImageRequest()
        
        expect(imageRequest.isAllowedResize(edits)).toEqual(expectedResult)
    })
    test('002/disallowedResizeRequest', () => {
        process.env.ALLOWED_SIZES = '400x400'

        const edits = {
            resize: {
                width: 300,
                height: 300
            }
        }

        const imageRequest = new ImageRequest()

        expect(() => {
            imageRequest.isAllowedResize(edits)
        }).toThrow(ResizeExceptions.ResizeSizeNotAllowedException)
    })
})

// ----------------------------------------------------------------------------
// checkResize()
// ----------------------------------------------------------------------------
describe('checkResize()', () => {
    test('001/noRestrictions', () => {
        process.env.DEFAULT_TO_FIRST_SIZE = 'No'
        process.env.ALLOWED_SIZES = ''

        const edits = {
            resize: {
                width: 1400,
                height: 1400
            }
        }

        const imageRequest = new ImageRequest()
        
        expect(imageRequest.checkResize(edits)).toEqual(edits)
    })
    test('002/validResize', () => {
        process.env.DEFAULT_TO_FIRST_SIZE = 'No'
        process.env.ALLOWED_SIZES = '100x100,200x200,1400x1400'

        const edits = {
            resize: {
                width: 1400,
                height: 1400
            }
        }

        const imageRequest = new ImageRequest()
        expect(imageRequest.checkResize(edits)).toEqual(edits)
    })
    test('003/invalidResize', () => {
        process.env.DEFAULT_TO_FIRST_SIZE = 'No'
        process.env.ALLOWED_SIZES = '100x100,200x200,1400x1400'

        const edits = {
            resize: {
                width: 2000,
                height: 2000
            }
        }

        const imageRequest = new ImageRequest()

        expect(() => {
            imageRequest.checkResize(edits)
        }).toThrow(ResizeExceptions.ResizeSizeNotAllowedException)
    })
    test('004/heightIsZero', () => {
        process.env.DEFAULT_TO_FIRST_SIZE = 'No'
        process.env.ALLOWED_SIZES = '100x0,200x200,1400x1400'

        const edits = {
            resize: {
                width: 100,
                height: 0
            }
        }
        const expectedResult = {
            resize: {
                width: 100
            }
        }

        const imageRequest = new ImageRequest()
        expect(imageRequest.checkResize(edits)).toEqual(expectedResult)
    })
    test('005/widthIsZero', () => {
        process.env.DEFAULT_TO_FIRST_SIZE = 'No'
        process.env.ALLOWED_SIZES = '0x100,200x200,1400x1400'

        const edits = {
            resize: {
                width: 0,
                height: 100
            }
        }
        const expectedResult = {
            resize: {
                height: 100
            }
        }

        const imageRequest = new ImageRequest()
        
        expect(imageRequest.checkResize(edits)).toEqual(expectedResult)
    })
    test('006/setToDefault', () => {
        process.env.DEFAULT_TO_FIRST_SIZE = 'Yes'
        process.env.ALLOWED_SIZES = '100x100,200x200,1400x1400'

        const edits = {}
        const expectedResult = {
            resize: {
                width: 100,
                height: 100
            }
        }

        const imageRequest = new ImageRequest()
        
        expect(imageRequest.checkResize(edits)).toEqual(expectedResult)
    })
    test('007/noDefaultSet', () => { 
        process.env.DEFAULT_TO_FIRST_SIZE = 'No'
        process.env.ALLOWED_SIZES = '100x100,200x200,1400x1400'

        const edits = {}

        const imageRequest = new ImageRequest()
       
        expect(() => {
            imageRequest.checkResize(edits)
        }).toThrow(ResizeExceptions.ResizeNoDefaultException)
    })
})

// ----------------------------------------------------------------------------
// sizesRestricted()
// ----------------------------------------------------------------------------
describe('sizesRestricted()', () => {
    test('001/getRestriction', () => {
        process.env.ALLOWED_SIZES = '100x100'

        const imageRequest = new ImageRequest()

        expect(imageRequest.sizesRestricted()).toBe(true)
    })
})

// ----------------------------------------------------------------------------
// resizeInRequest()
// ----------------------------------------------------------------------------
describe('resizeInRequest()', () => {
    test('001/hasResizeInRequest', () => {
        const request = {
            resize: {
                width: 100,
                height: 100
            }
        }

        const imageRequest = new ImageRequest()
        expect(imageRequest.resizeInRequest(request)).toBe(true)
    })
    test('002/noResizeInRequest', () => {
        const request = {}

        const imageRequest = new ImageRequest()
        expect(imageRequest.resizeInRequest(request)).toBe(false)
    })
    test('003/emptyResizeInRequest', () => {
        const request = {
            resize: {}
        }

        const imageRequest = new ImageRequest()
        expect(imageRequest.resizeInRequest(request)).toBe(false)
    })
})

// ----------------------------------------------------------------------------
// addSizeToRequest()
// ----------------------------------------------------------------------------
describe('addSizeToRequest()', () => {
    test('001/defaultSizeDefined', () => {
        process.env.DEFAULT_TO_FIRST_SIZE = 'Yes'
        process.env.ALLOWED_SIZES = '100x100'

        const request = {}
        const expectedResult = {
            resize: {
                width: 100,
                height: 100
            }
        }

        const imageRequest = new ImageRequest()
        expect(imageRequest.addSizeToRequest(request)).toEqual(expectedResult)
    })
    test('002/noDefaultSizeDefined', () => {
        process.env.ALLOWED_SIZES = '100x100'

        const request = {}

        const imageRequest = new ImageRequest()

        expect(() => {
            imageRequest.addSizeToRequest(request)
        }).toThrow(ResizeExceptions.ResizeNoDefaultException)
    })
})

// ----------------------------------------------------------------------------
// getOutputFormat()
// ----------------------------------------------------------------------------
describe('getOutputFormat()', () => {
    test('001/AcceptsHeaderIncludesWebP', () => {
        process.env.AUTO_WEBP = 'Yes'

        const event = {
            path: getPath({}),
            headers: acceptHeader
        }

        const imageRequest = new ImageRequest()
        expect(imageRequest.getOutputFormat(event)).toBe('webp')
    })
    test('002/AcceptsHeaderDoesNotIncludeWebP', () => {
        process.env.AUTO_WEBP = 'Yes'

        const event = {
            path: getPath({}),
            headers: {
                Accept: "application/xml;q=0.9,*/*;q=0.8,application/signed-exchange;v=b3"
            }
        }

        const imageRequest = new ImageRequest()
        expect(imageRequest.getOutputFormat(event)).toBe(null)
    })
    test('003/AutoWebPDisabled', () => {
        process.env.AUTO_WEBP = 'No'

        const event = {
            path: getPath({}),
            headers: acceptHeader
        }

        const imageRequest = new ImageRequest()
        expect(imageRequest.getOutputFormat(event)).toBe(null)
    })
    test('004/AutoWebPUnset', () => {
        const event = {
            path: getPath({}),
            headers: acceptHeader
        }

        const imageRequest = new ImageRequest()
        expect(imageRequest.getOutputFormat(event)).toBe(null)
    })
    test('005/SetOutputFormat', () => {
        const event = {
            path: getPath({}),
            headers: acceptHeader,
            outputFormat: 'png'
        }

        const imageRequest = new ImageRequest()
        expect(imageRequest.getOutputFormat(event)).toBe('png')
    })
    test('006/OverruleAutoWebP', () => {
        process.env.AUTO_WEBP = 'No'

        const event = {
            path: getPath({}),
            headers: acceptHeader,
            outputFormat: 'png'
        }

        const imageRequest = new ImageRequest()
        expect(imageRequest.getOutputFormat(event)).toBe('png')
    })
})