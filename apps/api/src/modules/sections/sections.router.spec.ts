import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestModule } from '../../test/helpers/create-test-module';
import { truncateAll } from '../../test/helpers/db';
import {
  createTestCollection,
  createTestItem,
  createTestSection,
  createTestUser,
} from '../../test/helpers/factories';
import { prisma } from '../../test/helpers/prisma';
import { getCaller } from '../../test/helpers/trpc-caller';

describe('sections tRPC router', () => {
  beforeEach(async () => {
    await truncateAll(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await closeTestModule();
  });

  describe('auth enforcement', () => {
    it('sections.list rejects unauthenticated caller', async () => {
      const caller = await getCaller();
      await expect(caller.sections.list({ collectionId: 'col-id' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('sections.create rejects unauthenticated caller', async () => {
      const caller = await getCaller();
      await expect(
        caller.sections.create({ collectionId: 'col-id', name: 'Test' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('sections.delete rejects unauthenticated caller', async () => {
      const caller = await getCaller();
      await expect(caller.sections.delete({ id: 'sec-id' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('sections.list', () => {
    it('returns empty list for a collection with no sections', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const caller = await getCaller(user.id);

      const result = await caller.sections.list({ collectionId: col.id });

      expect(result).toHaveLength(0);
    });

    it("does not return another user's collection sections", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const col = await createTestCollection(user2.id);
      await createTestSection(col.id);
      const caller = await getCaller(user1.id);

      await expect(caller.sections.list({ collectionId: col.id })).rejects.toThrow();
    });
  });

  describe('sections.create', () => {
    it('creates a section', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const caller = await getCaller(user.id);

      const section = await caller.sections.create({ collectionId: col.id, name: 'Research' });

      expect(section.name).toBe('Research');
      expect(section.collectionId).toBe(col.id);
    });

    it('Zod rejects empty section name', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const caller = await getCaller(user.id);

      await expect(caller.sections.create({ collectionId: col.id, name: '' })).rejects.toThrow();
    });

    it('throws when collection belongs to another user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const col = await createTestCollection(user2.id);
      const caller = await getCaller(user1.id);

      await expect(
        caller.sections.create({ collectionId: col.id, name: 'Hack' }),
      ).rejects.toThrow();
    });
  });

  describe('sections.update', () => {
    it('renames a section', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const section = await createTestSection(col.id, { name: 'Old Name' });
      const caller = await getCaller(user.id);

      const updated = await caller.sections.update({ id: section.id, name: 'New Name' });

      expect(updated.name).toBe('New Name');
    });

    it('throws when section belongs to another user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const col = await createTestCollection(user2.id);
      const section = await createTestSection(col.id);
      const caller = await getCaller(user1.id);

      await expect(caller.sections.update({ id: section.id, name: 'Hack' })).rejects.toThrow();
    });
  });

  describe('sections.delete', () => {
    it('deletes a section', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const section = await createTestSection(col.id);
      const caller = await getCaller(user.id);

      await caller.sections.delete({ id: section.id });

      const found = await prisma.collectionSection.findUnique({ where: { id: section.id } });
      expect(found).toBeNull();
    });

    it('throws when section belongs to another user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const col = await createTestCollection(user2.id);
      const section = await createTestSection(col.id);
      const caller = await getCaller(user1.id);

      await expect(caller.sections.delete({ id: section.id })).rejects.toThrow();
    });
  });

  describe('sections.assignItem', () => {
    it('assigns an item to a section', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const section = await createTestSection(col.id);
      const item = await createTestItem(user.id);
      await prisma.collectionItem.create({ data: { collectionId: col.id, itemId: item.id } });
      const caller = await getCaller(user.id);

      await caller.sections.assignItem({
        collectionId: col.id,
        itemId: item.id,
        sectionId: section.id,
      });

      const ci = await prisma.collectionItem.findFirst({
        where: { collectionId: col.id, itemId: item.id },
      });
      expect(ci?.sectionId).toBe(section.id);
    });

    it('unassigns an item (sectionId null)', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const section = await createTestSection(col.id);
      const item = await createTestItem(user.id);
      await prisma.collectionItem.create({
        data: { collectionId: col.id, itemId: item.id, sectionId: section.id },
      });
      const caller = await getCaller(user.id);

      await caller.sections.assignItem({
        collectionId: col.id,
        itemId: item.id,
        sectionId: null,
      });

      const ci = await prisma.collectionItem.findFirst({
        where: { collectionId: col.id, itemId: item.id },
      });
      expect(ci?.sectionId).toBeNull();
    });
  });

  describe('sections.reorder', () => {
    it('reorders sections', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const s1 = await createTestSection(col.id, { order: 0 });
      const s2 = await createTestSection(col.id, { order: 1 });
      const caller = await getCaller(user.id);

      await caller.sections.reorder({ collectionId: col.id, orderedIds: [s2.id, s1.id] });

      const updated = await prisma.collectionSection.findMany({
        where: { collectionId: col.id },
        orderBy: { order: 'asc' },
      });
      expect(updated.map((s) => s.id)).toEqual([s2.id, s1.id]);
    });
  });
});
