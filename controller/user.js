const User = require('../db/index').User;

exports.createUser = function ({ nickname, username, password }) {
  return User.create({ nickname, username, password }).then(user => {
    if (user) {
      return user.toSafeObject();
    }
  }).catch(e => {
    if (~e.message.search('E11000')) {
      return Promise.reject('用户名已被注册');
    }
    return Promise.reject(e);
  });
};

exports.signIn = function (username, password) {
  return User.findOne({ username: username }).then(user => {
    if (user) {
      if (user.password === password) {
        return user.toSafeObject();
      } else {
        return Promise.reject('密码错误');
      }
    } else {
      return Promise.reject('用户不存在');
    }
  });
};


exports.updateUser = function (uid, props) {
  return User.findByIdAndUpdate(uid, props, { new: true }).then(user => {
    if (user) { return user.toSafeObject(); }
    else return Promise.reject('Not Found');
  });
};

exports.updateUserNickname = function (uid, nickname) {
  return exports.updateUser(uid, { nickname });
};

exports.updateUserPassword = function (uid, password) {
  return exports.updateUser(uid, { password });
};

exports.deleteUser = function (uid) {
  return User.deleteOne({ _id: uid }).then(user => {
    if (user) { return user.toSafeObject(); }
    else return Promise.reject('Not Found');
  });
};