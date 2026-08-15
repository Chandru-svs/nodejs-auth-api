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

module.exports = client;