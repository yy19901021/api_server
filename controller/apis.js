const dbService = require('../model/service.js')
const CODE = require('../constant/code.js')
const Tools = require('../utils')
const AXIOS = require('axios')
const store = require('../store.js')
const moment = require('moment')
const childProcess = require( "child_process")
const path = require('path')
// 获取模块的Apis
const modelApis = function(req, res) {
  const {model_id, limit, page, search} = req.body
  console.log(model_id, limit, page, search)
  dbService.getModelApis({model_id, limit, page, search}, function(result) {
    const data = {}
    data.lists = result[0]
    data.total = result[1][0]['count(*)']
    Tools.successRes(res, data)
  })
}
// toJSON
function jsonData(data) {
  return Object.keys(data).length > 0 ? JSON.stringify(data) : ''
}
// 添加或者更新API
const addOrUpdate = function(req, res){
  const {api_id, remark, body, result, path, method, headers, model_id, params, title} = req.body
  if (api_id) {
    dbService.editApi(api_id, {title, remark, body: jsonData(body), params: jsonData(params), result: jsonData(result), path, method, headers: jsonData(headers), model_id}, () => {
      res.json({code: CODE.SUCCESS, msg: '编辑成功'})
    })
  } else {
    dbService.addApi({title, remark, body: jsonData(body), params: jsonData(params), result: jsonData(result), path, method, headers: jsonData(headers), model_id}, () => {
      res.json({code: CODE.SUCCESS, msg: '添加成功'})
    })
  }
}
// API 详情查询
const query = function(req, res) {
  const  {api_id} = req.query
  dbService.queryApi(api_id, (result) => {
    Tools.successRes(res, result[0])
  })
}
// API删除接口
const deleteApi = function(req, res) {
  const  {api_id} = req.body
  dbService.editApi(api_id, {"is_del": 1},(result) => {
    res.json({code: 200, msg: '删除成功！'})
  })
}
const AXIOS_INSTANCE = AXIOS.create({timeout: 5000, headers: {
  'Content-Type': 'application/json;charset=UTF-8'
}})
AXIOS_INSTANCE.interceptors.response.use(function (response) {
  // 对响应数据做点什么
  return response.data;
}, function (error) {
  return Promise.reject(error);
});

// // api测试队列
// class Queue {
//   constructor(req) {
//     this.ongoing = false
//     this.req = req
//     this.lines = []
//   }
//   appendChild(fn) {
//     this.lines.push(fn)
//   }
//   run() {
//     if (this.lines.length === 0) {
//       this.ongoing = false
//       return
//     }
//     const fn = this.lines.shift()
//     if (this.ongoing) {
//       return
//     } else {
//       fn(this.req)
//       process.nextTick(()=> {
//         this.run()
//       })
//     }
//   }
// }

