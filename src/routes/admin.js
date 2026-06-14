const express = require('express');

const { requireAdmin, requireAuth } = require('../middleware/auth');
const { createHttpError } = require('../middleware/errorHandler');
const Park = require('../models/Park');
const Review = require('../models/Review');
const User = require('../models/User');
const { deleteUserAndOwnedData } = require('../services/userDeletionService');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination } = require('../utils/request');

const router = express.Router();
const allowedRoles = ['user', 'admin'];

router.use(requireAuth, requireAdmin);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query);
    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    res.json({
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

router.patch(
  '/users/:id/role',
  asyncHandler(async (req, res) => {
    const { role } = req.body;

    if (!allowedRoles.includes(role)) {
      throw createHttpError(400, 'Role must be user or admin', 'INVALID_ROLE');
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { returnDocument: 'after', runValidators: true });

    if (!user) {
      throw createHttpError(404, 'User not found', 'USER_NOT_FOUND');
    }

    res.json({ user });
  }),
);

router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user._id.toString()) {
      throw createHttpError(400, 'Admins cannot delete their own account', 'CANNOT_DELETE_SELF');
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      throw createHttpError(404, 'User not found', 'USER_NOT_FOUND');
    }

    await deleteUserAndOwnedData(user);

    res.status(204).send();
  }),
);

router.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query);
    const [reviews, total] = await Promise.all([
      Review.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'username displayName avatarUrl')
        .populate('park', 'name slug address ratingSummary'),
      Review.countDocuments(),
    ]);

    res.json({
      data: reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

router.delete(
  '/reviews/:id',
  asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);

    if (!review) {
      throw createHttpError(404, 'Review not found', 'REVIEW_NOT_FOUND');
    }

    const parkId = review.park;
    await review.deleteOne();
    await Review.recalculateParkRating(parkId);

    res.status(204).send();
  }),
);

router.get(
  '/parks',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query);
    const [parks, total] = await Promise.all([
      Park.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('createdBy', 'username displayName avatarUrl'),
      Park.countDocuments(),
    ]);

    res.json({
      data: parks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

router.delete(
  '/parks/:id',
  asyncHandler(async (req, res) => {
    const park = await Park.findById(req.params.id);

    if (!park) {
      throw createHttpError(404, 'Park not found', 'PARK_NOT_FOUND');
    }

    await Promise.all([
      Review.deleteMany({ park: park._id }),
      User.updateMany({ favoriteParks: park._id }, { $pull: { favoriteParks: park._id } }),
      park.deleteOne(),
    ]);

    res.status(204).send();
  }),
);

module.exports = router;
