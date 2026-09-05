import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, Check } from 'lucide-react';
import type { SortOption } from '../../types/note';
import { useNoteStore } from '../../store/useNoteStore';

export const SortDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const sortOption = useNoteStore((state) => state.sortOption);
  const setSortOption = useNoteStore((state) => state.setSortOption);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: { id: SortOption; label: string }[] = [
    { id: 'updated-desc', label: 'Modification Date (Newest)' },
    { id: 'updated-asc', label: 'Modification Date (Oldest)' },
    { id: 'created-desc', label: 'Creation Date (Newest)' },
    { id: 'created-asc', label: 'Creation Date (Oldest)' },
    { id: 'title-asc', label: 'Title (A → Z)' },
    { id: 'title-desc', label: 'Title (Z → A)' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative select-none" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Sort notes"
        className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs flex items-center gap-1"
      >
        <ArrowUpDown size={13} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-56 rounded-xl shadow-xl border p-1 z-30 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          style={{
            backgroundColor: 'var(--card-notelist-bg)',
            borderColor: 'var(--color-border)',
            color: 'var(--text-notelist)',
          }}
        >
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider opacity-50">
            Sort Notes By
          </div>
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setSortOption(opt.id);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors"
            >
              <span>{opt.label}</span>
              {sortOption === opt.id && <Check size={12} className="text-(--color-accent)" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
