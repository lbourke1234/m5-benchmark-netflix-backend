import express from 'express'
import cors from 'cors'
import listEndpoints from 'express-list-endpoints'
import {
  badRequestErrorHandler,
  unauthorizedErrorHandler,
  notFoundErrorHandler,
  genericErrorHandler
} from './errorHandlers.js'
import mediaRouter from './apis/media/index.js'

const server = express()

const port = process.env.PORT || 5001

server.use(cors())
server.use(express.json())

server.use('/media', mediaRouter)

server.use(badRequestErrorHandler)
server.use(unauthorizedErrorHandler)
server.use(notFoundErrorHandler)
server.use(genericErrorHandler)

server.listen(port, () => {
  console.table(listEndpoints(server))
  console.log(`Server is listening on port ${port}!`)
})
