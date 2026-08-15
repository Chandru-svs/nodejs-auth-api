/**
 * HTTP Status codes
 */
const statusCodes = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  PARTIAL_CONTENT: 206,
  MULTIPLE_CHOICES: 300,
  PERMANENT_REDIRECT: 308,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_ACCEPTABLE: 406,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIME_OUT: 504,
  NETWORK_AUTHENTICATION_REQUIRED: 511,
};

const responseHandler = () => async (req, res, next) => {
  res.success = ({ statusCode, result = null, msg = null }) => {
    const responseStatus =
      statusCode && statusCode < statusCodes.MULTIPLE_CHOICES && statusCode >= statusCodes.OK
        ? statusCode
        : statusCodes.OK;

    return res.status(responseStatus).json({
      result,
      msg,
    });
  };

  res.redirect = ({ /* 300 responses */ statusCode, result = null, error = null, msg = null }) => {
    const responseStatus =
      statusCode && statusCode < statusCodes.BAD_REQUEST && statusCode >= statusCodes.MULTIPLE_CHOICES
        ? statusCode
        : statusCodes.MULTIPLE_CHOICES;

    return res.status(responseStatus).json({
      result,
      msg,
      error,
    });
  };

  res.clientError = ({ /* 400 responses */ statusCode, error = null, msg = null }) => {
    const responseStatus =
      statusCode && statusCode < statusCodes.INTERNAL_SERVER_ERROR && statusCode >= statusCodes.BAD_REQUEST
        ? statusCode
        : statusCodes.BAD_REQUEST;

    return res.status(responseStatus).json({
      msg,
      error,
    });
  };

  res.serverError = ({ /* 500 responses */ statusCode, result = null, error = null, msg = null }) => {
    const responseStatus =
      statusCode && statusCode >= statusCodes.INTERNAL_SERVER_ERROR ? statusCode : statusCodes.INTERNAL_SERVER_ERROR;

    return res.status(responseStatus).json({
      result,
      msg,
      error,
    });
  };

  res.ok = (params = {}) => {
    res.success({
      ...params,
      statusCode: statusCodes.OK,
    });
  };

  res.created = (params = {}) => {
    res.success({
      ...params,
      statusCode: statusCodes.CREATED,
    });
  };

  res.accepted = (params = {}) => {
    res.success({
      ...params,
      statusCode: statusCodes.ACCEPTED,
    });
  };

  res.noContent = (params = {}) => {
    res.success({
      ...params,
      statusCode: statusCodes.NO_CONTENT,
    });
  };

  res.badRequest = (params = {}) => {
    res.clientError({
      ...params,
      statusCode: statusCodes.BAD_REQUEST,
    });
  };

  res.unauthorized = (params = {}) => {
    res.clientError({
      ...params,
      statusCode: statusCodes.UNAUTHORIZED,
    });
  };

  res.forbidden = (params = {}) => {
    res.clientError({
      ...params,
      statusCode: statusCodes.FORBIDDEN,
    });
  };

  res.notFound = (params = {}) => {
    res.clientError({
      ...params,
      statusCode: statusCodes.NOT_FOUND,
    });
  };

  res.notAcceptable = (params = {}) => {
    res.clientError({
      ...params,
      statusCode: statusCodes.NOT_ACCEPTABLE,
    });
  };

  res.requestTimeout = (params = {}) => {
    res.clientError({
      ...params,
      statusCode: statusCodes.REQUEST_TIMEOUT,
    });
  };

  res.conflict = (params = {}) => {
    res.clientError({
      ...params,
      statusCode: statusCodes.CONFLICT,
    });
  };

  res.gone = (params = {}) => {
    res.clientError({
      ...params,
      statusCode: statusCodes.GONE,
    });
  };

  res.unprocessableEntity = (params = {}) => {
    res.clientError({
      ...params,
      statusCode: statusCodes.UNPROCESSABLE_ENTITY,
    });
  };

  res.internalServerError = (params = {}) => {
    res.serverError({
      ...params,
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
    });
  };

  res.notImplemented = (params = {}) => {
    res.serverError({
      ...params,
      statusCode: statusCodes.NOT_IMPLEMENTED,
    });
  };

  res.badGateway = (params = {}) => {
    res.serverError({
      ...params,
      statusCode: statusCodes.BAD_GATEWAY,
    });
  };

  res.serviceUnavailable = (params = {}) => {
    res.serverError({
      ...params,
      statusCode: statusCodes.SERVICE_UNAVAILABLE,
    });
  };

  res.gatewayTimeOut = (params = {}) => {
    res.serverError({
      ...params,
      statusCode: statusCodes.GATEWAY_TIME_OUT,
    });
  };
  next();
};

module.exports = responseHandler;
