const $ = require('../routeFactory');

const index = $('get', '/', (req, res, next) => {
  res.send({ hellow: 2 });
  next();
});

module.exports = [index];