import { randomUUID } from 'node:crypto'

import cors from '@fastify/cors'
import { prisma } from '@repo/db'
import {
  addErrorHandler,
  CLOUD_REDIS_DB,
  CLOUD_REDIS_HOST,
  CLOUD_REDIS_PORT,
  getFastifyLoggerConfig,
  initLogger,
  logError,
  logInfo,
  PORT,
} from '@repo/sdk'
import fastify from 'fastify'
import Redis from 'ioredis'

import { buildEntityAuthHeader } from './utils/entity'

initLogger('cloudState')

const redis = new Redis({
  host: CLOUD_REDIS_HOST,
  port: CLOUD_REDIS_PORT,
  keyPrefix: 'devfun:',
  db: CLOUD_REDIS_DB.STATE,
})

function createServer() {
  const server = fastify({ logger: getFastifyLoggerConfig('cloudState') })
  server.register(cors, { origin: '*' })
  server.addHook('preHandler', async (request, reply) => {
    if (request.raw.url === '/api/health') {
      return
    }
    const { appId, entity, id } = request.params as { appId: string, entity: string, id?: string }
    const entityHash = buildEntityAuthHeader({ appId, entity, id })
    if (request.headers['x-devfun-auth'] !== entityHash) {
      return reply.code(400).send({ error: 'Bad request' })
    }
  })
  addErrorHandler(server)

  const start = async () => {
    try {
      server.get('/api/health', { logLevel: 'silent' }, () => ({ status: 'ok' }))
      await server.register(require('@fastify/swagger'))
      await server.register(require('@fastify/swagger-ui'), {
        routePrefix: '/docs',
        uiConfig: {
          docExpansion: 'list',
          deepLinking: false,
        },
      })

      server.post('/api/:appId/:entity', { schema: { body: { type: 'object' } } }, async (request, reply) => {
        const { appId, entity } = request.params as { appId: string, entity: string }
        const app = await prisma.app.findUnique({ where: { id: appId } })
        if (!app) {
          return reply.code(400).send({ error: {} })
        }
        const data = request.body as any
        if (!isValidJson(data)) {
          return reply.code(400).send({ error: 'Invalid JSON' })
        }
        if (!data.id) {
          data.id = randomUUID()
        }
        await redis.hset(`${appId}:${entity}`, data.id, JSON.stringify(data))
        return reply.code(201).send(data)
      })

      server.get('/api/:appId/:entity', async (request, reply) => {
        const { appId, entity } = request.params as { appId: string, entity: string }
        const app = await prisma.app.findUnique({ where: { id: appId } })
        if (!app) {
          return reply.code(400).send({ error: {} })
        }
        const filters = request.query as Record<string, any>
        const data = await redis.hgetall(`${appId}:${entity}`)
        const rows = Object.values(data).map(item => JSON.parse(item))

        if (Object.keys(filters).length === 0) {
          return rows
        }

        return rows.filter((item) => {
          return Object.entries(filters).every(([key, value]) => {
            return Object.prototype.hasOwnProperty.call(item, key) && item[key] === value
          })
        })
      })

      server.get('/api/:appId/:entity/:id', async (request, reply) => {
        const { appId, entity, id } = request.params as {
          appId: string
          entity: string
          id: string
        }
        const app = await prisma.app.findUnique({ where: { id: appId } })
        if (!app) {
          return reply.code(400).send({ error: {} })
        }
        const data = await redis.hget(`${appId}:${entity}`, id)
        if (!data) {
          return reply.code(404).send({ error: 'Not found' })
        }
        return { id, ...JSON.parse(data) }
      })

      server.put('/api/:appId/:entity/:id', { schema: { body: { type: 'object' } } }, async (request, reply) => {
        const { appId, entity, id } = request.params as {
          appId: string
          entity: string
          id: string
        }
        const app = await prisma.app.findUnique({ where: { id: appId } })
        if (!app) {
          return reply.code(400).send({ error: {} })
        }
        const data = request.body as any
        if (!isValidJson(data)) {
          return reply.code(400).send({ error: 'Invalid JSON' })
        }
        const exists = await redis.hexists(`${appId}:${entity}`, id)
        if (!exists) {
          return reply.code(404).send({ error: 'Not found' })
        }
        await redis.hset(`${appId}:${entity}`, id, JSON.stringify({ ...data, id }))
        return { ...data, id }
      })

      server.delete('/api/:appId/:entity/:id', async (request, reply) => {
        const { appId, entity, id } = request.params as {
          appId: string
          entity: string
          id: string
        }
        const app = await prisma.app.findUnique({ where: { id: appId } })
        if (!app) {
          return reply.code(400).send({ error: {} })
        }
        const deleted = await redis.hdel(`${appId}:${entity}`, id)
        if (deleted === 0) {
          return reply.code(404).send({ error: 'Not found' })
        }
        return { success: true }
      })

      await server.listen({ host: '0.0.0.0', port: PORT.CLOUD_STATE })
      logInfo(`State API listening at http://0.0.0.0:${PORT.CLOUD_STATE}`)
    }
    catch (error) {
      logError(error)
      throw error
    }
  }

  const stop = async () => {
    await server.close()
  }

  return { server, start, stop }
}

const server = createServer()
void server.start()

async function gracefulShutdown() {
  logInfo('Shutting down gracefully')
  try {
    await server.stop()
    process.exit(0)
  }
  catch (error) {
    logError(error, { scenario: 'shutdown' })
    throw error
  }
}

process.once('SIGTERM', gracefulShutdown)
process.once('SIGINT', gracefulShutdown)

function isValidJson(json: any) {
  if (!json) {
    return false
  }
  return JSON.stringify(json).length < 1000_000
}