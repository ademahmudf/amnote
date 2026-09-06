import { lexer, type Token, type Tokens } from 'marked';
import type { Node as ProseMirrorNode, Schema } from '@tiptap/pm/model';
import { amnoteSchema } from '../schema/amnoteSchema';
import { renderMarkdownToHtml } from './markdownAstRenderer';
import {
  serializeProseMirrorToMarkdown,
  type SerializerOptions,
} from './proseMirrorMarkdownSerializer';
import {
  parseImageMeta,
  syntaxTokens,
  CUSTOM_INLINE_SYNTAX_PATTERN,
} from '../../domain/syntaxTokens';

export interface MarkdownCodec {
  markdownToHtml(markdown: string): string;
  markdownToDoc(markdown: string, schema?: Schema): ProseMirrorNode;
  docToMarkdown(doc: ProseMirrorNode, options?: SerializerOptions): string;
  roundTrip(markdown: string, schema?: Schema): string;
}

function parseCustomText(text: string, schema: Schema, inheritedMarks: readonly any[] = []): ProseMirrorNode[] {
  if (!text) return [];

  const pattern = new RegExp(CUSTOM_INLINE_SYNTAX_PATTERN.source, 'gi');

  const nodes: ProseMirrorNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      const leadingText = text.slice(lastIndex, matchIndex);
      if (leadingText) {
        nodes.push(schema.text(leadingText, inheritedMarks));
      }
    }

    if (match[1] && match[2]) {
      // Colored highlight =={color:hex}text==
      const color = match[1];
      const highlightedText = match[2];
      const mark = schema.marks.highlight ? schema.marks.highlight.create({ color }) : null;
      nodes.push(schema.text(highlightedText, mark ? [...inheritedMarks, mark] : inheritedMarks));
    } else if (match[3]) {
      // Standard highlight ==text==
      const highlightedText = match[3];
      const mark = schema.marks.highlight ? schema.marks.highlight.create({ color: null }) : null;
      nodes.push(schema.text(highlightedText, mark ? [...inheritedMarks, mark] : inheritedMarks));
    } else if (match[4]) {
      // Spaced bracket tag #[[tag]]#
      const rawTag = match[4].trim();
      const mark = schema.marks.tag ? schema.marks.tag.create({ tag: rawTag }) : null;
      nodes.push(schema.text(`#[[${rawTag}]]#`, mark ? [...inheritedMarks, mark] : inheritedMarks));
    } else if (match[5]) {
      // Standard tag #tag
      const fullMatch = match[0];
      const tag = match[5];
      const leadingSpace = fullMatch.startsWith(' ') ? ' ' : '';
      if (leadingSpace) {
        nodes.push(schema.text(leadingSpace, inheritedMarks));
      }
      const mark = schema.marks.tag ? schema.marks.tag.create({ tag }) : null;
      nodes.push(schema.text(`#${tag}`, mark ? [...inheritedMarks, mark] : inheritedMarks));
    } else if (match[6]) {
      // WikiLink [[target]]
      const target = match[6].trim();
      const mark = schema.marks.wikiLink ? schema.marks.wikiLink.create({ target }) : null;
      nodes.push(schema.text(`[[${target}]]`, mark ? [...inheritedMarks, mark] : inheritedMarks));
    } else if (match[7] && match[8]) {
      // Annotation ~variant:text~
      const variant = match[7].toLowerCase();
      const annotatedText = match[8];
      const mark = schema.marks.annotation ? schema.marks.annotation.create({ variant }) : null;
      nodes.push(schema.text(annotatedText, mark ? [...inheritedMarks, mark] : inheritedMarks));
    } else if (match[9] !== undefined && match[10]) {
      // Inline image ![alt](url)
      const meta = parseImageMeta(match[9]);
      const src = match[10].trim();
      if (schema.nodes.image) {
        nodes.push(
          schema.nodes.image.create({
            src,
            alt: meta.alt,
            width: meta.width,
            align: meta.align,
          })
        );
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    const trailingText = text.slice(lastIndex);
    if (trailingText) {
      nodes.push(schema.text(trailingText, inheritedMarks));
    }
  }

  return nodes;
}

