import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { isValidISODate } from '../../domain/calendarDates';

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, any>;
  onWikiLinkClick?: (title: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiLink: {
      setWikiLink: (attributes: { targetTitle: string }) => ReturnType;
      unsetWikiLink: () => ReturnType;
    };
  }
}

export const WikiLinkMark = Mark.create<WikiLinkOptions>({
  name: 'wikiLink',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      targetTitle: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-wiki-target'),
        renderHTML: (attributes) => {
          if (!attributes.targetTitle) {
            return {};
          }
          return {
            'data-wiki-target': attributes.targetTitle,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wiki-target]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const targetTitle = String(HTMLAttributes['data-wiki-target'] || '');
    const dateClass = isValidISODate(targetTitle) ? ' am-date-link bear-date-link' : '';

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class:
          `am-wiki-link bear-wiki-link inline-flex items-center gap-0.5 text-accent underline underline-offset-4 decoration-accent/60 cursor-pointer font-medium hover:brightness-110 transition-all${dateClass}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setWikiLink:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      unsetWikiLink:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addProseMirrorPlugins() {
    const wikiLinkType = this.type;

    return [
      new Plugin({
        key: new PluginKey('liveWikiLinkDecorations'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const { doc } = state;

            doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                // Match [[Target Note Title]]
                const wikiRegex = /\[\[([^\]]+)\]\]/g;
                let match: RegExpExecArray | null;
                while ((match = wikiRegex.exec(node.text)) !== null) {
                  const from = pos + match.index;
                  const to = from + match[0].length;
                  const targetTitle = match[1].trim();
                  const isDateLink = isValidISODate(targetTitle);
                  const alreadyHasWikiLinkMark = doc
                    .resolve(from)
                    .marks()
                    .some((mark) => mark.type === wikiLinkType);

                  // TipTap renders parsed wiki links as marks. Decorating that
                  // same range again creates a nested wiki-link span, which
                  // displays date-link icons twice. Let actual marks handle
                  // themselves and use decorations only for raw [[...]] text.
                  if (alreadyHasWikiLinkMark) continue;

                  decorations.push(
                    Decoration.inline(from, to, {
                      class:
                        `am-wiki-link bear-wiki-link cursor-pointer text-accent underline underline-offset-4 decoration-accent/60 font-medium hover:brightness-125 transition-all${isDateLink ? ' am-date-link bear-date-link' : ''}`,
                      'data-wiki-target': targetTitle,
                      title: isDateLink
                        ? `Open daily note: ${targetTitle}`
                        : `Linked Note: ${targetTitle} (Click to open)`,
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
