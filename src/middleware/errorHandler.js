function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  const payload = {
    message: err.message || 'Internal server error'
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (status >= 500) {
    console.error('[request.error]', {
      requestId: req.requestId || null,
      method: req.method,
      path: req.originalUrl,
      statusCode: status,
      code: err.code || null,
      message: err.message,
      stack: err.stack
    });
  }

  if (!res.headersSent) {
    res.status(status).json(payload);
  }
}

module.exports = errorHandler;
