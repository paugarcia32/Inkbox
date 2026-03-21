import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestModule, getTestModule } from '../../test/helpers/create-test-module';
import { truncateAll } from '../../test/helpers/db';
import {
  createTestCollection,
  createTestItem,
  createTestSection,
  createTestUser,
} from '../../test/helpers/factories';
import { prisma } from '../../test/helpers/prisma';
import { SectionsService } from './sections.service';

describe('SectionsService', () => {
  let service: SectionsService;

  beforeEach(async () => {
    const module = await getTestModule();
    service = module.get(SectionsService);
    await truncateAll(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await closeTestModule();
  });

  describe('findAll', () => {
    it('returns empty list for a collection with no sections', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);

      const result = await service.findAll(user.id, col.id);

      expect(result).toHaveLength(0);
    });

    it('returns sections ordered by order asc', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const s1 = await createTestSection(col.id, { order: 0 });
      const s2 = await createTestSection(col.id, { order: 1 });
      const s3 = await createTestSection(col.id, { order: 2 });

      const result = await service.findAll(user.id, col.id);

      expect(result.map((s) => s.id)).toEqual([s1.id, s2.id, s3.id]);
    });

    it('throws when collection belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const col = await createTestCollection(user2.id);

      await expect(service.findAll(user1.id, col.id)).rejects.toThrow();
    });

    it('includes itemCount for each section', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const section = await createTestSection(col.id);
      const item = await createTestItem(user.id);
      await prisma.collectionItem.create({
        data: { collectionId: col.id, itemId: item.id, sectionId: section.id },
      });

      const result = await service.findAll(user.id, col.id);

      expect(result[0]?.itemCount).toBe(1);
    });
  });

  describe('create', () => {
    it('creates a section with the given name', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);

      const section = await service.create(user.id, col.id, 'Reading List');

      expect(section.name).toBe('Reading List');
      expect(section.collectionId).toBe(col.id);
    });

    it('auto-increments order for subsequent sections', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);

      const s1 = await service.create(user.id, col.id, 'First');
      const s2 = await service.create(user.id, col.id, 'Second');

      expect(s2.order).toBeGreaterThan(s1.order);
    });

    it('throws when collection belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const col = await createTestCollection(user2.id);

      await expect(service.create(user1.id, col.id, 'My Section')).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('renames a section', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const section = await createTestSection(col.id);

      const updated = await service.update(user.id, section.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
    });

    it('updates the order of a section', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const section = await createTestSection(col.id, { order: 0 });

      const updated = await service.update(user.id, section.id, { order: 5 });

      expect(updated.order).toBe(5);
    });

    it('throws when section belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const col = await createTestCollection(user2.id);
      const section = await createTestSection(col.id);

      await expect(service.update(user1.id, section.id, { name: 'Hack' })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('deletes the section', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const section = await createTestSection(col.id);

      await service.delete(user.id, section.id);

      const found = await prisma.collectionSection.findUnique({ where: { id: section.id } });
      expect(found).toBeNull();
    });

    it('items in the section become unsectioned (sectionId set to null)', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const section = await createTestSection(col.id);
      const item = await createTestItem(user.id);
      await prisma.collectionItem.create({
        data: { collectionId: col.id, itemId: item.id, sectionId: section.id },
      });

      await service.delete(user.id, section.id);

      const ci = await prisma.collectionItem.findFirst({
        where: { collectionId: col.id, itemId: item.id },
      });
      expect(ci?.sectionId).toBeNull();
    });

    it('throws when section belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const col = await createTestCollection(user2.id);
      const section = await createTestSection(col.id);

      await expect(service.delete(user1.id, section.id)).rejects.toThrow();
    });
  });

  describe('assignItem', () => {
    it('assigns an item to a section', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const section = await createTestSection(col.id);
      const item = await createTestItem(user.id);
      await prisma.collectionItem.create({ data: { collectionId: col.id, itemId: item.id } });

      await service.assignItem(user.id, col.id, item.id, section.id);

      const ci = await prisma.collectionItem.findFirst({
        where: { collectionId: col.id, itemId: item.id },
      });
      expect(ci?.sectionId).toBe(section.id);
    });

    it('removes an item from a section (sectionId null)', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const section = await createTestSection(col.id);
      const item = await createTestItem(user.id);
      await prisma.collectionItem.create({
        data: { collectionId: col.id, itemId: item.id, sectionId: section.id },
      });

      await service.assignItem(user.id, col.id, item.id, null);

      const ci = await prisma.collectionItem.findFirst({
        where: { collectionId: col.id, itemId: item.id },
      });
      expect(ci?.sectionId).toBeNull();
    });

    it('throws when collection belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const col = await createTestCollection(user2.id);
      const item = await createTestItem(user2.id);
      await prisma.collectionItem.create({ data: { collectionId: col.id, itemId: item.id } });

      await expect(service.assignItem(user1.id, col.id, item.id, null)).rejects.toThrow();
    });

    it('throws when the item belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const col = await createTestCollection(user1.id);
      const item = await createTestItem(user2.id);
      await prisma.collectionItem.create({ data: { collectionId: col.id, itemId: item.id } });

      await expect(service.assignItem(user1.id, col.id, item.id, null)).rejects.toThrow();
    });

    it('throws when sectionId does not belong to the collection', async () => {
      const user = await createTestUser();
      const col1 = await createTestCollection(user.id);
      const col2 = await createTestCollection(user.id);
      const section = await createTestSection(col2.id); // belongs to col2
      const item = await createTestItem(user.id);
      await prisma.collectionItem.create({ data: { collectionId: col1.id, itemId: item.id } });

      await expect(service.assignItem(user.id, col1.id, item.id, section.id)).rejects.toThrow();
    });
  });

  describe('reorder', () => {
    it('updates the order of all sections', async () => {
      const user = await createTestUser();
      const col = await createTestCollection(user.id);
      const s1 = await createTestSection(col.id, { order: 0 });
      const s2 = await createTestSection(col.id, { order: 1 });
      const s3 = await createTestSection(col.id, { order: 2 });

      // Reverse order
      await service.reorder(user.id, col.id, [s3.id, s2.id, s1.id]);

      const updated = await prisma.collectionSection.findMany({
        where: { collectionId: col.id },
        orderBy: { order: 'asc' },
      });
      expect(updated.map((s) => s.id)).toEqual([s3.id, s2.id, s1.id]);
    });

    it('throws when collection belongs to a different user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const col = await createTestCollection(user2.id);

      await expect(service.reorder(user1.id, col.id, [])).rejects.toThrow();
    });
  });
});
