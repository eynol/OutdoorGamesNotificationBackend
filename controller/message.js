const db = require('../db/index');
const Game = db.Game;
const JoinList = db.JoinList;
const User = db.User;
const Message = db.Message;

const MSG_TYPE = {
  all: 'all',
  group: 'group',
  one: 'one',
};


exports.fetchAllMessage = function (gid) {
  return Message.find({ _gameId: gid }).sort({ 'createdAt': 1 }).exec();
};


exports.storeMessage = function (gid, { _creator, text }, toWho, groupid, userid) {
  return Promise.all([
    User.findById(_creator),
    Game.findById(gid),
    JoinList.find({ _gameId: gid }),
  ])
    .then(([user, game, teams]) => {
      if (!user || !game || !teams.length) {
        return Promise.reject('参数错误');
      } else {

        const recievers = [];

        switch (toWho) {
          case MSG_TYPE.all: {

            recievers.push(game.owner.toString());//所有者

            if (game.allowedAdmins.length) {
              recievers.push(...game.allowedAdmins);
            }

            teams.forEach((joinList => {
              joinList.members.forEach(member => {
                recievers.push(member._id.toString());
              });
            }));

            break;
          }
          case MSG_TYPE.group: {

            let theTeam = teams.find(t => t._id.toString() === groupid);
            if (!theTeam) {
              return Promise.reject('队伍不存在');
            } else {
              theTeam.members.forEach(member => {
                recievers.push(member._id.toString());
              });
            }

            break;
          }
          case MSG_TYPE.one: {

            recievers.push(userid);
            break;
          }
        }
        return [user.nickname, recievers];
      }
    })
    .then(([_creator_nick, recievers]) => {
      const messageRecievers = recievers.map(id => ({ _id: id, read: false }));

      if (!recievers.includes(_creator)) {
        messageRecievers.push({ _id: _creator, read: true });
      }

      return Message.create({
        _gameId: gid,
        _creator_nick,
        _creator,//创建者
        reciever: messageRecievers,//接受者
        text,//推送消息
        read: false,//是否全部已读
        drop: false,
      });
    });

};

exports.read = function (uid, mid) {
  return Message.findById(mid).then(message => {
    const thePerson = message.reciever.find(r => r._id === uid);
    if (thePerson) {
      thePerson.read = true;

      const anyOneNotRead = message.reciever.find(r => r.read === false);
      if (!anyOneNotRead) {
        message.read = true;
      }

      return message.save();
    } else {
      throw Promise.reject('用户id错误');
    }

  });
};