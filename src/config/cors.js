const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function parseOrigins(value) {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildCorsOptions() {
  const configuredOrigins = parseOrigins(
    process.env.CORS_ORIGINS || process.env.CLIENT_ORIGIN || process.env.FRONTEND_ORIGIN,
  );
  const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins;

  return {
    credentials: true,
    optionsSuccessStatus: 204,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      const error = new Error(`Origin ${origin} is not allowed by CORS`);
      error.statusCode = 403;
      error.appCode = 'CORS_ORIGIN_DENIED';
      callback(error);
    },
  };
}

module.exports = {
  buildCorsOptions,
  defaultOrigins,
  parseOrigins,
};
