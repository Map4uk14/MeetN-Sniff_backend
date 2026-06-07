const mongoose = require('mongoose');

async function connectDatabase(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);

  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

module.exports = connectDatabase;
