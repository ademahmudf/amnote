import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useSettingsStore } from '../../store/useSettingsStore';

export const focusModePluginKey = new PluginKey('focusMode');

/**
 * Finds the [start, end] character range of the sentence enclosing the cursor offset within text.
 * Avoids splitting on abbreviations or decimal numbers without trailing spaces.
 */
export function findSentenceRange(text: string, offset: number): { start: number; end: number } {
  if (!text || text.trim().length === 0) {
    return { start: 0, end: 0 };
  }

  const pos = Math.max(0, Math.min(offset, text.length));
  let start = 0;
  const beforeText = text.slice(0, pos);
  const endingRegex = /(?:[.!?…]+["'\u201D\u2019)\]]*\s+)/g;
  let match: RegExpExecArray | null;

  while ((match = endingRegex.exec(beforeText)) !== null) {
    start = match.index + match[0].length;
  }

  let end = text.length;
  endingRegex.lastIndex = pos;
  const afterMatch = endingRegex.exec(text);
  if (afterMatch) {
    end = afterMatch.index + afterMatch[0].replace(/\s+$/, '').length;
  }

  return { start, end };
}

function computeDecorations(state: EditorState): DecorationSet {
  const { focusMode, focusModeType } = useSettingsStore.getState();
  if (!focusMode) {
    return DecorationSet.empty;
  }

  const { selection, doc } = state;
  const { $from, $to, empty } = selection;

  if ($from.depth < 1) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];

  // 1. Identify active root-level block (depth 1)
  const rootStart = $from.before(1);
  const rootNode = $from.node(1);
  const rootEnd = rootStart + rootNode.nodeSize;

  decorations.push(
    Decoration.node(rootStart, rootEnd, {
      class: 'am-focus-active-root',
    })
  );

  // 2. Identify nearest enclosing block (e.g. list item, task item, or paragraph)
  let blockDepth = $from.depth;
  while (blockDepth > 1 && !$from.node(blockDepth).isBlock) {
    blockDepth--;
  }

  if (blockDepth > 1) {
    const blockStart = $from.before(blockDepth);
    const blockNode = $from.node(blockDepth);
    const blockEnd = blockStart + blockNode.nodeSize;
    decorations.push(
      Decoration.node(blockStart, blockEnd, {
        class: 'am-focus-active-node',
      })
    );
  }

  // 3. Sentence-level focus mode (within active textblock)
  if (focusModeType === 'sentence') {
    const textblock = $from.parent;
    if (textblock.isTextblock) {
      const textblockStart = $from.start();
      const textblockEnd = $from.end();
      const text = textblock.textContent;

      let sentenceStart: number;
      let sentenceEnd: number;

      if (!empty && $from.sameParent($to)) {
        // When user has highlighted a specific slice, keep that range active
        sentenceStart = $from.pos;
        sentenceEnd = $to.pos;
      } else {
        const offset = $from.parentOffset;
        const { start, end } = findSentenceRange(text, offset);
        sentenceStart = textblockStart + start;
        sentenceEnd = textblockStart + end;
      }

      // Dim leading text within this textblock before the active sentence
      if (sentenceStart > textblockStart) {
        decorations.push(
          Decoration.inline(textblockStart, sentenceStart, {
            class: 'am-focus-dimmed',
          })
        );
      }

      // Highlight the active sentence at full opacity
      if (sentenceEnd > sentenceStart) {
        decorations.push(
          Decoration.inline(sentenceStart, sentenceEnd, {
            class: 'am-focus-active-sentence',
          })
        );
      }

      // Dim trailing text within this textblock after the active sentence
      if (sentenceEnd < textblockEnd) {
        decorations.push(
          Decoration.inline(sentenceEnd, textblockEnd, {
            class: 'am-focus-dimmed',
          })
        );
      }
    }
  }

  return DecorationSet.create(doc, decorations);
}

export const FocusModeExtension = Extension.create({
  name: 'focusMode',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: focusModePluginKey,

        state: {
          init(_, state) {
            return computeDecorations(state);
          },
          apply(tr, oldDecos, _oldState, newState) {
            const { focusMode } = useSettingsStore.getState();
            if (!focusMode) {
              return DecorationSet.empty;
            }

            if (tr.docChanged || tr.selectionSet || tr.getMeta(focusModePluginKey)) {
              return computeDecorations(newState);
            }

            return oldDecos.map(tr.mapping, tr.doc);
          },
        },

        props: {
          decorations(state) {
            return this.getState(state);
          },
          attributes(): Record<string, string> {
            const { focusMode, focusModeType } = useSettingsStore.getState();
            if (!focusMode) return {};
            return {
              class: `am-focus-mode am-focus-mode-${focusModeType}`,
            };
          },
        },

        view(editorView) {
          // Reactively sync when user toggles focusMode or focusModeType in store
          const unsubscribe = useSettingsStore.subscribe((state, prevState) => {
            if (
              state.focusMode !== prevState.focusMode ||
              state.focusModeType !== prevState.focusModeType
            ) {
              if (!editorView.isDestroyed) {
                editorView.dispatch(editorView.state.tr.setMeta(focusModePluginKey, true));
              }
            }
          });

          return {
            destroy() {
              unsubscribe();
            },
          };
        },
      }),
    ];
  },
});
