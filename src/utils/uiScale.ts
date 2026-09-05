import type { UiScale } from '../store/useSettingsStore';

/**
 * Single home for every uiScale -> Tailwind class/size map.
 * Sidebar, TagItem, NoteList and NoteCard all read from here so a scale
 * tweak only needs one edit. `uiScale` is typed as `UiScale`, so every map
 * is total and no per-call-site fallback is needed.
 */

/** Pick the entry for the active scale from a total map. */
export function uiScaleValue<T>(map: Record<UiScale, T>, scale: UiScale): T {
  return map[scale];
}

/** Sidebar rows + tag-tree rows (identical sizing, shared). */
export const sidebarItemTextClass: Record<UiScale, string> = {
  compact: 'text-[12px] h-[25px] px-2',
  standard: 'text-[13.5px] h-[28px] px-2.5',
  comfortable: 'text-[15px] h-[32px] px-2.5',
  spacious: 'text-[16.5px] h-[36px] px-3',
};

export const sidebarIconSize: Record<UiScale, number> = {
  compact: 13,
  standard: 14,
  comfortable: 15,
  spacious: 16.5,
};

export const sidebarCounterClass: Record<UiScale, string> = {
  compact: 'text-[9.5px]',
  standard: 'text-[10.5px]',
  comfortable: 'text-[11.5px]',
  spacious: 'text-[12.5px]',
};

/** Per-depth indent step (px) for nested tag rows. */
export const tagIndentStep: Record<UiScale, number> = {
  compact: 12,
  standard: 12,
  comfortable: 13,
  spacious: 14,
};

/** Note-list panel + header sizing. */
export const noteListPanelWidthClass: Record<UiScale, string> = {
  compact: 'w-72',
  standard: 'w-76',
  comfortable: 'w-80',
  spacious: 'w-88',
};

export const noteListSearchInputClass: Record<UiScale, string> = {
  compact: 'text-xs',
  standard: 'text-[12.5px]',
  comfortable: 'text-[13.5px]',
  spacious: 'text-sm',
};

export const noteListHeaderTitleClass: Record<UiScale, string> = {
  compact: 'text-xs',
  standard: 'text-[13px]',
  comfortable: 'text-sm',
  spacious: 'text-base',
};

/** Note-card typography. */
export const noteCardTitleClass: Record<UiScale, string> = {
  compact: 'text-[12.5px]',
  standard: 'text-[13.5px]',
  comfortable: 'text-[15px]',
  spacious: 'text-[16.5px]',
};

export const noteCardSnippetClass: Record<UiScale, string> = {
  compact: 'text-[11px]',
  standard: 'text-[12px]',
  comfortable: 'text-[13px]',
  spacious: 'text-[14px]',
};

export const noteCardDateClass: Record<UiScale, string> = {
  compact: 'text-[10px]',
  standard: 'text-[11px]',
  comfortable: 'text-[11.5px]',
  spacious: 'text-[12px]',
};

export const noteCardBadgeClass: Record<UiScale, string> = {
  compact: 'text-[9.5px]',
  standard: 'text-[10.5px]',
  comfortable: 'text-[11px]',
  spacious: 'text-[12px]',
};
