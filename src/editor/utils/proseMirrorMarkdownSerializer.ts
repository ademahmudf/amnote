import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { syntaxTokens } from '../../domain/syntaxTokens';

export interface SerializerOptions {
  tightLists?: boolean;
}

/**
 * Direct ProseMirror AST to Markdown Serializer
 * Walks the ProseMirror document tree in-memory and outputs clean, canonical Markdown.
 */
export class ProseMirrorMarkdownSerializer {
  /**
   * Serializes a ProseMirror Node (e.g., editor.state.doc) directly to Markdown string.
   */
  public serialize(doc: ProseMirrorNode, options: SerializerOptions = {}): string {
    if (!doc || doc.childCount === 0) {
      return '';
    }

    const state = new SerializerState(options);
    state.renderDoc(doc);
    return state.getOutput();
  }
}

class SerializerState {
  private buffer: string[] = [];
  private currentIndent: string = '';
  private options: SerializerOptions;

  constructor(options: SerializerOptions = {}) {
    this.options = options;
  }

  public getOutput(): string {
    return this.buffer.join('').trim();
  }

  public write(text: string): void {
    this.buffer.push(text);
  }

  public ensureNewline(): void {
    if (this.buffer.length === 0) return;
    const last = this.buffer[this.buffer.length - 1];
    if (!last.endsWith('\n')) {
      this.buffer.push('\n');
    }
  }

  public ensureDoubleNewline(): void {
    if (this.buffer.length === 0) return;
    const combined = this.buffer.join('');
    if (combined.endsWith('\n\n')) return;
    if (combined.endsWith('\n')) {
      this.buffer.push('\n');
    } else {
      this.buffer.push('\n\n');
    }
  }

  public withIndent<T>(indent: string, fn: () => T): T {
    const prevIndent = this.currentIndent;
    this.currentIndent += indent;
    const res = fn();
    this.currentIndent = prevIndent;
    return res;
  }

  public renderDoc(doc: ProseMirrorNode): void {
    doc.forEach((child, _offset, index) => {
      if (index > 0) {
        this.ensureDoubleNewline();
      }
      this.renderNode(child);
    });
  }

  public renderNode(node: ProseMirrorNode): void {
    if (!node) return;

    switch (node.type.name) {
      case 'paragraph':
        this.renderParagraph(node);
        break;
      case 'heading':
        this.renderHeading(node);
        break;
      case 'blockquote':
        this.renderBlockquote(node);
        break;
      case 'callout':
        this.renderCallout(node);
        break;
      case 'codeBlock':
        this.renderCodeBlock(node);
        break;
      case 'horizontalRule':
        this.renderHorizontalRule();
        break;
      case 'bulletList':
        this.renderBulletList(node);
        break;
      case 'orderedList':
        this.renderOrderedList(node);
        break;
      case 'taskList':
        this.renderTaskList(node);
        break;
      case 'taskItem':
        this.renderTaskItem(node);
        break;
      case 'listItem':
        this.renderListItem(node);
        break;
      case 'table':
        this.renderTable(node);
        break;
      case 'image':
      case 'resizableImage':
        this.renderImage(node);
        break;
      case 'hardBreak':
        this.write('\n');
        break;
      default:
        if (node.isText) {
          this.write(node.text || '');
        } else if (node.isBlock) {
          node.forEach((child) => this.renderNode(child));
        }
        break;
    }
  }

  private renderParagraph(node: ProseMirrorNode): void {
    const text = this.renderInlineContent(node);
    this.write(text);
  }

  private renderHeading(node: ProseMirrorNode): void {
    const level = node.attrs.level || 1;
    const prefix = '#'.repeat(level) + ' ';
    const text = this.renderInlineContent(node);
    this.write(prefix + text);
  }

