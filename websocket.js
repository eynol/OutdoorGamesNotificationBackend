
const gerateUUID = require('./utils/gerateUUID');
const encode = require('./utils/encode');

const Game = require('./controller/game');

const User = require('./controller/user');

const Message = require('./controller/message');

const config = require('./config');
const publicPath = config.env.publicPath;

const clientsBus = require('./controller/connections');


function WSServer(server) {
  var WebSocketServer = require('ws').Server;
  var wss = new WebSocketServer({ server: server });

  wss.on('close', function (ws) {

    const client = clientsBus.get(ws.$$session);

    console.log('close', ws);
  });
  wss.on('connection', function (ws) {
    const badResult = (e) => {
      console.error(e);
      sendJSON(ws, {
        type: 'error', e
      });
    };
    console.log('connection');//eslint-disable-line
    ws.on('close', function (code, reason) {
      //eslint-disable-next-line
      console.info('STREAM_CLOSE_WS');
      //eslint-disable-next-line
      console.dir(code, reason);
      clientsBus.checkOut(ws.$$session, 'close');
    });

    // `data`: Buffer
    ws.on('message', function (data) {
      if (data === '1') {
        clientsBus.pingpong(ws.$$session);
        return;
      }
      try {
        data = JSON.parse(data);

        switch (data.type) {
          case 'http': {
            websocketHttpHandler(data, ws);
            break;
          }
          case 'ASSISTANT_REQ': {

            const { gid, uid } = data;
            Promise.all([
              User._getUser(uid),
              Game._getGame(gid),
            ]).then(([user, game]) => {
              const safeUser = user.toSafeObject();
              const ownerid = game.owner.toString();

              //先看对应的管理员是否在线
              let online = false;
              for (const client of clientsBus.clients.values()) {
                if (client.uid === ownerid) {
                  //对应的管理员在线
                  //向其询问是否允许申请
                  online = true;
                  sendJSON(client.ws, { type: 'ASSISTANT_REQ', user: safeUser, game: game });

                }
              }

              if (!online) {
                sendJSON(ws, {
                  type: 'ASSISTANT_RESP',
                  result: '管理员不在线'
                });
              }
            }).catch(badResult);

            break;
          }
          case 'ASSISTANT_RESP': {

            const { gid, uid, result } = data;

            Promise.resolve(0).then(() => {
              if (result === 'ok') {
                //owner allowed someone to help
                return Game.addAdmin(gid, uid);
              } else {
                //owner not allowed someone to help
                return;
              }
            }).then(() => {
              //先看对应的管理员是否在线
              for (const client of clientsBus.clients.values()) {
                if (client.uid === uid) {
                  //对应的管理员在线
                  //告诉申请管理的结果是什么
                  sendJSON(client.ws, { type: 'ASSISTANT_RESP', result });
                }
              }

            }).catch(badResult);



            break;
          }
          case 'auth-2': {

            const { token, uid } = data;

            User.getUUID(uid).then(uuid => {
              const encryptList = uuid.map(val => encode(val, 'websocket', '/', ws.$$session));
              // const encryptList = uuid.map(val => encode.sha256(val + ws.$$session));
              console.log(encryptList, uid);
              if (encryptList.includes(token)) {
                clientsBus.ticketChecked(ws.$$session, uid);
                sendJSON(ws, {
                  type: 'auth-3',
                  result: 'ok'
                });
              } else {
                return Promise.reject({ message: '验证失败!' });
              }
            }).catch(e => {
              sendJSON(ws, {
                type: 'auth-3',
                result: e.message,
                reason: 'auth'
              });
              clientsBus.checkOut(ws.$$session, 'auth');
            });
            break;
          }
          case 'joinGame': {
            clientsBus.joinGame(ws.$$session, data.gid);
            break;
          }
          case 'fetchMessages': {
            const client = clientsBus.get(ws.$$session);
            Message.fetchAllMessage(client.gid).then(messages => {
              sendJSON(ws, { type: 'fetchMessages', messages });
            });
            break;
          }
          case 'push': {
            const { toWho, group, person, text, creator: _creator } = data;
            const client = clientsBus.get(ws.$$session);
            const { gid, channel } = client;
            const channelMembers = channel.members;

            Message.storeMessage(gid, { text, _creator }, toWho, group, person)
              .then(message => {
                console.log(message);
                message.reciever.forEach(reciever => {
                  const uid = reciever._id.toString();
                  if (channelMembers.has(uid)) {
                    const $ws = channelMembers.get(uid);
                    sendJSON($ws, { type: 'push', message });
                    console.log('send push');
                  }
                });
              }).then(() => {
                sendJSON(ws, { type: 'pushMessageResult', status: 'ok' });
              }).catch(e => {
                sendJSON(ws, { type: 'pushMessageResult', status: 'error', message: e.message || e });
              });
            break;
          }
          case 'read': {
            const client = clientsBus.get(ws.$$session);
            const { mid } = data;
            const uid = client.uid;


            Message.read(uid, mid);

            break;
          }
          default: { break; }
        }
      } catch (e) {
        console.error(e);//eslint-disable-line
      }

    });



    const session = gerateUUID();
    sendJSON(ws, {
      type: 'auth-1',
      session: session,
    });

    ws.$$session = session;
    clientsBus.getTicket(session, ws);

  });
}

