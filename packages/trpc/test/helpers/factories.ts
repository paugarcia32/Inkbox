import type { Collection, CollectionSection, Item, User } from '@hako/db';
import { prisma } from './prisma';

let counter = 0;
const uid = () => `${++counter}-${Date.now()}`;

export async function createTestUser(
  overrides: Partial<{ email: string; name: string; emailVerified: boolean }> = {},
): Promise<User> {
  return prisma.user.create({
    data: {
      email: `user-${uid()}@test.com`,
      emailVerified: false,
      ...overrides,
    },
  });
}

export async function createTestItem(
  userId: string,
  overrides: Partial<{
    url: string;
    type: string;
    status: string;
    title: string;
    isRead: boolean;
    isFavorite: boolean;
    isPublic: boolean;
    isArchived: boolean;
  }> = {},
): Promise<Item> {
  return prisma.item.create({
    data: {
      userId,
      url: `https://example.com/item-${uid()}`,
      ...overrides,
    } as Parameters<typeof prisma.item.create>[0]['data'],
  });
}

export async function createTestCollection(
  userId: string,
  overrides: Partial<{
    name: string;
    description: string;
    isPublic: boolean;
    shareToken: string;
  }> = {},
): Promise<Collection> {
  return prisma.collection.create({
    data: {
      userId,
      name: `Collection ${uid()}`,
      ...overrides,
    },
  });
}

export async function createTestSection(
  collectionId: string,
  overrides: Partial<{ name: string; order: number }> = {},
): Promise<CollectionSection> {
  return prisma.collectionSection.create({
    data: {
      collectionId,
      name: `Section ${uid()}`,
      order: 0,
      ...overrides,
    },
  });
}
