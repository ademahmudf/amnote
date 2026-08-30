import { extractTagsFromContent, extractWikiLinksFromContent } from '../db/database';
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

// Test 9: Initial AmNote Seed verification
assert(initialAmNoteSeed.length === 2, 'Initial seed has 2 notes');
assert(initialAmNoteSeed[0].title === 'Welcome to AmNote', 'First note is Welcome to AmNote');

console.log('\n🎉 All AmNote unit tests passed successfully!');
