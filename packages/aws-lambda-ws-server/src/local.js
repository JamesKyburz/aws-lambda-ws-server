const WebSocket = require('ws')
const querystring = require('querystring')
const mappingKey = process.env.MAPPING_KEY || 'message'
const http = require('http')

const server = http
  .createServer((req, res) => {
    const connectionId = req.url.split('%40connections/')[1]
    if (!connectionId) {
      res.writeHead(404)
      res.end()
      return
    }
    let payload = ''
    req.on('data', chunk => {
      payload += chunk
    })
    req.on('end', () => {
      const ws = clients[decodeURIComponent(connectionId)]
      if (!ws) {
        res.writeHead(410)
        res.end()
        return
      }
      ws.send(payload, err => {
        if (err) {
          console.error(err)
          res.writeHead(500)
          res.end()
        } else {
          res.end()
        }
      })
    })
  })
  .listen(process.env.PORT || 5000)

const wss = new WebSocket.Server({
  server,
  verifyClient (info, fn) {
    wss.emit('verifyClient', info, fn)
  }
})

const clients = {}

const queryStringBuilder = ({ url }) => {
  const result = querystring.parse(url.split('?')[1])
  const keys = Object.keys(result)
  return keys.length === 0
    ? undefined
    : keys.reduce((sum, key) => {
        sum[key] = Array.isArray(result[key]) ? result[key] : [result[key]]
        return sum
      }, {})
}

const headerBuilder = ({ headers }) => {
  const keys = Object.keys(headers)
  return keys.length === 0
    ? undefined
    : keys.reduce((sum, key) => {
        const value = headers[key].split(key === 'cookie' ? ';' : ',')
        sum[key] = value
        return sum
      }, {})
}

const event = (routeKey, eventType, req, body = '') => ({
  requestContext: {
    routeKey,
    eventType,
    connectionId: req.headers['sec-websocket-key']
  },
  multiValueQueryStringParameters: queryStringBuilder(req),
  multiValueHeaders: headerBuilder(req),
  body
})

const context = () => ({
  getRemainingTimeInMillis () {
    return 10000
  },
  async postToConnection (payload, connectionId) {
    return new Promise((resolve, reject) => {
      const ws = clients[connectionId]
      if (!ws) {
        const err = new Error(`no client with ${connectionId} found`)
        err.statusCode = 410
        return reject(err)
      }
      ws.send(JSON.stringify(payload), err => {
        if (err) return reject(err)
        resolve()
      })
    })
  }
})

module.exports = handler => {
  wss.removeAllListeners('verifyClient')
  wss.on('verifyClient', async (info, fn) => {
    const req = info.req
    try {
      const result = await handler(event('$connect', 'CONNECT', req), context())
      fn(result && result.statusCode === 200, result.statusCode)
    } catch (e) {
      console.error(e)
      fn(false, e.statusCode)
    }
  })
  wss.removeAllListeners('connection')
  wss.on('connection', (ws, req) => {
    const connectionId = req.headers['sec-websocket-key']
    clients[connectionId] = ws
    ws.on('close', async () => {
      try {
        delete clients[connectionId]
        await handler(event('$disconnect', 'DISCONNECT', req), context())
      } catch (e) {
        console.error(e)
      }
    })
    ws.on('message', async message => {
      try {
        const body = JSON.parse(message || '{}')
        await handler(
          event(body[mappingKey] || '$default', 'MESSAGE', req, message),
          context()
        )
      } catch (e) {
        console.error(e)
        try {
          await context().postToConnection(
            {
              message: 'Internal server error',
              connectionId
            },
            connectionId
          )
        } catch (e) {
          console.error(e)
        }
      }
    })
  })
}

module.exports.wss = wss
module.exports.server = server
