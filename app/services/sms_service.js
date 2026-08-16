const axios = require('axios');
const { apiKey, senderId } = require('../config/env.config').sms;

const sendSMS = async (mobile, message) => {
  const url = `http://sms.abc.in/vb/apikey.php?apikey=${apiKey}&senderid=${senderId}&number=${mobile}&message=${message}`;

  const resp = await axios.get(url);
  return resp.data;
};

module.exports = {
  sendSMS,
};
