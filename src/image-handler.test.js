const S3 = require('aws-sdk')
const sharp = require('sharp')
const ImageHandler = require('./image-handler')

const blueRect = {
    create: {
        width: 60,
        height: 40,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 0.5 }
    }
}

const greenRect = {
    create: {
        width: 40,
        height: 40,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 0.5 }
    }
}

const defaultImageObj = {
    Body: blueRect,
    finalFormat: 'png',
    CacheControl: 'max-age=86400',
    LastModified: '2019-11-06T21:36:00.000z',
    Expires: '2019-11-06T21:36:00.000z'
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
})

// ----------------------------------------------------------------------------
// process()
// ----------------------------------------------------------------------------
describe('process()', () => {
    test('001/default', done => {
        const request = {
            edits: {
                grayscale: true,
                flip: true
            },
            originalImageObj: defaultImageObj,
            originalImage: blueRect
        }
        
        sharp(request.originalImage)
            .grayscale()
            .flip()
            .toBuffer().then((expectedResult) => {
                const imageHandler = new ImageHandler(request)
                
                expect(imageHandler.process())
                    .resolves
                    .toMatchObject({ body: expectedResult.toString('base64') })
                done()
            })
    })
    test('002/withToFormat', done => {
        const request = {
            requiredFormat: 'jpg',
            originalImageObj: defaultImageObj,
            originalImage: blueRect
        }
        
        sharp(request.originalImage)
            .toFormat(request.requiredFormat)
            .toBuffer().then((expectedResult) => {
                const imageHandler = new ImageHandler(request)
                expect(imageHandler.process())
                    .resolves
                    .toMatchObject({ body: expectedResult.toString('base64') })
                done()
            })
    })
    test('003/noEditsSpecified', done => {
        const request = {
            originalImageObj: defaultImageObj,
            originalImage: blueRect
        }

        sharp(request.originalImage)
            .toBuffer().then((expectedResult) => {
                const imageHandler = new ImageHandler(request)
                expect(imageHandler.process())
                    .resolves
                    .toMatchObject({ body: expectedResult.toString('base64') })
                done()
            })
    })
})

// ----------------------------------------------------------------------------
// applyEdits()
// ----------------------------------------------------------------------------
describe('applyEdits()', () => {
    test('001/standardEdits', () => {
        const originalImage = blueRect
        const edits = {
            flip: true,
            greyscale: true
        }
        const expectedResult = {
            options: edits
        }

        const imageHandler = new ImageHandler()
        return expect(imageHandler.applyEdits(originalImage, edits))
            .resolves
            .toMatchObject(expectedResult)
    })
    test('002/overlay', () => {
        mockS3GetObject.mockImplementation((params) => {
            return {
                promise() { return Promise.resolve({ Body: greenRect }) }
            }
        })

        const originalImage = blueRect
        const edits = {
            composite: {
                bucket: 'aaa',
                key: 'bbb'
            }
        }
        const expectedResult = {
            options: {
                composite: [{
                    input: {
                        buffer: sharp(greenRect).toBuffer()
                    }
                }]
            }
        }

        const imageHandler = new ImageHandler({})
        return expect(imageHandler.applyEdits(originalImage, edits))
            .resolves
            .toMatchObject(expectedResult)
    })
    test('003/overlayResize', () => {
        mockS3GetObject.mockImplementation((params) => {
            return {
                promise() { return Promise.resolve({ Body: greenRect }) }
            }
        })

        const originalImage = blueRect
        const edits = {
            resize: {
                height: 300,
                width: 300
            },
            composite: {
                bucket: 'aaa',
                key: 'bbb'
            }
        }
        const expectedResult = {
            options: {
                composite: [{
                    input: {
                        buffer: sharp(greenRect).resize(300, 300).toBuffer()
                    }
                }]
            }
        }

        const imageHandler = new ImageHandler()
        return expect(imageHandler.applyEdits(originalImage, edits))
            .resolves
            .toMatchObject(expectedResult)
    })
})

