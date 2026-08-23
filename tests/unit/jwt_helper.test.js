const jwt = require('jsonwebtoken');

const environmentKeys = [
  'JWTSECRET',
  'ACCESS_TOKEN_EXPIRE_TIME',
  'REFRESH_TOKEN_EXPIRE_TIME',
];
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]])
);

process.env.JWTSECRET = 'jwt-unit-test-secret';
process.env.ACCESS_TOKEN_EXPIRE_TIME = '1h';
process.env.REFRESH_TOKEN_EXPIRE_TIME = '2h';

const jwtHelper = require('../../app/services/jwt_helper');

const tokenPayload = {
  user_id: 'test-user-id',
  device_id: 'test-device-id',
  deviceType: 'web',
};

const expectExpiryToBeWithinTolerance = (token, expectedSeconds) => {
  const decodedToken = jwt.decode(token);
  const lifetime = decodedToken.exp - decodedToken.iat;

  expect(lifetime).toBeGreaterThanOrEqual(expectedSeconds - 1);
  expect(lifetime).toBeLessThanOrEqual(expectedSeconds + 1);
};

afterAll(() => {
  environmentKeys.forEach((key) => {
    if (originalEnvironment[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnvironment[key];
    }
  });
});

describe('JWT helper', () => {
  it('round trips an access token with its original payload', () => {
    const token = jwtHelper.signAccessToken(tokenPayload);
    const decodedToken = jwtHelper.verifyAccessToken(token);

    expect(decodedToken).toMatchObject(tokenPayload);
    expect(decodedToken.iat).toEqual(expect.any(Number));
    expect(decodedToken.exp).toEqual(expect.any(Number));
  });

  it('round trips a refresh token with its original payload', () => {
    const token = jwtHelper.signRefreshToken(tokenPayload);
    const decodedToken = jwtHelper.verifyRefreshToken(token);

    expect(decodedToken).toMatchObject(tokenPayload);
    expect(decodedToken.iat).toEqual(expect.any(Number));
    expect(decodedToken.exp).toEqual(expect.any(Number));
  });

  it('uses the configured access-token expiry', () => {
    const token = jwtHelper.signAccessToken(tokenPayload);

    expectExpiryToBeWithinTolerance(token, 60 * 60);
  });

  it('uses the configured refresh-token expiry', () => {
    const token = jwtHelper.signRefreshToken(tokenPayload);

    expectExpiryToBeWithinTolerance(token, 2 * 60 * 60);
  });

  it('rejects a tampered access token', () => {
    const token = jwtHelper.signAccessToken(tokenPayload);
    const tamperedToken = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

    expect(() => jwtHelper.verifyAccessToken(tamperedToken)).toThrow();
  });

  it('rejects an expired access token', () => {
    const expiredToken = jwt.sign(tokenPayload, process.env.JWTSECRET, {
      algorithm: 'HS256',
      expiresIn: -1,
    });

    expect(() => jwtHelper.verifyAccessToken(expiredToken)).toThrow();
  });

  it('rejects an expired refresh token', () => {
    const expiredToken = jwt.sign(tokenPayload, process.env.JWTSECRET, {
      algorithm: 'HS256',
      expiresIn: -1,
    });

    expect(() => jwtHelper.verifyRefreshToken(expiredToken)).toThrow();
  });
});
