import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSite } from './build.mjs';

// The Jira guide keeps the same facts in five places: the page, its plain quiz, the quiz data in site.json, the animated ticket and the status picture.
// These tests make the places agree, so editing one and forgetting another fails here.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(new URL('./site.json', import.meta.url), 'utf8'));
const dir = '04-technical-enablement/jira-workflow-guide';
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
const readGuide = (f) => read(`${dir}/${f}`);
const card = config.cards.find((c) => c.path === `${dir}/README.md`);
const page = readGuide('README.md');
const full = readGuide('full/jira-workflow-guide-full.md');
const clean = (s) => s.replace(/[`*]/g, '').replace(/[‘’]/g, "'").trim();
const must = (value, what) => { assert.ok(value, `${what} is missing: the test cannot find it`); return value; };
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const quizBlock = () => must(page.match(/<!-- site:quiz -->([\s\S]*?)<!-- \/site:quiz -->/), 'the site:quiz block')[1];
// A Markdown table as rows keyed by column name, so adding or moving a column cannot shift the cells that are compared.
const table = (text) => {
  const rows = text.split('\n').filter((l) => /^\|/.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  return rows.slice(2).map((cells) => Object.fromEntries(cells.map((c, i) => [rows[0][i], c])));
};
const section = (text, heading) => must(text.split(`## ${heading}`)[1], `the ${heading} section`).split('\n## ')[0];
const STATUSES = ['Raised', 'Triaged', 'In Progress', 'In Test', 'Done', 'Reopened'];

test('the guide has a finished card with a quiz and an animated ticket', () => {
  assert.ok(card, 'the Jira guide card exists');
  assert.notEqual(card.status, 'planned');
  assert.ok(card.components.quiz && card.components.runs?.ticket, 'quiz and run data are on the card');
});

test('the quiz data is sound: six questions, three choices each, a reason for each, and the right answer is not always in the same place (the break: answer = 0 everywhere)', () => {
  const { questions, pass } = card.components.quiz;
  assert.equal(questions.length, 6);
  assert.ok(pass > questions.length / 2 && pass <= questions.length, 'the pass mark is above half and within the questions');
  for (const q of questions) {
    assert.equal(q.options.length, 3, `${q.q}: three choices`);
    assert.ok(q.why.length > 10, `${q.q}: a reason is given`);
    assert.equal(new Set(q.options).size, 3, `${q.q}: no choice is repeated`);
  }
  assert.ok(new Set(questions.map((q) => q.answer)).size >= 3, 'the right answer sits in at least three different places');
});

test('the plain quiz in the page, quiz.md and the quiz data ask the same six questions in the same order (the break: reword one)', () => {
  const data = card.components.quiz.questions.map((q) => clean(q.q));
  const inPage = [...quizBlock().matchAll(/^\d+\. (.*?) \*\*Answer:\*\*/gm)].map((m) => clean(m[1]));
  assert.deepEqual(inPage, data, 'the page block matches the data');
  const inQuiz = [...readGuide('quiz.md').matchAll(/^\d+\. (.*)$/gm)].map((m) => clean(m[1]));
  assert.deepEqual(inQuiz, data, 'quiz.md matches the data');
});

test('the plain quiz answer in the page is the option the data marks as right, with the same reason (the break: change an answer or a reason in one place)', () => {
  const answers = [...quizBlock().matchAll(/\*\*Answer:\*\* (.*)$/gm)].map((m) => clean(m[1]));
  assert.equal(answers.length, card.components.quiz.questions.length);
  // the whole line is the right option, a full stop and the reason, so neither can drift from the data
  card.components.quiz.questions.forEach((q, i) => assert.equal(answers[i], clean(`${q.options[q.answer].replace(/\.$/, '')}. ${q.why}`), `question ${i + 1}`));
});

test('the pass mark in the data is the one the page and quiz.md state in words (the break: change pass to 6)', () => {
  const word = WORDS[card.components.quiz.pass];
  assert.ok(word, 'the pass mark has a word in WORDS');
  const said = new RegExp(`${word} or more`, 'i');
  assert.match(page, said, `the page should say "${word} or more"`);
  assert.match(readGuide('quiz.md'), said, `quiz.md should say "${word} or more"`);
  assert.match(readGuide('quiz.md'), new RegExp(`${WORDS[card.components.quiz.questions.length]} questions`, 'i'));
});

test('quiz.md carries no answers', () => {
  assert.doesNotMatch(readGuide('quiz.md'), /\*\*Answer|Answer:/);
});

test('the page says six statuses, the table lists exactly six with one owner each, and the picture names the same six (the break: add a seventh status or drop an owner)', () => {
  assert.match(page, /six statuses/i);
  const rows = table(section(page, 'Six Statuses'));
  assert.deepEqual(rows.map((r) => r.Status), STATUSES);
  for (const r of rows) assert.ok(r['Whose Turn'] && r["The Tester's Job"] && r.Then, `${r.Status}: an owner, a job and what comes next are given`);
  // every status a ticket can move to is a status in the table, so no step leads nowhere
  for (const r of rows) for (const next of r.Then.split(/, or | or /).map((t) => t.replace(/ if .*$/, '').trim())) assert.ok(STATUSES.includes(next) || next === 'Nothing', `${r.Status} leads to ${next}, which is not a status`);
  assert.equal(rows.find((r) => r.Status === 'In Test').Then.startsWith('Done'), true);
  const svg = read(card.visual);
  const at = STATUSES.map((s) => { const i = svg.indexOf(`>${s}<`); assert.ok(i >= 0, `the picture names ${s} exactly as the table does`); return i; });
  assert.deepEqual(at, [...at].sort((a, b) => a - b), 'the picture draws the statuses in the table order');
  assert.match(card.visualAlt, /Reopened/);
});

test('the quiz questions about whose turn agree with the status table (the break: change the owner of In Test)', () => {
  const rows = table(section(page, 'Six Statuses'));
  assert.equal(rows.find((r) => r.Status === 'In Test')['Whose Turn'], 'Tester');
  const first = card.components.quiz.questions[0];
  assert.match(first.q, /In Test/);
  assert.match(first.options[first.answer], /tester/i);
  const third = card.components.quiz.questions[2];
  assert.match(third.options[third.answer], /Reopened/);
});

test('the card title, the page heading and the picture title are the same words (the break: rename the card only)', () => {
  assert.equal(card.title, must(page.match(/^# (.*)$/m), 'the page heading')[1]);
  assert.match(read(card.visual), new RegExp(`<title id="t">${card.title}</title>`));
  assert.equal(card.imageAlt, `Title card: ${card.title}`);
});

test('the animated ticket and the plain block show the same lines, and the ticket has the six parts the page teaches (the break: edit one, or drop Severity)', () => {
  const block = must(page.match(/<!-- site:run ticket -->[\s\S]*?```text\n([\s\S]*?)```/), 'the plain ticket')[1];
  const plain = block.split('\n').filter(Boolean).map((l) => clean(l));
  const animated = card.components.runs.ticket.lines.map((l) => clean(l.segs.map((s) => s[1]).join(' ')));
  assert.deepEqual(plain.map((l) => l.replace(/\s+/g, ' ')), animated.map((l) => l.replace(/\s+/g, ' ')));
  const text = animated.join('\n');
  for (const part of [/^HBL-\d+ \S/m, /Steps/, /Expected:/, /Actual:/, /Severity:/, /Evidence:/]) assert.match(text, part);
  assert.match(page, /six parts/i, 'the page counts the six parts the ticket shows');
  assert.match(full, /Six parts to every ticket/);
  assert.match(full, /all six parts/);
});

test('the example ticket takes the next free key after the sample tickets (the break: change the key or the count)', () => {
  const COUNTS = { eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
  const word = must(full.match(/holds (\w+) sample tickets/), 'the sample ticket count')[1];
  assert.ok(COUNTS[word], `${word} is a count the test knows`);
  const key = Number(must(card.components.runs.ticket.lines[0].segs[0][1].match(/^HBL-(\d+)$/), 'the ticket key')[1]);
  assert.equal(key, COUNTS[word] + 1, 'a new ticket takes the next number');
  assert.ok(page.includes(`HBL-${key} `), 'the page shows the same key');
});

test('the query in the quiz is written the same way in the page, the quiz page and the full version (the break: change the project key)', () => {
  const query = 'project = HBL AND status = "In Test"';
  assert.ok(card.components.quiz.questions.some((q) => q.q.includes(query)));
  assert.ok(readGuide('quiz.md').includes(query));
  assert.ok(full.includes(query));
});

test('the page says plainly that the project and ticket are made up and that no learner data is published (the break: remove the note)', () => {
  assert.match(page, /It is made up/);
  assert.match(page, /No learner data is published here/);
  assert.match(page, /not a real ticket/);
  assert.match(full, /All names, tickets and numbers in the practice project are made up/);
  assert.match(full, /No learner results are published here/);
});

test('the sessions in the table add up to the length on the page (the break: change one session to 45 minutes)', () => {
  const rows = table(section(page, 'Units')).filter((r) => /^\d+$/.test(r.Session));
  assert.equal(rows.length, 3);
  const total = rows.reduce((t, r) => t + Number(r.Minutes), 0);
  assert.equal(total, 90);
  assert.match(page, /90 minutes: 3 sessions of 30 minutes/);
  assert.match(card.facts.join(' '), /3 sessions, 90 minutes/);
  const fullRows = table(section(full, 'The Three Sessions'));
  assert.deepEqual(fullRows.map((r) => r.Minutes), rows.map((r) => r.Minutes));
  assert.deepEqual(fullRows.map((r) => r.Session.replace(/^\d+\. /, '')), rows.map((r) => r.Unit.replace(/^\d+\. /, '')));
});

test('the course page links both matching product pieces (the break: remove a link)', () => {
  assert.match(page, /\]\(https:\/\/rizvihiqrar\.github\.io\/product-portfolio\/case-studies\/03-rejected-ticket-triage\.html\)/);
  assert.match(page, /\]\(https:\/\/rizvihiqrar\.github\.io\/product-portfolio\/case-studies\/08-release-notes-to-a-change-brief\.html\)/);
  assert.match(page, /## See Also/);
});

test('the root README and the section README list the guide', () => {
  assert.match(read('README.md'), /\]\(https:\/\/rizvihiqrar\.github\.io\/training-portfolio\/04-technical-enablement\/jira-workflow-guide\/\)/);
  assert.match(read('04-technical-enablement/README.md'), /\]\(jira-workflow-guide\/\)/);
});

test('the built guide page has the quiz, the animated ticket and the folded full version', (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'jira-guide-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  buildSite({ root, out, config });
  const html = fs.readFileSync(path.join(out, dir, 'index.html'), 'utf8');
  assert.match(html, /data-site="quiz"/);
  assert.equal((html.match(/class="qitem"/g) ?? []).length, 6);
  assert.match(html, /Read the Full Version/);
  assert.match(html, /Login stays on the page after a correct password/);
});

test('Getting Started links the free Jira sign-up before anything else, and the card line stays short (the break: remove the link or pad the line)', () => {
  const start = must(page.split('## Getting Started')[1], 'the Getting Started section').split(String.fromCharCode(10) + '## ')[0];
  assert.match(start, /\]\(https:\/\/www\.atlassian\.com\/software\/jira\/free\)/, 'the sign-up link is there');
  assert.ok(start.trim().startsWith('First, make a [free Atlassian account]('), 'the account is the first thing asked');
  assert.ok(start.indexOf('atlassian.com') < start.indexOf('invit'), 'the account comes before the invitation');
  assert.ok(card.oneLiner.split(/\s+/).length <= 14, `the card line is ${card.oneLiner.split(/\s+/).length} words, over 14`);
});
