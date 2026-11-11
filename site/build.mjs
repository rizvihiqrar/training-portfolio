// Builds the portfolio site from the repository's Markdown.
//   node site/build.mjs            writes the site to _site/
// The Markdown stays the single source: nothing generated is committed. The README is the
// short front page for GitHub; this site is the front page for everyone else.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import crypto from 'crypto';
import { zipSync } from 'fflate';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '..');

export const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A relative link in the Markdown, as it should read on the site: .md becomes .html, README.md becomes its folder. */
export function rewriteHref(href) {
  if (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href)) return href;
  const [withQuery, ...rest] = href.split('#');
  const file = withQuery.split('?')[0];
  const anchor = rest.length ? `#${rest.join('#')}` : '';
  // A README link becomes its folder, another Markdown link becomes its page (query dropped), anything else is kept as written.
  let out = withQuery;
  if (/(^|\/)README\.md$/i.test(file)) out = file.replace(/README\.md$/i, '');
  else if (file.endsWith('.md')) out = `${file.slice(0, -3)}.html`;
  return (out || './') + anchor;
}

const CALLOUTS = { TIP: 'Tip', NOTE: 'Note', IMPORTANT: 'Important', WARNING: 'Warning', CAUTION: 'Caution' };

const decodeEntities = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&amp;/g, '&');

/** Markdown to the page body: callouts, diagrams, wrapped tables and site links. */
export function renderMarkdown(markdown) {
  const marked = new Marked({ gfm: true });
  marked.use(gfmHeadingId());
  let html = marked.parse(markdown);
  const title = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ?? [])[1]?.replace(/<[^>]+>/g, '') ?? '';
  const innermost = /<blockquote>((?:(?!<blockquote>)[\s\S])*?)<\/blockquote>/;
  for (let before = ''; before !== html;) {
    before = html;
    html = html.replace(new RegExp(innermost.source, 'g'), (whole, inner) => {
      const m = inner.match(/^\s*<p>\[!(TIP|NOTE|IMPORTANT|WARNING|CAUTION)\]\s*/);
      if (!m) return whole.replace('<blockquote>', '<blockquote data-plain>');
      const rest = inner.slice(m[0].length);
      return `<aside class="callout callout-${m[1].toLowerCase()}"><p class="callout-title">${CALLOUTS[m[1]]}</p><p>${rest.replace(/^<br\s*\/?>\s*/, '')}</aside>`;
    });
  }
  html = html.replace(/<blockquote data-plain>/g, '<blockquote>');
  let hasMermaid = false;
  html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, (_, code) => {
    hasMermaid = true;
    return `<pre class="mermaid">${code}</pre>`;
  });
  html = html.replace(/<thead>\s*<tr>(?:\s*<th[^>]*>\s*<\/th>)+\s*<\/tr>\s*<\/thead>/g, ''); // a table with an empty header row shows no header
  const tablesUnder = new Map();
  html = html.replace(/<table>([\s\S]*?)<\/table>/g, (whole, inner, offset, all) => {
    const heads = [...all.slice(0, offset).matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g)];
    const near = heads.length ? decodeEntities(heads[heads.length - 1][1].replace(/<[^>]+>/g, '')) : 'Opening';
    const key = heads.length ? heads[heads.length - 1].index : -1; // where the heading sits, so a repeated title elsewhere is a different key
    const n = (tablesUnder.get(key) ?? 0) + 1; // a second table under one heading gets a number, so each is told apart
    tablesUnder.set(key, n);
    return `<div class="table-wrap" tabindex="0" role="region" aria-label="${escapeHtml(`${near} table${n > 1 ? ` ${n}` : ''}`)}"><table>${inner}</table></div>`;
  });
  html = html.replace(/<a href="([^"]*)"/g, (_, href) => `<a href="${rewriteHref(href.replace(/&amp;/g, '&')).replace(/&/g, '&amp;')}"`);
  const first = (html.match(/<p>([\s\S]*?)<\/p>/) ?? [])[1] ?? '';
  const description = decodeEntities(first.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim().slice(0, 160);
  return { html, title, hasMermaid, description };
}

