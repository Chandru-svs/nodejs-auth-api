const request = require('supertest');
const createApp = require('../app/app');
const redisClient = require('../app/services/redis_service');

describe('Health Endpoint', () => {
  let app;

  beforeAll(() => {
    app = createApp({
      corsOrigins: 'http://localhost:3000',
      environment: 'test',
    });
  });

  afterAll(async () => {
    await redisClient.closeRedis();
  });

  it('should return 200 with status message', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('msg');
    expect(response.body.msg).toBe('Status up');
    expect(response.body).toHaveProperty('result');
  });
});
