import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getTagIconDataUrl } from '../../utils/tagIcons';

export interface TagOptions {
  HTMLAttributes: Record<string, any>;
  onTagClick?: (tag: string) => void;
}

export const TagExtension = Extension.create<TagOptions>({
  name: 'tag',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('liveTagDecorations'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const { doc } = state;
            const { tagColors, tagIcons } = useSettingsStore.getState();

            doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                // 1. Spaced tags: #[[tag name]]#
                const spacedRegex = /#\[\[([^\]]+)\]\]#/g;
                let match: RegExpExecArray | null;
                while ((match = spacedRegex.exec(node.text)) !== null) {
                  const from = pos + match.index;
                  const to = from + match[0].length;
                  const rawTag = match[1].trim();
                  const cleanTag = rawTag.toLowerCase().replace(/\s+/g, '-');
                  const customIcon = tagIcons[cleanTag] || tagIcons[rawTag];
                  const customColor = tagColors[cleanTag] || tagColors[rawTag];
                  const iconUrl = getTagIconDataUrl(cleanTag, customIcon);

                  const styleProps = [
                    `--tag-icon: url('${iconUrl}')`,
                    customColor ? `background-color: ${customColor}20` : undefined,
                    customColor ? `color: ${customColor}` : undefined,
                  ]
                    .filter(Boolean)
                    .join('; ');

                  // Outer tag pill includes icon via ::before and text together
                  decorations.push(
                    Decoration.inline(from, to, {
                      class: 'am-tag-pill bear-tag-pill',
                      'data-tag': cleanTag,
                      style: styleProps,
                    })
                  );

                  // Hide opening '#[['
                  decorations.push(
                    Decoration.inline(from, from + 3, {
                      class: 'am-tag-hash-hidden',
                    })
                  );

                  // Hide closing ']]#'
                  decorations.push(
                    Decoration.inline(to - 3, to, {
                      class: 'am-tag-hash-hidden',
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
                  const leafSegment = cleanTag.includes('/') ? cleanTag.split('/').pop()! : cleanTag;
                  const customIcon = tagIcons[cleanTag] || tagIcons[leafSegment];
                  const customColor = tagColors[cleanTag] || tagColors[leafSegment];
                  const iconUrl = getTagIconDataUrl(cleanTag, customIcon);

                  const styleProps = [
                    `--tag-icon: url('${iconUrl}')`,
                    customColor ? `background-color: ${customColor}20` : undefined,
                    customColor ? `color: ${customColor}` : undefined,
                  ]
                    .filter(Boolean)
                    .join('; ');

                  // Outer tag pill includes icon via ::before and text together
                  decorations.push(
                    Decoration.inline(from, to, {
                      class: 'am-tag-pill bear-tag-pill',
                      'data-tag': cleanTag,
                      style: styleProps,
                    })
                  );

                  // Hide '#' symbol
                  decorations.push(
                    Decoration.inline(from, from + 1, {
                      class: 'am-tag-hash-hidden',
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

export const TagMark = TagExtension;
