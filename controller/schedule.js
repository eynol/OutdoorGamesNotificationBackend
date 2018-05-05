var schedule = require('node-schedule');

const game = {
  begin: new Map(),
  end: new Map()
};


exports.whenGameBeginAt = function (gid, date, func) {
  const job = schedule.scheduleJob(date, () => {
    func();
    game.begin.delete(gid);
  });
  game.begin.set(gid, job);

};

exports.cancelAutoBegin = function (gid) {
  const job = game.begin.get(gid);
  if (job) {
    job.cancel();
  }
  game.begin.delete(gid);
};

exports.whenGameEndAt = function (gid, date, func) {
  const job = schedule.scheduleJob(date, () => {
    func();
    game.end.delete(gid);
  });
  game.end.set(gid, job);
};

exports.cancelAutoEnd = function (gid) {
  const job = game.end.get(gid);
  if (job) {
    job.cancel();
  }
  game.end.delete(gid);
};