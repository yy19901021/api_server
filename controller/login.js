const consola = require('consola')
const queryUser = require('../model/service.js').login
const Tools = require('../utils');
const store = require('../store.js')
const CODE = require('../constant/code.js')
const Login = function(req, res, next) {
  const {username, password, code} = req.body
  consola.info(`username:${username}`, `password: ${password}`, `code:${code}`)
  if (req.cookies.code && code.toLowerCase() !== req.cookies.code.toLowerCase()) {
    res.json({code: CODE.LOGIN_FAIL, msg: '验证码错误'})
  } else{
    queryUser({username, password}, function(result) {
      if (result.length == 0) {
        res.json({code: CODE.LOGIN_FAIL, msg: '用户名或密码不正确'})
      } else {
        const timestamp = new Date().valueOf()
        function resposeLogin() {
          req.session.user = Object.assign({}, result[0], {timestamp, auth: req.sessionID})
          req.session.testMsg = []
          res.cookie('code', '', {maxAge: 0})
          res.json({code: CODE.SUCCESS, data: Object.assign({}, result[0], {auth: req.sessionID})})
        }
        function clearSession() {
          const username = Tools.parseBase64(req.sessionID).split('_')[0]
          store.Store.all((err, data) => {
            if (Array.isArray(data)) {
              for (let i = 0; i < data.length; i++) {
                const user = data[i].user;
                if (user && user.username === username && user.auth !== req.sessionID) {
                  store.Store.destroy(user.auth)
                }
              }
            }
          })
        }
        clearSession()
        if (req.session.user) {
          req.session.regenerate(function(err) {
            if (!err) {
              resposeLogin()
            }
          })
        } else {
          resposeLogin()
        }
      }
    })
  }
}

const logout = function(req, res, next) {
  req.session.destroy()
  res.json({code: CODE.SUCCESS, msg: '退出登录'})
}
module.exports = {
  Login,
  logout
}