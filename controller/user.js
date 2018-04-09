const User = require('../db/index').User;

exports.createUser = function ({ nickname, username, password }) {
  return User.create({ nickname, username, password }).then(user => {
    if (user) {
      return user.toJson();
    }
  });
};

exports.deleteUser = function (uid) {
  return User.deleteOne({ _id: uid });
};