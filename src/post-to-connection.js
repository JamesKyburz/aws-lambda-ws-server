const aws4 = require('aws4')
const http = require('https')
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION

module.exports = event => async (message, connectionId) => {
  const { stage, apiId } = event.requestContext
  const { host, path, method, headers, body } = aws4.sign({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    host: `${apiId}.execute-api.${region}.amazonaws.com`,
    path: `/${stage}/%40connections/${encodeURIComponent(connectionId)}`,
    body: JSON.stringify(message)
  })

  return new Promise((resolve, reject) => {
    const post = http.request(
      {
        host,
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
