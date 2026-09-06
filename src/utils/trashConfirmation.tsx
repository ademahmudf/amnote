import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { notify } from '../store/useNotificationStore';
import { useNoteStore } from '../store/useNoteStore';
import { useUIStore } from '../store/useUIStore';

export const promptEmptyTrashConfirmation = () => {
  const { notes } = useNoteStore.getState();
  const trashedCount = notes.filter((n) => n.isTrashed).length;
  if (trashedCount === 0) return;
  useUIStore.getState().setEmptyTrashModalOpen(true);
};

export const promptDeletePermanentlyConfirmation = (note: { id: string; title: string }) => {
  const { deletePermanently } = useNoteStore.getState();
  const noteTitle = note.title.trim() || 'Untitled Note';

  notify({
    id: `confirm-delete-${note.id}`,
    title: 'Delete Permanently',
    sender: noteTitle,
    message: 'Permanently remove this note from your vault? This cannot be undone.',
    type: 'warning',
    icon: React.createElement(Trash2, { size: 18, className: 'text-rose-500' }),
    durationMs: 10000,
    action: {
      label: 'Delete Forever',
      variant: 'danger',
      onClick: async () => {
        await deletePermanently(note.id);
        notify({
          title: 'Note Deleted',
          sender: noteTitle,
          message: 'Note permanently removed from your vault.',
          type: 'success',
          durationMs: 3500,
        });
      },
    },
    cancelAction: {
      label: 'Cancel',
    },
  });
};
