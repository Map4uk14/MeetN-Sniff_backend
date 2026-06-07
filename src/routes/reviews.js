const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { createHttpError } = require('../middleware/errorHandler');
const Review = require('../models/Review');
const asyncHandler = require('../utils/asyncHandler');
const { pick } = require('../utils/request');

const router = express.Router();

const writableReviewFields = ['rating', 'title', 'body', 'visitDate', 'tags', 'dogFriendliness', 'cleanliness', 'crowdLevel'];

function assertCanEditReview(req, review) {
  const isAuthor = review.user?.toString() === req.user._id.toString();

  if (req.user.role !== 'admin' && !isAuthor) {
    throw createHttpError(403, 'Only the author or an admin can edit this review', 'REVIEW_FORBIDDEN');
  }
}

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);

    if (!review) {
      throw createHttpError(404, 'Review not found', 'REVIEW_NOT_FOUND');
    }

    assertCanEditReview(req, review);
    Object.assign(review, pick(req.body, writableReviewFields));
    await review.save();
    await Review.recalculateParkRating(review.park);
    await review.populate('user', 'username displayName avatarUrl dog.name dog.breed dog.size');

    res.json({ review });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);

    if (!review) {
      throw createHttpError(404, 'Review not found', 'REVIEW_NOT_FOUND');
    }

    assertCanEditReview(req, review);
    const parkId = review.park;
    await review.deleteOne();
    await Review.recalculateParkRating(parkId);

    res.status(204).send();
  }),
);

module.exports = router;