  private renderBlockquote(node: ProseMirrorNode): void {
    const innerState = new SerializerState(this.options);
    node.forEach((child, _offset, index) => {
      if (index > 0) innerState.ensureDoubleNewline();
      innerState.renderNode(child);
    });

    const lines = innerState.getOutput().split('\n');
    const quoted = lines.map((l) => (l.trim() ? `> ${l}` : '>')).join('\n');
    this.write(quoted);
  }

  private renderCallout(node: ProseMirrorNode): void {
    const type = (node.attrs.type || 'NOTE').toUpperCase();
    const innerState = new SerializerState(this.options);
    node.forEach((child, _offset, index) => {
      if (index > 0) innerState.ensureDoubleNewline();
      innerState.renderNode(child);
    });

    const lines = innerState.getOutput().split('\n');
    const calloutHeader = `> [!${type}]`;
    const quotedLines = lines.map((l) => (l.trim() ? `> ${l}` : '>'));
    this.write([calloutHeader, ...quotedLines].join('\n'));
  }

  private renderCodeBlock(node: ProseMirrorNode): void {
    const lang = node.attrs.language || '';
    const content = node.textContent || '';
    this.write(`\`\`\`${lang}\n${content}\n\`\`\``);
  }

  private renderHorizontalRule(): void {
    this.write('---');
  }

  private renderBulletList(node: ProseMirrorNode): void {
    node.forEach((item, _offset, index) => {
      if (index > 0) this.write('\n');
      this.renderBulletListItem(item);
    });
  }

  private renderBulletListItem(item: ProseMirrorNode): void {
    this.write(this.currentIndent + '- ');
    this.withIndent('  ', () => {
      item.forEach((child, _offset, idx) => {
        if (idx > 0) this.ensureNewline();
        this.renderNode(child);
      });
    });
  }

  private renderOrderedList(node: ProseMirrorNode): void {
    const start = node.attrs.order || 1;
    node.forEach((item, _offset, index) => {
      if (index > 0) this.write('\n');
      this.renderOrderedListItem(item, start + index);
    });
  }

  private renderOrderedListItem(item: ProseMirrorNode, num: number): void {
    const prefix = `${num}. `;
    this.write(this.currentIndent + prefix);
    const indentSpace = ' '.repeat(prefix.length);
    this.withIndent(indentSpace, () => {
      item.forEach((child, _offset, idx) => {
        if (idx > 0) this.ensureNewline();
        this.renderNode(child);
      });
    });
  }

  private renderTaskList(node: ProseMirrorNode): void {
    node.forEach((item, _offset, index) => {
      if (index > 0) this.write('\n');
      this.renderTaskItem(item);
    });
  }

  private renderTaskItem(item: ProseMirrorNode): void {
    const checked = Boolean(item.attrs.checked);
    const mark = checked ? '- [x] ' : '- [ ] ';
    this.write(this.currentIndent + mark);

    this.withIndent('  ', () => {
      item.forEach((child, _offset, idx) => {
        if (idx > 0) this.ensureNewline();
        this.renderNode(child);
      });
    });
  }

  private renderListItem(item: ProseMirrorNode): void {
    item.forEach((child) => this.renderNode(child));
  }

  private renderTable(tableNode: ProseMirrorNode): void {
    const rows: string[][] = [];

    tableNode.forEach((rowNode) => {
      if (rowNode.type.name === 'tableRow') {
        const rowCells: string[] = [];
        rowNode.forEach((cellNode) => {
          const cellText = this.renderInlineContent(cellNode).replace(/\n+/g, ' ').trim();
          rowCells.push(cellText);
        });
        rows.push(rowCells);
      }
    });

    if (rows.length === 0) return;

    const colCount = Math.max(...rows.map((r) => r.length));
    const normalizedRows = rows.map((r) => {
      const copy = [...r];
      while (copy.length < colCount) copy.push('');
      return copy;
    });

    const lines: string[] = [];
    normalizedRows.forEach((row, rowIdx) => {
      const line = '| ' + row.map((cell) => cell || ' ').join(' | ') + ' |';
      lines.push(line);

      if (rowIdx === 0) {
        const delimiter = '| ' + row.map(() => '---').join(' | ') + ' |';
        lines.push(delimiter);
      }
    });

    this.write(lines.join('\n'));
  }

