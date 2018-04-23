const db = require('../db/index');
const Game = db.Game;
const JoinList = db.JoinList;
const User = db.User;
exports.createGame = function (game) {

  game.status = 'waiting';
  game.allowedAdmins = [];

  return Game.create(game).then(gameDoc => {
    if (gameDoc) {
      return JoinList.create({
        _gameId: gameDoc._id,
        _gameType: gameDoc.joinType,
        team: '默认队伍',
        members: [],
        teamScore: 0,
      }).then(() => {
        return gameDoc;
      });
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
      return Promise.reject('游戏被删除了或不存在');
    }
  });
};


exports.updateGame = function (params) {
  const { gid, uid, ...data } = params;
  return Game.findByIdAndUpdate(gid, data).exec();
};

exports.deleteGame = function ({ gid }) {
  return Promise.all([
    Game.deleteOne({ _id: gid }),
    JoinList.deleteMany({ _gameId: gid }).exec()
  ]);
};

exports.getJoinList = function (gid) {
  return JoinList.find({ _gameId: gid });
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

exports.joinGame = function ({ uid, gid, teamid }) {
  return Promise.all([
    Game.findById(gid).exec(),
    User.findById(uid).exec(),
    JoinList.find({ _gameId: gid }).exec()
  ]).then(([game, user, joinLists]) => {

    let theTeam = null;
    if (game.joinType === 'team') {
      //保证没有加入过其他游戏；
      const joinedTeam = joinLists.find(team => {
        return team.members.find(member => {
          return member._id.toString() === user._id.toString();
        });
      });

      if (joinedTeam) {
        return Promise.reject('已经加入过团队了');
      }

      theTeam = joinLists.find(team => {
        return team._id.toString() === teamid;
      });
    } else if (game.joinType === 'individual') {
      theTeam = joinLists[0];
    } else {
      return Promise.reject('未知游戏类型');
    }

    if (!theTeam) {
      return Promise.reject('没有队伍可以加入');
    }

    theTeam.members.push({
      _id: user._id.toString(),
      nickname: user.nickname,
      score: 0
    });
    return theTeam.save();
  }).then(() => exports.getJoinList(gid));
};

exports.exitGame = function ({ gid, uid, teamid }) {
  return Promise.all([
    Game.findById(gid).exec(),
    JoinList.findById(teamid),
  ]).then(([game, joinList]) => {
    const adminIndex = game.allowedAdmins.findIndex(v => v === uid);
    if (~adminIndex) {
      game.allowedAdmins.splice(adminIndex, 1);
      return game.save();
    } else {
      const playerIndex = joinList.members.findIndex(v => v._id.toString() === uid);
      if (~playerIndex) {
        joinList.members.splice(playerIndex, 1);
        return joinList.save();
      } else {
        return Promise.reject('没有找到用户');
      }
    }
  });
};

exports.scoreAdd = function ({ gid, uid, score, teamid, isTeam }) {
  return JoinList.findById(teamid).then(joinList => {
    if (joinList) {
      if (isTeam) {
        joinList.teamScore += score;
      } else {
        let member = joinList.find(mem => mem.id.toString() === uid);
        member.score += score;
      }
      return joinList.save();
    } else {
      return Promise.reject('wu duiying duiwu ');
    }
  });
};

exports.scoreMinus = function ({ gid, uid, teamid, isTeam, score }) {
  return JoinList.findById(teamid).then(joinList => {
    if (joinList) {
      if (isTeam) {
        joinList.teamScore -= score;
      } else {
        let member = joinList.find(mem => mem.id.toString() === uid);
        member.score -= score;
      }
      return joinList.save();
    } else {
      return Promise.reject('wu duiying duiwu ');
    }
  });
};

exports.updateTeamName = function ({ teamid, name }) {
  return JoinList.findById(teamid).then(joinList => {
    if (joinList) {
      joinList.team = name;
      return joinList.save();
    } else {
      return Promise.reject('wu duiying duiwu ');
    }
  });
};

exports.createTeam = function ({ gid, name }) {
  return Game.findById(gid)
    .then(game => JoinList.create({
      _gameId: gid,
      _gameType: game.joinType,
      team: name || 'TeamName',
      members: [],
      teamScore: 0,
    }));
};


exports.deleteTeam = function ({ teamid, name }) {
  return JoinList.findById(teamid).then(list => {
    if (list) {
      if (list.members.length) {
        return Promise.reject('duiwu rensu buweikong ');
      } else {
        return JoinList.deleteOne({ _id: teamid });
      }
    } else {
      return Promise.reject('无法找到对应的队伍');
    }
  });
};
exports.switchTeam = function ({ teamid, uid, originteam }) {


  return Promise.all([
    JoinList.findById(teamid),
    JoinList.findById(originteam)
  ]).then(([newTeam, oldTeam]) => {
    if (!newTeam) {
      return Promise.reject('要加入的队伍不存在');
    }
    if (!oldTeam) {
      return Promise.reject('所在的队伍不存在');
    }

    const nMembers = newTeam.members;
    const oMembers = oldTeam.members;

    const record = oMembers.splice(
      oMembers.findIndex(
        m => m._id.toString() === uid
      ) >>> 0, 1
    );
    if (record.length === 0) {
      return Promise.reject('原队伍不正确');
    }

    nMembers.push(record.pop());

    return Promise.all([
      oldTeam.save(),
      newTeam.save()
    ]);

  });
};


exports.beginGame = function ({ gid }) {
  return Game.findByIdAndUpdate(gid, { status: 'gaming' }).exec();
};
exports.endGame = function ({ gid }) {
  return Game.findByIdAndUpdate(gid, { status: 'finished' }).exec();
};