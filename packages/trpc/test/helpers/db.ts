import type { PrismaClient } from '@hako/db';

export async function truncateAll(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      collection_items,
      collection_sections,
      item_tags,
      tags,
      collections,
      items,
      sessions,
      accounts,
      verifications,
      users
    RESTART IDENTITY CASCADE
  `);
}
