const envConfigs = {
  port: process.env.PORT,
  host: process.env.HOST,
  jwtSecret: process.env.JWTSECRET,
  environment: process.env.NODE_ENV || 'development',
  dbLogs: process.env.DB_LOGS || 'false',
  redis_options: {
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
  },
  DB_URL: process.env.NODE_ENV === 'production' ? process.env.MONGODB_PROD_URI : process.env.MONGODB_DEV_URI,
  roleNames: {
    ad: 'ADMIN',
    gu: 'GUEST',
  },
  REDIS_SERVER_NOT_CONNECTED: 'REDIS_SERVER_NOT_CONNECTED',
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRE_TIME,
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRE_TIME,
  redisTokenExpireIn: process.env.REDIS_REFRESH_TOKEN_EXPIRE_IN_SECONDS,
  otpExpireIn: process.env.OTP_EXPIRE_TIME,
  sms: {
    apiKey: process.env.SMS_API_KEY,
    senderId: process.env.SMS_SENDER_ID,
  }
};

module.exports = { ...envConfigs };