const $ = require('../routeFactory');


const index = $('get', '/games', (req, res, next) =>{


  res.send({ hellow: 2 });
  next();
});



module.exports = [index];