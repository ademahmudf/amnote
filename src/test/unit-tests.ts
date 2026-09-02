import {
  extractTagsFromContent,
  extractWikiLinksFromContent,
} from '../domain/markdownMetadata';
import { markdownToHtml, htmlToMarkdown } from '../editor/utils/markdownConverter';
import { initialAmNoteSeed } from '../db/vaultAdapter';

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

// Test 8: HTML to Markdown round-trip for Task & Bullet Lists
const htmlSample = `<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Ship AmNote</p></li><li data-type="taskItem" data-checked="false"><p>Write Docs</p></li></ul>`;
const backToMd = htmlToMarkdown(htmlSample);
assert(backToMd.includes('- [x] Ship AmNote'), 'Round-trip checked task item');
assert(backToMd.includes('- [ ] Write Docs'), 'Round-trip unchecked task item');

// Test 9: Custom Highlight Color Round-Trip
const customHighlightMd = `Here is =={color:#bbf7d0}mint green highlight== and standard ==yellow highlight==.`;
const customHighlightHtml = markdownToHtml(customHighlightMd);
assert(customHighlightHtml.includes('style="background-color: #bbf7d0"'), 'Preserves custom highlight color in HTML');
assert(customHighlightHtml.includes('<mark>yellow highlight</mark>'), 'Converts standard highlight to <mark>');

const customBackToMd = htmlToMarkdown(customHighlightHtml);
assert(customBackToMd.includes('=={color:#bbf7d0}mint green highlight=='), 'Round-trips custom color highlight to markdown');
assert(customBackToMd.includes('==yellow highlight=='), 'Round-trips standard highlight to markdown');

// Test 10: Image Markdown Conversion Round-Trip
const imageMd = `Here is an image:\n\n![AmNote Screenshot](https://example.com/screenshot.png)\n\nAnd local image:\n\n![Diagram](data:image/png;base64,iVBORw0KGgo=)`;
const imageHtml = markdownToHtml(imageMd);
assert(imageHtml.includes('<img src="https://example.com/screenshot.png" alt="AmNote Screenshot"'), 'Converts markdown image to <img> tag');
assert(imageHtml.includes('src="data:image/png;base64,iVBORw0KGgo="'), 'Preserves data URL in <img> tag');

const imageBackToMd = htmlToMarkdown(imageHtml);
assert(imageBackToMd.includes('![AmNote Screenshot](https://example.com/screenshot.png)'), 'Round-trips web image markdown');
assert(imageBackToMd.includes('![Diagram](data:image/png;base64,iVBORw0KGgo=)'), 'Round-trips base64 image markdown');

// Test 11: Resized and Aligned Image Round-Trip
const resizedMd = `![Graph|left|50%](https://example.com/graph.png)\n\n![Banner|75%](https://example.com/banner.png)`;
const resizedHtml = markdownToHtml(resizedMd);
assert(resizedHtml.includes('width="50%"'), 'Converts percentage width to width attribute');
assert(resizedHtml.includes('data-align="left"'), 'Converts left alignment to data-align attribute');

const resizedBackToMd = htmlToMarkdown(resizedHtml);
assert(resizedBackToMd.includes('![Graph|left|50%](https://example.com/graph.png)'), 'Round-trips aligned & resized image markdown');
assert(resizedBackToMd.includes('![Banner|75%](https://example.com/banner.png)'), 'Round-trips resized image markdown');

// Test 12: Initial AmNote Seed verification
assert(initialAmNoteSeed.length === 2, 'Initial seed has 2 notes');
assert(initialAmNoteSeed[0].title === 'Welcome to AmNote', 'First note is Welcome to AmNote');

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
import { formatTagDisplay, formatTagSegment } from '../utils/tagIcons';

assert(formatTagSegment('welcome') === 'Welcome', 'Capitalizes simple segment "welcome" -> "Welcome"');
assert(formatTagSegment('omarchy-linux') === 'Omarchy Linux', 'Capitalizes hyphenated segment "omarchy-linux" -> "Omarchy Linux"');
assert(formatTagSegment('deep_work') === 'Deep Work', 'Capitalizes underscored segment "deep_work" -> "Deep Work"');
assert(formatTagDisplay('guide/basics') === 'Guide / Basics', 'Capitalizes nested tag path "guide/basics" -> "Guide / Basics"');
assert(formatTagDisplay('work/sprint/q3') === 'Work / Sprint / Q3', 'Capitalizes 3-level path "work/sprint/q3" -> "Work / Sprint / Q3"');

console.log('\n🎉 All AmNote unit tests, AST Serializer tests, and Tag Capitalization tests passed successfully!');
