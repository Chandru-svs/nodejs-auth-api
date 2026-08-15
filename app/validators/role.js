const Joi = require('joi');
const commonService = require('../utils/validation.utils');

module.exports = {
  create: Joi.object({
    name: Joi.string().required().error(commonService.getValidationMessage),
  }).error(commonService.getValidationMessage),

  get: Joi.object({
    perPage: Joi.string().optional().allow('').error(commonService.getValidationMessage),
    currentPage: Joi.string().optional().allow('').error(commonService.getValidationMessage),
  }).error(commonService.getValidationMessage),

  update: Joi.object({
    name: Joi.string().required().error(commonService.getValidationMessage),
  }).error(commonService.getValidationMessage),
};