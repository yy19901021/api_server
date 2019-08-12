const dbService = require('./sql.js')
const Query = require('../utils').Sql.query
const Update = require('../utils').Sql.update
const Count = require('../utils').Sql.count
const Insert = require('../utils').Sql.insert
function formatObject(obj, lable='=', linklable="and") {
  const result = []
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      let value = obj[key];
      if (lable === 'like') {
        value = `%${value}%`
      }
      result.push(`${key} ${lable} '${value}'`)
    }
  }
  return result.join(` ${linklable} `)
}
const run = function(sql, callback) {
  let servicePromise 
  if (Array.isArray(sql)) {
    servicePromise = Promise.all(sql.map(item => dbService(item)))
  } else {
    servicePromise = dbService(sql)
  }
  servicePromise.then((result) => {
    callback(result)
  }).catch((error) => {
    console.error(error)
  })
}

const sqlFactory = {
  select: function({selectKeys = '*', conditions, table}) {
    if (Array.isArray(selectKeys)) {
      selectKeys = selectKeys.join(',')
    }
    return `select ${selectKeys} from ${table} where ${formatObject(conditions)}`
  },
  selectLikeOr: function({selectKeys = '*', conditions, table}) {
    if (Array.isArray(selectKeys)) {
      selectKeys = selectKeys.join(',')
    }
    return `select ${selectKeys} from ${table} where ${formatObject(conditions, 'like', 'or')}`
  },
  selectLimit: function({selectKeys = '*', limit = 10, page = 1, table, condtion}) {
    if (Array.isArray(selectKeys)) {
      selectKeys = selectKeys.join(',')
    }
    let sql = `select ${selectKeys} from ${table}`
    if (condtion) {
      sql += ` where ${condtion}`
    }
    sql += ` limit ${limit} offset ${(page - 1) * limit}`
    return sql
  },
  inset(inserts, table) {
    const keys = Object.keys(inserts)
    return `insert into ${table} (${keys.join(', ')}) value (${keys.map(item => `'${inserts[item]}'`).join(',')})`
  },
  batchinset(insetKes, values, table) {
    return `insert into ${table} (${insetKes.join(', ')}) value ${values.map(item => `(${item.join(',')})`).join(',')}`
  }
}
// 登录
const login = function({username, password}, callback) {
  const sql = `select id, pet_name, username, role from users where username='${username}' and password='${password}'`
  run(sql, callback)
}
// 注册
const register = function(data, callback) {
  const sql = sqlFactory.inset(data, 'users')
  console.log(sql)
  run(sql, callback)
}
const isRepeat = function(data, table,callback) {
  const sql = sqlFactory.select({selectKeys: Object.keys(data), table: table, conditions: data})
  console.log(sql)
  run(sql, callback)
}
// 获取所有用户
const getusers = function(data, callback) {
  // const sql = sqlFactory.selectLikeOr({selectKeys: ['id', 'username', 'pet_name'], conditions: data, table: 'users'})
  const sql = Query().keys('id', 'username', 'pet_name').table('users').where(`id != ${data.user_id}`).and(`username like '%${data.username}%'`).or(`pet_name like '%${data.pet_name}%'`).toEnd()
  console.log(sql)
  run(sql, callback)
}
// 添加项目
const addProject = function(data, callback) {
  const sql = sqlFactory.inset(data, 'projects')
  console.log(sql)
  run(sql, callback)
}

// 分页查询所有项目
const queryAllProject = function(data, callback) {
  const sql = Query().keys('*').table('projects').where('is_del != 1').limit(data.limit).offset((data.page - 1) * data.limit).orderBy('update_time').toEnd()
  const sql2 = Query().keys('count(1) as total').table('projects').where('is_del != 1').toEnd()
  run([sql, sql2], callback)
}
// 分页查询项目
const queryProject = function(data, callback) {
  const {user_id, limit, page} = data
  const sql = {
    mine: Query().keys('title', 'a.project_id', 'description', 'created_user')
    .table('projects as a', 'user_project_relation as b')
    .where(` b.user_id = ${user_id} `).and('a.project_id = b.project_id').and('a.is_del != 1')
    .limit(limit)
    .offset((page - 1) * limit).distinct().toEnd(),
    create: Query().keys('title', 'project_id', 'description', 'created_user')
    .table('projects')
    .where(`created_user = ${user_id}`).and('is_del != 1')
    .limit(limit)
    .offset((page - 1) * limit).distinct().toEnd(),
  }
  const sqlcount = {
    mine: `SELECT  count(DISTINCT a.project_id) as total FROM projects a, user_project_relation b WHERE a.project_id = b.project_id  and b.user_id = ${user_id} AND is_del != 1`,
    create: `SELECT count(1) as total FROM projects WHERE created_user = ${user_id} and is_del != 1`,
  }
  run([sql[data.type], sqlcount[data.type]], callback)
}
// 获取项目详情
const projectDetail = function(id, callback) {
  const sql1 = Query().keys('projects.*', 'users.username as created_username', 'users.pet_name as created_pet_name').table('projects', 'users')
  .where(`project_id = ${id}`).and('projects.created_user = users.id').toEnd()
  const sql2 = Query().keys('user.pet_name', 'user.username', 'user.id').table('user_project_relation as re', 'users as user').distinct()
  .where(`re.project_id = ${id}`).and(`re.user_id = user.id`).and('user.role != 1').toEnd()
  console.log(sql1)
  console.log(sql2)
  run([sql1, sql2], callback)
}
// 获取项目详情包含模块

