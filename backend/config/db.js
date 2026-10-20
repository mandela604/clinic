const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set in .env');
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host} / ${mongoose.connection.name}`);
}

module.exports = connectDB;
