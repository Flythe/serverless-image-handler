let btoa = require('btoa')
const S3 = require('aws-sdk')
const sharp = require('sharp')

const RequestExceptions = require('./exceptions/RequestExceptions')

const ImageRequest = require('./image-request')

const blueRect = {
    create: {
        width: 60,
        height: 40,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 0.5 }
    }
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
// constructor()
// ----------------------------------------------------------------------------
describe('constructor()', () => {
    test('001/errorCase', () => {
        const event = { path: 'invalidPath' }

        expect(() => {
            new ImageRequest(event)
        }).toThrow(RequestExceptions.RequestTypeException)
    })
})

// ----------------------------------------------------------------------------
// setup()
// ----------------------------------------------------------------------------
describe('setup()', () => {
    beforeEach(() => {
        process.env.SOURCE_BUCKETS = 'validBucket, validBucket2'

        mockS3GetObject.mockImplementation((params) => {
            return {
                promise() { return Promise.resolve({ Body: blueRect }) }
            }
        })
    })

    test('001/imageRequest/noRequiredFormat', done => {
        const expectedResult = {
          requestFormat: 'raw',
          edits: { grayscale: true },
          originalImage: blueRect
        }
        const event = { path: getPath(expectedResult.edits) }

        const imageRequest = new ImageRequest(event)
        
        imageRequest.setup().then(() => {
            expect(imageRequest.edits).toMatchObject(expectedResult.edits)
            expect(imageRequest.originalImage).toMatchObject(expectedResult.originalImage)
            expect(imageRequest.originalImageObj.finalFormat).toBe(expectedResult.requestFormat)

            done()
        })
    })
    test('002/imageRequest/withRequiredFormat', done => {
        const expectedResult = {
            requestFormat: 'png',
            edits: {
                resize: {
                    height: 200,
                    width: 200
                }
            },
            originalImage: blueRect
        }
        const event = {
            path: getPath(expectedResult.edits),
            outputFormat: 'png'
        }
        
        const imageRequest = new ImageRequest(event)
        
        imageRequest.setup().then(() => {
            expect(imageRequest.edits).toMatchObject(expectedResult.edits)
            expect(imageRequest.originalImage).toMatchObject(expectedResult.originalImage)
            expect(imageRequest.originalImageObj.finalFormat).toBe(expectedResult.requestFormat)

            done()
        })
    })
})

// ----------------------------------------------------------------------------
// getOriginalImage()
// ----------------------------------------------------------------------------
describe('getOriginalImage()', () => {
    beforeEach(() => {
        process.env.SOURCE_BUCKETS = 'validBucket'
    })

    test('001/imageExists', () => {
        mockS3GetObject.mockImplementation((params) => {
            return {
                promise() { return Promise.resolve(blueRect) }
            }
        })

        const event = { path: getPath({}) }
        imageRequest = new ImageRequest(event)

        expect(imageRequest.getOriginalImage('validBucket', 'validKey'))
            .resolves
            .toMatchObject(blueRect)
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

        const event = { path: getPath({}) }
        imageRequest = new ImageRequest(event)

        expect(imageRequest.getOriginalImage('invalidBucket', 'invalidKey'))
            .rejects
            .toThrow(Error)
    })
})

// ----------------------------------------------------------------------------
// getOutputFormat()
// ----------------------------------------------------------------------------
describe('getOutputFormat()', () => {
    beforeEach(() => {
        process.env.SOURCE_BUCKETS = 'validBucket'
    })

    const acceptHeader = {
        Accept: "application/xml;q=0.9,image/webp,*/*;q=0.8,application/signed-exchange;v=b3"
    }

    test('001/AcceptsHeaderIncludesWebP', () => {
        process.env.AUTO_WEBP = 'Yes'

        const event = { path: getPath({}) }
        imageRequest = new ImageRequest(event)

        expect(imageRequest.getOutputFormat(acceptHeader)).toBe('webp')
    })
    test('002/AcceptsHeaderDoesNotIncludeWebP', () => {
        process.env.AUTO_WEBP = 'Yes'

        const event = { path: getPath({}) }
        imageRequest = new ImageRequest(event)

        const headers = {
            Accept: "application/xml;q=0.9,*/*;q=0.8,application/signed-exchange;v=b3"
        }

        expect(imageRequest.getOutputFormat(headers)).toBe(false)
    })
    test('003/AutoWebPDisabled', () => {
        process.env.AUTO_WEBP = 'No'

        const event = { path: getPath({}) }
        imageRequest = new ImageRequest(event)

        expect(imageRequest.getOutputFormat(acceptHeader)).toBe(false)
    })
    test('004/AutoWebPUnset', () => {
        const event = { path: getPath({}) }
        imageRequest = new ImageRequest(event)

        expect(imageRequest.getOutputFormat(acceptHeader)).toBe(false)
    })
    test('005/SetOutputFormat', () => {
        const outputFormat = 'png'

        const event = { path: getPath({}) }
        imageRequest = new ImageRequest(event)

        expect(imageRequest.getOutputFormat(acceptHeader, outputFormat)).toBe('png')
    })
    test('006/OverruleAutoWebP', () => {
        process.env.AUTO_WEBP = 'Yes'

        const outputFormat = 'png'

        const event = { path: getPath({}) }
        imageRequest = new ImageRequest(event)

        expect(imageRequest.getOutputFormat(acceptHeader, outputFormat)).toBe('png')
    })
})

// ----------------------------------------------------------------------------
// getImageFormat()
// ----------------------------------------------------------------------------
describe('getImageFormat()', () => {
    beforeEach(() => {
        process.env.SOURCE_BUCKETS = 'validBucket'
    })

    test('001/rawImage', () => {
        const event = { path: getPath({}) }
        imageRequest = new ImageRequest(event)

        const expectedResult = 'raw'

        expect(imageRequest.getImageFormat(blueRect))
            .resolves
            .toBe(expectedResult)
    })
})