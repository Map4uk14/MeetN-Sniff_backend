const rateLimit = require('express-rate-limit');

function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createLimiter({ code, limit, message, windowMs }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code,
        message,
      },
    },
  });
}

const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: readPositiveInteger(process.env.API_RATE_LIMIT, 300),
  code: 'RATE_LIMITED',
  message: 'Too many requests. Please slow down and try again later.',
});

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: readPositiveInteger(process.env.AUTH_RATE_LIMIT, 30),
  code: 'AUTH_RATE_LIMITED',
  message: 'Too many authentication requests. Please try again later.',
});

const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: readPositiveInteger(process.env.LOGIN_RATE_LIMIT, 5),
  code: 'LOGIN_RATE_LIMITED',
  message: 'Too many login attempts. Please try again later.',
});

const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: readPositiveInteger(process.env.REGISTER_RATE_LIMIT, 10),
  code: 'REGISTER_RATE_LIMITED',
  message: 'Too many registration attempts. Please try again later.',
});

module.exports = {
  apiLimiter,
  authLimiter,
  loginLimiter,
  registerLimiter,
};
