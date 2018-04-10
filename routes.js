const fs = require('fs');
const path = require('path');
const config = require('./config');


function routesInjector(server) {

  var routesPath = __dirname + '/routes';
  var publicPath = config.env.publicPath;// '' or '/api'

  fs.readdirSync(routesPath).forEach(function (file) {
    if (file.substr(-5) !== '.d.ts') {
      var routes = require(path.join(routesPath, file));
      routes.forEach(route => {
        server[route.method](publicPath + route.path, route);
      });
    }
  });

}

module.exports = routesInjector;