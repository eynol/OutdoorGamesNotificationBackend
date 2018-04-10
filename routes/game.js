const $ = require('../routeFactory');
const gameManager = require('../controller/game');

const getGames = $('get', '/games', (req, res, next) => {
  gameManager.getAllGames().then((games) => {
    res.send({ list: games });
    next();
  }).catch(res.commonReject(next));
});

const getGameDetail = $('get', '/games/detail/:gid', (req, res, next) => {
  const gid = req.params.gid;

  gameManager.getGameDetail(gid).then((detail) => {
    res.send({ currentGame: detail });
    next();
  }).catch(res.commonReject(next));
});

const newgame = $('post', '/games/newgame', (req, res, next) => {
  gameManager.createGame(req.body).then((game) => {
    res.send({ status: 200, result: game });
    next();
  }).catch(res.commonReject(next));
});




module.exports = [getGames, getGameDetail, newgame];