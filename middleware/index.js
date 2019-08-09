const store = require('../store.js')
const Tools = require('../utils')
const auth = function (req, res, next) {
  const Authorization = req.header('Authorization')
  if (Authorization && req.sessionID !== Authorization) {
    res.json({ code: 403, msg: '登录信息失效' })
  } else {
    next()
  }
}
module.exports = {
  auth
}