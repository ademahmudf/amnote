/**
 * Pure helper functions for editor suggestion triggers, viewport bounds, and note metrics.
 */

export interface SlashTriggerResult {
  query: string;
}

export interface WikiTriggerResult {
  query: string;
}

export interface NoteMetrics {
  words: number;
  chars: number;
  readTime: number;
}

/**
 * Detects if cursor position follows an active slash command trigger: /query
 */
export function detectSlashCommand(textBefore: string): SlashTriggerResult | null {
  const lastSlashIdx = textBefore.lastIndexOf('/');
  if (
    lastSlashIdx !== -1 &&
    (lastSlashIdx === 0 || /\s/.test(textBefore[lastSlashIdx - 1])) &&
    !textBefore.slice(lastSlashIdx).includes(' ')
  ) {
    return { query: textBefore.slice(lastSlashIdx + 1) };
  }
  return null;
}

/**
 * Detects if cursor position follows an active wiki-link autocomplete trigger: [[query
 */
export function detectWikiLink(textBefore: string): WikiTriggerResult | null {
  const lastDoubleBracket = textBefore.lastIndexOf('[[');
  if (lastDoubleBracket !== -1 && !textBefore.slice(lastDoubleBracket).includes(']]')) {
    return { query: textBefore.slice(lastDoubleBracket + 2) };
  }
  return null;
}

/**
 * Clamps lightbox zoom scale within permissible min/max bounds.
 */
export function clampZoom(zoom: number, min = 0.5, max = 3.0): number {
  return Math.min(max, Math.max(min, Math.round(zoom * 100) / 100));
}

/**
 * Calculates note word count, character count, and estimated reading time.
 */
export function calculateNoteMetrics(content: string): NoteMetrics {
  const words = content.trim().match(/\S+/g)?.length || 0;
  const chars = content.length;
  const readTime = Math.max(1, Math.ceil(words / 200));
  return { words, chars, readTime };
}
