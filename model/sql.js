const mysql = require('mysql')
const config = require('../config')
// const Methods = require("../utils/index.js")
let sqlConfig
if(process.env.NODE_ENV === 'dev'){
    sqlConfig = config.dev.db
}else{
    sqlConfig = config.product.db
} 
let Pool = mysql.createPool(sqlConfig)
let connectNum = 1

let dbService = function (sql) {
    return new Promise((resolve, reject)=>{ 
        Pool.getConnection(function(err, connection){
            if(err){
              console.log(err)
              setTimeout(()=>{ 
                    if(connectNum >= 5){
                        connectNum = 1
                        return 
                    }
                    arguments.callee(arguments)  // 重新链接
                    connectNum ++
                }, 2000)
            } else {
                connection.query(sql, function(error, results, fields){
                  // console.log(results)
                    if(error){
                        // Methods.logError(err)
                        reject(error)
                    }else{
                        resolve(results)
                    }
                    connection.release()
                })
            }
            
        })
    })
}


module.exports =  dbService