  private renderImage(node: ProseMirrorNode): void {
    const { src, alt, width, align } = node.attrs;
    const cleanAlt = (alt || '').trim();
    const parts: string[] = [];

    if (cleanAlt) parts.push(cleanAlt);
    if (align && align !== 'center') parts.push(align);
    if (width && width !== '100%') {
      const cleanWidth = String(width).replace(/px$/, '');
      parts.push(cleanWidth);
    }

    const meta = parts.join('|');
    this.write(`![${meta}](${src || ''})`);
  }

  /**
   * Renders inline child nodes of a block (text nodes with marks, inline images, links)
   */
  public renderInlineContent(node: ProseMirrorNode): string {
    let result = '';

    node.forEach((child) => {
      if (child.isText && child.text) {
        let text = child.text;
        const marks = [...child.marks];

        // 1. Tag Mark
        const tagMark = marks.find((m) => m.type.name === 'tag');
        if (tagMark) {
          const rawTag = tagMark.attrs.tag || text.replace(/^#/, '');
          result += syntaxTokens.tag.format(rawTag);
          return;
        }

        // 2. WikiLink Mark
        const wikiMark = marks.find((m) => m.type.name === 'wikiLink');
        if (wikiMark) {
          const target = wikiMark.attrs.target || text.replace(/^\[\[|\]\]$/g, '').trim();
          result += syntaxTokens.wikiLink.format(target);
          return;
        }

        // 3. Highlight Mark
        const highlightMark = marks.find((m) => m.type.name === 'highlight');
        if (highlightMark) {
          text = syntaxTokens.highlight.format(text, highlightMark.attrs.color);
        }

        // 3b. Annotation Mark (~variant:text~)
        const annotationMark = marks.find((m) => m.type.name === 'annotation');
        if (annotationMark) {
          text = syntaxTokens.annotation.format(text, annotationMark.attrs.variant || 'wavy');
        }

        // 4. Code Mark
        if (marks.some((m) => m.type.name === 'code')) {
          text = `\`${text}\``;
        }

        // 5. Bold Mark
        if (marks.some((m) => m.type.name === 'bold')) {
          text = `**${text}**`;
        }

        // 6. Italic Mark
        if (marks.some((m) => m.type.name === 'italic')) {
          text = `*${text}*`;
        }

        // 7. Strikethrough Mark
        if (marks.some((m) => m.type.name === 'strike')) {
          text = `~~${text}~~`;
        }

        // 8. Link Mark
        const linkMark = marks.find((m) => m.type.name === 'link');
        if (linkMark) {
          const href = linkMark.attrs.href || '';
          text = `[${text}](${href})`;
        }

        result += text;
      } else if (child.type.name === 'image' || child.type.name === 'resizableImage') {
        const { src, alt, width, align } = child.attrs;
        const cleanAlt = (alt || '').trim();
        const parts: string[] = [];
        if (cleanAlt) parts.push(cleanAlt);
        if (align && align !== 'center') parts.push(align);
        if (width && width !== '100%') parts.push(String(width).replace(/px$/, ''));
        const meta = parts.join('|');
        result += `![${meta}](${src || ''})`;
      } else if (child.type.name === 'hardBreak') {
        result += '\n';
      } else {
        result += child.textContent;
      }
    });

    return result;
  }
}

export const defaultMarkdownSerializer = new ProseMirrorMarkdownSerializer();

export function serializeProseMirrorToMarkdown(doc: ProseMirrorNode, options?: SerializerOptions): string {
  return defaultMarkdownSerializer.serialize(doc, options);
}
