const responseMessages = require('./response_messages');
const { verifyAccessToken } = require('../services/jwt_helper');
const { collectTokens } = require('../services/redis_token');

module.exports = {
  checkSetToken: () => async (req, res, next) => {
    const ignorePaths = ['auth', 'otp', 'webhook', 'signin', 'signup'];

    const getRouteStart = req.url.split('/');
    if (ignorePaths.includes(getRouteStart[1])) {
      return next();
    }
    let token = req.headers.Authorization || req.headers.authorization;

    if (token) {
      token = token.substr('Bearer '.length);

      try {
        const decoded = await verifyAccessToken(token);
        console.log('decoded------', decoded);
        if (!decoded) {
          return res.unauthorized({ msg: responseMessages[1001] });
        }
        // const foundDeviceToken = await collectTokens(
        //   decoded.user_id,
        //   decoded.device_id,
        //   decoded.ip
        // );
        // if (foundDeviceToken === REDIS_SERVER_NOT_CONNECTED) {
        //   return res.serverError({ msg: responseMessages[1002] });
        // }
        // if (foundDeviceToken.length) {
        req.decoded = decoded;
        return next();
        // }
        return res.serverError({ msg: responseMessages[1002] });
      } catch (error) {
        console.log('error-----', error);
        return res.unauthorized({ msg: responseMessages[1003] });
      }
    } else {
      return res.unauthorized({ msg: responseMessages[1004] });
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