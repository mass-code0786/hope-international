const { ZodError } = require('zod');
const { ApiError } = require('../utils/ApiError');

function firstValidationMessage(error) {
  const firstIssue = error.issues?.[0]?.message;
  if (firstIssue) {
    return firstIssue;
  }

  const flattened = error.flatten();
  if (flattened.formErrors?.[0]) {
    return flattened.formErrors[0];
  }

  const fieldMessages = Object.values(flattened.fieldErrors || {}).find(
    (messages) => Array.isArray(messages) && messages[0]
  );

  return fieldMessages?.[0] || 'Validation failed';
}

function validate(schema) {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body ?? {},
        query: req.query ?? {},
        params: req.params ?? {}
      });

      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.flatten();
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[validate] request validation failed', {
            method: req.method,
            path: req.originalUrl,
            message: firstValidationMessage(error)
          });
        }
        return next(new ApiError(400, firstValidationMessage(error), details));
      }
      return next(error);
    }
  };
}

module.exports = validate;
