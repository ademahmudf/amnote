import type { TagMetadataItem, TagMetadataMap } from '../types/note';

/**
 * Normalizes a tag key (strips leading hashes, trims, lowercases).
 */
export function normalizeTagKey(tag: string): string {
  return tag.replace(/^#+/, '').trim().toLowerCase();
}

/**
 * Merges two TagMetadataMaps using per-tag Last-Write-Wins (LWW) conflict resolution.
 * If both maps have the same tag, the entry with the higher `updatedAt` timestamp wins.
 */
export function mergeTagMetadataMaps(
  local: TagMetadataMap = {},
  disk: TagMetadataMap = {}
): TagMetadataMap {
  const merged: TagMetadataMap = {};
  const allKeys = new Set([...Object.keys(local), ...Object.keys(disk)]);

  for (const rawKey of allKeys) {
    const key = normalizeTagKey(rawKey);
    const localEntry = local[rawKey] || local[key];
    const diskEntry = disk[rawKey] || disk[key];

    if (!localEntry && diskEntry) {
      merged[key] = { ...diskEntry };
    } else if (localEntry && !diskEntry) {
      merged[key] = { ...localEntry };
    } else if (localEntry && diskEntry) {
      // Compare timestamps
      if (diskEntry.updatedAt > localEntry.updatedAt) {
        merged[key] = { ...diskEntry };
      } else if (localEntry.updatedAt > diskEntry.updatedAt) {
        merged[key] = { ...localEntry };
      } else {
        // Equal timestamps: merge fields gracefully, preferring disk
        merged[key] = {
          icon: diskEntry.icon !== undefined ? diskEntry.icon : localEntry.icon,
          color: diskEntry.color !== undefined ? diskEntry.color : localEntry.color,
          updatedAt: diskEntry.updatedAt,
        };
      }
    }
  }

  return merged;
}

/**
 * Extracts a flat dictionary of tag -> iconName for consumption by UI components.
 * Tombstones (null or empty icons) are excluded.
 */
export function extractFlatTagIcons(tags: TagMetadataMap = {}): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [tag, meta] of Object.entries(tags)) {
    if (meta.icon && meta.icon.trim()) {
      result[normalizeTagKey(tag)] = meta.icon.trim();
    }
  }
  return result;
}

/**
 * Extracts a flat dictionary of tag -> color for consumption by UI components.
 * Tombstones (null or empty colors) are excluded.
 */
export function extractFlatTagColors(tags: TagMetadataMap = {}): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [tag, meta] of Object.entries(tags)) {
    if (meta.color && meta.color.trim()) {
      result[normalizeTagKey(tag)] = meta.color.trim();
    }
  }
  return result;
}

/**
 * Creates or updates a single tag's metadata with an updated timestamp.
 * Setting icon or color to null explicitly tombstones the field so deletions sync.
 */
export function buildTagMetadataUpdate(
  tag: string,
  currentMap: TagMetadataMap = {},
  updates: { icon?: string | null; color?: string | null; updatedAt?: number }
): TagMetadataMap {
  const cleanKey = normalizeTagKey(tag);
  const current = currentMap[cleanKey] || { updatedAt: 0 };
  const timestamp = updates.updatedAt ?? Date.now();

  const nextEntry: TagMetadataItem = {
    icon: updates.icon !== undefined ? updates.icon : (current.icon ?? null),
    color: updates.color !== undefined ? updates.color : (current.color ?? null),
    updatedAt: timestamp,
  };

  return {
    ...currentMap,
    [cleanKey]: nextEntry,
  };
}

/**
 * Seeds a TagMetadataMap from flat legacy localStorage dictionaries (tagIcons, tagColors).
 */
export function seedTagMetadataFromFlat(
  icons: Record<string, string> = {},
  colors: Record<string, string> = {},
  defaultTimestamp = Date.now()
): TagMetadataMap {
  const map: TagMetadataMap = {};
  const allTags = new Set([...Object.keys(icons), ...Object.keys(colors)]);

  for (const rawTag of allTags) {
    const key = normalizeTagKey(rawTag);
    map[key] = {
      icon: icons[rawTag] ?? icons[key] ?? null,
      color: colors[rawTag] ?? colors[key] ?? null,
      updatedAt: defaultTimestamp,
    };
  }

  return map;
}
