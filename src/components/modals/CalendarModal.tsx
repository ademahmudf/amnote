import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  FileText,
  Link as LinkIcon,
  Plus,
  X,
} from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { useUIStore } from '../../store/useUIStore';
import {
  extractDateLinks,
  formatLocalISODate,
  getMonthGrid,
  isValidISODate,
  parseISODateToLocalDate,
  todayISO,
} from '../../domain/calendarDates';
import { formatDueDate, isTaskOverdue, parseTaskDueItems, type TaskDueItem } from '../../domain/taskDueDates';
import type { Note } from '../../types/note';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarModal: React.FC = () => {
  const isOpen = useUIStore((state) => state.isCalendarModalOpen);
  const selectedDate = useUIStore((state) => state.calendarSelectedDate);
  const notes = useNoteStore((state) => state.notes);
  const setCalendarModalOpen = useUIStore((state) => state.setCalendarModalOpen);
  const setCalendarSelectedDate = useUIStore((state) => state.setCalendarSelectedDate);
  const setActiveNoteId = useNoteStore((state) => state.setActiveNoteId);
  const openDailyNote = useNoteStore((state) => state.openDailyNote);

  const selectedParts = useMemo(
    () => (isValidISODate(selectedDate) ? parseISODateToLocalDate(selectedDate) : new Date()),
    [selectedDate]
  );
  const [viewYear, setViewYear] = useState(selectedParts.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedParts.getMonth());

  useEffect(() => {
    if (!isOpen) return;
    setViewYear(selectedParts.getFullYear());
    setViewMonth(selectedParts.getMonth());
  }, [isOpen, selectedParts]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setCalendarModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setCalendarModalOpen]);

  const grid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const entriesByDate = useMemo(() => {
    const result = new Map<string, { dailyNotes: Note[]; mentions: Note[]; dueTasks: TaskDueItem[] }>();
    const gridDates = new Set<string>();
    for (const week of grid) {
      for (const cell of week) {
        result.set(cell.iso, { dailyNotes: [], mentions: [], dueTasks: [] });
        gridDates.add(cell.iso);
      }
    }

    for (const note of notes) {
      if (note.isTrashed || note.isArchived) continue;

      const dailyDate = note.title.trim();
      if (gridDates.has(dailyDate)) {
        result.get(dailyDate)!.dailyNotes.push(note);
      }

      for (const task of parseTaskDueItems(note)) {
        if (gridDates.has(task.dueDate)) result.get(task.dueDate)!.dueTasks.push(task);
      }

      for (const iso of extractDateLinks(note.content)) {
        if (gridDates.has(iso)) result.get(iso)!.mentions.push(note);
      }
    }

    return result;
  }, [grid, notes]);

  const selectedEntries =
    entriesByDate.get(selectedDate) ??
    { dailyNotes: [], mentions: [], dueTasks: [] as TaskDueItem[] };
  const today = todayISO();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const selectedLabel = isValidISODate(selectedDate)
    ? parseISODateToLocalDate(selectedDate).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : selectedDate;

  const changeMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={() => setCalendarModalOpen(false)}
      role="presentation"
    >
      <div
        className="w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card-notelist-bg)',
          borderColor: 'var(--color-border)',
          color: 'var(--text-notelist)',
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Calendar"
      >
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays size={16} className="text-(--color-accent) shrink-0" style={{ color: 'var(--color-accent)' }} />
            <span className="font-semibold text-sm truncate">{monthLabel}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-black/5 dark:bg-white/10 opacity-75 hover:opacity-100 transition-opacity"
              onClick={() => {
                const iso = todayISO();
                setCalendarSelectedDate(iso);
                setViewYear(parseISODateToLocalDate(iso).getFullYear());
                setViewMonth(parseISODateToLocalDate(iso).getMonth());
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg opacity-65 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg opacity-65 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
            >
              <ChevronRight size={15} />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg opacity-65 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all ml-1"
              onClick={() => setCalendarModalOpen(false)}
              aria-label="Close calendar"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.25fr)_minmax(240px,0.85fr)] calendar-modal-grid">
          <div className="p-3">
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((weekday) => (
                <div
                  key={weekday}
                  className="h-6 flex items-center justify-center text-[9.5px] font-bold uppercase tracking-wider opacity-45"
                >
                  {weekday}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {grid.flat().map((cell) => {
                const entries =
                  entriesByDate.get(cell.iso) ??
                  { dailyNotes: [], mentions: [], dueTasks: [] as TaskDueItem[] };
                const total = entries.dailyNotes.length + entries.mentions.length + entries.dueTasks.length;
                const isSelected = cell.iso === selectedDate;
                const isToday = cell.iso === today;
                const hasOverdueTasks = entries.dueTasks.some((task) => isTaskOverdue(task));

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => {
                      setCalendarSelectedDate(cell.iso);
                    }}
                    className={`relative h-14 rounded-xl border p-1 text-left transition-all ${
                      isSelected
                        ? 'border-(--color-accent) bg-(--color-accent)/10'
                        : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                    } ${cell.isCurrentMonth ? '' : 'opacity-35'}`}
                    style={{
                      borderColor: isSelected ? 'var(--color-accent)' : undefined,
                    }}
                    title={`${cell.iso} • Show notes and tasks`}
                  >
                    <span
                      className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-md text-[11px] font-semibold ${
                        isToday ? 'bg-(--color-accent) text-white' : ''
                      }`}
                      style={{
                        backgroundColor: isToday ? 'var(--color-accent)' : undefined,
                        color: isToday ? 'var(--color-accent-text)' : undefined,
                      }}
                    >
                      {cell.day}
                    </span>

                    {total > 0 && (
                      <span className="absolute bottom-1 left-1 flex items-center gap-1">
                        {entries.dailyNotes.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-(--color-accent)" style={{ backgroundColor: 'var(--color-accent)' }} />
                        )}
                        {entries.mentions.length > 0 && (
                          <span className="font-mono text-[8.5px] opacity-55">{entries.mentions.length}</span>
                        )}
                        {entries.dueTasks.length > 0 && (
                          <span
                            className={`px-1 rounded-full font-mono text-[8.5px] font-semibold ${
                              hasOverdueTasks ? 'bg-rose-500/15 text-rose-500' : 'bg-(--color-accent)/10 text-(--color-accent)'
                            }`}
                            style={{
                              backgroundColor: hasOverdueTasks ? undefined : 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                              color: hasOverdueTasks ? undefined : 'var(--color-accent)',
                            }}
                          >
                            {entries.dueTasks.length}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="border-t md:border-t-0 md:border-l p-3 max-h-72 md:max-h-none overflow-y-auto"
            style={{ borderColor: 'var(--color-divider)' }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-45 mb-2">
              {selectedLabel}
            </div>

            <div className="space-y-1.5">
              {[...selectedEntries.dailyNotes, ...selectedEntries.mentions, ...selectedEntries.dueTasks].length === 0 ? (
                <>
                  <div className="px-2 py-3 text-[11px] opacity-45 leading-relaxed">
                    No notes or tasks are linked to this date.
                  </div>
                  <button
                    type="button"
                    onClick={() => void openDailyNote(selectedDate)}
                    className="w-full flex items-center justify-center gap-2 p-2 rounded-xl border text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <Plus size={13} className="shrink-0" style={{ color: 'var(--color-accent)' }} />
                    <span className="text-xs font-semibold">Create new note</span>
                  </button>
                </>
              ) : (
                <>
                  {selectedEntries.dueTasks.map((task) => {
                    const overdue = isTaskOverdue(task);
                    return (
                      <button
                        key={`${task.noteId}:${task.lineIndex}:${task.dueDate}`}
                        type="button"
                        onClick={() => {
                          setCalendarModalOpen(false);
                          setActiveNoteId(task.noteId);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors"
                      >
                        <CheckSquare
                          size={13}
                          className={`shrink-0 ${task.checked ? 'text-emerald-500' : overdue ? 'text-rose-500' : 'text-(--color-accent)'}`}
                          style={{ color: task.checked ? undefined : overdue ? undefined : 'var(--color-accent)' }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-xs truncate ${task.checked ? 'opacity-45 line-through' : ''}`}>
                            {task.text || 'Task'}
                          </span>
                          <span className="block text-[9.5px] opacity-45 truncate">
                            {task.noteTitle || 'Untitled'} • {formatDueDate(task.dueDate)}
                          </span>
                        </span>
                        <span
                          className={`ml-auto font-mono text-[9px] ${
                            task.checked ? 'text-emerald-500 opacity-70' : overdue ? 'text-rose-500 font-semibold' : 'opacity-40'
                          }`}
                        >
                          {task.checked ? 'Done' : overdue ? 'Overdue' : 'Due'}
                        </span>
                      </button>
                    );
                  })}

                  {selectedEntries.dailyNotes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => {
                        setCalendarModalOpen(false);
                        setActiveNoteId(note.id);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors"
                    >
                      <FileText size={13} className="opacity-55 shrink-0" />
                      <span className="text-xs truncate">{note.title || 'Untitled'}</span>
                      <span className="ml-auto font-mono text-[9px] opacity-40">Daily</span>
                    </button>
                  ))}

                  {selectedEntries.mentions.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => {
                        setCalendarModalOpen(false);
                        setActiveNoteId(note.id);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors"
                    >
                      <LinkIcon size={13} className="opacity-55 shrink-0" />
                      <span className="text-xs truncate">{note.title || 'Untitled'}</span>
                    </button>
                  ))}
                </>
              )}
            </div>

            <div className="mt-3 text-[10px] opacity-40 leading-relaxed">
              Tip: use <span className="font-mono">[[{formatLocalISODate()}]]</span> in any note to link a date.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
