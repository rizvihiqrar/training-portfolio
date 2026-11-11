import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { codeBox, convertHandouts, enhanceCodeBlocks, relocate, rewriteHref, stageReadingPage, renderMarkdown, buildSite, checkSite, repoRoot, pageHtml, escapeHtml, PUBLISHED_FILES, HANDOUTS, contactHtml, previewKey, projectOf, iconsHtml, withItemHeads, cleanHandoutHtml } from './build.mjs';

const liveConfig = JSON.parse(fs.readFileSync(new URL('./site.json', import.meta.url), 'utf8'));
// The earlier tests check the default look; the stageshow tests below switch the theme on themselves.
const config = { ...liveConfig, theme: undefined };

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
  const small = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [{ title: 'C', path: '01-a/README.md', label: 'Course', tags: ['Onboarding'], summary: 's', button: 'Open' }], courseNav: [] };
  buildSite({ root, out, config: small });
  assert.deepEqual(checkSite(out), ['01-a/index.html links to missing.html, which is not in the site']);
});

test('a link to a heading that does not exist is reported', (t) => {
  const root = scratch(t);
  const out = scratch(t);
  fs.mkdirSync(path.join(root, '01-a'));
  fs.writeFileSync(path.join(root, '01-a', 'README.md'), '# Course\n\n[x](other.md#nope)\n');
  fs.writeFileSync(path.join(root, '01-a', 'other.md'), '# Other\n');
  const small = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [{ title: 'C', path: '01-a/README.md', label: 'Course', tags: ['Onboarding'], summary: 's', button: 'Open' }], courseNav: [] };
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
  const quiz = fs.readFileSync(path.join(out, '01-onboarding-programs/qa-automation-onboarding/quiz.html'), 'utf8');
  assert.match(quiz, /<a href="quiz\.html" aria-current="page">Quiz<\/a>/);
});

test('a callout inside a quote, and a quote after a callout, keep their tags balanced', () => {
  const { html } = renderMarkdown('> A quote.\n>\n> > [!NOTE]\n> > Inner note.\n\n> [!TIP]\n> Tip text.\n\n> Another quote.\n');
  assert.equal((html.match(/<blockquote>/g) ?? []).length, (html.match(/<\/blockquote>/g) ?? []).length);
  assert.equal((html.match(/<aside /g) ?? []).length, 2);
  assert.doesNotMatch(html, /data-plain/);
});

test('example links inside code are not rewritten', () => {
  const { html } = renderMarkdown('Use `<a href="quiz.md">` and:\n\n```html\n<a href="quiz.md">x</a>\n```\n\n[real](quiz.md)\n');
  assert.equal((html.match(/href="quiz\.html"/g) ?? []).length, 1);
  assert.match(html, /&lt;a href=&quot;quiz\.md&quot;&gt;/);
});

test('only handouts and images are published, never editor or lock files', () => {
  for (const ok of ['materials/plan.docx', 'a/b.PNG', 'docs/assets/banner.svg']) assert.ok(PUBLISHED_FILES.test(ok), ok);
  for (const no of ['materials/~$plan.docx.tmp', '.DS_Store', 'notes.bak', 'draft.html']) assert.ok(!PUBLISHED_FILES.test(no), no);
});

test('a lock file next to a handout is not copied into the site', (t) => {
  const root = scratch(t);
  const out = scratch(t);
  fs.mkdirSync(path.join(root, '01-a'));
  fs.writeFileSync(path.join(root, '01-a', 'README.md'), '# Course\n\n[plan](plan.docx)\n');
  fs.writeFileSync(path.join(root, '01-a', 'plan.docx'), 'x');
  fs.writeFileSync(path.join(root, '01-a', '~$plan.docx'), 'lock');
  const small = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [{ title: 'C', path: '01-a/README.md', label: 'Course', tags: ['Onboarding'], summary: 's', button: 'Open' }], courseNav: [] };
  buildSite({ root, out, config: small });
  assert.ok(fs.existsSync(path.join(out, '01-a', 'plan.docx')));
  assert.ok(!fs.existsSync(path.join(out, '01-a', '~$plan.docx')));
});

test('two files that would become the same page stop the build', (t) => {
  const root = scratch(t);
  const out = scratch(t);
  fs.mkdirSync(path.join(root, '01-a'));
  fs.writeFileSync(path.join(root, '01-a', 'README.md'), '# One\n');
  fs.writeFileSync(path.join(root, '01-a', 'index.md'), '# Two\n');
  const small = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [{ title: 'C', path: '01-a/README.md', label: 'Course', tags: ['Onboarding'], summary: 's', button: 'Open' }], courseNav: [] };
  assert.throws(() => buildSite({ root, out, config: small }), /two files would both become 01-a\/index\.html/);
});

test('a malformed percent sequence in a link is reported, not a crash', (t) => {
  const root = scratch(t);
  const out = scratch(t);
  fs.mkdirSync(path.join(root, '01-a'));
  fs.writeFileSync(path.join(root, '01-a', 'README.md'), '# Course\n\n[x](50%.md)\n');
  const small = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [{ title: 'C', path: '01-a/README.md', label: 'Course', tags: ['Onboarding'], summary: 's', button: 'Open' }], courseNav: [] };
  buildSite({ root, out, config: small });
  assert.deepEqual(checkSite(out), ['01-a/index.html links to 50%.html, which is not in the site']);
});

