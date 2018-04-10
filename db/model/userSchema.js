const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const userSchema = mongoose.Schema({
  nickname: {
    type: String,
    require: true,
  },
  username: {
    type: String,
    require: true,
    index: true,
    unique: true
  },
  password: {
    type: String,
    require: true,
    index: true,
  },
  uuid: Schema.Types.Array
}, { timestamps: true });


userSchema.methods.toSafeObject = function () {
  const user = this.toObject();

  ['updatedAt', 'password','createdAt'].forEach(key => {
    delete user[key];
  });

  return user;
};

module.exports = userSchema;