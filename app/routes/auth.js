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

module.exports = router;