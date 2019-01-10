const { test } = require('tap')

const wss = require('..')
const WebSocket = require('ws')

test('send ok connection', t => {
  t.plan(2)
  wss(
    wss.handler({
      async connect ({ id }) {
        t.ok(id)
        return { statusCode: 200 }
      }
    })
  )
  const ws = new WebSocket('ws://localhost:5000')
  ws.on('open', () => t.ok('websocket connection established'))
})

test('send bad connection', t => {
  t.plan(1)
  wss(
    wss.handler({
      async connect () {
        return { statusCode: 401 }
      }
    })
  )
  const ws = new WebSocket('ws://localhost:5000')
  ws.on('open', () => t.fail('websocket connection established'))
  ws.on('error', () => t.ok('websocket connection not allowed'))
})

test('disconnect', t => {
  t.plan(1)
  wss(
    wss.handler({
      async disconnect ({ id }) {
        t.ok(id)
        return { statusCode: 200 }
      }
    })
  )
  const ws = new WebSocket('ws://localhost:5000')
  ws.on('open', () => ws.close())
})

test('send default', t => {
  t.plan(1)
  wss(
    wss.handler({
      async default ({ id }) {
        t.ok(id)
        return { statusCode: 200 }
      }
    })
  )
  const ws = new WebSocket('ws://localhost:5000')
  ws.on('open', () => ws.send('{}'))
})

test('send message', t => {
  t.plan(1)
  wss(
    wss.handler({
      async message ({ id }) {
        t.ok(id)
        return { statusCode: 200 }
      }
    })
  )
  const ws = new WebSocket('ws://localhost:5000')
  ws.on('open', () => ws.send('{"message": "message"}'))
})

test('reply', t => {
  t.plan(1)
  wss(
    wss.handler({
      async message ({ id, context }) {
        const { postToConnection } = context
        await postToConnection({ message: 'hi' }, id)
        return { statusCode: 200 }
      }
    })
  )
  const ws = new WebSocket('ws://localhost:5000')
  ws.on('open', () => ws.send('{"message": "message"}'))
  ws.on('message', message => t.equals('{"message":"hi"}', message))
})

test('broadcast', t => {
  t.plan(3)
  const clients = {}
  wss(
    wss.handler({
      async connect ({ id }) {
        clients[id] = id
        return { statusCode: 200 }
      },
      async broadcast ({ id, context }) {
        const { postToConnection } = context
        for (const client of Object.keys(clients)) {
          await postToConnection({ message: 'hi' }, client)
        }
        return { statusCode: 200 }
      }
    })
  )
  const ws3 = new WebSocket('ws://localhost:5000')
  ws3.on('message', message => t.equals('{"message":"hi"}', message))

  const ws2 = new WebSocket('ws://localhost:5000')
  ws2.on('message', message => t.equals('{"message":"hi"}', message))

  const ws1 = new WebSocket('ws://localhost:5000')
  ws1.on('open', () => ws1.send('{"message": "broadcast"}'))
  ws1.on('message', message => t.equals('{"message":"hi"}', message))

})

test('terminate', t => {
  wss.wss.close()
  t.end()
})
