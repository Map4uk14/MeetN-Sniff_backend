const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { createHttpError } = require('./errorHandler');

function getBearerToken(req) {
  const header = req.get('authorization');

  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim();
}

async function requireAuth(req, _res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw createHttpError(401, 'Missing bearer token', 'AUTH_REQUIRED');
    }

    if (!process.env.JWT_SECRET) {
      throw createHttpError(500, 'JWT_SECRET is not configured', 'SERVER_CONFIG_ERROR');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user) {
      throw createHttpError(401, 'User for token no longer exists', 'INVALID_TOKEN');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(createHttpError(401, 'Token has expired', 'TOKEN_EXPIRED'));
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      next(createHttpError(401, 'Token is invalid', 'INVALID_TOKEN'));
      return;
    }

    next(error);
  }
}

function requireAdmin(req, _res, next) {
  if (req.user?.role === 'admin') {
    next();
    return;
  }

  next(createHttpError(403, 'Admin role required', 'ADMIN_REQUIRED'));
}

module.exports = {
  requireAdmin,
  requireAuth,
};
