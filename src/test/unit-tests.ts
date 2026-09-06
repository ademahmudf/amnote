import {
  extractTagsFromContent,
  extractWikiLinksFromContent,
} from '../domain/markdownMetadata';
import { markdownToHtml, defaultMarkdownCodec } from '../editor/utils/markdownCodec';
import { syntaxTokens } from '../domain/syntaxTokens';
import { initialAmNoteSeed } from '../db/vaultAdapter';
import { mergeVaultNotes } from '../domain/vaultSync';
import { diffLines } from '../domain/textDiff';
import { NoteSearchIndex } from '../domain/searchIndex';
import {
  addDaysISO,
  createDailyNoteContent,
  extractDateLinks,
  getCalendarDayEntries,
  getMonthGrid,
  isValidISODate,
  todayISO,
} from '../domain/calendarDates';
import {
  getDueTasks,
  getTasksDueOn,
  isTaskOverdue,
  parseTaskDueItems,
  setTaskDueToken,
} from '../domain/taskDueDates';
import type { Note } from '../types/note';
import { cleanSnippet } from '../components/notelist/NoteCard';
import { THEMES } from '../themes/themeDefinitions';
import { useUIStore } from '../store/useUIStore';
import { VaultSyncCoordinator, type VaultAdapterPort } from '../domain/vaultSyncCoordinator';
import {
  detectSlashCommand,
  detectWikiLink,
  clampZoom,
  calculateNoteMetrics,
} from '../editor/utils/editorTriggers';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('Running AmNote Unit Tests...\n');

// Test 1: Nested Tag Parsing
const testText1 = `# Welcome to AmNote
Let's test #welcome and #guide/basics and #work/sprint/q3.
Also here is #ideas/apps and a duplicate #welcome!`;

const tags1 = extractTagsFromContent(testText1);
assert(tags1.includes('welcome'), 'Extracts root tag #welcome');
assert(tags1.includes('guide/basics'), 'Extracts 2-level nested tag #guide/basics');
assert(tags1.includes('work/sprint/q3'), 'Extracts 3-level nested tag #work/sprint/q3');
assert(tags1.includes('ideas/apps'), 'Extracts #ideas/apps');
assert(tags1.length === 4, `Expected 4 unique tags, got ${tags1.length}`);

// Test 2: Spaced Tags #[[tag name]]#
const testText2 = `Here is a spaced tag #[[Omarchy Linux]]# and another #[[Sprint Goals 2026]]#.`;
const tags2 = extractTagsFromContent(testText2);
assert(tags2.includes('omarchy-linux'), 'Extracts bracket tag #[[Omarchy Linux]]#');
assert(tags2.includes('sprint-goals-2026'), 'Extracts bracket tag #[[Sprint Goals 2026]]#');

// Test 2b: Tags with numbers and hyphens (e.g. #tag-1)
const testTextTagNumber = `Testing tag with number #tag-1 and #release-v2 and #sprint-10`;
const tagsNumber = extractTagsFromContent(testTextTagNumber);
assert(tagsNumber.includes('tag-1'), 'Extracts tag with number #tag-1');
assert(tagsNumber.includes('release-v2'), 'Extracts #release-v2');
assert(tagsNumber.includes('sprint-10'), 'Extracts #sprint-10');

// Test 3: Wiki-Links Parsing
const testText3 = `Read [[Welcome to AmNote]] and check [[Markdown Cheatsheet]] for syntax!`;
const links = extractWikiLinksFromContent(testText3);
assert(links.includes('Welcome to AmNote'), 'Extracts [[Welcome to AmNote]]');
assert(links.includes('Markdown Cheatsheet'), 'Extracts [[Markdown Cheatsheet]]');
assert(links.length === 2, `Expected 2 links, got ${links.length}`);

// Test 4: False Positive Tag Rejections
const testText4 = `# Main Header\n## Subheader\nPrice is #100 dollars`;
const tags4 = extractTagsFromContent(testText4);
assert(tags4.length === 0, `Expected 0 tags from headers and numeric tokens, got ${tags4.length}`);

// Test 5: Bullet List Conversion (Markdown -> HTML)
const bulletMd = `- First item\n- Second item\n- Third item with **bold**`;
const bulletHtml = markdownToHtml(bulletMd);
assert(bulletHtml.includes('<ul>'), 'Bullet list converts to <ul>');
assert(bulletHtml.includes('<li><p>First item</p></li>'), 'Bullet list includes first item');
assert(bulletHtml.includes('<strong>bold</strong>'), 'Bullet list preserves bold formatting');

// Test 6: Task List Conversion (Markdown -> HTML)
const taskMd = `- [x] Completed task\n- [ ] Pending task\n* [x] Another completed`;
const taskHtml = markdownToHtml(taskMd);
assert(taskHtml.includes('<ul data-type="taskList">'), 'Task list converts to <ul data-type="taskList">');
assert(taskHtml.includes('<li data-type="taskItem" data-checked="true"><p>Completed task</p></li>'), 'Checked task converts to data-checked="true"');
assert(taskHtml.includes('<li data-type="taskItem" data-checked="false"><p>Pending task</p></li>'), 'Pending task converts to data-checked="false"');

// Test 7: Ordered List Conversion (Markdown -> HTML)
const orderedMd = `1. Step one\n2. Step two\n3. Step three`;
const orderedHtml = markdownToHtml(orderedMd);
assert(orderedHtml.includes('<ol>'), 'Ordered list converts to <ol>');
assert(orderedHtml.includes('<li><p>Step one</p></li>'), 'Ordered list contains step one');

// Test 8: Markdown round-trip for Task & Bullet Lists via ProseMirror Codec
const taskListMd = `- [x] Ship AmNote\n- [ ] Write Docs`;
const taskListDoc = defaultMarkdownCodec.markdownToDoc(taskListMd);
const backToMd = defaultMarkdownCodec.docToMarkdown(taskListDoc);
assert(backToMd.includes('- [x] Ship AmNote'), 'Round-trip checked task item through ProseMirror');
assert(backToMd.includes('- [ ] Write Docs'), 'Round-trip unchecked task item through ProseMirror');

// Test 9: Custom Highlight Color Round-Trip
const customHighlightMd = `Here is =={color:#bbf7d0}mint green highlight== and standard ==yellow highlight==.`;
const customHighlightHtml = markdownToHtml(customHighlightMd);
assert(customHighlightHtml.includes('style="background-color: #bbf7d0"'), 'Preserves custom highlight color in HTML');
assert(customHighlightHtml.includes('<mark>yellow highlight</mark>'), 'Converts standard highlight to <mark>');

const customBackToMd = defaultMarkdownCodec.roundTrip(customHighlightMd);
assert(customBackToMd.includes('=={color:#bbf7d0}mint green highlight=='), 'Round-trips custom color highlight to markdown');
assert(customBackToMd.includes('==yellow highlight=='), 'Round-trips standard highlight to markdown');

// Test 10: Image Markdown Conversion Round-Trip
const imageMd = `Here is an image:\n\n![AmNote Screenshot](https://example.com/screenshot.png)\n\nAnd local image:\n\n![Diagram](data:image/png;base64,iVBORw0KGgo=)`;
const imageHtml = markdownToHtml(imageMd);
assert(imageHtml.includes('<img src="https://example.com/screenshot.png" alt="AmNote Screenshot"'), 'Converts markdown image to <img> tag');
assert(imageHtml.includes('src="data:image/png;base64,iVBORw0KGgo="'), 'Preserves data URL in <img> tag');

