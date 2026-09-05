import type { Note } from '../types/note';
import { getTasksDueOn } from './taskDueDates';

export interface CalendarDayCell {
  iso: string;
  day: number;
  isCurrentMonth: boolean;
}

export interface CalendarDayEntry {
  note: Note;
  isDailyNote: boolean;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dateFromParts(year: number, monthIndex: number, day: number): Date {
  // Noon avoids day-boundary shifts when a date is converted through UTC or
  // affected by DST transitions.
  return new Date(Date.UTC(year, monthIndex, day, 12));
}

function partsFromIso(iso: string): { year: number; monthIndex: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, monthIndex: month - 1, day };
}

function formatUtcIso(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const { year, monthIndex, day } = partsFromIso(value);
  const date = dateFromParts(year, monthIndex, day);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === monthIndex
    && date.getUTCDate() === day;
}

export function formatLocalISODate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return formatLocalISODate(now);
}

export function parseISODateToLocalDate(iso: string): Date {
  const { year, monthIndex, day } = partsFromIso(iso);
  return new Date(year, monthIndex, day);
}

export function addDaysISO(iso: string, days: number): string {
  if (!isValidISODate(iso)) return iso;
  const { year, monthIndex, day } = partsFromIso(iso);
  return formatUtcIso(dateFromParts(year, monthIndex, day + days));
}

export function getMonthGrid(year: number, monthIndex: number): CalendarDayCell[][] {
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1, 12));
  const daysFromMonday = (firstOfMonth.getUTCDay() + 6) % 7;
  const start = dateFromParts(year, monthIndex, 1 - daysFromMonday);

  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = dateFromParts(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + week * 7 + weekday
      );
      return {
        iso: formatUtcIso(date),
        day: date.getUTCDate(),
        isCurrentMonth: date.getUTCMonth() === monthIndex,
      };
    })
  );
}

export function extractDateLinks(content: string): string[] {
  const dates = new Set<string>();
  const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;

  for (const match of content.matchAll(wikiLinkPattern)) {
    const target = match[1].trim();
    if (isValidISODate(target)) dates.add(target);
  }

  return Array.from(dates);
}

export function isDailyNote(note: Note, iso: string): boolean {
  return !note.isTrashed && !note.isArchived && note.title.trim() === iso;
}

export function getCalendarDayEntries(notes: Note[], iso: string): {
  dailyNotes: Note[];
  mentions: Note[];
  dueTasks: ReturnType<typeof getTasksDueOn>;
} {
  if (!isValidISODate(iso)) return { dailyNotes: [], mentions: [], dueTasks: [] };

  const activeNotes = notes.filter((note) => !note.isTrashed && !note.isArchived);
  const dailyNotes = activeNotes
    .filter((note) => note.title.trim() === iso)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const dailyNoteIds = new Set(dailyNotes.map((note) => note.id));
  const mentions = activeNotes
    .filter((note) => !dailyNoteIds.has(note.id) && extractDateLinks(note.content).includes(iso))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return { dailyNotes, mentions, dueTasks: getTasksDueOn(notes, iso) };
}

export function createDailyNoteContent(iso: string): string {
  return `# ${iso}\n\n[[${addDaysISO(iso, -1)}]] · [[${addDaysISO(iso, 1)}]]\n\n## Notes\n\n## Tasks\n- [ ]\n`;
}
