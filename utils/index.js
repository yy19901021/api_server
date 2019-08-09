const crypto = require('crypto');
const CODE = require('../constant/code.js')


const templates = {
  query: '<--keys--><--table--><--where--><--orderBy--><--limit--><--offset-->',
  count: '<--count--><--as--><--table--><--where-->',
  update: '<--table--><--values--><--where-->',
  insert: '<--table--><--keys--><--values--><--duplicate-->'
}
// 判断结束字符
function endOf (chart, str) {
  return str.trim().lastIndexOf(chart) === str.length - 1
}
// 数组扁平
function singleArr(arr) {
  let result = []
  arr.forEach(element => {
    if (Array.isArray(element)) {
      result = result.concat(singleArr(element))
    } else if(typeof element === 'object') {
      result = result.concat(Object.keys(element))
    } else {
      result.push(element)
    }
  });
  return result;
}
// 格式化对象

function linkObject (obj, link) {
  const keys = Object.keys(obj)
  return keys.filter(item => typeof obj[item] === 'number' || typeof obj[item] === 'string')
  .map(item => `${item} ${link} ${typeof obj[item] === 'number' ? obj[item] : `'${obj[item]}'`}`).join(', ')
}

class sqlFactory {
  constructor(props) {
    this.sqlStr = `${props.initStr} ${templates[props.type]}`
  }
  firstInsert(insert, placeholder, operatorstr='') {
    let split = this.sqlStr.split(placeholder)
    split[0] += `${operatorstr} ${insert}`
    this.sqlStr = split.join(placeholder)
  }
  insertStr(insert, placeholder, operatorstr='', frontstr = ',') {
    if (this.sqlStr.indexOf(placeholder) < 0) {
      return
    }
    let split = this.sqlStr.split(placeholder)
    if (endOf('>',  split[0])) {
      split[0] += ` ${operatorstr} ${insert}`
    } else {
      split[0] += `${frontstr} ${insert}`
    }
    this.sqlStr = split.join(placeholder)
  }
  formatKeys (keys, jionstr = ',') {
    return keys.filter(item => typeof item === 'string' || typeof item === 'number')
    .map(item => typeof item === 'string' ? ` ${item}` : ` '${item}'`).join(jionstr)
  }
  table() {
    const args = singleArr([...arguments])
    let keystr = this.formatKeys(args)
    this.insertStr(keystr, '<--table-->', 'from')
    return this
  }
  where(str = '') {
    this.insertStr(` ${str} `, '<--where-->', 'where')
    this.or = function(orstr) {
      this.insertStr(` or ${orstr}`, '<--where-->', '', '')
      return this
    }
    this.and = function(andstr) {
      this.insertStr(` and ${andstr}`, '<--where-->', '', '')
      return this
    }
    return this
  }
  toEnd() {
    const maths = this.sqlStr.replace(/<--[a-zA-Z]+-->/g, '').replace(/\s{2, 10}/g, ' ')
    return maths
  }
}

