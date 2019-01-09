module.exports = require('is-lambda') ? require('./lambda') : require('./local')
module.exports.handler = require('./handler')
