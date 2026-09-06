/**
 * Centralized declarative registry for AmNote's custom Markdown syntax tokens.
 * Single source of truth for token patterns, formatting, and attributes.
 */

export const ANNOTATION_VARIANTS = [
  'wavy',
  'circle',
  'highlight',
  'underline',
  'box',
  'double',
  'cross',
  'arrow',
  'line',
  'dottedUnderline',
  'doubleUnderline',
  'strikethrough',
  'crossOut',
] as const;

export type AnnotationVariant = (typeof ANNOTATION_VARIANTS)[number];

export const CALLOUT_TYPES = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'] as const;
export type CalloutType = (typeof CALLOUT_TYPES)[number];

export interface ImageMetadata {
  alt: string;
  width: string;
  align: string;
}

export function parseImageMeta(text: string): ImageMetadata {
  const parts = text.split('|').map((part) => part.trim());
  const alt = parts.shift() || '';
  let width = '';
  let align = 'center';

  for (const part of parts) {
    if (['left', 'center', 'right'].includes(part.toLowerCase())) {
      align = part.toLowerCase();
    } else if (/^[0-9]+(%|px)?$/.test(part)) {
      width = part.endsWith('%') || part.endsWith('px') ? part : `${part}px`;
    }
  }

  return { alt, width, align };
}

export const syntaxTokens = {
  highlight: {
    name: 'highlight',
    coloredPattern: /==\{color:([^}]+)\}([^=]+)==/g,
    standardPattern: /==([^=]+)==/g,
    format: (text: string, color?: string | null): string => {
      return color ? `=={color:${color}}${text}==` : `==${text}==`;
    },
  },
  tag: {
    name: 'tag',
    spacedPattern: /#\[\[([^\]]+)\]\]#/g,
    standardPattern: /(^|\s)#([a-zA-Z0-9_/-]+)(?=\s|$|[.,!?;:])/g,
    format: (tag: string): string => {
      const clean = tag.trim().replace(/^#/, '');
      return clean.includes(' ') ? `#[[${clean}]]#` : `#${clean}`;
    },
  },
  wikiLink: {
    name: 'wikiLink',
    pattern: /\[\[([^\]]+)\]\]/g,
    format: (target: string): string => `[[${target.trim()}]]`,
  },
  annotation: {
    name: 'annotation',
    pattern: /~(wavy|circle|highlight|underline|box|double|cross|arrow|line|dottedUnderline|doubleUnderline|strikethrough|crossOut):([^~]+)~/gi,
    format: (text: string, variant: string = 'wavy'): string => `~${variant.toLowerCase()}:${text}~`,
  },
  taskDue: {
    name: 'taskDue',
    pattern: /@due\(([0-9]{4}-[0-9]{2}-[0-9]{2})\)/g,
    format: (date: string): string => `@due(${date})`,
  },
};

/**
 * Combined regex for inline tokenization across both AST and ProseMirror parsers.
 */
export const CUSTOM_INLINE_SYNTAX_PATTERN =
  /(?:==\{color:([^}]+)\}([^=]+)==)|(?:==([^=]+)==)|(?:#\[\[([^\]]+)\]\]#)|(?:(?:^|\s)#([a-zA-Z0-9_/-]+)(?=\s|$|[.,!?;:]))|(?:\[\[([^\]]+)\]\])|(?:~(wavy|circle|highlight|underline|box|double|cross|arrow|line|dottedUnderline|doubleUnderline|strikethrough|crossOut):([^~]+)~)|(?:!\[([^\]]*)\]\(([^)]+)\))/gi;
