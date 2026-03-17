import type { ID, Timestamp } from './common';

export type ContentType = 'article' | 'youtube' | 'tweet' | 'link' | 'pinterest';

export type ItemStatus = 'pending' | 'processing' | 'done' | 'failed';

export type ItemCollection = {
  collectionId: string;
  collectionName: string;
  collectionColor: string;
  collectionIcon: string | null;
};

export type Item = Timestamp & {
  id: ID;
  userId: ID;
  url: string;
  type: ContentType;
  status: ItemStatus;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  content: string | null;
  transcript: string | null;
  isArchived: boolean;
  isFavorite: boolean;
  archivedAt: string | null;
  tags?: string[];
  collections?: ItemCollection[];
};

export type CreateItemInput = {
  url: string;
};
