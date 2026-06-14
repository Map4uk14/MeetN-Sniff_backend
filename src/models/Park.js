const mongoose = require('mongoose');

const { normalizeStringList, slugify } = require('../utils/strings');
const { toJSONTransform } = require('../utils/mongoose');

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true, maxlength: 160 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, trim: true, maxlength: 20 },
    country: { type: String, trim: true, maxlength: 80, default: 'Germany' },
  },
  { _id: false },
);

const locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          if (!Array.isArray(value) || value.length !== 2) {
            return false;
          }

          // GeoJSON uses [longitude, latitude]; this order matters for 2dsphere indexes.
          const [longitude, latitude] = value;
          return longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
        },
        message: 'Coordinates must be [longitude, latitude]',
      },
    },
  },
  { _id: false },
);

const rulesSchema = new mongoose.Schema(
  {
    leashRequired: { type: Boolean, default: false },
    fenced: { type: Boolean, default: false },
    dogWasteBags: { type: Boolean, default: false },
  },
  { _id: false },
);

const ratingSummarySchema = new mongoose.Schema(
  {
    averageRating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const externalSourceSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['openstreetmap'], required: true },
    elementType: { type: String, enum: ['node', 'way', 'relation'], required: true },
    elementId: { type: String, required: true },
    url: { type: String, required: true },
    attribution: { type: String, required: true },
    licenseUrl: { type: String, required: true },
  },
  { _id: false },
);

const parkSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, maxlength: 1000 },
    address: { type: addressSchema, required: true },
    location: { type: locationSchema, required: true },
    tags: { type: [String], set: normalizeStringList, default: [] },
    amenities: { type: [String], set: normalizeStringList, default: [] },
    rules: { type: rulesSchema, default: () => ({}) },
    photos: { type: [String], default: [] },
    ratingSummary: { type: ratingSummarySchema, default: () => ({}) },
    externalSource: { type: externalSourceSchema },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

parkSchema.set('toJSON', {
  virtuals: true,
  transform: toJSONTransform,
});

parkSchema.index({ location: '2dsphere' });
parkSchema.index({ name: 'text', description: 'text', tags: 'text', amenities: 'text' });
parkSchema.index(
  { 'externalSource.provider': 1, 'externalSource.elementType': 1, 'externalSource.elementId': 1 },
  { unique: true, sparse: true },
);

parkSchema.pre('validate', function setSlug() {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
});

module.exports = mongoose.model('Park', parkSchema);
