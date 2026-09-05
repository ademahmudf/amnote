import { create } from 'zustand';
import type React from 'react';
import type { NotificationType } from '../components/ui/AppleNotificationBanner';

export interface NotificationPayload {
  id?: string;
  title?: string;
  sender?: string;
  message: string;
  time?: string;
  type?: NotificationType;
  icon?: React.ReactNode;
  durationMs?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationStore {
  notification: (NotificationPayload & { id: string }) | null;
  showNotification: (payload: NotificationPayload) => void;
  dismissNotification: () => void;
}

let timerId: ReturnType<typeof setTimeout> | null = null;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notification: null,

  showNotification: (payload) => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }

    const id = payload.id || `notif-${Date.now()}`;
    const duration = payload.durationMs ?? 3200;

    set({
      notification: {
        ...payload,
        id,
        time: payload.time ?? 'now',
      },
    });

    if (duration > 0) {
      timerId = setTimeout(() => {
        get().dismissNotification();
      }, duration);
    }
  },

  dismissNotification: () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    set({ notification: null });
  },
}));

// Quick convenience helper for any file without needing to hook into React state
export const notify = (payload: NotificationPayload) => {
  useNotificationStore.getState().showNotification(payload);
};
