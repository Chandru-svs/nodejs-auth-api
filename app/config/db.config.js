const mongoose = require('mongoose');
const { DB_URL, dbLogs } = require('./env.config');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(DB_URL, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log(`Connected to DB: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected!');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected!');
    });
  } catch (error) {
    console.error('Error connecting to DB:', error.message);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed - App terminated');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed - SIGTERM received');
  process.exit(0);
});

mongoose.set('debug', dbLogs === 'true');

if (process.env.NODE_ENV === 'production') {
  mongoose.set('autoIndex', false);
}

module.exports = connectDB;
