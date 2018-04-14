const sha256 = require('crypto-js/sha256');
const hmacSHA512 = require('crypto-js/hmac-sha512');
const Base64 = require('crypto-js/enc-base64');



module.exports = function encode(message, nonce = '', path = '/', privateKey = 'dooooooooooooooooooooor') {
  const hashDigest = sha256(nonce + message);
  const hmacDigest = Base64.stringify(hmacSHA512(path + hashDigest, privateKey));
  return hmacDigest.toString();
};

module.exports.sha256 = function (message) {
  return sha256('websocket' + message).toString();
};
