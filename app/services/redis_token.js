const { REDIS_SERVER_NOT_CONNECTED, redisTokenExpireIn } = require('../config/env.config');
const redisClient = require('./redis_service');
const jwtHelper = require('./jwt_helper');

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

  let redisKey;
  if (getDevice.deviceType === 'mobile') {
    redisKey = `${user_id}:mobile`;
  } else if (getDevice.deviceType === 'tablet') {
    if (req.headers?.mobile_app_package) {
      redisKey = `${user_id}:tablet-app`;
    } else {
      redisKey = `${user_id}:tablet-web`;
    }
  } else {
    redisKey = `${user_id}:web`;
  }

  const refreshTokenTTL = parseInt(redisTokenExpireIn, 10);

  const pipeline = redisClient.multi();
  pipeline.del(redisKey);
  pipeline.set(redisKey, refreshToken, 'EX', refreshTokenTTL);
  await pipeline.exec();

  return { accessToken, refreshToken };
};

const redisDecodeRefreshToken = async (req, user_id, deviceType) => {
  const pinged = await redisClient.ping();
  console.log('pinged', pinged);
  if (!pinged || pinged !== 'PONG') {
    return REDIS_SERVER_NOT_CONNECTED;
  }

  let redisKey;
  if (deviceType === 'mobile') {
    redisKey = `${user_id}:mobile`;
  } else if (deviceType === 'tablet') {
    redisKey = 'tablet';
    if (req.headers?.mobile_app_package === 'bems') {
      redisKey = `${user_id}:tablet-app`;
    } else {
      redisKey = `${user_id}:tablet-web`;
    }
  } else {
    redisKey = `${user_id}:web`;
  }

  const tokenRes = await redisClient.get(redisKey);
  if (tokenRes) {
    await redisClient.del(redisKey);
  }
  return tokenRes;
};

const collectTokens = async (user_id, device_id, ip, deviceType) => {
  const pinged = await redisClient.ping();
  if (!pinged || pinged !== 'PONG') {
    return REDIS_SERVER_NOT_CONNECTED;
  }

  let redisKey;

  if (deviceType === 'mobile') {
    redisKey = `${user_id}:mobile`;
  } else if (deviceType === 'tablet') {
    redisKey = `${user_id}:tablet`;
  } else {
    redisKey = `${user_id}:web`;
  }

  const redisResp = await redisClient.get(redisKey);

  if (!redisResp) {
    console.log(`No active session for key: ${redisKey}`);
    return [];
  }

  try {
    const decoded = await jwtHelper.verifyRefreshToken(redisResp);

    if (decoded) {
      if (deviceType === 'web') {
        return [decoded];
      }
      if (decoded.deviceType === deviceType && decoded.device_id === device_id) {
        return [decoded];
      }
    }

    console.log('Mismatch deviceType or IP for user:', user_id);
    return [];
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    await redisClient.del(redisKey);
    return [];
  }
};

module.exports = {
  setTokenOnRedis,
  redisDecodeRefreshToken,
  collectTokens,
};