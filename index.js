const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware');
const cors = corsMiddleware({ origins: ['*'], allowHeaders: ['API-Token'], exposeHeaders: ['API-Token-Expiry'] });


const config = require('./config');

const server = restify.createServer({ name: 'hitokoto', version: '1.0.0', });

//cross origins
server.pre(cors.preflight);
server.use(cors.actual);

//inject middlewares

['./middlewares', './routes.js', './websocket']
  .forEach(function (path) {
    require(path)(server);
  });

// server.get('/', function (req, res, next) {
//   res.send({ 'hello': 'world!' });
//   next();
// });

const port = config.env.port || 3000;

server.listen(port, function () {
  //eslint-disable-next-line
  console.log('Server is listening at ', port);
});