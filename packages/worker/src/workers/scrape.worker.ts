import { QUEUES, type ScrapeJobData } from '@hako/shared/queues';
import { Worker } from 'bullmq';
import { prisma } from '../prisma.js';
import { indexSyncQueue } from '../queue-registry.js';
import { redis } from '../redis.js';
import { scraperService } from '../scraper.js';

export const scrapeWorker = new Worker<ScrapeJobData>(
  QUEUES.SCRAPE,
  async (job) => {
    const { itemId, url, userId } = job.data;

    await prisma.item.update({
      where: { id: itemId },
      data: { status: 'processing' },
    });

    const result = await scraperService.scrape(url);

    await prisma.item.update({
      where: { id: itemId },
      data: {
        title: result.title,
        description: result.description,
        imageUrl: result.imageUrl,
        author: result.author,
        siteName: result.siteName,
        type: result.type,
        status: 'done',
      },
    });

    await indexSyncQueue.add('sync', { itemId, userId });
  },
  {
    connection: redis,
    concurrency: 3,
  },
);

scrapeWorker.on('failed', async (job, err) => {
  if (!job) return;
  await prisma.item.update({
    where: { id: job.data.itemId },
    data: { status: 'failed' },
  });
  console.error(`[scrape] job ${job.id} failed:`, err.message);
});
