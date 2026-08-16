const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const expressRateLimit = require('express-rate-limit');

const responseHandler = require('./middlewares/response_handler');
const appRoutes = require('./routes/__index');

module.exports = function createApp(config) {
  const app = express();

  // parsing to json objects
  app.use(express.json());

  app.use(responseHandler());

  // adding morgan to log the http request
  app.use(morgan('tiny'));

  const allowedOrigins = config.corsOrigins.split(',');

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
    message: { msg: 'Too many requests, please try again' },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use('/', appRoutes);

  // Global error handler
  app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);

    res.status(500).json({
      msg: 'Internal Server Error',
      error: config.environment === 'development' ? err.message : null,
    });
  });

  return app;
};