class Query extends sqlFactory {
  constructor(props) {
    super(props)
  }
  keys() {
    const args = singleArr([...arguments])
    let keystr = this.formatKeys(args)
    this.firstInsert(keystr, '<--keys-->')
    return this
  }
  // 去重复
  distinct() {
    const splits = this.sqlStr.split('select')
    splits[1] = ' distinct' + splits[1]
    this.sqlStr = splits.join('select')
    return this
  }
  orderBy() {
    const args = [...arguments]
    let keystr = this.formatKeys(args)
    this.insertStr(` order by ${keystr}`, '<--orderBy-->')
    return this
  }
  limit(number) {
    this.insertStr(number, '<--limit-->', 'limit')
    return this
  }
  offset(number) {
    this.insertStr(number, '<--offset-->', 'offset')
    return this
  }
}
class Count extends sqlFactory{
  constructor(props) {
    super(props)
  }
  count(key = '*', distinct= false) {
    this.firstInsert(` count(${distinct ? `distinct ${key}`: key})`, '<--count-->', '', '')
    return this
  }
  as(key) {
    this.insertStr(` ${key}`, '<--as-->', 'as', '')
    return this
  }
}
class Update extends sqlFactory{
  constructor(props) {
    super(props)
  }
  update(values) {
    if (typeof values  === 'string') {
      this.insertStr(` set ${values} `, '<--values-->')
    } else {
      const str = linkObject(values, '=')
      this.insertStr(` set ${str} `, '<--values-->')
    }
    return this
  }
  table(key) {
    this.insertStr(key, '<--table-->', '', '')
    return this
  }
}
class Insert extends sqlFactory {
  constructor(props) {
    super(props)
  }
  insert(params, noReapeat= false) {
    let keys = [], values=[]
    function formatValues (keyArr, obj) {
      const result = `(${keyArr.map(item => isNaN(obj[item] - 0) ||  obj[item] === '' ? `'${obj[item]}'` : obj[item]).join(', ')})`
      return result
    }
    if (Array.isArray(params)) {
      keys = Object.keys(params[0])
      values = params.map(item => formatValues(keys, item))
    } else if(typeof params === 'object') {
      keys = Object.keys(params)
      values = [formatValues(keys, params)]
    }
    this.insertStr(`(${keys.join(', ')}) `, '<--keys-->')
    if (noReapeat) {
      
    } else {
      this.insertStr(`values ${values.join(', ')}`, '<--values-->')
    }
    return this
  }
  table(key) {
    this.insertStr(key, '<--table-->', '', '')
    return this
  }
  duplicate() {
    const keys = singleArr([...arguments]).map(item => ` ${item}= values(${item})`)
    this.insertStr(` on duplicate key update ${keys.join(', ')}`, '<--duplicate-->')
    return this
  }
}
const Sql = {
  query(){
    const sqlStr = `${'select'} `
    return new Query({initStr: sqlStr, type: 'query'})
  },
  count() {
    const sqlStr = `${'select'} `
    return new Count({initStr: sqlStr, type: 'count'})
  },
  insert() {
    this.sqlStr = 'insert into '
    return new Insert({initStr: sqlStr, type: 'insert'})
  },
  update() {
    this.sqlStr = `${'update'} `
    return new Update({initStr: sqlStr, type: 'update'})
  },
  delete() {
    this.sqlStr = 'DELETE '
  }
}

let steps = []
const formatApiResult = function(data){
  let result = []
  if (Array.isArray(data)) {
    data = [data[0]]
  }
  if (!!data && typeof data !== 'object') {
    console.log(data)
    data = JSON.parse(data)
  }
  Object.keys(data).forEach((item,index) => {
    steps.push(item)
    const itemObj = {keys: steps.concat([])}
    const value = data[item]
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        itemObj.type = 'array'
      } else {
        itemObj.type = 'object'
      }
      result.push(itemObj)
      result = result.concat(formatApiResult(value))
    } else {
      itemObj.type = typeof value
      result.push(itemObj)
    }
    steps.pop()
  })
  return result
}


const getValueByKeys = function(keys, values) {
  let value = values
  keys.some((item) => {
    value = value[item]
    if (value === undefined) {
      return true
    }
  })
  return value
}
const isType = function(value, type) {
  if (type === 'string' || type === 'number') {
    return typeof value === type
  } else if (type === 'array') {
    return Array.isArray(value)
  } else if (type === 'object') {
    return typeof value === 'object'
  }
}
module.exports = {
  hash(str) {
    const hashFactory = crypto.createHash('sha256')
    return hashFactory.update(str).digest('hex')
  },
  base64(str) {
    const buffer = Buffer.from(str)
    return buffer.toString('base64')
  },
  parseBase64(str) {
    return Buffer.from(str, 'base64').toString()
  },
  successRes(res, data) {
    res.json({code: CODE.SUCCESS, data})
  },
  Sql,
  formatUrl: function (){
    const arg = [...arguments]
    const url = arg.reduce((pre, item) => {
      if (item === undefined) {
        item = ''
      }
      if (pre.match(/\/+$/)) {
        pre = pre.replace(/\/+$/, '')
      } 
      pre += '/'
      if (item.match(/^\/+/)) {
        item = item.replace(/^\/+/, '')
      }
      return pre + item
    })
    return url
  },
  parseJson(str) {
    return !!str ? JSON.parse(str) : {}
  },
  isEqual(template, result) {
    const messages = []
    if (!template) {
      return messages
    }
    const formatTemplate = formatApiResult(template)
    for (let i = 0; i < formatTemplate.length; i++) {
      const element = formatTemplate[i];
      const value = getValueByKeys(element.keys, result)
      if (value === undefined) {
        messages.push(`返回数据不存在${element.keys.join('.')}字段`)
      } else if (!isType(value, element.type)) {
        messages.push(`返回数据${element.keys.join('.')}的类型应该是${element.type}`)
      }
    }
    return messages
  }
}