function parseInlineTokens(tokens: Token[] | undefined, schema: Schema, inheritedMarks: readonly any[] = []): ProseMirrorNode[] {
  if (!tokens || tokens.length === 0) return [];
  const nodes: ProseMirrorNode[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'text': {
        const textToken = token as Tokens.Text;
        if (textToken.tokens && textToken.tokens.length > 0) {
          nodes.push(...parseInlineTokens(textToken.tokens, schema, inheritedMarks));
        } else {
          nodes.push(...parseCustomText(textToken.text, schema, inheritedMarks));
        }
        break;
      }
      case 'strong': {
        const strongToken = token as Tokens.Strong;
        const mark = schema.marks.bold ? schema.marks.bold.create() : null;
        const nextMarks = mark ? [...inheritedMarks, mark] : inheritedMarks;
        nodes.push(...parseInlineTokens(strongToken.tokens, schema, nextMarks));
        break;
      }
      case 'em': {
        const emToken = token as Tokens.Em;
        const mark = schema.marks.italic ? schema.marks.italic.create() : null;
        const nextMarks = mark ? [...inheritedMarks, mark] : inheritedMarks;
        nodes.push(...parseInlineTokens(emToken.tokens, schema, nextMarks));
        break;
      }
      case 'del': {
        const delToken = token as Tokens.Del;
        const annotationPattern = new RegExp(`^${syntaxTokens.annotation.pattern.source}$`, 'i');
        const annotationMatch = delToken.raw.match(annotationPattern);
        if (annotationMatch && schema.marks.annotation) {
          const variant = annotationMatch[1].toLowerCase();
          const annotatedText = annotationMatch[2];
          const mark = schema.marks.annotation.create({ variant });
          nodes.push(schema.text(annotatedText, [...inheritedMarks, mark]));
        } else {
          const mark = schema.marks.strike ? schema.marks.strike.create() : null;
          const nextMarks = mark ? [...inheritedMarks, mark] : inheritedMarks;
          nodes.push(...parseInlineTokens(delToken.tokens, schema, nextMarks));
        }
        break;
      }
      case 'codespan': {
        const codeToken = token as Tokens.Codespan;
        const mark = schema.marks.code ? schema.marks.code.create() : null;
        const nextMarks = mark ? [...inheritedMarks, mark] : inheritedMarks;
        nodes.push(schema.text(codeToken.text, nextMarks));
        break;
      }
      case 'link': {
        const linkToken = token as Tokens.Link;
        const mark = schema.marks.link ? schema.marks.link.create({ href: linkToken.href }) : null;
        const nextMarks = mark ? [...inheritedMarks, mark] : inheritedMarks;
        if (linkToken.tokens && linkToken.tokens.length > 0) {
          nodes.push(...parseInlineTokens(linkToken.tokens, schema, nextMarks));
        } else {
          nodes.push(schema.text(linkToken.text, nextMarks));
        }
        break;
      }
      case 'image': {
        const imgToken = token as Tokens.Image;
        const meta = parseImageMeta(imgToken.text);
        if (schema.nodes.image) {
          nodes.push(
            schema.nodes.image.create({
              src: imgToken.href,
              alt: meta.alt,
              width: meta.width,
              align: meta.align,
            })
          );
        }
        break;
      }
      case 'escape': {
        const escToken = token as Tokens.Escape;
        nodes.push(schema.text(escToken.text, inheritedMarks));
        break;
      }
      default: {
        const rawText = (token as any).text || (token as any).raw || '';
        if (rawText) {
          nodes.push(...parseCustomText(rawText, schema, inheritedMarks));
        }
      }
    }
  }

  return nodes;
}

