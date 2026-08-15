const jwt = require('jsonwebtoken');
const { accessTokenExpiresIn, refreshTokenExpiresIn, jwtSecret } = require('../config/env.config');

const signAccessToken = (payload) => {
  return jwt.sign(payload, jwtSecret, {
    algorithm: 'HS256',
    expiresIn: accessTokenExpiresIn,
  });
};

const signRefreshToken = (payload) => {
  return jwt.sign(payload, jwtSecret, {
    algorithm: 'HS256',
    expiresIn: refreshTokenExpiresIn,
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, jwtSecret);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, jwtSecret);
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};