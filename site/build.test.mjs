import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { rewriteHref, renderMarkdown, buildSite, checkSite, repoRoot } from './build.mjs';

const config = JSON.parse(fs.readFileSync(new URL('./site.json', import.meta.url), 'utf8'));

function scratch(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('Markdown links become site links; web links and anchors are left alone', () => {
  assert.equal(rewriteHref('quiz.md'), 'quiz.html');
  assert.equal(rewriteHref('quiz.md#part'), 'quiz.html#part');
  assert.equal(rewriteHref('../01-a/b/README.md'), '../01-a/b/');
  assert.equal(rewriteHref('README.md'), './');
  assert.equal(rewriteHref('materials/plan.docx'), 'materials/plan.docx');
  assert.equal(rewriteHref('https://example.com/a.md'), 'https://example.com/a.md');
  assert.equal(rewriteHref('#coming-next'), '#coming-next');
});

test('a tip becomes a callout, a diagram becomes a diagram block, a table gets a scroll wrapper', () => {
  const { html, hasMermaid, title } = renderMarkdown('# Page Title\n\n> [!TIP]\n> Read this first.\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n[next](next.md#x)\n');
  assert.equal(title, 'Page Title');
  assert.match(html, /<aside class="callout callout-tip"><p class="callout-title">Tip<\/p><p>Read this first\./);
  assert.ok(hasMermaid);
  assert.match(html, /<pre class="mermaid">flowchart LR/);
  assert.match(html, /<div class="table-wrap"[^>]*><table>/);
  assert.match(html, /href="next\.html#x"/);
  assert.match(html, /<h1 id="page-title">/);
});

test('the real repository builds into a site where every link and every anchor resolves', (t) => {
  const out = scratch(t);
  const pages = buildSite({ root: repoRoot, out, config });
  assert.ok(pages.includes('index.html'));
  assert.ok(pages.includes('01-onboarding-programs/qa-automation-onboarding/index.html'));
  assert.deepEqual(checkSite(out), []);
  assert.ok(fs.existsSync(path.join(out, '01-onboarding-programs/qa-automation-onboarding/materials/qa-automation-2-week-schedule.docx')), 'downloads are copied');
});

test('a link to a page that is not in the site is reported (the break: a page is renamed, its link is not)', (t) => {
  const root = scratch(t);
  const out = scratch(t);
  fs.mkdirSync(path.join(root, '01-a'));
  fs.writeFileSync(path.join(root, '01-a', 'README.md'), '# Course\n\n[gone](missing.md) and [here](#course)\n');
  const small = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [{ title: 'C', path: '01-a/README.md', chips: [], summary: 's', button: 'Open' }], courseNav: [] };
  buildSite({ root, out, config: small });
  assert.deepEqual(checkSite(out), ['01-a/index.html links to missing.html, which is not in the site']);
});

test('a link to a heading that does not exist is reported', (t) => {
  const root = scratch(t);
  const out = scratch(t);
  fs.mkdirSync(path.join(root, '01-a'));
  fs.writeFileSync(path.join(root, '01-a', 'README.md'), '# Course\n\n[x](other.md#nope)\n');
  fs.writeFileSync(path.join(root, '01-a', 'other.md'), '# Other\n');
  const small = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [{ title: 'C', path: '01-a/README.md', chips: [], summary: 's', button: 'Open' }], courseNav: [] };
  buildSite({ root, out, config: small });
  assert.deepEqual(checkSite(out), ['01-a/index.html links to other.html#nope, but that page has no #nope']);
});

test('every page has one h1, a main landmark, a skip link and a theme button', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config });
  for (const rel of ['index.html', '01-onboarding-programs/qa-automation-onboarding/index.html', 'docs/overview.html']) {
    const html = fs.readFileSync(path.join(out, rel), 'utf8');
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, `${rel} has one h1`);
    assert.match(html, /<main id="main"/);
    assert.match(html, /class="skip"/);
    assert.match(html, /id="theme-toggle"/);
  }
});

test('a table with an empty header row is shown without a header bar', () => {
  const { html } = renderMarkdown('| | |\n|---|---|\n| Audience | Testers |\n');
  assert.doesNotMatch(html, /<thead>/);
  assert.match(html, /<td>Audience<\/td>/);
});

test('only one tab in the course navigation is marked as the current page', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config });
  const html = fs.readFileSync(path.join(out, '01-onboarding-programs/qa-automation-onboarding/index.html'), 'utf8');
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
  const quiz = fs.readFileSync(path.join(out, '01-onboarding-programs/qa-automation-onboarding/quiz-and-answer-key.html'), 'utf8');
  assert.match(quiz, /<a href="quiz-and-answer-key\.html" aria-current="page">Quiz<\/a>/);
});
