import { lexer, type Token, type Tokens } from 'marked';
import { isValidISODate } from '../../domain/calendarDates';
import { syntaxTokens, parseImageMeta } from '../../domain/syntaxTokens';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function safeLinkUrl(value: string): string {
  return /^(https?:|mailto:|tel:|#|\/(?!\/))/i.test(value.trim()) ? value.trim() : '#';
}

function safeImageUrl(value: string): string {
  const url = value.trim();
  const isDataImage = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(url);
  const isHttp = /^https?:\/\//i.test(url);
  const isAppAttachment = /^amnote-asset:\/\//i.test(url);
  const isPath = !url.startsWith('//') && !/^[a-z][a-z0-9+.-]*:/i.test(url);
  return isDataImage || isHttp || isAppAttachment || isPath ? url : '';
}

function safeHighlightColor(value: string): string {
  const color = value.trim();
  const isValid = /^(#[0-9a-f]{3,8}|[a-z]+|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0?\.\d+|1)\s*)?\))$/i.test(color);
  return isValid ? color : '#facc15';
}

function renderImage(text: string, href: string): string {
  const meta = parseImageMeta(text);
  const widthAttribute = meta.width ? ` width="${escapeAttribute(meta.width)}" style="width: ${meta.width};"` : '';
  const alignAttribute = ` data-align="${escapeAttribute(meta.align)}"`;
  return `<img src="${escapeAttribute(safeImageUrl(href))}" alt="${escapeAttribute(meta.alt)}" class="am-editor-image"${widthAttribute}${alignAttribute} />`;
}

function renderCustomText(value: string): string {
  let out = escapeHtml(value);

  out = out.replace(
    new RegExp(syntaxTokens.highlight.coloredPattern.source, 'g'),
    (_match, color: string, text: string) => {
      const safeColor = safeHighlightColor(color);
      return `<mark data-color="${escapeAttribute(safeColor)}" style="background-color: ${safeColor}">${text}</mark>`;
    }
  );
  out = out.replace(new RegExp(syntaxTokens.highlight.standardPattern.source, 'g'), '<mark>$1</mark>');
  out = out.replace(
    new RegExp(syntaxTokens.tag.spacedPattern.source, 'g'),
    (_match, tag: string) => {
      const normalized = tag.trim().toLowerCase().replace(/\s+/g, '-');
      return `<span data-tag="${escapeAttribute(normalized)}" class="am-tag-pill bear-tag-pill">#${escapeAttribute(tag.trim())}</span>`;
    }
  );
  out = out.replace(
    new RegExp(syntaxTokens.tag.standardPattern.source, 'g'),
    (_match, prefix: string, tag: string) =>
      `${prefix}<span data-tag="${escapeAttribute(tag)}" class="am-tag-pill bear-tag-pill">#${escapeAttribute(tag)}</span>`
  );
  out = out.replace(
    new RegExp(syntaxTokens.wikiLink.pattern.source, 'g'),
    (_match, target: string) => {
      const dateClass = isValidISODate(target.trim()) ? ' am-date-link bear-date-link' : '';
      return `<span data-wiki-target="${escapeAttribute(target)}" class="am-wiki-link bear-wiki-link${dateClass}">[[ ${escapeHtml(target)} ]]</span>`;
    }
  );
  out = out.replace(
    new RegExp(syntaxTokens.annotation.pattern.source, 'gi'),
    (_match, variant: string, text: string) =>
      `<span data-annotation="${escapeAttribute(variant.toLowerCase())}" class="am-annotation am-annotation-${escapeAttribute(variant.toLowerCase())}">${text}</span>`
  );

  return out;
}

function renderInlineTokens(tokens?: Token[]): string {
  if (!tokens) return '';

  return tokens.map((token) => {
    switch (token.type) {
      case 'escape':
      case 'text':
      {
        const text = token as Tokens.Text;
        return text.tokens ? renderInlineTokens(text.tokens) : renderCustomText(text.text);
      }
      case 'html':
        return escapeHtml((token as Tokens.HTML).text);
      case 'br':
        return '<br>';
      case 'strong':
        return `<strong>${renderInlineTokens((token as Tokens.Strong).tokens)}</strong>`;
      case 'em':
        return `<em>${renderInlineTokens((token as Tokens.Em).tokens)}</em>`;
      case 'del': {
        const delToken = token as Tokens.Del;
        const match = delToken.text.match(/^(wavy|circle|highlight|underline|box|double|cross|arrow|line|dottedUnderline|doubleUnderline|strikethrough|crossOut):([\s\S]+)$/i);
        if (match) {
          const variant = match[1].toLowerCase();
          const innerText = match[2];
          return `<span data-annotation="${escapeAttribute(variant)}" class="am-annotation am-annotation-${escapeAttribute(variant)}">${renderCustomText(innerText)}</span>`;
        }
        return `<s>${renderInlineTokens(delToken.tokens)}</s>`;
      }
      case 'codespan':
        return `<code>${escapeHtml((token as Tokens.Codespan).text)}</code>`;
      case 'link': {
        const link = token as Tokens.Link;
        return `<a href="${escapeAttribute(safeLinkUrl(link.href))}">${renderInlineTokens(link.tokens)}</a>`;
      }
      case 'image':
        return renderImage((token as Tokens.Image).text, (token as Tokens.Image).href);
      default:
        return renderCustomText(token.raw);
    }
  }).join('');
}

function renderCallout(token: Tokens.Blockquote): string | null {
  const match = token.raw.match(/^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|DANGER|INFO)\]\s*(?:\n|$)/i);
  if (!match) return null;

  const body = token.raw
    .slice(match[0].length)
    .split('\n')
    .map((line) => line.replace(/^\s*>\s?/, ''))
    .join('\n')
    .trim();
  const bodyTokens = lexer(body);
  const type = match[1].toUpperCase();
  return `<div data-callout-type="${escapeAttribute(type)}" class="am-callout"><p>${renderTokens(bodyTokens as unknown as Token[])}</p></div>`;
}

