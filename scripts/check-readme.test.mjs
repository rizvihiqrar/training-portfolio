import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { findProblems, relativeLinks } from './check-readme.mjs';

function tree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-check-'));
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  }
  return root;
}

test('web links, anchors and images from the web are not checked', () => {
  assert.deepEqual(relativeLinks('[a](https://x.y) [b](#top) [c](docs/a.md#part) ![d](https://i.png)'), ['docs/a.md']);
});

test('a README that links every course and file is fine', () => {
  const root = tree({
    'README.md': '[Course](01-a/first-course/) and [file](01-a/first-course/README.md)',
    '01-a/first-course/README.md': '# c',
  });
  assert.deepEqual(findProblems(root), []);
});

test('a link to a missing file is reported', () => {
  const root = tree({ 'README.md': '[x](nope.md)' });
  assert.deepEqual(findProblems(root), ['README links to nope.md, which does not exist']);
});

test('a course folder the README does not mention is reported (the break: add a course, forget the link)', () => {
  const root = tree({
    'README.md': '# front',
    '01-a/new-course/README.md': '# c',
  });
  assert.deepEqual(findProblems(root), ['01-a/new-course has a README.md but the front README does not link to it']);
});

test('a section page alone is not a course', () => {
  const root = tree({ 'README.md': '# front', '01-a/README.md': '# section' });
  assert.deepEqual(findProblems(root), []);
});
