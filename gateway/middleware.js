const assert = require('assert')
const express = require('express')
const fs = require('fs')
const grpc = require('grpc')
const _ = require('lodash')

const HTTP_METHODS = ['delete', 'get', 'patch', 'post', 'put']

// https://cloud.google.com/apis/design/errors#handling_errors
const GRPC_TO_HTTP = new Map([
    [0, 200],
    [1, 499],
    [2, 500],
    [3, 400],
    [4, 504],
    [5, 404],
    [6, 409],
    [7, 403],
    [8, 429],
    [9, 400],
    [10, 409],
    [11, 400],
    [12, 501],
    [13, 500],
    [14, 503],
    [15, 500],
    [16, 401]
])

const constructMetadataFromHeaders = (headers) => {
    const metadata = new grpc.Metadata()
    Object.keys(headers).forEach((headerKey) => {
        metadata.set(headerKey, headers[headerKey])
    })
    return metadata
}

const addRouterEntry = (router, configuration, doCall) => {
    const httpMethod = configuration.method
    assert(HTTP_METHODS.includes(httpMethod))
    router[httpMethod](configuration.path, (request, response) => {
        const metadata = constructMetadataFromHeaders(request.headers)
        let payload = Object.assign({}, request.body, request.params)
        doCall(payload, metadata, (error, reply) => {
            if (error) {
                return response.sendStatus(GRPC_TO_HTTP.get(error.code))
            } else {
                return response.json(reply)
            }
        })
    })
}

module.exports = (protoPath, mappingPath, host, credentials = grpc.credentials.createInsecure()) => {
    const router = express.Router()
    const protoObject = grpc.load(protoPath)
    const serviceToMethods = JSON.parse(fs.readFileSync(mappingPath))
    Object.keys(serviceToMethods).forEach((serviceName) => {
        const ClientConstructor = _.get(protoObject, serviceName, null)
        assert(ClientConstructor !== null)
        const methodToConfiguration = serviceToMethods[serviceName]
        Object.keys(methodToConfiguration).forEach((methodName) => {
            addRouterEntry(router, methodToConfiguration[methodName],
                (payload, metadata, callback) => {
                    const serviceClient = new ClientConstructor(host, credentials)
                    serviceClient[methodName](payload, metadata, callback)
                })
        })
    })
    return router
}
