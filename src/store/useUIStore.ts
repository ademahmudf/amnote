import { create } from 'zustand';
import { isValidISODate, todayISO } from '../domain/calendarDates';

export interface UIState {
  // Layout toggles
  isSidebarOpen: boolean;
  isNoteListOpen: boolean;
  isFocusMode: boolean;
  isInfoDrawerOpen: boolean;
  isCommandPaletteOpen: boolean;
  isCalendarModalOpen: boolean;
  calendarSelectedDate: string;
  isSettingsOpen: boolean;
  isExportModalOpen: boolean;
  isCheatsheetOpen: boolean;
  isPasswordModalOpen: boolean;
  passwordModalNoteId: string | null;
  isEmptyTrashModalOpen: boolean;

  // Actions
  toggleSidebar: () => void;
  toggleNoteList: () => void;
  toggleFocusMode: () => void;
  toggleInfoDrawer: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setCalendarModalOpen: (open: boolean, dateIso?: string) => void;
  setCalendarSelectedDate: (dateIso: string) => void;
  setSettingsOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  setCheatsheetOpen: (open: boolean) => void;
  setPasswordModalOpen: (open: boolean, noteId?: string | null) => void;
  setEmptyTrashModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isNoteListOpen: true,
  isFocusMode: false,
  isInfoDrawerOpen: false,
  isCommandPaletteOpen: false,
  isCalendarModalOpen: false,
  calendarSelectedDate: todayISO(),
  isSettingsOpen: false,
  isExportModalOpen: false,
  isCheatsheetOpen: false,
  isPasswordModalOpen: false,
  passwordModalNoteId: null,
  isEmptyTrashModalOpen: false,

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleNoteList: () => set((state) => ({ isNoteListOpen: !state.isNoteListOpen })),
  toggleFocusMode: () =>
    set((state) => ({
      isFocusMode: !state.isFocusMode,
      isSidebarOpen: state.isFocusMode,
      isNoteListOpen: state.isFocusMode,
    })),
  toggleInfoDrawer: () => set((state) => ({ isInfoDrawerOpen: !state.isInfoDrawerOpen })),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setCalendarModalOpen: (open, dateIso) =>
    set((state) => ({
      isCalendarModalOpen: open,
      calendarSelectedDate: dateIso && isValidISODate(dateIso) ? dateIso : state.calendarSelectedDate,
    })),
  setCalendarSelectedDate: (dateIso) => {
    if (isValidISODate(dateIso)) set({ calendarSelectedDate: dateIso });
  },
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setExportModalOpen: (open) => set({ isExportModalOpen: open }),
  setCheatsheetOpen: (open) => set({ isCheatsheetOpen: open }),
  setPasswordModalOpen: (open, noteId = null) =>
    set({ isPasswordModalOpen: open, passwordModalNoteId: noteId }),
  setEmptyTrashModalOpen: (open) => set({ isEmptyTrashModalOpen: open }),
}));
