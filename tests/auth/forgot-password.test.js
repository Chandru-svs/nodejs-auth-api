require('dotenv').config();

const request = require('supertest');
const createApp = require('../../app/app');
const db = require('../../app/models');

describe('Forgot Password', () => {
  let app;
  let user;

  beforeAll(async () => {
    app = createApp({
      corsOrigins: 'http://localhost:3000',
      environment: 'test',
    });

    user = await db.user.create({
      firstName: 'Forgot',
      lastName: 'Password',
      email: `forgot-password-${Date.now()}@example.com`,
      status: 'active',
      isDeleted: false,
    });
  });

  it('creates a hashed reset token for an active existing user', async () => {
    const response = await request(app)
      .post('/auth/forgot-password')
      .send({ identifier: user.email })
      .expect(200);

    expect(response.body).toMatchObject({
      msg: 'If the account exists, a password reset link will be sent shortly',
      result: {
        resetToken: expect.any(String),
      },
    });

    const resetToken = response.body.result.resetToken;
    const resetRecord = await db.loginOtp.findOne({
      identifier: user.email,
      type: 'email',
    }).lean();

    expect(resetRecord).not.toBeNull();
    expect(resetRecord.purpose).toBe('forgot_password');
    expect(resetRecord.attempts).toBe(0);
    expect(resetRecord.blockedUntil).toBeNull();
    expect(resetRecord.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(resetRecord.code).toEqual(expect.stringMatching(/^\$2[aby]\$10\$.{53}$/));
    expect(resetRecord.code).not.toBe(resetToken);
  });
});
