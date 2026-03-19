import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestModule } from '../../test/helpers/create-test-module';
import { truncateAll } from '../../test/helpers/db';
import { createTestCollection, createTestItem, createTestUser } from '../../test/helpers/factories';
import { prisma } from '../../test/helpers/prisma';
import { getCaller } from '../../test/helpers/trpc-caller';

describe('items tRPC router', () => {
  beforeEach(async () => {
    await truncateAll(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await closeTestModule();
  });

  describe('auth enforcement', () => {
    it('items.list rejects unauthenticated caller with UNAUTHORIZED', async () => {
      const caller = await getCaller();
      await expect(caller.items.list({})).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('items.create rejects unauthenticated caller with UNAUTHORIZED', async () => {
      const caller = await getCaller();
      await expect(caller.items.create({ url: 'https://example.com' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('items.archive rejects unauthenticated caller with UNAUTHORIZED', async () => {
      const caller = await getCaller();
      await expect(caller.items.archive({ id: 'some-id' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('items.toggleFavorite rejects unauthenticated caller with UNAUTHORIZED', async () => {
      const caller = await getCaller();
      await expect(
        caller.items.toggleFavorite({ id: 'some-id', isFavorite: true }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('items.delete rejects unauthenticated caller with UNAUTHORIZED', async () => {
      const caller = await getCaller();
      await expect(caller.items.delete({ id: 'some-id' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('items.unarchive rejects unauthenticated caller with UNAUTHORIZED', async () => {
      const caller = await getCaller();
      await expect(caller.items.unarchive({ id: 'some-id' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('items.list', () => {
    it('returns empty items and null nextCursor for a new user', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);

      const result = await caller.items.list({});

      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it('returns only items belonging to the authenticated user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      await createTestItem(user2.id);
      const caller = await getCaller(user1.id);

      const result = await caller.items.list({});

      expect(result.items).toHaveLength(0);
    });

    it('uses default limit of 50', async () => {
      const user = await createTestUser();
      for (let i = 0; i < 3; i++) await createTestItem(user.id);
      const caller = await getCaller(user.id);

      // No limit provided — uses default of 50
      const result = await caller.items.list({});

      expect(result.items).toHaveLength(3);
    });

    it('respects explicit limit', async () => {
      const user = await createTestUser();
      for (let i = 0; i < 5; i++) await createTestItem(user.id);
      const caller = await getCaller(user.id);

      const result = await caller.items.list({ limit: 2 });

      expect(result.items).toHaveLength(2);
    });

    it('returns nextCursor when more items exist', async () => {
      const user = await createTestUser();
      for (let i = 0; i < 5; i++) await createTestItem(user.id);
      const caller = await getCaller(user.id);

      const result = await caller.items.list({ limit: 3 });

      expect(result.nextCursor).not.toBeNull();
    });

    it('cursor pagination returns next page correctly', async () => {
      const user = await createTestUser();
      for (let i = 0; i < 5; i++) await createTestItem(user.id);
      const caller = await getCaller(user.id);

      const page1 = await caller.items.list({ limit: 3 });
      // biome-ignore lint/style/noNonNullAssertion: nextCursor presence is asserted above
      const page2 = await caller.items.list({ limit: 3, cursor: page1.nextCursor! });

      const page1Ids = new Set(page1.items.map((i) => i.id));
      for (const item of page2.items) {
        expect(page1Ids.has(item.id)).toBe(false);
      }
    });

    it('Zod rejects limit below 1', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);

      await expect(caller.items.list({ limit: 0 })).rejects.toThrow();
    });

    it('Zod rejects limit above 100', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);

      await expect(caller.items.list({ limit: 101 })).rejects.toThrow();
    });

    it('hides archived items by default', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);
      await (await getCaller(user.id)).items.archive({ id: item.id });
      await createTestItem(user.id);
      const caller = await getCaller(user.id);

      const result = await caller.items.list({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.isArchived).toBe(false);
    });

    it('includes archived items when includeArchived is true', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);
      await (await getCaller(user.id)).items.archive({ id: item.id });
      await createTestItem(user.id);
      const caller = await getCaller(user.id);

      const result = await caller.items.list({ includeArchived: true });

      expect(result.items).toHaveLength(2);
    });

    it('returns only archived items when archivedOnly is true', async () => {
      const user = await createTestUser();
      const archived = await createTestItem(user.id);
      await (await getCaller(user.id)).items.archive({ id: archived.id });
      await createTestItem(user.id);
      const caller = await getCaller(user.id);

      const result = await caller.items.list({ archivedOnly: true });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.isArchived).toBe(true);
    });

    it('filters items by type', async () => {
      const user = await createTestUser();
      await createTestItem(user.id, { type: 'link', status: 'done' });
      await createTestItem(user.id, { type: 'video', status: 'done' });
      const caller = await getCaller(user.id);

      const result = await caller.items.list({ type: 'video' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.type).toBe('video');
    });

    it('Zod rejects invalid type value', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);

      // @ts-expect-error — intentionally passing invalid input
      await expect(caller.items.list({ type: 'podcast' })).rejects.toThrow();
    });

    it('returns items in ascending order with sortDir asc', async () => {
      const user = await createTestUser();
      const first = await createTestItem(user.id);
      await new Promise((r) => setTimeout(r, 10));
      const second = await createTestItem(user.id);
      const caller = await getCaller(user.id);

      const result = await caller.items.list({ sortDir: 'asc' });

      expect(result.items[0]?.id).toBe(first.id);
      expect(result.items[1]?.id).toBe(second.id);
    });

    it('Zod rejects invalid sortDir value', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);

      // @ts-expect-error — intentionally passing invalid input
      await expect(caller.items.list({ sortDir: 'random' })).rejects.toThrow();
    });

    it('filters items by collectionId', async () => {
      const user = await createTestUser();
      const col1 = await createTestCollection(user.id);
      const col2 = await createTestCollection(user.id);
      const caller = await getCaller(user.id);
      const item1 = await caller.items.create({
        url: 'https://example.com/1',
        collectionId: col1.id,
      });
      await caller.items.create({ url: 'https://example.com/2', collectionId: col2.id });

      const result = await caller.items.list({ collectionId: col1.id });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe(item1.id);
    });
  });

  describe('items.create', () => {
    it('creates an item and returns it with the correct userId', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);

      const item = await caller.items.create({ url: 'https://example.com/new-item' });

      expect(item.userId).toBe(user.id);
      expect(item.url).toBe('https://example.com/new-item');
    });

    it('Zod rejects a non-URL string', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);

      await expect(caller.items.create({ url: 'not-a-url' })).rejects.toThrow();
    });

    it('Zod rejects a missing url', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);

      // @ts-expect-error — intentionally passing invalid input
      await expect(caller.items.create({})).rejects.toThrow();
    });

    it('links item to collection when collectionId is provided', async () => {
      const user = await createTestUser();
      const collection = await createTestCollection(user.id);
      const caller = await getCaller(user.id);

      await caller.items.create({ url: 'https://example.com/new', collectionId: collection.id });

      const result = await caller.items.list({ collectionId: collection.id });
      expect(result.items).toHaveLength(1);
    });
  });

  describe('items.archive', () => {
    it('archives the item', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);
      const caller = await getCaller(user.id);

      const updated = await caller.items.archive({ id: item.id });

      expect(updated.isArchived).toBe(true);
      expect(updated.archivedAt).not.toBeNull();
    });

    it('throws when item belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const item = await createTestItem(user2.id);
      const caller = await getCaller(user1.id);

      await expect(caller.items.archive({ id: item.id })).rejects.toThrow();
    });
  });

  describe('items.toggleFavorite', () => {
    it('sets isFavorite to true', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);
      const caller = await getCaller(user.id);

      const updated = await caller.items.toggleFavorite({ id: item.id, isFavorite: true });

      expect(updated.isFavorite).toBe(true);
    });

    it('sets isFavorite back to false', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id, { isFavorite: true });
      const caller = await getCaller(user.id);

      const updated = await caller.items.toggleFavorite({ id: item.id, isFavorite: false });

      expect(updated.isFavorite).toBe(false);
    });

    it('Zod rejects missing isFavorite', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);
      const caller = await getCaller(user.id);

      // @ts-expect-error — intentionally passing invalid input
      await expect(caller.items.toggleFavorite({ id: item.id })).rejects.toThrow();
    });
  });

  describe('items.unarchive', () => {
    it('unarchives the item', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);
      const caller = await getCaller(user.id);
      await caller.items.archive({ id: item.id });

      const updated = await caller.items.unarchive({ id: item.id });

      expect(updated.isArchived).toBe(false);
      expect(updated.archivedAt).toBeNull();
    });

    it('throws when item belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const item = await createTestItem(user2.id);
      const caller = await getCaller(user1.id);

      await expect(caller.items.unarchive({ id: item.id })).rejects.toThrow();
    });
  });

  describe('items.count', () => {
    it('rejects unauthenticated caller with UNAUTHORIZED', async () => {
      const caller = await getCaller();
      await expect(caller.items.count()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('returns inbox count for authenticated user', async () => {
      const user = await createTestUser();
      await createTestItem(user.id);
      await createTestItem(user.id);
      const caller = await getCaller(user.id);

      const result = await caller.items.count();

      expect(result.inbox).toBe(2);
    });

    it('excludes archived and collected items from inbox count', async () => {
      const user = await createTestUser();
      const collection = await createTestCollection(user.id);
      const caller = await getCaller(user.id);

      // inbox item
      await caller.items.create({ url: 'https://example.com/1' });
      // item in collection
      await caller.items.create({ url: 'https://example.com/2', collectionId: collection.id });
      // archived item
      const toArchive = await caller.items.create({ url: 'https://example.com/3' });
      await caller.items.archive({ id: toArchive.id });

      const result = await caller.items.count();

      expect(result.inbox).toBe(1);
    });
  });

  describe('items.update', () => {
    it('items.update rejects unauthenticated caller with UNAUTHORIZED', async () => {
      const caller = await getCaller();
      await expect(
        caller.items.update({ id: 'some-id', title: 'New title' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('updates title, description, imageUrl, and type', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);
      const caller = await getCaller(user.id);

      const updated = await caller.items.update({
        id: item.id,
        title: 'Updated title',
        description: 'Updated description',
        imageUrl: 'https://example.com/image.jpg',
        type: 'article',
      });

      expect(updated.title).toBe('Updated title');
      expect(updated.description).toBe('Updated description');
      expect(updated.imageUrl).toBe('https://example.com/image.jpg');
      expect(updated.type).toBe('article');
    });

    it('can set nullable fields to null', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id, { title: 'Some title' });
      const caller = await getCaller(user.id);

      const updated = await caller.items.update({ id: item.id, title: null });

      expect(updated.title).toBeNull();
    });

    it('throws when item belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const item = await createTestItem(user2.id);
      const caller = await getCaller(user1.id);

      await expect(caller.items.update({ id: item.id, title: 'Hacked' })).rejects.toThrow();
    });

    it('Zod rejects invalid imageUrl', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);
      const caller = await getCaller(user.id);

      await expect(caller.items.update({ id: item.id, imageUrl: 'not-a-url' })).rejects.toThrow();
    });
  });

  describe('items.delete', () => {
    it('deletes the item, which no longer appears in list', async () => {
      const user = await createTestUser();
      const item = await createTestItem(user.id);
      const caller = await getCaller(user.id);

      await caller.items.delete({ id: item.id });

      const result = await caller.items.list({});
      expect(result.items.find((i) => i.id === item.id)).toBeUndefined();
    });

    it('throws when item belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const item = await createTestItem(user2.id);
      const caller = await getCaller(user1.id);

      await expect(caller.items.delete({ id: item.id })).rejects.toThrow();
    });
  });
});
