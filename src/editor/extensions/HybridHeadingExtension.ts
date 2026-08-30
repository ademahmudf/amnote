import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const HybridHeadingExtension = Extension.create({
  name: 'hybridHeading',

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;

        const parent = $from.parent;
        if (parent.type.name === 'heading') {
          // If at the very beginning of heading text
          if ($from.parentOffset === 0) {
            const currentLevel = parent.attrs.level || 1;
            if (currentLevel > 1) {
              return this.editor.commands.setHeading({ level: (currentLevel - 1) as any });
            } else {
              return this.editor.commands.setParagraph();
            }
          }
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey('hybridHeadingDecorations'),
        state: {
          init(_, state) {
            return state.selection;
          },
          apply(tr, value) {
            if (tr.docChanged || tr.selectionSet) {
              return tr.selection;
            }
            return value;
          },
        },
        props: {
          handleTextInput(view, _from, _to, text) {
            const { state } = view;
            const { $from } = state.selection;
            const parent = $from.parent;

            // If typing '#' at the very start of a heading, increase its level
            if (parent.type.name === 'heading' && $from.parentOffset === 0 && text === '#') {
              const currentLevel = parent.attrs.level || 1;
              if (currentLevel < 6) {
                editor.commands.setHeading({ level: (currentLevel + 1) as any });
                return true;
              }
            }

            return false;
          },

          decorations(state) {
            const decorations: Decoration[] = [];
            const { doc, selection } = state;
            const activePos = selection.from;

            doc.descendants((node, pos) => {
              if (node.type.name === 'heading') {
                const level = node.attrs.level || 1;
                const nodeStart = pos;
                const nodeEnd = pos + node.nodeSize;
                const isActive = activePos >= nodeStart && activePos <= nodeEnd;
                const hashes = '#'.repeat(level);

                const createPrefixWidget = () => {
                  const span = document.createElement('span');
                  span.className = `bear-heading-prefix ${
                    isActive ? 'is-active' : 'is-inactive'
                  }`;
                  span.setAttribute('data-heading-level', String(level));
                  span.setAttribute('title', `Heading ${level} (Click to switch level: H1→H2→H3→P)`);
                  span.textContent = `${hashes} `;

                  // Click to cycle level
                  span.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (level < 3) {
                      editor.chain().focus(nodeStart + 1).setHeading({ level: (level + 1) as any }).run();
                    } else if (level === 3) {
                      editor.chain().focus(nodeStart + 1).setParagraph().run();
                    } else {
                      editor.chain().focus(nodeStart + 1).setHeading({ level: 1 }).run();
                    }
                  };

                  return span;
                };

                decorations.push(Decoration.widget(nodeStart + 1, createPrefixWidget, { side: -1 }));
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
