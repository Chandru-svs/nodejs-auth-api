require('dotenv').config();

const request = require('supertest');
const bcrypt = require('bcryptjs');
const createApp = require('../../app/app');
const db = require('../../app/models');
const redisClient = require('../../app/services/redis_service');
const { redisTokenExpireIn } = require('../../app/config/env.config');

describe('Send OTP', () => {
  let app;
  let user;

  beforeAll(async () => {
    app = createApp({
      corsOrigins: 'http://localhost:3000',
      environment: 'test',
    });

    const role = await db.role.create({ name: 'GUEST', status: 'active' });

    user = await db.user.create({
      firstName: 'OTP',
      lastName: 'User',
      email: `otp-${Date.now()}@example.com`,
      role: role._id,
      status: 'active',
      isDeleted: false,
    });
  });

  it('sends an OTP for an active existing user', async () => {
    const response = await request(app)
      .post('/otp/send')
      .send({ identifier: user.email })
      .expect(200);

    expect(response.body).toEqual({
      result: null,
      msg: `OTP sent to ${user.email}`,
    });
    expect(response.body.otp).toBeUndefined();

    const otpRecord = await db.loginOtp.findOne({ identifier: user.email }).lean();

    expect(otpRecord).not.toBeNull();
    expect(otpRecord.type).toBe('email');
    expect(otpRecord.attempts).toBe(0);
    expect(otpRecord.blockedUntil).toBeNull();
    expect(otpRecord.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(otpRecord.code).toEqual(expect.stringMatching(/^\$2[aby]\$10\$.{53}$/));
    expect(otpRecord.code).not.toBe(user.email);
  });

  it('verifies a valid OTP and returns authentication tokens', async () => {
    const otp = '123456';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.loginOtp.deleteMany({ identifier: user.email });
    await db.loginOtp.create({
      identifier: user.email,
      type: 'email',
      code: await bcrypt.hash(otp, 10),
      expiresAt,
      attempts: 0,
      blockedUntil: null,
    });

    const redisSetSpy = jest.spyOn(redisClient, 'set').mockResolvedValue('OK');

    try {
      const response = await request(app)
        .post('/otp/verify')
        .send({
          identifier: user.email,
          otp,
          device_id: 'otp-test-device',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        msg: 'OTP verified successfully',
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
    } finally {
      redisSetSpy.mockRestore();
    }
  });

  it('rejects an incorrect OTP and increments the attempt count', async () => {
    const otp = '654321';
    const incorrectOtp = '000000';

    await db.loginOtp.deleteMany({ identifier: user.email });
    await db.loginOtp.create({
      identifier: user.email,
      type: 'email',
      code: await bcrypt.hash(otp, 10),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      blockedUntil: null,
    });

    const redisSetSpy = jest.spyOn(redisClient, 'set').mockResolvedValue('OK');

    try {
      const response = await request(app)
        .post('/otp/verify')
        .send({
          identifier: user.email,
          otp: incorrectOtp,
          device_id: 'otp-test-device',
        })
        .expect(400);

      expect(response.body).toEqual({
        msg: 'OTP is incorrect. Only 4 attempts left',
        error: null,
      });
      expect(response.body.result).toBeUndefined();
      expect(response.body.accessToken).toBeUndefined();
      expect(response.body.refreshToken).toBeUndefined();
      expect(redisSetSpy).not.toHaveBeenCalled();
    } finally {
      redisSetSpy.mockRestore();
    }

    const otpRecord = await db.loginOtp.findOne({ identifier: user.email }).lean();

    expect(otpRecord).not.toBeNull();
    expect(otpRecord.attempts).toBe(1);
  });
});
