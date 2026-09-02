// Robust bidirectional Markdown <-> HTML converter for TipTap editor

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeLinkUrl(value: string): string {
  const url = value.trim();
  return /^(https?:|mailto:|tel:|#|\/(?!\/))/i.test(url) ? url : '#';
}

function safeImageUrl(value: string): string {
  const url = value.trim();
  const isDataImage = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(url);
  const isHttp = /^https?:\/\//i.test(url);
  const isPath = !url.startsWith('//') && !/^[a-z][a-z0-9+.-]*:/i.test(url);

  return isDataImage || isHttp || isPath ? url : '';
}

function safeHighlightColor(value: string): string {
  return /^(#[0-9a-f]{3,8}|[a-z]+|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0?\.\d+|1)\s*)?\))$/i.test(
    value.trim()
  )
    ? value.trim()
    : '#facc15';
}

export function markdownToHtml(md: string): string {
  if (!md || !md.trim()) return '<p></p>';

  const lines = md.split('\n');
  const result: string[] = [];
  
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  
  let currentListType: 'bullet' | 'ordered' | 'task' | null = null;
  let listItems: string[] = [];

  function flushList() {
    if (!currentListType || listItems.length === 0) return;
    
    if (currentListType === 'task') {
      result.push(`<ul data-type="taskList">${listItems.join('')}</ul>`);
    } else if (currentListType === 'bullet') {
      result.push(`<ul>${listItems.join('')}</ul>`);
    } else if (currentListType === 'ordered') {
      result.push(`<ol>${listItems.join('')}</ol>`);
    }
    
    currentListType = null;
    listItems = [];
  }

  function formatInline(text: string): string {
    let out = text;

    // Code: `code`
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold: **text** or __text__
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    out = out.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Strikethrough: ~~text~~
    out = out.replace(/~~([^~]+)~~/g, '<s>$1</s>');

    // Highlight: =={color:...}text== or ==text==
    out = out.replace(
      /==\{color:([^}]+)\}([^=]+)==/g,
      (_match, color, text) => {
        const safeColor = safeHighlightColor(color);
        return `<mark data-color="${escapeHtmlAttribute(safeColor)}" style="background-color: ${safeColor}">${text}</mark>`;
      }
    );
    out = out.replace(/==([^=]+)==/g, '<mark>$1</mark>');

    // Images: ![alt|align|width](url) or ![alt|width](url) or ![alt](url)
    out = out.replace(
      /!\[([^\]|]*)(\|([a-zA-Z0-9%_\-\s|]+))?\]\(([^)]+)\)/g,
      (_match, alt, _pipeGroup, sizeInfo, url) => {
        const cleanAlt = (alt || '').trim();
        let width = '';
        let align = 'center';

        if (sizeInfo) {
          const parts = sizeInfo.split('|').map((p: string) => p.trim());
          parts.forEach((p: string) => {
            if (['left', 'center', 'right'].includes(p.toLowerCase())) {
              align = p.toLowerCase();
            } else if (/^[0-9]+(%|px)?$/.test(p)) {
              width = p.endsWith('%') || p.endsWith('px') ? p : `${p}px`;
            }
          });
        }

        const safeSrc = safeImageUrl(url);
        const widthAttr = width ? ` width="${width}" style="width: ${width};"` : '';
        const alignAttr = ` data-align="${align}"`;
        return `<img src="${escapeHtmlAttribute(safeSrc)}" alt="${escapeHtmlAttribute(cleanAlt)}" class="am-editor-image"${widthAttr}${alignAttr} />`;
      }
    );

    // Links: [text](url)
    out = out.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_match, text, url) => `<a href="${escapeHtmlAttribute(safeLinkUrl(url))}">${text}</a>`
    );

    // Bracketed spaced tags: #[[tag name]]#
    out = out.replace(
      /#\[\[([^\]]+)\]\]#/g,
      (_match, p1) => {
        const cleanTag = p1.trim().toLowerCase().replace(/\s+/g, '-');
        return `<span data-tag="${escapeHtmlAttribute(cleanTag)}" class="am-tag-pill bear-tag-pill">#${escapeHtmlAttribute(p1.trim())}</span>`;
      }
    );

    // Standard tags: #tag or #category/subcategory
    out = out.replace(
      /(^|\s)#([a-zA-Z0-9_/-]+)(?=\s|$|[.,!?;:])/g,
      (_match, prefix, tag) =>
        `${prefix}<span data-tag="${escapeHtmlAttribute(tag)}" class="am-tag-pill bear-tag-pill">#${escapeHtmlAttribute(tag)}</span>`
    );

    // Wiki-links: [[Note Title]]
    out = out.replace(
      /\[\[([^\]]+)\]\]/g,
      (_match, target) =>
        `<span data-wiki-target="${escapeHtmlAttribute(target)}" class="am-wiki-link bear-wiki-link">[[ ${escapeHtmlAttribute(target)} ]]</span>`
    );

    return out;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Code Block Fence ```
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        const codeContent = codeBlockLines
          .map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
          .join('\n');
        result.push(
          `<pre><code class="${codeBlockLang ? `language-${codeBlockLang}` : ''}">${codeContent}</code></pre>`
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = '';
      } else {
        flushList();
        inCodeBlock = true;
        const requestedLang = trimmed.slice(3).trim();
        codeBlockLang = /^[a-z0-9+#.-]+$/i.test(requestedLang) ? requestedLang : '';
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // 2. Empty line
    if (!trimmed) {
      flushList();
      continue;
    }

    // 3. Horizontal Rule
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      flushList();
      result.push('<hr>');
      continue;
    }

    // 4. Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const content = formatInline(headingMatch[2]);
      result.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    // 5. Callouts: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT]
    const calloutMatch = trimmed.match(/^>\s*\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*(.*)$/i);
    if (calloutMatch) {
      flushList();
      const type = calloutMatch[1].toLowerCase();
      const firstLineContent = calloutMatch[2] ? formatInline(calloutMatch[2]) : '';
      
      const calloutLines: string[] = firstLineContent ? [firstLineContent] : [];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
        i++;
        const nextContent = lines[i].trim().replace(/^>\s*/, '');
        if (nextContent) {
          calloutLines.push(formatInline(nextContent));
        }
      }

      result.push(
        `<div data-callout-type="${type}"><p>${calloutLines.join('<br>')}</p></div>`
      );
      continue;
    }

    // 6. Blockquote: > text
    if (trimmed.startsWith('>')) {
      flushList();
      const quoteLines: string[] = [formatInline(trimmed.replace(/^>\s*/, ''))];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>') && !lines[i + 1].trim().match(/^>\s*\[!/)) {
        i++;
        quoteLines.push(formatInline(lines[i].trim().replace(/^>\s*/, '')));
      }
      result.push(`<blockquote><p>${quoteLines.join('<br>')}</p></blockquote>`);
      continue;
    }

    // 7. Task List Item: - [ ] or - [x] or * [ ] or * [x]
    const taskMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      if (currentListType !== 'task') {
        flushList();
        currentListType = 'task';
      }
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const itemContent = formatInline(taskMatch[2]);
      listItems.push(
        `<li data-type="taskItem" data-checked="${isChecked}"><p>${itemContent}</p></li>`
      );
      continue;
    }

    // 8. Bullet List Item: - text or * text or + text
    const bulletMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      if (currentListType !== 'bullet') {
        flushList();
        currentListType = 'bullet';
      }
      const itemContent = formatInline(bulletMatch[1]);
      listItems.push(`<li><p>${itemContent}</p></li>`);
      continue;
    }

    // 9. Ordered List Item: 1. text, 2. text
    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      if (currentListType !== 'ordered') {
        flushList();
        currentListType = 'ordered';
      }
      const itemContent = formatInline(orderedMatch[1]);
      listItems.push(`<li><p>${itemContent}</p></li>`);
      continue;
    }

    // 10. Table row | a | b |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      const tableLines: string[] = [trimmed];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('|') && lines[i + 1].trim().endsWith('|')) {
        i++;
        tableLines.push(lines[i].trim());
      }
      
      if (tableLines.length >= 2) {
        const rowsHtml: string[] = [];
        let isHeader = true;

        for (let r = 0; r < tableLines.length; r++) {
          const rowText = tableLines[r];
          if (/^\|[\s\-:|]+\|$/.test(rowText)) {
            isHeader = false;
            continue;
          }

          const cells = rowText
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());

          const tag = isHeader ? 'th' : 'td';
          const cellsHtml = cells
            .map((c) => `<${tag}><p>${formatInline(c)}</p></${tag}>`)
            .join('');

          rowsHtml.push(`<tr>${cellsHtml}</tr>`);
          if (isHeader) isHeader = false;
        }

        result.push(`<table><tbody>${rowsHtml.join('')}</tbody></table>`);
        continue;
      }
    }

    // 11. Standalone Image
    if (trimmed.startsWith('![') && trimmed.endsWith(')')) {
      flushList();
      result.push(formatInline(trimmed));
      continue;
    }

    // 12. Regular paragraph
    flushList();
    result.push(`<p>${formatInline(trimmed)}</p>`);
  }

  flushList();

  if (inCodeBlock && codeBlockLines.length > 0) {
    const codeContent = codeBlockLines
      .map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
      .join('\n');
    result.push(
      `<pre><code class="${codeBlockLang ? `language-${codeBlockLang}` : ''}">${codeContent}</code></pre>`
    );
  }

  return result.join('') || '<p></p>';
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
