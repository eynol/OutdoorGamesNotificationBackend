const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const messageSchema = mongoose.Schema({
  _gameId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  _creator: {
    type: Schema.Types.ObjectId,
    index: true
  },//创建者
  reciever: Schema.Types.Array,//接受者
  text: String,//推送消息
  read: {
    type: Boolean,
    index: true
  },//是否全部已读
  drop: Boolean,
}, { timestamps: true });

module.exports = messageSchema;
