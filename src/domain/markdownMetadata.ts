const bracketTagRegex = /#\[\[([^\]]+)\]\]#/g;
const standardTagRegex = /(?:^|\s)#([a-zA-Z0-9_/-]+)(?=\s|$|[.,!?;:])/g;
const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;

export function extractTagsFromContent(content: string): string[] {
  const tags = new Set<string>();

  // Spaced tags: #[[tag name]]#
  for (const match of content.matchAll(bracketTagRegex)) {
    const tag = match[1].trim().toLowerCase().replace(/\s+/g, '-');
    if (tag) tags.add(tag);
  }

  // Standard tags: #tag, #category/subcategory, or #work/projects/2026
  for (const match of content.matchAll(standardTagRegex)) {
    const tag = match[1].trim().toLowerCase();
    if (tag && !/^\d+$/.test(tag) && !tag.startsWith('/')) {
      tags.add(tag);
    }
  }

  return Array.from(tags);
}

export function extractWikiLinksFromContent(content: string): string[] {
  const links = new Set<string>();

  for (const match of content.matchAll(wikiLinkRegex)) {
    const title = match[1].trim();
    if (title) links.add(title);
  }

  return Array.from(links);
}
