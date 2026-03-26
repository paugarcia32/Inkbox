import { Redis } from 'ioredis';

const url = process.env.REDIS_URL;

export const redis = url
  ? new Redis(url, {
      maxRetriesPerRequest: null, // required by BullMQ (Step 2)
      enableReadyCheck: false,
    })
  : null;
