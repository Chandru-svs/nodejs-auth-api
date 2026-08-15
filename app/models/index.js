const db = {};

db.role = require('./role');
db.user = require('./user');
db.loginOtp = require('./login_otp');

module.exports = db;