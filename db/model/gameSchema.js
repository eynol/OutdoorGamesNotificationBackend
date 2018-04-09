const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const gameSchema = mongoose.Schema({
  owner: Schema.Types.ObjectId,
  title: String,//标题
  desc: String,//描述
  status: String,//当前状态
  rules: String,//游戏规则
  location: String,
  beginTime: Schema.Types.Date,
  endTime: Schema.Types.Date,
  autoBegin: Boolean,//自动开始
  autoEnd: Boolean,//自动结束
  additions: String,//备注
  joinType: String,//加入类型
  allowedAdmins: Schema.Types.Array,
}, { timestamps: true });

module.exports = gameSchema;