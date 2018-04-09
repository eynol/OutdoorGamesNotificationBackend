//mongodb config
const mongoose = require('mongoose');
//const Schema = mongoose.Schema;
const config = require('../config');

const gameSchema = require('./model/gameSchema');
const joinListSchema = require('./model/joinListSchema');
const messageSchema = require('./model/messageSchema');
const userSchema = require('./model/userSchema');

mongoose.Promise = global.Promise;


let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));//eslint-disable-line

try {
  mongoose.connect(config.db.url);
} catch (e) {
  console.log('Parse config to json object failed, please validate the document.')//eslint-disable-line
}


exports.Game = mongoose.model('game', gameSchema);
exports.User = mongoose.model('user', userSchema);
exports.Message = mongoose.model('message', messageSchema);
exports.JoinList = mongoose.model('joinlist', joinListSchema);

