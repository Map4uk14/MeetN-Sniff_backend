const express = require('express');
const mongoose = require('mongoose');

const { requireAuth } = require('../middleware/auth');
const { createHttpError } = require('../middleware/errorHandler');
const Park = require('../models/Park');
const Review = require('../models/Review');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, parseList, pick } = require('../utils/request');
const { getForecastByCoordinates } = require('../services/openMeteoService');
const { getCurrentWeatherByCoordinates, validateCoordinates } = require('../services/weatherService');
const { sendFormatted } = require('../utils/responseFormat');

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

function readNearbyRadius(query) {
  const radius = Number(query.radius || query.maxDistance || process.env.DEFAULT_NEARBY_RADIUS_METERS || 5000);

  if (!Number.isFinite(radius) || radius <= 0) {
    throw createHttpError(400, 'radius must be a positive number', 'INVALID_RADIUS');
  }

  return radius;
}

function validateParkLocationPayload(location) {
  if (!location) {
    throw createHttpError(400, 'location is required and must be a GeoJSON Point', 'LOCATION_REQUIRED');
  }

  if (location.type !== 'Point') {
    throw createHttpError(400, 'location.type must be Point', 'INVALID_LOCATION_TYPE');
  }

  if (!Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
    throw createHttpError(400, 'location.coordinates must be [longitude, latitude]', 'INVALID_LOCATION_COORDINATES');
  }

  // GeoJSON and MongoDB store points as [longitude, latitude].
  const [longitude, latitude] = location.coordinates;

  if (typeof longitude !== 'number' || typeof latitude !== 'number' || !Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw createHttpError(400, 'location.coordinates must contain two numbers', 'INVALID_LOCATION_COORDINATES');
  }

  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    throw createHttpError(400, 'location.coordinates are outside the valid range', 'INVALID_LOCATION_COORDINATES');
  }
}

function getParkCoordinates(park) {
  const coordinates = park.location?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    throw createHttpError(400, 'Park does not have valid coordinates', 'PARK_COORDINATES_MISSING');
  }

  // Weather APIs expect latitude/longitude, so convert from the stored GeoJSON order.
  const [longitude, latitude] = coordinates;
  return validateCoordinates(latitude, longitude);
}

async function updateParkFromRequest(req, park) {
  const updates = pick(req.body, writableParkFields);

  if (Object.prototype.hasOwnProperty.call(updates, 'location')) {
    validateParkLocationPayload(updates.location);
  }

  Object.assign(park, updates);
  await park.save();

  return park;
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
      const { latitude, longitude } = validateCoordinates(req.query.lat, req.query.lng);

      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: readNearbyRadius(req.query),
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
    // $near already sorts by distance and cannot be counted with countDocuments.
    const totalPromise = hasGeoSearch ? Promise.resolve(null) : Park.countDocuments(query);
    const [parks, total] = await Promise.all([parksPromise, totalPromise]);

    sendFormatted(req, res, 'parks', {
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

router.get(
  '/nearby',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query);
    const { latitude, longitude } = validateCoordinates(req.query.lat, req.query.lng);
    const radius = readNearbyRadius(req.query);

    const query = {
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: radius,
        },
      },
    };

    const parks = await Park.find(query)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'username displayName avatarUrl');

    sendFormatted(req, res, 'parks', {
      data: parks,
      search: {
        latitude,
        longitude,
        radius,
      },
      pagination: {
        page,
        limit,
        total: null,
        pages: null,
      },
    });
  }),
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = pick(req.body, writableParkFields);
    validateParkLocationPayload(payload.location);

    const park = await Park.create({
      ...payload,
      createdBy: req.user._id,
    });

    res.status(201).json({ park });
  }),
);

router.get(
  '/:id/weather',
  asyncHandler(async (req, res) => {
    const park = await findParkOrThrow(req.params.id);
    const { latitude, longitude } = getParkCoordinates(park);
    const weather = await getCurrentWeatherByCoordinates(latitude, longitude);

    res.json({
      park: {
        id: park.id,
        name: park.name,
      },
      weather,
    });
  }),
);

router.get(
  '/:id/forecast',
  asyncHandler(async (req, res) => {
    const park = await findParkOrThrow(req.params.id);
    const { latitude, longitude } = getParkCoordinates(park);
    const forecast = await getForecastByCoordinates(latitude, longitude);

    res.json({
      park: {
        id: park.id,
        name: park.name,
      },
      forecast,
    });
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

    sendFormatted(req, res, 'park', { park });
  }),
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const park = await findParkOrThrow(req.params.id);
    assertCanEditPark(req, park);

    await updateParkFromRequest(req, park);

    res.json({ park });
  }),
);

router.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const park = await findParkOrThrow(req.params.id);
    assertCanEditPark(req, park);

    await updateParkFromRequest(req, park);

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