const THEME_SCRIPT = `try{var s=localStorage.getItem('theme');s=(s==='dark'||s==='light')?s:null;var t=s||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}`;
const TOGGLE_SCRIPT = `(function(){var b=document.getElementById('theme-toggle');if(!b)return;function label(){var d=document.documentElement.getAttribute('data-theme')==='dark';b.setAttribute('aria-label',d?'Switch to Light Mode':'Switch to Dark Mode');b.title=d?'Switch to Light Mode':'Switch to Dark Mode'}label();b.addEventListener('click',function(){var n=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('theme',n)}catch(e){}label();if(document.querySelector('pre.mermaid'))location.reload()})})();`;
const FILTER_SCRIPT = `(function(){var g=document.querySelector('.filters');var f=document.querySelectorAll('.filter'),cards=document.querySelectorAll('.card'),st=document.getElementById('filter-status');if(!g||!f.length)return;g.hidden=false;f.forEach(function(b){b.addEventListener('click',function(){var v=b.getAttribute('data-filter');f.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});var n=0;cards.forEach(function(c){var show=v==='all'||(c.getAttribute('data-tags')||'').split(' ').indexOf(v)>-1;c.hidden=!show;if(show)n++});if(st)st.textContent=n+(n===1?' item':' items')+' shown'})})})();`;
const MERMAID_SCRIPT = `import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.4.0/dist/mermaid.esm.min.mjs';mermaid.initialize({startOnLoad:true,theme:document.documentElement.getAttribute('data-theme')==='dark'?'dark':'default'});`;

/** The whole HTML page around a body. */
export function pageHtml({ config, title, body, depth, subnav = '', hasMermaid = false, description = '', filters = false }) {
  const root = '../'.repeat(depth);
  const nav = config.nav.map((n) => `<a href="${root}${n.href}">${escapeHtml(n.label)}</a>`).join('');
  const desc = escapeHtml(description || config.intro);
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title ? `${title} | ${config.name}` : config.name)}</title>
<meta name="description" content="${desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap">
<link rel="stylesheet" href="${root}site.css">
<script>${THEME_SCRIPT}</script>
</head>
<body>
<a class="skip" href="#main">Skip to Content</a>
<header class="site-header">
<div class="wrap header-row">
<a class="brand" href="${root}index.html">${escapeHtml(config.name)}</a>
<nav aria-label="Main">${nav}<a href="${escapeHtml(config.repo)}">View on GitHub</a></nav>
<button id="theme-toggle" class="icon-btn" type="button" aria-label="Switch to Dark Mode" title="Switch to Dark Mode"><svg class="icon-moon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="icon-sun" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button>
</div>
</header>
<main id="main" class="wrap">
${subnav}${body}
</main>
<footer class="site-footer"><div class="wrap"><p>${escapeHtml(config.name)}. ${escapeHtml(config.footerNote)} <a href="mailto:${escapeHtml(config.contact.email)}">Send an Email</a> · <a href="${escapeHtml(config.contact.linkedin)}">LinkedIn</a> · <a href="${escapeHtml(config.repo)}">Source on GitHub</a></p></div></footer>
<script>${TOGGLE_SCRIPT}</script>
${filters ? `<script>${FILTER_SCRIPT}</script>\n` : ''}${hasMermaid ? `<script type="module">${MERMAID_SCRIPT}</script>` : ''}
</body>
</html>
`;
}

const tagSlug = (tag) => tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function cardHtml(c) {
  const planned = c.status === 'planned';
  const image = c.image ? `<img class="card-img" src="${escapeHtml(c.image)}" alt="${escapeHtml(c.imageAlt ?? '')}" loading="lazy" width="1200" height="630">` : '';
  const action = planned
    ? '<span class="btn btn-disabled">Coming Soon</span>'
    : `<a class="btn" href="${escapeHtml(rewriteHref(c.path))}">${escapeHtml(c.button)}</a>`;
  return `<article class="card${planned ? ' card-planned' : ''}" data-tags="${c.tags.map(tagSlug).join(' ')}">
