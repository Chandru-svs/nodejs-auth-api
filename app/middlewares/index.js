const responseMessages = require('./response_messages');
const { verifyAccessToken } = require('../services/jwt_helper');
const { collectTokens } = require('../services/redis_token');

const getAccessTokenErrorResponse = (error) => {
  if (error.name === 'TokenExpiredError') {
    return { msg: responseMessages[1002] }
  }

  if (error.name === 'SyntaxError') {
    return { msg: responseMessages[1001] };
  }

  if (error.name === 'JsonWebTokenError') {
    return { msg: responseMessages[1001] };
  }

  if (error.name === 'NotBeforeError') {
    return { msg: responseMessages[1001] };
  }

  return { msg: responseMessages[1003] };
};

module.exports = {
  isAuthorized: () => async (req, res, next) => {
    try {
      const ignorePaths = new Set(['auth', 'otp', 'signin', 'signup']);

      const firstPathSegment = req.path.split('/')[1];
      if (ignorePaths.has(firstPathSegment)) {
        return next();
      }

      const authHeader = req.headers?.authorization || req.headers?.Authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.unauthorized({
          msg: responseMessages[1004],
        });
      }

      const token = authHeader.slice(7).trim();
      if (!token) {
        return res.unauthorized({
          msg: responseMessages[1004],
        });
      }

      let decoded;
      try {
        decoded = await verifyAccessToken(token);
      } catch (error) {
        return res.unauthorized(getAccessTokenErrorResponse(error));
      }

      const tokenResult = await collectTokens(
        decoded.user_id,
        decoded.device_id,
        decoded.ip,
        decoded.deviceType,
        req
      );

      if (!tokenResult.success) {
        if (tokenResult.statusCode === 503) {
          return res.serviceUnavailable({
            msg: tokenResult.msg,
            error: tokenResult.error,
          });
        }

        return res.unauthorized({
          msg: tokenResult.msg,
          error: tokenResult.error,
        });
      }

      req.decoded = decoded;

      return next();
    } catch (error) {
      console.log('Error in isAuthorized middleware:', error);
      return res.serviceUnavailable({
        msg: responseMessages[1003],
      });
    }
  },
  checkAddUrlToHit: (baseUrlToAppend) => (req, _res, next) => {
    req.hitUrl = baseUrlToAppend + req.url;

    return next();
  },
  payloadOTP: (req, res, next) => {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ msg: 'Email or mobile number is required' });
    }

    const isMobile = Number(identifier);

    if (isMobile) {
      req.body.mobile = identifier;
    } else {
      req.body.email = identifier;
    }

    delete req.body.identifier;

    next();
  },
};