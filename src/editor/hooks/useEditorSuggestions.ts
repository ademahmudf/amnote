import { useState, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import type { EditorDatePickerMode } from '../components/EditorDatePicker';
import {
  getEditorTaskDueTarget,
  type TaskDueBadgeClickInfo,
  type TaskDuePickerTarget,
} from '../extensions/TaskDueExtension';
import { detectSlashCommand, detectWikiLink } from '../utils/editorTriggers';

export interface Point {
  top: number;
  left: number;
}

export interface EditorDatePickerState {
  mode: EditorDatePickerMode;
  position: { x: number; y: number };
  target?: TaskDuePickerTarget;
  canClear?: boolean;
}

export function useEditorSuggestions() {
  const [isSlashOpen, setIsSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [menuPosition, setMenuPosition] = useState<Point>({ top: 0, left: 0 });

  const [isWikiMenuOpen, setIsWikiMenuOpen] = useState(false);
  const [wikiQuery, setWikiQuery] = useState('');
  const [wikiPosition, setWikiPosition] = useState<Point>({ top: 0, left: 0 });

  const [showBubbleMenu, setShowBubbleMenu] = useState(false);
  const [bubblePosition, setBubblePosition] = useState<Point>({ top: 0, left: 0 });

  const [editorDatePicker, setEditorDatePicker] = useState<EditorDatePickerState | null>(null);

  const isSlashOpenRef = useRef(isSlashOpen);
  isSlashOpenRef.current = isSlashOpen;

  const isWikiMenuOpenRef = useRef(isWikiMenuOpen);
  isWikiMenuOpenRef.current = isWikiMenuOpen;

  const isDatePickerOpenRef = useRef(Boolean(editorDatePicker));
  isDatePickerOpenRef.current = Boolean(editorDatePicker);

  const isNavigatingMenu = useCallback(() => {
    return isSlashOpenRef.current || isWikiMenuOpenRef.current || isDatePickerOpenRef.current;
  }, []);

  const closeSlash = useCallback(() => setIsSlashOpen(false), []);
  const closeWiki = useCallback(() => setIsWikiMenuOpen(false), []);
  const closeBubble = useCallback(() => setShowBubbleMenu(false), []);
  const closeDatePicker = useCallback(() => setEditorDatePicker(null), []);

  const requestDatePicker = useCallback((editor: Editor | null, mode: EditorDatePickerMode) => {
    if (!editor || editor.isDestroyed) return;

    const coords = editor.view.coordsAtPos(editor.state.selection.from);
    const position = { x: coords.left, y: coords.bottom + 6 };
    setEditorDatePicker({
      mode,
      position,
      target:
        mode === 'task-due'
          ? getEditorTaskDueTarget(editor, position.x, position.y)
          : undefined,
      canClear: false,
    });
    setIsSlashOpen(false);
    setShowBubbleMenu(false);
  }, []);

  const openTaskDueDatePicker = useCallback((info: TaskDueBadgeClickInfo) => {
    setEditorDatePicker({
      mode: 'task-due',
      position: { x: info.x, y: info.y },
      target: info,
      canClear: true,
    });
  }, []);

  const handleEditorUpdate = useCallback((currentEditor: Editor) => {
    const { selection } = currentEditor.state;
    const { $from } = selection;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');

    // 1. Check slash commands
    const slashMatch = detectSlashCommand(textBefore);
    if (slashMatch) {
      const coords = currentEditor.view.coordsAtPos(selection.from);
      setMenuPosition({ top: coords.bottom + 8, left: coords.left });
      setSlashQuery(slashMatch.query);
      setIsSlashOpen(true);
    } else {
      setIsSlashOpen(false);
    }

    // 2. Check wiki link autocomplete
    const wikiMatch = detectWikiLink(textBefore);
    if (wikiMatch) {
      const coords = currentEditor.view.coordsAtPos(selection.from);
      setWikiPosition({ top: coords.bottom + 8, left: coords.left });
      setWikiQuery(wikiMatch.query);
      setIsWikiMenuOpen(true);
    } else {
      setIsWikiMenuOpen(false);
    }
  }, []);

  const handleSelectionUpdate = useCallback((currentEditor: Editor) => {
    const { from, to } = currentEditor.state.selection;
    if (from !== to) {
      const coords = currentEditor.view.coordsAtPos(from);
      setBubblePosition({
        top: Math.max(10, coords.top - 48),
        left: Math.max(20, Math.min(window.innerWidth - 650, coords.left)),
      });
      setShowBubbleMenu(true);
    } else {
      setShowBubbleMenu(false);
    }
  }, []);

  return {
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
    closeBubble,
    editorDatePicker,
    closeDatePicker,
    requestDatePicker,
    openTaskDueDatePicker,
    isNavigatingMenu,
    handleEditorUpdate,
    handleSelectionUpdate,
  };
}
