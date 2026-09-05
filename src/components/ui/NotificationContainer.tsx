import React, { useState } from 'react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useNoteStore } from '../../store/useNoteStore';
import { AppleNotificationBanner } from './AppleNotificationBanner';
import { GitCompare } from 'lucide-react';

interface NotificationContainerProps {
  onReviewConflict?: (noteId: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({ onReviewConflict }) => {
  const notification = useNotificationStore((state) => state.notification);
  const dismissNotification = useNotificationStore((state) => state.dismissNotification);
  const vaultConflicts = useNoteStore((state) => state.vaultConflicts);
  const persistenceError = useNoteStore((state) => state.persistenceError);
  const clearPersistenceError = useNoteStore((state) => state.clearPersistenceError);

  const [dismissedConflictIds, setDismissedConflictIds] = useState<Record<string, boolean>>({});

  const activeConflicts = vaultConflicts.filter((c) => !dismissedConflictIds[c.noteId]);

  const hasAny = Boolean(notification || persistenceError || activeConflicts.length > 0);
  if (!hasAny) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-12 right-6 z-50 pointer-events-none flex flex-col items-end gap-3"
    >
      {/* Persistence / Storage Error Banner */}
      {persistenceError && (
        <div className="pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200">
          <AppleNotificationBanner
            title="Storage Error"
            sender="Persistence"
            message={persistenceError}
            type="error"
            onDismiss={clearPersistenceError}
          />
        </div>
      )}

      {/* Sync Conflict Banners */}
      {activeConflicts.map((conflict) => (
        <div
          key={conflict.noteId}
          className="pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <AppleNotificationBanner
            title="Sync Conflict"
            sender={conflict.title}
            message="Changed in AmNote and on disk. Choose which version to keep."
            type="warning"
            icon={<GitCompare size={18} className="text-amber-500" />}
            action={
              onReviewConflict
                ? {
                    label: 'Review Changes',
                    onClick: () => onReviewConflict(conflict.noteId),
                  }
                : undefined
            }
            onDismiss={() => {
              setDismissedConflictIds((prev) => ({ ...prev, [conflict.noteId]: true }));
            }}
          />
        </div>
      ))}

      {/* Standard Notification Toast */}
      {notification && (
        <div className="pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200">
          <AppleNotificationBanner
            key={notification.id}
            title={notification.title ?? 'AmNote'}
            sender={notification.sender}
            message={notification.message}
            time={notification.time ?? 'now'}
            type={notification.type}
            icon={notification.icon}
            action={
              notification.action
                ? {
                    label: notification.action.label,
                    onClick: () => {
                      notification.action?.onClick();
                      dismissNotification();
                    },
                  }
                : undefined
            }
            onDismiss={dismissNotification}
          />
        </div>
      )}
    </div>
  );
};
