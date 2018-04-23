const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const gameSchema = mongoose.Schema({
  owner: {
    type: Schema.Types.ObjectId,
    index: true
  },
  title: {
    type: String,
    require: true
  },//标题
  desc:  {
    type: String,
    require: true
  },//描述
  status: String,//当前状态
  rules: String,//游戏规则
  location: String,
  beginTime: Schema.Types.Date,
  endTime: Schema.Types.Date,
  autoBegin: Boolean,//自动开始
  autoEnd: Boolean,//自动结束
  additions: String,//备注
  joinType: String,//加入类型
  allowedAdmins: [String],
}, { timestamps: true });


gameSchema.methods.moreDetail = function () {
  return this.model('joinlist')
    .find({ _gameId: this._id })
    .then(teamList => {
      if (teamList.length == 0) {
        return Promise.reject('Not Found');
      }
      this.team = teamList;
      return this;
    });

};

module.exports = gameSchema;