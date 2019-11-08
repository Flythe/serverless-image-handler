const security = require('./security')

beforeEach(() => {
    process.env = {}
})

// ----------------------------------------------------------------------------
// verifyHash()
// ----------------------------------------------------------------------------
describe('verifyHash()', () => {
    beforeEach(() => {
        process.env.SECURITY_KEY = 'validSecurityKey'
    })

    test('001/validHash', () => {
        const hash = '66013f4e151c0974b4d196d921cfdca4'
        const imageKey = 'validKey'
        const imageEdits = { flip: true }

        expect(security.verifyHash(imageKey, imageEdits, hash)).toBe(true)
    })
    test('001/invalidHash', () => {
        const hash = '66013f4e151c0974b4d196d921cfdca4'
        const imageKey = 'invalidKey'
        const imageEdits = { flip: true }

        expect(security.verifyHash(imageKey, imageEdits, hash)).toBe(false)
    })
})