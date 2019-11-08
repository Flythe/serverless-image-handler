const crypto = require('crypto')

exports.verifyHash = (imageKey, imageEdits, hash) => {
    const editsString = JSON.stringify(imageEdits)
    
    const source = process.env.SECURITY_KEY + imageKey + editsString
    const parsed = crypto.createHash('md5').update(source).digest('hex')
    
    return parsed === hash
}