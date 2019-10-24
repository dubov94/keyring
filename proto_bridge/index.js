const bodyParser = require('body-parser')
const express = require('express')
const jsonToGrpcRouterFactory = require('./json_to_grpc_router_factory')

const application = express()
application.set('trust proxy', ['uniquelocal'])
application.use(bodyParser.json())
application.use('/api', jsonToGrpcRouterFactory(
    process.argv[2], process.argv[3], process.env.PROXY_TARGET))
application.listen(80)
