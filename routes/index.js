var express = require('express');
var router = express.Router();
const path = require('path')
/* GET home page. */

const routers = {
  "/login": {method: 'post', controller: 'login.Login'},
  "/logout": {method: 'get', controller: 'login.logout'},
  "/register": {method: 'post', controller: 'register'},
  "/getCode": {method: 'get', controller: 'getCode'},
  "/addProject": {method: 'post', controller: 'project.add'},
  "/queryProject": {method: 'post', controller: 'project.query'},
  "/getUsers": {method: 'get', controller: 'users.getusers'},
  "/project/detail": {method: 'post', controller: 'project.detail'},
  "/project/delete": {method: 'post', controller: 'project.deletePro'},
  "/project/update": {method: 'post', controller: 'project.update'},
  "/project/models": {method: 'post', controller: 'project.detailWithModel'},
  "/model/add": {method: 'post', controller: 'model.add'},
  "/model/detail": {method: 'post', controller: 'model.detail'},
  "/model/apis": {method: 'post', controller: 'apis.modelApis'},
  "/model/api": {method: 'post', controller: 'apis.addOrUpdate'},
  "/model/update": {method: 'post', controller: 'model.update'},
  "/model/delete": {method: 'post', controller: 'model.deleteModel'},
  "/model/queryApi": {method: 'get', controller: 'apis.query'},
  "/test/api/:api_id": {method: 'get', controller: 'apis.testSingle'},
  "/test/model/:model_id": {method: 'get', controller: 'apis.testModelApi'},
  "/test/message": {method: 'get', controller: 'apis.getTestMessage'},
  "/send/api": {method: 'post', controller: 'apis.sendApi'},
  "/api/delete": {method: 'post', controller: 'apis.deleteApi'},
  "/project/json": {method: 'post', controller: 'project.jsonFile'},
  "/project/import/json": {method: 'post', controller: 'project.importJson'}
}
for (const key in routers) {
  if (routers.hasOwnProperty(key)) {
    const element = routers[key];
    const file = element.controller.split('.')[0]
    const file_methods = element.controller.split('.')[1]
    const controller = require(path.join(__dirname, `../controller/${file}.js`))
    router[element.method](key, file_methods ? controller[file_methods] : controller)
  }
}

module.exports = router


