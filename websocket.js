
function WSServer(server) {
  var WebSocketServer = require('ws').Server;
  var wss = new WebSocketServer({ server: server });

  var clients = new Map();

  wss.on('connection', function (ws) {

    console.log('connection');//eslint-disable-line
    ws.on('close', function (data) {
      //eslint-disable-next-line
      console.info('STREAM_CLOSE_WS');
      //eslint-disable-next-line
      console.dir(data);
    });

    // `data`: Buffer
    ws.on('message', function (data) {
      if (data === 'pong') {
        void (0);
      }
      try {
        data = JSON.parse(data);

        switch (data.type) {
          case 'http': {
            break;
          }
          case 'push': break;
          default: { break; }
        }
      } catch (e) {
        console.error(e);//eslint-disable-line
      }

      ws.send(data);
    });

    ws.send('ping');
  });
}

module.exports = WSServer;