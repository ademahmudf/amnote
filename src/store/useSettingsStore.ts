import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontFamily = 'bear-sans' | 'clarika' | 'sans' | 'serif' | 'mono' | 'system';
export type EditorWidth = 'narrow' | 'comfort' | 'wide' | 'full';
export type UiScale = 'compact' | 'standard' | 'comfortable' | 'spacious';

interface SettingsState {
  fontFamily: FontFamily;
  fontSize: number; // in px, default 16
  lineHeight: number | 'normal' | 'relaxed' | 'loose'; // multiplier, default 1.65
  editorWidth: EditorWidth;
  paragraphSpacing: number; // in px, default 8
  paragraphIndent: number; // in px, default 0
  uiScale: UiScale; // Controls sidebar, note list, header font scale
  previewLines: number; // Snippet lines: 1, 2, 3, 4
  typewriterMode: boolean; // Keep cursor vertically centered
  wordGoal: number; // Daily / session word count goal (0 = disabled)
  defaultHighlightColor: string; // Custom default text highlight color
  revealMarkdownOnFocus: boolean;
  spellCheck: boolean;
  showWordCount: boolean;
  autoSaveDelayMs: number;
  
  // Custom Tag Icons & Colors
  tagIcons: Record<string, string>;
  tagColors: Record<string, string>;
  
  setFontFamily: (font: FontFamily) => void;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number | 'normal' | 'relaxed' | 'loose') => void;
  setEditorWidth: (width: EditorWidth) => void;
  setParagraphSpacing: (spacing: number) => void;
  setParagraphIndent: (indent: number) => void;
  setUiScale: (scale: UiScale) => void;
  setPreviewLines: (lines: number) => void;
  setTypewriterMode: (enabled: boolean) => void;
  setWordGoal: (goal: number) => void;
  setDefaultHighlightColor: (color: string) => void;
  setRevealMarkdownOnFocus: (reveal: boolean) => void;
  setSpellCheck: (enabled: boolean) => void;
  setShowWordCount: (show: boolean) => void;
  setTagIcon: (tag: string, iconName: string | null) => void;
  setTagColor: (tag: string, color: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontFamily: 'bear-sans',
      fontSize: 16,
      lineHeight: 1.65,
      editorWidth: 'comfort',
      paragraphSpacing: 8,
      paragraphIndent: 0,
      uiScale: 'comfortable',
      previewLines: 2,
      typewriterMode: false,
      wordGoal: 0,
      defaultHighlightColor: '#fef08a',
      revealMarkdownOnFocus: true,
      spellCheck: true,
      showWordCount: true,
      autoSaveDelayMs: 300,
      tagIcons: {},
      tagColors: {},

      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setEditorWidth: (editorWidth) => set({ editorWidth }),
      setParagraphSpacing: (paragraphSpacing) => set({ paragraphSpacing }),
      setParagraphIndent: (paragraphIndent) => set({ paragraphIndent }),
      setUiScale: (uiScale) => set({ uiScale }),
      setPreviewLines: (previewLines) => set({ previewLines }),
      setTypewriterMode: (typewriterMode) => set({ typewriterMode }),
      setWordGoal: (wordGoal) => set({ wordGoal }),
      setDefaultHighlightColor: (defaultHighlightColor) => set({ defaultHighlightColor }),
      setRevealMarkdownOnFocus: (revealMarkdownOnFocus) => set({ revealMarkdownOnFocus }),
      setSpellCheck: (spellCheck) => set({ spellCheck }),
      setShowWordCount: (showWordCount) => set({ showWordCount }),
      setTagIcon: (tag, iconName) =>
        set((state) => {
          const next = { ...state.tagIcons };
          if (iconName) {
            next[tag] = iconName;
          } else {
            delete next[tag];
          }
          return { tagIcons: next };
        }),
      setTagColor: (tag, color) =>
        set((state) => {
          const next = { ...state.tagColors };
          if (color) {
            next[tag] = color;
          } else {
            delete next[tag];
          }
          return { tagColors: next };
        }),
    }),
    {
      name: 'amnote-settings-storage',
    }
  )
);
