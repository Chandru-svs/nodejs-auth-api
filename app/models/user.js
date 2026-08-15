const mongoose = require('mongoose');

module.exports = mongoose.model(
  'user',
  new mongoose.Schema(
    {
      firstName: { type: String, trim: true },
      lastName: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
      mobile: { type: String, trim: true, unique: true, sparse: true },
      password: String,
      role: { type: mongoose.Schema.Types.ObjectId, ref: 'role' },
      mobileVerified: { type: Boolean, default: false },
      emailVerified: { type: Boolean, default: false },
      dob: { type: Date, default: null },
      imgUrl: String,
      gender: String,
      currentAddress: String,
      permanentAddress: String,
      lastLogin: { type: Date, default: Date.now },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
      status: { type: String, enum: ['active', 'inactive'], default: 'active' },
      isDeleted: { type: Boolean, default: false }
    },
    { timestamps: true, versionKey: false }
  ),
  'user'
);