import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertCollectionOwner(userId: string, collectionId: string) {
    return this.prisma.collection.findFirstOrThrow({ where: { id: collectionId, userId } });
  }

  private async assertSectionOwner(userId: string, sectionId: string) {
    const section = await this.prisma.collectionSection.findFirstOrThrow({
      where: { id: sectionId },
      include: { collection: { select: { userId: true } } },
    });
    if (section.collection.userId !== userId) {
      throw new Error('Section not found');
    }
    return section;
  }

  async findAll(userId: string, collectionId: string) {
    await this.assertCollectionOwner(userId, collectionId);
    const sections = await this.prisma.collectionSection.findMany({
      where: { collectionId },
      include: { _count: { select: { items: true } } },
      orderBy: { order: 'asc' },
    });
    return sections.map(({ _count, ...s }) => ({ ...s, itemCount: _count.items }));
  }

  async create(userId: string, collectionId: string, name: string) {
    await this.assertCollectionOwner(userId, collectionId);
    const last = await this.prisma.collectionSection.findFirst({
      where: { collectionId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (last?.order ?? -1) + 1;
    const section = await this.prisma.collectionSection.create({
      data: { collectionId, name, order: nextOrder },
    });
    return { ...section, itemCount: 0 };
  }

  async update(
    userId: string,
    sectionId: string,
    data: { name?: string | undefined; order?: number | undefined },
  ) {
    await this.assertSectionOwner(userId, sectionId);
    return this.prisma.collectionSection.update({
      where: { id: sectionId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async delete(userId: string, sectionId: string) {
    await this.assertSectionOwner(userId, sectionId);
    // onDelete: SetNull on CollectionItem.sectionId handles nullifying items
    await this.prisma.collectionSection.delete({ where: { id: sectionId } });
  }

  async assignItem(userId: string, collectionId: string, itemId: string, sectionId: string | null) {
    await this.assertCollectionOwner(userId, collectionId);
    if (sectionId !== null) {
      // verify section belongs to the same collection
      await this.prisma.collectionSection.findFirstOrThrow({
        where: { id: sectionId, collectionId },
      });
    }
    return this.prisma.collectionItem.update({
      where: { collectionId_itemId: { collectionId, itemId } },
      data: { sectionId },
    });
  }

  async reorder(userId: string, collectionId: string, orderedIds: string[]) {
    await this.assertCollectionOwner(userId, collectionId);
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.collectionSection.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }
}
