const { REDIS_SERVER_NOT_CONNECTED, redisTokenExpireIn } = require('../config/env.config');
const redisClient = require('./redis_service');
const jwtHelper = require('./jwt_helper');
const responseMessages = require('../middlewares/response_messages');

const crypto = require('node:crypto');

async function findDeviceType(req) {
  const userAgent = req.headers['user-agent'] || '';
  // console.log('userAgent------', userAgent)

  let deviceType = 'web';

  if (/mobile/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/okhttp/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = 'tablet';
  }

  return { deviceType };
};

const setTokenOnRedis = async (req, user_id, device_id, ip, roleType, roleId) => {
  const getDevice = await findDeviceType(req);
  if (!device_id) device_id = crypto.randomUUID();

  const payload = {
    user_id,
    device_id,
    ip,
    roleType,
    roleId,
    deviceType: getDevice.deviceType,
  };

  const accessToken = jwtHelper.signAccessToken(payload);
  const refreshToken = jwtHelper.signRefreshToken(payload);

  const redisKey = `${user_id}:${getDevice.deviceType}`;

  const refreshTokenTTL = parseInt(redisTokenExpireIn, 10);

  await redisClient.set(redisKey, refreshToken, {
    EX: refreshTokenTTL,
  });

  return { accessToken, refreshToken };
};

const redisDecodeRefreshToken = async (req, user_id, deviceType) => {
  const getDevice = await findDeviceType(req);
  const redisKey = `${user_id}:${getDevice.deviceType}`;

  const tokenRes = await redisClient.get(redisKey);
  if (tokenRes) {
    await redisClient.del(redisKey);
  }
  return tokenRes;
};

const collectTokens = async (user_id, device_id, ip, deviceType, req) => {
  const getDevice = await findDeviceType(req);

  const redisKey = `${user_id}:${getDevice.deviceType}`;

  let redisResp;
  try {
    redisResp = await redisClient.get(redisKey);
  } catch (error) {
    return {
      success: false,
      statusCode: 503,
      msg: responseMessages[1003],
    };
  }
  // console.log('redisResp', redisResp)
  if (!redisResp) {
    return {
      success: false,
      statusCode: 401,
      msg: responseMessages[1009],
    };
  }

  try {
    const decodedRefreshToken = jwtHelper.verifyAccessToken(redisResp);

    if (
      decodedRefreshToken &&
      decodedRefreshToken.deviceType === deviceType &&
      decodedRefreshToken.device_id === device_id
    ) {
      return { success: true, session: decodedRefreshToken };
    }

    return {
      success: false,
      statusCode: 401,
      msg: responseMessages[1003],
    };
  } catch (error) {
    await redisClient.del(redisKey);
    if (error.name === 'TokenExpiredError') {
      return {
        success: false,
        statusCode: 401,
        msg: responseMessages[1002],
      };
    }

    return {
      success: false,
      statusCode: 401,
      msg: responseMessages[1001],
    };
  }
};

const removeTokenFromRedis = async (user_id, deviceType) => {
  const redisKey = `${user_id}:${deviceType}`;
  const result = await redisClient.del(redisKey);
}

const removeAllTokensFromRedis = async (user_id) => {
  const deviceTypes = ['web', 'mobile', 'tablet'];

  for (const deviceType of deviceTypes) {
    const redisKey = `${user_id}:${deviceType}`;
    await redisClient.del(redisKey);
  }
};

module.exports = {
  setTokenOnRedis,
  redisDecodeRefreshToken,
  collectTokens,
  removeTokenFromRedis,
  removeAllTokensFromRedis,
};