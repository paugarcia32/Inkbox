import type { CreateItemInput } from '@inkbox/types';
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
      await this.prisma.item.update({
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
      await this.prisma.item.update({
        where: { id },
        data: { status: 'failed' },
      });
    }
  }

  async findAll(userId: string, { limit, cursor, inboxOnly, archivedOnly, includeArchived, collectionId }: FindAllOptions) {
    const where = {
      userId,
      // Collection detail page: filter by specific collection
      ...(collectionId ? { collections: { some: { collectionId } } } : {}),
      // Inbox: non-archived + not in any collection
      ...(inboxOnly ? { isArchived: false, collections: { none: {} } } : {}),
      // Archive page: only archived
      ...(archivedOnly ? { isArchived: true } : {}),
      // Default (All page, no special flag): hide archived unless explicitly requested
      ...(!inboxOnly && !archivedOnly && !includeArchived && !collectionId ? { isArchived: false } : {}),
    };

    const items = await this.prisma.item.findMany({
      where,
      include: { collections: { include: { collection: true } } },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    const mapped = items.map(({ collections, ...item }) => ({
      ...item,
      collections: collections.map((ci) => ({
        collectionId: ci.collectionId,
        collectionName: ci.collection.name,
        collectionColor: ci.collection.color,
        collectionIcon: ci.collection.icon ?? null,
      })),
    }));

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

  async delete(userId: string, id: string) {
    return this.prisma.item.delete({ where: { id, userId } });
  }
}
