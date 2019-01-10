const WebSocket = require('ws')
const mappingKey = process.env.MAPPING_KEY || 'message'
const wss = new WebSocket.Server({
  port: process.env.PORT || 5000,
  verifyClient (info, fn) {
    wss.emit('verifyClient', info, fn)
  }
})

const clients = {}

const event = (routeKey, eventType, connectionId, body = '') => ({
  requestContext: { routeKey, eventType, connectionId },
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
    const connectionId = info.req.headers['sec-websocket-key']
    try {
      const result = await handler(
        event('$connect', 'CONNECT', connectionId),
        context()
      )
      fn(result && result.statusCode === 200, result.statusCode)
    } catch (e) {
      console.error(e)
      fn(false, e.statusCode)
    }
  })
  wss.removeAllListeners('connection')
  wss.on('connection', (ws, request) => {
    const connectionId = request.headers['sec-websocket-key']
    clients[connectionId] = ws
    ws.on('close', async () => {
      try {
        delete clients[connectionId]
        await handler(
          event('$disconnect', 'DISCONNECT', connectionId),
          context()
        )
      } catch (e) {
        console.error(e)
      }
    })
    ws.on('message', async message => {
      try {
        const body = JSON.parse(message)
        await handler(
          event(
            body[mappingKey] || '$default',
            'MESSAGE',
            connectionId,
            message
          ),
          context()
        )
      } catch (e) {
        console.error(e)
      }
    })
  })
}

module.exports.wss = wss

