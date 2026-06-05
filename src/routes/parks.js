const express = require('express');
const mongoose = require('mongoose');

const { requireAuth } = require('../middleware/auth');
const { createHttpError } = require('../middleware/errorHandler');
const Park = require('../models/Park');
const Review = require('../models/Review');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, parseList, pick } = require('../utils/request');

const router = express.Router();

const writableParkFields = ['name', 'slug', 'description', 'address', 'location', 'tags', 'amenities', 'rules', 'photos'];
const writableReviewFields = ['rating', 'title', 'body', 'visitDate', 'tags', 'dogFriendliness', 'cleanliness', 'crowdLevel'];

function idOrSlugQuery(idOrSlug) {
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    return { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] };
  }

  return { slug: idOrSlug };
}

async function findParkOrThrow(idOrSlug) {
  const park = await Park.findOne(idOrSlugQuery(idOrSlug));

  if (!park) {
    throw createHttpError(404, 'Park not found', 'PARK_NOT_FOUND');
  }

  return park;
}

function assertCanEditPark(req, park) {
  const isCreator = park.createdBy?.toString() === req.user._id.toString();

  if (req.user.role !== 'admin' && !isCreator) {
    throw createHttpError(403, 'Only the creator or an admin can edit this park', 'PARK_FORBIDDEN');
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query);
    const query = {};
    const tags = parseList(req.query.tags);
    const amenities = parseList(req.query.amenities);
    const hasGeoSearch = req.query.lat !== undefined || req.query.lng !== undefined;

    if (req.query.q) {
      query.$text = { $search: String(req.query.q) };
    }

    if (tags.length > 0) {
      query.tags = { $all: tags };
    }

    if (amenities.length > 0) {
      query.amenities = { $all: amenities };
    }

    if (hasGeoSearch) {
      const latitude = Number(req.query.lat);
      const longitude = Number(req.query.lng);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw createHttpError(400, 'lat and lng must be valid numbers', 'INVALID_COORDINATES');
      }

      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: Number(req.query.maxDistance) || 5000,
        },
      };
    }

    let findQuery = Park.find(query).populate('createdBy', 'username displayName avatarUrl');

    if (req.query.q) {
      findQuery = findQuery.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    } else if (!hasGeoSearch) {
      findQuery = findQuery.sort({ createdAt: -1 });
    }

    const parksPromise = findQuery.skip(skip).limit(limit);
    const totalPromise = hasGeoSearch ? Promise.resolve(null) : Park.countDocuments(query);
    const [parks, total] = await Promise.all([parksPromise, totalPromise]);

    res.json({
      data: parks,
      pagination: {
        page,
        limit,
        total,
        pages: total === null ? null : Math.ceil(total / limit),
      },
    });
  }),
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const park = await Park.create({
      ...pick(req.body, writableParkFields),
      createdBy: req.user._id,
    });

    res.status(201).json({ park });
  }),
);

router.get(
  '/:parkId/reviews',
  asyncHandler(async (req, res) => {
    const park = await findParkOrThrow(req.params.parkId);
    const { page, limit, skip } = getPagination(req.query);
    const [reviews, total] = await Promise.all([
      Review.find({ park: park._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'username displayName avatarUrl dog.name dog.breed dog.size'),
      Review.countDocuments({ park: park._id }),
    ]);

    res.json({
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }),
);

router.post(
  '/:parkId/reviews',
  requireAuth,
  asyncHandler(async (req, res) => {
    const park = await findParkOrThrow(req.params.parkId);
    const review = await Review.create({
      ...pick(req.body, writableReviewFields),
      park: park._id,
      user: req.user._id,
    });

    await Review.recalculateParkRating(park._id);
    await review.populate('user', 'username displayName avatarUrl dog.name dog.breed dog.size');

    res.status(201).json({ review });
  }),
);

router.get(
  '/:idOrSlug',
  asyncHandler(async (req, res) => {
    const park = await Park.findOne(idOrSlugQuery(req.params.idOrSlug)).populate('createdBy', 'username displayName avatarUrl');

    if (!park) {
      throw createHttpError(404, 'Park not found', 'PARK_NOT_FOUND');
    }

    res.json({ park });
  }),
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const park = await findParkOrThrow(req.params.id);
    assertCanEditPark(req, park);

    Object.assign(park, pick(req.body, writableParkFields));
    await park.save();

    res.json({ park });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const park = await findParkOrThrow(req.params.id);
    assertCanEditPark(req, park);

    await Review.deleteMany({ park: park._id });
    await park.deleteOne();

    res.status(204).send();
  }),
);

module.exports = router;
