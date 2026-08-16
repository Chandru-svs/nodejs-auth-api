const Joi = require('joi');
const commonService = require('../utils/validation.utils');

module.exports = {
  sendOtp: Joi.object({
    mobile: Joi.string().optional().pattern(/^[6-9][0-9]{9}$/).error(commonService.getValidationMessage),
    email: Joi.string().email({ tlds: { allow: false } })
      .custom((val, helpers) => {
        const localPart = val.split('@')[0];
        if ((localPart.match(/\./g) || []).length > 3) {
          return helpers.error('any.invalid');
        }

        if (commonService.isTypoEmail(val)) {
          return helpers.error('string.emailTypo');
        };

        return val;
      })
      .optional()
      .error(commonService.getValidationMessage),
  }).error(commonService.getValidationMessage),

  verifyOtp: Joi.object({
    mobile: Joi.string().optional().pattern(/^[6-9][0-9]{9}$/).error(commonService.getValidationMessage),
    email: Joi.string().email({ tlds: { allow: false } })
      .custom((val, helpers) => {
        const localPart = val.split('@')[0];
        if ((localPart.match(/\./g) || []).length > 3) {
          return helpers.error('any.invalid');
        }

        if (commonService.isTypoEmail(val)) {
          return helpers.error('string.emailTypo');
        };

        return val;
      })
      .optional()
      .error(commonService.getValidationMessage),
    otp: Joi.string().required().error(commonService.getValidationMessage),
    device_id: Joi.string().optional().allow('', null).error(commonService.getValidationMessage),
  }).error(commonService.getValidationMessage),

  signup: Joi.object({
    firstName: Joi.string().required().error(commonService.getValidationMessage),
    lastName: Joi.string().optional().error(commonService.getValidationMessage),
    mobile: Joi.string().optional().pattern(/^[6-9][0-9]{9}$/).error(commonService.getValidationMessage),
    email: Joi.string().email({ tlds: { allow: false } })
      .custom((val, helpers) => {
        const localPart = val.split('@')[0];
        if ((localPart.match(/\./g) || []).length > 3) {
          return helpers.error('any.invalid');
        }

        if (commonService.isTypoEmail(val)) {
          return helpers.error('string.emailTypo');
        };

        return val;
      })
      .optional()
      .error(commonService.getValidationMessage),
    password: Joi.string().required().error(commonService.getValidationMessage)
  }),

  signin: Joi.object({
    identifier: Joi.string().required().error(commonService.getValidationMessage),
    password: Joi.string().required().error(commonService.getValidationMessage),
    device_id: Joi.string().optional().error(commonService.getValidationMessage),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required().error(commonService.getValidationMessage),
  }),

  forgotPassword: Joi.object({
    mobile: Joi.string().optional().pattern(/^[6-9][0-9]{9}$/).error(commonService.getValidationMessage),
    email: Joi.string().email({ tlds: { allow: false } })
      .custom((val, helpers) => {
        const localPart = val.split('@')[0];
        if ((localPart.match(/\./g) || []).length > 3) {
          return helpers.error('any.invalid');
        }

        if (commonService.isTypoEmail(val)) {
          return helpers.error('string.emailTypo');
        };

        return val;
      })
      .optional()
      .error(commonService.getValidationMessage),
  }).error(commonService.getValidationMessage),

  resetPassword: Joi.object({
    identifier: Joi.string().required().error(commonService.getValidationMessage),
    resetToken: Joi.string().required().error(commonService.getValidationMessage),
    newPassword: Joi.string().required().error(commonService.getValidationMessage),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().error(commonService.getValidationMessage),
    newPassword: Joi.string().required().error(commonService.getValidationMessage),
  }),
};