test('the quiz page has no answers, and the answer key is not in the published site', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config });
  const quiz = fs.readFileSync(path.join(out, '01-onboarding-programs/qa-automation-onboarding/quiz.html'), 'utf8');
  assert.doesNotMatch(quiz, /Answer Key/i);
  assert.doesNotMatch(quiz, /Ctrl\+`<\/code>|Runs any VS Code action/);
  assert.ok(!fs.existsSync(path.join(out, '01-onboarding-programs/qa-automation-onboarding/quiz-and-answer-key.html')));
});

test('no page or file anywhere in the published site is an answer key', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config });
  const files = [];
  (function walkOut(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkOut(p);
      else files.push(p);
    }
  })(out);
  for (const f of files) {
    assert.doesNotMatch(path.basename(f), /answer/i, `${f} is named like an answer key`);
    if (f.endsWith('.html')) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /<h[1-6][^>]*>\s*Answer Key/i, `${f} has an Answer Key heading`);
  }
});

test('the step lengths in each lesson plan add up to the total it states', () => {
  const plans = [];
  (function walkRepo(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '_site', '.git'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkRepo(p);
      else if (/lesson-plan.*\.md$/.test(e.name)) plans.push(p);
    }
  })(repoRoot);
  assert.ok(plans.length >= 2, 'the lesson plan and its template are both checked');
  for (const p of plans) {
    const text = fs.readFileSync(p, 'utf8');
    const total = Number((text.match(/\*\*Total:\*\*\s*(\d+) min/) ?? [])[1]);
    const steps = [...text.matchAll(/^\|\s*(\d+) min\s*\|/gm)].map((m) => Number(m[1]));
    assert.ok(total > 0 && steps.length > 0, `${p} states a total and its step lengths`);
    assert.equal(steps.reduce((a, b) => a + b, 0), total, `${p}: the steps add up to ${total} min`);
  }
});

test('every link in the front README that points into the live site is a real page, and its heading exists', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config });
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const own = [...readme.matchAll(/\]\((https:\/\/rizvihiqrar\.github\.io\/[^)\s]+)\)/g)].map((m) => m[1]).filter((u) => u.startsWith(config.siteUrl));
  assert.ok(own.length > 0, 'the README links into its own site');
  for (const url of own) {
    const [rel, anchor] = url.slice(config.siteUrl.length).split('#');
    const target = rel === '' || rel.endsWith('/') ? path.join(out, rel, 'index.html') : path.join(out, rel);
    assert.ok(fs.existsSync(target), `${url} is a page in the built site`);
    if (anchor) assert.match(fs.readFileSync(target, 'utf8'), new RegExp(`\\sid="${anchor}"`), `${url} has the heading #${anchor}`);
  }
});

const read = (out, rel) => fs.readFileSync(path.join(out, rel), 'utf8');

test('the home page is a plain list: one linked entry with a thumbnail and title for each finished piece, and no filters, buttons or hero', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config });
  const html = read(out, 'index.html');
  const ready = config.cards.filter((c) => c.status !== 'planned');
  assert.equal((html.match(/<a class="work" href=/g) ?? []).length, ready.length);
  for (const c of ready) {
    assert.ok(html.includes(`href="${rewriteHref(c.path)}"`), `${c.title} links to its page`);
    assert.ok(html.includes(`<span class="work-title">${escapeHtml(c.title)}</span>`), `${c.title} is listed`);
  }
  assert.doesNotMatch(html, /class="filter|class="btn|class="hero|Get in Touch|data-filter|filter-status/);
});

test('a planned piece is not on the home page, so nothing there reads Coming Soon (the break: list every card)', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config });
  const html = read(out, 'index.html');
  const planned = config.cards.filter((c) => c.status === 'planned');
  assert.ok(planned.length > 0, 'the plan stays in site.json');
  for (const c of planned) assert.ok(!html.includes(escapeHtml(c.title)), `${c.title} is not listed yet`);
  assert.doesNotMatch(html, /Coming Soon/);
});

test('every course folder has a card (the break: add a course, forget its card)', () => {
  const onCards = new Set(config.cards.map((c) => c.path).filter(Boolean));
  const courses = [];
  for (const section of fs.readdirSync(repoRoot, { withFileTypes: true })) {
    if (!section.isDirectory() || !/^\d\d-/.test(section.name)) continue;
    for (const c of fs.readdirSync(path.join(repoRoot, section.name), { withFileTypes: true })) {
      if (c.isDirectory() && fs.existsSync(path.join(repoRoot, section.name, c.name, 'README.md'))) courses.push(`${section.name}/${c.name}/README.md`);
    }
  }
  assert.ok(courses.length > 0);
  for (const c of courses) assert.ok(onCards.has(c), `${c} has a card in site.json`);
});

test('every ready card has a preview image that exists, with alt text, and it matches the card', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'docs/assets/previews/manifest.json'), 'utf8'));
  for (const c of config.cards.filter((x) => x.status !== 'planned')) {
    assert.ok(c.image && c.imageAlt, `${c.title} has an image and alt text`);
    assert.ok(fs.existsSync(path.join(repoRoot, c.image)), `${c.image} exists (run: npm run previews)`);
    assert.equal(manifest[c.image], previewKey(c, config.name), `${c.image} is out of date: run npm run previews in site/`);
  }
  const c = config.cards[0];
  assert.notEqual(previewKey(c, config.name), previewKey({ ...c, title: `${c.title}!` }, config.name));
});

