const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const userSchema = mongoose.Schema({
  nickname: String,
  username: String,
  password: String,
  uuid: Schema.Types.Array
}, { timestamps: true });

module.exports = userSchema;