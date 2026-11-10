import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { findProblems, relativeLinks } from './check-readme.mjs';

function tree(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-check-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  }
  return root;
}
const front = (courses, links = '') => `${courses} courses so far ${links}`;

test('web links, anchors and web images are not checked', () => {
  assert.deepEqual(relativeLinks('[a](https://x.y) [b](#top) [c](docs/a.md#part) ![d](https://i.png) [e](mailto:a@b.c)'), ['docs/a.md']);
});

test('links inside code are examples, not real links', () => {
  assert.deepEqual(relativeLinks('Use `[a](x.md)` like this:\n```md\n[b](y.md)\n```\n[real](z.md)'), ['z.md']);
});

test('a target with parentheses, a title, angle brackets and a malformed percent are all read without crashing', () => {
  assert.deepEqual(relativeLinks('[a](docs/Guide_(v2).md) [b](x.md "Title") [c](<my file.md>) [d](100%.md)'), ['docs/Guide_(v2).md', 'x.md', 'my file.md', '100%.md']);
});

test('a README that links every course, with the right count, is fine', (t) => {
  const root = tree(t, { 'README.md': front(1, '[c](./01-a/first/)'), '01-a/first/README.md': '# c' });
  assert.deepEqual(findProblems(root), []);
});

test('a link to a missing file is reported', (t) => {
  const root = tree(t, { 'README.md': front(0, '[x](nope.md)') });
  assert.deepEqual(findProblems(root), ['README.md links to nope.md, which does not exist']);
});

test('a broken link inside a course page is reported, resolved from that page', (t) => {
  const root = tree(t, {
    'README.md': front(1, '[c](01-a/first/)'),
    '01-a/first/README.md': '[ok](quiz.md) [gone](materials/old.docx)',
    '01-a/first/quiz.md': '# quiz',
  });
  assert.deepEqual(findProblems(root), ['01-a/first/README.md links to materials/old.docx, which does not exist']);
});

test('a link with the wrong letter case is reported, because GitHub is case-sensitive', (t) => {
  const root = tree(t, { 'README.md': front(0, '[x](Notes.md)'), 'notes.md': '# n' });
  assert.deepEqual(findProblems(root), ['README.md links to Notes.md, which does not exist']);
});

test('a course folder the README does not mention is reported (the break: add a course, forget the link)', (t) => {
  const root = tree(t, { 'README.md': front(1), '01-a/new/README.md': '# c' });
  assert.deepEqual(findProblems(root), ['01-a/new exists but the front README does not link to it']);
});

test('a course folder with no README of its own still has to be linked', (t) => {
  const root = tree(t, { 'README.md': front(1), '01-a/new/lesson-plan.md': '# l' });
  assert.deepEqual(findProblems(root), ['01-a/new exists but the front README does not link to it']);
});

test('a stale course count is reported (the break: add a course, forget the number)', (t) => {
  const root = tree(t, { 'README.md': front(1, '[a](01-a/one/) [b](01-a/two/)'), '01-a/one/README.md': '#', '01-a/two/README.md': '#' });
  assert.deepEqual(findProblems(root), ['the front README says 1 courses so far, but there are 2 course folders']);
});

test('a section page alone is not a course', (t) => {
  const root = tree(t, { 'README.md': front(0), '01-a/README.md': '# section' });
  assert.deepEqual(findProblems(root), []);
});

test('a link to a heading that exists passes, in the same file and in another file', (t) => {
  const root = tree(t, { 'README.md': front(0, '[a](#find-what-fits-you) [b](other.md#words-used-here)') + '\n## Find what fits you\n', 'other.md': '# Other\n## Words used here\n' });
  assert.deepEqual(findProblems(root), []);
});

test('a link to a heading that is not there is reported (the break: rename a heading, keep the old link)', (t) => {
  const root = tree(t, { 'README.md': front(0, '[a](#coming-next)') + '\n## Related work\n' });
  assert.deepEqual(findProblems(root), ['README.md links to #coming-next, but README.md has no such heading']);
});

test('a repeated heading gets -1 as on GitHub', (t) => {
  const root = tree(t, { 'README.md': front(0, '[a](#notes-1)') + '\n## Notes\n## Notes\n' });
  assert.deepEqual(findProblems(root), []);
});

test('Markdown under .github is not part of the portfolio and is not checked', (t) => {
  const root = tree(t, { 'README.md': front(0), '.github/pull_request_template.md': '[x](nowhere.md)' });
  assert.deepEqual(findProblems(root), []);
});

test('the real repository passes its own check (also proves the script finds the repository root)', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  assert.deepEqual(findProblems(path.resolve(here, '..', '..')), []);
});

test('a top-level folder that is not a numbered section is reported, because courses in it would escape the check', (t) => {
  const root = tree(t, { 'README.md': front(0), 'courses/new/README.md': '# c' });
  assert.deepEqual(findProblems(root), ['courses/ is not a numbered section folder (01-name), docs or .github, so courses in it would not be checked']);
});
