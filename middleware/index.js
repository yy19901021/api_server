const withoutAuth = ['/api/login', '/api/getCode']
const auth = function (req, res, next) {
  const Authorization = req.header('Authorization')
  const url = req.path
  console.log(url, withoutAuth.includes(url))
  if (!withoutAuth.includes(url) && !req.session.user) {
    res.json({ code: 403, msg: '请先去登录' })
    return
  }
  if (Authorization && req.sessionID !== Authorization) {
    res.json({ code: 403, msg: '登录信息失效' })
  } else {
    next()
  }
}



module.exports = {
  auth
}