module.exports = {
  errorHandlerFunction: (res, error) => {
    if (res.headersSent) {
      return console.error('Headers already sent, cannot send error response');
    }
    console.log('Error captured----------', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const value = error.keyValue?.[field];
      const message = field ? `${field} must be unique. '${value}' already exists.` : 'Duplicate key error.';

      return res.clientError({
        msg: message,
        error: 'Duplicate key error',
      });
    }
    if (error.status) {
      if (error.status < 500) {
        return res.clientError({
          ...error.error,
          statusCode: error.status,
        });
      }
      return res.internalServerError({ ...error.error });
    }
    return res.internalServerError({ error });
  }
};