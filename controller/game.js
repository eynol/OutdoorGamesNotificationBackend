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

exports._getGame = function (gid) {
  return Game.findById(gid).then(game => {
    if (game) {
      return game.moreDetail();
    } else {
      return Promise.reject('Not Found');
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

exports.getJoinList = function (gid) {
  return Game.find({ _gameId: gid });
};

exports.addAdmin = function (gid, uid) {
  return Game.findById(gid).then(game => {
    if (game) {
      if (game.allowedAdmins.includes(uid)) {
        return Promise.resolve();
      } else {
        game.allowedAdmins.push(uid);
        return game.save();
      }
    } else {
      return Promise.reject('Not Found');
    }
  });
};