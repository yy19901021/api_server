
const dbService = require('../model/service.js')
process.on('message', (data) => {
  const project = JSON.parse(data.file);
  const user = data.user
  const {title, description} = project;
  dbService.addProject({title, description, created_user: user}, (pro) => {
    const {insertId} = pro
    dbService.addRelativeforProject([[insertId, user]], (res) => {
      if (!res.insertId) {
        throw new Error( "插入关系库失败")
      }
    })
    const models = project.modles.map((model) => {
      const {title, description, host, base_url, project_id = insertId, create_user = user} = model
      return {title, description, host, base_url, project_id, create_user}
    })
    models.length > 0 && dbService.addModel(models, (res) => {
      const modelInsertId = res.insertId
      const apis = project.modles.map((model) => {
        return model.apis.map((api, index) => {
          delete api.api_id
          api.model_id = modelInsertId + index
          return api
        })
      }).reduce((pre, next) => {
        return pre.concat(next)
      }, [])
      apis.length > 0 && dbService.addApi(apis, (res) => {
        process.exit(0)
      })
    })
  })
})