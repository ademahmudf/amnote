import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

export const AutoCapitalizeTitle = Extension.create({
  name: 'autoCapitalizeTitle',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('autoCapitalizeTitle'),
        props: {
          handleTextInput(view, from, to, text) {
            const { state, dispatch } = view;
            const { $from } = state.selection;
            const parent = $from.parent;

            // Check if we are typing inside a heading or at the start of any line
            const textBefore = parent.textBetween(0, $from.parentOffset);

            // If starting a line/heading (no text before or only whitespace) and typing a single character
            if (textBefore.trim().length === 0 && text.length === 1) {
              const upper = text.toUpperCase();
              if (upper !== text) {
                const tr = state.tr.insertText(upper, from, to);
                dispatch(tr);
                return true;
              }
            }

            return false;
          },

          handleClick(view, pos) {
            const { state, dispatch } = view;
            const $pos = state.doc.resolve(pos);
            const parent = $pos.parent;

            // If user clicks the H1 heading and it contains "New Note" or "Untitled"
            if (parent.type.name === 'heading' && parent.attrs.level === 1) {
              const headingText = parent.textContent.trim();
              if (headingText === 'New Note' || headingText === 'Untitled') {
                const startPos = $pos.start();
                const endPos = $pos.end();
                if (startPos < endPos) {
                  const tr = state.tr.setSelection(TextSelection.create(state.doc, startPos, endPos));
                  dispatch(tr);
                  return true;
                }
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});
