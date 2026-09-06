import React from 'react';
import type { Editor } from '@tiptap/react';
import { BubbleToolbar } from './BubbleToolbar';
import { SlashCommandMenu } from './SlashCommandMenu';
import { WikiLinkMenu } from './WikiLinkMenu';
import { EditorDatePicker } from './EditorDatePicker';
import type { useEditorSuggestions } from '../hooks/useEditorSuggestions';

export interface EditorSuggestionsProps {
  editor: Editor | null;
  isUnlocked: boolean;
  suggestions: ReturnType<typeof useEditorSuggestions>;
}

export const EditorSuggestions: React.FC<EditorSuggestionsProps> = ({
  editor,
  isUnlocked,
  suggestions,
}) => {
  if (!editor || !isUnlocked) return null;

  const {
    isSlashOpen,
    slashQuery,
    menuPosition,
    closeSlash,
    isWikiMenuOpen,
    wikiQuery,
    wikiPosition,
    closeWiki,
    showBubbleMenu,
    bubblePosition,
    editorDatePicker,
    closeDatePicker,
    requestDatePicker,
  } = suggestions;

  return (
    <>
      {/* Floating Bubble Toolbar on selection */}
      {showBubbleMenu && (
        <div
          className="fixed z-40"
          style={{ top: `${bubblePosition.top}px`, left: `${bubblePosition.left}px` }}
        >
          <BubbleToolbar
            editor={editor}
            onRequestTaskDue={() => requestDatePicker(editor, 'task-due')}
          />
        </div>
      )}

      {/* Slash Command Popover */}
      {isSlashOpen && (
        <div
          className="fixed z-50"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
        >
          <SlashCommandMenu
            editor={editor}
            isOpen={isSlashOpen}
            onClose={closeSlash}
            query={slashQuery}
            onRequestDatePicker={(mode) => requestDatePicker(editor, mode)}
          />
        </div>
      )}

      {/* Date Picker Popover */}
      {editorDatePicker && (
        <EditorDatePicker
          editor={editor}
          mode={editorDatePicker.mode}
          position={editorDatePicker.position}
          taskDueTarget={editorDatePicker.target}
          canClear={editorDatePicker.canClear}
          onClose={closeDatePicker}
        />
      )}

      {/* Wiki Link Note Autocomplete Popover */}
      {isWikiMenuOpen && (
        <WikiLinkMenu
          editor={editor}
          isOpen={isWikiMenuOpen}
          onClose={closeWiki}
          query={wikiQuery}
          position={wikiPosition}
        />
      )}
    </>
  );
};
