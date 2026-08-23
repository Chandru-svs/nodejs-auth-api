require('dotenv').config();

const request = require('supertest');
const bcrypt = require('bcryptjs');
const createApp = require('../../app/app');
const db = require('../../app/models');
const jwtHelper = require('../../app/services/jwt_helper');
const redisClient = require('../../app/services/redis_service');

describe('Change Password', () => {
  let app;
  let user;
  let currentPassword;
  let newPassword;

  beforeAll(async () => {
    app = createApp({
      corsOrigins: 'http://localhost:3000',
      environment: 'test',
    });

    currentPassword = 'CurrentPassword@123';
    newPassword = 'NewPassword@123';

    user = await db.user.create({
      firstName: 'Change',
      lastName: 'Password',
      email: `change-password-${Date.now()}@example.com`,
      password: await bcrypt.hash(currentPassword, 10),
      status: 'active',
      isDeleted: false,
    });
  });

  it('changes the authenticated user password and removes all sessions', async () => {
    const tokenPayload = {
      user_id: user._id.toString(),
      device_id: 'change-password-test-device',
      ip: '127.0.0.1',
      roleType: 'GUEST',
      roleId: 'change-password-test-role',
      deviceType: 'web',
    };
    const accessToken = jwtHelper.signAccessToken(tokenPayload);
    const redisKey = `${tokenPayload.user_id}:web`;

    const redisGetSpy = jest.spyOn(redisClient, 'get').mockResolvedValue(accessToken);
    const redisDelSpy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);
    const redisSetSpy = jest.spyOn(redisClient, 'set');

    try {
      const response = await request(app)
        .patch('/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword,
        })
        .expect(200);

      expect(response.body).toEqual({
        result: null,
        msg: 'Password changed successfully',
      });

      const updatedUser = await db.user.findById(user._id).lean();

      expect(await bcrypt.compare(currentPassword, updatedUser.password)).toBe(false);
      expect(await bcrypt.compare(newPassword, updatedUser.password)).toBe(true);

      expect(redisGetSpy).toHaveBeenCalledWith(redisKey);
      expect(redisDelSpy).toHaveBeenCalledWith(`${tokenPayload.user_id}:web`);
      expect(redisDelSpy).toHaveBeenCalledWith(`${tokenPayload.user_id}:mobile`);
      expect(redisDelSpy).toHaveBeenCalledWith(`${tokenPayload.user_id}:tablet`);
      expect(redisDelSpy).toHaveBeenCalledTimes(3);
      expect(redisSetSpy).not.toHaveBeenCalled();
    } finally {
      redisGetSpy.mockRestore();
      redisDelSpy.mockRestore();
      redisSetSpy.mockRestore();
    }
  });

  it('rejects an incorrect current password without changing the password', async () => {
    const incorrectUserPassword = 'OriginalPassword@123';
    const attemptedNewPassword = 'AttemptedNewPassword@123';
    const incorrectPasswordUser = await db.user.create({
      firstName: 'Incorrect',
      lastName: 'Password',
      email: `incorrect-password-${Date.now()}@example.com`,
      password: await bcrypt.hash(incorrectUserPassword, 10),
      status: 'active',
      isDeleted: false,
    });
    const tokenPayload = {
      user_id: incorrectPasswordUser._id.toString(),
      device_id: 'incorrect-password-test-device',
      ip: '127.0.0.1',
      roleType: 'GUEST',
      roleId: 'change-password-test-role',
      deviceType: 'web',
    };
    const accessToken = jwtHelper.signAccessToken(tokenPayload);

    const redisGetSpy = jest.spyOn(redisClient, 'get').mockResolvedValue(accessToken);
    const redisDelSpy = jest.spyOn(redisClient, 'del');
    const redisSetSpy = jest.spyOn(redisClient, 'set');

    try {
      const response = await request(app)
        .patch('/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongCurrentPassword@123',
          newPassword: attemptedNewPassword,
        })
        .expect(400);

      expect(response.body).toEqual({
        msg: 'Current password is incorrect',
        error: null,
      });
      expect(redisDelSpy).not.toHaveBeenCalled();
      expect(redisSetSpy).not.toHaveBeenCalled();
    } finally {
      redisGetSpy.mockRestore();
      redisDelSpy.mockRestore();
      redisSetSpy.mockRestore();
    }

    const unchangedUser = await db.user.findById(incorrectPasswordUser._id).lean();

    expect(await bcrypt.compare(incorrectUserPassword, unchangedUser.password)).toBe(true);
    expect(await bcrypt.compare(attemptedNewPassword, unchangedUser.password)).toBe(false);
  });
});