const imageBackToMd = defaultMarkdownCodec.roundTrip(imageMd);
assert(imageBackToMd.includes('![AmNote Screenshot](https://example.com/screenshot.png)'), 'Round-trips web image markdown');
assert(imageBackToMd.includes('![Diagram](data:image/png;base64,iVBORw0KGgo=)'), 'Round-trips base64 image markdown');

// Test 11: Resized and Aligned Image Round-Trip
const resizedMd = `![Graph|left|50%](https://example.com/graph.png)\n\n![Banner|75%](https://example.com/banner.png)`;
const resizedHtml = markdownToHtml(resizedMd);
assert(resizedHtml.includes('width="50%"'), 'Converts percentage width to width attribute');
assert(resizedHtml.includes('data-align="left"'), 'Converts left alignment to data-align attribute');

const resizedBackToMd = defaultMarkdownCodec.roundTrip(resizedMd);
assert(resizedBackToMd.includes('![Graph|left|50%](https://example.com/graph.png)'), 'Round-trips aligned & resized image markdown');
assert(resizedBackToMd.includes('![Banner|75%](https://example.com/banner.png)'), 'Round-trips resized image markdown');

// Test 11b: Syntax Tokens Registry
assert(syntaxTokens.highlight.format('mint', '#bbf7d0') === '=={color:#bbf7d0}mint==', 'Formats colored highlight token');
assert(syntaxTokens.highlight.format('plain') === '==plain==', 'Formats standard highlight token');
assert(syntaxTokens.tag.format('work') === '#work', 'Formats simple tag token');
assert(syntaxTokens.tag.format('Sprint Goals') === '#[[Sprint Goals]]#', 'Formats spaced tag token');
assert(syntaxTokens.annotation.format('test', 'circle') === '~circle:test~', 'Formats annotation token');
assert(syntaxTokens.wikiLink.format('Notes') === '[[Notes]]', 'Formats wikiLink token');
assert(syntaxTokens.taskDue.format('2026-09-10') === '@due(2026-09-10)', 'Formats taskDue token');

// Test 11c: Tag HTML Rendering Regression Test
const tagHtml = markdownToHtml('Check out #guide/welcome and #todo');
assert(tagHtml.includes('data-tag="guide/welcome"'), 'Renders standard tag with data-tag attribute');
assert(tagHtml.includes('class="am-tag-pill bear-tag-pill"'), 'Renders standard tag with tag pill class');

// Test 12: Initial AmNote Seed verification
assert(initialAmNoteSeed.length === 3, 'Initial seed has 3 notes');
assert(initialAmNoteSeed[0].title === 'Welcome to AmNote', 'First note is Welcome to AmNote');
for (const seedNote of initialAmNoteSeed) {
  const renderedHtml = markdownToHtml(seedNote.content);
  assert(Boolean(renderedHtml && renderedHtml.length > 0), `Seed note "${seedNote.title}" renders valid non-empty HTML`);
}

// ============================================================================
// Test 13: Direct ProseMirror AST Serializer Tests
// ============================================================================
import { Schema } from '@tiptap/pm/model';
import { serializeProseMirrorToMarkdown } from '../editor/utils/proseMirrorMarkdownSerializer';

