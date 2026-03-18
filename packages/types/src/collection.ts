import type { ID, Timestamp } from './common';
import type { Item } from './item';

export const COLLECTION_COLORS = [
  { id: 'stone', hex: '#78716c' },
  { id: 'red', hex: '#ef4444' },
  { id: 'orange', hex: '#f97316' },
  { id: 'amber', hex: '#f59e0b' },
  { id: 'lime', hex: '#84cc16' },
  { id: 'green', hex: '#22c55e' },
  { id: 'teal', hex: '#14b8a6' },
  { id: 'sky', hex: '#0ea5e9' },
  { id: 'blue', hex: '#3b82f6' },
  { id: 'violet', hex: '#8b5cf6' },
  { id: 'pink', hex: '#ec4899' },
] as const;

export type CollectionColorId = (typeof COLLECTION_COLORS)[number]['id'];

export type Collection = Timestamp & {
  id: ID;
  userId: ID;
  name: string;
  description: string | null;
  shareToken: string | null;
  isPublic: boolean;
  itemCount: number;
  color: string;
  icon: string | null;
};

export type CollectionWithItems = Collection & {
  items: Item[];
};
