import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestModule } from '../../test/helpers/create-test-module';
import { truncateAll } from '../../test/helpers/db';
import { createTestCollection, createTestItem, createTestUser } from '../../test/helpers/factories';
import { prisma } from '../../test/helpers/prisma';
import { getCaller } from '../../test/helpers/trpc-caller';

describe('collections tRPC router', () => {
  beforeEach(async () => {
    await truncateAll(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await closeTestModule();
  });

  describe('auth enforcement', () => {
    it('collections.list rejects unauthenticated caller with UNAUTHORIZED', async () => {
      const caller = await getCaller();
      await expect(caller.collections.list({})).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('collections.create rejects unauthenticated caller with UNAUTHORIZED', async () => {
      const caller = await getCaller();
      await expect(caller.collections.create({ name: 'Test' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('collections.addItem rejects unauthenticated caller with UNAUTHORIZED', async () => {
      const caller = await getCaller();
      await expect(
        caller.collections.addItem({ collectionId: 'col-id', itemId: 'item-id' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('collections.byShareToken is accessible without authentication', async () => {
      const caller = await getCaller(); // no userId
      // Should not throw UNAUTHORIZED — may return null for a missing token
      const result = await caller.collections.byShareToken({ token: 'non-existent' });
      expect(result).toBeNull();
    });
  });

  describe('collections.list', () => {
    it('returns empty list for a new user', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);

      const result = await caller.collections.list({});

      expect(result.collections).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it("returns only the authenticated user's collections", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      await createTestCollection(user2.id);
      const caller = await getCaller(user1.id);

      const result = await caller.collections.list({});

      expect(result.collections).toHaveLength(0);
    });
  });

  describe('collections.create', () => {
    it('creates a collection with name', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);

      const col = await caller.collections.create({ name: 'My List' });

      expect(col.name).toBe('My List');
      expect(col.userId).toBe(user.id);
    });

    it('creates a collection with name and description', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);

      const col = await caller.collections.create({
        name: 'My List',
        description: 'A detailed description',
      });

      expect(col.description).toBe('A detailed description');
    });

    it('Zod rejects an empty string name', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);

      await expect(caller.collections.create({ name: '' })).rejects.toThrow();
    });

    it('Zod rejects missing name', async () => {
      const user = await createTestUser();
      const caller = await getCaller(user.id);

      // @ts-expect-error — intentionally passing invalid input
      await expect(caller.collections.create({})).rejects.toThrow();
    });
  });

  describe('collections.addItem', () => {
    it('adds item to collection successfully', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const item = await createTestItem(user.id);
      const caller = await getCaller(user.id);

      const result = await caller.collections.addItem({
        collectionId: col.id,
        itemId: item.id,
      });

      expect(result.collectionId).toBe(col.id);
      expect(result.itemId).toBe(item.id);
    });

    it('throws when collection belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const col = await createTestCollection(user2.id);
      const item = await createTestItem(user1.id);
      const caller = await getCaller(user1.id);

      await expect(
        caller.collections.addItem({ collectionId: col.id, itemId: item.id }),
      ).rejects.toThrow();
    });

    it('throws when item does not exist', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const caller = await getCaller(user.id);

      await expect(
        caller.collections.addItem({ collectionId: col.id, itemId: 'non-existent-item' }),
      ).rejects.toThrow();
    });
  });

  describe('collections.byShareToken', () => {
    it('returns null for a non-existent token', async () => {
      const caller = await getCaller();

      const result = await caller.collections.byShareToken({ token: 'does-not-exist' });

      expect(result).toBeNull();
    });

    it('returns null when collection is not public', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id, {
        isPublic: false,
        shareToken: 'private-token-123',
      });
      const caller = await getCaller();

      // biome-ignore lint/style/noNonNullAssertion: shareToken is set explicitly in test factory
      const result = await caller.collections.byShareToken({ token: col.shareToken! });

      expect(result).toBeNull();
    });

    it('returns collection with items when isPublic is true', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id, {
        isPublic: true,
        shareToken: 'public-token-abc',
      });
      const item = await createTestItem(user.id);
      await prisma.collectionItem.create({
        data: { collectionId: col.id, itemId: item.id },
      });
      const caller = await getCaller();

      const result = await caller.collections.byShareToken({ token: 'public-token-abc' });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(col.id);
      expect(result?.items).toHaveLength(1);
    });

    it('can be called without any userId in context', async () => {
      // Anonymous caller (no userId) should not receive UNAUTHORIZED
      const anonCaller = await getCaller();
      const result = await anonCaller.collections.byShareToken({ token: 'any-token' });
      expect(result).toBeNull();
    });
  });
});