module.exports = WSServer;


function websocketHttpHandler({ path, data, req_id }, ws) {
  const commonRej = (reason = '') => {
    sendJSON(ws, {
      type: 'http', req_id, status: 400,
      resp: {
        message: reason.message || reason
      }
    });
  };
  const gameDetailMatch = /games\/detail\/(\w+)$/.exec(path);
  const joinListMatch = /joinlists\/(\w+)$/.exec(path);
  if (gameDetailMatch) {
    Game.getGameDetail(gameDetailMatch[1]).then(detail => {
      sendJSONResult(ws, req_id, { currentGame: detail });
    }).catch(commonRej);
    return;
  }
  if (joinListMatch) {
    Game.getJoinList(joinListMatch[1]).then(joinLists => {
      sendJSONResult(ws, req_id, { team: joinLists });
    }).catch(commonRej);
    return;
  }

  switch (path) {
    case publicPath + '/games': {
      Game.getAllGames().then(games => {
        sendJSONResult(ws, req_id, { list: games });
      }).catch(commonRej);
      break;
    }
    case publicPath + '/games/begin': {
      Game.beginGame(data.body).then(games => {
        sendJSONResult(ws, req_id, { list: games });
      }).catch(commonRej);
      break;
    }
    case publicPath + '/games/end': {
      Game.endGame(data.body).then(games => {
        sendJSONResult(ws, req_id, { list: games });
      }).catch(commonRej);
      break;
    }
    case publicPath + '/games/join': {
      Game.joinGame(data.body).then(list => {
        sendJSONResult(ws, req_id, { team: list, result: 'ok' });
      }).catch(commonRej);
      break;
    }
    case publicPath + '/games/exit': {
      Game.exitGame(data.body).then(() => {
        sendJSONResult(ws, req_id, { result: 'ok' });
      }).catch(commonRej);
      break;
    }
    case publicPath + '/games/delete': {
      Game.deleteGame(data.body).then(() => {
        sendJSONResult(ws, req_id, { result: 'ok' });
      }).catch(commonRej);
      break;
    }
    case publicPath + '/games/updategame': {
      Game.updateGame(data.body).then(() => {
        sendJSONResult(ws, req_id, { result: 'ok' });
      }).catch(commonRej);
      break;
    }
    case publicPath + '/games/scoreadd': {
      Game.scoreAdd(data.body)
        .then(() => Game.getJoinList(data.body.gid))
        .then((team) => {
          sendJSONResult(ws, req_id, { team });
        }).catch(commonRej);
      break;
    }
    case publicPath + '/games/scoreminus': {
      Game.scoreMinus(data.body)
        .then(() => Game.getJoinList(data.body.gid))
        .then((team) => {
          sendJSONResult(ws, req_id, { team });
        }).catch(commonRej);
      break;
    }
    case publicPath + '/games/updateteamname': {
      Game.updateTeamName(data.body)
        .then(() => Game.getJoinList(data.body.gid))
        .then((team) => {
          sendJSONResult(ws, req_id, { team });
        }).catch(commonRej);
      break;
    }
    case publicPath + '/games/createteam': {
      Game.createTeam(data.body)
        .then(() => Game.getJoinList(data.body.gid))
        .then((team) => {
          sendJSONResult(ws, req_id, { team });
        }).catch(commonRej);
      break;
    }
    case publicPath + '/games/deleteteam': {
      Game.deleteTeam(data.body)
        .then(() => Game.getJoinList(data.body.gid))
        .then((team) => {
          sendJSONResult(ws, req_id, { team });
        }).catch(commonRej);
      break;
    }
    case publicPath + '/games/switchteam': {
      Game.switchTeam(data.body)
        .then(() => Game.getJoinList(data.body.gid))
        .then((team) => {
          sendJSONResult(ws, req_id, { team });
        }).catch(commonRej);
      break;
    }
    case publicPath + '/user/updatenickname': {
      const { _id, nickname } = data.body;
      User.updateUserNickname(_id, nickname).then(() => {
        sendJSONResult(ws, req_id, { nickname });
      }).catch(commonRej);
      break;
    }

    case publicPath + '/user/updatepassword': {
      const { _id, password } = data.body;
      User.updateUserPassword(_id, password).then(() => {
        sendJSONResult(ws, req_id, { message: 'succeed' });
      }).catch(commonRej);
      break;
    }
    case publicPath + '/user/signin': {

      User.signIn(data.body).then((user) => {
        sendJSONResult(ws, req_id, { user: user });
      }).catch(commonRej);
      break;
    }
    case publicPath + '/user/signup': {

      User.createUser(data.body).then((user) => {
        sendJSONResult(ws, req_id, { user: user }
        );
      }).catch(commonRej);
      break;
    }
    default: {
      sendJSON(ws, {
        type: 'http', req_id, status: 404,
        resp: { message: '接口不存在' }
      });
    }
  }
}

function sendJSONResult(ws, req_id, json) {
  sendJSON(ws, { status: 200, req_id, type: 'http', resp: json });
}
function sendJSON(ws, json) {
  ws.send(JSON.stringify(json));
}