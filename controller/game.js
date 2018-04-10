const Game = require('../db/index').Game;

exports.createGame = function (game) {

  game.status = 'waiting';
  game.allowedAdmins = [];

  return Game.create(game).then(gameDoc => {
    if (gameDoc) {
      return gameDoc;
    }
  });
};

exports.getAllGames = function () {
  return Game.find({});
};

exports.getGameDetail = function (gid) {
  return Game.findOne({ _id: gid }).then(game => {
    if (game) {
      return game.moreDetail();
    } else {
      return Promise.reject('Not Found');
    }
  });
};


exports.deleteGame = function (gid) {
  return Game.deleteOne({ _id: gid });
};