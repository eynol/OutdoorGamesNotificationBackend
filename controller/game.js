const db = require('../db/index');
const Game = db.Game;
const JoinList = db.JoinList;
const User = db.User;

const schedule = require('./schedule');
const clientBus = require('./connections');


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
  return Game.findByIdAndUpdate(gid, data, { new: true }).then(game => {
    const channel = clientBus.ChannelManager.get(gid);
    if (channel) {
      channel.broadcast({
        type: 'dispatch',
        action: { type: 'games/fetchDetail', payload: gid }
      });
    }

    //定时器时间修改

    schedule.cancelAutoBegin(gid);
    schedule.cancelAutoEnd(gid);

    schedulerFactory(new Date())(game);

    return game;
  });
};

exports.deleteGame = function ({ gid }) {
  return Promise.all([
    Game.deleteOne({ _id: gid }),
    JoinList.deleteMany({ _gameId: gid }).exec()
  ]).then(ret => {
    const channel = clientBus.ChannelManager.get(gid);
    if (channel) {
      channel.broadcast({
        type: 'dispatch',
        action: { type: 'games/gameover', payload: gid }
      });
    }

    return ret;
  });
};

exports.getJoinList = function (gid) {
  return JoinList.find({ _gameId: gid });
};

exports.addAdmin = function (gid, uid) {
  return Promise.all([
    Game.findById(gid),
    User.findById(uid)
  ]).then(([game, user]) => {
    if (game) {
      if (game.allowedAdmins.includes(uid)) {
        return Promise.resolve();
      } else {
        game.allowedAdmins.push(uid);
        return game.save().then(game => {

          const channel = clientBus.ChannelManager.get(gid);
          if (channel) {
            channel.broadcast({
              type: 'dispatch',
              action: { type: 'games/fetchDetail', payload: gid }
            });
          }

          return [game, user];
        });
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

    if (!theTeam.members.find(m => m._id === user._id.toString())) {
      theTeam.members.push({
        _id: user._id.toString(),
        nickname: user.nickname,
        score: 0
      });
      return theTeam.save();
    } else {
      return theTeam;
    }
  }).then((team) => {
    const channel = clientBus.ChannelManager.get(gid);
    if (channel) {
      channel.broadcast({
        type: 'dispatch',
        action: { type: 'games/getJoinList', payload: gid }
      });
    }
    return exports.getJoinList(gid);
  });
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
  }).then(() => {
    const channel = clientBus.ChannelManager.get(gid);
    if (channel) {
      channel.broadcast({
        type: 'dispatch',
        action: { type: 'games/getJoinList', payload: gid }
      });
    }
  });
};

exports.scoreAdd = function ({ gid, uid, score, teamid, isTeam }) {
  return JoinList.findById(teamid).then(joinList => {
    if (joinList) {
      if (isTeam) {
        joinList.teamScore += score;
      } else {
        let member = joinList.members.find(mem => mem._id.toString() === uid);
        member.score += score;
        joinList.markModified('members');
      }
      return joinList.save();
    } else {
      return Promise.reject('无对应队伍');
    }
  }).then(ret => {
    const channel = clientBus.ChannelManager.get(gid);
    if (channel) {
      channel.broadcast({
        type: 'dispatch',
        action: { type: 'games/getJoinList', payload: gid }
      });
    }
    return ret;
  });
};

exports.scoreMinus = function ({ gid, uid, teamid, isTeam, score }) {
  return JoinList.findById(teamid).then(joinList => {
    if (joinList) {
      if (isTeam) {
        joinList.teamScore -= score;
      } else {
        let member = joinList.members.find(mem => mem._id.toString() === uid);
        member.score -= score;
        joinList.markModified('members');
      }
      return joinList.save();
    } else {
      return Promise.reject('无对应队伍');
    }
  }).then((ret) => {
    const channel = clientBus.ChannelManager.get(gid);
    if (channel) {
      channel.broadcast({
        type: 'dispatch',
        action: { type: 'games/getJoinList', payload: gid }
      });
    }
    return ret;
  });
};

