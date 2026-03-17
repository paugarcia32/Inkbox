'use client';

import { COLLECTION_ICONS } from '@/lib/collection-icons';

interface IconPickerProps {
  value: string | null;
  color: string; // hex color for selected icon tint
  onChange: (id: string | null) => void;
}

export function IconPicker({ value, color, onChange }: IconPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {COLLECTION_ICONS.map(({ id, component: Icon }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            title={id.replace('Icon', '')}
            onClick={() => onChange(selected ? null : id)}
            className={[
              'flex items-center justify-center rounded-lg p-1.5 transition-colors',
              selected
                ? 'ring-2 ring-offset-1 ring-accent-500 bg-accent-50 dark:bg-accent-950/30'
                : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300',
            ].join(' ')}
            style={selected ? { color } : undefined}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