// 单个接口测试
const testSingle = function(req, res, next) {
  const { api_id } =  req.params
  dbService.queryApiForTest(api_id, function(data) {
    const {host = '', path='', base_url='', headers =  {}, body = {}, params = {}, result = {}, method, title, model_title, model_id, project_id} = data[0]
    const url = Tools.formatUrl(host, base_url, path)
    console.log(host, path, base_url, Tools.parseJson(headers), Tools.parseJson(body), Tools.parseJson(params), result, method)
    AXIOS_INSTANCE.request({
      url,
      method,
      params: Tools.parseJson(params),
      data: Tools.parseJson(body),
      headers: Tools.parseJson(headers)
    }).then((requestData) => {
      const data = {}
      data.type = 'success'
      data.api_content = model_title + '->' + title
      data.message = '接口调用成功'
      data.api_id = api_id
      data.model_id = model_id
      data.project_id = project_id
      const warnMsg = Tools.isEqual(result, requestData)
      if (warnMsg.length > 0) {
        data.type = 'warn'
        data.message = `接口调用成功, ${warnMsg.join(';')}`
      }
      data.time = moment().format('YYYY-MM-DD hh:mm:ss')
      res.json({code: 200, data: data})
    }).catch((error) => {
      // console.log(error)
      const data = {}
      data.type = 'error'
      data.api_content = model_title + '->' + title
      data.message = '接口调用失败：' + `${error.message ? error.message : ''}`
      data.api_id = api_id
      data.model_id = model_id
      data.project_id = project_id
      data.time = moment().format('YYYY-MM-DD hh:mm:ss')
      res.json({code: 200, data: data})
    })
  })
}
// 测试消息存放在session里面
function addMsgToSession(id,message) {
  store.Store.get(id, (err, session) => {
    if (!err) {
      store.Store.set(id, Object.assign({}, session, {testMsg: session.testMsg.concat(message)}))
    }
  })
}
// 模块批量测试
const testModelApi = function(req, res) {
  const { model_id } =  req.params
  const sub = childProcess.fork(path.join(__dirname , "../forks/testFork.js"))
  sub.send({model_id, session_id: req.session.id})
  sub.on('error', (err) => {
    console.error('apis批量测试错误')
  })
  sub.on('exit', (code) => {
    code === 0 && console.log('apis批量完成')
  })
  sub.on('message', ({id, message}) => {
    addMsgToSession(id, message)
  })
  res.json({code: 200, msg: '测试开始'})
}
// 获取测试消息的接口
const getTestMessage = function(req, res) {
  const data = req.session.testMsg.concat([])
  req.session.testMsg = []
  res.json({code: 200, data: data})
}
// api单个测试接口（不保存信息）
const sendApi = function (req, res) {
  const {body = {}, params={}, headers={}, result, method, api_url} = req.body
  AXIOS_INSTANCE.request({
    url: api_url,
    method,
    data: body,
    params,
    headers
  }).then((data) => {
    res.json({code: 200, data})
  }).catch((error) => {
    if (error) {
      console.log(error)
      res.json({code: 200, data: error})
    }
  })
}

// api mock 服务
const mockServer = function(req, res, next) {
  const url = req.url.split('?')[0]
  const {withCheck, withMock} = req.query
  const method = req.method
  const params = req.query
  Tools.delKeys(params, 'withCheck', 'withMock')
  const body = req.body
  const lastHost = url.match(/\/([^\/]+)(\/)?$/)
  if (!lastHost) {
    res.json({code: 200, msg: 'mock 服务错误！'})
  } else {
    dbService.queryMockModel({path: lastHost[1], method: method.toLowerCase()}, function(result){
      const requestUrl = url.replace('/mock', '').replace(/\/$/, '')
      const filterModel = result.filter(i=>{
        return Tools.formatUrl(i.base_url, i.path) == requestUrl
      })
      if (filterModel.length == 0) {
        res.json({code: 200, msg: `在API管理项目中不存在${url}接口，请前往项目中添加该接口`})
      } else {
        const {result, host, base_url, path} = filterModel[0]
        AXIOS_INSTANCE.request({
          method,
          url: Tools.formatUrl(host, base_url, path),
          data:body,
          params: params,
        }).then((data) => {
          console.log(data)
          const warnMsg = withCheck == 0 || withMock == 0 ? [] : Tools.isEqual(result, data)
          if (warnMsg.length === 0) {
            res.json({...data})
          } else {
            res.json({code: CODE.TEST_WARN, msg: warnMsg.join(';')})
          }
        }).catch((error) => {
          if (error.response) {
            if (error.response.status === 404 && withMock != 0) {
              console.log(result)
              res.json({...Tools.mockDataByResult(result)})
            }else {
              res.status(error.response.status).json({data: error.response.data})
            }
          } else {
            res.status(404).json({data: error})
          }
        })
      }
    })
  }
}
module.exports = {
  modelApis,
  addOrUpdate,
  query,
  testSingle,
  testModelApi,
  getTestMessage,
  sendApi,
  deleteApi,
  mockServer
}
