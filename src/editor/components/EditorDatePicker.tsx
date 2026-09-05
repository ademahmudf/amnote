import React, { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { CalendarDays, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getMonthGrid, parseISODateToLocalDate, todayISO } from '../../domain/calendarDates';
import {
  setEditorTaskDueDate,
  type TaskDuePickerTarget,
} from '../extensions/TaskDueExtension';
import { markdownToHtml } from '../utils/markdownConverter';

export type EditorDatePickerMode = 'date-link' | 'task-due';

interface EditorDatePickerProps {
  editor: Editor;
  mode: EditorDatePickerMode;
  position: { x: number; y: number };
  taskDueTarget?: TaskDuePickerTarget | null;
  canClear?: boolean;
  onClose: () => void;
}

const POPOVER_WIDTH = 288;
const POPOVER_HEIGHT_ESTIMATE = 392;
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function monthKeyToParts(monthKey: string): { year: number; monthIndex: number } {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, monthIndex: month - 1 };
}

export const EditorDatePicker: React.FC<EditorDatePickerProps> = ({
  editor,
  mode,
  position,
  taskDueTarget,
  canClear = false,
  onClose,
}) => {
  const today = todayISO();
  const initialDate = (mode === 'task-due' ? taskDueTarget?.dueDate : null) || today;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [monthKey, setMonthKey] = useState(initialDate.slice(0, 7));
  const selectedButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedButtonRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const commit = (iso: string) => {
    if (mode === 'task-due') {
      if (!taskDueTarget) {
        onClose();
        return;
      }
      setEditorTaskDueDate(editor, taskDueTarget, iso);
    } else {
      editor.chain().focus().insertContent(markdownToHtml(`[[${iso}]]`)).run();
    }

    onClose();
  };

  const clear = () => {
    if (mode === 'task-due' && canClear && taskDueTarget) {
      setEditorTaskDueDate(editor, taskDueTarget, null);
    }
    onClose();
  };

  const changeMonth = (offset: number) => {
    const { year, monthIndex } = monthKeyToParts(monthKey);
    const nextMonth = new Date(year, monthIndex + offset, 1);
    setMonthKey(
      `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const { year, monthIndex } = monthKeyToParts(monthKey);
  const monthLabel = parseISODateToLocalDate(`${monthKey}-01`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const weeks = getMonthGrid(year, monthIndex);
  const popoverStyle = {
    left: Math.min(
      Math.max(12, position.x),
      Math.max(12, window.innerWidth - POPOVER_WIDTH - 12)
    ),
    top:
      position.y + 12 > window.innerHeight - POPOVER_HEIGHT_ESTIMATE
        ? Math.max(12, position.y - POPOVER_HEIGHT_ESTIMATE - 12)
        : position.y + 12,
  };

  return (
    <div
      className="fixed inset-0 z-[60]"
      onClick={onClose}
      onMouseDown={(event) => event.preventDefault()}
      role="presentation"
    >
      <div
        className="absolute w-72 rounded-2xl border p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
        style={{
          ...popoverStyle,
          backgroundColor: 'var(--card-notelist-bg)',
          borderColor: 'var(--color-border)',
          color: 'var(--text-editor)',
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={mode === 'date-link' ? 'Insert date link' : 'Task due date'}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={14} style={{ color: 'var(--color-accent)' }} />
            <span className="text-[11px] font-semibold">
              {mode === 'date-link' ? 'Insert Date Link' : 'Due Date'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-0.5 rounded opacity-55 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
            aria-label="Close date picker"
          >
            <X size={12} />
          </button>
        </div>

        <div className="flex items-center justify-between mb-1.5">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="p-1 rounded-lg opacity-65 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold">{monthLabel}</span>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="p-1 rounded-lg opacity-65 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1" aria-hidden="true">
          {WEEKDAYS.map((weekday) => (
            <span
              key={weekday}
              className="flex h-6 items-center justify-center text-[10px] font-semibold uppercase opacity-45"
            >
              {weekday}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {weeks.flat().map((day) => {
            const isSelected = day.iso === selectedDate;
            const isToday = day.iso === today;
            return (
              <button
                key={day.iso}
                ref={isSelected ? selectedButtonRef : undefined}
                type="button"
                onClick={() => setSelectedDate(day.iso)}
                onDoubleClick={() => commit(day.iso)}
                className={`flex h-7 w-7 items-center justify-center justify-self-center rounded-lg text-xs transition-colors ${
                  isSelected
                    ? 'font-bold text-white'
                    : day.isCurrentMonth
                      ? 'opacity-80 hover:bg-black/10 dark:hover:bg-white/10'
                      : 'opacity-30 hover:bg-black/5 dark:hover:bg-white/5'
                } ${!isSelected && isToday ? 'ring-1 ring-(--color-accent)/50' : ''}`}
                style={{
                  backgroundColor: isSelected ? 'var(--color-accent)' : undefined,
                  color: isSelected ? 'var(--color-accent-text)' : undefined,
                }}
                aria-label={day.iso}
                aria-pressed={isSelected}
              >
                {day.day}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedDate(today);
              setMonthKey(today.slice(0, 7));
            }}
            className="px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-black/5 dark:bg-white/10 opacity-75 hover:opacity-100 transition-all"
          >
            Today
          </button>

          {canClear && (
            <button
              type="button"
              onClick={clear}
              className="px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-black/5 dark:bg-white/10 opacity-75 hover:opacity-100 transition-all"
            >
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={() => commit(selectedDate)}
            className="ml-auto flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
          >
            <Check size={12} />
            {mode === 'date-link' ? 'Insert' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
