require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const helmet = require('helmet');
const expressRateLimit = require('express-rate-limit');

const config = require('./app/config/env.config');
const appRoutes = require('./app/routes/__index');
const connectDB = require('./app/config/db.config');
const responseHandler = require('./app/middlewares/response_handler');
const redisClient = require('./app/services/redis_service');

const app = express();

// parsing to json objects
app.use(express.json());

app.use(responseHandler());

// adding morgan to log the http request
app.use(morgan('tiny'));

const allowedOrigins = process.env.CORS_ORGINS.split(',');

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}

app.use(cors(corsOptions));

app.use(helmet());

app.get('/health', (req, res) => {
  return res.success({ msg: 'Status up' });
});

app.use(expressRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { msg: 'Too many requests from this IP, please try again' },
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use('/', appRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    msg: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : null,
  });
});

connectDB().then(() => {
  app.listen(config.port, () => {
    console.log('Server running on port:', config.port);
  });
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