function renderListItem(item: Tokens.ListItem): string {
  if (item.task) {
    const checked = item.checked ? 'true' : 'false';
    return `<li data-type="taskItem" data-checked="${checked}"><p>${renderTokens(item.tokens)}</p></li>`;
  }
  return `<li><p>${renderTokens(item.tokens)}</p></li>`;
}

function renderList(token: Tokens.List): string {
  const items = token.items.map(renderListItem).join('');
  if (token.items.some((item) => item.task)) {
    return `<ul data-type="taskList">${items}</ul>`;
  }
  if (!token.ordered) return `<ul>${items}</ul>`;
  return typeof token.start === 'number' && token.start !== 1
    ? `<ol start="${token.start}">${items}</ol>`
    : `<ol>${items}</ol>`;
}

function renderTable(token: Tokens.Table): string {
  const header = token.header
    .map((cell) => `<th>${renderInlineTokens(cell.tokens)}</th>`)
    .join('');
  const rows = token.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInlineTokens(cell.tokens)}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderToken(token: Token): string {
  switch (token.type) {
    case 'space':
      return '';
    case 'hr':
      return '<hr>';
    case 'heading': {
      const heading = token as Tokens.Heading;
      return `<h${heading.depth}>${renderInlineTokens(heading.tokens)}</h${heading.depth}>`;
    }
    case 'code': {
      const code = token as Tokens.Code;
      const lang = /^[a-z0-9+#.-]+$/i.test(code.lang || '') ? code.lang : '';
      return `<pre><code${lang ? ` class="language-${escapeAttribute(lang)}"` : ''}>${escapeHtml(code.text)}</code></pre>`;
    }
    case 'blockquote': {
      const callout = renderCallout(token as Tokens.Blockquote);
      return callout ?? `<blockquote>${renderTokens((token as Tokens.Blockquote).tokens)}</blockquote>`;
    }
    case 'html':
    case 'tag':
      return escapeHtml((token as Tokens.HTML).text);
    case 'list':
      return renderList(token as Tokens.List);
    case 'paragraph':
      return `<p>${renderInlineTokens((token as Tokens.Paragraph).tokens)}</p>`;
    case 'table':
      return renderTable(token as Tokens.Table);
    case 'text':
    {
      const text = token as Tokens.Text;
      return text.tokens ? renderInlineTokens(text.tokens) : renderCustomText(text.text);
    }
    case 'def':
      return '';
    default: {
      const generic = token as Tokens.Generic;
      return generic.tokens ? renderTokens(generic.tokens) : renderCustomText(token.raw);
    }
  }
}

function renderTokens(tokens: Token[]): string {
  return tokens.map(renderToken).join('');
}

export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown?.trim()) return '<p></p>';
  return renderTokens(lexer(markdown) as unknown as Token[]);
}