test('the email and LinkedIn links are at the top of the home page and in the footer of every page, and the About page exists', (t) => {
  const out = scratch(t);
  const pages = buildSite({ root: repoRoot, out, config });
  assert.ok(pages.includes('docs/about.html'));
  assert.match(contactHtml(config), /^<p class="links"><a href="mailto:[^"]+">Email<\/a><a href="https:\/\/www\.linkedin\.com\/in\/[^"]+">LinkedIn<\/a><a href="[^"]+">About Me<\/a><a href="https:\/\/github\.com\/rizvihiqrar\/[^"]+">GitHub<\/a><\/p>$/);
  const top = read(out, 'index.html').split('<section id=')[0];
  assert.match(top, /href="mailto:/);
  assert.match(top, /linkedin\.com\/in\//);
  for (const rel of ['index.html', 'docs/about.html', '01-onboarding-programs/qa-automation-onboarding/index.html']) {
    const foot = read(out, rel).split('<footer')[1];
    assert.match(foot, /href="mailto:/);
    assert.match(foot, /linkedin\.com\/in\//);
  }
});

test('each table is named after the heading above it, and each page has its own description', () => {
  const { html, description } = renderMarkdown('# Title\n\nIntro sentence here.\n\n## Roles\n\n| A | B |\n|---|---|\n| 1 | 2 |\n');
  assert.match(html, /aria-label="Roles table"/);
  assert.equal(description, 'Intro sentence here.');
});

test('a collision stops the build before anything is written', (t) => {
  const root = scratch(t);
  const out = scratch(t);
  fs.mkdirSync(path.join(root, 'docs'));
  fs.writeFileSync(path.join(root, 'docs', 'README.md'), '# One\n');
  fs.writeFileSync(path.join(root, 'docs', 'index.md'), '# Two\n');
  const cfg = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [], courseNav: [] };
  assert.throws(() => buildSite({ root, out, config: cfg }), /two files would both become docs\/index\.html/);
  assert.ok(!fs.existsSync(path.join(out, 'docs', 'index.html')), 'nothing was written');
});

test('csv and txt files are not published, and a link with a query string still points at the built page', () => {
  for (const no of ['data.csv', 'notes.txt']) assert.ok(!PUBLISHED_FILES.test(no), no);
  assert.equal(rewriteHref('other.md?plain=1'), 'other.html');
  assert.equal(rewriteHref('other.md?plain=1#part'), 'other.html#part');
});

test('a page description with an ampersand or quotes is escaped once, not twice', () => {
  const { description } = renderMarkdown('# T\n\nTom & "Jerry" <b>and</b> friends.\n');
  assert.equal(description, 'Tom & "Jerry" and friends.');
  const html = pageHtml({ config, title: 'T', body: '', depth: 0, description });
  assert.match(html, /<meta name="description" content="Tom &amp; &quot;Jerry&quot; and friends\.">/);
  assert.doesNotMatch(html, /&amp;amp;/);
});

test('table names are decoded once, a second table under one heading is numbered, and a table with no heading is still named', () => {
  const md = '| A |\n|---|\n| 1 |\n\n## Q&A\n\n| B |\n|---|\n| 2 |\n\n| C |\n|---|\n| 3 |\n';
  const { html } = renderMarkdown(md);
  assert.match(html, /aria-label="Opening table"/);
  assert.match(html, /aria-label="Q&amp;A table"/);
  assert.match(html, /aria-label="Q&amp;A table 2"/);
  assert.doesNotMatch(html, /&amp;amp;/);
});

test('the About page uses the same email and LinkedIn address as the footer and contact buttons', () => {
  const about = fs.readFileSync(path.join(repoRoot, 'docs/about.md'), 'utf8');
  assert.ok(about.includes(`mailto:${config.contact.email}`), 'the email matches site.json');
  assert.ok(about.includes(config.contact.linkedin), 'the LinkedIn address matches site.json');
});

test('two sections that happen to share a heading each get their own table name, not a number', () => {
  const { html } = renderMarkdown('## A\n\n## Results\n\n| X |\n|---|\n| 1 |\n\n## B\n\n## Results\n\n| Y |\n|---|\n| 2 |\n');
  assert.equal((html.match(/aria-label="Results table"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /Results table 2/);
});

test('a heading with an apostrophe is escaped once in the page title, not twice (the break: skip the decode)', () => {
  const { title } = renderMarkdown("# One Person's Time & Money\n\ntext\n");
  assert.equal(title, "One Person's Time & Money");
  const html = pageHtml({ config, title, body: '', depth: 0 });
  assert.ok(html.includes("<title>One Person's Time &amp; Money | "), 'the title is escaped once');
  assert.doesNotMatch(html, /&amp;#39;|&amp;amp;/);
});

// The stageshow look: a header that stays put, the projects listed on the left, chips on the home page and every project
// on the same page below them. It is off unless the theme is set.
const stage = { ...config, theme: 'stageshow', handoutHtml: await convertHandouts(repoRoot, config) };
const OWN = '01-onboarding-programs/qa-automation-onboarding/index.html';
const ready = config.cards.filter((c) => c.status !== 'planned');
const idOf = (c) => c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

test('stageshow home: a chip for each finished project with its visual, title and facts, and none for a planned one', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  const html = read(out, 'index.html');
  const chips = html.split('<ul class="chips">')[1].split('</ul>')[0];
  assert.equal((chips.match(/<a class="chip" href="#/g) ?? []).length, ready.length);
  for (const c of ready) {
    assert.ok(chips.includes(`<a class="chip" href="#${idOf(c)}">`), `${c.title} has a chip that goes to it`);
    assert.ok(chips.includes(`<span class="chip-title">${escapeHtml(c.title)}</span>`), `${c.title} is named`);
    assert.ok(chips.includes(`<img class="chip-img" src="${c.visual}"`), `${c.title} has its visual`);
    assert.ok(c.facts.length >= 2 && chips.includes(escapeHtml(c.facts[0])), `${c.title} shows what it is about`);
  }
  for (const c of config.cards.filter((x) => x.status === 'planned')) assert.ok(!html.includes(escapeHtml(c.title)), `${c.title} is not shown yet`);
  assert.doesNotMatch(html, /Coming Soon|class="filter|class="btn|class="hero/);
});

test('stageshow home: every chip goes to a project written out on the same page, in the same order, each with a way back up', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  const html = read(out, 'index.html');
  const sections = [...html.matchAll(/<section class="project" id="([^"]+)">/g)].map((m) => m[1]);
  assert.deepEqual(sections, ready.map(idOf));
  assert.equal((html.match(/<p class="to-top"><a href="#projects">/g) ?? []).length, ready.length);
  assert.match(html, /<section id="projects"/);
  for (const c of ready) assert.ok(html.includes(`<h2 class="proj-title">${escapeHtml(c.title)}</h2>`), `${c.title} has its head`);
});

test('stageshow home: no id is used twice, though two projects can both have a section called The Problem (the break: skip the project name in front)', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  const ids = [...read(out, 'index.html').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const twice = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(twice, []);
  assert.equal([...read(out, 'index.html').matchAll(/<h1[ >]/g)].length, 1, 'one h1');
});

test('stageshow: the header with your name, the portfolio name and the symbol buttons is on every page', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  for (const rel of ['index.html', 'docs/about.html', OWN]) {
    const html = read(out, rel);
    const bar = html.split('<header class="topbar">')[1].split('</header>')[0];
    assert.ok(bar.includes(`<span class="me">${escapeHtml(config.owner)}</span>`), `${rel}: your name`);
    assert.ok(bar.includes(`<span class="pf">${escapeHtml(config.name)}</span>`), `${rel}: the portfolio's name`);
    for (const label of ['About Me', 'Send an Email', 'LinkedIn', 'Instagram', 'X', 'Source on GitHub']) {
      assert.match(bar, new RegExp(`<a class="icon-btn" href="[^"]+" aria-label="${label}" title="${label}"><svg`), `${rel}: ${label} is a symbol button`);
    }
    assert.ok(bar.includes(`href="${config.contact.instagram}"`) && bar.includes(`href="${config.contact.x}"`), `${rel}: Instagram and X go to the accounts in site.json`);
    assert.match(bar, /<button id="theme-toggle"/);
    assert.doesNotMatch(bar.split('<div class="icons">')[1].replace(/<svg[\s\S]*?<\/svg>/g, ''), />\s*[A-Za-z]/, `${rel}: no visible text inside the buttons`);
  }
});

test('stageshow: every page lists all the finished projects on the left, and the home page lists each one\'s sections under it', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  for (const rel of ['index.html', 'docs/about.html', OWN]) {
    const nav = read(out, rel).split('<nav class="side-nav"')[1].split('</nav>')[0];
    assert.equal((nav.match(/<li data-id="/g) ?? []).length, ready.length + 1, `${rel}: every project and About Me are listed`);
    assert.match(nav, /class="side-top" href="[^"]*#projects">&#8593; All /);
  }
  const home = read(out, 'index.html');
  const homeNav = home.split('<nav class="side-nav"')[1].split('</nav>')[0];
  for (const c of ready) {
    const sub = homeNav.split(`<li data-id="${idOf(c)}"`)[1].split('</ul>')[0];
    const anchors = [...sub.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]).slice(1);
    assert.ok(anchors.length >= 2, `${c.title} lists its sections`);
    for (const id of anchors) assert.match(home, new RegExp(`\\sid="${id}"`), `#${id} is on the page`);
  }
});

test('stageshow project page: the head with its visual, the project marked in the list, and its own sections under it', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  const html = read(out, OWN);
  const c = ready.find((x) => OWN.startsWith(x.path.replace(/(README\.md|\.md)$/i, '').replace(/\/$/, '')) || x.path.replace(/\.md$/, '.html') === OWN) ?? ready[0];
  assert.match(html, /<header class="proj-head">/);
  assert.ok(html.includes(`<h1 class="proj-title">${escapeHtml(c.title)}</h1>`));
  assert.match(html, /<div class="proj-visual"><img src="(\.\.\/)*[^"]+"/);
  const nav = html.split('<nav class="side-nav"')[1].split('</nav>')[0];
  assert.ok(nav.includes(`<li data-id="${idOf(c)}" data-current="">`), 'the current project is marked');
  const anchors = [...nav.split(`<li data-id="${idOf(c)}"`)[1].split('</ul>')[0].matchAll(/href="#([^"]+)"/g)].map((m) => m[1]).slice(1);
  assert.ok(anchors.length >= 2);
  for (const id of anchors) assert.match(html, new RegExp(`\\sid="${id}"`), `#${id} is on the page`);
  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, 'one h1');
});

test('stageshow: the page title is escaped once, and every page has a skip link, a main landmark and one theme button', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  for (const rel of ['index.html', 'docs/about.html', OWN]) {
    const html = read(out, rel);
    assert.doesNotMatch(html, /&amp;#39;|&amp;amp;/);
    assert.match(html, /<a class="skip" href="#main">/);
    assert.match(html, /<main id="main" class="col">/);
    assert.equal((html.match(/<button id="theme-toggle"/g) ?? []).length, 1, `${rel}: one theme button`);
  }
});

test('every link, image and in-page anchor in a stageshow build resolves, and the default build has none of the stageshow markup or styles (the break: always on)', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  assert.deepEqual(checkSite(out), []);
  assert.match(read(out, 'site.css'), /The stageshow look/);
  assert.match(read(out, 'index.html'), /Copy code/, 'code blocks get a copy button');
  const plain = scratch(t);
  buildSite({ root: repoRoot, out: plain, config });
  assert.doesNotMatch(read(plain, 'index.html'), /class="stage|class="icons"|class="topbar"|class="side-nav"/);
  assert.doesNotMatch(read(plain, 'site.css'), /stageshow look/);
});

test('relocate points a project\'s relative links and images at the site root, and leaves web links and anchors alone', () => {
  const html = '<a href="../docs/overview.html#x">a</a><img src="../docs/assets/a.png"><a href="https://x.org/a">b</a><a href="#top">c</a><a href="./">d</a><a href="mailto:a@b.c">e</a>';
  assert.equal(relocate(html, 'case-studies'),
    '<a href="docs/overview.html#x">a</a><img src="docs/assets/a.png"><a href="https://x.org/a">b</a><a href="#top">c</a><a href="case-studies/">d</a><a href="mailto:a@b.c">e</a>');
  assert.equal(relocate(html, ''), html);
});

test('stageshow shows no kind or year: not on the chips, and not on a project\'s head either', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  const home = read(out, 'index.html');
  const chips = home.split('<ul class="chips">')[1].split('</ul>')[0];
  assert.doesNotMatch(chips, /chip-year|\b20\d\d\b/);
  for (const c of ready) assert.ok(!chips.includes(`>${escapeHtml(c.label)}<`) && !chips.includes(`${escapeHtml(c.label)} \u00b7`), `${c.title}: the kind is not on its chip`);
  for (const rel of ['index.html', OWN]) assert.doesNotMatch(read(out, rel), /proj-kind|proj-year/, `${rel}: no kind or year on a project head`);
  assert.ok(ready.every((c) => c.year === undefined), 'site.json no longer carries a year');
});

test('stageshow home: nothing sits above the chips (the intro line is only the page description), and the page keeps one hidden h1', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  const html = read(out, 'index.html');
  const main = html.split('<main id="main"')[1];
  assert.doesNotMatch(main, /entry-lead/);
  assert.ok(!main.split('<section id="projects"')[0].includes(escapeHtml(config.intro)), 'the intro sentence is not above the chips');
  assert.match(main, /<h1 class="sr-only">/);
});

test('every finished project has a real visual that exists, is described for screen readers and stands still for people who ask for less motion (the break: use the title card)', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  const home = read(out, 'index.html');
  for (const c of ready) {
    assert.ok(c.visual && c.visualAlt, `${c.title} has a visual and a description`);
    assert.ok(fs.existsSync(path.join(repoRoot, c.visual)), `${c.visual} exists`);
    assert.ok(fs.existsSync(path.join(out, c.visual)), `${c.visual} is published`);
    const svg = fs.readFileSync(path.join(repoRoot, c.visual), 'utf8');
    assert.match(svg, /<title id="t">[^<]+<\/title>/);
    assert.match(svg, /<desc id="d">[^<]+<\/desc>/);
    assert.match(svg, /prefers-reduced-motion: reduce/, `${c.title}: its animation stops for reduced motion`);
    assert.ok(home.includes(`<img class="chip-img" src="${c.visual}"`), `${c.title}: the chip uses the visual`);
    assert.ok(home.includes(`<div class="proj-visual"><img src="${c.visual}"`), `${c.title}: the project head uses the visual`);
  }
});

test('in light mode the grey text is dark enough to read easily (at least 9 to 1 on white)', () => {
  const css = fs.readFileSync(new URL('./stage.css', import.meta.url), 'utf8');
  const rule = css.match(/:root:not\(\[data-theme="dark"\]\) body\.stage \{([^}]*)\}/);
  assert.ok(rule, 'a light-mode rule for the stage look exists');
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  for (const name of ['--text-2', '--text-3']) {
    const hex = rule[1].match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))[1];
    assert.ok(1.05 / (lum(hex) + 0.05) >= 9, `${name} ${hex} is dark enough`);
  }
  assert.doesNotMatch(css.split(rule[0])[1] ?? '', /data-theme="dark"\]\) body\.stage/);
});