const testSchema = new Schema({
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
      attrs: { src: {}, alt: { default: '' }, width: { default: '' }, align: { default: 'center' } },
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

// AST Test 1: Heading + Paragraph + Bold/Italic
const doc1 = testSchema.nodes.doc.create({}, [
  testSchema.nodes.heading.create({ level: 2 }, [testSchema.text('ProseMirror AST Architecture')]),
  testSchema.nodes.paragraph.create({}, [
    testSchema.text('Building with '),
    testSchema.text('high performance', [testSchema.marks.bold.create()]),
    testSchema.text(' and '),
    testSchema.text('elegance', [testSchema.marks.italic.create()]),
    testSchema.text('.'),
  ]),
]);

const md1 = serializeProseMirrorToMarkdown(doc1);
assert(md1.includes('## ProseMirror AST Architecture'), 'AST Serializer creates H2 heading');
assert(md1.includes('**high performance** and *elegance*.'), 'AST Serializer handles bold & italic marks');

// AST Test 2: TaskList with checked & unchecked items
const doc2 = testSchema.nodes.doc.create({}, [
  testSchema.nodes.taskList.create({}, [
    testSchema.nodes.taskItem.create({ checked: true }, [
      testSchema.nodes.paragraph.create({}, [testSchema.text('Direct AST serializer')]),
    ]),
    testSchema.nodes.taskItem.create({ checked: false }, [
      testSchema.nodes.paragraph.create({}, [testSchema.text('FTS5 Rust indexer')]),
    ]),
  ]),
]);

const md2 = serializeProseMirrorToMarkdown(doc2);
assert(md2.includes('- [x] Direct AST serializer'), 'AST Serializer handles checked taskItem');
assert(md2.includes('- [ ] FTS5 Rust indexer'), 'AST Serializer handles unchecked taskItem');

// AST Test 3: Callout Block (> [!TIP])
const doc3 = testSchema.nodes.doc.create({}, [
  testSchema.nodes.callout.create({ type: 'tip' }, [
    testSchema.nodes.paragraph.create({}, [testSchema.text('AST traversal is 10x faster than DOM parsing.')]),
  ]),
]);

const md3 = serializeProseMirrorToMarkdown(doc3);
assert(md3.includes('> [!TIP]'), 'AST Serializer renders callout header');
assert(md3.includes('> AST traversal is 10x faster than DOM parsing.'), 'AST Serializer renders callout body');

// AST Test 4: Custom Highlight Color + Spaced Tag + WikiLink
const doc4 = testSchema.nodes.doc.create({}, [
  testSchema.nodes.paragraph.create({}, [
    testSchema.text('Check this ', []),
    testSchema.text('sky blue highlight', [testSchema.marks.highlight.create({ color: '#38bdf8' })]),
    testSchema.text(' with tag '),
    testSchema.text('#[[Omarchy Core]]#', [testSchema.marks.tag.create({ tag: 'Omarchy Core' })]),
    testSchema.text(' and '),
    testSchema.text('[[Sprint Goals]]', [testSchema.marks.wikiLink.create({ target: 'Sprint Goals' })]),
  ]),
]);

const md4 = serializeProseMirrorToMarkdown(doc4);
assert(md4.includes('=={color:#38bdf8}sky blue highlight=='), 'AST Serializer formats custom color highlight');
assert(md4.includes('#[[Omarchy Core]]#'), 'AST Serializer formats spaced bracket tag');
assert(md4.includes('[[Sprint Goals]]'), 'AST Serializer formats cross-note WikiLink');

// AST Test 4b: Annotation Mark Serialization (~wavy:text~)
const docAnnot = testSchema.nodes.doc.create({}, [
  testSchema.nodes.paragraph.create({}, [
    testSchema.text('Here is '),
    testSchema.text('hand-drawn wave', [testSchema.marks.annotation.create({ variant: 'wavy' })]),
    testSchema.text(' and '),
    testSchema.text('circled point', [testSchema.marks.annotation.create({ variant: 'circle' })]),
    testSchema.text('.'),
  ]),
]);
const mdAnnot = serializeProseMirrorToMarkdown(docAnnot);
assert(mdAnnot.includes('~wavy:hand-drawn wave~'), 'AST Serializer formats ~wavy:text~ annotation');
assert(mdAnnot.includes('~circle:circled point~'), 'AST Serializer formats ~circle:text~ annotation');

// AST Test 5: Table Grid Serialization
const doc5 = testSchema.nodes.doc.create({}, [
  testSchema.nodes.table.create({}, [
    testSchema.nodes.tableRow.create({}, [
      testSchema.nodes.tableHeader.create({}, [testSchema.text('Feature')]),
      testSchema.nodes.tableHeader.create({}, [testSchema.text('Status')]),
    ]),
    testSchema.nodes.tableRow.create({}, [
      testSchema.nodes.tableCell.create({}, [testSchema.text('AST Serializer')]),
      testSchema.nodes.tableCell.create({}, [testSchema.text('Production Ready')]),
    ]),
  ]),
]);

const md5 = serializeProseMirrorToMarkdown(doc5);
assert(md5.includes('| Feature | Status |'), 'AST Serializer creates table header row');
assert(md5.includes('| --- | --- |'), 'AST Serializer creates table delimiter row');
assert(md5.includes('| AST Serializer | Production Ready |'), 'AST Serializer creates table data row');

// ============================================================================
// Test 14: Tag Auto-Capitalization in Sidebar and UI
// ============================================================================
import { formatTagDisplay, formatTagSegment, getTagIconSvgString, getTagIconDataUrl, clearTagIconSvgCache, hasSpecificTagIcon } from '../utils/tagIcons';

assert(formatTagSegment('welcome') === 'Welcome', 'Capitalizes simple segment "welcome" -> "Welcome"');
assert(formatTagSegment('omarchy-linux') === 'Omarchy Linux', 'Capitalizes hyphenated segment "omarchy-linux" -> "Omarchy Linux"');
assert(formatTagSegment('deep_work') === 'Deep Work', 'Capitalizes underscored segment "deep_work" -> "Deep Work"');
assert(formatTagDisplay('guide/basics') === 'Guide / Basics', 'Capitalizes nested tag path "guide/basics" -> "Guide / Basics"');
assert(formatTagDisplay('work/sprint/q3') === 'Work / Sprint / Q3', 'Capitalizes 3-level path "work/sprint/q3" -> "Work / Sprint / Q3"');

// Test Tag Icon SVG string generation
const workSvg = getTagIconSvgString('work');
assert(workSvg.includes('<svg') && workSvg.includes('lucide-briefcase'), 'Generates valid SVG string for auto-matched tag icon');
assert(workSvg.includes('width="0.9em"') && workSvg.includes('height="0.9em"'), 'Default icon size uses proportional 0.9em scaling');

const customRocketSvg = getTagIconSvgString('anytag', 'Rocket');
assert(customRocketSvg.includes('<svg') && customRocketSvg.includes('lucide-rocket'), 'Generates valid SVG string for custom configured tag icon');

const cachedSvg = getTagIconSvgString('work');
assert(cachedSvg === workSvg, 'Returns cached SVG string on repeated calls');

// Test Tag Icon Data URL generation for embedded pseudo-element
const workDataUrl = getTagIconDataUrl('work');
assert(workDataUrl.startsWith('data:image/svg+xml,'), 'Generates valid data URL for tag icon');
assert(workDataUrl.includes('lucide-briefcase'), 'Data URL contains icon name');

clearTagIconSvgCache();
const postClearSvg = getTagIconSvgString('work');
assert(postClearSvg === workSvg, 'Regenerates identical SVG after cache clear');
const postClearDataUrl = getTagIconDataUrl('work');
assert(postClearDataUrl === workDataUrl, 'Regenerates identical data URL after cache clear');

const coloredSvg = getTagIconSvgString('travel', undefined, '0.9em', '#3b82f6');
assert(coloredSvg.includes('color:#3b82f6') || coloredSvg.includes('color: #3b82f6'), 'Applies custom color to tag SVG');

// Test hasSpecificTagIcon differentiation between distinctive icons and fallback Hash
assert(hasSpecificTagIcon('work') === true, 'Recognizes auto-matched icon for "work"');
assert(hasSpecificTagIcon('ideas') === true, 'Recognizes auto-matched icon for "ideas"');
assert(hasSpecificTagIcon('tag/tags') === true, 'Recognizes auto-matched Tag icon for "tag/tags"');
assert(hasSpecificTagIcon('randomtag') === true, 'Provides Tag icon for generic tags');
assert(hasSpecificTagIcon('randomtag', 'Rocket') === true, 'Recognizes custom configured icon "Rocket"');
assert(hasSpecificTagIcon('work', 'Hash') === false, 'Recognizes explicitly set Hash as non-specific');

// ============================================================================
// Test 15: Conflict-safe vault reconciliation
// ============================================================================
function makeConflictNote(id: string, content: string, updatedAt = 1): Note {
  return {
    id,
    title: `Note ${id}`,
    content,
    tags: [],
    isPinned: false,
    isArchived: false,
    isTrashed: false,
    isLocked: false,
    createdAt: 1,
    updatedAt,
  };
}

const localNotes = [
  makeConflictNote('clean', 'disk version', 2),
  makeConflictNote('dirty', 'local edit', 3),
  makeConflictNote('deleted', 'local deletion survivor', 4),
];
const diskNotes = [
  makeConflictNote('clean', 'external metadata update', 5),
  makeConflictNote('dirty', 'external edit', 6),
];

const synced = mergeVaultNotes({
  localNotes,
  diskNotes,
  dirtyNoteIds: { dirty: true, deleted: true },
});

assert(synced.conflicts.length === 2, 'Vault merge detects content and deletion conflicts');
assert(synced.notes.find((note) => note.id === 'clean')?.content === 'external metadata update', 'Vault merge accepts clean external updates');
assert(synced.notes.find((note) => note.id === 'dirty')?.content === 'local edit', 'Vault merge preserves conflicting local edits');
assert(synced.conflicts.some((conflict) => conflict.noteId === 'dirty' && conflict.diskNote?.content === 'external edit'), 'Vault merge keeps the disk version available for conflict resolution');
assert(synced.conflicts.some((conflict) => conflict.noteId === 'deleted' && !conflict.diskNote), 'Vault merge detects locally dirty notes deleted on disk');

const unsafeMarkdownHtml = markdownToHtml('[click](javascript:alert(1)) ![x](javascript:alert(1))');
assert(!unsafeMarkdownHtml.includes('javascript:'), 'Markdown HTML conversion blocks javascript URLs');
assert(unsafeMarkdownHtml.includes('href="#"'), 'Unsafe Markdown links fall back to an inert href');
assert(markdownToHtml('![x](amnote-asset://note-abc/image-png)').includes('amnote-asset://note-abc/image-png'), 'Markdown renderer permits managed attachment URLs');

const diff = diffLines('one\ntwo\nthree\nfour', 'one\n2\nthree\nfour\nfive');
assert(diff.some((line) => line.type === 'removed' && line.text === 'two'), 'Diff marks lines removed from the local version');
assert(diff.some((line) => line.type === 'added' && line.text === '2'), 'Diff marks lines added on disk');
assert(diff.some((line) => line.type === 'added' && line.text === 'five'), 'Diff marks suffix additions');
assert(diff.filter((line) => line.type === 'equal' && line.text === 'three').length === 1, 'Diff preserves unchanged context');

const searchIndex = new NoteSearchIndex();
const searchableNote = makeConflictNote('searchable', 'Discussed quantum storage and backup safety', 2);
searchableNote.title = 'Vault Architecture';
searchableNote.tags = ['guide/search'];
const otherNote = makeConflictNote('other', 'Unrelated grocery list', 10);
searchIndex.sync([searchableNote, otherNote]);

assert(searchIndex.search([searchableNote, otherNote], 'quantum')[0]?.id === 'searchable', 'Search index ranks matching content');
assert(searchIndex.search([searchableNote, otherNote], '#guide')[0]?.id === 'searchable', 'Search index supports tag queries');
assert(searchIndex.search([searchableNote, otherNote], '@pinned').length === 0, 'Search index supports structured pinned queries');
searchIndex.add(makeConflictNote('searchable', 'Replaced note content', 3));
assert(searchIndex.search([searchableNote, otherNote], 'quantum').length === 0, 'Search index replaces changed documents');

// Incremental sync: a new array where only one note object changed (the
// per-keystroke store update shape) must refresh that note without going stale.
const incrementalIndex = new NoteSearchIndex();
incrementalIndex.sync([searchableNote, otherNote]);
const editedSearchable: Note = { ...searchableNote, content: 'Totally rewritten content here', updatedAt: 99 };
incrementalIndex.sync([editedSearchable, otherNote]);
assert(incrementalIndex.search([editedSearchable, otherNote], 'quantum').length === 0, 'Incremental sync drops stale terms of the edited note');
assert(incrementalIndex.search([editedSearchable, otherNote], 'rewritten')[0]?.id === 'searchable', 'Incremental sync indexes new terms of the edited note');
assert(incrementalIndex.search([editedSearchable, otherNote], 'grocery')[0]?.id === 'other', 'Incremental sync keeps the untouched note searchable');

// ============================================================================
// Test 16: Tag Icon & Color Sync and Conflict Reconciliation
// ============================================================================
import {
  normalizeTagKey,
  mergeTagMetadataMaps,
  extractFlatTagIcons,
  extractFlatTagColors,
  buildTagMetadataUpdate,
  seedTagMetadataFromFlat,
} from '../domain/tagMetadata';

assert(normalizeTagKey('#work/sprint') === 'work/sprint', 'Normalizes tag with hash');
assert(normalizeTagKey('###Ideas') === 'ideas', 'Normalizes multiple hashes and uppercase');

// Test disjoint sets merge cleanly (e.g. Mac configured #work, Linux configured #code)
const macTags = {
  work: { icon: 'Briefcase', color: '#3b82f6', updatedAt: 100 },
};
const linuxTags = {
  code: { icon: 'Code', color: '#10b981', updatedAt: 120 },
};
const mergedTags = mergeTagMetadataMaps(macTags, linuxTags);
assert(mergedTags.work?.icon === 'Briefcase', 'Merged tags contain Mac tag');
assert(mergedTags.code?.icon === 'Code', 'Merged tags contain Linux tag');

// Test timestamp conflict resolution (Mac edits #work at t=200, Linux had it at t=100)
const olderLinuxWork = {
  work: { icon: 'Folder', color: '#999999', updatedAt: 100 },
};
const newerMacWork = {
  work: { icon: 'Briefcase', color: '#3b82f6', updatedAt: 200 },
};
const reconciledNewer = mergeTagMetadataMaps(olderLinuxWork, newerMacWork);
assert(reconciledNewer.work?.icon === 'Briefcase', 'Newer timestamp wins in conflict resolution');
assert(reconciledNewer.work?.color === '#3b82f6', 'Newer color wins in conflict resolution');

// Test tombstone propagation (Mac deleted icon with t=300, Linux had icon with t=200)
const deletedMacWork = {
  work: { icon: null, color: '#3b82f6', updatedAt: 300 },
};
const reconciledDeletion = mergeTagMetadataMaps(reconciledNewer, deletedMacWork);
assert(reconciledDeletion.work?.icon === null, 'Tombstone correctly removes icon when newer');
const flatIcons = extractFlatTagIcons(reconciledDeletion);
assert(flatIcons.work === undefined, 'Tombstone icon is omitted from flat icon dictionary');
const flatColors = extractFlatTagColors(reconciledDeletion);
assert(flatColors.work === '#3b82f6', 'Preserves color when only icon was removed');

// Test building updates and legacy seed
const built = buildTagMetadataUpdate('projects', {}, { icon: 'Rocket', color: '#ec4899', updatedAt: 500 });
assert(built.projects.icon === 'Rocket' && built.projects.color === '#ec4899', 'buildTagMetadataUpdate builds valid tag item');

const seeded = seedTagMetadataFromFlat({ travel: 'Plane' }, { travel: '#f59e0b' }, 1000);
assert(seeded.travel.icon === 'Plane' && seeded.travel.color === '#f59e0b' && seeded.travel.updatedAt === 1000, 'seedTagMetadataFromFlat correctly seeds metadata map');

// Test Notification Store and cn utility
import { useNotificationStore, notify } from '../store/useNotificationStore';
import { cn } from '../utils/cn';

assert(cn('px-2', 'py-1', { 'text-red-500': true, 'hidden': false }) === 'px-2 py-1 text-red-500', 'cn utility merges classes properly');
assert(cn('px-2', 'px-4') === 'px-4', 'cn utility overrides conflicting tailwind classes');

notify({
  title: 'Test Notification',
  sender: 'Jest/Tsx',
  message: 'Testing apple notification banner store',
  type: 'success',
  durationMs: 0,
});

const notifState = useNotificationStore.getState().notification;
assert(notifState !== null, 'Notification store records active notification');
assert(notifState?.title === 'Test Notification', 'Notification title matches');
assert(notifState?.sender === 'Jest/Tsx', 'Notification sender matches');
assert(notifState?.type === 'success', 'Notification type matches');

useNotificationStore.getState().dismissNotification();
assert(useNotificationStore.getState().notification === null, 'Notification store clears on dismiss');

let actionClicked: boolean = false;
notify({
  title: 'Action Notification',
  message: 'Testing action button',
  type: 'warning',
  action: {
    label: 'Review',
    onClick: () => {
      actionClicked = true;
    },
  },
  durationMs: 0,
});
const actionNotif = useNotificationStore.getState().notification;
assert(actionNotif?.action?.label === 'Review', 'Notification records action button label');
actionNotif?.action?.onClick();
assert(Boolean(actionClicked), 'Notification action onClick triggers correctly');
useNotificationStore.getState().dismissNotification();

// Test Hand-Drawn Annotation Markdown <-> HTML
const mdAnnotationWavy = 'This has ~wavy:hand-drawn text~ in it.';
const htmlAnnotationWavy = markdownToHtml(mdAnnotationWavy);
assert(htmlAnnotationWavy.includes('data-annotation="wavy"'), 'Converts ~wavy:text~ to data-annotation="wavy"');
assert(htmlAnnotationWavy.includes('am-annotation-wavy'), 'Includes am-annotation-wavy class');
assert(defaultMarkdownCodec.roundTrip(mdAnnotationWavy).trim() === mdAnnotationWavy, 'Round-trips ~wavy:text~ annotation');

const mdAnnotationCircle = 'Look at this ~circle:key takeaway~ here.';
const htmlAnnotationCircle = markdownToHtml(mdAnnotationCircle);
assert(htmlAnnotationCircle.includes('data-annotation="circle"'), 'Converts ~circle:text~ to data-annotation="circle"');
assert(defaultMarkdownCodec.roundTrip(mdAnnotationCircle).trim() === mdAnnotationCircle, 'Round-trips ~circle:text~ annotation');

const mdAnnotationBox = 'Pay ~box:attention~ to this!';
const htmlAnnotationBox = markdownToHtml(mdAnnotationBox);
assert(htmlAnnotationBox.includes('data-annotation="box"'), 'Converts ~box:text~ to data-annotation="box"');
assert(defaultMarkdownCodec.roundTrip(mdAnnotationBox).trim() === mdAnnotationBox, 'Round-trips ~box:text~ annotation');

// Test Hand-Drawn Annotation Input Rules & Paste Rules
import {
  ANNOTATION_INPUT_REGEX,
  ANNOTATION_PASTE_REGEX,
  AnnotationExtension,
} from '../editor/extensions/AnnotationExtension';

const inputMatch = 'Check this ~wavy:Important point~'.match(ANNOTATION_INPUT_REGEX);
assert(Boolean(inputMatch), 'ANNOTATION_INPUT_REGEX matches ~wavy:Important point~');
assert(inputMatch?.[2]?.toLowerCase() === 'wavy', 'ANNOTATION_INPUT_REGEX extracts variant "wavy"');
assert(inputMatch?.[3] === 'Important point', 'ANNOTATION_INPUT_REGEX extracts text "Important point"');

const strikeMatch = 'This is ~~not an annotation~~'.match(ANNOTATION_INPUT_REGEX);
assert(strikeMatch === null, 'ANNOTATION_INPUT_REGEX does not match ~~strikethrough~~');

const pasteMatches = [...'Start ~circle:first~ and ~box:second~ end'.matchAll(ANNOTATION_PASTE_REGEX)];
assert(pasteMatches.length === 2, 'ANNOTATION_PASTE_REGEX matches multiple annotation tokens');
assert(pasteMatches[0][2].toLowerCase() === 'circle' && pasteMatches[0][3] === 'first', 'Extracts circle annotation');
assert(pasteMatches[1][2].toLowerCase() === 'box' && pasteMatches[1][3] === 'second', 'Extracts box annotation');

// Verify AnnotationExtension has input and paste rules registered
const extensionInstance = AnnotationExtension;
assert(typeof extensionInstance.config.addInputRules === 'function', 'AnnotationExtension defines addInputRules');
assert(typeof extensionInstance.config.addPasteRules === 'function', 'AnnotationExtension defines addPasteRules');

// Test 20: Sidebar menu & tag selection does not auto-open note
import { useNoteStore } from '../store/useNoteStore';
useNoteStore.setState({
  activeNoteId: 'note-sample',
  notes: [
    {
      id: 'note-sample',
      title: 'Sample',
      content: 'hello',
      createdAt: 1,
      updatedAt: 1,
      tags: ['work'],
      isPinned: false,
      isArchived: false,
      isTrashed: false,
    },
  ],
});
useNoteStore.getState().setActiveFilter('trash');
assert(useNoteStore.getState().activeNoteId === null, 'Changing activeFilter leaves note unselected until user chooses a note');
useNoteStore.setState({ activeNoteId: 'note-sample' });
useNoteStore.getState().setSelectedTag('work');
assert(useNoteStore.getState().activeNoteId === null, 'Changing selectedTag leaves note unselected until user chooses a note');

// Trash notification popup confirmation tests
import { promptEmptyTrashConfirmation, promptDeletePermanentlyConfirmation } from '../utils/trashConfirmation';

useNotificationStore.setState({ notification: null });
useNoteStore.setState({
  notes: [
    {
      id: 'note-trash-1',
      title: 'Trashed Note',
      content: '# Trashed Note',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      isPinned: false,
      isArchived: false,
      isTrashed: true,
    },
  ],
});

assert(useUIStore.getState().isEmptyTrashModalOpen === false, 'isEmptyTrashModalOpen defaults to false');
promptEmptyTrashConfirmation();
assert(useUIStore.getState().isEmptyTrashModalOpen === true, 'Empty trash opens center confirmation modal');
useUIStore.getState().setEmptyTrashModalOpen(false);
assert(useUIStore.getState().isEmptyTrashModalOpen === false, 'setEmptyTrashModalOpen closes modal');

// Test single note delete permanently notification popup
useNotificationStore.getState().dismissNotification();
promptDeletePermanentlyConfirmation({ id: 'note-trash-1', title: 'Trashed Note' });
const notif2 = useNotificationStore.getState().notification;
assert(Boolean(notif2), 'Delete permanently notification popup is shown');
assert(notif2?.title === 'Delete Permanently', 'Notification title is Delete Permanently');
assert(notif2?.sender === 'Trashed Note', 'Notification sender matches note title');
assert(notif2?.action?.variant === 'danger', 'Delete Forever action has danger variant');
assert(Boolean(notif2?.cancelAction), 'Delete permanently notification has Cancel action');
useNotificationStore.getState().dismissNotification();


// Test 21: Typography registry & 8 new typefaces
import { FONT_OPTIONS, getFontFamilyCss } from '../domain/fontFamilies';
import { useSettingsStore } from '../store/useSettingsStore';

assert(FONT_OPTIONS.length === 14, 'Registry contains exactly 14 typefaces');
const expectedNewFonts = [
  'instrument-serif',
  'cormorant',
  'eb-garamond',
  'jost',
  'montserrat',
  'space-grotesk',
  'ibm-plex-mono',
  'caveat',
] as const;
for (const fontId of expectedNewFonts) {
  const opt = FONT_OPTIONS.find((f) => f.id === fontId);
  assert(Boolean(opt), `Font option '${fontId}' is registered in FONT_OPTIONS`);
  const css = getFontFamilyCss(fontId);
  assert(Boolean(css && css.length > 0), `getFontFamilyCss returns CSS stack for '${fontId}'`);
}

// Test setting font in useSettingsStore
useSettingsStore.getState().setFontFamily('instrument-serif');
assert(useSettingsStore.getState().fontFamily === 'instrument-serif', 'Updates settings store font family to instrument-serif');
useSettingsStore.getState().setFontFamily('clarika');
assert(useSettingsStore.getState().fontFamily === 'clarika', 'Restores settings store font family to clarika');

// ============================================================================
// Test 21b: Calendar dates, daily notes, and @date search
// ============================================================================
assert(isValidISODate('2026-09-05'), 'Accepts a valid ISO calendar date');
assert(!isValidISODate('2026-09-31'), 'Rejects a nonexistent calendar date');
assert(!isValidISODate('2025-02-29'), 'Rejects a leap day in a non-leap year');
assert(isValidISODate('2024-02-29'), 'Accepts a leap day in a leap year');
assert(addDaysISO('2026-01-01', -1) === '2025-12-31', 'Adds dates across year boundaries');
assert(addDaysISO('2026-03-01', -1) === '2026-02-28', 'Adds dates across leap/non-leap month boundaries');

const january2026 = getMonthGrid(2026, 0);
assert(january2026.length === 6, 'Calendar grid always contains six weeks');
assert(january2026[0][0].iso === '2025-12-29', 'Calendar grid starts on Monday');
assert(january2026[0][0].day === 29 && !january2026[0][0].isCurrentMonth, 'Calendar leading days are outside the month');
assert(january2026.flat().some((cell) => cell.iso === '2026-01-01' && cell.isCurrentMonth), 'Calendar grid includes January 2026');

const dateLinkText = 'Meet [[2026-09-05]] then [[2026-09-05]] but not [[2026-02-30]] or [[Someday]].';
const dateLinks = extractDateLinks(dateLinkText);
assert(dateLinks.length === 1 && dateLinks[0] === '2026-09-05', 'Extracts unique valid date links only');

const calendarNotes: Note[] = [
  {
    id: 'daily-note',
    title: '2026-09-05',
    content: createDailyNoteContent('2026-09-05'),
    tags: [],
    isPinned: false,
    isArchived: false,
    isTrashed: false,
    createdAt: 1,
    updatedAt: 10,
  },
  {
    id: 'mention-note',
    title: 'Weekly Review',
    content: 'Review happens on [[2026-09-05]].',
    tags: [],
    isPinned: false,
    isArchived: false,
    isTrashed: false,
    createdAt: 2,
    updatedAt: 20,
  },
  {
    id: 'archived-mention',
    title: 'Archived Date',
    content: '[[2026-09-05]]',
    tags: [],
    isPinned: false,
    isArchived: true,
    isTrashed: false,
    createdAt: 3,
    updatedAt: 30,
  },
  {
    id: 'trashed-mention',
    title: 'Trashed Date',
    content: '[[2026-09-05]]',
    tags: [],
    isPinned: false,
    isArchived: false,
    isTrashed: true,
    createdAt: 4,
    updatedAt: 40,
  },
];
const calendarEntries = getCalendarDayEntries(calendarNotes, '2026-09-05');
assert(calendarEntries.dailyNotes.length === 1 && calendarEntries.dailyNotes[0].id === 'daily-note', 'Finds canonical daily note');
assert(calendarEntries.mentions.length === 1 && calendarEntries.mentions[0].id === 'mention-note', 'Finds date mentions and excludes archived/trashed notes');

const dateHtml = markdownToHtml('See [[2026-09-05]] and [[Someday]].');
assert(dateHtml.includes('am-date-link'), 'Renders valid date links with date styling');
assert(!dateHtml.includes('[[2026-09-05]]') && dateHtml.includes('data-wiki-target="2026-09-05"'), 'Renders date link as a wiki link target');
assert(defaultMarkdownCodec.roundTrip('See [[2026-09-05]] and [[Someday]].').includes('[[2026-09-05]]'), 'Round-trips a date wiki link');

const calendarSearchIndex = new NoteSearchIndex();
calendarSearchIndex.sync(calendarNotes);
const dateMatches = calendarSearchIndex.search(calendarNotes, '@date:2026-09-05');
assert(dateMatches.map((note) => note.id).join(',') === 'mention-note,daily-note', 'Date search returns daily note and mentions, ranked by recency');
assert(calendarSearchIndex.search(calendarNotes, '@date:2026-02-30').length === 0, 'Date search rejects an invalid date');

// ============================================================================
// Test 21c: Task due dates
// ============================================================================
const dueTaskNote: Note = {
  id: 'due-task-note',
  title: 'Due Task Plan',
  content: [
    '- [ ] Pay rent @due(2026-01-10)',
    '  * [x] Confirm amount @due(2026-01-09)',
    '- [ ] Ignore malformed date @due(2026-02-30)',
    'Not a task @due(2026-01-10)',
  ].join('\n'),
  tags: [],
  isPinned: false,
  isArchived: false,
  isTrashed: false,
  createdAt: 10,
  updatedAt: 20,
};
const parsedDueTasks = parseTaskDueItems(dueTaskNote);
assert(parsedDueTasks.length === 2, 'Parses valid task due dates and ignores malformed/non-task dates');
assert(parsedDueTasks[0].text === 'Pay rent', 'Removes due metadata from displayed task text');
assert(parsedDueTasks[0].checked === false && parsedDueTasks[0].lineIndex === 0, 'Preserves unchecked task state and line position');
assert(parsedDueTasks[1].checked === true && parsedDueTasks[1].dueDate === '2026-01-09', 'Parses nested completed due tasks');
assert(cleanSnippet('Pay rent @due(2026-01-10)') === 'Pay rent', 'Strips due metadata from note previews');
const dueTaskMarkdown = '- [ ] Ship release @due(2026-01-10)';
assert(defaultMarkdownCodec.roundTrip(dueTaskMarkdown).includes('@due(2026-01-10)'), 'Round-trips Markdown with a task due token');
assert(setTaskDueToken('Ship release @due(2026-01-01)', '2026-02-14') === 'Ship release @due(2026-02-14)', 'Replaces a task due token');
assert(setTaskDueToken('Ship release @due(2026-01-01)', null) === 'Ship release', 'Clears a task due token');

const dueTaskNotes: Note[] = [
  dueTaskNote,
  {
    ...dueTaskNote,
    id: 'archived-due-task',
    content: '- [ ] Archived task @due(2026-01-10)',
    isArchived: true,
  },
  {
    ...dueTaskNote,
    id: 'trashed-due-task',
    content: '- [ ] Trashed task @due(2026-01-10)',
    isTrashed: true,
  },
];
const allDueTasks = getDueTasks(dueTaskNotes);
assert(allDueTasks.length === 2, 'Due task views exclude archived and trashed notes');
assert(getTasksDueOn(dueTaskNotes, '2026-01-10').length === 1, 'Finds tasks due on an exact date');
const overdueTask = allDueTasks.find((task) => task.checked) ?? allDueTasks[0];
assert(!isTaskOverdue(overdueTask), 'Never treats a completed due task as overdue');

const dueSearchIndex = new NoteSearchIndex();
dueSearchIndex.sync(dueTaskNotes);
assert(dueSearchIndex.search(dueTaskNotes, '@due').map(({ id }) => id).join(',') === 'due-task-note', 'Searches notes with due tasks');
assert(dueSearchIndex.search(dueTaskNotes, '@due:2026-01-10').map(({ id }) => id).join(',') === 'due-task-note', 'Searches tasks due on an exact date');
assert(dueSearchIndex.search(dueTaskNotes, '@overdue').map(({ id }) => id).join(',') === 'due-task-note', 'Searches unchecked overdue tasks');

// Calendar modal state and daily-note store behavior.
import { vaultAdapter } from '../db/vaultAdapter';

useNoteStore.setState({
  notes: structuredClone(calendarNotes),
  activeNoteId: null,
  persistenceError: null,
});
useUIStore.setState({
  isCalendarModalOpen: true,
  calendarSelectedDate: todayISO(),
});
useUIStore.getState().setCalendarSelectedDate('2026-09-05');
assert(useUIStore.getState().calendarSelectedDate === '2026-09-05', 'Updates selected calendar date');
useUIStore.getState().setCalendarSelectedDate('2026-02-30');
assert(useUIStore.getState().calendarSelectedDate === '2026-09-05', 'Rejects invalid selected calendar dates');

const originalSaveNote = vaultAdapter.saveNote;
vaultAdapter.saveNote = async () => 'calendar-test-revision';
const existingDailyId = await useNoteStore.getState().openDailyNote('2026-09-05');
assert(existingDailyId === 'daily-note', 'Opens an existing canonical daily note');
assert(useUIStore.getState().isCalendarModalOpen === false, 'Closes calendar when a daily note opens');
assert(useNoteStore.getState().activeNoteId === 'daily-note', 'Selects the opened daily note');

const dailyCountBefore = useNoteStore.getState().notes.length;
const createdDailyId = await useNoteStore.getState().openDailyNote('2026-01-10');
const createdDaily = useNoteStore.getState().notes.find((note) => note.id === createdDailyId);
assert(createdDailyId !== null && useNoteStore.getState().notes.length === dailyCountBefore + 1, 'Creates a missing daily note');
assert(createdDaily?.title === '2026-01-10', 'Daily note title is exactly the ISO date');
const createdDailyContent = createdDaily?.content ?? '';
assert(createdDailyContent.includes('[[2026-01-09]]') && createdDailyContent.includes('[[2026-01-11]]'), 'Daily note links adjacent dates');
assert((createdDaily?.tags.length ?? -1) === 0, 'Daily note does not inherit the selected tag');

vaultAdapter.saveNote = originalSaveNote;
useNoteStore.setState({ notes: [], activeNoteId: null, persistenceError: null });
useUIStore.setState({ isCalendarModalOpen: false });

// ============================================================================
// Test 22: 3-Way Vault Sync Merge & Conflict Prevention
// ============================================================================
const localTypingNotes = [
  makeConflictNote('typing-note', 'user typing locally...', 10),
  makeConflictNote('external-note', 'local unchanged', 10),
  makeConflictNote('new-note', 'brand new note content', 10),
  makeConflictNote('true-conflict', 'local concurrent change', 10),
];

const diskSyncedNotes = [
  makeConflictNote('typing-note', 'base text on disk', 8), // Disk unchanged from base
  makeConflictNote('external-note', 'external change from Dropbox', 12), // External update
  makeConflictNote('new-note', 'brand new note content', 10), // Disk just wrote same content
  makeConflictNote('true-conflict', 'dropbox concurrent change', 12), // Diverged from base
];

const threeWayMerge = mergeVaultNotes({
  localNotes: localTypingNotes,
  diskNotes: diskSyncedNotes,
  dirtyNoteIds: {
    'typing-note': true,
    'new-note': true,
    'true-conflict': true,
  },
  baseContentByNoteId: {
    'typing-note': 'base text on disk',
    'external-note': 'local unchanged',
    'true-conflict': 'original base text',
  },
});

assert(threeWayMerge.conflicts.length === 1, '3-way merge flags ONLY true conflicts, not routine typing');
assert(threeWayMerge.conflicts[0].noteId === 'true-conflict', 'Identifies the true conflict note');
assert(
  threeWayMerge.notes.find((n) => n.id === 'typing-note')?.content === 'user typing locally...',
  '3-way merge seamlessly preserves user in-memory typing without conflict'
);
assert(
  threeWayMerge.notes.find((n) => n.id === 'external-note')?.content === 'external change from Dropbox',
  '3-way merge accepts clean external Dropbox changes'
);
assert(
  threeWayMerge.notes.find((n) => n.id === 'new-note')?.content === 'brand new note content',
  '3-way merge preserves newly created note'
);

// CRLF vs LF 3-way merge normalization
const crlfLocalNotes = [makeConflictNote('crlf-note', 'line one\nline two\nlocal add', 10)];
const crlfDiskNotes = [makeConflictNote('crlf-note', 'line one\r\nline two\r\n', 8)];
const crlfMerge = mergeVaultNotes({
  localNotes: crlfLocalNotes,
  diskNotes: crlfDiskNotes,
  dirtyNoteIds: { 'crlf-note': true },
  baseContentByNoteId: { 'crlf-note': 'line one\nline two\n' },
});
assert(crlfMerge.conflicts.length === 0, 'CRLF vs LF line endings do not trigger false conflicts');
assert(crlfMerge.notes.find((n) => n.id === 'crlf-note')?.content === 'line one\nline two\nlocal add', 'Preserves local content across CRLF disk format');

// Focus Mode (iA Writer Style) Tests
import { findSentenceRange, FocusModeExtension, focusModePluginKey } from '../editor/extensions/FocusModeExtension';

// 1. findSentenceRange tests
const paragraphText = 'Welcome to AmNote! Focus mode feels just like iA Writer. It supports version 2.0 smoothly. Are you ready? Yes...';

const s1 = findSentenceRange(paragraphText, 5);
assert(paragraphText.slice(s1.start, s1.end) === 'Welcome to AmNote!', 'Sentence 1 identified with exclamation point');

const s2 = findSentenceRange(paragraphText, 25);
assert(paragraphText.slice(s2.start, s2.end) === 'Focus mode feels just like iA Writer.', 'Sentence 2 identified with period');

const s3 = findSentenceRange(paragraphText, 65);
assert(paragraphText.slice(s3.start, s3.end) === 'It supports version 2.0 smoothly.', 'Sentence 3 preserves decimal numbers like 2.0 without splitting');

const s4 = findSentenceRange(paragraphText, 95);
assert(paragraphText.slice(s4.start, s4.end) === 'Are you ready?', 'Sentence 4 identified with question mark');

const s5 = findSentenceRange(paragraphText, 108);
assert(paragraphText.slice(s5.start, s5.end) === 'Yes...', 'Sentence 5 identified with ellipsis');

const emptyRange = findSentenceRange('', 0);
assert(emptyRange.start === 0 && emptyRange.end === 0, 'findSentenceRange handles empty text safely');

// 2. Settings Store Focus Mode tests
assert(useSettingsStore.getState().focusMode === false, 'Focus mode defaults to false');
assert(useSettingsStore.getState().focusModeType === 'sentence', 'Focus mode type defaults to sentence');

useSettingsStore.getState().setFocusMode(true);
assert(useSettingsStore.getState().focusMode === true, 'Enables focus mode');

useSettingsStore.getState().setFocusModeType('paragraph');
assert(useSettingsStore.getState().focusModeType === 'paragraph', 'Switches focus mode type to paragraph');

useSettingsStore.getState().setFocusMode(false);
useSettingsStore.getState().setFocusModeType('sentence');
assert(useSettingsStore.getState().focusMode === false, 'Disables focus mode');

// 3. FocusModeExtension validation
assert(FocusModeExtension.name === 'focusMode', 'FocusModeExtension has correct name');
assert(Boolean(focusModePluginKey), 'focusModePluginKey is properly exported');

// ============================================================================
// Test 24: Sidebar Tags Collapsed State Tests
// ============================================================================
console.log('\n--- Test 24: Sidebar Tags Collapsed State Tests ---');
assert(useSettingsStore.getState().tagsSectionExpanded === false, 'Tags section defaults to minimized/collapsed (false)');
useSettingsStore.getState().setTagsSectionExpanded(true);
assert(useSettingsStore.getState().tagsSectionExpanded === true, 'setTagsSectionExpanded expands the tags section');
useSettingsStore.getState().setTagsSectionExpanded(false);
assert(useSettingsStore.getState().tagsSectionExpanded === false, 'setTagsSectionExpanded collapses the tags section');

// ============================================================================
// Test 25: Note List Density Tests
// ============================================================================
console.log('\n--- Test 25: Note List Density Tests ---');
assert(useSettingsStore.getState().noteListDensity === 'comfortable', 'Note list density defaults to comfortable');
useSettingsStore.getState().setNoteListDensity('compact');
assert(useSettingsStore.getState().noteListDensity === 'compact', 'setNoteListDensity switches to compact');
useSettingsStore.getState().setNoteListDensity('comfortable');
assert(useSettingsStore.getState().noteListDensity === 'comfortable', 'setNoteListDensity switches back to comfortable');

// ============================================================================
// Test 26: Tag Color Contrast Tests (every theme's tag text on tag bg >= 4.5:1)
// ============================================================================
console.log('\n--- Test 26: Tag Color Contrast Tests ---');
function channelLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const adjust = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b);
}
function contrastRatio(a: string, b: string): number {
  const la = channelLuminance(a);
  const lb = channelLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
for (const theme of Object.values(THEMES)) {
  const ratio = contrastRatio(theme.tagText, theme.tagBg);
  assert(ratio >= 4.5, `Tag contrast >= 4.5:1 in ${theme.id} (${ratio.toFixed(2)}:1)`);
}

// ============================================================================
// Test 27: UI Store Layout & Modal Seams
// ============================================================================
console.log('\n--- Test 27: UI Store Layout & Modal Tests ---');

assert(useUIStore.getState().isSidebarOpen === true, 'Sidebar defaults to open');
useUIStore.getState().toggleSidebar();
assert(useUIStore.getState().isSidebarOpen === false, 'toggleSidebar closes sidebar');
useUIStore.getState().toggleSidebar();
assert(useUIStore.getState().isSidebarOpen === true, 'toggleSidebar re-opens sidebar');

assert(useUIStore.getState().isNoteListOpen === true, 'Note list defaults to open');
useUIStore.getState().toggleNoteList();
assert(useUIStore.getState().isNoteListOpen === false, 'toggleNoteList closes note list');
useUIStore.getState().toggleNoteList();

assert(useUIStore.getState().isFocusMode === false, 'Focus mode defaults to false');
useUIStore.getState().toggleFocusMode();
assert(useUIStore.getState().isFocusMode === true, 'toggleFocusMode enables focus mode');
assert(useUIStore.getState().isSidebarOpen === false, 'focus mode closes sidebar');
assert(useUIStore.getState().isNoteListOpen === false, 'focus mode closes note list');
useUIStore.getState().toggleFocusMode();
assert(useUIStore.getState().isFocusMode === false, 'toggleFocusMode disables focus mode');
assert(useUIStore.getState().isSidebarOpen === true, 'exiting focus mode restores sidebar');

useUIStore.getState().setExportModalOpen(true);
assert(useUIStore.getState().isExportModalOpen === true, 'setExportModalOpen opens export modal');
useUIStore.getState().setExportModalOpen(false);
assert(useUIStore.getState().isExportModalOpen === false, 'setExportModalOpen closes export modal');

// ============================================================================
// Test 28: Headless VaultSyncCoordinator Tests
// ============================================================================
console.log('\n--- Test 28: Headless VaultSyncCoordinator Tests ---');

let mockDiskNotes: Note[] = [
  {
    id: 'n-1',
    title: 'Note 1',
    content: 'Initial content',
    tags: [],
    isPinned: false,
    isArchived: false,
    isTrashed: false,
    isLocked: false,
    createdAt: 1000,
    updatedAt: 1000,
  },
];
let mockRevision = 'rev-1';
const backupsRecorded: { note: Note; tag: string }[] = [];

const mockAdapter: VaultAdapterPort = {
  getVaultPath: async () => '/mock/vault',
  getVaultRevision: async () => mockRevision,
  loadAllNotes: async () => JSON.parse(JSON.stringify(mockDiskNotes)),
  loadTagMetadata: async () => ({}),
  saveNote: async (note: Note) => {
    const idx = mockDiskNotes.findIndex((n) => n.id === note.id);
    if (idx >= 0) mockDiskNotes[idx] = note;
    else mockDiskNotes.push(note);
    mockRevision = `rev-${Date.now()}`;
    return mockRevision;
  },
  backupNoteVersion: async (note: Note, tag: string) => {
    backupsRecorded.push({ note, tag });
  },
};

const coordinator = new VaultSyncCoordinator(mockAdapter);
const initialResult = await coordinator.loadInitial();
assert(initialResult.notes.length === 1, 'Coordinator loads initial notes');
assert(coordinator.getState().vaultRevision === 'rev-1', 'Coordinator tracks revision');

// Test dirty tracking
coordinator.markDirty('n-1');
assert(coordinator.getState().dirtyNoteIds['n-1'] === true, 'Coordinator marks note dirty');
coordinator.markClean('n-1', 'Updated content');
assert(!coordinator.getState().dirtyNoteIds['n-1'], 'Coordinator clears dirty flag on clean');
assert(coordinator.getState().diskContentByNoteId['n-1'] === 'Updated content', 'Coordinator tracks disk base');

// Test external sync without conflict
mockDiskNotes.push({
  id: 'n-2',
  title: 'External Note',
  content: 'Created externally',
  tags: [],
  isPinned: false,
  isArchived: false,
  isTrashed: false,
  isLocked: false,
  createdAt: 2000,
  updatedAt: 2000,
});
mockRevision = 'rev-2';

const syncResult = await coordinator.syncIfChanged();
assert(syncResult.changed === true, 'Detects vault changed');
assert(syncResult.newConflicts.length === 0, 'No conflict on non-colliding external addition');
assert(coordinator.getState().notes.length === 2, 'Coordinator merged external note');

// ============================================================================
// Test 29: Editor Canvas & Suggestion Trigger Tests
// ============================================================================
console.log('\n--- Test 29: Editor Canvas & Suggestion Trigger Tests ---');

// Slash command trigger detection
assert(detectSlashCommand('/heading')?.query === 'heading', 'Detects start-of-line slash command');
assert(detectSlashCommand('text /task')?.query === 'task', 'Detects spaced slash command');
assert(detectSlashCommand('https://amnote.app/test') === null, 'Ignores URL path slashes');
assert(detectSlashCommand('text/test') === null, 'Ignores mid-word slashes');
assert(detectSlashCommand('/heading item') === null, 'Ignores slash commands with spaces in query');

// Wiki-link trigger detection
assert(detectWikiLink('[[Note Title')?.query === 'Note Title', 'Detects wiki link autocomplete query');
assert(detectWikiLink('[[Note Title]]') === null, 'Ignores completed wiki links');
assert(detectWikiLink('Regular text without brackets') === null, 'Ignores text without wiki link trigger');

// Lightbox zoom clamping
assert(clampZoom(0.2) === 0.5, 'Clamps zoom to 0.5 minimum');
assert(clampZoom(4.0) === 3.0, 'Clamps zoom to 3.0 maximum');
assert(clampZoom(1.25) === 1.25, 'Preserves normal zoom scale');

// Note reading metrics
const sampleNote = 'This is a sample note with ten words in total.';
const metrics = calculateNoteMetrics(sampleNote);
assert(metrics.words === 10, 'Calculates word count correctly');
assert(metrics.chars === sampleNote.length, 'Calculates character count correctly');
assert(metrics.readTime === 1, 'Calculates minimum 1 minute reading time');

console.log('\n🎉 All AmNote unit tests, AST Serializer tests, Tag Capitalization tests, Tag Sync tests, Notification tests, Annotation tests, Typography tests, 3-Way Sync tests, Focus Mode tests, Tags Collapsed tests, Note List Density tests, Tag Contrast tests, UI Store tests, VaultSyncCoordinator tests, and Editor Canvas tests passed successfully!');

