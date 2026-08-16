const responseMessages = require('../middlewares/response_messages');
const { errorHandlerFunction } = require('../middlewares/error');
const { roleNames, otpExpireIn, environment } = require('../config/env.config');
const { generateOTP, requestMeta } = require('../utils/common_utils');
const { verifyRefreshToken } = require('../services/jwt_helper');
const {
  setTokenOnRedis,
  redisDecodeRefreshToken,
  removeTokenFromRedis,
  removeAllTokensFromRedis
} = require('../services/redis_token');

const bcrypt = require('bcryptjs');

const db = require('../models');

module.exports = {
  signup: async (req, res) => {
    try {
      const { email, mobile } = req.body;

      const filterQuery = [{ email: email.trim().toLowerCase() }];
      if (mobile) filterQuery.push({ mobile: mobile.trim() });

      const checkExists = await db.user.findOne(
        { $or: filterQuery, isDeleted: false }, { email: 1, mobile: 1 }
      ).lean();

      if (checkExists) {
        if (checkExists.email === email.trim().toLowerCase()) {
          return res.clientError({ msg: responseMessages[1015] });
        }
        return res.clientError({ msg: responseMessages[1016] });
      }

      const role = await db.role.findOne({ isDeleted: false, name: roleNames.gu });
      if (!role) return res.clientError({ msg: responseMessages[1017] });

      req.body.role = role._id;
      req.body.password = await bcrypt.hash(req.body.password, 10);

      const data = await db.user.create(req.body);

      if (data?._id) {
        return res.success({
          msg: responseMessages[1018],
          result: data
        });
      }

      return res.clientError({ msg: responseMessages[1017] });
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  signin: async (req, res) => {
    try {
      const { identifier, password, device_id, ip = '' } = req.body;

      const isMobile = Number(identifier);
      const filterQuery = {};

      if (isMobile) {
        filterQuery.mobile = identifier.trim();
      } else {
        filterQuery.email = identifier.trim().toLowerCase();
      };

      const checkExists = await db.user
        .findOne(filterQuery,
          {
            firstName: 1,
            lastName: 1,
            email: 1,
            mobile: 1,
            role: 1,
            password: 1,
            img_url: 1,
          })
        .populate('role', 'name')
        .lean();

      if (!checkExists) {
        return res.clientError({ msg: responseMessages[1019] });
      }
      if (checkExists.status === 'inactive') {
        return res.clientError({ msg: responseMessages[1020] });
      }

      const passwordIsValid = await bcrypt.compare(password, checkExists.password);
      if (!passwordIsValid) {
        return res.clientError({ msg: responseMessages[1014] });
      }

      const tokens = await setTokenOnRedis(
        req,
        checkExists._id.toString(),
        device_id,
        ip,
        checkExists.role.name,
        checkExists.role._id.toString(),
      );

      db.user.updateOne({ _id: checkExists._id }, { $set: { lastLogin: new Date() } })
        .catch(console.error);

      delete checkExists.password;

      return res.success({
        msg: responseMessages[1012],
        result: { ...checkExists, tokens }
      });
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  sendOtp: async (req, res) => {
    try {
      const { mobile, email } = req.body;
      const identifier = mobile || email;

      async function otpFunction() {
        const checkExistOTP = await db.loginOtp.findOne({ identifier }, { blockedUntil: 1 }).lean();
        if (checkExistOTP?.blockedUntil && checkExistOTP.blockedUntil > new Date()) {
          return { success: false, msg: `Too many attempts. Try again after ${Math.ceil((checkExistOTP.blockedUntil - new Date()) / 60000)} minutes` }
        }

        const randomNumber = generateOTP(6);
        const message = `Dear User, Your OTP for ABC portal is : ${randomNumber}. - OTP valid for ${otpExpireIn} minutes.`;

        // we have credentials means will uncomment this
        // if (mobile) {
        //   try {
        // const sendMessage = await sendSMS(mobile, message);
        // if (sendMessage?.status === false || sendMessage?.code === '007') {
        //   return { success: false, msg: sendMessage?.description };
        // }
        //   } catch (error) {
        //     return { success: false, msg: error?.msg };
        //   }
        // } else {
        // email service can be integrated here to send OTP to email
        // }

        const hashOTP = await bcrypt.hash(randomNumber.toString(), 10);
        const { ip, userAgent } = requestMeta(req);

        await db.loginOtp.updateOne(
          { identifier },
          {
            $set: {
              code: hashOTP,
              expiresAt: new Date(Date.now() + parseInt(otpExpireIn) * 60 * 1000),
              attempts: 0,
              blockedUntil: null,
              type: mobile ? 'mobile' : 'email',
              meta: { ip, userAgent },
            }
          },
          { upsert: true }
        );

        return { success: true };
      };

      const filterQuery = mobile ? { mobile } : { email };
      const user = await db.user.findOne(filterQuery).lean();
      if (user) {
        if (user?.status === 'inactive') {
          return res.clientError({ msg: responseMessages[1020] });
        }
        if (user?.isDeleted) {
          return res.clientError({ msg: responseMessages[1021] });
        }

        const postOtp = await otpFunction();
        if (!postOtp.success) {
          return res.clientError({
            msg: postOtp?.msg || responseMessages[1007]
          });
        }

        return res.success({ msg: `${responseMessages[1006]} ${identifier}` });
      }

      const postOtp = await otpFunction();
      if (!postOtp.success) {
        return res.clientError({
          msg: postOtp?.msg || responseMessages[1007]
        });
      }

      const guestRole = await db.role.findOne({ isDeleted: false, name: roleNames.gu }).lean();
      req.body.role = guestRole._id;
      await db.user.create(req.body);

      return res.success({ msg: `${responseMessages[1006]} ${identifier}` });
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  verifyOtp: async (req, res) => {
    try {
      const { email, mobile, otp, device_id } = req.body;
      const identifier = mobile || email;
      const filterQuery = mobile ? { mobile } : { email };

      const selectUser = 'firstName lastName email mobile role status isDeleted';
      const user = await db.user.findOne(filterQuery)
        .populate('role', 'name')
        .select(selectUser)
        .lean();

      if (!user) return res.clientError({ msg: responseMessages[1019] });
      if (user?.status === 'inactive') return res.clientError({ msg: responseMessages[1020] });
      if (user?.isDeleted) return res.clientError({ msg: responseMessages[1021] });

      const checkOtp = await db.loginOtp.findOne({ identifier });
      if (!checkOtp) {
        return res.clientError({ msg: responseMessages[1009] });
      }

      if (checkOtp?.blockedUntil && checkOtp.blockedUntil > new Date()) {
        return res.clientError({
          msg: `Too many attempts. Try again after ${Math.ceil((checkOtp.blockedUntil - new Date()) / 60000)} minutes`
        });
      }

      if (checkOtp.expiresAt < new Date()) {
        await db.loginOtp.deleteOne({ userId: user._id });
        return res.clientError({ msg: responseMessages[1115] });
      }

      const isOtpValid = await bcrypt.compare(otp.toString(), checkOtp.code);
      if (!isOtpValid && (environment !== 'production' && otp !== '123456')) {
        checkOtp.attempts += 1;
        if (checkOtp.attempts >= 5) {
          checkOtp.blockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Block for 15 minutes
        }

        await checkOtp.save();
        const remaining = Math.max(0, 5 - checkOtp.attempts);
        return res.clientError({ msg: `OTP is incorrect. Only ${remaining} attempts left` });
      }

      const { ip } = requestMeta(req);
      const tokens = await setTokenOnRedis(
        req,
        user._id.toString(),
        device_id,
        ip,
        user.role.name,
        user.role._id.toString(),
      );

      db.user.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } })
        .catch(console.error);

      return res.success({
        msg: responseMessages[1008],
        result: { ...user, tokens }
      });
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      let decoded;
      try {
        decoded = await verifyRefreshToken(refreshToken);
      } catch (error) {
        return res.clientError({ msg: responseMessages[1024] });
      }

      if (!decoded) {
        return res.clientError({ msg: responseMessages[1024] });
      }

      const tokenFromRedis = await redisDecodeRefreshToken(req, decoded.user_id, decoded.deviceType);

      if (!tokenFromRedis) {
        return res.clientError({ msg: responseMessages[1025] });
      }

      const tokens = await setTokenOnRedis(
        req,
        decoded.user_id,
        decoded.device_id,
        decoded.ip,
        decoded.roleType,
        decoded.roleId,
      );

      return res.success({
        msg: responseMessages[1023],
        result: tokens
      });
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  logout: async (req, res) => {
    try {
      const { user_id, deviceType } = req.decoded;

      await removeTokenFromRedis(user_id, deviceType);

      return res.success({ msg: responseMessages[1013] });
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  forgotPassword: async (req, res) => {
    try {
      const { mobile, email } = req.body;
      const identifier = mobile || email;

      const filterQuery = mobile ? { mobile } : { email };
      const user = await db.user.findOne(filterQuery, { _id: 1, status: 1, isDeleted: 1 }).lean();

      let resetToken;
      if (user) {
        if (user?.status === 'inactive') {
          return res.success({ msg: responseMessages[1026] });
        }
        if (user?.isDeleted) {
          return res.success({ msg: responseMessages[1026] });
        }

        resetToken = require('crypto').randomBytes(32).toString('hex');
        const hashToken = await bcrypt.hash(resetToken, 10);

        await db.loginOtp.updateOne(
          { identifier, type: mobile ? 'mobile' : 'email' },
          {
            $set: {
              code: hashToken,
              expiresAt: new Date(Date.now() + 15 * 60 * 1000),
              attempts: 0,
              blockedUntil: null,
              type: mobile ? 'mobile' : 'email',
              meta: requestMeta(req),
              purpose: 'forgot_password'
            }
          },
          { upsert: true }
        );
      }

      const response = {
        msg: responseMessages[1026],
        result: {}
      };

      if (environment !== 'production' && user) {
        response.result.resetToken = resetToken;
      }

      return res.success(response);
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  resetPassword: async (req, res) => {
    try {
      const { identifier, resetToken, newPassword } = req.body;

      const isMobile = Number(identifier);
      const filterQuery = isMobile ? { mobile: identifier.trim() } : { email: identifier.trim().toLowerCase() };

      const user = await db.user.findOne(filterQuery, { _id: 1, status: 1, isDeleted: 1 }).lean();

      if (!user) {
        return res.clientError({ msg: responseMessages[1019] });
      }

      if (user?.status === 'inactive') {
        return res.clientError({ msg: responseMessages[1020] });
      }

      if (user?.isDeleted) {
        return res.clientError({ msg: responseMessages[1021] });
      }

      const checkResetToken = await db.loginOtp.findOne(
        { identifier, purpose: 'forgot_password', type: isMobile ? 'mobile' : 'email' },
        { blockedUntil: 1, expiresAt: 1, code: 1, attempts: 1 }
      );

      if (!checkResetToken) {
        return res.clientError({ msg: responseMessages[1030] });
      }

      if (checkResetToken?.blockedUntil && checkResetToken.blockedUntil > new Date()) {
        return res.clientError({
          msg: `Too many attempts. Try again after ${Math.ceil((checkResetToken.blockedUntil - new Date()) / 60000)} minutes`
        });
      }

      if (checkResetToken.expiresAt < new Date()) {
        await db.loginOtp.deleteOne({ identifier });
        return res.clientError({ msg: responseMessages[1115] });
      }

      const isTokenValid = await bcrypt.compare(resetToken.toString(), checkResetToken.code);
      if (!isTokenValid) {
        checkResetToken.attempts += 1;
        if (checkResetToken.attempts >= 5) {
          checkResetToken.blockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        }

        await checkResetToken.save();
        const remaining = Math.max(0, 5 - checkResetToken.attempts);
        return res.clientError({ msg: `Invalid token. Only ${remaining} attempts left` });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db.user.updateOne(
        { _id: user._id },
        { $set: { password: hashedPassword } }
      );

      await db.loginOtp.deleteOne({ identifier });

      await removeAllTokensFromRedis(user._id.toString());

      return res.success({ msg: responseMessages[1027] });
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  changePassword: async (req, res) => {
    try {
      const { user_id } = req.decoded;
      const { currentPassword, newPassword } = req.body;

      const user = await db.user.findOne({ _id: user_id }, { password: 1 });

      if (!user) {
        return res.clientError({ msg: responseMessages[1019] });
      }

      const passwordIsValid = await bcrypt.compare(currentPassword, user.password);
      if (!passwordIsValid) {
        return res.clientError({ msg: responseMessages[1029] });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db.user.updateOne(
        { _id: user_id },
        { $set: { password: hashedPassword } }
      );

      await removeAllTokensFromRedis(user_id);

      return res.success({ msg: responseMessages[1028] });
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  profile: async (req, res) => {
    try {
      const { user_id } = req.decoded;

      const user = await db.user.findOne({ _id: user_id }, { password: 0 })
        .populate('role', 'name')
        .lean();

      if (!user) {
        return res.clientError({ msg: responseMessages[1019] });
      }

      if (user.status === 'inactive') {
        return res.clientError({ msg: responseMessages[1020] });
      }

      if (user.isDeleted) {
        return res.clientError({ msg: responseMessages[1021] });
      }

      return res.success({
        msg: responseMessages[1031],
        result: user
      });
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  }
};