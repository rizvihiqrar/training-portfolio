import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { unzipSync } from 'fflate';
import { rewriteHref, renderMarkdown, buildSite, checkSite, repoRoot, pageHtml, PUBLISHED_FILES, HANDOUTS, contactHtml, previewKey } from './build.mjs';

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
  const small = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [{ title: 'C', path: '01-a/README.md', label: 'Course', tags: ['Onboarding'], summary: 's', button: 'Open' }], courseNav: [], downloads: [] };
  buildSite({ root, out, config: small });
  assert.deepEqual(checkSite(out), ['01-a/index.html links to missing.html, which is not in the site']);
});

test('a link to a heading that does not exist is reported', (t) => {
  const root = scratch(t);
  const out = scratch(t);
  fs.mkdirSync(path.join(root, '01-a'));
  fs.writeFileSync(path.join(root, '01-a', 'README.md'), '# Course\n\n[x](other.md#nope)\n');
  fs.writeFileSync(path.join(root, '01-a', 'other.md'), '# Other\n');
  const small = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [{ title: 'C', path: '01-a/README.md', label: 'Course', tags: ['Onboarding'], summary: 's', button: 'Open' }], courseNav: [], downloads: [] };
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
  const small = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [{ title: 'C', path: '01-a/README.md', label: 'Course', tags: ['Onboarding'], summary: 's', button: 'Open' }], courseNav: [], downloads: [] };
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
  const small = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [{ title: 'C', path: '01-a/README.md', label: 'Course', tags: ['Onboarding'], summary: 's', button: 'Open' }], courseNav: [], downloads: [] };
  assert.throws(() => buildSite({ root, out, config: small }), /two files would both become 01-a\/index\.html/);
});

test('a malformed percent sequence in a link is reported, not a crash', (t) => {
  const root = scratch(t);
  const out = scratch(t);
  fs.mkdirSync(path.join(root, '01-a'));
  fs.writeFileSync(path.join(root, '01-a', 'README.md'), '# Course\n\n[x](50%.md)\n');
  const small = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [{ title: 'C', path: '01-a/README.md', label: 'Course', tags: ['Onboarding'], summary: 's', button: 'Open' }], courseNav: [], downloads: [] };
  buildSite({ root, out, config: small });
  assert.deepEqual(checkSite(out), ['01-a/index.html links to 50%.html, which is not in the site']);
});

test('each download package is built, holds every handout, and the course page links to it', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config });
  assert.ok(config.downloads.length > 0);
  for (const d of config.downloads) {
    const zip = path.join(out, d.zip);
    assert.ok(fs.existsSync(zip), `${d.zip} is built`);
    const names = Object.keys(unzipSync(new Uint8Array(fs.readFileSync(zip)))).sort();
    const handouts = fs.readdirSync(path.join(repoRoot, d.folder)).filter((f) => HANDOUTS.test(f)).sort();
    assert.deepEqual(names, handouts);
    const readme = fs.readFileSync(path.join(repoRoot, d.zip.replace(/[^/]+$/, 'README.md')), 'utf8');
    assert.ok(readme.includes(`${config.siteUrl}${d.zip}`), 'the course page links to the package');
  }
});

