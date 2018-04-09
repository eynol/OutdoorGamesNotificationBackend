const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const joinListSchema = mongoose.Schema({
  _gamiId: Schema.Types.ObjectId,
  _gameType: String,//游戏参赛类型
  joinType: String,//加入类型，是团队还是
  team: String,//团队名称
  members: Array,//成员
  teamScore: Number,
}, { timestamps: true });

module.exports = joinListSchema;