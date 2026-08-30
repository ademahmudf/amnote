import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useSettingsStore } from '../../store/useSettingsStore';

export interface TagOptions {
  HTMLAttributes: Record<string, any>;
  onTagClick?: (tag: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tag: {
      setTag: (attributes: { tag: string }) => ReturnType;
      toggleTag: (attributes: { tag: string }) => ReturnType;
      unsetTag: () => ReturnType;
    };
  }
}

export const TagMark = Mark.create<TagOptions>({
  name: 'tag',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      tag: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-tag'),
        renderHTML: (attributes) => {
          if (!attributes.tag) {
            return {};
          }
          return {
            'data-tag': attributes.tag,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-tag]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'am-tag-pill bear-tag-pill',
      }),
      0,
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('liveTagDecorations'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const { doc } = state;
            const { tagColors } = useSettingsStore.getState();

            doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                // 1. Spaced tags: #[[tag name]]#
                const spacedRegex = /#\[\[([^\]]+)\]\]#/g;
                let match: RegExpExecArray | null;
                while ((match = spacedRegex.exec(node.text)) !== null) {
                  const from = pos + match.index;
                  const to = from + match[0].length;
                  const cleanTag = match[1].trim().toLowerCase().replace(/\s+/g, '-');
                  const customColor = tagColors[cleanTag];

                  decorations.push(
                    Decoration.inline(from, to, {
                      class: 'am-tag-pill bear-tag-pill',
                      'data-tag': cleanTag,
                      style: customColor
                        ? `background-color: ${customColor}22; color: ${customColor}; border: 1px solid ${customColor}40; border-radius: 6px; padding: 0.1em 0.35em;`
                        : 'background-color: var(--color-tag-bg); color: var(--color-tag-text); border-radius: 6px; padding: 0.1em 0.35em;',
                    })
                  );
                }

                // 2. Standard nested tags: #tag or #category/subcategory
                const tagRegex = /(?:^|\s)(#([a-zA-Z0-9_\-\/]+))(?=\s|$|[.,!?;:])/g;
                while ((match = tagRegex.exec(node.text)) !== null) {
                  const fullMatch = match[1];
                  const tagBody = match[2];
                  // Do not match numeric-only or leading slash
                  if (/^\d+$/.test(tagBody) || tagBody.startsWith('/')) continue;

                  const startOffset = match.index + (match[0].length - fullMatch.length);
                  const from = pos + startOffset;
                  const to = from + fullMatch.length;
                  const cleanTag = tagBody.toLowerCase();
                  const customColor = tagColors[cleanTag];

                  decorations.push(
                    Decoration.inline(from, to, {
                      class: 'am-tag-pill bear-tag-pill',
                      'data-tag': cleanTag,
                      style: customColor
                        ? `background-color: ${customColor}22; color: ${customColor}; border: 1px solid ${customColor}40; border-radius: 6px; padding: 0.1em 0.35em;`
                        : 'background-color: var(--color-tag-bg); color: var(--color-tag-text); border-radius: 6px; padding: 0.1em 0.35em;',
                    })
                  );
                }
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