const projectDetailWithModel = function(id, callback){
  const sql2 = Query().keys('*').table('models').where(`project_id = ${id}`).and('is_del != 1').toEnd()
  run(sql2, callback)
}

// 删除项目
const delProject = function(id, callback) {
  const sql = Update().update('is_del = 1').table('projects').where(`project_id = ${id}`).toEnd()
  const sql2 = 
  console.log(sql)
  run(sql, callback)
}
// 更新项目
const updateProject = function(id, data, members, callback) {
  members = members.map(item => ({project_id: id, user_id: item}))
  const sql = Update().update(data).table('projects').where(`project_id = ${id}`).toEnd()
  const sql2 = Insert().insert(members).table('user_project_relation').toEnd()
  console.log(sql2)
  run([sql, sql2], callback)
}

// 添加项目与人员关系
const addRelativeforProject = function(data, callback) {
  const sql = sqlFactory.batchinset(['project_id', 'user_id'],data, 'user_project_relation')
  console.log(sql)
  run(sql, callback)
}
// 更新人员与项目关联关系
const updateProjectMembers = function(data, callback) {
  const sql = Insert().insert(data).table('user_project_relation').toEnd()
  run(sql, callback)
}

// 项目添加模块
const addModel = function (data, callback) {
  const sql = Insert().insert(data).table('models').toEnd()
  console.log(sql)
  run(sql, callback)
}
//模块详情
const getModel = function (id, callback) {
  const sql = Query().keys('*').table('models').distinct().where(`model_id = ${id}`).toEnd()
  console.log(sql)
  run(sql, callback)
}
// 更新模块
const updateModel = function (id, data, callback) {
  const sql = Update().update(data).table('models').where(`model_id = ${id}`).toEnd()
  console.log(sql)
  run(sql, callback)
}
const getModelApis = function ({model_id, limit, page, search}, callback) {
  const sql = Query().keys('title', 'remark', 'method', 'path', 'api_id').table('apis').distinct().where(`model_id = ${model_id}`).and('is_del != 1').and(`title like '%${search}%'`).limit(limit).offset((page - 1) * limit).toEnd()
  const sql1 = Count().count().table('apis').where(`model_id = ${model_id}`).and('is_del != 1').toEnd()
  console.log(sql)
  run([sql, sql1], callback)
}
// api添加
const addApi = function(data, callback) {
  console.log(data)
  const sql = Insert().insert(data).table('apis').toEnd()
  console.log(sql)
  run(sql, callback)
}
// api修改
const editApi = function(id,data, callback) {
  const sql = Update().update(data).where(`api_id = ${id}`).table('apis').toEnd()
  run(sql, callback)
}
// api查询
const queryApi = function(id, callback) {
  const sql = Query().keys('*').where(`api_id = ${id}`).and('is_del != 1').table('apis').toEnd()
  run(sql, callback)
}
// api查询for test
const queryApiForTest = function(id, callback) {
  const sql = Query().keys('apis.headers', 'apis.params', 'apis.method','apis.body', 'apis.path', 'apis.result','apis.title','models.project_id','models.model_id', 'models.host', 'models.title as model_title')
  .where(`api_id = ${id}`).and('apis.model_id = models.model_id').and('apis.is_del != 1').table('apis, models').toEnd()
  run(sql, callback)
}
// model api 查询
const queryModelApiForTest = function(id, callback) {
  const sql = Query().keys('apis.headers', 'apis.api_id','apis.params', 'apis.method','apis.body', 'apis.path', 'apis.result','apis.title','models.project_id','models.model_id', 'models.host', 'models.title as model_title')
  .where(`apis.model_id = ${id}`).and(`models.model_id = ${id}`).and('apis.is_del != 1').table('apis, models').toEnd()
  console.log(sql)
  run(sql, callback)
}

module.exports = {
  login,
  register,
  isRepeat,
  addProject,
  queryAllProject,
  queryProject,
  getusers,
  addRelativeforProject,
  projectDetail,
  delProject,
  updateProject,
  updateProjectMembers,
  projectDetailWithModel,
  addModel,
  getModel,
  updateModel,
  getModelApis,
  addApi,
  editApi,
  queryApi,
  queryApiForTest,
  queryModelApiForTest
}