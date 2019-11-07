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
            originalImage: blueRect
        }
        
        sharp(request.originalImage)
            .grayscale()
            .flip()
            .toBuffer().then((expectedResult) => {
                const imageHandler = new ImageHandler()
                expect(imageHandler.process(request))
                    .resolves
                    .toMatch(expectedResult.toString('base64'))
                done()
            })
    })
    test('002/withToFormat', done => {
        const request = {
            outputFormat: 'png',
            originalImage: blueRect
        }

        sharp(request.originalImage)
            .toFormat(request.outputFormat)
            .toBuffer().then((expectedResult) => {
                const imageHandler = new ImageHandler()
                expect(imageHandler.process(request))
                    .resolves
                    .toMatch(expectedResult.toString('base64'))
                done()
            })
    })
    test('003/noEditsSpecified', done => {
        const request = {
            originalImage: blueRect
        }

        sharp(request.originalImage)
            .toBuffer().then((expectedResult) => {
                const imageHandler = new ImageHandler()
                expect(imageHandler.process(request))
                    .resolves
                    .toMatch(expectedResult.toString('base64'))
                done()
            })
    })
})

// ----------------------------------------------------------------------------
// applyEdits()
// ----------------------------------------------------------------------------
describe('applyEdits()', () => {
    test('001/standardEdits', () => {
        const originalImage = Buffer.from('sampleImageContent')
        const edits = {
            grayscale: true,
            flip: true
        }
        const expectedResult = {
            options: {
                greyscale: true,
                flip: true
            }
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

        const imageHandler = new ImageHandler()
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