import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Each case study or course is short: five parts, about 300 words. This keeps the long version from creeping back.
// Words are counted in the prose of each part; tables, code, pictures and the plain version of an interactive piece are not words to read.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(new URL('./site.json', import.meta.url), 'utf8'));

export const PARTS = ['The Problem', 'What I Did', 'The Result', 'What I Would Change'];
// The four parts together stay near 300 words: the total is tighter than the four limits added up, so no page may use every part's full allowance.
// Any other section (Getting Started, Units, Course Materials) is mostly tables and pieces: each keeps its prose short, and all of them together stay under a cap.
export const BUDGET = { 'The Problem': 70, 'What I Did': 120, 'The Result': 120, 'What I Would Change': 90, total: 340, other: 100, otherTotal: 200 };

/** Words of each part's prose, by heading. */
export function partWords(markdown) {
  const text = markdown.replace(/\r\n/g, '\n')
    .replace(/<!-- site:[\s\S]*?<!-- \/site:[a-z-]+ -->/g, '')
    .replace(/^(```|~~~)[\s\S]*?^\1/gm, '')
    .replace(/^\s*\|.*$/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '');
  const out = {};
  const sections = text.split(/^## /m).slice(1);
  for (const s of sections) {
    const [head, ...rest] = s.split('\n');
    out[head.trim()] = (rest.join('\n').match(/[\p{L}\p{N}][\p{L}\p{N}'’%./+-]*/gu) ?? []).length;
  }
  return out;
}

test('the counter ignores tables, code, the plain version of a piece and links\' addresses', () => {
  const md = '# T\n\n## The Problem\n\nOne two [three](http://x.y) four.\n\n| a | b |\n|---|---|\n| x | y |\n\n```text\nnot counted words\n```\n\n<!-- site:run a -->\nhidden words\n<!-- /site:run -->\n\n## What I Did\n\n- **Five** six\n';
  assert.deepEqual(partWords(md), { 'The Problem': 4, 'What I Did': 2 });
});

const cards = config.cards.filter((c) => c.status !== 'planned');

test('every finished card names a page that exists, so none escapes the budget', () => {
  assert.ok(cards.length > 0);
  for (const c of cards) assert.ok(c.path && fs.existsSync(path.join(root, c.path)), `${c.title}: its page ${c.path} exists`);
});

for (const c of cards) {
  test(`${c.title}: each of the four parts stays within its word budget`, () => {
    const words = partWords(fs.readFileSync(path.join(root, c.path), 'utf8'));
    for (const part of PARTS) {
      assert.ok(part in words, `${c.path} has a "${part}" section`);
      assert.ok(words[part] <= BUDGET[part], `${c.title}, ${part}: ${words[part]} words, over the ${BUDGET[part]} budget`);
    }
    for (const [head, n] of Object.entries(words)) {
      if (!PARTS.includes(head)) assert.ok(n <= BUDGET.other, `${c.title}, ${head}: ${n} words, over the ${BUDGET.other} budget for a section that is not one of the four parts`);
    }
    const total = PARTS.reduce((a, p) => a + words[p], 0);
    assert.ok(total <= BUDGET.total, `${c.title}: ${total} words in the four parts, over the ${BUDGET.total} budget`);
    const rest = Object.entries(words).filter(([h]) => !PARTS.includes(h)).reduce((a, [, n]) => a + n, 0);
    assert.ok(rest <= BUDGET.otherTotal, `${c.title}: ${rest} words in the other sections, over the ${BUDGET.otherTotal} budget`);
  });
}
