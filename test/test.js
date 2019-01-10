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

test('no querystring', t => {
  t.plan(2)
  wss(
    wss.handler({
      async connect ({ event }) {
        t.notOk(event.multiValueQueryStringParameters)
        return { statusCode: 200 }
      }
    })
  )
  new WebSocket('ws://localhost:5000')
  .on('open', () => t.ok('websocket connection established'))
})

test('querystring /?x=42', t => {
  t.plan(2)
  wss(
    wss.handler({
      async connect ({ event }) {
        t.deepEquals(event.multiValueQueryStringParameters, {
          x: ['42']
        })
        return { statusCode: 200 }
      }
    })
  )
  new WebSocket('ws://localhost:5000/?x=42')
  .on('open', () => t.ok('websocket connection established'))
})

test('querystring /?x=1&x=2', t => {
  t.plan(2)
  wss(
    wss.handler({
      async connect ({ event }) {
        t.deepEquals(event.multiValueQueryStringParameters, {
          x: ['1', '2']
        })
        return { statusCode: 200 }
      }
    })
  )
  new WebSocket('ws://localhost:5000/?x=1&x=2')
  .on('open', () => t.ok('websocket connection established'))
})

test('headers', t => {
  t.plan(3)
  wss(
    wss.handler({
      async connect ({ event }) {
        t.deepEquals(['42'], event.multiValueHeaders['x-custom'])
        t.deepEquals(['a=1', 'b=2'], event.multiValueHeaders['cookie'])
        return { statusCode: 200 }
      }
    })
  )
  new WebSocket('ws://localhost:5000', {
    headers: {
      'x-custom': '42',
      cookie: 'a=1;b=2'
    }
  })
  .on('open', () => t.ok('websocket connection established'))
})

test('terminate', t => {
  wss.wss.close()
  t.end()
})
