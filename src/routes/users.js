const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { createHttpError } = require('../middleware/errorHandler');
const Park = require('../models/Park');
const User = require('../models/User');
const { deleteUserAndOwnedData } = require('../services/userDeletionService');
const asyncHandler = require('../utils/asyncHandler');
const { pick } = require('../utils/request');

const router = express.Router();

const writableProfileFields = ['displayName', 'avatarUrl', 'bio', 'dog'];

function toFavoriteParkResponse(park) {
  return {
    id: park.id,
    name: park.name,
  };
}

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toPrivateJSON() });
});

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    Object.assign(req.user, pick(req.body, writableProfileFields));
    await req.user.save();

    res.json({ user: req.user.toPrivateJSON() });
  }),
);

router.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    await deleteUserAndOwnedData(req.user);
    res.status(204).send();
  }),
);

router.get(
  '/me/favorites',
  requireAuth,
  asyncHandler(async (req, res) => {
    await req.user.populate('favoriteParks', 'name slug address location tags amenities ratingSummary photos');
    res.json({ data: req.user.favoriteParks });
  }),
);

router.post(
  '/me/favorites/:parkId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const park = await Park.findById(req.params.parkId);

    if (!park) {
      throw createHttpError(404, 'Park not found', 'PARK_NOT_FOUND');
    }

    const alreadyFavorite = req.user.favoriteParks.some((parkId) => parkId.toString() === park._id.toString());

    if (!alreadyFavorite) {
      req.user.favoriteParks.push(park._id);
      await req.user.save();
    }

    res.status(201).json({ park: toFavoriteParkResponse(park) });
  }),
);

router.delete(
  '/me/favorites/:parkId',
  requireAuth,
  asyncHandler(async (req, res) => {
    req.user.favoriteParks = req.user.favoriteParks.filter((parkId) => parkId.toString() !== req.params.parkId);
    await req.user.save();

    res.status(204).send();
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).populate('favoriteParks', 'name slug address ratingSummary tags amenities');

    if (!user) {
      throw createHttpError(404, 'User not found', 'USER_NOT_FOUND');
    }

    res.json({ user: user.toPublicJSON() });
  }),
);

module.exports = router;
