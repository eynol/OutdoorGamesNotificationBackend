const sha256 = require('crypto-js/sha256');

module.exports = function () {
  return sha256(Date.now().toString() + '' + (Math.random() * 123).toFixed(5)).toString();
};