var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
const MongoOptions = {
  url: 'mongodb://localhost:27017/auth_store',
  touchAfter:24*3600
}
module.exports = {
  Store: new MongoStore(MongoOptions)
}