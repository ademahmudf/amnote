import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import type { Note } from '../../types/note';
import { markdownToHtml } from '../utils/markdownConverter';

interface UseEditorContentLifecycleOptions {
  editor: Editor | null;
  activeNote?: Note;
  isUnlocked: boolean;
  editorReloadToken: number;
}

export function useEditorContentLifecycle({
  editor,
  activeNote,
  isUnlocked,
  editorReloadToken,
}: UseEditorContentLifecycleOptions) {
  const lastLoadedEditorRef = useRef<unknown>(null);
  const lastLoadedNoteIdRef = useRef<string | null>(null);
  const lastUnlockedRef = useRef(true);
  const editorReloadTokenRef = useRef(0);
  const isInternalUpdatingRef = useRef(false);

  useEffect(() => {
    if (!editor || !activeNote) return;

    const editorInstanceChanged = lastLoadedEditorRef.current !== editor;
    const noteIdChanged = lastLoadedNoteIdRef.current !== activeNote.id;
    const justUnlocked = !lastUnlockedRef.current && isUnlocked;
    const externalReloadRequested = editorReloadTokenRef.current !== editorReloadToken;
    lastUnlockedRef.current = isUnlocked;
    editorReloadTokenRef.current = editorReloadToken;

    if (editorInstanceChanged || noteIdChanged || justUnlocked || externalReloadRequested) {
      lastLoadedEditorRef.current = editor;
      lastLoadedNoteIdRef.current = activeNote.id;
      isInternalUpdatingRef.current = true;
      editor.commands.setContent(markdownToHtml(activeNote.content), { emitUpdate: false });
      isInternalUpdatingRef.current = false;

      if (noteIdChanged) {
        window.setTimeout(() => {
          if (editor.isDestroyed) return;
          const firstNode = editor.state.doc.firstChild;
          if (firstNode?.type.name === 'heading' && firstNode.attrs.level === 1) {
            const titleText = firstNode.textContent.trim();
            if (titleText === 'New Note' || titleText === 'Untitled') {
              const end = 1 + firstNode.textContent.length;
              editor.chain().focus().setTextSelection({ from: 1, to: end }).run();
            }
          }
        }, 30);
      }
    }
  }, [activeNote, editor, editorReloadToken, isUnlocked]);

  return { isInternalUpdatingRef };
}
