const { createClient } = require('redis');
const config = require('../config/env.config');

const client = createClient({
  socket: {
    host: config.redis_options.host,
    port: config.redis_options.port,
  },
  // password: config.redis_options.password,
});

client.on('connect', () => {
  console.log('Redis client connected');
})

client.on('error', (err) => {
  console.error('Redis Client Error:', err.message);
});

// Export connect and close functions for explicit lifecycle management
const connectRedis = async () => {
  if (!client.isOpen) {
    try {
      await client.connect();
    } catch (err) {
      console.error('Failed to connect to Redis:', err.message);
      throw err;
    }
  }
};

const closeRedis = async () => {
  if (client.isOpen) {
    try {
      await client.disconnect();
    } catch (err) {
      console.error('Failed to disconnect from Redis:', err.message);
    }
  }
};

module.exports = client;
module.exports.connectRedis = connectRedis;
module.exports.closeRedis = closeRedis;