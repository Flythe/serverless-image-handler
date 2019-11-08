/**
 * Checks whether an externally set variable exists and is not empty.
 * @param {String} key - Key to the variable.
 */
exports.externalVariableIsSet = (key, value) => {
    if (process.env[key] !== "" && process.env[key] !== undefined) {
        if (value !== undefined) {
            return process.env[key] === value
        }

        return true
    }

    return false
}