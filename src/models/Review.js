const mongoose = require('mongoose');

const { normalizeStringList } = require('../utils/strings');
const { toJSONTransform } = require('../utils/mongoose');

const reviewSchema = new mongoose.Schema(
  {
    park: { type: mongoose.Schema.Types.ObjectId, ref: 'Park', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120 },
    body: { type: String, trim: true, maxlength: 2000 },
    visitDate: { type: Date },
    tags: { type: [String], set: normalizeStringList, default: [] },
    dogFriendliness: { type: Number, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5 },
    crowdLevel: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true },
);

reviewSchema.set('toJSON', {
  virtuals: true,
  transform: toJSONTransform,
});

reviewSchema.index({ park: 1, user: 1 }, { unique: true });

reviewSchema.statics.recalculateParkRating = async function recalculateParkRating(parkId) {
  const Park = mongoose.model('Park');
  const normalizedParkId = new mongoose.Types.ObjectId(parkId);
  const [summary] = await this.aggregate([
    { $match: { park: normalizedParkId } },
    {
      $group: {
        _id: '$park',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const ratingSummary = summary
    ? {
        averageRating: Math.round(summary.averageRating * 10) / 10,
        reviewCount: summary.reviewCount,
      }
    : { averageRating: 0, reviewCount: 0 };

  return Park.findByIdAndUpdate(parkId, { ratingSummary }, { returnDocument: 'after' });
};

module.exports = mongoose.model('Review', reviewSchema);
