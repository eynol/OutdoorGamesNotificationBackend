const restify = require('restify');

const commonRejectPlugin = require('./middlewares/commonReject');

function middlewaresInjector(server) {

  //restify default plugins
  server.use(restify.plugins.throttle({
    burst: 100,
    rate: 50,
    ip: true,
    overrides: {
      '127.0.0.1': {
        rate: 0, // unlimited
        burst: 0
      }
    }
  }));
  server.use(restify.plugins.acceptParser(server.acceptable));
  server.use(restify.plugins.gzipResponse());
  server.use(restify.plugins.queryParser());
  server.use(restify.plugins.bodyParser());
  server.use(commonRejectPlugin());
}

module.exports = middlewaresInjector;