'use client';

import { TAGS, TAG_COLORS } from '@/lib/tags';

interface TagSelectorProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  readOnly?: boolean;
}

export default function TagSelector({ selected, onChange, readOnly = false }: TagSelectorProps) {
  const toggle = (tag: string) => {
    if (readOnly) return;
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {TAGS.map(tag => {
        const isSelected = selected.includes(tag);
        const colors = TAG_COLORS[tag] || 'bg-slate-50 text-slate-600 border-slate-200';
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            disabled={readOnly}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all
              ${isSelected
                ? `${colors} ring-1 ring-offset-1 ring-current scale-105`
                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
              }
              ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {isSelected && (
              <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
            {tag}
          </button>
        );
      })}
    </div>
  );
}

// Read-only display of selected tags (for cards/detail view)
export function TagBadges({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => {
        const colors = TAG_COLORS[tag] || 'bg-slate-50 text-slate-600 border-slate-200';
        return (
          <span key={tag} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors}`}>
            {tag}
          </span>
        );
      })}
    </div>
  );
}
