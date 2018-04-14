const $ = require('../routeFactory');
const gameManager = require('../controller/game');

const getGames = $('get', '/gaming', (req, res, next) => {
  gameManager.getAllGames().then((games) => {
    res.send({ list: games });
    next();
  }).catch(res.commonReject(next));
});


module.exports = [getGames];