const configForSql = {
  dev:{
      port: 3306,
      db:{
          host:'localhost',
          user:'root',
          password:'yang19901021',
          database:'api_manager' 
      }
  },
  product:{
      port: 443,
      db:{
          host:'127.0.0.1',
          user:'yangyangblog',
          password:'yang19901021',
          database:'api_manager'
      }
  }
}

module.exports = configForSql