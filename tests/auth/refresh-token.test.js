require('dotenv').config();

const request = require('supertest');
const createApp = require('../../app/app');
const jwtHelper = require('../../app/services/jwt_helper');
const redisClient = require('../../app/services/redis_service');
const { redisTokenExpireIn } = require('../../app/config/env.config');

describe('Refresh Token', () => {
  let app;

  beforeAll(() => {
    app = createApp({
      corsOrigins: 'http://localhost:3000',
      environment: 'test',
    });
  });

  it('refreshes an active session and returns new tokens', async () => {
    const tokenPayload = {
      user_id: 'refresh-test-user',
      device_id: 'refresh-test-device',
      ip: '127.0.0.1',
      roleType: 'GUEST',
      roleId: 'refresh-test-role',
      deviceType: 'web',
    };
    const accessToken = jwtHelper.signAccessToken(tokenPayload);
    const storedRefreshToken = jwtHelper.signRefreshToken({
      ...tokenPayload,
      iat: Math.floor(Date.now() / 1000) - 10,
    });
    const redisKey = `${tokenPayload.user_id}:web`;

    const redisGetSpy = jest.spyOn(redisClient, 'get').mockResolvedValue(storedRefreshToken);
    const redisDelSpy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);
    const redisSetSpy = jest.spyOn(redisClient, 'set').mockResolvedValue('OK');

    try {
      const response = await request(app)
        .post('/refresh-token')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken: storedRefreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        msg: 'Token refreshed successfully',
        result: expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        }),
      });
      expect(typeof response.body.result.accessToken).toBe('string');
      expect(typeof response.body.result.refreshToken).toBe('string');
      expect(response.body.result.refreshToken).not.toBe(storedRefreshToken);

      expect(redisGetSpy).toHaveBeenCalledTimes(2);
      expect(redisDelSpy).toHaveBeenCalledWith(redisKey);
      expect(redisSetSpy).toHaveBeenCalledWith(
        redisKey,
        response.body.result.refreshToken,
        { EX: parseInt(redisTokenExpireIn, 10) },
      );
    } finally {
      redisGetSpy.mockRestore();
      redisDelSpy.mockRestore();
      redisSetSpy.mockRestore();
    }
  });

  it('rejects a refresh when no active Redis session exists', async () => {
    const tokenPayload = {
      user_id: 'refresh-missing-session-user',
      device_id: 'refresh-test-device',
      ip: '127.0.0.1',
      roleType: 'GUEST',
      roleId: 'refresh-test-role',
      deviceType: 'web',
    };
    const accessToken = jwtHelper.signAccessToken(tokenPayload);
    const refreshToken = jwtHelper.signRefreshToken(tokenPayload);

    const redisGetSpy = jest.spyOn(redisClient, 'get')
      .mockResolvedValueOnce(refreshToken)
      .mockResolvedValueOnce(null);
    const redisDelSpy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);
    const redisSetSpy = jest.spyOn(redisClient, 'set').mockResolvedValue('OK');

    try {
      const response = await request(app)
        .post('/refresh-token')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(400);

      expect(response.body).toEqual({
        msg: 'No active session found',
        error: null,
      });
      expect(response.body.result).toBeUndefined();
      expect(response.body.accessToken).toBeUndefined();
      expect(response.body.refreshToken).toBeUndefined();
      expect(redisGetSpy).toHaveBeenCalledTimes(2);
      expect(redisDelSpy).not.toHaveBeenCalled();
      expect(redisSetSpy).not.toHaveBeenCalled();
    } finally {
      redisGetSpy.mockRestore();
      redisDelSpy.mockRestore();
      redisSetSpy.mockRestore();
    }
  });
});
