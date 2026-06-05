const express = require('express');
const jwt = require('jsonwebtoken');

const { getJwtConfig } = require('../config/security');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { createHttpError } = require('../middleware/errorHandler');
const { authLimiter, loginLimiter, registerLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.use(authLimiter);

function signToken(user) {
  const jwtConfig = getJwtConfig();

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    },
    jwtConfig.secret,
    {
      algorithm: jwtConfig.algorithm,
      audience: jwtConfig.audience,
      expiresIn: jwtConfig.expiresIn,
      issuer: jwtConfig.issuer,
    },
  );
}

router.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const { username, email, password, displayName, dog } = req.body;

    if (!password || password.length < 8) {
      throw createHttpError(400, 'Password must be at least 8 characters', 'INVALID_PASSWORD');
    }

    const user = new User({ username, email, displayName, dog });
    await user.setPassword(password);
    await user.save();

    res.status(201).json({
      token: signToken(user),
      user: user.toPrivateJSON(),
    });
  }),
);

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createHttpError(400, 'Email and password are required', 'MISSING_CREDENTIALS');
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');

    if (!user || !(await user.verifyPassword(password))) {
      throw createHttpError(401, 'Email or password is incorrect', 'INVALID_CREDENTIALS');
    }

    res.json({
      token: signToken(user),
      user: user.toPrivateJSON(),
    });
  }),
);

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toPrivateJSON() });
});

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });

    res.status(204).send();
  }),
);

module.exports = router;
