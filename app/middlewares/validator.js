module.exports = (joiSchema, property = 'body') => async (req, res, next) => {
    try {
      const { error, value } = joiSchema.validate(req[property]);

      if (error) {
        const formattedError = require('../utils/validation.utils').convertJoiErrors(
          error.details
        );
        return res.status(400).json({ msg: formattedError });
      }

      req.body = value;
      next();
    } catch (err) {
      return res.status(500).json({ msg: 'Validation failed', err });
    }
  };