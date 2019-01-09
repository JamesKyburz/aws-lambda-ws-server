# aws-lambda-ws-server

aws lambda websocket server.

### usage

```javascript
const ws = require('aws-lambda-ws-server')
exports.handler = ws(
  ws.handler({
    async connect ({ id }) {
      console.log('connection %s', id)
      return { statusCode: 200 }
    },
    async disconnect ({ id }) {
      console.log('disconnect %s', id)
    },
    async default ({ message, id }) {
      console.log('default message', message, id)
    },
    async message ({ message, id, context }) {
      const { postToConnection } = context
      console.log('message', message, id)
      await postToConnection({ message: 'echo' }, id)
    }
  })
)
```

Works locally and in a lambda function.

# license
[Apache License, Version 2.0](LICENSE)
