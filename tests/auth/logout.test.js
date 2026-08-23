require('dotenv').config();

const request = require('supertest');
const createApp = require('../../app/app');
const jwtHelper = require('../../app/services/jwt_helper');
const redisClient = require('../../app/services/redis_service');

describe('Logout', () => {
  let app;

  beforeAll(() => {
    app = createApp({
      corsOrigins: 'http://localhost:3000',
      environment: 'test',
    });
  });

  it('logs out an authenticated user and removes the Redis session', async () => {
    const tokenPayload = {
      user_id: 'logout-test-user',
      device_id: 'logout-test-device',
      ip: '127.0.0.1',
      roleType: 'GUEST',
      roleId: 'logout-test-role',
      deviceType: 'web',
    };
    const accessToken = jwtHelper.signAccessToken(tokenPayload);
    const redisKey = `${tokenPayload.user_id}:web`;

    const redisGetSpy = jest.spyOn(redisClient, 'get').mockResolvedValue(accessToken);
    const redisDelSpy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);
    const redisSetSpy = jest.spyOn(redisClient, 'set').mockResolvedValue('OK');

    try {
      const response = await request(app)
        .post('/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual({
        result: null,
        msg: 'Logged out successfully',
      });
      expect(redisGetSpy).toHaveBeenCalledWith(redisKey);
      expect(redisDelSpy).toHaveBeenCalledWith(redisKey);
      expect(redisSetSpy).not.toHaveBeenCalled();
    } finally {
      redisGetSpy.mockRestore();
      redisDelSpy.mockRestore();
      redisSetSpy.mockRestore();
    }
  });
});
