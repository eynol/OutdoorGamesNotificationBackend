const SYSTEM_ID = require('../db/model/messageSchema').SYSTEM_ID;

const clientBus = require('./connections');


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

exports.SYSTEM_ID = SYSTEM_ID;
exports.MSG_TYPE = MSG_TYPE;
exports.fetchAllMessage = function (gid) {
  return Message.find({ _gameId: gid }).sort({ 'createdAt': 1 }).exec();
};


exports.storeMessage = function (gid, { _creator, text }, toWho, groupid, userid) {
  return Promise.all([
    _creator === SYSTEM_ID
      ? Promise.resolve({ _id: SYSTEM_ID, nickname: 'system' })
      : User.findById(_creator),
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
      const messageRecievers = recievers.map(id => ({ _id: id, read: (id === _creator) }));

      if (!recievers.includes(_creator)) {
        messageRecievers.push({ _id: _creator, read: true });
      }

      const anyOneNotRead = messageRecievers.find(r => r.read === false);

      return Message.create({
        _gameId: gid,
        _creator_nick,
        _creator,//创建者
        reciever: messageRecievers,//接受者
        text,//推送消息
        read: anyOneNotRead ? false : true,//是否全部已读
        drop: false,
      });
    });

};


exports.createSystemMessage = function (gid, text) {
  return exports.storeMessage(gid, { _creator: SYSTEM_ID, _creator_nick: 'system', text }, MSG_TYPE.all);
};


exports.drop = function (mid) {
  return Message.findByIdAndUpdate(mid, { drop: true }).then(msg => {
    const gid = msg._gameId;
    const channel = clientBus.ChannelManager.get(gid);
    if (channel) {
      channel.broadcast({
        type: 'dispatch',
        action: { type: 'messages/drop', payload: mid }
      });
    }

    return 'ok';
  });
};


exports.read = function ({ uid, mid }) {
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
