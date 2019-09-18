const parseForm = function(req, res, next) {
  // multipart/form-data; boundary=----WebKitFormBoundaryBApIbMiIPcNbPIsa
  const formdataReg = /multipart\/form-data\s*;\s*boundary=(-+[a-zA-Z0-9_]+)/;
  const contentType = req.get('Content-Type');
  const match = contentType ? contentType.match(formdataReg) : null
  if (match) {
    const boundary = match[1];
    req.setEncoding('binary');
    let body = ''
    req.on("data",(chunk) => {
      body += chunk
    })
    req.on("end",() => {
      const result = body.split('--' + boundary).filter((item) => {
        return !!item &&  item.indexOf('Content-Disposition') > -1
      }).map((item) => {
        return item.split('\r\n').filter(item => !!item);
      })
      const contentTypeFileReg = /Content-Disposition:\s*form-data\s*;\s*name=["']([a-zA-Z0-9_]+)["']\s*;\s*filename="(.+\..+)"/
      const contentTypeKeyReg = /Content-Disposition:\s*form-data\s*;\s*name=["']([a-zA-Z0-9_]+)["']/
      let form = {}
      result.forEach(item => {
        item.forEach(el => {
          let fileKey = el.match(contentTypeFileReg)
          let keys = el.match(contentTypeKeyReg)
          if (fileKey) {
            form[fileKey[1]] = item[item.length - 1]
          } else if(keys) {
            form[keys[1]] = item[item.length - 1]
          }
        })
      })
      req.body = form
      next()
    })
  } else {
    next();
  }
}

module.exports = parseForm