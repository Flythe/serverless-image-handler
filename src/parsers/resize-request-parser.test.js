let btoa = require('btoa')

const ResizeExceptions = require('../exceptions/ResizeExceptions')

const resizeParser = require('./resize-request-parser')

let resizeParserObj

beforeEach(() => {
    resizeParserObj = new resizeParser()
    process.env = {}
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
        
        expect(resizeParserObj.isAllowedResize(edits)).toEqual(expectedResult)
    })
    test('002/disallowedResizeRequest', () => {
        process.env.ALLOWED_SIZES = '400x400'

        const edits = {
            resize: {
                width: 300,
                height: 300
            }
        }

        expect(() => {
            resizeParserObj.isAllowedResize(edits)
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
        
        expect(resizeParserObj.checkResize(edits)).toEqual(edits)
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

        expect(resizeParserObj.checkResize(edits)).toEqual(edits)
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

        expect(() => {
            resizeParserObj.checkResize(edits)
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

        expect(resizeParserObj.checkResize(edits)).toEqual(expectedResult)
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
        
        expect(resizeParserObj.checkResize(edits)).toEqual(expectedResult)
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
        
        expect(resizeParserObj.checkResize(edits)).toEqual(expectedResult)
    })
    test('007/noDefaultSet', () => { 
        process.env.DEFAULT_TO_FIRST_SIZE = 'No'
        process.env.ALLOWED_SIZES = '100x100,200x200,1400x1400'

        const edits = {}

        expect(() => {
            resizeParserObj.checkResize(edits)
        }).toThrow(ResizeExceptions.ResizeNoDefaultException)
    })
})

// ----------------------------------------------------------------------------
// sizesRestricted()
// ----------------------------------------------------------------------------
describe('sizesRestricted()', () => {
    test('001/getRestriction', () => {
        process.env.ALLOWED_SIZES = '100x100'

        expect(resizeParserObj.sizesRestricted()).toBe(true)
    })
})

// ----------------------------------------------------------------------------
// getAllowedSizes()
// ----------------------------------------------------------------------------

describe('getAllowedSizes()', () => {
    test('001/noSizesDefined', () => {
        process.env.ALLOWED_SIZES = '100x100, 200x200'

        const expectedResult = ['100x100', '200x200']

        expect(resizeParserObj.getAllowedSizes()).toEqual(expectedResult)
    })
    test('002/noSizesDefined', () => {
        expect(() => {
            resizeParserObj.getAllowedSizes()
        }).toThrow(ResizeExceptions.ResizeNoSizesAllowedException)
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

        expect(resizeParserObj.resizeInRequest(request)).toBe(true)
    })
    test('002/noResizeInRequest', () => {
        const request = {}

        expect(resizeParserObj.resizeInRequest(request)).toBe(false)
    })
    test('003/emptyResizeInRequest', () => {
        const request = {
            resize: {}
        }

        expect(resizeParserObj.resizeInRequest(request)).toBe(false)
    })
})

// ----------------------------------------------------------------------------
// addSizeToRequest()
// ----------------------------------------------------------------------------
describe('addSizeToRequest()', () => {
    beforeEach(() => {
        process.env.ALLOWED_SIZES = '100x100'
    })

    test('001/defaultSizeDefined', () => {
        process.env.DEFAULT_TO_FIRST_SIZE = 'Yes'

        const request = {}
        const expectedResult = {
            resize: {
                width: 100,
                height: 100
            }
        }

        expect(resizeParserObj.addSizeToRequest(request)).toEqual(expectedResult)
    })
    test('002/noDefaultSizeDefined', () => {
        const request = {}

        expect(() => {
            resizeParserObj.addSizeToRequest(request)
        }).toThrow(ResizeExceptions.ResizeNoDefaultException)
    })
})