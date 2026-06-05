function createHttpError(statusCode, message, appCode = 'REQUEST_ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.appCode = appCode;
  return error;
}

function notFound(req, _res, next) {
  next(createHttpError(404, `Route ${req.method} ${req.originalUrl} not found`, 'NOT_FOUND'));
}

function formatValidationError(error) {
  return Object.values(error.errors).map((fieldError) => ({
    field: fieldError.path,
    message: fieldError.message,
  }));
}

function errorHandler(error, _req, res, _next) {
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request data failed validation',
        details: formatValidationError(error),
      },
    });
    return;
  }

  if (error.name === 'CastError') {
    res.status(400).json({
      error: {
        code: 'INVALID_ID',
        message: 'Invalid resource identifier',
      },
    });
    return;
  }

  if (error.code === 11000) {
    res.status(409).json({
      error: {
        code: 'DUPLICATE_KEY',
        message: 'A resource with that value already exists',
      },
    });
    return;
  }

  const statusCode = error.statusCode || 500;
  const isServerError = statusCode >= 500;

  res.status(statusCode).json({
    error: {
      code: error.appCode || (isServerError ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
      message: isServerError ? 'Internal server error' : error.message,
    },
  });
}

module.exports = {
  createHttpError,
  errorHandler,
  notFound,
};
