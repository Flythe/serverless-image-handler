const ResizeExceptions = require('../exceptions/ResizeExceptions')
const utils = require('../helpers/utils')

/**
 * If resizing is restricted this function checks whether the request asks for a valid resize.
 * When an image is requested without a resize specified and the DEFAULT_TO_FIRST_SIZE setting
 * is set to 'Yes' it will add the default size to the request.
 * @param {Object} edits - JSON object defining the edits that should be applied to the image.
 */
exports.checkResize = (edits) => {
    if (!this.sizesRestricted()) {
        return edits;    
    } else if (this.resizeInRequest(edits)) {
        edits = this.isAllowedResize(edits)
    } else {
        edits = this.addSizeToRequest(edits)
    }
    
    if (edits.resize.width === 0) {
        delete edits.resize.width
    } else if (edits.resize.height === 0) {
        delete edits.resize.height
    }

    return edits
}

/**
 * Checks whether the external variable ALLOWED_SIZES is set. This means that resizing
 * the image is bound to a set of allowed sizes.
 */
exports.sizesRestricted = () => {
    return utils.externalVariableIsSet('ALLOWED_SIZES')
}

/**
 * Checks whether a resize is defined in the request.
 * @param {Object} edits - JSON object defining the edits that should be applied to the image.
 */
exports.resizeInRequest = (edits) => {
    return (edits.resize !== undefined
        && edits.resize !== ""
        && (Object.keys(edits.resize).length !== 0 && edits.resize.constructor === Object))
}

exports.getAllowedSizes = () => {
    const allowedSizes = process.env.ALLOWED_SIZES

    if (allowedSizes === undefined) {
        throw new ResizeExceptions.ResizeNoSizesAllowedException()
    }

    const formatted = allowedSizes.replace(/\s+/g, '')
    const allowedSizesArr = formatted.split(',')

    return allowedSizesArr
}

/**
 * Checks whether the requested image size is allowed by the ALLOWED_SIZES config.
 * @param {Object} edits - JSON object defining the edits that should be applied to the image.
 */
exports.isAllowedResize = (edits) => {
    const allowedSizes = this.getAllowedSizes()
    const requestedSize = edits.resize.width + 'x' + edits.resize.height

    if (allowedSizes.includes(requestedSize)) {
        return edits
    }

    throw new ResizeExceptions.ResizeSizeNotAllowedException()
}

/**
 * When an image is requested without a resize specified and the DEFAULT_TO_FIRST_SIZE
 * setting is set to 'Yes' this will add the default size to the request.
 * @param {Object} edits - JSON object defining the edits that should be applied to the image.
 */
exports.addSizeToRequest = (edits) => {
    const defaultToFirstSize = utils.externalVariableIsSet('DEFAULT_TO_FIRST_SIZE', 'Yes')
    let firstSize = this.getAllowedSizes()[0]

    if (defaultToFirstSize) {
        let [defaultWidth, defaultHeight] = firstSize.split('x')
        
        edits.resize = {
            width: Number(defaultWidth),
            height: Number(defaultHeight)
        }

        return edits
    }
    
    throw new ResizeExceptions.ResizeNoDefaultException()
}