test('the quiz page has no answers, and the answer key is not in the published site', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config });
  const quiz = fs.readFileSync(path.join(out, '01-onboarding-programs/qa-automation-onboarding/quiz.html'), 'utf8');
  assert.doesNotMatch(quiz, /Answer Key/i);
  assert.doesNotMatch(quiz, /Ctrl\+`<\/code>|Runs any VS Code action/);
  assert.ok(!fs.existsSync(path.join(out, '01-onboarding-programs/qa-automation-onboarding/quiz-and-answer-key.html')));
});

test('a download folder that does not exist stops the build with a clear message', (t) => {
  const root = scratch(t);
  const out = scratch(t);
  fs.mkdirSync(path.join(root, '01-a'));
  fs.writeFileSync(path.join(root, '01-a', 'README.md'), '# Course\n');
  const cfg = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [{ title: 'C', path: '01-a/README.md', label: 'Course', tags: ['Onboarding'], summary: 's', button: 'Open' }], courseNav: [], downloads: [{ folder: '01-a/materials', zip: '01-a/x.zip' }] };
  assert.throws(() => buildSite({ root, out, config: cfg }), /download folder 01-a\/materials not found/);
});

test('a folder inside the downloads folder is skipped, and the same package is made every time', (t) => {
  const root = scratch(t);
  fs.mkdirSync(path.join(root, '01-a', 'materials', 'old.docx'), { recursive: true });
  fs.writeFileSync(path.join(root, '01-a', 'README.md'), '# Course\n');
  fs.writeFileSync(path.join(root, '01-a', 'materials', 'plan.docx'), 'plan');
  const cfg = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [{ title: 'C', path: '01-a/README.md', label: 'Course', tags: ['Onboarding'], summary: 's', button: 'Open' }], courseNav: [], downloads: [{ folder: '01-a/materials', zip: '01-a/x.zip' }] };
  const one = scratch(t);
  const two = scratch(t);
  buildSite({ root, out: one, config: cfg });
  buildSite({ root, out: two, config: cfg });
  const a = fs.readFileSync(path.join(one, '01-a', 'x.zip'));
  assert.deepEqual(Object.keys(unzipSync(new Uint8Array(a))), ['plan.docx']);
  assert.ok(a.equals(fs.readFileSync(path.join(two, '01-a', 'x.zip'))), 'identical bytes');
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

test('the home page has a filter chip for each topic, All pressed first, and a status line for screen readers', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config });
  const html = read(out, 'index.html');
  assert.match(html, /<button type="button" class="filter" data-filter="all" aria-pressed="true">All<\/button>/);
  for (const tag of config.filterTags) assert.match(html, new RegExp(`class="filter" data-filter="[a-z-]+" aria-pressed="false">${tag}<`));
  assert.match(html, /id="filter-status" class="sr-only" role="status" aria-live="polite"/);
  assert.equal((html.match(/<article class="card/g) ?? []).length, config.cards.length);
});

test('every card carries only tags that have a filter chip', () => {
  const chips = new Set(config.filterTags);
  for (const c of config.cards) {
    assert.ok(c.tags.length > 0, `${c.title} has tags`);
    for (const tag of c.tags) assert.ok(chips.has(tag), `${c.title}: "${tag}" has a filter chip`);
  }
});

test('a planned card has no link and says so; a ready card links to its course', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config });
  const html = read(out, 'index.html');
  const planned = config.cards.filter((c) => c.status === 'planned');
  assert.ok(planned.length > 0);
  assert.equal((html.match(/Coming Soon/g) ?? []).length, planned.length);
  assert.match(html, /<a class="btn" href="01-onboarding-programs\/qa-automation-onboarding\/">Open Course<\/a>/);
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

test('the contact buttons are on the home page and in the footer of every page, and the About page exists', (t) => {
  const out = scratch(t);
  const pages = buildSite({ root: repoRoot, out, config });
  assert.ok(pages.includes('docs/about.html'));
  assert.match(contactHtml(config), /href="mailto:[^"]+">Send an Email<\/a><a class="btn btn-secondary" href="https:\/\/www\.linkedin\.com\/in\/[^"]+">View LinkedIn<\/a>/);
  for (const rel of ['index.html', 'docs/about.html', '01-onboarding-programs/qa-automation-onboarding/index.html']) {
    const html = read(out, rel);
    assert.match(html, /href="mailto:/);
    assert.match(html, /linkedin\.com\/in\//);
  }
  assert.match(read(out, 'index.html'), /<section id="contact" class="section">/);
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
  const cfg = { ...config, nav: [{ label: 'Home', href: 'index.html' }], aboutHref: 'index.html', cards: [], courseNav: [], downloads: [] };
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

test('the filter chips stay hidden until the page script reveals them, so nothing useless shows without JavaScript', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config });
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.match(html, /<div class="filters" role="group" aria-label="Filter by [A-Za-z ]+" hidden>/);
  assert.match(html, /g\.hidden=false/);
  assert.match(html, /\(c\.getAttribute\('data-tags'\)\|\|''\)/);
});

test('the filter group is named after what the cards are filtered by', (t) => {
  const out = scratch(t);
  buildSite({ root: repoRoot, out, config });
  assert.match(fs.readFileSync(path.join(out, 'index.html'), 'utf8'), new RegExp(`aria-label="Filter by ${config.filterLabel}"`));
  const noLabel = scratch(t);
  buildSite({ root: repoRoot, out: noLabel, config: { ...config, filterLabel: undefined } });
  assert.match(fs.readFileSync(path.join(noLabel, 'index.html'), 'utf8'), /aria-label="Filter by Topic"/);
});

test('the About page uses the same email and LinkedIn address as the footer and contact buttons', () => {
  const about = fs.readFileSync(path.join(repoRoot, 'docs/about.md'), 'utf8');
  assert.ok(about.includes(`mailto:${config.contact.email}`), 'the email matches site.json');
  assert.ok(about.includes(config.contact.linkedin), 'the LinkedIn address matches site.json');
});

test('the stylesheet really hides the filter chips while they have the hidden attribute (the markup alone is not enough)', () => {
  const css = fs.readFileSync(new URL('./site.css', import.meta.url), 'utf8');
  assert.match(css, /\.filters\[hidden\][^{]*\{[^}]*display:\s*none/);
});

test('two sections that happen to share a heading each get their own table name, not a number', () => {
  const { html } = renderMarkdown('## A\n\n## Results\n\n| X |\n|---|\n| 1 |\n\n## B\n\n## Results\n\n| Y |\n|---|\n| 2 |\n');
  assert.equal((html.match(/aria-label="Results table"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /Results table 2/);
});
