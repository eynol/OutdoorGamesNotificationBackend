const $ = require('../routeFactory');
const gameManager = require('../controller/game');

const getJoinLists = $('post', '/joinlists/:gid', (req, res, next) => {
  const gid = req.params.gid;
  gameManager.getJoinList(gid).then((joinLists) => {
    res.send({ team: joinLists });
    next();
  }).catch(res.commonReject(next));
});


module.exports = [getJoinLists];