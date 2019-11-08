const utils = require('./utils')

beforeEach(() => {
    process.env = {}
})

// ----------------------------------------------------------------------------
// externalVariableIsSet()
// ----------------------------------------------------------------------------
describe('externalVariableIsSet()', () => {
    test('001/isSet', () => {
        process.env.TEST = 'Yes'

        expect(utils.externalVariableIsSet('TEST')).toBe(true)
    })
    test('002/notSet', () => {
        expect(utils.externalVariableIsSet('TEST')).toBe(false)
    })
    test('003/isSet/hasValue', () => {
        process.env.TEST = 'Yes'

        expect(utils.externalVariableIsSet('TEST', 'Yes')).toBe(true)
    })
    test('004/isSet/doesNotHaveValue', () => {
        process.env.TEST = 'No'

        expect(utils.externalVariableIsSet('TEST', 'Yes')).toBe(false)
    })
})