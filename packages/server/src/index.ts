import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { RateLimiterMemory, RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { auth } from './auth.js';
import { prisma } from './db.js';
import { redis } from './redis.js';
import { trpcHandler } from './trpc-handler.js';

const isProd = process.env.NODE_ENV === 'production';
const limiter = redis
  ? new RateLimiterRedis({
      storeClient: redis,
      points: isProd ? 60 : 300,
      duration: 60,
      keyPrefix: 'rl:global',
    })
  : new RateLimiterMemory({ points: isProd ? 60 : 300, duration: 60 });

const app = new Hono();

app.use(
  '*',
  cors({
    origin: isProd ? (process.env.WEB_ORIGIN ?? 'http://localhost:3000') : (origin) => origin,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }),
);

app.use('*', async (c, next) => {
  const key = c.req.header('x-forwarded-for') ?? 'unknown';
  try {
    await limiter.consume(key);
  } catch (e) {
    if (e instanceof RateLimiterRes) return c.json({ error: 'Too Many Requests' }, 429);
    throw e;
  }
  return next();
});

app.all('/api/auth/*', (c) => auth.handler(c.req.raw));
app.use('/trpc/*', trpcHandler);

const port = Number(process.env.PORT ?? 3001);
await prisma.$connect();

const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