${image}<div class="card-body">
<p class="label">${escapeHtml(c.label)}${planned ? ' (Planned)' : ''}</p>
<h3>${escapeHtml(c.title)}</h3>
<p>${escapeHtml(c.summary)}</p>
<p class="chips">${c.tags.map((x) => `<span class="chip">${escapeHtml(x)}</span>`).join('')}</p>
<p>${action}</p>
</div>
</article>`;
}

/** The email and LinkedIn buttons, as one block. */
export function contactHtml(config) {
  return `<p class="actions"><a class="btn" href="mailto:${escapeHtml(config.contact.email)}">Send an Email</a><a class="btn btn-secondary" href="${escapeHtml(config.contact.linkedin)}">View LinkedIn</a></p>`;
}

function homeBody(config) {
  const tags = config.filterTags ?? [...new Set(config.cards.flatMap((c) => c.tags))];
  const chips = ['All', ...tags].map((tag, i) => `<button type="button" class="filter" data-filter="${i === 0 ? 'all' : tagSlug(tag)}" aria-pressed="${i === 0}">${escapeHtml(tag)}</button>`).join('');
  return `<section class="hero">
<h1>${escapeHtml(config.name)}</h1>
<p class="lead">${escapeHtml(config.intro)}</p>
<p class="actions"><a class="btn" href="#${config.sectionId}">${escapeHtml(config.primaryButton)}</a><a class="btn btn-secondary" href="${escapeHtml(config.aboutHref)}">${escapeHtml(config.aboutButton)}</a></p>
</section>
<section id="${config.sectionId}" class="section">
<h2>${escapeHtml(config.sectionTitle)}</h2>
<p class="section-intro">${escapeHtml(config.sectionIntro)}</p>
<div class="filters" role="group" aria-label="Filter by ${escapeHtml(config.filterLabel ?? 'Topic')}" hidden>${chips}</div>
<p id="filter-status" class="sr-only" role="status" aria-live="polite"></p>
<div class="grid">
${config.cards.map(cardHtml).join('\n')}
</div>
</section>
<section id="contact" class="section">
<h2>Get in Touch</h2>
<p class="section-intro">${escapeHtml(config.contact.intro)}</p>
${contactHtml(config)}
</section>`;
}

function subnavFor(config, mdPath) {
  for (const group of config.courseNav ?? []) {
    if (!mdPath.startsWith(`${group.folder}/`)) continue;
    const here = path.posix.basename(mdPath);
    const items = group.items.map((it) => {
      const current = it.file === here && !it.anchor;
      const href = it.file === 'README.md' ? `./${it.anchor ? `#${it.anchor}` : ''}` : it.file.replace(/\.md$/, '.html');
      return `<a href="${href}"${current ? ' aria-current="page"' : ''}>${escapeHtml(it.label)}</a>`;
    }).join('');
    return `<nav class="subnav" aria-label="This Course">${items}</nav>\n`;
  }
  return '';
}

/** The only non-Markdown files that are published: handouts and images. Editor and lock files never are. */
export const PUBLISHED_FILES = /\.(docx|xlsx|pptx|pdf|png|jpe?g|gif|svg)$/i;

/** What goes into a download package: the handouts a person would keep. */
export const HANDOUTS = /\.(docx|xlsx|pptx|pdf)$/i;

function walk(root, dir, include) {
  const out = [];
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (!dir && !(e.isDirectory() && include.some((re) => new RegExp(re).test(e.name)))) continue;
    if (e.isDirectory()) out.push(...walk(root, rel, include));
    else out.push(rel);
  }
  return out;
}

/** Builds the site; returns the list of pages written. */
export function buildSite({ root = repoRoot, out = path.join(root, '_site'), config }) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const pages = [];
  const files = walk(root, '', config.include);
  const taken = new Map([['index.html', 'the home page']]);
  for (const rel of files.filter((f) => f.endsWith('.md'))) {
    const outRel = /(^|\/)README\.md$/i.test(rel) ? rel.replace(/README\.md$/i, 'index.html') : rel.replace(/\.md$/, '.html');
    if (taken.has(outRel)) throw new Error(`two files would both become ${outRel}`);
    taken.set(outRel, rel);
  }
  for (const rel of files) {
    if (rel.endsWith('.md')) {
      const { html, title, hasMermaid, description } = renderMarkdown(fs.readFileSync(path.join(root, rel), 'utf8'));
      const outRel = /(^|\/)README\.md$/i.test(rel) ? rel.replace(/README\.md$/i, 'index.html') : rel.replace(/\.md$/, '.html');
      const depth = outRel.split('/').length - 1;
      const target = path.join(out, outRel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, pageHtml({ config, title, body: `<article class="prose">\n${html}</article>`, depth, subnav: subnavFor(config, rel), hasMermaid, description }));
      pages.push(outRel);
    } else if (PUBLISHED_FILES.test(rel) && !/(^|\/)(\.|~\$)/.test(rel)) {
      const target = path.join(out, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(root, rel), target);
    }
  }
  for (const d of config.downloads ?? []) {
    const dir = path.join(root, d.folder);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`download folder ${d.folder} not found`);
    const entries = {};
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name))) {
      // Handouts are already compressed, so they are stored, with a fixed date, to make the same package every build.
      if (e.isFile() && HANDOUTS.test(e.name) && !/^(\.|~\$)/.test(e.name)) {
        entries[e.name] = [new Uint8Array(fs.readFileSync(path.join(dir, e.name))), { level: 0, mtime: new Date('2026-01-01T00:00:00Z') }];
      }
    }
    fs.mkdirSync(path.dirname(path.join(out, d.zip)), { recursive: true });
    fs.writeFileSync(path.join(out, d.zip), zipSync(entries));
  }
  fs.writeFileSync(path.join(out, 'index.html'), pageHtml({ config, title: '', body: homeBody(config), depth: 0, filters: true }));
  pages.push('index.html');
  fs.copyFileSync(path.join(here, 'site.css'), path.join(out, 'site.css'));
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
  return pages;
}

/** What a card's preview image shows: if any of it changes, the image is out of date. */
export const PREVIEW_VERSION = 1; // raise this when the title-card design in previews.mjs changes, so every image is remade
export function previewKey(card, siteName) {
  return crypto.createHash('sha1').update(JSON.stringify([PREVIEW_VERSION, siteName, card.label, card.title, card.tags])).digest('hex').slice(0, 12);
}

/** Every relative link and file reference in the built site must resolve, and every #anchor must exist. */
export function checkSite(out) {
  const problems = [];
  const htmlFiles = [];
  (function collect(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) collect(p);
      else if (e.name.endsWith('.html')) htmlFiles.push(p);
    }
  })(out);
  const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
  const idsOf = (file) => new Set([...fs.readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const name = path.relative(out, file).split(path.sep).join('/');
    for (const m of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
      const raw = m[1].replace(/&amp;/g, '&');
      if (!raw || /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(raw)) continue;
      const [rel, anchor] = raw.split('#');
      let target = rel ? path.resolve(path.dirname(file), decode(rel)) : file;
      if (rel && fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
      if (!fs.existsSync(target)) {
        problems.push(`${name} links to ${raw}, which is not in the site`);
      } else if (anchor && target.endsWith('.html') && !idsOf(target).has(decode(anchor))) {
        problems.push(`${name} links to ${raw}, but that page has no #${anchor}`);
      }
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = JSON.parse(fs.readFileSync(path.join(here, 'site.json'), 'utf8'));
  const pages = buildSite({ config });
  const problems = checkSite(path.join(repoRoot, '_site'));
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`Site built: ${pages.length} pages, every link resolves`);
}
