
function ClientsBus() {
  this.clients = new Map();
  this.checkAlive = this.checkAlive.bind(this);
}

ClientsBus.prototype.getTicket = function (clientId, websocket) {
  this.clients.set(clientId, {
    ws: websocket,
    clientId: clientId,
    timmer: setTimeout(() => {
      this.checkOut(clientId);
    }, 3000),
    req: new Map(),
    last: Date.now(),
  });
};

ClientsBus.prototype.ticketChecked = function (clientId, uid, temp = false) {
  
  const client = this.clients.get(clientId);
  clearTimeout(client.timmer);
  client.uid = uid;
  client.temp = temp;//临时用户
  console.log('checkin:',clientId,uid);
};

ClientsBus.prototype.get = function (clientId) {
  return this.clients.get(clientId);
};

ClientsBus.prototype.checkOut = function (clientId) {
  const client = this.clients.get(clientId);
  if (client) {
    client.ws.close();
    this.clients.delete(clientId);
    console.log('checkout,',clientId);
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
      this.checkOut(client.clientId);
    }
  }
  return this;
};

ClientsBus.prototype.stop = function () {
  clearInterval(this.timmer);
  return this;
};


const clientsBus = new ClientsBus().start();

module.exports = clientsBus;