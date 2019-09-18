const dbService = require('../model/service.js')
const hash = require('../utils/').hash
const CODE = require('../constant/code.js')
const register = function(req, res) {
  const {username, pet_name, password, email} = req.body;
  
  dbService.isRepeat({username}, 'users',(user) => {
    if (user.length === 0) {
      dbService.register({username, pet_name, password, email}, function(result) {
        res.json({code: CODE.SUCCESS, data: {username, pet_name, id: result.insertId}})
      })
    } else {
      res.json({code: CODE.REGISTER_REAPEAT, msg: '用户名已经被占用！'})
    }
  })
  
}

module.exports = register