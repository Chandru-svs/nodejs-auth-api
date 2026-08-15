const mongoose = require('mongoose');

module.exports = mongoose.model(
  'role',
  new mongoose.Schema(
    {
      name: { type: String, trim: true, uppercase: true },
      status: { type: String, enum: ['active', 'inactive'], default: 'active' },
      isDeleted: { type: Boolean, default: false }
    },
    { timestamps: true, versionKey: false }
  ),
  'role'
);