test('the course page does not open with an In one sentence label, and neither does the course template', () => {
  for (const f of ['01-onboarding-programs/qa-automation-onboarding/README.md', 'docs/templates/course-page-template.md']) {
    assert.doesNotMatch(fs.readFileSync(path.join(repoRoot, f), 'utf8'), /In one sentence/, f);
  }
});

test('the course chip says its audience is all level testers', () => {
  const course = config.cards.find((c) => c.title === 'QA Automation Onboarding');
  assert.equal(course.facts[0], 'Audience: all level testers');
});

test('the stage stylesheet fits the screen: a fixed header, a list and page that share the whole width, running text kept to a readable line, and a sideways list on narrow screens', () => {
  const css = fs.readFileSync(new URL('./stage.css', import.meta.url), 'utf8');
  assert.match(css, /\.topbar\s*\{[^}]*position:\s*sticky/);
  assert.match(css, /\.shell\b[^{]*\{[^}]*grid-template-columns:\s*var\(--side-w\) minmax\(0,\s*1fr\)/, 'the page takes the width the list leaves');
  assert.doesNotMatch(css, /\b(7[0-9]{2}|8[0-9]{2})px\)\s*;?\s*column-gap/, 'no fixed page width');
  assert.match(css, /--read:\s*76ch/, 'text keeps a readable line length');
  assert.match(css, /\.proj-head\s*\{[^}]*grid-template-columns:\s*minmax\(260px,\s*4\.4fr\) minmax\(0,\s*5\.6fr\)/, 'the visual takes just over half of a project head, so the text beside it has room');
  assert.match(css, /\.chips\s*\{[^}]*repeat\(auto-fill,\s*minmax\(clamp\(/, 'the chips fill the width');
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.side-nav\s*\{[^}]*overflow-x:\s*auto/);
});

test('stageshow: the left list follows the scroll the same way down and up (the break: go back to reacting only when a section enters a band)', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  const html = read(out, 'index.html');
  const script = html.split('<script>').map((s) => s.split('</script>')[0]).find((s) => s.includes('data-active'));
  assert.ok(script, 'the page has a scroll script for the list');
  assert.match(script, /addEventListener\('scroll'/, 'it checks the position on every scroll');
  assert.doesNotMatch(script, /IntersectionObserver/, 'it does not depend on a section entering a band, which missed scrolling up');
  assert.match(script, /var cur=null;/, 'at the very top nothing is open, and a project opens only once its section is in view');
  assert.doesNotMatch(script, /classList\.contains/, 'no project is picked as a default above the About section');
});

test('stageshow: About Me is written on the home page above the first project, first in the left list, and the top button goes to it (the break: put it back after the projects)', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  const home = read(out, 'index.html');
  const about = home.indexOf('<section class="about" id="about">');
  const first = home.indexOf('<section class="project"');
  assert.ok(about > 0 && first > about, 'the About section comes before the first project');
  assert.ok(home.indexOf('id="projects"') < about, 'the chips come first');
  for (const rel of ['index.html', OWN]) {
    const html = read(out, rel);
    const list = html.split('<ol class="side-list">')[1];
    assert.match(list, /^<li data-id="about"><a href="[^"]*#about">About Me<\/a>/, 'About Me is the first item in the left list');
    assert.match(html, /<a class="icon-btn" href="[^"]*index\.html#about" aria-label="About Me"/, 'the top button goes to the About section');
  }
});

test('the published site uses the stageshow look (the break: remove the theme from site.json)', () => {
  assert.equal(liveConfig.theme, 'stageshow');
});

test('review fixes: a project in the repo root does not own every page, About is only linked when it exists, and the entries go under the section the card names', () => {
  const cards = [{ title: 'Root', path: 'README.md', status: 'ready' }, { title: 'Other', path: 'a/README.md', status: 'ready' }];
  assert.equal(projectOf({ cards }, 'a/index.md')?.title, 'Other');
  assert.equal(projectOf({ cards }, 'docs/x.md'), undefined, 'a root README owns only itself');
  assert.doesNotMatch(iconsHtml({ ...config, theme: 'stageshow', hasAbout: false }, ''), /index\.html#about/, 'no About link without an About page');
  assert.match(iconsHtml({ ...config, theme: 'stageshow' }, ''), /index\.html#about/);
  const heads = [{ text: 'Course Materials', href: '#course-materials' }, { text: 'Next', href: '#next' }];
  const items = [{ text: 'Plan', href: '#plan' }];
  assert.deepEqual(withItemHeads(heads, items, 'course-materials').map((h) => h.text), ['Course Materials', 'Plan', 'Next']);
});

test('review fixes: Word handouts lose their bookmark ids and in-page links, and the copy button says when it failed', () => {
  assert.equal(cleanHandoutHtml('<p><a id="_Toc1"></a>Title <a href="#_Toc1">link</a> <a href="https://x.y">out</a></p>'), '<p>Title link <a href="https://x.y">out</a></p>');
  const copy = fs.readFileSync(new URL('./build.mjs', import.meta.url), 'utf8').match(/const COPY_SCRIPT = `[^\n]*`;/)[0];
  assert.match(copy, /Copy failed/, 'a refused clipboard write is shown, not ignored');
});

test('code boxes look like a VS Code window: dark in both modes, a title bar with the language and the dots, and the editor colours (the break: back to the light box)', () => {
  const css = fs.readFileSync(new URL('./stage.css', import.meta.url), 'utf8');
  assert.match(css, /pre\.code, \.stage \.prose pre:not\(\.mermaid\) \{[^}]*background: #1e1e1e/, 'the editor background');
  assert.match(css, /pre\.code::before \{[^}]*content: attr\(data-lang\)/, 'the title bar shows the language');
  assert.match(css, /\.tk-cmd \{ color: #dcdcaa/);
  assert.match(css, /\.tk-str \{ color: #ce9178/);
  assert.match(css, /\.copy \{[^}]*top: 3px/, 'the copy button sits in the title bar');
  assert.match(codeBox('x', 'js'), /data-lang="JavaScript"/);
  assert.match(codeBox('x', 'something-else'), /data-lang="something-else"/, 'an unknown language is shown as written');
  assert.match(codeBox('x', 'constructor'), /data-lang="constructor"/, 'a language named like an object key is not looked up on Object');
  assert.match(codeBox('x', ''), /data-lang="Text"/, 'no language gives Text, not an empty bar');
  assert.match(css, /pre\.code code \{[^}]*overflow-x: auto/, 'the code scrolls inside the box, so the title bar and copy button stay put');
});

test('a card can name its code box (a prompt, a result, a rule) instead of the language', () => {
  assert.match(codeBox('x', 'text', 'proj-code', 'Prompt'), /data-lang="Prompt"/);
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'codelabel-'));
  buildSite({ root: repoRoot, out, config: stage });
  const home = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  for (const c of config.cards.filter((x) => x.codeLabel)) assert.ok(home.includes(`data-lang="${c.codeLabel}"`), `${c.title}: the title bar shows its label`);
  fs.rmSync(out, { recursive: true, force: true });
});

test('codeBox numbers each line, colours shell commands and JavaScript lightly, and escapes what it shows (the break: skip the escaping)', () => {
  const bash = codeBox('$ npx playwright test --headed "a b"', 'bash');
  assert.match(bash, /<pre class="code" data-lang="Terminal"><code><span class="line">/, 'the title bar names the language');
  assert.match(bash, /<span class="tk-mute">\$<\/span> <span class="tk-cmd">npx<\/span> playwright test <span class="tk-flag">--headed<\/span>/);
  const js = codeBox("// check it\nawait page.goto('/login');", 'js');
  assert.equal((js.match(/<span class="line">/g) ?? []).length, 2);
  assert.match(js, /<span class="tk-com">\/\/ check it<\/span>/);
  assert.match(js, /<span class="tk-kw">await<\/span> page\.goto\(<span class="tk-str">&#39;\/login&#39;<\/span>|<span class="tk-str">'\/login'<\/span>/);
  const unsafe = codeBox('<script>alert("x")</script> & more', 'text');
  assert.doesNotMatch(unsafe, /<script>/);
  assert.match(unsafe, /&lt;script&gt;/);
  assert.match(codeBox('one line', 'text', 'proj-code'), /<pre class="code proj-code" data-lang="Text">/);
});

test('a code block in the Markdown becomes a code box, and a diagram is left for the diagram script', () => {
  const { html } = renderMarkdown('```bash\nnpm test\n```\n\n```mermaid\nflowchart LR\n  A --> B\n```\n');
  const out = enhanceCodeBlocks(html);
  assert.match(out, /<pre class="code" data-lang="Terminal"><code><span class="line"><span class="tk-cmd">npm<\/span> test<\/span><\/code><\/pre>/);
  assert.match(out, /<pre class="mermaid">/);
});

test('a project head shows its code line in a numbered code box, escaped and one numbered line for each line, whatever the text (the break: show it unescaped)', (t) => {
  const out = scratch(t);
  const odd = { ...stage, cards: stage.cards.map((c) => (c.code ? { ...c, code: 'x < y & "z"\nsecond line' } : c)) };
  buildSite({ root: repoRoot, out, config: odd });
  const home = read(out, 'index.html');
  const withCode = ready.filter((c) => c.code);
  assert.ok(withCode.length > 0, 'at least one project has a code line');
  for (const c of withCode) {
    const head = home.split(`<h2 class="proj-title">${escapeHtml(c.title)}</h2>`)[1].split('</header>')[0];
    const box = head.match(/<pre class="code proj-code" data-lang="[^"]*"><code>([\s\S]*?)<\/code><\/pre>/);
    assert.ok(box, `${c.title} has a code box in its head`);
    assert.equal((box[1].match(/<span class="line">/g) ?? []).length, 2, 'two lines, two numbers');
    assert.ok(box[1].includes('x &lt; y &amp; &quot;z&quot;') || box[1].includes('x &lt; y &amp; "z"'), 'the text is escaped');
    assert.doesNotMatch(box[1], /<y|& "z"/);
  }
  assert.match(home, /querySelectorAll\('pre\.code, \.prose pre:not\(\.mermaid\)'\)/, 'the copy button reaches the head box');
});

test('every case study or course opens with one line of impact, problem or context: right under its title, and on its chip', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  const home = read(out, 'index.html');
  const own = read(out, OWN);
  for (const c of ready) {
    assert.ok(c.oneLiner && c.oneLiner.length <= 140 && !c.oneLiner.includes('\n'), `${c.title}: one short line`);
    assert.ok(home.includes(`<span class="chip-line">${escapeHtml(c.oneLiner)}</span>`), `${c.title}: the line is on its chip`);
    const head = home.split(`<h2 class="proj-title">${escapeHtml(c.title)}</h2>`)[1];
    assert.ok(head.startsWith(`\n<p class="proj-line">${escapeHtml(c.oneLiner)}</p>`), `${c.title}: the line comes straight after the title`);
  }
  assert.match(own, /<h1 class="proj-title">[^<]+<\/h1>\n<p class="proj-line">/, 'a project page has it too');
});

test('the diagrams take their colours from the page, so they are clear in light and in dark (the break: use the plain dark theme)', () => {
  const md = ['# A page', '', '`' + '``mermaid', 'flowchart LR', '  A --> B', '`' + '``', ''].join(String.fromCharCode(10));
  const { html, title, hasMermaid } = renderMarkdown(md);
  assert.ok(hasMermaid);
  const page = stageReadingPage({ config: stage, rel: 'docs/x.md', html, title, hasMermaid, description: '', depth: 1 });
  assert.match(page, /<pre class="mermaid">/);
  assert.match(page, /theme:'base'/);
  assert.match(page, /getComputedStyle\(document\.documentElement\)/);
  assert.match(page, /primaryTextColor:v\('--text'\)/);
  assert.doesNotMatch(page, /theme:document\.documentElement/);
  const plain = stageReadingPage({ config: stage, rel: 'docs/x.md', html: '<p>no diagram</p>', title: 'x', hasMermaid: false, description: '', depth: 1 });
  assert.doesNotMatch(plain, /mermaid@/);
});

test('each visual fills most of its frame, so what it shows can be read when the picture is small', () => {
  for (const c of ready) {
    const svg = fs.readFileSync(path.join(repoRoot, c.visual), 'utf8');
    const win = svg.match(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" rx="\d+" fill="#ffffff" filter="url\(#sh\)"/);
    assert.ok(win, `${c.visual} has its window`);
    assert.ok(Number(win[3]) >= 1000 && Number(win[4]) >= 520, `${c.visual}: the window fills the 1200 by 630 frame`);
    const sizes = [...svg.matchAll(/font-size="(\d+)"/g)].map((m) => Number(m[1]));
    assert.ok(Math.max(...sizes) >= 25, `${c.visual}: has large text`);
  }
});

test('tables, code boxes and diagrams use the whole width of the page, and only the running text keeps a line length (the break: cap a table again)', () => {
  const css = fs.readFileSync(new URL('./stage.css', import.meta.url), 'utf8');
  const lines = css.split(String.fromCharCode(10));
  for (const selector of ['.stage .table-wrap', 'pre.code, .stage .prose pre:not(.mermaid)', '.stage .prose pre.mermaid']) {
    const rule = lines.find((line) => line.startsWith(`${selector} {`));
    assert.ok(rule, `${selector} has a rule`);
    assert.doesNotMatch(rule, /max-width/, `${selector} is not capped`);
  }
  assert.ok(lines.some((line) => line.includes(':where(p, blockquote, h4, h5)') && line.includes('max-width: var(--read)')) && !css.includes(':where(p, ul, ol'), 'paragraphs keep their line length but bullets fill the width');
});

// A course page can write out the pages and handouts it names, in place of a list of links to them.
function inlineRoot(t) {
  const root = scratch(t);
  fs.mkdirSync(path.join(root, '01-a'));
  fs.writeFileSync(path.join(root, '01-a', 'README.md'), ['# Course A', '', 'Intro.', '', '## Materials', '', '| Page | For |', '|---|---|', '| [Plan](plan.md) | Trainer |', '', '## Next Steps', '', 'After.', ''].join(String.fromCharCode(10)));
  fs.writeFileSync(path.join(root, '01-a', 'plan.md'), ['# Plan', '', 'Steps.', '', '## Timing', '', 'Ten minutes.', ''].join(String.fromCharCode(10)));
  const card = { label: 'Course', title: 'Course A', path: '01-a/README.md', tags: ['x'], summary: 's', button: 'Open', inlineIn: 'materials', inline: [{ title: 'Day Plan', md: 'plan.md' }, { title: 'A Handout', docx: 'handout.docx' }] };
  const cfg = { ...stage, include: ['^01-a$'], nav: [], courseNav: [], cards: [card], handoutHtml: { '01-a/handout.docx': '<h1>Handout</h1><table><tr><td>cell</td></tr></table>' } };
  return { root, cfg };
}

test('a course page writes its listed pages and handouts out in place of the links, in order, each with its own title and entry in the left list', (t) => {
  const { root, cfg } = inlineRoot(t);
  const out = scratch(t);
  buildSite({ root, out, config: cfg });
  for (const html of [read(out, 'index.html'), read(out, '01-a/index.html')]) {
    const body = html.split('<main id="main"')[1];
    assert.equal((body.match(/<section class="material"/g) ?? []).length, 2);
    assert.ok(body.indexOf('Materials') < body.indexOf('Day Plan') && body.indexOf('Day Plan') < body.indexOf('A Handout') && body.indexOf('A Handout') < body.indexOf('Next Steps'), 'the items sit where the links were');
    assert.doesNotMatch(body, /href="[^"]*plan\.(md|html)"/, 'no link to the page that is written out');
    assert.match(body, /Ten minutes\./);
    assert.match(body, /<div class="table-wrap"><table><tr><td>cell<\/td>/);
    const nav = html.split('<nav class="side-nav"')[1].split('</nav>')[0];
    assert.ok(nav.indexOf('Materials') < nav.indexOf('Day Plan') && nav.indexOf('Day Plan') < nav.indexOf('A Handout') && nav.indexOf('A Handout') < nav.indexOf('Next Steps'), 'the left list has each item');
  }
  const home = read(out, 'index.html');
  assert.equal([...home.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((id, i, all) => all.indexOf(id) !== i).length, 0, 'no id twice');
  assert.doesNotMatch(read(out, '01-a/index.html'), /class="subnav"/);
});

test('a handout that has not been converted is a clear error, not a quiet gap (the break: skip the check)', (t) => {
  const { root, cfg } = inlineRoot(t);
  const out = scratch(t);
  assert.throws(() => buildSite({ root, out, config: { ...cfg, handoutHtml: {} } }), /01-a\/handout\.docx has not been converted/);
});

test('convertHandouts does nothing when no course lists a Word handout', async () => {
  assert.deepEqual(await convertHandouts(repoRoot, { cards: [{ path: 'a/README.md' }, { path: 'b/README.md', inline: [{ title: 'T', md: 't.md' }] }] }), {});
});

test('the QA course page has its lesson plan, quiz, scoring guide, feedback form and four handouts written out on the page, and nothing in that section is a link to a file', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  const course = config.cards.find((c) => c.title === 'QA Automation Onboarding');
  assert.equal(course.inline.length, 8);
  const home = read(out, 'index.html');
  for (const item of course.inline) assert.ok(home.includes(`<h4 class="material-title">${escapeHtml(item.title)}</h4>`), `${item.title} is on the page`);
  const section = home.split('<section class="project" id="qa-automation-onboarding">')[1].split('</section>\n<p class="to-top">')[0];
  assert.doesNotMatch(section, /href="[^"]*\.docx"/, 'no link to a Word file');
  const before = section.split('id="qa-automation-onboarding-materials"')[1].split('<section class="material"')[0];
  assert.doesNotMatch(before, /<a /, 'the Materials heading is followed by the items, not by a list of links');
});

test('the quiz on the page lists the ten questions and gives no answers', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  const quizMd = fs.readFileSync(path.join(repoRoot, '01-onboarding-programs/qa-automation-onboarding/quiz.md'), 'utf8');
  const questions = quizMd.split('## Questions')[1].split('## Where to Review')[0].split(String.fromCharCode(10)).filter((l) => /^\d+\. /.test(l));
  assert.equal(questions.length, 10);
  const html = read(out, 'index.html');
  const quiz = html.split('id="qa-automation-onboarding-m-quiz"')[1].split('</section>')[0];
  assert.equal((quiz.match(/<ol>/g) ?? []).length >= 1, true);
  const quizText = quiz.replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  for (const q of questions) assert.ok(quizText.includes(q.replace(/^\d+\. /, '').replace(/`/g, '').slice(0, 25)), `question: ${q.slice(0, 30)}`);
  assert.doesNotMatch(quiz, /Answer:|Correct answer|Answer key/i);
});

test('each of the four Word handouts is on the page: its converted text is there (the break: leave a handout out of the list)', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  const home = read(out, 'index.html');
  const course = config.cards.find((c) => c.title === 'QA Automation Onboarding');
  const docx = course.inline.filter((i) => i.docx);
  assert.equal(docx.length, 4);
  for (const item of docx) {
    const converted = stage.handoutHtml[`01-onboarding-programs/qa-automation-onboarding/${item.docx}`];
    assert.ok(converted && converted.length > 1000, `${item.docx} was converted`);
    const firstText = converted.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
    assert.ok(home.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').includes(firstText.replace(/&amp;/g, '&')), `${item.title} text is on the page`);
  }
});

test('the left list on the QA course page has an entry for each item, after Materials', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config: stage });
  const nav = read(out, '01-onboarding-programs/qa-automation-onboarding/index.html').split('<nav class="side-nav"')[1].split('</nav>')[0];
  const course = config.cards.find((c) => c.title === 'QA Automation Onboarding');
  let last = nav.indexOf('>Materials<');
  assert.ok(last > -1);
  for (const item of course.inline) {
    const at = nav.indexOf(`>${escapeHtml(item.title)}<`);
    assert.ok(at > last, `${item.title} follows the one before it`);
    last = at;
  }
});

test('every Word handout in a course\'s materials folder is linked from that course page, so each one can be downloaded on its own', () => {
  const folders = config.cards.filter((c) => c.status !== 'planned' && /README\.md$/.test(c.path)).map((c) => c.path.replace(/README\.md$/, ''));
  assert.ok(folders.length > 0);
  let checked = 0;
  for (const folder of folders) {
    const materials = path.join(repoRoot, folder, 'materials');
    if (!fs.existsSync(materials)) continue; // a course with no handouts has nothing to link
    const readme = fs.readFileSync(path.join(repoRoot, folder, 'README.md'), 'utf8');
    for (const f of fs.readdirSync(materials).filter((x) => HANDOUTS.test(x))) {
      assert.ok(readme.includes(`](materials/${f})`), `${folder}README.md has a link to ${f}`);
      checked++;
    }
  }
  assert.ok(checked > 0, 'at least one handout is checked');
});

test('the site has no ZIP package: not in the settings, not built, and no page or README links to one (the break: bring the package back)', (t) => {
  assert.equal(config.downloads, undefined);
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config });
  const found = [];
  const linksToZip = /(?:href="|\]\()[^")]*\.zip(?:[#?][^")]*)?(?:"|\))/i;
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.zip$/i.test(e.name)) found.push(path.relative(out, p));
      else if (e.name.endsWith('.html')) assert.doesNotMatch(fs.readFileSync(p, 'utf8'), linksToZip, `${path.relative(out, p)} links to a ZIP`);
    }
  })(out);
  assert.deepEqual(found, []);
  for (const f of ['README.md', '01-onboarding-programs/qa-automation-onboarding/README.md']) assert.doesNotMatch(fs.readFileSync(path.join(repoRoot, f), 'utf8'), linksToZip, `${f} links to a ZIP`);
});
