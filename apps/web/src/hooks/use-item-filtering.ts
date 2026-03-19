import type { SortOption, TypeFilter } from '@/components/filter-bar';
import { useState } from 'react';

export function useItemFiltering() {
  const [sort, setSort] = useState<SortOption>('date-desc');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  return { sort, setSort, typeFilter, setTypeFilter };
}
