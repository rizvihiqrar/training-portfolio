import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSite } from './build.mjs';

// The Git guide keeps the same facts in four places: the page, its plain quiz, the quiz data in site.json and the animated result.
// These tests make the places agree, so editing one and forgetting another fails here.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(new URL('./site.json', import.meta.url), 'utf8'));
const dir = '04-technical-enablement/git-workflow-guide';
const read = (f) => fs.readFileSync(path.join(root, dir, f), 'utf8').replace(/\r\n/g, '\n');
const card = config.cards.find((c) => c.path === `${dir}/README.md`);
const page = read('README.md');
const clean = (s) => s.replace(/[`*]/g, '').replace(/[‘’]/g, "'").trim();
const must = (value, what) => { assert.ok(value, `${what} is missing: the test cannot find it`); return value; };
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const quizBlock = () => must(page.match(/<!-- site:quiz -->([\s\S]*?)<!-- \/site:quiz -->/), 'the site:quiz block')[1];

test('the guide has a finished card with a quiz and an animated result', () => {
  assert.ok(card, 'the Git guide card exists');
  assert.notEqual(card.status, 'planned');
  assert.ok(card.components.quiz && card.components.runs?.branch, 'quiz and run data are on the card');
});

test('the quiz data is sound: eight questions, three choices each, a reason for each, and the right answer is not always in the same place (the break: answer = 0 everywhere)', () => {
  const { questions, pass } = card.components.quiz;
  assert.equal(questions.length, 8);
  assert.ok(pass >= 5 && pass <= questions.length, 'the pass mark is above half and within the questions');
  for (const q of questions) {
    assert.equal(q.options.length, 3, `${q.q}: three choices`);
    assert.ok(q.why.length > 10, `${q.q}: a reason is given`);
    assert.equal(new Set(q.options).size, 3, `${q.q}: no choice is repeated`);
  }
  assert.ok(new Set(questions.map((q) => q.answer)).size >= 3, 'the right answer sits in at least three different places');
});

test('the plain quiz in the page, the quiz page and the quiz data ask the same eight questions in the same order (the break: reword one)', () => {
  const data = card.components.quiz.questions.map((q) => clean(q.q));
  const block = quizBlock();
  const inPage = [...block.matchAll(/^\d+\. (.*?) \*\*Answer:\*\*/gm)].map((m) => clean(m[1]));
  assert.deepEqual(inPage, data, 'the page block matches the data');
  const inQuiz = [...read('quiz.md').matchAll(/^\d+\. (.*)$/gm)].map((m) => clean(m[1]));
  assert.deepEqual(inQuiz, data, 'quiz.md matches the data');
});

test('the plain quiz answer in the page is the option the data marks as right (the break: change an answer in one place)', () => {
  const block = quizBlock();
  const answers =[...block.matchAll(/\*\*Answer:\*\* (.*?)\. /g)].map((m) => clean(m[1]).replace(/\.$/, ''));
  card.components.quiz.questions.forEach((q, i) => assert.equal(clean(answers[i]), clean(q.options[q.answer]).replace(/\.$/, ''), `question ${i + 1}`));
});

test('the pass mark in the data is the one the page and quiz.md state in words (the break: change pass to 7)', () => {
  const word = WORDS[card.components.quiz.pass];
  assert.ok(word, 'the pass mark has a word in WORDS');
  const said = new RegExp(`${word} or more`, 'i');
  assert.match(page, said, `the page should say "${word} or more"`);
  assert.match(read('quiz.md'), said, `quiz.md should say "${word} or more"`);
});

test('quiz.md carries no answers', () => {
  assert.doesNotMatch(read('quiz.md'), /\*\*Answer|Answer:/);
});

test('the page says eight commands, the table lists exactly eight, and the animated result only uses commands from the table (the break: add a ninth command)', () => {
  assert.match(page, /eight commands/i);
  const table = must(page.split('## Eight Commands')[1], 'the Eight Commands section').split('\n## ')[0];
  const rows = table.split('\n').filter((l) => /^\| `git /.test(l));
  assert.equal(rows.length, 8, 'eight rows');
  const listed = rows.map((r) => r.match(/^\| `git (\S+)/)[1]);
  const used = card.components.runs.branch.lines
    .map((l) => l.segs.map((s) => s[1]).join(' '))
    .filter((t) => t.startsWith('$ git '))
    .map((t) => t.split(' ')[2]);
  assert.ok(used.length >= 4, 'the result shows at least four commands');
  for (const verb of used) assert.ok(listed.includes(verb), `git ${verb} is in the table`);
});

test('the animated result and the plain code block show the same commands (the break: edit one)', () => {
  const block = page.match(/<!-- site:run branch -->[\s\S]*?```bash\n([\s\S]*?)```/)[1];
  const plain = block.split('\n').filter(Boolean).map((l) => clean(l));
  const animated = card.components.runs.branch.lines.map((l) => clean(l.segs.map((s) => s[1]).join(' ')));
  assert.deepEqual(plain.filter((l) => l.startsWith('$')).map((l) => l.replace(/\s+/g, ' ')), animated.filter((l) => l.startsWith('$')).map((l) => l.replace(/\s+/g, ' ')));
});

test('the course page links the matching product piece (the break: remove the link)', () => {
  assert.match(page, /\]\(https:\/\/rizvihiqrar\.github\.io\/product-portfolio\/case-studies\/03-rejected-ticket-triage\.html\)/);
  assert.match(page, /## See Also/);
});

test('the built guide page has the quiz, the animated result and the folded full version', (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'git-guide-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  buildSite({ root, out, config });
  const html = fs.readFileSync(path.join(out, dir, 'index.html'), 'utf8');
  assert.match(html, /data-site="quiz"/);
  assert.equal((html.match(/class="qitem"/g) ?? []).length, 8);
  assert.match(html, /Read the Full Version/);
  assert.match(html, /git switch -c add-login-check/);
});
