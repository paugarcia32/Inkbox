import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestModule, getTestModule } from '../../test/helpers/create-test-module';
import { truncateAll } from '../../test/helpers/db';
import { createTestCollection, createTestItem, createTestUser } from '../../test/helpers/factories';
import { prisma } from '../../test/helpers/prisma';
import { ItemsService } from './items.service';

describe('ItemsService', () => {
  let service: ItemsService;

  beforeEach(async () => {
    const module = await getTestModule();
    service = module.get(ItemsService);
    await truncateAll(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await closeTestModule();
  });

  describe('create', () => {
    it('creates an item with correct userId and url', async () => {
      const user = await createTestUser();
      const item = await service.create(user.id, { url: 'https://example.com/article' });

      expect(item.userId).toBe(user.id);
      expect(item.url).toBe('https://example.com/article');
    });

    it('defaults type to "link" and status to "pending"', async () => {
      const user = await createTestUser();
      const item = await service.create(user.id, { url: 'https://example.com' });

      expect(item.type).toBe('link');
      expect(item.status).toBe('pending');
    });

    it('creates a CollectionItem record when collectionId is provided', async () => {
      const user = await createTestUser();
      const collection = await createTestCollection(user.id);

      const item = await service.create(user.id, {
        url: 'https://example.com',
        collectionId: collection.id,
      });

      const link = await prisma.collectionItem.findFirst({
        where: { itemId: item.id, collectionId: collection.id },
      });
      expect(link).not.toBeNull();
    });

    it('does not create a CollectionItem when no collectionId is provided', async () => {
      const user = await createTestUser();
      const item = await service.create(user.id, { url: 'https://example.com' });

      const links = await prisma.collectionItem.findMany({ where: { itemId: item.id } });
      expect(links).toHaveLength(0);
    });
  });

  describe('findAll', () => {
    it('returns empty items array for a user with no items', async () => {
      const user = await createTestUser();
      const result = await service.findAll(user.id, { limit: 10 });

      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it('returns items ordered by createdAt descending', async () => {
      const user = await createTestUser();
      const first = await createTestItem(user.id);
      await new Promise((r) => setTimeout(r, 10)); // ensure different timestamps
      const second = await createTestItem(user.id);

      const result = await service.findAll(user.id, { limit: 10 });

      expect(result.items[0]?.id).toBe(second.id);
      expect(result.items[1]?.id).toBe(first.id);
    });

    it('respects the limit parameter', async () => {
      const user = await createTestUser();
      for (let i = 0; i < 5; i++) await createTestItem(user.id);

      const result = await service.findAll(user.id, { limit: 3 });

      expect(result.items).toHaveLength(3);
    });

    it('does not return items belonging to another user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      await createTestItem(user2.id);

      const result = await service.findAll(user1.id, { limit: 10 });

      expect(result.items).toHaveLength(0);
    });

    it('returns nextCursor when more items exist', async () => {
      const user = await createTestUser();
      for (let i = 0; i < 5; i++) await createTestItem(user.id);

      const result = await service.findAll(user.id, { limit: 3 });

      expect(result.nextCursor).not.toBeNull();
    });

    it('returns nextCursor as null when all items fit in one page', async () => {
      const user = await createTestUser();
      await createTestItem(user.id);
      await createTestItem(user.id);

      const result = await service.findAll(user.id, { limit: 10 });

      expect(result.nextCursor).toBeNull();
    });

    it('hides archived items by default', async () => {
      const user = await createTestUser();
      await createTestItem(user.id, { isArchived: true });
      await createTestItem(user.id);

      const result = await service.findAll(user.id, { limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.isArchived).toBe(false);
    });

    it('includes archived items when includeArchived is true', async () => {
      const user = await createTestUser();
      await createTestItem(user.id, { isArchived: true });
      await createTestItem(user.id);

      const result = await service.findAll(user.id, { limit: 10, includeArchived: true });

      expect(result.items).toHaveLength(2);
    });

    it('returns only archived items when archivedOnly is true', async () => {
      const user = await createTestUser();
      const archived = await createTestItem(user.id, { isArchived: true });
      await createTestItem(user.id);

      const result = await service.findAll(user.id, { limit: 10, archivedOnly: true });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe(archived.id);
    });

    it('returns only non-archived uncollected items when inboxOnly is true', async () => {
      const user = await createTestUser();
      const collection = await createTestCollection(user.id);

      const inboxItem = await createTestItem(user.id);
      await createTestItem(user.id, { isArchived: true });
      const collectionItem = await createTestItem(user.id);
      await prisma.collectionItem.create({
        data: { itemId: collectionItem.id, collectionId: collection.id },
      });

      const result = await service.findAll(user.id, { limit: 10, inboxOnly: true });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe(inboxItem.id);
    });

    it('filters items by collectionId', async () => {
      const user = await createTestUser();
      const col1 = await createTestCollection(user.id);
      const col2 = await createTestCollection(user.id);
      const item1 = await createTestItem(user.id);
      const item2 = await createTestItem(user.id);
      await prisma.collectionItem.create({ data: { itemId: item1.id, collectionId: col1.id } });
      await prisma.collectionItem.create({ data: { itemId: item2.id, collectionId: col2.id } });

      const result = await service.findAll(user.id, { limit: 10, collectionId: col1.id });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe(item1.id);
    });

    it('includes collection metadata on returned items', async () => {
      const user = await createTestUser();
      const collection = await createTestCollection(user.id);
      const item = await createTestItem(user.id);
      await prisma.collectionItem.create({
        data: { itemId: item.id, collectionId: collection.id },
      });

      const result = await service.findAll(user.id, { limit: 10 });

      const found = result.items.find((i) => i.id === item.id);
      expect(found?.collections).toHaveLength(1);
      expect(found?.collections[0]?.collectionId).toBe(collection.id);
      expect(found?.collections[0]?.collectionName).toBe(collection.name);
    });

    it('cursor pagination returns next page without duplicates', async () => {
      const user = await createTestUser();
      for (let i = 0; i < 5; i++) await createTestItem(user.id);

      const page1 = await service.findAll(user.id, { limit: 3 });
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await service.findAll(user.id, {
        limit: 3,
        // biome-ignore lint/style/noNonNullAssertion: nextCursor presence is asserted on the line above
        cursor: page1.nextCursor!,
      });

      const page1Ids = new Set(page1.items.map((i) => i.id));
      for (const item of page2.items) {
        expect(page1Ids.has(item.id)).toBe(false);
      }
    });

    it('filters items by type when type is provided', async () => {
      const user = await createTestUser();
      await createTestItem(user.id, { type: 'link', status: 'done' });
      await createTestItem(user.id, { type: 'video', status: 'done' });

      const result = await service.findAll(user.id, { limit: 10, type: 'video' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.type).toBe('video');
    });

    it('returns all types when type is not provided', async () => {
      const user = await createTestUser();
      await createTestItem(user.id, { type: 'link', status: 'done' });
      await createTestItem(user.id, { type: 'video', status: 'done' });

      const result = await service.findAll(user.id, { limit: 10 });

      expect(result.items).toHaveLength(2);
    });

    it('returns items in ascending order when sortDir is asc', async () => {
      const user = await createTestUser();
      const first = await createTestItem(user.id);
      await new Promise((r) => setTimeout(r, 10));
      const second = await createTestItem(user.id);

      const result = await service.findAll(user.id, { limit: 10, sortDir: 'asc' });

      expect(result.items[0]?.id).toBe(first.id);
      expect(result.items[1]?.id).toBe(second.id);
    });

    it('returns items in descending order when sortDir is desc', async () => {
      const user = await createTestUser();
      const first = await createTestItem(user.id);
      await new Promise((r) => setTimeout(r, 10));
      const second = await createTestItem(user.id);

      const result = await service.findAll(user.id, { limit: 10, sortDir: 'desc' });

      expect(result.items[0]?.id).toBe(second.id);
      expect(result.items[1]?.id).toBe(first.id);
    });

    it('cursor pagination works correctly with sortDir asc', async () => {
      const user = await createTestUser();
      for (let i = 0; i < 5; i++) {
        await createTestItem(user.id);
        await new Promise((r) => setTimeout(r, 5));
      }

      const page1 = await service.findAll(user.id, { limit: 3, sortDir: 'asc' });
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await service.findAll(user.id, {
        limit: 3,
        sortDir: 'asc',
        // biome-ignore lint/style/noNonNullAssertion: nextCursor presence is asserted on the line above
        cursor: page1.nextCursor!,
      });

      const page1Ids = new Set(page1.items.map((i) => i.id));
      for (const item of page2.items) {
        expect(page1Ids.has(item.id)).toBe(false);
      }
      // page1 items are older (asc), page2 items are newer
      const lastPage1 = page1.items[page1.items.length - 1];
      const firstPage2 = page2.items[0];
      // biome-ignore lint/style/noNonNullAssertion: items presence is guaranteed by the 5-item setup above
      expect(new Date(firstPage2!.createdAt).getTime()).toBeGreaterThan(
        // biome-ignore lint/style/noNonNullAssertion: items presence is guaranteed by the 5-item setup above
        new Date(lastPage1!.createdAt).getTime(),
      );
    });

    it('type filter combines with inboxOnly', async () => {
      const user = await createTestUser();
      const collection = await createTestCollection(user.id);

      const inboxVideo = await createTestItem(user.id, { type: 'video', status: 'done' });
      // archived video — should not appear
      await createTestItem(user.id, { type: 'video', status: 'done', isArchived: true });
      // inbox link — wrong type
      await createTestItem(user.id, { type: 'link', status: 'done' });
      // video in collection — not inbox
      const collectionVideo = await createTestItem(user.id, { type: 'video', status: 'done' });
      await prisma.collectionItem.create({
        data: { itemId: collectionVideo.id, collectionId: collection.id },
      });

      const result = await service.findAll(user.id, { limit: 10, inboxOnly: true, type: 'video' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe(inboxVideo.id);
    });
  });

  describe('findOne', () => {
    it('returns the item when userId matches', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);

      const found = await service.findOne(user.id, item.id);

      expect(found?.id).toBe(item.id);
    });

    it('returns null when item belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const item = await createTestItem(user2.id);

      const found = await service.findOne(user1.id, item.id);

      expect(found).toBeNull();
    });

    it('returns null for a non-existent id', async () => {
      const user = await createTestUser();
      const found = await service.findOne(user.id, 'non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('archive', () => {
    it('sets isArchived to true and sets an archivedAt timestamp', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);

      const updated = await service.archive(user.id, item.id);

      expect(updated.isArchived).toBe(true);
      expect(updated.archivedAt).not.toBeNull();
    });

    it('throws when item belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const item = await createTestItem(user2.id);

      await expect(service.archive(user1.id, item.id)).rejects.toThrow();
    });
  });

  describe('toggleFavorite', () => {
    it('sets isFavorite to true', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);

      const updated = await service.toggleFavorite(user.id, item.id, true);

      expect(updated.isFavorite).toBe(true);
    });

    it('sets isFavorite back to false', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id, { isFavorite: true });

      const updated = await service.toggleFavorite(user.id, item.id, false);

      expect(updated.isFavorite).toBe(false);
    });

    it('throws when item belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const item = await createTestItem(user2.id);

      await expect(service.toggleFavorite(user1.id, item.id, true)).rejects.toThrow();
    });
  });

  describe('unarchive', () => {
    it('sets isArchived to false and clears archivedAt', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);
      await service.archive(user.id, item.id);

      const updated = await service.unarchive(user.id, item.id);

      expect(updated.isArchived).toBe(false);
      expect(updated.archivedAt).toBeNull();
    });

    it('throws when item belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const item = await createTestItem(user2.id);

      await expect(service.unarchive(user1.id, item.id)).rejects.toThrow();
    });
  });

  describe('countInbox', () => {
    it('returns 0 when user has no items', async () => {
      const user = await createTestUser();
      const result = await service.countInbox(user.id);
      expect(result.inbox).toBe(0);
    });

    it('counts only non-archived items with no collection', async () => {
      const user = await createTestUser();
      const collection = await createTestCollection(user.id);

      // inbox item (should count)
      await createTestItem(user.id);
      // archived item (should not count)
      await createTestItem(user.id, { isArchived: true });
      // item in collection (should not count)
      const collectionItem = await createTestItem(user.id);
      await prisma.collectionItem.create({
        data: { itemId: collectionItem.id, collectionId: collection.id },
      });

      const result = await service.countInbox(user.id);
      expect(result.inbox).toBe(1);
    });

    it('does not count items from other users', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      await createTestItem(user2.id);

      const result = await service.countInbox(user1.id);
      expect(result.inbox).toBe(0);
    });
  });

  describe('delete', () => {
    it('removes item from the database', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);

      await service.delete(user.id, item.id);

      const found = await service.findOne(user.id, item.id);
      expect(found).toBeNull();
    });

    it('throws when item belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const item = await createTestItem(user2.id);

      await expect(service.delete(user1.id, item.id)).rejects.toThrow();
    });
  });
});
