import React, { useMemo } from 'react';
import { diffLines } from '../../domain/textDiff';
import type { VaultConflict } from '../../domain/vaultSync';
import type { Note } from '../../types/note';

interface ConflictDiffModalProps {
  conflict: VaultConflict;
  onResolve: (resolution: 'local' | 'disk' | 'both') => void;
  onClose: () => void;
}

export const ConflictDiffModal: React.FC<ConflictDiffModalProps> = ({
  conflict,
  onResolve,
  onClose,
}) => {
  const lines = useMemo(
    () => diffLines(conflict.localNote.content, conflict.diskNote?.content ?? ''),
    [conflict.localNote.content, conflict.diskNote?.content]
  );

  const removedCount = lines.filter((line) => line.type === 'removed').length;
  const addedCount = lines.filter((line) => line.type === 'added').length;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-editor)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-editor)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Review conflicts in ${conflict.title}`}
      >
        <header className="flex items-center justify-between gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--border-color)' }}>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{conflict.title}</h2>
            <p className="text-sm opacity-70">
              This note changed in AmNote and on disk. {removedCount} removed · {addedCount} added
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-2 hover:bg-black/5 dark:hover:bg-white/10">
            ✕
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-2 divide-x overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
          <DiffPane title="AmNote version" note={conflict.localNote} selectedType="removed" lines={lines} />
          <DiffPane title="Disk version" note={conflict.diskNote} selectedType="added" lines={lines} />
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t px-5 py-4" style={{ borderColor: 'var(--border-color)' }}>
          <button
            type="button"
            onClick={() => onResolve('local')}
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-white dark:text-black"
          >
            Keep AmNote version
          </button>
          <button
            type="button"
            onClick={() => onResolve('disk')}
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-white dark:text-black"
          >
            Keep disk version
          </button>
          {conflict.diskNote && (
            <button
              type="button"
              onClick={() => onResolve('both')}
              className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
            >
              Keep both
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

interface DiffPaneProps {
  title: string;
  note?: Note;
  selectedType: 'added' | 'removed';
  lines: ReturnType<typeof diffLines>;
}

const DiffPane: React.FC<DiffPaneProps> = ({ title, note, selectedType, lines }) => (
  <section className="flex min-h-0 flex-col">
    <header className="border-b px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-color)' }}>
      <div className="truncate">{title}</div>
      <div className="text-xs opacity-60">{note ? new Date(note.updatedAt).toLocaleString() : 'Missing from disk'}</div>
    </header>
    <div className="min-h-0 flex-1 overflow-auto font-mono text-xs leading-5">
      {lines.map((line, index) => {
        const isRelevant = line.type === selectedType || line.type === 'equal';
        const background = line.type === 'removed'
          ? 'rgba(220, 38, 38, 0.14)'
          : line.type === 'added'
            ? 'rgba(22, 163, 74, 0.14)'
            : 'transparent';

        return (
          <div key={`${line.type}-${index}`} className="flex" style={{ backgroundColor: background, opacity: isRelevant ? 1 : 0.55 }}>
            <span className="w-12 shrink-0 select-none px-2 text-right opacity-45">
              {selectedType === 'removed' ? line.leftNumber ?? '' : line.rightNumber ?? ''}
            </span>
            <pre className="m-0 min-w-0 flex-1 overflow-hidden whitespace-pre-wrap break-words px-2">{line.text || ' '}</pre>
          </div>
        );
      })}
    </div>
  </section>
);
