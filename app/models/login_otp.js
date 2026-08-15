const mongoose = require('mongoose');

const otpSchema = mongoose.Schema(
  {
    identifier: { type: String, required: true, index: true },
    type: { type: String, enum: ['mobile', 'email'], required: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    blockedUntil: { type: Date, default: null },
    meta: { ip: String, userAgent: String },
  },
  { timestamps: true, versionKey: false }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('login_otp', otpSchema, 'login_otp');