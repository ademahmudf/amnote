import React, { useEffect, useState } from 'react';
import { useNoteStore } from '../../store/useNoteStore';
import { notify } from '../../store/useNotificationStore';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

export const EmptyTrashModal: React.FC = () => {
  const isEmptyTrashModalOpen = useNoteStore((state) => state.isEmptyTrashModalOpen);
  const setEmptyTrashModalOpen = useNoteStore((state) => state.setEmptyTrashModalOpen);
  const emptyTrash = useNoteStore((state) => state.emptyTrash);
  const notes = useNoteStore((state) => state.notes);

  const [isDeleting, setIsDeleting] = useState(false);

  const trashedCount = notes.filter((n) => n.isTrashed).length;

  useEffect(() => {
    if (!isEmptyTrashModalOpen) {
      setIsDeleting(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        setEmptyTrashModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEmptyTrashModalOpen, isDeleting, setEmptyTrashModalOpen]);

  if (!isEmptyTrashModalOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await emptyTrash();
      setEmptyTrashModalOpen(false);
      notify({
        title: 'Trash Emptied',
        sender: 'Trash',
        message: `Permanently removed ${trashedCount} ${trashedCount === 1 ? 'note' : 'notes'}.`,
        type: 'success',
        durationMs: 3500,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => {
        if (!isDeleting) setEmptyTrashModalOpen(false);
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden p-6 animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card-notelist-bg)',
          borderColor: 'var(--color-border)',
          color: 'var(--text-editor)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="empty-trash-title"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-danger) 15%, transparent)',
                color: 'var(--color-danger)',
              }}
            >
              <Trash2 size={20} />
            </div>
            <div>
              <h3 id="empty-trash-title" className="font-bold text-base">
                Empty Trash?
              </h3>
              <p className="text-xs opacity-60">Permanent action</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => setEmptyTrashModalOpen(false)}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-30 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="flex items-start gap-3 p-3 rounded-xl border text-xs mb-5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-danger) 20%, transparent)',
            color: 'var(--color-danger)',
          }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">This action cannot be undone.</p>
            <p className="opacity-90">
              {trashedCount === 1
                ? '1 note will be permanently removed from your vault.'
                : `${trashedCount} notes will be permanently removed from your vault.`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => setEmptyTrashModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-40 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            disabled={isDeleting || trashedCount === 0}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold btn-danger shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            <span>{isDeleting ? 'Emptying...' : 'Empty Trash'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
