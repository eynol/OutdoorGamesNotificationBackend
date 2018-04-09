const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const messageSchema = mongoose.Schema({
  _gameId: Schema.Types.ObjectId,
  _creator: Schema.Types.ObjectId,//创建者
  reciever: Schema.Types.Array,//接受者
  text: String,//推送消息
  read: Boolean,//是否全部已读
  drop: Boolean,
}, { timestamps: true });

module.exports = messageSchema;
