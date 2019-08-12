const dbService = require('../model/service.js')
const Tools = require('../utils')
const CODE = require('../constant/code.js')
const add = function(req, res) {
  const {title, description, members=[]} = req.body
  dbService.isRepeat({title: title}, 'projects', (repeat) => {
    if(repeat.length === 0) {
      dbService.addProject(Object.assign({}, {title, description, created_user: req.session.user.id}), function(result) {
        const {insertId} = result
        members.push(req.session.user.id)
        const insetData = members.map(item => [insertId, item])
        dbService.addRelativeforProject(insetData, (result) => {
          if (result) {
            Tools.successRes(res, {id: result.insertId})
          }
        })
      })
      
    } else {
      res.json({code: CODE.PROJECT_REAPEAT, msg: '项目名称重复'})
    }
  })
}

/**
 * 
 * @param {limit, page, type(mine|create|jion)} req 
 * @param {*} res 
 */
const formatlimitdata = function(data, res) {
  let res_data = {}
      res_data.list = data.filter(i=>{
        if (i.length === 1 && i[0].total !== undefined) {
          res_data.total = i[0].total
          return false
        } else {
          return true
        }
      })[0]
  return res_data
}
const query = function(req, res) {
  const {limit, page, type} = req.body
  if (req.session.user.role == '1' && type === 'mine') {
    dbService.queryAllProject({limit, page}, function(data) {
      Tools.successRes(res, formatlimitdata(data))
    })
  } else {
    dbService.queryProject({limit, page, type, user_id: req.session.user.id}, (result) => {
      Tools.successRes(res, formatlimitdata(result))
    })
  }
  
}

const update = function(req, res) {
  const {project_id, title, discription, members} = req.body
  dbService.updateProject(project_id, {title, discription}, members, () => {
    res.json({code: CODE.SUCCESS, msg: '项目修改成功'})
  })
}
const detail = function(req, res) {
  const {project_id} = req.body
  dbService.projectDetail(project_id, (data) => {
    const result = data[0][0]
    result.members = data[1]
    Tools.successRes(res, result)
  })
}
const deletePro = function(req, res) {
  const {project_id} = req.body
  dbService.delProject(project_id, () => {
    res.json({code: CODE.SUCCESS, msg: '项目删除成功'})
  })
}
const detailWithModel = function(req, res) {
  const {project_id} = req.body
  dbService.projectDetailWithModel(project_id, function(data) {
    Tools.successRes(res, data)
  })
}

module.exports = {
  add,
  query,
  detail,
  update,
  deletePro,
  detailWithModel
}