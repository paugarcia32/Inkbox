import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestModule, getTestModule } from '../../test/helpers/create-test-module';
import { truncateAll } from '../../test/helpers/db';
import { createTestCollection, createTestItem, createTestUser } from '../../test/helpers/factories';
import { prisma } from '../../test/helpers/prisma';
import { CollectionsService } from './collections.service';

describe('CollectionsService', () => {
  let service: CollectionsService;

  beforeEach(async () => {
    const module = await getTestModule();
    service = module.get(CollectionsService);
    await truncateAll(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await closeTestModule();
  });

  describe('findAll', () => {
    it('returns empty list for a user with no collections', async () => {
      const user = await createTestUser();
      const result = await service.findAll(user.id, { limit: 10 });

      expect(result.collections).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it('returns collections ordered by createdAt descending', async () => {
      const user = await createTestUser();
      const first = await createTestCollection(user.id);
      await new Promise((r) => setTimeout(r, 10));
      const second = await createTestCollection(user.id);

      const result = await service.findAll(user.id, { limit: 10 });

      expect(result.collections[0]?.id).toBe(second.id);
      expect(result.collections[1]?.id).toBe(first.id);
    });

    it('does not return collections of other users', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      await createTestCollection(user2.id);

      const result = await service.findAll(user1.id, { limit: 10 });

      expect(result.collections).toHaveLength(0);
    });

    it('cursor pagination works correctly', async () => {
      const user = await createTestUser();
      for (let i = 0; i < 5; i++) await createTestCollection(user.id);

      const page1 = await service.findAll(user.id, { limit: 3 });
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await service.findAll(user.id, {
        limit: 3,
        // biome-ignore lint/style/noNonNullAssertion: nextCursor presence is asserted on the line above
        cursor: page1.nextCursor!,
      });

      const page1Ids = new Set(page1.collections.map((c) => c.id));
      for (const col of page2.collections) {
        expect(page1Ids.has(col.id)).toBe(false);
      }
    });
  });

  describe('create', () => {
    it('creates a collection with the given name', async () => {
      const user = await createTestUser();
      const col = await service.create(user.id, { name: 'My Reading List' });

      expect(col.name).toBe('My Reading List');
      expect(col.userId).toBe(user.id);
    });

    it('sets description to null when not provided', async () => {
      const user = await createTestUser();
      const col = await service.create(user.id, { name: 'No Desc' });

      expect(col.description).toBeNull();
    });

    it('stores the description when provided', async () => {
      const user = await createTestUser();
      const col = await service.create(user.id, {
        name: 'With Desc',
        description: 'A nice collection',
      });

      expect(col.description).toBe('A nice collection');
    });
  });

  describe('addItem', () => {
    it('creates a CollectionItem record successfully', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const item = await createTestItem(user.id);

      const collectionItem = await service.addItem(user.id, col.id, item.id);

      expect(collectionItem.collectionId).toBe(col.id);
      expect(collectionItem.itemId).toBe(item.id);
    });

    it('throws when the collection belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const col = await createTestCollection(user2.id);
      const item = await createTestItem(user1.id);

      await expect(service.addItem(user1.id, col.id, item.id)).rejects.toThrow();
    });

    it('throws when the collection does not exist', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);

      await expect(
        service.addItem(user.id, 'non-existent-collection-id', item.id),
      ).rejects.toThrow();
    });

    it('throws when the item does not exist', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);

      await expect(service.addItem(user.id, col.id, 'non-existent-item-id')).rejects.toThrow();
    });
  });

  describe('findByShareToken', () => {
    it('returns null for a non-existent token', async () => {
      const result = await service.findByShareToken('non-existent-token');
      expect(result).toBeNull();
    });

    it('returns null when the collection is not public', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id, {
        isPublic: false,
        shareToken: 'private-token',
      });

      // biome-ignore lint/style/noNonNullAssertion: shareToken is set explicitly in test factory
      const result = await service.findByShareToken(col.shareToken!);
      expect(result).toBeNull();
    });

    it('returns collection with nested items when isPublic is true', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id, {
        isPublic: true,
        shareToken: 'public-share-token',
      });
      const item = await createTestItem(user.id);
      await prisma.collectionItem.create({
        data: { collectionId: col.id, itemId: item.id },
      });

      const result = await service.findByShareToken('public-share-token');

      expect(result).not.toBeNull();
      expect(result?.id).toBe(col.id);
      expect(result?.items).toHaveLength(1);
      expect(result?.items[0]?.item.id).toBe(item.id);
    });
  });
});
