import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutType = 'note' | 'tip' | 'warning' | 'important';

export interface CalloutOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { type?: CalloutType }) => ReturnType;
      toggleCallout: (attributes?: { type?: CalloutType }) => ReturnType;
    };
  }
}

export const CalloutNode = Node.create<CalloutOptions>({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      type: {
        default: 'note',
        parseHTML: (element) => element.getAttribute('data-callout-type') || 'note',
        renderHTML: (attributes) => ({
          'data-callout-type': attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout-type]',
      },
      {
        tag: 'blockquote[data-callout-type]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = (node.attrs.type as CalloutType) || 'note';
    let borderColor = 'border-blue-500';
    let bgVar = 'var(--callout-note-bg)';
    let badgeText = 'NOTE';

    if (type === 'tip') {
      borderColor = 'border-emerald-500';
      bgVar = 'var(--callout-tip-bg)';
      badgeText = 'TIP';
    } else if (type === 'warning') {
      borderColor = 'border-amber-500';
      bgVar = 'var(--callout-warn-bg)';
      badgeText = 'WARNING';
    } else if (type === 'important') {
      borderColor = 'border-rose-500';
      bgVar = 'var(--callout-note-bg)';
      badgeText = 'IMPORTANT';
    }

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `bear-callout-block my-4 p-3.5 rounded-lg border-l-4 ${borderColor} text-sm transition-all`,
        style: `background-color: ${bgVar}`,
        'data-callout-badge': badgeText,
      }),
      ['div', { class: 'text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80' }, badgeText],
      ['div', { class: 'callout-content' }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes);
        },
      toggleCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attributes);
        },
    };
  },
});
