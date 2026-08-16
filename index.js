require('dotenv').config();

const mongoose = require('mongoose');

const config = require('./app/config/env.config');
const connectDB = require('./app/config/db.config');
const redisClient = require('./app/services/redis_service');
const createApp = require('./app/app');

const appConfig = {
  corsOrigins: process.env.CORS_ORGINS,
  environment: process.env.NODE_ENV || 'development',
};

const app = createApp(appConfig);

Promise.all([
  connectDB(),
  redisClient.connectRedis(),
]).then(() => {
  app.listen(config.port, () => {
    console.log('Server running on port:', config.port);
  });
}).catch(err => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  if (redisClient.isOpen) {
    await redisClient.disconnect();
  }
  console.log('MongoDB and Redis connections closed - App terminated');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  if (redisClient.isOpen) {
    await redisClient.disconnect();
  }
  console.log('MongoDB and Redis connections closed - SIGTERM received');
  process.exit(0);
});

// Unhandled errors
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});



