const errs = require('restify-errors');

module.exports = function CommonPromiseException() {
  function pRejectHandler(next, reason) {
    if (typeof reason == 'string') {
      this.charSet('utf-8');
      this.send(new errs.BadRequestError(reason));
      return next(false);
    } else if (typeof reason == 'object' && typeof reason.message == 'string' && reason.code == 404) {
      this.charSet('utf-8');
      this.send(new errs.NotFoundError(reason.message));
      return next(false);
    } else if (typeof reason == 'object' && typeof reason.message == 'string' && reason.code === 403) {
      this.charSet('utf-8');
      this.send(new errs.ForbiddenError(reason.message));
      return next(false);
    } else {
      return next(new errs.InternalServerError(reason));
    }
  }
  return function pRejectCommonHandler(req, res, next) {

    res.commonReject = (nextRoute) => pRejectHandler.bind(res, nextRoute);
    return next();
  };
};