import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { apiRoutes } from './routes/api.js';
import { wsRoutes } from './routes/ws.js';

dotenv.config();

const port = parseInt(process.env.PORT || '4000', 10);
const host = process.env.HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

async function bootstrap() {
  await fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
    },
  });

  await fastify.register(apiRoutes);
  await fastify.register(wsRoutes);

  try {
    const address = await fastify.listen({ port, host });
    fastify.log.info(`[Xosonic HyperX Engine] Online at ${address}`);
    fastify.log.info(`Studio: XrLabs | Lead Creator: beatrix.sql`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
