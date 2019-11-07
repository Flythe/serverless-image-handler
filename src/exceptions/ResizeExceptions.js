class ResizeSizeNotAllowedException extends Error {
  constructor (message) {
    super()
    this.status = 400,
    this.name = 'Resize::SizeNotAllowed',
    this.message = 'The size you specified is not allowed. Please check the sizes specified in ALLOWED_SIZES.'
  }
}

class ResizeNoDefaultException extends Error {
  constructor (message) {
    super()
    this.status = 400,
    this.name = 'Resize::NoDefault',
    this.message = 'No resize was specified and no default size is defined.'
  }
}

module.exports.ResizeSizeNotAllowedException = ResizeSizeNotAllowedException
module.exports.ResizeNoDefaultException = ResizeNoDefaultException