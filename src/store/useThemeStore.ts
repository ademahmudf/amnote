import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEMES } from '../themes/themeDefinitions';
import type { ThemeColors, ThemeId } from '../types/note';

interface ThemeState {
  themeId: ThemeId;
  customOmarchyThemeName?: string;
  setTheme: (themeId: ThemeId) => void;
  getThemeColors: () => ThemeColors;
  resetToDefault: () => void;
  toggleDarkLight: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeId: 'red-graphite',
      customOmarchyThemeName: 'One Piece',

      getThemeColors: () => {
        const { themeId } = get();
        return THEMES[themeId] || THEMES['red-graphite'];
      },

      setTheme: (themeId: ThemeId) => {
        set({ themeId });
        const theme = THEMES[themeId] || THEMES['red-graphite'];
        applyThemeCssVariables(theme);
      },

      resetToDefault: () => {
        set({ themeId: 'red-graphite' });
        applyThemeCssVariables(THEMES['red-graphite']);
      },

      toggleDarkLight: () => {
        const current = get().getThemeColors();
        if (current.id === 'red-graphite') {
          get().setTheme('red-graphite-light');
        } else if (current.id === 'red-graphite-light') {
          get().setTheme('red-graphite');
        } else if (current.id === 'catppuccin-mocha') {
          get().setTheme('catppuccin-latte');
        } else if (current.id === 'catppuccin-latte') {
          get().setTheme('catppuccin-mocha');
        } else if (current.id === 'solarized-dark') {
          get().setTheme('solarized-light');
        } else if (current.id === 'solarized-light') {
          get().setTheme('solarized-dark');
        } else if (current.id === 'gruvbox-dark') {
          get().setTheme('gruvbox-light');
        } else if (current.id === 'gruvbox-light') {
          get().setTheme('gruvbox-dark');
        } else if (current.id === 'everforest-dark') {
          get().setTheme('everforest-light');
        } else if (current.id === 'everforest-light') {
          get().setTheme('everforest-dark');
        } else if (current.id === 'github-dark') {
          get().setTheme('github-light');
        } else if (current.id === 'github-light') {
          get().setTheme('github-dark');
        } else if (current.id === 'rose-pine') {
          get().setTheme('rose-pine-dawn');
        } else if (current.id === 'rose-pine-dawn') {
          get().setTheme('rose-pine');
        } else {
          get().setTheme(current.isDark ? 'red-graphite-light' : 'red-graphite');
        }
      },
    }),
    {
      name: 'amnote-theme-storage',
    }
  )
);

export function applyThemeCssVariables(theme: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty('--bg-sidebar', theme.sidebarBg);
  root.style.setProperty('--text-sidebar', theme.sidebarText);
  root.style.setProperty('--text-sidebar-active', theme.sidebarTextActive);
  root.style.setProperty('--hover-sidebar', theme.sidebarHover);
  root.style.setProperty('--active-sidebar-bg', theme.sidebarActiveBg);
  root.style.setProperty('--active-sidebar-border', theme.sidebarActiveBorder);

  root.style.setProperty('--bg-notelist', theme.noteListBg);
  root.style.setProperty('--text-notelist', theme.noteListText);
  root.style.setProperty('--card-notelist-bg', theme.noteListCardBg);
  root.style.setProperty('--card-notelist-hover', theme.noteListCardHover);
  root.style.setProperty('--card-notelist-active', theme.noteListCardActive);
  root.style.setProperty('--card-notelist-border', theme.noteListCardBorder);

  root.style.setProperty('--bg-editor', theme.editorBg);
  root.style.setProperty('--text-editor', theme.editorText);
  root.style.setProperty('--text-editor-muted', theme.editorTextMuted);

  root.style.setProperty('--color-accent', theme.accent);
  root.style.setProperty('--color-accent-hover', theme.accentHover);
  root.style.setProperty('--color-accent-text', theme.accentText);

  root.style.setProperty('--color-border', theme.border);
  root.style.setProperty('--color-divider', theme.divider);
  root.style.setProperty('--color-code-bg', theme.codeBg);
  root.style.setProperty('--color-tag-bg', theme.tagBg);
  root.style.setProperty('--color-tag-text', theme.tagText);

  root.style.setProperty('--callout-note-bg', theme.calloutNoteBg);
  root.style.setProperty('--callout-tip-bg', theme.calloutTipBg);
  root.style.setProperty('--callout-warn-bg', theme.calloutWarnBg);

  if (theme.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
