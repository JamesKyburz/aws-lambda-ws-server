const isLambda = require('is-lambda')
const postToConnection = require('aws-post-to-connection')

module.exports = routes => async (event, context) => {
  if (isLambda) context.postToConnection = postToConnection(event)
  const { eventType, routeKey, connectionId } = event.requestContext
  const connectionArgs = { id: connectionId, event, context }
  if (eventType === 'CONNECT') {
    if (routes.connect) {
      return routes.connect(connectionArgs)
    } else {
      return { statusCode: 200 }
    }
  } else if (eventType === 'DISCONNECT' && routes.disconnect) {
    return routes.disconnect(connectionArgs)
  } else if (eventType === 'MESSAGE') {
    const body = JSON.parse(
      Buffer.from(
        event.body || '{}',
        event.isBase64Encoded ? 'base64' : undefined
      )
    )
    const messageArgs = { ...connectionArgs, message: body }
    if (routes[routeKey]) {
      return routes[routeKey](messageArgs)
    } else if (routes.default) {
      return routes.default(messageArgs)
    }
  }
}
