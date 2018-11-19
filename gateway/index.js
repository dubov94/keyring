const bodyParser = require('body-parser')
const express = require('express')
const request = require('request')
const middleware = require('./middleware')

const application = express()
application.set('trust proxy', ['uniquelocal'])
application.use(bodyParser.json())
application.use('/api', middleware(
    process.argv[2], process.argv[3], process.env.PROXY_TARGET))
application.listen(80)

setInterval(() => {
    request(`http://localhost/api${process.argv[4]}`, (error, response) => {
        if (error !== null) {
            console.error(error)
        }
    })
}, 60 * 1000)
