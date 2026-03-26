function success(res, payload = {}) {
  const {
    data = null,
    pagination = null,
    summary = null,
    message = 'OK',
    statusCode = 200
  } = payload;

  return res.status(statusCode).json({
    data,
    pagination,
    summary,
    message
  });
}

module.exports = {
  success
};
