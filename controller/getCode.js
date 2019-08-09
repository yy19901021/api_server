const svgCaptcha = require('svg-captcha');

const getCode = function(req, res, next) {
  var captcha = svgCaptcha.create();
  console.log(captcha.text)
  res.cookie("code",captcha.text,{maxAge: 10 * 60 * 1000})
	res.type('svg');
	res.status(200).send(captcha.data);
}

module.exports = getCode