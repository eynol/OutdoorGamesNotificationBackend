const fs = require('fs');
const path = require('path');

function routesInjector(server) {

  var routesPath = __dirname + '/routes';

  fs.readdirSync(routesPath).forEach(function (file) {
    if (file.substr(-5) !== '.d.ts') {
      var routes = require(path.join(routesPath, file));
      routes.forEach(route => {
        server[route.method](route.path, route);
      });
    }
  });

}

module.exports = routesInjector;