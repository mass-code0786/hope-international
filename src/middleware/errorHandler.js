function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;
  const payload = {
    message: err.message || 'Internal server error'
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json(payload);
}

module.exports = errorHandler;
