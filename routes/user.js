
const $ = require('../routeFactory');

const userManager = require('../controller/user');



const signin = $('post', '/user/signin', (req, res, next) => {
  userManager.signIn(req.body).then(user => {
    res.send({ status: 200, fromhttp: 1, user: user });
    next();
  })
    .catch(e => {
      if (e === '用户不存在' || e === '密码错误') {
        res.send({ status: 400, fromhttp: 1, message: e });
        next();
      } else {
        return Promise.reject(e);
      }
    })
    .catch(res.commonReject(next));
});

const signup = $('post', '/user/signup', (req, res, next) => {
  userManager.createUser(req.body).then(user => {
    res.send({ status: 200, fromhttp: 1, user: user });
    next();
  }).catch(e => {
    if (e === '用户名已被注册') {
      res.send({ status: 400, fromhttp: 1, message: e });
      next();
    } else {
      return Promise.reject(e);
    }
  }).catch(res.commonReject(next));
});

const updateNickname = $('post', '/user/updatenickname', (req, res, next) => {

  const uid = req.body._id;
  const nickname = req.body.nickname;

  userManager.updateUserNickname(uid, nickname).then(() => {
    res.send({ status: 200, result: { nickname } });
    next();
  }).catch(res.commonReject(next));
});

const updatePassword = $('post', '/user/updatepassword', (req, res, next) => {

  const uid = req.body._id;
  const password = req.body.password;

  userManager.updateUserPassword(uid, password).then(() => {
    res.send({ status: 200, message: 'succeed!' });
    next();
  }).catch(res.commonReject(next));
});

module.exports = [signin, signup, updateNickname, updatePassword];