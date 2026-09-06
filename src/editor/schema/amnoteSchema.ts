import { Schema } from '@tiptap/pm/model';

export const amnoteSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    heading: {
      group: 'block',
      content: 'inline*',
      attrs: { level: { default: 1 } },
    },
    blockquote: { group: 'block', content: 'block+' },
    callout: {
      group: 'block',
      content: 'block+',
      attrs: { type: { default: 'note' } },
    },
    codeBlock: {
      group: 'block',
      content: 'text*',
      attrs: { language: { default: '' } },
    },
    horizontalRule: { group: 'block' },
    bulletList: { group: 'block', content: 'listItem+' },
    orderedList: {
      group: 'block',
      content: 'listItem+',
      attrs: { order: { default: 1 } },
    },
    taskList: { group: 'block', content: 'taskItem+' },
    taskItem: {
      content: 'paragraph block*',
      attrs: { checked: { default: false } },
    },
    listItem: { content: 'paragraph block*' },
    table: { group: 'block', content: 'tableRow+' },
    tableRow: { content: '(tableCell | tableHeader)+' },
    tableHeader: { content: 'inline*' },
    tableCell: { content: 'inline*' },
    image: {
      inline: true,
      group: 'inline',
      attrs: {
        src: {},
        alt: { default: '' },
        width: { default: '' },
        align: { default: 'center' },
      },
    },
    text: { group: 'inline' },
  },
  marks: {
    bold: {},
    italic: {},
    strike: {},
    code: {},
    highlight: { attrs: { color: { default: null } } },
    tag: { attrs: { tag: { default: '' } } },
    wikiLink: { attrs: { target: { default: '' } } },
    link: { attrs: { href: { default: '' } } },
    annotation: { attrs: { variant: { default: 'wavy' } } },
  },
});
