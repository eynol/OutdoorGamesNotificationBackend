const mongoose = require('mongoose');

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
  uuid: [String]
}, { timestamps: true });


userSchema.methods.toSafeObject = function () {
  const user = this.toObject();

  ['updatedAt', 'password', 'createdAt', 'uuid'].forEach(key => {
    delete user[key];
  });

  return user;
};

userSchema.methods.upsertUUID = function (uuid) {

  if (this.uuid.includes(uuid)) {
    return Promise.resolve(this);
  } else {
    this.uuid.push(uuid);
    return this.save();
  }
};

module.exports = userSchema;