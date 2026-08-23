const request = require('supertest');
const mongoose = require('mongoose');
const createApp = require('../../app/app');
const db = require('../../app/models');

describe('Signup', () => {
  let app;
  let signupPayload;

  beforeAll(async () => {
    app = createApp({
      corsOrigins: 'http://localhost:3000',
      environment: 'test',
    });

    await db.role.create({ name: 'GUEST' });

    const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    signupPayload = {
      firstName: 'Test',
      lastName: 'User',
      email: `signup-${uniqueSuffix}@example.com`,
      mobile: `9${String(Date.now()).slice(-9)}`,
      password: 'ValidPassword123!',
    };
  });

  it('creates a user with a hashed password', async () => {
    const response = await request(app)
      .post('/signup')
      .send(signupPayload)
      .expect(200);

    expect(response.body).toMatchObject({
      msg: 'Account created successfully!',
      result: expect.objectContaining({
        email: signupPayload.email,
        mobile: signupPayload.mobile,
      }),
    });

    const storedUser = await db.user.findOne({ email: signupPayload.email }).lean();

    expect(storedUser).not.toBeNull();
    expect(storedUser.password).not.toBe(signupPayload.password);
    expect(mongoose.isValidObjectId(storedUser.role)).toBe(true);
  });

  it('rejects a duplicate email without creating another user', async () => {
    const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const duplicatePayload = {
      firstName: 'Duplicate',
      lastName: 'User',
      email: `duplicate-${uniqueSuffix}@example.com`,
      mobile: `8${String(Date.now()).slice(-9)}`,
      password: 'ValidPassword123!',
    };

    await request(app)
      .post('/signup')
      .send(duplicatePayload)
      .expect(200);

    const usersBeforeDuplicate = await db.user.countDocuments({
      email: duplicatePayload.email,
    });

    const response = await request(app)
      .post('/signup')
      .send({
        ...duplicatePayload,
        firstName: 'Another',
      })
      .expect(400);

    expect(response.body).toEqual({
      msg: 'Email already exists',
      error: null,
    });

    const usersAfterDuplicate = await db.user.countDocuments({
      email: duplicatePayload.email,
    });

    expect(usersBeforeDuplicate).toBe(1);
    expect(usersAfterDuplicate).toBe(1);
  });

  it('rejects a signup payload missing the required first name', async () => {
    const invalidEmail = `invalid-${Date.now()}@example.com`;
    const invalidPayload = {
      lastName: 'User',
      email: invalidEmail,
      mobile: `7${String(Date.now()).slice(-9)}`,
      password: 'ValidPassword123!',
    };

    const usersBeforeRequest = await db.user.countDocuments({ email: invalidEmail });

    const response = await request(app)
      .post('/signup')
      .send(invalidPayload)
      .expect(400);

    expect(response.body).toMatchObject({
      msg: {
        message: 'firstName must be required!',
        field: 'firstName',
      },
    });
    expect(response.body.result).toBeUndefined();

    const usersAfterRequest = await db.user.countDocuments({ email: invalidEmail });

    expect(usersBeforeRequest).toBe(0);
    expect(usersAfterRequest).toBe(0);
  });

  it('rejects a signup payload missing the required password', async () => {
    const invalidEmail = `missing-password-${Date.now()}@example.com`;
    const invalidPayload = {
      firstName: 'Missing',
      lastName: 'Password',
      email: invalidEmail,
      mobile: `6${String(Date.now()).slice(-9)}`,
    };

    const usersBeforeRequest = await db.user.countDocuments({ email: invalidEmail });

    const response = await request(app)
      .post('/signup')
      .send(invalidPayload)
      .expect(400);

    expect(response.body).toMatchObject({
      msg: {
        message: 'password must be required!',
        field: 'password',
      },
    });
    expect(response.body.result).toBeUndefined();

    const usersAfterRequest = await db.user.countDocuments({ email: invalidEmail });

    expect(usersBeforeRequest).toBe(0);
    expect(usersAfterRequest).toBe(0);
  });
});
