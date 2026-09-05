import { InputRule, Mark, mergeAttributes, PasteRule } from '@tiptap/core';

export const ANNOTATION_INPUT_REGEX =
  /(?:^|\s)(~(wavy|circle|highlight|underline|box|double|cross|arrow|line|dottedUnderline|doubleUnderline|strikethrough|crossOut):((?:[^~]+))~)$/i;

export const ANNOTATION_PASTE_REGEX =
  /(?:^|\s)(~(wavy|circle|highlight|underline|box|double|cross|arrow|line|dottedUnderline|doubleUnderline|strikethrough|crossOut):((?:[^~]+))~)/gi;

export interface AnnotationOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    annotation: {
      setAnnotation: (attributes: { variant?: string; color?: string }) => ReturnType;
      toggleAnnotation: (attributes: { variant?: string; color?: string }) => ReturnType;
      unsetAnnotation: () => ReturnType;
    };
  }
}

export const AnnotationExtension = Mark.create<AnnotationOptions>({
  name: 'annotation',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      variant: {
        default: 'wavy',
        parseHTML: (element) => element.getAttribute('data-annotation') || 'wavy',
        renderHTML: (attributes) => ({
          'data-annotation': attributes.variant || 'wavy',
          class: `am-annotation am-annotation-${attributes.variant || 'wavy'}`,
        }),
      },
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-color'),
        renderHTML: (attributes) => {
          if (!attributes.color) return {};
          return {
            'data-color': attributes.color,
            style: `color: ${attributes.color};`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-annotation]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const variant = HTMLAttributes['data-annotation'] || 'wavy';
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-annotation': variant,
        class: `am-annotation am-annotation-${variant}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setAnnotation:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleAnnotation:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetAnnotation:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: ANNOTATION_INPUT_REGEX,
        handler: ({ state, range, match }) => {
          const fullMatch = match[0];
          const variant = match[2]?.toLowerCase();
          const text = match[3];
          if (!variant || !text) return null;

          const { tr } = state;
          const startSpaces = fullMatch.search(/\S/);
          const prefixStart = range.from + (startSpaces > 0 ? startSpaces : 0);
          const prefixLength = 1 + match[2].length + 1; // '~' + variant + ':'
          const prefixEnd = prefixStart + prefixLength;
          const suffixStart = range.to - 1; // trailing '~'

          tr.delete(suffixStart, range.to);
          tr.delete(prefixStart, prefixEnd);

          const markEnd = prefixStart + text.length;
          tr.addMark(prefixStart, markEnd, this.type.create({ variant }));
          tr.removeStoredMark(this.type);
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      new PasteRule({
        find: ANNOTATION_PASTE_REGEX,
        handler: ({ state, range, match }) => {
          const fullMatch = match[0];
          const variant = match[2]?.toLowerCase();
          const text = match[3];
          if (!variant || !text) return null;

          const { tr } = state;
          const startSpaces = fullMatch.search(/\S/);
          const prefixStart = range.from + (startSpaces > 0 ? startSpaces : 0);
          const prefixLength = 1 + match[2].length + 1; // '~' + variant + ':'
          const prefixEnd = prefixStart + prefixLength;
          const suffixStart = range.to - 1; // trailing '~'

          tr.delete(suffixStart, range.to);
          tr.delete(prefixStart, prefixEnd);

          const markEnd = prefixStart + text.length;
          tr.addMark(prefixStart, markEnd, this.type.create({ variant }));
          tr.removeStoredMark(this.type);
        },
      }),
    ];
  },
});
