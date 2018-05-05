

function Channel(gameid) {
  this.gameid = gameid;
  this.members = new Map();
}

Channel.prototype.broadcast = function (obj) {
  for (let ws of this.members.values()) {
    ws.send(JSON.stringify(obj));
  }
};
Channel.prototype.join = function (uid, ws) {
  this.members.set(uid, ws);
};

Channel.prototype.leave = function (uid) {
  this.members.delete(uid);
};


var ChannelManager = {
  channels: new Map(),
  get: function (gid) {
    if (this.channels.has(gid)) {
      return this.channels.get(gid);
    } else {
      const channel = new Channel(gid);
      this.channels.set(gid, channel);
      return channel;
    }
  },
  delete: function (gid) {
    this.channels.delete(gid);
  }
};


function ClientsBus() {
  this.clients = new Map();
  this.checkAlive = this.checkAlive.bind(this);
}



ClientsBus.prototype.ChannelManager = ChannelManager;

ClientsBus.prototype.getTicket = function (clientId, websocket) {
  this.clients.set(clientId, {
    ws: websocket,
    clientId: clientId,
    timmer: setTimeout(() => {
      this.checkOut(clientId, '验证超时');
    }, 3000),
    req: new Map(),
    last: Date.now(),
  });
};

ClientsBus.prototype.ticketChecked = function (clientId, uid) {

  const client = this.clients.get(clientId);
  clearTimeout(client.timmer);

  for (let prev_client of this.clients.values()) {
    if (prev_client.uid === uid) {
      //已经有人登录了 ，把他踢出去
      this.checkOut(prev_client.clientId, 'kickout');
    }
  }

  client.uid = uid;

  console.log('checkin:', clientId, uid);
};

ClientsBus.prototype.get = function (clientId) {
  return this.clients.get(clientId);
};

ClientsBus.prototype.checkOut = function (clientId, reason) {
  const client = this.clients.get(clientId);
  if (client) {
    if (reason !== 'close') {
      client.ws.close(1000, reason);
    }


    if (client.channel) {
      client.channel.leave(client.uid);
      if (client.channel.size === 0) {
        ChannelManager.delete(client.gid);
      }
    }
    this.clients.delete(clientId);
    console.log('checkout,', clientId);
  }
};

ClientsBus.prototype.pingpong = function (clientId) {
  const client = this.clients.get(clientId);
  if (client) {
    client.last = Date.now();
  }
};

ClientsBus.prototype.start = function () {
  this.timmer = setInterval(this.checkAlive, 10000);
  return this;
};


ClientsBus.prototype.checkAlive = function () {
  const now = Date.now();
  for (let client of this.clients.values()) {
    const during = now - client.last;
    if (during > 40000) {
      this.checkOut(client.clientId, 'timeout');
    }
  }
  return this;
};

ClientsBus.prototype.stop = function () {
  clearInterval(this.timmer);
  return this;
};

ClientsBus.prototype.joinGame = function (clientId, gid) {
  const client = this.clients.get(clientId);
  if (client) {
    client.channel = ChannelManager.get(gid);
    client.channel.join(client.uid, client.ws);
    client.gid = gid;
  }
};



const clientsBus = new ClientsBus().start();

module.exports = clientsBus;
