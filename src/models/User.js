const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { normalizeStringList } = require('../utils/strings');
const { toJSONTransform } = require('../utils/mongoose');

const dogSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80 },
    breed: { type: String, trim: true, maxlength: 80 },
    size: { type: String, enum: ['small', 'medium', 'large', 'giant'] },
    birthYear: { type: Number, min: 1980, max: new Date().getFullYear() },
    temperament: { type: [String], set: normalizeStringList, default: [] },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
      match: [/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, underscores and dashes'],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email must be valid'],
    },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, trim: true, maxlength: 80 },
    avatarUrl: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 500 },
    dog: { type: dogSchema, default: () => ({}) },
    favoriteParks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Park' }],
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    tokenVersion: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};

userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toPrivateJSON = function toPrivateJSON() {
  const user = this.toJSON();
  delete user.passwordHash;
  return user;
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  const user = this.toPrivateJSON();
  delete user.passwordHash;
  delete user.email;
  return user;
};

userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    toJSONTransform(_doc, ret);
    delete ret.passwordHash;
    delete ret.tokenVersion;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
