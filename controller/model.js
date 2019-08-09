const dbService = require('../model/service.js')
const CODE = require('../constant/code.js')
const Tools = require('../utils')
const add = function(req, res) {
  const data = req.body
  data.create_user = req.session.user.id
  dbService.addModel(data, function(result) {
    Tools.successRes(res, {model_id: result.insertId})
  })
}
const detail = function(req, res) {
  const {model_id} = req.body
  dbService.getModel(model_id, function(result) {
    Tools.successRes(res, result[0])
  })
}
const update = function(req, res) {
  const {model_id, host, title, description, base_url, project_id} = req.body
  dbService.updateModel(model_id, {host, title, description, base_url, project_id}, function(result) {
    Tools.successRes(res, {model_id: result.insertId})
  })
}
module.exports = {
  add,
  detail,
  update
}