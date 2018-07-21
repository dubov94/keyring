const bodyParser = require('body-parser')
const express = require('express')
const middleware = require('./middleware')

const application = express()
application.use(bodyParser.json())
application.use('/api', middleware(
    process.argv[2], process.argv[3], 'localhost:591'))
application.listen(80)
