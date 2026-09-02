// Robust bidirectional Markdown <-> HTML converter for TipTap editor
import { renderMarkdownToHtml } from './markdownAstRenderer';

export function markdownToHtml(markdown: string): string {
  return renderMarkdownToHtml(markdown);
}

export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';

  // Handle environment without DOMParser (e.g. Node.js test runner)
  if (typeof DOMParser === 'undefined' && typeof document === 'undefined') {
    let md = html;
    // Task items
    md = md.replace(/<li data-type="taskItem" data-checked="true"><p>(.*?)<\/p><\/li>/gi, '- [x] $1\n');
    md = md.replace(/<li data-type="taskItem" data-checked="false"><p>(.*?)<\/p><\/li>/gi, '- [ ] $1\n');
    md = md.replace(/<li data-type="taskItem"><p>(.*?)<\/p><\/li>/gi, '- [ ] $1\n');
    md = md.replace(/<ul data-type="taskList">([\s\S]*?)<\/ul>/gi, '$1\n');
    // Bullet items
    md = md.replace(/<li><p>(.*?)<\/p><\/li>/gi, '- $1\n');
    md = md.replace(/<ul>([\s\S]*?)<\/ul>/gi, '$1\n');
    // Paragraphs & headers
    md = md.replace(/<h1>(.*?)<\/h1>/gi, '\n# $1\n');
    md = md.replace(/<h2>(.*?)<\/h2>/gi, '\n## $1\n');
    md = md.replace(/<h3>(.*?)<\/h3>/gi, '\n### $1\n');
    md = md.replace(/<p>(.*?)<\/p>/gi, '\n$1\n');
    // Marks
    md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
    md = md.replace(/<s>(.*?)<\/s>/gi, '~~$1~~');
    md = md.replace(/<mark[^>]*data-color="([^"]+)"[^>]*>(.*?)<\/mark>/gi, '=={color:$1}$2==');
    md = md.replace(/<mark[^>]*style="[^"]*background-color:\s*([^;"]+)[^"]*"[^>]*>(.*?)<\/mark>/gi, '=={color:$1}$2==');
    md = md.replace(/<mark>(.*?)<\/mark>/gi, '==$1==');
    // Images
    md = md.replace(/<img([^>]*)>/gi, (_match, attrs) => {
      const srcMatch = attrs.match(/src="([^"]+)"/i);
      if (!srcMatch) return '';
      const src = srcMatch[1];

      const altMatch = attrs.match(/alt="([^"]*)"/i);
      const widthMatch = attrs.match(/width="([^"]*)"/i) || attrs.match(/style="[^"]*width:\s*([^;"]+)[^"]*"/i);
      const alignMatch = attrs.match(/data-align="([^"]*)"/i);

      const alt = altMatch ? altMatch[1] : '';
      const width = widthMatch ? widthMatch[1].replace(/px$/, '') : '';
      const align = alignMatch ? alignMatch[1] : '';

      const parts: string[] = [];
      if (alt) parts.push(alt);
      if (align && align !== 'center') parts.push(align);
      if (width && width !== '100%') parts.push(width);

      const meta = parts.length > 0 ? parts.join('|') : '';
      return `![${meta}](${src})`;
    });
    md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');
    md = md.replace(/<span data-tag="(.*?)">.*?<\/span>/gi, '#$1');
    md = md.replace(/<span data-wiki-target="(.*?)">.*?<\/span>/gi, '[[$1]]');
    return md.replace(/\n{3,}/g, '\n\n').trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function serializeNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Check tag pill
    if (el.getAttribute('data-tag')) {
      return `#${el.getAttribute('data-tag')}`;
    }

    // Check wiki link
    if (el.getAttribute('data-wiki-target')) {
      return `[[${el.getAttribute('data-wiki-target')}]]`;
    }

    // Check Callout
    if (el.getAttribute('data-callout-type')) {
      const type = (el.getAttribute('data-callout-type') || 'NOTE').toUpperCase();
      const inner = Array.from(el.childNodes)
        .map(serializeNode)
        .join('')
        .trim();
      const calloutLines = inner.split('\n').filter(Boolean);
      return `\n\n> [!${type}]\n` + calloutLines.map((l) => `> ${l}`).join('\n') + '\n\n';
    }

    const getChildren = () =>
      Array.from(el.childNodes)
        .map(serializeNode)
        .join('');

    switch (tag) {
      case 'h1':
        return `\n\n# ${getChildren().trim()}\n\n`;
      case 'h2':
        return `\n\n## ${getChildren().trim()}\n\n`;
      case 'h3':
        return `\n\n### ${getChildren().trim()}\n\n`;
      case 'h4':
        return `\n\n#### ${getChildren().trim()}\n\n`;
      case 'h5':
        return `\n\n##### ${getChildren().trim()}\n\n`;
      case 'h6':
        return `\n\n###### ${getChildren().trim()}\n\n`;
      case 'strong':
      case 'b':
        return `**${getChildren()}**`;
      case 'em':
      case 'i':
        return `*${getChildren()}*`;
      case 's':
      case 'del':
      case 'strike':
        return `~~${getChildren()}~~`;
      case 'mark': {
        const color = el.getAttribute('data-color') || el.style.backgroundColor;
        if (color) {
          return `=={color:${color}}${getChildren()}==`;
        }
        return `==${getChildren()}==`;
      }
      case 'code': {
        if (el.parentElement?.tagName.toLowerCase() === 'pre') {
          return el.textContent || '';
        }
        return `\`${getChildren()}\``;
      }
      case 'pre': {
        const codeEl = el.querySelector('code');
        const langMatch = codeEl?.className.match(/language-([a-zA-Z0-9_-]+)/);
        const lang = langMatch ? langMatch[1] : '';
        const content = codeEl ? codeEl.textContent || '' : el.textContent || '';
        return `\n\n\`\`\`${lang}\n${content.trim()}\n\`\`\`\n\n`;
      }
      case 'blockquote': {
        const inner = getChildren().trim();
        const lines = inner.split('\n').filter(Boolean);
        return `\n\n` + lines.map((l) => `> ${l}`).join('\n') + `\n\n`;
      }
      case 'ul': {
        if (el.getAttribute('data-type') === 'taskList') {
          const items = Array.from(el.children)
            .map((li) => serializeNode(li))
            .join('');
          return `\n\n${items.trim()}\n\n`;
        }
        const items = Array.from(el.children)
          .map((li) => serializeNode(li))
          .join('');
        return `\n\n${items.trim()}\n\n`;
      }
      case 'ol': {
        let idx = 1;
        const items = Array.from(el.children)
          .map((li) => {
            const itemText = Array.from(li.childNodes).map(serializeNode).join('').trim();
            const res = `${idx}. ${itemText}\n`;
            idx++;
            return res;
          })
          .join('');
        return `\n\n${items.trim()}\n\n`;
      }
      case 'li': {
        if (el.getAttribute('data-type') === 'taskItem') {
          const isChecked =
            el.getAttribute('data-checked') === 'true' ||
            (el.querySelector('input[type="checkbox"]') as HTMLInputElement)?.checked === true;
          
          const pEl = el.querySelector('p');
          const itemText = pEl
            ? Array.from(pEl.childNodes).map(serializeNode).join('').trim()
            : Array.from(el.childNodes)
                .filter((n) => (n as HTMLElement).tagName?.toLowerCase() !== 'label')
                .map(serializeNode)
                .join('')
                .trim();

          return `- [${isChecked ? 'x' : ' '}] ${itemText}\n`;
        }

        const itemText = Array.from(el.childNodes).map(serializeNode).join('').trim();
        return `- ${itemText}\n`;
      }
      case 'table': {
        const rows = Array.from(el.querySelectorAll('tr'));
        if (rows.length === 0) return '';

        const tableMarkdownRows: string[] = [];
        let hasHeader = false;

        rows.forEach((tr, rIdx) => {
          const ths = Array.from(tr.querySelectorAll('th'));
          const tds = Array.from(tr.querySelectorAll('td'));
          const cells = ths.length > 0 ? ths : tds;
          
          if (ths.length > 0) hasHeader = true;

          const cellTexts = cells.map((c) =>
            Array.from(c.childNodes).map(serializeNode).join('').replace(/\n/g, ' ').trim()
          );

          tableMarkdownRows.push(`| ${cellTexts.join(' | ')} |`);

          if (rIdx === 0 && (hasHeader || rows.length > 1)) {
            const sep = cells.map(() => '---').join(' | ');
            tableMarkdownRows.push(`| ${sep} |`);
          }
        });

        return `\n\n${tableMarkdownRows.join('\n')}\n\n`;
      }
      case 'p':
        return `\n\n${getChildren().trim()}`;
      case 'br':
        return '\n';
      case 'hr':
        return '\n\n---\n\n';
      case 'img': {
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || '';
        const width = el.getAttribute('width') || el.style.width || '';
        const align = el.getAttribute('data-align') || '';

        const metaParts: string[] = [];
        if (alt) metaParts.push(alt);
        if (align && align !== 'center') metaParts.push(align);
        if (width && width !== '100%') metaParts.push(width.replace(/px$/, ''));

        const altWithMeta = metaParts.length > 0 ? metaParts.join('|') : alt;
        return `\n\n![${altWithMeta}](${src})\n\n`;
      }
      case 'a':
        return `[${getChildren()}](${el.getAttribute('href') || ''})`;
      case 'span': {
        const wikiTarget = el.getAttribute('data-wiki-target');
        if (wikiTarget) {
          return `[[${wikiTarget}]]`;
        }
        const tag = el.getAttribute('data-tag');
        if (tag) {
          if (tag.includes('-') || tag.includes(' ')) {
            return `#[[${el.textContent?.replace(/^#/, '').trim()}]]#`;
          }
          return `#${tag}`;
        }
        return getChildren();
      }
      default:
        return getChildren();
    }
  }

  const rawMarkdown = Array.from(doc.body.childNodes)
    .map(serializeNode)
    .join('');

  return rawMarkdown.replace(/\n{3,}/g, '\n\n').trim();
}
