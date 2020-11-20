# aws-post-to-connection

[![js-standard-style](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://github.com/feross/standard)
[![build status](https://api.travis-ci.org/JamesKyburz/aws-lambda-ws-server.svg)](https://travis-ci.org/JamesKyburz/aws-lambda-ws-server)
[![downloads](https://img.shields.io/npm/dm/aws-post-to-connection.svg)](https://npmjs.org/package/aws-post-to-connection)

post to a connected websocket client.

### usage

```javascript
const PostToConnection = require('aws-post-to-connection')

// post to same gateway
const postToSameGateway = PostToConnection(event)
await postToSameGateway({ message: 'hello' }, 'connectionId')

// post to another gateway
const postToAnotherGateway = PostToConnection({
  stage: 'stage',
  domainName: '<apiId>.execute-api.<region>.amazonaws.com'
})
await postToConnection({ message: 'hello' }, 'connectionId')

// post to local websocket server
const postToLocalhost = PostToConnection({
  stage: 'stage',
  domainName: 'localhost',
  port: 5000,
  secure: false
})
await postToConnection({ message: 'hello' }, 'connectionId')
```

Works locally and in a lambda function.

# license
[Apache License, Version 2.0](LICENSE)
