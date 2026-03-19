'use client';

import { ItemRow } from '@/components/item-row';
import { SectionHeader } from '@/components/section-header';
import { trpc } from '@/lib/trpc';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { CollectionSection, Item } from '@hako/types';
import { getFaviconUrl, getHostname } from '@hako/utils';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';

// Lightweight overlay shown while dragging — no hover logic, portals, or mutations
function ItemDragPreview({ item }: { item: Item }) {
  const favicon = getFaviconUrl(item.url);
  const hostname = getHostname(item.url);
  const [faviconError, setFaviconError] = React.useState(false);

  return (
    <div className="flex h-10 items-center gap-3 rounded-lg border border-stone-200 bg-white px-2 opacity-95 shadow-xl dark:border-stone-700 dark:bg-stone-900">
      <div className="flex size-4 shrink-0 items-center justify-center">
        {favicon && !faviconError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={favicon}
            alt=""
            width={16}
            height={16}
            className="size-4 rounded-sm"
            onError={() => setFaviconError(true)}
          />
        ) : (
          <GlobeAltIcon className="size-4 text-stone-400" />
        )}
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800 dark:text-stone-100">
        {item.title?.trim() || hostname}
      </span>
      <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">{hostname}</span>
    </div>
  );
}

// Draggable item — ref on the <li>, handle listeners on the drag button
function DraggableItemRow({
  item,
  hoveredId,
  onHoverChange,
}: {
  item: Item;
  hoveredId: string | null;
  onHoverChange: (id: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `item:${item.id}`,
    data: { type: 'item', sectionId: item.sectionId ?? null, item },
  });

  return (
    <ItemRow
      ref={setNodeRef as React.Ref<HTMLLIElement>}
      item={item}
      showCollection={false}
      hoveredId={isDragging ? null : hoveredId}
      onHoverChange={onHoverChange}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

// Droppable zone for a section or the unsectioned area
function DroppableZone({
  sectionId,
  children,
}: {
  sectionId: string | null;
  children: React.ReactNode;
}) {
  const zoneId = `zone:${sectionId ?? 'unsectioned'}`;
  const { setNodeRef, isOver } = useDroppable({
    id: zoneId,
    data: { type: 'zone', sectionId },
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        'min-h-2 rounded-lg transition-colors duration-100',
        isOver ? 'bg-stone-100/80 dark:bg-stone-800/40' : '',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

interface SectionedItemListProps {
  collectionId: string;
  sections: CollectionSection[];
  items: Item[];
  hoveredId: string | null;
  onHoverChange: (id: string | null) => void;
}

export function SectionedItemList({
  collectionId,
  sections,
  items,
  hoveredId,
  onHoverChange,
}: SectionedItemListProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const assignItem = trpc.sections.assignItem.useMutation({
    onSettled: () => void utils.items.list.invalidate(),
  });

  const reorderSections = trpc.sections.reorder.useMutation({
    onSettled: () => void utils.sections.list.invalidate({ collectionId }),
  });

  const renameSection = trpc.sections.update.useMutation({
    onSettled: () => {
      void utils.sections.list.invalidate({ collectionId });
      void utils.collections.getById.invalidate({ id: collectionId });
    },
  });

  const deleteSection = trpc.sections.delete.useMutation({
    onSettled: () => {
      void utils.sections.list.invalidate({ collectionId });
      void utils.collections.getById.invalidate({ id: collectionId });
      void utils.items.list.invalidate();
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function toggleSection(sectionId: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  // Partition items by sectionId
  const itemsBySection = new Map<string | null, Item[]>();
  itemsBySection.set(null, []);
  for (const s of sections) itemsBySection.set(s.id, []);
  for (const item of items) {
    const key = item.sectionId ?? null;
    // If sectionId points to a section that no longer exists, treat as unsectioned
    const resolvedKey = key !== null && itemsBySection.has(key) ? key : null;
    itemsBySection.get(resolvedKey)?.push(item);
  }

  const unsectionedItems = itemsBySection.get(null) ?? [];

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeData = active.data.current as { type: string; item?: Item } | undefined;
    const overData = over.data.current as { type: string; sectionId?: string | null } | undefined;

    if (activeData?.type === 'section') {
      // Reorder sections
      const activeIndex = sections.findIndex((s) => `section:${s.id}` === activeId);
      const overIndex = sections.findIndex((s) => `section:${s.id}` === overId);
      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return;

      const newIds = arrayMove(
        sections.map((s) => s.id),
        activeIndex,
        overIndex,
      );
      reorderSections.mutate({ collectionId, orderedIds: newIds });
    } else if (activeData?.type === 'item' && activeData.item && overData?.type === 'zone') {
      // Move item to a section zone
      const targetSectionId = overData.sectionId ?? null;
      const currentSectionId = activeData.item.sectionId ?? null;
      if (targetSectionId === currentSectionId) return;
      assignItem.mutate({ collectionId, itemId: activeData.item.id, sectionId: targetSectionId });
    }
  }

  const activeDragItem = activeDragId?.startsWith('item:')
    ? items.find((i) => `item:${i.id}` === activeDragId)
    : undefined;

  const sectionDndIds = sections.map((s) => `section:${s.id}`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-1">
        <SortableContext items={sectionDndIds} strategy={verticalListSortingStrategy}>
          {sections.map((section) => {
            const sectionItems = itemsBySection.get(section.id) ?? [];
            const collapsed = collapsedSections.has(section.id);

            return (
              <div key={section.id}>
                <SectionHeader
                  section={{ ...section, itemCount: sectionItems.length }}
                  collapsed={collapsed}
                  onToggle={() => toggleSection(section.id)}
                  onRename={(name) => renameSection.mutate({ id: section.id, name })}
                  onDelete={() => deleteSection.mutate({ id: section.id })}
                />
                {!collapsed && (
                  <DroppableZone sectionId={section.id}>
                    <ul className="space-y-0.5">
                      {sectionItems.map((item) => (
                        <DraggableItemRow
                          key={item.id}
                          item={item}
                          hoveredId={hoveredId}
                          onHoverChange={onHoverChange}
                        />
                      ))}
                      {sectionItems.length === 0 && (
                        <li className="py-2 text-center text-xs text-stone-400 dark:text-stone-600">
                          Drop items here
                        </li>
                      )}
                    </ul>
                  </DroppableZone>
                )}
              </div>
            );
          })}
        </SortableContext>

        {/* Unsectioned items */}
        {(unsectionedItems.length > 0 || sections.length > 0) && (
          <div>
            {sections.length > 0 && unsectionedItems.length > 0 && (
              <div className="flex items-center gap-1.5 py-1.5">
                <span className="text-xs font-medium text-stone-400 dark:text-stone-500">
                  Unsectioned
                </span>
                <div className="mx-2 h-px flex-1 bg-stone-200 dark:bg-stone-700" />
                <span className="text-xs tabular-nums text-stone-400 dark:text-stone-500">
                  {unsectionedItems.length}
                </span>
              </div>
            )}
            <DroppableZone sectionId={null}>
              <ul className="space-y-0.5">
                {unsectionedItems.map((item) => (
                  <DraggableItemRow
                    key={item.id}
                    item={item}
                    hoveredId={hoveredId}
                    onHoverChange={onHoverChange}
                  />
                ))}
              </ul>
            </DroppableZone>
          </div>
        )}
      </div>

      {/* Drag overlay — portalled to body so the animate-fade-in transform
          on ItemsSection doesn't create a containing block that breaks
          position:fixed positioning (same issue as the hover card in ItemRow). */}
      {typeof document !== 'undefined' &&
        createPortal(
          <DragOverlay dropAnimation={null}>
            {activeDragItem && <ItemDragPreview item={activeDragItem} />}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}
