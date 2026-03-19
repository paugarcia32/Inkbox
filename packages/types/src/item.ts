import type { ID, Timestamp } from './common';

export type ContentType = 'link' | 'article' | 'video' | 'image' | 'post' | 'document';

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
  sectionId?: string | null;
};

export type CreateItemInput = {
  url: string;
  collectionId?: string | undefined;
};

export type UpdateItemInput = {
  id: string;
  title?: string | null | undefined;
  description?: string | null | undefined;
  imageUrl?: string | null | undefined;
  type?: ContentType | undefined;
};
