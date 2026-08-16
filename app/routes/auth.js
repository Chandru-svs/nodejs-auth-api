const express = require('express');
const router = express.Router();

const { auth } = require('../controllers');
const validator = require('../middlewares/validator.js');
const validatePayload = require('../validators/auth.js');
const middleware = require('../middlewares');

router.post(
  '/otp/send',
  middleware.payloadOTP,
  validator(validatePayload.sendOtp),
  auth.sendOtp
);
router.post(
  '/otp/verify',
  middleware.payloadOTP,
  validator(validatePayload.verifyOtp),
  auth.verifyOtp
);
router.post('/signup', validator(validatePayload.signup), auth.signup);
router.post('/signin', validator(validatePayload.signin), auth.signin);
router.post('/refresh-token', validator(validatePayload.refreshToken), auth.refreshToken);
router.post('/logout', auth.logout);
router.post(
  '/auth/forgot-password',
  middleware.payloadOTP,
  validator(validatePayload.forgotPassword),
  auth.forgotPassword
);
router.post(
  '/auth/reset-password',
  validator(validatePayload.resetPassword),
  auth.resetPassword
);
router.patch(
  '/change-password',
  validator(validatePayload.changePassword),
  auth.changePassword
);
router.get('/profile', auth.profile);

module.exports = router;