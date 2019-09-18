var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
const Tools = require('./utils')
var logger = require('morgan');
const middle = require('./middleware/')
const store = require('./store.js')
var indexRouter = require('./routes/index');
const mockServer = require('./controller/apis.js').mockServer
const parseForm = require("./middleware/parseForm.js")
var app = express();
const session = require('express-session');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// app.use(middle.clearSession);
app.use(session({
  secret: 'api_server',
  resave: false,
  store: store.Store,
  saveUninitialized: true,
  cookie:{
    secure: false,
    maxAge: 12 * 60 * 60 * 1000
  },
  genid: function(req) {
    const {username, password} = req.body
    if (username && password) {
      const timestamp = new Date().valueOf()
      const sessionID = Tools.base64([username, password, timestamp].join('_'))
      return sessionID
    }
  }
}))
app.use(middle.auth);
app.use(parseForm)
app.use('/api', indexRouter);
app.use('/mock', mockServer);
module.exports = app;
