import { Mark, mergeAttributes } from '@tiptap/core';

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
});
