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
};