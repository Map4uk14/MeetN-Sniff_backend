const express = require('express');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { createHttpError } = require('../middleware/errorHandler');

const router = express.Router();

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw createHttpError(500, 'JWT_SECRET is not configured', 'SERVER_CONFIG_ERROR');
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

router.post(
  '/register',
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

module.exports = router;
