import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ResizableImageView } from '../components/ResizableImageView';

export interface ImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: string;
        alignment?: 'left' | 'center' | 'right';
      }) => ReturnType;
    };
  }
}

export const ResizableImageExtension = Node.create<ImageOptions>({
  name: 'image',
  group: 'block',
  selectable: true,
  draggable: true,
  isolating: true,

  addOptions() {
    return {
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => ({
          src: attributes.src,
        }),
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute('alt'),
        renderHTML: (attributes) => ({
          alt: attributes.alt,
        }),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('title'),
        renderHTML: (attributes) => ({
          title: attributes.title,
        }),
      },
      width: {
        default: '100%',
        parseHTML: (element) => {
          return element.getAttribute('width') || element.style.width || '100%';
        },
        renderHTML: (attributes) => {
          if (!attributes.width || attributes.width === '100%') {
            return {};
          }
          return {
            width: attributes.width,
            style: `width: ${attributes.width};`,
          };
        },
      },
      alignment: {
        default: 'center',
        parseHTML: (element) => {
          return (element.getAttribute('data-align') as 'left' | 'center' | 'right') || 'center';
        },
        renderHTML: (attributes) => {
          return {
            'data-align': attributes.alignment || 'center',
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
