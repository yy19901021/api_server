const AXIOS = require('axios')
const dbService = require('../model/service.js')
const store = require('../store.js')
const Tools = require('../utils/index.js')
const moment = require( "moment")
const AXIOS_INSTANCE = AXIOS.create({timeout: 5000, headers: {
  'Content-Type': 'application/json;charset=UTF-8'
}})
AXIOS_INSTANCE.interceptors.response.use(function (response) {
  // 对响应数据做点什么
  return response.data;
}, function (error) {
  return Promise.reject(error);
});

function sendToMaster(id,message) {
  process.send({id,message})
}
let apisNum = 0
// 批量测试生成请求的函数
function handleApiRequest (data, session_id) {
  apisNum++
  const {host = '', path='', base_url='', headers =  {}, body = {}, params = {}, result = {}, method, title, api_id,model_title, model_id, project_id} = data
  const url = Tools.formatUrl(host, base_url, path)
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
    sendToMaster(session_id, data)
  }).catch((error) => {
    const data = {}
    data.type = 'error'
    data.api_content = model_title + '->' + title
    data.message = '接口调用失败：' + `${error.message ? error.message : ''}`
    data.api_id = api_id
    data.model_id = model_id
    data.project_id = project_id
    data.time = moment().format('YYYY-MM-DD hh:mm:ss')
    sendToMaster(session_id, data)
  }).finally(() => {
    apisNum--
    if (apisNum === 0) {
      process.exit(0)
    }
  })
}

process.on('message', (data) => {
  const {model_id, session_id} = data
  if(model_id !== undefined && session_id !== undefined) {
    dbService.queryModelApiForTest(model_id, function(data) {
        data.forEach((item) => {
          handleApiRequest(item, session_id)
        })
      }
    )
  }
})