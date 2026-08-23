require('dotenv').config();

const request = require('supertest');
const bcrypt = require('bcryptjs');
const createApp = require('../../app/app');
const db = require('../../app/models');
const redisClient = require('../../app/services/redis_service');
const { redisTokenExpireIn } = require('../../app/config/env.config');

describe('Signin', () => {
  let app;
  let user;
  let inactiveUser;
  let password;
  let inactivePassword;
  let redisSetSpy;

  beforeAll(async () => {
    app = createApp({
      corsOrigins: 'http://localhost:3000',
      environment: 'test',
    });

    const role = await db.role.create({ name: 'GUEST', status: 'active' });
    password = 'ValidPassword123!';

    user = await db.user.create({
      firstName: 'Signin',
      lastName: 'User',
      email: `signin-${Date.now()}@example.com`,
      mobile: `8${String(Date.now()).slice(-9)}`,
      password: await bcrypt.hash(password, 10),
      role: role._id,
      status: 'active',
      isDeleted: false,
    });

    inactivePassword = 'InactivePassword123!';
    inactiveUser = await db.user.create({
      firstName: 'Inactive',
      lastName: 'User',
      email: `inactive-${Date.now()}@example.com`,
      mobile: `7${String(Date.now()).slice(-9)}`,
      password: await bcrypt.hash(inactivePassword, 10),
      role: role._id,
      status: 'inactive',
      isDeleted: false,
    });
  });

  beforeEach(() => {
    redisSetSpy = jest.spyOn(redisClient, 'set').mockResolvedValue('OK');
  });

  afterEach(() => {
    redisSetSpy.mockRestore();
  });

  it('signs in with valid credentials and stores the refresh token', async () => {
    const response = await request(app)
      .post('/signin')
      .send({
        identifier: user.email,
        password,
        device_id: 'signin-test-device',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      msg: 'Logged in successfully',
      result: expect.objectContaining({
        email: user.email,
        tokens: expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        }),
      }),
    });

    expect(redisSetSpy).toHaveBeenCalledWith(
      `${user._id}:web`,
      response.body.result.tokens.refreshToken,
      { EX: parseInt(redisTokenExpireIn, 10) },
    );
  });

  it('rejects an incorrect password without returning tokens', async () => {
    const response = await request(app)
      .post('/signin')
      .send({
        identifier: user.email,
        password: 'WrongPassword123!',
      })
      .expect(400);

    expect(response.body).toEqual({
      msg: 'Password is incorrect',
      error: null,
    });
    expect(response.body.result).toBeUndefined();
    expect(response.body.accessToken).toBeUndefined();
    expect(response.body.refreshToken).toBeUndefined();
    expect(redisSetSpy).not.toHaveBeenCalled();
  });

  it('rejects an unknown user without returning tokens', async () => {
    const response = await request(app)
      .post('/signin')
      .send({
        identifier: `missing-${Date.now()}@example.com`,
        password: 'AnyPassword123!',
      })
      .expect(400);

    expect(response.body).toEqual({
      msg: 'User not found',
      error: null,
    });
    expect(response.body.result).toBeUndefined();
    expect(response.body.accessToken).toBeUndefined();
    expect(response.body.refreshToken).toBeUndefined();
    expect(redisSetSpy).not.toHaveBeenCalled();
  });

  it('rejects an inactive user without returning tokens', async () => {
    const response = await request(app)
      .post('/signin')
      .send({
        identifier: inactiveUser.email,
        password: inactivePassword,
      })
      .expect(400);

    expect(response.body).toEqual({
      msg: 'Your account is inactive. Please contact support.',
      error: null,
    });
    expect(response.body.result).toBeUndefined();
    expect(response.body.accessToken).toBeUndefined();
    expect(response.body.refreshToken).toBeUndefined();
    expect(redisSetSpy).not.toHaveBeenCalled();
  });
});