exports.updateTeamName = function ({ teamid, name }) {
  return JoinList.findById(teamid).then(joinList => {
    if (joinList) {
      joinList.team = name;
      return joinList.save().then(ret => {
        const gid = joinList._gameId;
        const channel = clientBus.ChannelManager.get(gid);
        if (channel) {
          channel.broadcast({
            type: 'dispatch',
            action: { type: 'games/getJoinList', payload: gid }
          });
        }
        return ret;
      });
    } else {
      return Promise.reject('无对应队伍 ');
    }
  });
};

exports.createTeam = function ({ gid, name }) {
  return Game.findById(gid)
    .then(game => {
      if (game.joinType === 'team') {
        return game;
      } else {
        return Promise.reject('个人游戏无法新增团队');
      }
    })
    .then(game => JoinList.create({
      _gameId: gid,
      _gameType: game.joinType,
      team: name || 'TeamName',
      members: [],
      teamScore: 0,
    })).then(ret => {
      const channel = clientBus.ChannelManager.get(gid);
      if (channel) {
        channel.broadcast({
          type: 'dispatch',
          action: { type: 'games/getJoinList', payload: gid }
        });
      }
      return ret;
    });
};


exports.deleteTeam = function ({ teamid, name }) {
  return JoinList.findById(teamid).then(list => {
    if (list) {
      if (list.members.length) {
        return Promise.reject('队伍人数不为空 ');
      } else {
        return JoinList.deleteOne({ _id: teamid }).then(ret => {
          const gid = list._gameId;

          const channel = clientBus.ChannelManager.get(gid);
          if (channel) {
            channel.broadcast({
              type: 'dispatch',
              action: { type: 'games/getJoinList', payload: gid }
            });
          }

          return ret;
        });
      }
    } else {
      return Promise.reject('无法找到对应的队伍');
    }
  });
};
exports.switchTeam = function ({ teamid, uid, originteam }) {

  let gid;
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
    gid = oldTeam._gameId;

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

  }).then(list => {

    const channel = clientBus.ChannelManager.get(gid);
    if (channel) {
      channel.broadcast({
        type: 'dispatch',
        action: { type: 'games/getJoinList', payload: gid }
      });
    }
    return list;
  });
};


exports.beginGame = function ({ gid }) {
  return Game.findById(gid).then(game => {
    if (game.status === 'waiting') {
      game.status = 'gaming';
      return game.save();
    } else {
      return game;
    }
  }).then(game => {
    const channel = clientBus.ChannelManager.get(gid);
    if (channel) {
      channel.broadcast({
        type: 'dispatch',
        action: { type: 'games/fetchDetail', payload: gid }
      });
    }
    return game;
  });
};
exports.endGame = function ({ gid }) {
  return Game.findById(gid).then(game => {
    if (game.status !== 'finished') {
      game.status = 'finished';
      return game.save();
    } else {
      return game;
    }
  }).then(game => {
    const channel = clientBus.ChannelManager.get(gid);
    if (channel) {
      channel.broadcast({
        type: 'dispatch',
        action: { type: 'games/fetchDetail', payload: gid }
      });
    }
    return game;
  });
};






/****
 * 
 * 读取未完成的游戏，设置定时任务；
 * 
 * */
(function () {
  Game.find({ status: { $ne: 'finished' } }).then(games => {
    const now = new Date();
    games.map(schedulerFactory(now));
  });
}());

function schedulerFactory(now) {
  return (game) => {
    if (now < game.beginTime) {
      if (game.autoBegin) {
        schedule.whenGameBeginAt(game._id, game.beginTime, () => {
          exports.beginGame({ gid: game._id });
        });
      }
      if (game.autoEnd) {
        schedule.whenGameEndAt(game._id, game.endTime, () => {
          exports.endGame({ gid: game._id });
        });
      }
    } else if (game.beginTime <= now && now < game.endTime) {
      if (game.autoBegin) {
        exports.beginGame({ gid: game._id });
      }
      if (game.autoEnd) {
        schedule.whenGameEndAt(game._id, game.endTime, () => {
          exports.endGame({ gid: game._id });
        });
      }
    } else {
      if (game.autoEnd) {
        exports.endGame({ gid: game._id });
      } else if (game.autoBegin) {
        exports.beginGame({ gid: game._id });

      }
    }
  };
}