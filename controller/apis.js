const dbService = require('../model/service.js')
const CODE = require('../constant/code.js')
const Tools = require('../utils')
const AXIOS = require('axios')
const process = require('process')
const store = require('../store.js')
const moment = require('moment')
const modelApis = function(req, res) {
  const {model_id, limit, page} = req.body
  console.log(model_id, limit, page)
  dbService.getModelApis({model_id, limit, page}, function(result) {
    const data = {}
    data.lists = result[0]
    data.total = result[1][0]['count(*)']
    Tools.successRes(res, data)
  })
}
function jsonData(data) {
  return Object.keys(data).length > 0 ? JSON.stringify(data) : ''
}
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
const query = function(req, res) {
  const  {api_id} = req.query
  dbService.queryApi(api_id, (result) => {
    Tools.successRes(res, result[0])
  })
}


const AXIOS_INSTANCE = AXIOS.create({timeout: 5000})
AXIOS_INSTANCE.interceptors.response.use(function (response) {
  // 对响应数据做点什么
  return response.data;
}, function (error) {
  return Promise.reject(error);
});

class Queue {
  constructor(req) {
    this.ongoing = false
    this.req = req
    this.lines = []
  }
  appendChild(fn) {
    this.lines.push(fn)
  }
  run() {
    if (this.lines.length === 0) {
      this.ongoing = false
      return
    }
    const fn = this.lines.shift()
    if (this.ongoing) {
      return
    } else {
      fn(this.req)
      process.nextTick(()=> {
        this.run()
      })
    }
  }
}


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
function addMsgToSession(id,message) {
  store.Store.get(id, (err, session) => {
    if (!err) {
      store.Store.set(id, Object.assign({}, session, {testMsg: session.testMsg.concat(message)}))
    }
  })
}

function handleApiRequest (data, session_id) {
  const {host = '', path='', base_url='', headers =  {}, body = {}, params = {}, result = {}, method, title, api_id,model_title, model_id, project_id} = data
  const url = Tools.formatUrl(host, base_url, path)
  return function () {
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
      addMsgToSession(session_id, data)
    }).catch((error) => {
      const data = {}
      data.type = 'error'
      data.api_content = model_title + '->' + title
      data.message = '接口调用失败：' + `${error.message ? error.message : ''}`
      data.api_id = api_id
      data.model_id = model_id
      data.project_id = project_id
      data.time = moment().format('YYYY-MM-DD hh:mm:ss')
      addMsgToSession(session_id, data)
    })
  }
}

const testModelApi = function(req, res) {
  const { model_id } =  req.params
  const queue = new Queue(res)
  dbService.queryModelApiForTest(model_id, function(data) {
    data.forEach((item) => {
      queue.appendChild(handleApiRequest(item, req.session.id))
    })
     queue.run()
     res.json({code: 200, msg: '测试开始'})
    }
  )
}
const getTestMessage = function(req, res) {
  const data = req.session.testMsg.concat([])
  req.session.testMsg = []
  res.json({code: 200, data: data})
}
const sendApi = function (req, res) {
  const {body = {}, params={}, headers={}, result, method, api_url} = req.body
  console.log(params)
  AXIOS_INSTANCE.request({
    url: api_url,
    method,
    body,
    params,
    headers
  }).then((data) => {
    res.json({code: 200, data})
  }).catch((error) => {
    if (error) {
      res.json({code: 200, data: error})
    }
  })
}
module.exports = {
  modelApis,
  addOrUpdate,
  query,
  testSingle,
  testModelApi,
  getTestMessage,
  sendApi
}