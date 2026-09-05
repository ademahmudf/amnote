import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { vaultAdapter } from '../db/vaultAdapter';
import type { TagMetadataMap } from '../types/note';
import {
  buildTagMetadataUpdate,
  extractFlatTagColors,
  extractFlatTagIcons,
  mergeTagMetadataMaps,
  seedTagMetadataFromFlat,
} from '../domain/tagMetadata';

import type { FontFamily } from '../domain/fontFamilies';
export type { FontFamily };
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
  focusMode: boolean; // iA Writer style focus mode (dims inactive content)
  focusModeType: 'sentence' | 'paragraph'; // Focus scope: sentence or paragraph
  wordGoal: number; // Daily / session word count goal (0 = disabled)
  defaultHighlightColor: string; // Custom default text highlight color
  revealMarkdownOnFocus: boolean;
  spellCheck: boolean;
  showWordCount: boolean;
  autoSaveDelayMs: number;
  
  // Custom Tag Icons & Colors & Sync Metadata
  tagIcons: Record<string, string>;
  tagColors: Record<string, string>;
  tagMetadata: TagMetadataMap;
  tagsSectionExpanded: boolean; // Sidebar tags section collapsed/expanded (default false/minimized)
  
  setFontFamily: (font: FontFamily) => void;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number | 'normal' | 'relaxed' | 'loose') => void;
  setEditorWidth: (width: EditorWidth) => void;
  setParagraphSpacing: (spacing: number) => void;
  setParagraphIndent: (indent: number) => void;
  setUiScale: (scale: UiScale) => void;
  setPreviewLines: (lines: number) => void;
  setTypewriterMode: (enabled: boolean) => void;
  setFocusMode: (enabled: boolean) => void;
  setFocusModeType: (type: 'sentence' | 'paragraph') => void;
  setWordGoal: (goal: number) => void;
  setDefaultHighlightColor: (color: string) => void;
  setRevealMarkdownOnFocus: (reveal: boolean) => void;
  setSpellCheck: (enabled: boolean) => void;
  setShowWordCount: (show: boolean) => void;
  setTagsSectionExpanded: (expanded: boolean) => void;
  setTagIcon: (tag: string, iconName: string | null) => void;
  setTagColor: (tag: string, color: string | null) => void;
  applyRemoteTagMetadata: (remoteTags: TagMetadataMap) => Promise<void>;
  initTagSync: (remoteTags: TagMetadataMap) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontFamily: 'bear-sans',
      fontSize: 16,
      lineHeight: 1.35,
      editorWidth: 'comfort',
      paragraphSpacing: 8,
      paragraphIndent: 0,
      uiScale: 'comfortable',
      previewLines: 2,
      typewriterMode: false,
      focusMode: false,
      focusModeType: 'sentence',
      wordGoal: 0,
      defaultHighlightColor: '#fef08a',
      revealMarkdownOnFocus: true,
      spellCheck: true,
      showWordCount: true,
      autoSaveDelayMs: 300,
      tagIcons: {},
      tagColors: {},
      tagMetadata: {},
      tagsSectionExpanded: false,

      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setEditorWidth: (editorWidth) => set({ editorWidth }),
      setParagraphSpacing: (paragraphSpacing) => set({ paragraphSpacing }),
      setParagraphIndent: (paragraphIndent) => set({ paragraphIndent }),
      setUiScale: (uiScale) => set({ uiScale }),
      setPreviewLines: (previewLines) => set({ previewLines }),
      setTypewriterMode: (typewriterMode) => set({ typewriterMode }),
      setFocusMode: (focusMode) => set({ focusMode }),
      setFocusModeType: (focusModeType) => set({ focusModeType }),
      setWordGoal: (wordGoal) => set({ wordGoal }),
      setDefaultHighlightColor: (defaultHighlightColor) => set({ defaultHighlightColor }),
      setRevealMarkdownOnFocus: (revealMarkdownOnFocus) => set({ revealMarkdownOnFocus }),
      setSpellCheck: (spellCheck) => set({ spellCheck }),
      setShowWordCount: (showWordCount) => set({ showWordCount }),
      setTagsSectionExpanded: (tagsSectionExpanded) => set({ tagsSectionExpanded }),
      setTagIcon: (tag, iconName) => {
        let nextMetadata: TagMetadataMap = {};
        set((state) => {
          const currentMeta = Object.keys(state.tagMetadata).length > 0
            ? state.tagMetadata
            : seedTagMetadataFromFlat(state.tagIcons, state.tagColors);
          nextMetadata = buildTagMetadataUpdate(tag, currentMeta, { icon: iconName });
          const nextIcons = extractFlatTagIcons(nextMetadata);
          return {
            tagMetadata: nextMetadata,
            tagIcons: nextIcons,
          };
        });
        void vaultAdapter.saveTagMetadata(nextMetadata).catch((err) => {
          console.warn('Failed to sync tag icon to vault:', err);
        });
      },
      setTagColor: (tag, color) => {
        let nextMetadata: TagMetadataMap = {};
        set((state) => {
          const currentMeta = Object.keys(state.tagMetadata).length > 0
            ? state.tagMetadata
            : seedTagMetadataFromFlat(state.tagIcons, state.tagColors);
          nextMetadata = buildTagMetadataUpdate(tag, currentMeta, { color });
          const nextColors = extractFlatTagColors(nextMetadata);
          return {
            tagMetadata: nextMetadata,
            tagColors: nextColors,
          };
        });
        void vaultAdapter.saveTagMetadata(nextMetadata).catch((err) => {
          console.warn('Failed to sync tag color to vault:', err);
        });
      },
      applyRemoteTagMetadata: async (remoteTags) => {
        set((state) => {
          const localMeta = Object.keys(state.tagMetadata).length > 0
            ? state.tagMetadata
            : seedTagMetadataFromFlat(state.tagIcons, state.tagColors);
          const mergedMetadata = mergeTagMetadataMaps(localMeta, remoteTags);
          return {
            tagMetadata: mergedMetadata,
            tagIcons: extractFlatTagIcons(mergedMetadata),
            tagColors: extractFlatTagColors(mergedMetadata),
          };
        });
      },
      initTagSync: async (remoteTags) => {
        const hasRemoteTags = Object.keys(remoteTags).length > 0;
        let mergedMetadata: TagMetadataMap = {};
        let needsSave = false;

        set((state) => {
          const localMeta = Object.keys(state.tagMetadata).length > 0
            ? state.tagMetadata
            : seedTagMetadataFromFlat(state.tagIcons, state.tagColors);
          const hasLocalTags = Object.keys(localMeta).length > 0;

          if (!hasRemoteTags && hasLocalTags) {
            // First run on fresh vault: seed vault from legacy localStorage
            mergedMetadata = localMeta;
            needsSave = true;
          } else {
            mergedMetadata = mergeTagMetadataMaps(localMeta, remoteTags);
            if (JSON.stringify(mergedMetadata) !== JSON.stringify(remoteTags)) {
              needsSave = true;
            }
          }

          return {
            tagMetadata: mergedMetadata,
            tagIcons: extractFlatTagIcons(mergedMetadata),
            tagColors: extractFlatTagColors(mergedMetadata),
          };
        });

        if (needsSave) {
          await vaultAdapter.saveTagMetadata(mergedMetadata).catch((err) => {
            console.warn('Failed to seed tag metadata to vault:', err);
          });
        }
      },
    }),
    {
      name: 'amnote-settings-storage',
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<SettingsState> | undefined;
        if (version < 2 && state) {
          if (state.lineHeight === 1.65) {
            state.lineHeight = 1.35;
          }
        }
        return state as SettingsState;
      },
    }
  )
);
