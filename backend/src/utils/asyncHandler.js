/**
 * Express 4 does not catch rejected promises from async route handlers — an
 * unhandled rejection takes down the whole Node process. Wrapping every
 * handler forwards errors to the central error handler in app.js instead.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** Wrap every function exported by a controller module. */
function wrapAll(controller) {
  const wrapped = {};
  for (const [name, fn] of Object.entries(controller)) {
    wrapped[name] = typeof fn === "function" ? asyncHandler(fn) : fn;
  }
  return wrapped;
}

/** Throw this from a handler to send a specific status + message. */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = { asyncHandler, wrapAll, HttpError };
