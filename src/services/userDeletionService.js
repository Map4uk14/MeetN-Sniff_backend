const Park = require('../models/Park');
const Review = require('../models/Review');
const User = require('../models/User');

async function deleteUserAndOwnedData(user) {
  const ownedParks = await Park.find({ createdBy: user._id }).select('_id');
  const ownedParkIds = ownedParks.map((park) => park._id);
  // Only reviews on surviving parks need a rating update after the user is gone.
  const authoredReviews = await Review.find({
    user: user._id,
    park: { $nin: ownedParkIds },
  }).select('park');
  const affectedParkIds = [...new Set(authoredReviews.map((review) => review.park.toString()))];

  // Remove dependent reviews first so no references remain when parks and user are deleted.
  await Review.deleteMany({
    $or: [{ user: user._id }, { park: { $in: ownedParkIds } }],
  });

  if (ownedParkIds.length > 0) {
    await Promise.all([
      User.updateMany(
        { favoriteParks: { $in: ownedParkIds } },
        { $pull: { favoriteParks: { $in: ownedParkIds } } },
      ),
      Park.deleteMany({ _id: { $in: ownedParkIds } }),
    ]);
  }

  await user.deleteOne();
  await Promise.all(affectedParkIds.map((parkId) => Review.recalculateParkRating(parkId)));

  return {
    deletedParkCount: ownedParkIds.length,
    affectedParkCount: affectedParkIds.length,
  };
}

module.exports = {
  deleteUserAndOwnedData,
};
