import type { ID, Timestamp } from './common';

export type CollectionSection = Timestamp & {
  id: ID;
  collectionId: ID;
  name: string;
  order: number;
  itemCount: number;
};
