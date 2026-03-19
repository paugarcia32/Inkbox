import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, { limit, cursor }: { limit: number; cursor?: string | undefined }) {
    const collections = await this.prisma.collection.findMany({
      where: { userId },
      include: { _count: { select: { items: true } } },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = collections.length > limit;
    if (hasMore) collections.pop();

    const mapped = collections.map(({ _count, ...c }) => ({ ...c, itemCount: _count.items }));
    return {
      collections: mapped,
      nextCursor: hasMore ? (mapped[mapped.length - 1]?.id ?? null) : null,
    };
  }

  async getById(userId: string, id: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { items: true } },
        sections: { orderBy: { order: 'asc' }, include: { _count: { select: { items: true } } } },
      },
    });
    if (!collection) return null;
    const { _count, sections, ...rest } = collection;
    return {
      ...rest,
      itemCount: _count.items,
      sections: sections.map(({ _count: sc, ...s }) => ({ ...s, itemCount: sc.items })),
    };
  }

  async create(
    userId: string,
    data: {
      name: string;
      description?: string | undefined;
      color?: string | undefined;
      icon?: string | null | undefined;
    },
  ) {
    return this.prisma.collection.create({
      data: {
        userId,
        name: data.name,
        description: data.description ?? null,
        color: data.color ?? 'stone',
        icon: data.icon ?? null,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    data: {
      name?: string | undefined;
      color?: string | undefined;
      icon?: string | null | undefined;
    },
  ) {
    await this.prisma.collection.findFirstOrThrow({ where: { id, userId } });
    return this.prisma.collection.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon }),
      },
    });
  }

  async delete(userId: string, id: string, deleteItems: boolean) {
    const collection = await this.prisma.collection.findFirstOrThrow({
      where: { id, userId },
      include: { items: { select: { itemId: true } } },
    });

    if (deleteItems && collection.items.length > 0) {
      const itemIds = collection.items.map((ci) => ci.itemId);
      await this.prisma.collection.delete({ where: { id } }); // cascades CollectionItems
      await this.prisma.item.deleteMany({ where: { id: { in: itemIds } } });
    } else {
      // Items stay in DB; CollectionItems cascade away → items return to inbox
      await this.prisma.collection.delete({ where: { id } });
    }
  }

  async addItem(userId: string, collectionId: string, itemId: string) {
    await this.prisma.collection.findFirstOrThrow({
      where: { id: collectionId, userId },
    });
    return this.prisma.collectionItem.create({
      data: { collectionId, itemId },
    });
  }

  async removeItem(userId: string, collectionId: string, itemId: string) {
    await this.prisma.collection.findFirstOrThrow({
      where: { id: collectionId, userId },
    });
    return this.prisma.collectionItem.delete({
      where: { collectionId_itemId: { collectionId, itemId } },
    });
  }

  async search(userId: string, query: string) {
    const q = query.trim();
    const collections = await this.prisma.collection.findMany({
      where: {
        userId,
        name: { contains: q, mode: 'insensitive' },
      },
      include: { _count: { select: { items: true } } },
      take: 3,
      orderBy: { createdAt: 'desc' },
    });
    return collections.map(({ _count, ...c }) => ({ ...c, itemCount: _count.items }));
  }

  async findByShareToken(token: string) {
    return this.prisma.collection.findUnique({
      where: { shareToken: token, isPublic: true },
      include: { items: { include: { item: true } } },
    });
  }
}
