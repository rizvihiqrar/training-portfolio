// Builds the portfolio site from the repository's Markdown.
//   node site/build.mjs            writes the site to _site/
// The Markdown stays the single source: nothing generated is committed. The README is the
// short front page for GitHub; this site is the front page for everyone else.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '..');

export const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A relative link in the Markdown, as it should read on the site: .md becomes .html, README.md becomes its folder. */
export function rewriteHref(href) {
  if (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href)) return href;
  const [file, ...rest] = href.split('#');
  const anchor = rest.length ? `#${rest.join('#')}` : '';
  let out = file;
  if (/(^|\/)README\.md$/i.test(file)) out = file.replace(/README\.md$/i, '');
  else if (file.endsWith('.md')) out = `${file.slice(0, -3)}.html`;
  return (out || './') + anchor;
}

const CALLOUTS = { TIP: 'Tip', NOTE: 'Note', IMPORTANT: 'Important', WARNING: 'Warning', CAUTION: 'Caution' };

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
  html = html.replace(/<table>([\s\S]*?)<\/table>/g, '<div class="table-wrap" tabindex="0" role="region" aria-label="Table"><table>$1</table></div>');
  html = html.replace(/<a href="([^"]*)"/g, (_, href) => `<a href="${rewriteHref(href.replace(/&amp;/g, '&')).replace(/&/g, '&amp;')}"`);
  return { html, title, hasMermaid };
}

const THEME_SCRIPT = `try{var s=localStorage.getItem('theme');s=(s==='dark'||s==='light')?s:null;var t=s||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}`;
const TOGGLE_SCRIPT = `(function(){var b=document.getElementById('theme-toggle');if(!b)return;function label(){var d=document.documentElement.getAttribute('data-theme')==='dark';b.setAttribute('aria-label',d?'Switch to Light Mode':'Switch to Dark Mode');b.title=d?'Switch to Light Mode':'Switch to Dark Mode'}label();b.addEventListener('click',function(){var n=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('theme',n)}catch(e){}label();if(document.querySelector('pre.mermaid'))location.reload()})})();`;
const MERMAID_SCRIPT = `import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.4.0/dist/mermaid.esm.min.mjs';mermaid.initialize({startOnLoad:true,theme:document.documentElement.getAttribute('data-theme')==='dark'?'dark':'default'});`;

/** The whole HTML page around a body. */
export function pageHtml({ config, title, body, depth, subnav = '', hasMermaid = false, description = '' }) {
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
<footer class="site-footer"><div class="wrap"><p>${escapeHtml(config.name)}. Every company, system and person here is made up. <a href="${escapeHtml(config.repo)}">Source on GitHub</a></p></div></footer>
<script>${TOGGLE_SCRIPT}</script>
${hasMermaid ? `<script type="module">${MERMAID_SCRIPT}</script>` : ''}
</body>
</html>
`;
}

function homeBody(config) {
  const cards = config.cards.map((c) => `<article class="card">
<h3>${escapeHtml(c.title)}</h3>
<p class="chips">${c.chips.map((x) => `<span class="chip">${escapeHtml(x)}</span>`).join('')}</p>
<p>${escapeHtml(c.summary)}</p>
<p><a class="btn" href="${escapeHtml(rewriteHref(c.path))}">${escapeHtml(c.button)}</a></p>
</article>`).join('\n');
  return `<section class="hero">
<h1>${escapeHtml(config.name)}</h1>
<p class="lead">${escapeHtml(config.intro)}</p>
<p class="actions"><a class="btn" href="#${config.sectionId}">${escapeHtml(config.primaryButton)}</a><a class="btn btn-secondary" href="${escapeHtml(config.aboutHref)}">${escapeHtml(config.aboutButton)}</a></p>
</section>
<section id="${config.sectionId}" class="section">
<h2>${escapeHtml(config.sectionTitle)}</h2>
<p class="section-intro">${escapeHtml(config.sectionIntro)}</p>
<div class="grid">
${cards}
</div>
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
export const PUBLISHED_FILES = /\.(docx|xlsx|pptx|pdf|png|jpe?g|gif|svg|csv|txt)$/i;

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
  for (const rel of walk(root, '', config.include)) {
    if (rel.endsWith('.md')) {
      const { html, title, hasMermaid } = renderMarkdown(fs.readFileSync(path.join(root, rel), 'utf8'));
      const outRel = /(^|\/)README\.md$/i.test(rel) ? rel.replace(/README\.md$/i, 'index.html') : rel.replace(/\.md$/, '.html');
      const depth = outRel.split('/').length - 1;
      const target = path.join(out, outRel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, pageHtml({ config, title, body: `<article class="prose">\n${html}</article>`, depth, subnav: subnavFor(config, rel), hasMermaid }));
      if (pages.includes(outRel)) throw new Error(`two files would both become ${outRel}`);
      pages.push(outRel);
    } else if (PUBLISHED_FILES.test(rel) && !/(^|\/)(\.|~\$)/.test(rel)) {
      const target = path.join(out, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(root, rel), target);
    }
  }
  fs.writeFileSync(path.join(out, 'index.html'), pageHtml({ config, title: '', body: homeBody(config), depth: 0 }));
  pages.push('index.html');
  fs.copyFileSync(path.join(here, 'site.css'), path.join(out, 'site.css'));
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
  return pages;
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