function parseBlockTokens(tokens: Token[], schema: Schema): ProseMirrorNode[] {
  const blocks: ProseMirrorNode[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'space':
        break;
      case 'hr': {
        if (schema.nodes.horizontalRule) {
          blocks.push(schema.nodes.horizontalRule.create());
        }
        break;
      }
      case 'heading': {
        const headingToken = token as Tokens.Heading;
        const level = Math.min(Math.max(headingToken.depth, 1), 6);
        const inline = parseInlineTokens(headingToken.tokens, schema);
        blocks.push(schema.nodes.heading.create({ level }, inline));
        break;
      }
      case 'code': {
        const codeToken = token as Tokens.Code;
        if (schema.nodes.codeBlock) {
          blocks.push(
            schema.nodes.codeBlock.create(
              { language: codeToken.lang || '' },
              codeToken.text ? [schema.text(codeToken.text)] : []
            )
          );
        }
        break;
      }
      case 'paragraph': {
        const pToken = token as Tokens.Paragraph;
        const inline = parseInlineTokens(pToken.tokens, schema);
        blocks.push(schema.nodes.paragraph.create({}, inline));
        break;
      }
      case 'blockquote': {
        const bqToken = token as Tokens.Blockquote;
        const raw = bqToken.text || '';
        const calloutMatch = raw.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);

        if (calloutMatch && schema.nodes.callout) {
          const type = calloutMatch[1].toLowerCase();
          const cleanBody = raw.replace(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, '').trim();
          const subTokens = lexer(cleanBody);
          const subBlocks = parseBlockTokens(subTokens, schema);
          blocks.push(
            schema.nodes.callout.create(
              { type },
              subBlocks.length > 0 ? subBlocks : [schema.nodes.paragraph.create({}, [])]
            )
          );
        } else if (schema.nodes.blockquote) {
          const subTokens = bqToken.tokens || lexer(raw);
          const subBlocks = parseBlockTokens(subTokens, schema);
          blocks.push(
            schema.nodes.blockquote.create(
              {},
              subBlocks.length > 0 ? subBlocks : [schema.nodes.paragraph.create({}, [])]
            )
          );
        }
        break;
      }
      case 'list': {
        const listToken = token as Tokens.List;
        const isTask = listToken.items.some((item) => item.task);

        if (isTask && schema.nodes.taskList && schema.nodes.taskItem) {
          const items = listToken.items.map((item) => {
            const checked = !!item.checked;
            const inline = parseInlineTokens(
              item.tokens && item.tokens.length > 0
                ? (item.tokens[0] as any).tokens || item.tokens
                : undefined,
              schema
            );
            const paragraph = schema.nodes.paragraph.create({}, inline);
            return schema.nodes.taskItem.create({ checked }, [paragraph]);
          });
          blocks.push(schema.nodes.taskList.create({}, items));
        } else if (listToken.ordered && schema.nodes.orderedList && schema.nodes.listItem) {
          const items = listToken.items.map((item) => {
            const inline = parseInlineTokens(
              item.tokens && item.tokens.length > 0
                ? (item.tokens[0] as any).tokens || item.tokens
                : undefined,
              schema
            );
            const paragraph = schema.nodes.paragraph.create({}, inline);
            return schema.nodes.listItem.create({}, [paragraph]);
          });
          blocks.push(
            schema.nodes.orderedList.create(
              { order: typeof listToken.start === 'number' ? listToken.start : 1 },
              items
            )
          );
        } else if (schema.nodes.bulletList && schema.nodes.listItem) {
          const items = listToken.items.map((item) => {
            const inline = parseInlineTokens(
              item.tokens && item.tokens.length > 0
                ? (item.tokens[0] as any).tokens || item.tokens
                : undefined,
              schema
            );
            const paragraph = schema.nodes.paragraph.create({}, inline);
            return schema.nodes.listItem.create({}, [paragraph]);
          });
          blocks.push(schema.nodes.bulletList.create({}, items));
        }
        break;
      }
      case 'table': {
        const tableToken = token as Tokens.Table;
        if (
          schema.nodes.table &&
          schema.nodes.tableRow &&
          schema.nodes.tableHeader &&
          schema.nodes.tableCell
        ) {
          const headerCells = tableToken.header.map((cell) => {
            const inline = parseInlineTokens(cell.tokens, schema);
            return schema.nodes.tableHeader.create({}, inline);
          });
          const headerRow = schema.nodes.tableRow.create({}, headerCells);

          const bodyRows = tableToken.rows.map((row) => {
            const cells = row.map((cell) => {
              const inline = parseInlineTokens(cell.tokens, schema);
              return schema.nodes.tableCell.create({}, inline);
            });
            return schema.nodes.tableRow.create({}, cells);
          });

          blocks.push(schema.nodes.table.create({}, [headerRow, ...bodyRows]));
        }
        break;
      }
      default: {
        const rawText = (token as any).text || (token as any).raw || '';
        if (rawText.trim()) {
          const inline = parseCustomText(rawText.trim(), schema);
          blocks.push(schema.nodes.paragraph.create({}, inline));
        }
      }
    }
  }

  return blocks;
}

export function createMarkdownCodec(defaultSchema: Schema = amnoteSchema): MarkdownCodec {
  return {
    markdownToHtml(markdown: string): string {
      return renderMarkdownToHtml(markdown);
    },

    markdownToDoc(markdown: string, schema: Schema = defaultSchema): ProseMirrorNode {
      if (!markdown || !markdown.trim()) {
        return schema.nodes.doc.create({}, [schema.nodes.paragraph.create({}, [])]);
      }
      const tokens = lexer(markdown);
      const blocks = parseBlockTokens(tokens, schema);
      return schema.nodes.doc.create(
        {},
        blocks.length > 0 ? blocks : [schema.nodes.paragraph.create({}, [])]
      );
    },

    docToMarkdown(doc: ProseMirrorNode, options?: SerializerOptions): string {
      return serializeProseMirrorToMarkdown(doc, options);
    },

    roundTrip(markdown: string, schema: Schema = defaultSchema): string {
      const doc = this.markdownToDoc(markdown, schema);
      return this.docToMarkdown(doc);
    },
  };
}

export const defaultMarkdownCodec: MarkdownCodec = createMarkdownCodec(amnoteSchema);
export const markdownToHtml = defaultMarkdownCodec.markdownToHtml;
