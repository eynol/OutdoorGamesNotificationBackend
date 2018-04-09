
const $ = require('../routeFactory');

const userManager = require('../controller/user');


const index = $('get', '/user', (req, res, next) => {

  res.send({ hellow: 2 });
  next();
});

module.exports = [index];