// ----------------------------------------------------------------------------
// getOverlayImage()
// ----------------------------------------------------------------------------
describe('getOverlayImage', () => {
    test('001/validParameters', () => {
        mockS3GetObject.mockImplementation((params) => {
            return {
                promise() { return Promise.resolve({ Body: 'SampleImageContent' }) }
            }
        })

        const imageHandler = new ImageHandler()
        
        return expect(imageHandler.getOverlayImage('validBucket', 'validKey'))
            .resolves
            .toStrictEqual('SampleImageContent')
    })
    test('002/imageDoesNotExist', () => {
        const mockError = {
            'code': 500,
            'status': 500,
            'message': 'SimulatedInvalidParameterException'
        }

        mockS3GetObject.mockImplementation((params) => {
            return {
                promise() { return Promise.reject(mockError) }
            }
        })

        const imageHandler = new ImageHandler()
        
        return expect(imageHandler.getOverlayImage('invalidBucket', 'invalidKey'))
            .rejects
            .toEqual(mockError)
    })
})

// ----------------------------------------------------------------------------
// forwardHTTPHeaders()
// ----------------------------------------------------------------------------
describe('forwardHTTPHeaders', () => {
    test('001/headers/defined', () => {
        const imageHandler = new ImageHandler()
        
        const input = {
            finalFormat: 'png',
            CacheControl: 'max-age=86400',
            LastModified: '2019-11-06T21:36:00.000z',
            Expires: '2019-11-06T21:36:00.000z'
        }

        const expectedResult = {
            ContentType: 'image/png',
            CacheControl: 'max-age=86400',
            LastModified: 'Wed, 06 Nov 2019 21:36:00 GMT',
            Expires: 'Wed, 06 Nov 2019 21:36:00 GMT'
        }

        return expect(imageHandler.forwardHTTPHeaders(input))
            .toEqual(expectedResult)
    })
    test('002/headers/undefined', () => {
        const imageHandler = new ImageHandler()

        const input = {
            finalFormat: 'png',
            CacheControl: 'max-age=86400'
        }

        const expectedResult = {
            ContentType: 'image/png'
        }
        
        return expect(imageHandler.forwardHTTPHeaders(input))
            .toMatchObject(expectedResult)
    })
    test('003/finalFormat/jpeg', () => {
        const imageHandler = new ImageHandler()

        const input = {
            finalFormat: 'jpeg',
            CacheControl: 'max-age=86400'
        }

        const expectedResult = {
            ContentType: 'image/jpeg'
        }
        
        return expect(imageHandler.forwardHTTPHeaders(input))
            .toMatchObject(expectedResult)
    })
    test('004/finalFormat/jpg', () => {
        const imageHandler = new ImageHandler()

        const input = {
            finalFormat: 'jpg',
            CacheControl: 'max-age=86400'
        }

        const expectedResult = {
            ContentType: 'image/jpeg'
        }
        
        return expect(imageHandler.forwardHTTPHeaders(input))
            .toMatchObject(expectedResult)
    })
    test('005/finalFormat/webp', () => {
        const imageHandler = new ImageHandler()

        const input = {
            finalFormat: 'webp',
            CacheControl: 'max-age=86400'
        }

        const expectedResult = {
            ContentType: 'image/webp'
        }
        
        return expect(imageHandler.forwardHTTPHeaders(input))
            .toMatchObject(expectedResult)
    })
    test('006/finalFormat/jpeg', () => {
        const imageHandler = new ImageHandler()

        const input = {
            finalFormat: 'gif',
            CacheControl: 'max-age=86400'
        }

        const expectedResult = {
            ContentType: 'image/gif'
        }
        
        return expect(imageHandler.forwardHTTPHeaders(input))
            .toMatchObject(expectedResult)
    })
})