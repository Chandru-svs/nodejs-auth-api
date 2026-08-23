require('dotenv').config();

const request = require('supertest');
const bcrypt = require('bcryptjs');
const createApp = require('../../app/app');
const db = require('../../app/models');
const redisClient = require('../../app/services/redis_service');

describe('Reset Password', () => {
  let app;
  let user;
  let oldPassword;
  let newPassword;
  let resetToken;

  beforeAll(async () => {
    app = createApp({
      corsOrigins: 'http://localhost:3000',
      environment: 'test',
    });

    oldPassword = 'OldPassword@123';
    newPassword = 'NewPassword@123';
    resetToken = 'reset-token-123';

    user = await db.user.create({
      firstName: 'Reset',
      lastName: 'Password',
      email: `reset-password-${Date.now()}@example.com`,
      password: await bcrypt.hash(oldPassword, 10),
      status: 'active',
      isDeleted: false,
    });

    await db.loginOtp.create({
      identifier: user.email,
      type: 'email',
      purpose: 'forgot_password',
      code: await bcrypt.hash(resetToken, 10),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      blockedUntil: null,
    });
  });

  it('resets the password and removes all user sessions', async () => {
    const redisGetSpy = jest.spyOn(redisClient, 'get');
    const redisSetSpy = jest.spyOn(redisClient, 'set');
    const redisDelSpy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);

    try {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          identifier: user.email,
          resetToken,
          newPassword,
        })
        .expect(200);

      expect(response.body).toEqual({
        result: null,
        msg: 'Password reset successful',
      });

      const updatedUser = await db.user.findById(user._id).lean();
      const resetRecord = await db.loginOtp.findOne({
        identifier: user.email,
        type: 'email',
        purpose: 'forgot_password',
      }).lean();

      expect(await bcrypt.compare(oldPassword, updatedUser.password)).toBe(false);
      expect(await bcrypt.compare(newPassword, updatedUser.password)).toBe(true);
      expect(resetRecord).toBeNull();

      expect(redisDelSpy).toHaveBeenCalledWith(`${user._id}:web`);
      expect(redisDelSpy).toHaveBeenCalledWith(`${user._id}:mobile`);
      expect(redisDelSpy).toHaveBeenCalledWith(`${user._id}:tablet`);
      expect(redisDelSpy).toHaveBeenCalledTimes(3);
      expect(redisGetSpy).not.toHaveBeenCalled();
      expect(redisSetSpy).not.toHaveBeenCalled();
    } finally {
      redisGetSpy.mockRestore();
      redisSetSpy.mockRestore();
      redisDelSpy.mockRestore();
    }
  });

  it('rejects an incorrect reset token without changing the password', async () => {
    const invalidUserOldPassword = 'InvalidOldPassword@123';
    const invalidUserNewPassword = 'InvalidNewPassword@123';
    const validResetToken = 'valid-reset-token-123';
    const invalidResetToken = 'invalid-reset-token-123';
    const invalidUser = await db.user.create({
      firstName: 'Invalid',
      lastName: 'Reset',
      email: `invalid-reset-${Date.now()}@example.com`,
      password: await bcrypt.hash(invalidUserOldPassword, 10),
      status: 'active',
      isDeleted: false,
    });

    await db.loginOtp.create({
      identifier: invalidUser.email,
      type: 'email',
      purpose: 'forgot_password',
      code: await bcrypt.hash(validResetToken, 10),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      blockedUntil: null,
    });

    const redisGetSpy = jest.spyOn(redisClient, 'get');
    const redisSetSpy = jest.spyOn(redisClient, 'set');
    const redisDelSpy = jest.spyOn(redisClient, 'del');

    try {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          identifier: invalidUser.email,
          resetToken: invalidResetToken,
          newPassword: invalidUserNewPassword,
        })
        .expect(400);

      expect(response.body).toEqual({
        msg: 'Invalid token. Only 4 attempts left',
        error: null,
      });
      expect(redisGetSpy).not.toHaveBeenCalled();
      expect(redisSetSpy).not.toHaveBeenCalled();
      expect(redisDelSpy).not.toHaveBeenCalled();
    } finally {
      redisGetSpy.mockRestore();
      redisSetSpy.mockRestore();
      redisDelSpy.mockRestore();
    }

    const unchangedUser = await db.user.findById(invalidUser._id).lean();
    const updatedOtp = await db.loginOtp.findOne({
      identifier: invalidUser.email,
      type: 'email',
      purpose: 'forgot_password',
    }).lean();

    expect(await bcrypt.compare(invalidUserOldPassword, unchangedUser.password)).toBe(true);
    expect(await bcrypt.compare(invalidUserNewPassword, unchangedUser.password)).toBe(false);
    expect(updatedOtp).not.toBeNull();
    expect(updatedOtp.attempts).toBe(1);
  });
});
