const aws4 = require('aws4')
const https = require('https')
const http = require('http')

module.exports = event => async (message, connectionId) => {
  const { stage, domainName, secure = true } = event.requestContext
    ? event.requestContext
    : event
  const port = event.port || (secure ? 443 : 80)
  const { host, path, method, headers, body } = aws4.sign({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    host: domainName,
    path: `/${stage}/%40connections/${encodeURIComponent(connectionId)}`,
    body: JSON.stringify(message)
  })

  return new Promise((resolve, reject) => {
    const post = (secure ? https : http).request(
      {
        host,
        port,
        method,
        path,
        headers
      },
      res =>
        res.statusCode === 200
          ? resolve()
          : reject(new Error(`invalid status ${res.statusCode}`))
    )
    post.on('error', reject)
    post.write(body)
    post.end()
  })
}
