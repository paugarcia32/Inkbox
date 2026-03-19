import type { CreateItemInput, UpdateItemInput } from '@hako/types';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScraperService } from '../scraper/scraper.service';

type FindAllOptions = {
  limit: number;
  cursor?: string | undefined;
  /** Inbox: non-archived items with no collection */
  inboxOnly?: boolean | undefined;
  /** Archive page: only archived items */
  archivedOnly?: boolean | undefined;
  /** All page with toggle: include archived items too */
  includeArchived?: boolean | undefined;
  /** Collection detail page: filter by collection */
  collectionId?: string | undefined;
  /** Filter by content type */
  type?: 'link' | 'article' | 'video' | 'image' | 'post' | 'document' | undefined;
  /** Sort direction for createdAt (default: desc) */
  sortDir?: 'asc' | 'desc' | undefined;
};

@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraper: ScraperService,
  ) {}

  async create(userId: string, input: CreateItemInput) {
    const item = await this.prisma.item.create({
      data: { userId, url: input.url },
    });

    if (input.collectionId) {
      await this.prisma.collectionItem.create({
        data: { itemId: item.id, collectionId: input.collectionId },
      });
    }

    void this.scrapeAndUpdate(item.id, input.url);
    return item;
  }

  private async scrapeAndUpdate(id: string, url: string) {
    try {
      const result = await this.scraper.scrape(url);
      // updateMany silently skips if the item was deleted before scraping finished
      await this.prisma.item.updateMany({
        where: { id },
        data: {
          title: result.title,
          description: result.description,
          imageUrl: result.imageUrl,
          type: result.type,
          status: 'done',
        },
      });
    } catch (err) {
      this.logger.warn(`scrapeAndUpdate failed for item ${id}: ${String(err)}`);
      await this.prisma.item.updateMany({
        where: { id },
        data: { status: 'failed' },
      });
    }
  }

  async findAll(
    userId: string,
    {
      limit,
      cursor,
      inboxOnly,
      archivedOnly,
      includeArchived,
      collectionId,
      type,
      sortDir,
    }: FindAllOptions,
  ) {
    const where = {
      userId,
      // Collection detail page: filter by specific collection
      ...(collectionId ? { collections: { some: { collectionId } } } : {}),
      // Inbox: non-archived + not in any collection
      ...(inboxOnly ? { isArchived: false, collections: { none: {} } } : {}),
      // Archive page: only archived
      ...(archivedOnly ? { isArchived: true } : {}),
      // Default: hide archived unless explicitly requested (applies to All page AND collection pages)
      ...(!inboxOnly && !archivedOnly && !includeArchived ? { isArchived: false } : {}),
      // Content type filter
      ...(type ? { type } : {}),
    };

    const items = await this.prisma.item.findMany({
      where,
      include: { collections: { include: { collection: true } } },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: sortDir === 'asc' ? 'asc' : 'desc' },
    });

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    const mapped = items.map(({ collections, ...item }) => {
      const currentCollection = collectionId
        ? collections.find((ci) => ci.collectionId === collectionId)
        : undefined;
      return {
        ...item,
        collections: collections.map((ci) => ({
          collectionId: ci.collectionId,
          collectionName: ci.collection.name,
          collectionColor: ci.collection.color,
          collectionIcon: ci.collection.icon ?? null,
        })),
        ...(currentCollection !== undefined && { sectionId: currentCollection.sectionId }),
      };
    });

    return { items: mapped, nextCursor: hasMore ? (mapped[mapped.length - 1]?.id ?? null) : null };
  }

  async findOne(userId: string, id: string) {
    return this.prisma.item.findFirst({ where: { id, userId } });
  }

  async archive(userId: string, id: string) {
    return this.prisma.item.update({
      where: { id, userId },
      data: { isArchived: true, archivedAt: new Date() },
    });
  }

  async unarchive(userId: string, id: string) {
    return this.prisma.item.update({
      where: { id, userId },
      data: { isArchived: false, archivedAt: null },
    });
  }

  async toggleFavorite(userId: string, id: string, isFavorite: boolean) {
    return this.prisma.item.update({
      where: { id, userId },
      data: { isFavorite },
    });
  }

  async update(userId: string, input: UpdateItemInput) {
    const { id, title, description, imageUrl, type } = input;
    return this.prisma.item.update({
      where: { id, userId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(type !== undefined && { type }),
      },
    });
  }

  async delete(userId: string, id: string) {
    return this.prisma.item.delete({ where: { id, userId } });
  }

  async search(userId: string, query: string) {
    const q = query.trim();
    const items = await this.prisma.item.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { url: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { siteName: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { collections: { include: { collection: true } } },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return items.map(({ collections, ...item }) => ({
      ...item,
      collections: collections.map((ci) => ({
        collectionId: ci.collectionId,
        collectionName: ci.collection.name,
        collectionColor: ci.collection.color,
        collectionIcon: ci.collection.icon ?? null,
      })),
    }));
  }

  async countInbox(userId: string) {
    const count = await this.prisma.item.count({
      where: { userId, isArchived: false, collections: { none: {} } },
    });
    return { inbox: count };
  }
}
