const dbService = require('../model/service.js')
const CODE = require('../constant/code.js')
const getusers = function(req, res) {
  const {search} = req.query;
  dbService.getusers({username: search, pet_name: search, user_id: req.session.user.id}, function(result) {
    res.json({code: CODE.SUCCESS, data: result})
  })
}
module.exports = {
  getusers
}