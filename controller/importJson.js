
const dbService = require('../model/service.js')
process.on('message', (data) => {
  const project = JSON.parse(data.file);
  const user = data.user
  const {title, description} = project;
  dbService.addProject({title, description, created_user: user}, (pro) => {
    const {insertId} = pro
    const models = project.modles.map((model) => {
      const {title, description, host, base_url, project_id = insertId, create_user = user} = model
      return {title, description, host, base_url, project_id, create_user}
    })
    dbService.addModel(models, (res) => {
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
      dbService.addApi(apis, (res) => {
        process.exit(0)
      })
    })
  })
})