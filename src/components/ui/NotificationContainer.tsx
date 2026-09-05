import React from 'react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { AppleNotificationBanner } from './AppleNotificationBanner';

export const NotificationContainer: React.FC = () => {
  const notification = useNotificationStore((state) => state.notification);
  const dismissNotification = useNotificationStore((state) => state.dismissNotification);

  if (!notification) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-12 right-6 z-50 pointer-events-none flex flex-col items-end animate-in fade-in slide-in-from-top-4 duration-200"
    >
      <div className="pointer-events-auto">
        <AppleNotificationBanner
          key={notification.id}
          title={notification.title ?? 'AmNote'}
          sender={notification.sender}
          message={notification.message}
          time={notification.time ?? 'now'}
          type={notification.type}
          icon={notification.icon}
          onDismiss={dismissNotification}
        />
      </div>
    </div>
  );
};
