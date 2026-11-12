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
import { applyComponents, COMPONENT_SCRIPT } from './components.mjs';

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
  const title = decodeEntities((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ?? [])[1]?.replace(/<[^>]+>/g, '') ?? '');
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
<footer class="site-footer"><div class="wrap"><p>${escapeHtml(config.name)}. ${escapeHtml(config.footerNote)} <a href="mailto:${escapeHtml(config.contact.email)}">Send an Email</a> · <a href="${escapeHtml(config.contact.linkedin)}">LinkedIn</a> · <a href="${escapeHtml(config.repo)}">Source on GitHub</a></p></div></footer>
<script>${TOGGLE_SCRIPT}</script>
${hasMermaid ? `<script type="module">${MERMAID_SCRIPT}</script>` : ''}
</body>
</html>
`;
}

/** One finished piece on the home page: a thumbnail, its title and what kind of piece it is. Planned pieces are not listed. */
function workHtml(c) {
  const image = c.image ? `<img class="work-img" src="${escapeHtml(c.image)}" alt="${escapeHtml(c.imageAlt ?? '')}" loading="lazy" width="1200" height="630">` : '';
  return `<li><a class="work" href="${escapeHtml(rewriteHref(c.path))}">
${image}<span class="work-title">${escapeHtml(c.title)}</span>
<span class="work-meta">${escapeHtml(c.label)}</span>
</a></li>`;
}

/** The email and LinkedIn links, as one line. */
export function contactHtml(config) {
  return `<p class="links"><a href="mailto:${escapeHtml(config.contact.email)}">Email</a><a href="${escapeHtml(config.contact.linkedin)}">LinkedIn</a><a href="${escapeHtml(config.aboutHref)}">${escapeHtml(config.aboutButton)}</a><a href="${escapeHtml(config.repo)}">GitHub</a></p>`;
}

function homeBody(config) {
  const ready = config.cards.filter((c) => c.status !== 'planned');
  return `<section class="intro">
<h1>${escapeHtml(config.name)}</h1>
<p class="lead">${escapeHtml(config.intro)}</p>
${contactHtml(config)}
</section>
<section id="${config.sectionId}" class="works-section" aria-label="${escapeHtml(config.sectionTitle)}">
<ul class="works">
${ready.map(workHtml).join('\n')}
</ul>
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

/** Highlights the project and section in view in the left list, as the page scrolls. */
const SPY_SCRIPT = `(function(){var items={};document.querySelectorAll('.side-list > li[data-id]').forEach(function(li){items[li.getAttribute('data-id')]=li});var secs=[].slice.call(document.querySelectorAll('section.project,section.about'));var subs=[].slice.call(document.querySelectorAll('.sub a[href^="#"]'));var heads=subs.map(function(a){return document.getElementById(a.getAttribute('href').slice(1))});function run(){if(secs.length){var cur=null;secs.forEach(function(s){if(s.getBoundingClientRect().top<=window.innerHeight*0.4)cur=s});Object.keys(items).forEach(function(k){if(cur&&k===cur.id)items[k].setAttribute('data-active','');else items[k].removeAttribute('data-active')})}var hit=-1;heads.forEach(function(h,i){if(h&&h.getBoundingClientRect().top<=120)hit=i});subs.forEach(function(a,i){if(i===hit)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current')})}var busy=false;window.addEventListener('scroll',function(){if(busy)return;busy=true;requestAnimationFrame(function(){busy=false;run()})},{passive:true});window.addEventListener('resize',run);run()})();`;

/** A small copy button on every code block. */
const COPY_SCRIPT = `(function(){document.querySelectorAll('pre.code, .prose pre:not(.mermaid)').forEach(function(pre){var b=document.createElement('button');b.type='button';b.className='copy';b.setAttribute('aria-label','Copy code');b.title='Copy code';b.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';b.addEventListener('click',function(){var c=pre.querySelector('code');var t=(c||pre).innerText;if(navigator.clipboard){navigator.clipboard.writeText(t).then(function(){b.title='Copied';setTimeout(function(){b.title='Copy code'},1500)},function(){b.title='Copy failed'})}});pre.appendChild(b)})})();`;

/** The headings of a given level in rendered HTML, for the left list. */
export function headingsOf(html, level = 2) {
  const re = new RegExp(`<h${level}[^>]*\\sid="([^"]+)"[^>]*>([\\s\\S]*?)<\\/h${level}>`, 'g');
  return [...html.matchAll(re)].map((m) => ({ id: m[1], text: decodeEntities(m[2].replace(/<[^>]+>/g, '')) }));
}

/** The symbol buttons' drawings (24 by 24, drawn as lines so they take the text colour in light and dark). */
const ICONS = {
  about: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  email: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 11v6M8 7.5v.01M12 17v-6M12 13.5a2.8 2.8 0 0 1 5.6 0V17"/>',
  github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>',
  x: '<path fill="currentColor" stroke="none" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
};
const icon = (key, cls = '') => `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[key]}</svg>`;

/** About, email, LinkedIn, GitHub and the theme switch as symbol buttons. Each has a name for screen readers and a tooltip. */
export function iconsHtml(config, root) {
  const link = (href, label, key) => `<a class="icon-btn" href="${escapeHtml(href)}" aria-label="${label}" title="${label}">${icon(key)}</a>`;
  return `<div class="icons">${link(config.theme === 'stageshow' && config.hasAbout !== false ? `${root}index.html#about` : `${root}${config.aboutHref}`, 'About Me', 'about')}${link(`mailto:${config.contact.email}`, 'Send an Email', 'email')}${link(config.contact.linkedin, 'LinkedIn', 'linkedin')}${config.contact.instagram ? link(config.contact.instagram, 'Instagram', 'instagram') : ''}${config.contact.x ? link(config.contact.x, 'X', 'x') : ''}${link(config.repo, 'Source on GitHub', 'github')}<button id="theme-toggle" class="icon-btn" type="button" aria-label="Switch to Dark Mode" title="Switch to Dark Mode">${icon('moon', 'icon-moon')}${icon('sun', 'icon-sun')}</button></div>`;
}

const slugOf = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cardId = (c) => slugOf(c.title);
const isReady = (c) => c.status !== 'planned';

/** The project a page belongs to: a card's own page, or any page inside a course's folder. */
export function projectOf(config, rel) {
  return config.cards.filter(isReady).find((c) => {
    if (!/(^|\/)README\.md$/i.test(c.path)) return rel === c.path;
    const dir = c.path.replace(/README\.md$/i, '');
    return dir ? rel.startsWith(dir) : rel === c.path;
  });
}

// A project's page, written into the home page: its own title is dropped (the head carries it), headings go one level down,
// every id and in-page link gets the project's name in front so two projects can both have "The Problem", and relative
// links and images are re-pointed from the project's folder to the site's root.
const dropFirstH1 = (html) => html.replace(/<h1[^>]*>[\s\S]*?<\/h1>\s*/, '');
const shiftHeadings = (html) => html.replace(/<(\/?)h([1-5])(?=[\s>])/g, (m, slash, n) => `<${slash}h${Number(n) + 1}`);
const namespaced = (html, id) => html.replace(/\sid="([^"]+)"/g, (m, x) => ` id="${id}-${x}"`).replace(/href="#([^"]+)"/g, (m, x) => `href="#${id}-${x}"`);
export function relocate(html, dir) {
  if (!dir || dir === '.') return html;
  return html.replace(/(href|src)="([^"]*)"/g, (m, attr, val) => {
    const v = val.replace(/&amp;/g, '&');
    if (!v || /^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(v)) return m;
    const [file, ...rest] = v.split('#');
    const joined = path.posix.normalize(path.posix.join(dir, file || '.'));
    return `${attr}="${((joined === '.' ? './' : joined) + (rest.length ? `#${rest.join('#')}` : '')).replace(/&/g, '&amp;')}"`;
  });
}

const KEYWORDS = new Set(['const', 'let', 'var', 'function', 'return', 'await', 'async', 'import', 'from', 'export', 'if', 'else', 'for', 'new', 'class', 'throw', 'try', 'catch', 'test', 'expect']);
const span = (cls, text) => `<span class="${cls}">${escapeHtml(text)}</span>`;

/** One line of code with light colours for a few kinds of text (commands and flags in shell, strings, comments and keywords in JavaScript and TypeScript). */
function highlightLine(line, lang) {
  if (/^(bash|sh|shell|console)$/.test(lang)) {
    let seenCommand = false;
    return line.split(/(\s+)/).map((tok) => {
      if (/^\s*$/.test(tok)) return tok;
      if (tok === '$') return span('tk-mute', tok);
      if (!seenCommand) { seenCommand = true; return span('tk-cmd', tok); }
      if (/^--?[\w-]+/.test(tok)) return span('tk-flag', tok);
      if (/^(['"]).*\1$/.test(tok)) return span('tk-str', tok);
      return escapeHtml(tok);
    }).join('');
  }
  if (/^(js|javascript|ts|typescript|json)$/.test(lang)) {
    const re = /(\/\/.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b([A-Za-z_]\w*)\b/g;
    let out = '';
    let last = 0;
    for (const m of line.matchAll(re)) {
      out += escapeHtml(line.slice(last, m.index));
      if (m[1]) out += span('tk-com', m[1]);
      else if (m[2]) out += span('tk-str', m[2]);
      else out += KEYWORDS.has(m[3]) ? span('tk-kw', m[3]) : escapeHtml(m[3]);
      last = m.index + m[0].length;
    }
    return out + escapeHtml(line.slice(last));
  }
  return escapeHtml(line);
}

const LANG_LABELS = { bash: 'Terminal', sh: 'Terminal', shell: 'Terminal', zsh: 'Terminal', powershell: 'PowerShell', js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript', json: 'JSON', yaml: 'YAML', yml: 'YAML', html: 'HTML', css: 'CSS', md: 'Markdown', text: 'Text', prompt: 'Prompt', gherkin: 'Gherkin' };

/**
 * A code box after the VS Code editor: a dark window with a title bar, numbered lines and a copy button that the page script adds.
 * The title bar shows `title` when given (a prompt, a result, a rule), else the language's name, else the language as written.
 */
export function codeBox(text, lang = 'text', extra = '', title = '') {
  const key = String(lang || 'text').toLowerCase();
  const label = title || (Object.hasOwn(LANG_LABELS, key) ? LANG_LABELS[key] : lang || 'Text');
  const lines = text.replace(/\n$/, '').split('\n').map((line) => `<span class="line">${highlightLine(line, lang)}</span>`).join('\n');
  return `<pre class="code${extra ? ` ${extra}` : ''}" data-lang="${escapeHtml(label)}"><code>${lines}</code></pre>`;
}

/** Every fenced code block in rendered Markdown becomes a code box. The diagrams were already turned into their own blocks. */
export function enhanceCodeBlocks(html) {
  return html.replace(/<pre><code(?: class="language-([\w-]+)")?>([\s\S]*?)<\/code><\/pre>/g, (m, lang, code) => codeBox(decodeEntities(code), lang ?? 'text'));
}

const STAGE_MERMAID = `import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.4.0/dist/mermaid.esm.min.mjs';var s=getComputedStyle(document.documentElement);var v=function(n){return s.getPropertyValue(n).trim()};var dark=document.documentElement.getAttribute('data-theme')==='dark';mermaid.initialize({startOnLoad:true,theme:'base',flowchart:{curve:'basis',padding:18},themeVariables:{fontFamily:'Poppins, system-ui, sans-serif',fontSize:'16px',background:v('--bg'),primaryColor:dark?'#23304a':'#eaf1ff',primaryBorderColor:v('--accent'),primaryTextColor:v('--text'),secondaryColor:v('--surface-3'),tertiaryColor:v('--surface-2'),lineColor:v('--text-3'),textColor:v('--text'),edgeLabelBackground:v('--surface-2'),clusterBkg:v('--surface-2'),clusterBorder:v('--border-strong')}});`;

/** The Word handouts a course names, turned into page content. Run once before the build: the conversion is asynchronous and the build is not. */
export async function convertHandouts(root, config) {
  const files = config.cards.flatMap((c) => (c.inline ?? []).filter((i) => i.docx).map((i) => path.posix.join(path.posix.dirname(c.path), i.docx)));
  if (!files.length) return {};
  let mammoth;
  try { ({ default: mammoth } = await import('mammoth')); } catch { throw new Error('A course lists a Word handout, so site/package.json needs the mammoth dependency (npm install mammoth in site/).'); }
  const out = {};
  for (const f of files) out[f] = cleanHandoutHtml((await mammoth.convertToHtml({ path: path.join(root, f) })).value);
  return out;
}

/** Word's bookmark anchors and in-page links would clash when several handouts share one page, so they are dropped. */
export function cleanHandoutHtml(html) {
  return html.replace(/<a id="[^"]*"><\/a>/g, '').replace(/<a href="#[^"]*">([\s\S]*?)<\/a>/g, '$1');
}

const INLINE_TOKEN = '<!--INLINE-->';
const shiftBy = (html, n) => html.replace(/<(\/?)h([1-6])(?=[\s>])/g, (m, slash, d) => `<${slash}h${Math.min(6, Number(d) + n)}`);

/** Puts the token where a section's content was (the section keeps its heading). Without that section the token goes at the end. */
function swapSection(html, headingId) {
  const open = html.search(new RegExp(`<h2[^>]*\\sid="${headingId}"`));
  if (open === -1) return `${html}\n${INLINE_TOKEN}\n`;
  const close = html.indexOf('</h2>', open) + 5;
  const next = html.indexOf('<h2', close);
  return `${html.slice(0, close)}\n${INLINE_TOKEN}\n${next === -1 ? '' : html.slice(next)}`;
}

/** The pages and handouts a course names, written out one after another instead of listed as links. */
function inlineMaterials(config, root, c, embedded) {
  const dir = path.posix.dirname(c.path);
  const base = cardId(c);
  const level = embedded ? 4 : 3; // the heading level of each item's title
  const heads = [];
  const html = (c.inline ?? []).map((item) => {
    const id = `${base}-m-${slugOf(item.title)}`;
    heads.push({ text: item.title, href: `#${id}` });
    let body;
    if (item.md) {
      const { html: rendered } = renderMarkdown(fs.readFileSync(path.join(root, dir, item.md), 'utf8'));
      body = relocate(namespaced(shiftBy(dropFirstH1(enhanceCodeBlocks(rendered)), level - 1), id), path.posix.dirname(path.posix.join(dir, item.md)));
    } else {
      const file = path.posix.join(dir, item.docx);
      const raw = config.handoutHtml?.[file];
      if (raw === undefined) throw new Error(`${file} has not been converted: run convertHandouts first`);
      body = shiftBy(raw, level).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
    }
    return `<section class="material" id="${id}">\n<h${level} class="material-title">${escapeHtml(item.title)}</h${level}>\n${body}\n</section>`;
  }).join('\n');
  return { html, heads };
}

/** Left-list entries for a course's inline items go right after the section they replace. */
export function withItemHeads(heads, itemHeads, headingText) {
  const at = heads.findIndex((h) => slugOf(h.text) === slugOf(headingText));
  return at === -1 ? [...heads, ...itemHeads] : [...heads.slice(0, at + 1), ...itemHeads, ...heads.slice(at + 1)];
}

/** A project's head: its title, what kind it is, the year and a few facts, beside its visual (after thatedchao.com and benji.org/stageshow). */
function projectHead(c, level, prefix) {
  const src = c.visual ?? c.image;
  const image = src ? `<div class="proj-visual"><img src="${prefix}${escapeHtml(src)}" alt="${escapeHtml(c.visualAlt ?? c.imageAlt ?? '')}" width="1200" height="630"></div>` : '';
  const facts = (c.facts ?? []).map((f) => `<li>${escapeHtml(f)}</li>`).join('');
  return `<header class="proj-head">
<div class="proj-text">
<h${level} class="proj-title">${escapeHtml(c.title)}</h${level}>
${c.oneLiner ? `<p class="proj-line">${escapeHtml(c.oneLiner)}</p>` : ''}
${facts ? `<ul class="proj-facts">${facts}</ul>` : ''}
${c.code ? codeBox(c.code, c.codeLang ?? 'text', 'proj-code', c.codeLabel ?? '') : ''}
</div>
${image}
</header>`;
}

/** A small chip on the home page: visual, title, a line of facts and the year. Clicking it goes to the project further down the page. */
function chipHtml(c) {
  const src = c.visual ?? c.image;
  const image = src ? `<img class="chip-img" src="${escapeHtml(src)}" alt="${escapeHtml(c.visualAlt ?? c.imageAlt ?? '')}" loading="lazy" width="1200" height="630">` : '';
  const facts = (c.facts ?? []).slice(0, 1).map((f) => `<span class="chip-facts">${escapeHtml(f)}</span>`).join('');
  return `<li><a class="chip" href="#${cardId(c)}">${image}<span class="chip-title">${escapeHtml(c.title)}</span>${c.oneLiner ? `<span class="chip-line">${escapeHtml(c.oneLiner)}</span>` : ''}${facts}</a></li>`;
}

/** The left list: every project (or course), with the sections of the one you are in under it. */
function sideNav(config, { prefix, home, current, subs, about = false, overview = false }) {
  const aboutSubs = (subs.about ?? []).map((h) => `<li><a href="${escapeHtml(h.href)}">${escapeHtml(h.text)}</a></li>`).join('');
  const aboutItem = `<li data-id="about"><a href="${home ? '' : `${prefix}index.html`}#about">${escapeHtml(config.aboutButton ?? 'About Me')}</a>${aboutSubs ? `<ul class="sub">${aboutSubs}</ul>` : ''}</li>`;
  const overviewSubs = (subs.overview ?? []).map((h) => `<li><a href="${escapeHtml(h.href)}">${escapeHtml(h.text)}</a></li>`).join('');
  const overviewItem = `<li data-id="how-it-works"><a href="${home ? '' : `${prefix}index.html`}#how-it-works">How It Works</a>${overviewSubs ? `<ul class="sub">${overviewSubs}</ul>` : ''}</li>`;
  const items = config.cards.filter(isReady).map((c) => {
    const id = cardId(c);
    const sub = (subs[id] ?? []).map((h) => `<li><a href="${escapeHtml(h.href)}">${escapeHtml(h.text)}</a></li>`).join('');
    return `<li data-id="${id}"${current === id ? ' data-current=""' : ''}><a href="${home ? '' : `${prefix}index.html`}#${id}">${escapeHtml(c.title)}</a>${sub ? `<ul class="sub">${sub}</ul>` : ''}</li>`;
  }).join('');
  return `<nav class="side-nav" aria-label="${escapeHtml(config.sectionTitle)}"><a class="side-top" href="${home ? '' : `${prefix}index.html`}#projects">&#8593; All ${escapeHtml(config.sectionTitle)}</a><ol class="side-list">${about ? aboutItem : ''}${overview ? overviewItem : ''}${items}</ol></nav>`;
}

const hasAbout = (root) => fs.existsSync(path.join(root, 'docs/about.md'));
const hasOverview = (root) => fs.existsSync(path.join(root, 'docs/overview.md'));

/** Every page of the stageshow look: a header that stays put, the project list on the left and the page on the right. */
function stageShell({ config, title, description, depth, main, nav, hasMermaid = false, home = false }) {
  const prefix = '../'.repeat(depth);
  const more = (config.nav ?? []).filter((n) => n.label !== 'About Me').map((n) => `<a href="${prefix}${escapeHtml(n.href)}">${escapeHtml(n.label)}</a>`).join(' &middot; ');
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title ? `${title} | ${config.name}` : config.name)}</title>
<meta name="description" content="${escapeHtml(description || config.intro)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap">
<link rel="stylesheet" href="${prefix}site.css">
<script>${THEME_SCRIPT}</script>
</head>
<body class="stage${home ? ' stage-home' : ''}">
<a class="skip" href="#main">Skip to Content</a>
<header class="topbar"><div class="topbar-in">
<a class="who" href="${prefix}index.html">${config.owner ? `<span class="me">${escapeHtml(config.owner)}</span>` : ''}<span class="pf">${escapeHtml(config.name)}</span></a>
${iconsHtml(config, prefix)}
</div></header>
<div class="shell">
<aside class="side">${nav}</aside>
<main id="main" class="col">
${main}
</main>
</div>
<footer class="site-footer"><div class="foot-wrap"><p class="foot">${escapeHtml(config.name)}. ${escapeHtml(config.footerNote)}${more ? ` ${more}` : ''}</p></div></footer>
<script>${TOGGLE_SCRIPT}</script>
<script>${SPY_SCRIPT}</script>
<script>${COPY_SCRIPT}</script>
${main.includes('data-site="') ? `<script>${COMPONENT_SCRIPT}</script>` : ''}
${hasMermaid ? `<script type="module">${STAGE_MERMAID}</script>` : ''}
</body>
</html>
`;
}

/** A page other than the home page. A project's own page gets its head and keeps its sections in the left list. */
export function stageReadingPage({ config, rel, html, title, hasMermaid, description, depth, subnav = '', root = repoRoot }) {
  const prefix = '../'.repeat(depth);
  const c = projectOf(config, rel);
  const own = c && c.path === rel;
  const inline = own && c.inline ? inlineMaterials(config, root, c, false) : null;
  const source = inline ? swapSection(html, c.inlineIn ?? 'materials') : html;
  let heads = headingsOf(html, 2).map((h) => ({ text: h.text, href: `#${h.id}` }));
  if (inline) heads = withItemHeads(heads, inline.heads, c.inlineIn ?? 'materials');
  const text = (x) => (inline ? x.replace(INLINE_TOKEN, inline.html) : x);
  const main = own
    ? `${projectHead(c, 1, prefix)}\n${inline ? '' : subnav}<article class="prose">\n${applyComponents(text(enhanceCodeBlocks(dropFirstH1(source))), c.components)}</article>`
    : `${subnav}<article class="prose">\n${enhanceCodeBlocks(html)}</article>`;
  return stageShell({ config, title, description, depth, main, hasMermaid, nav: sideNav(config, { prefix, home: false, current: c ? cardId(c) : '', subs: c ? { [cardId(c)]: heads } : {}, about: hasAbout(root), overview: hasOverview(root) }) });
}

/** The home page: the chips, then every project in full on the same page, one after the other. */
export function stageHomePage({ config, root }) {
  const ready = config.cards.filter(isReady);
  const embeds = ready.map((c) => {
    const id = cardId(c);
    const { html, hasMermaid } = renderMarkdown(fs.readFileSync(path.join(root, c.path), 'utf8'));
    const inline = c.inline ? inlineMaterials(config, root, c, true) : null;
    const source = inline ? swapSection(html, c.inlineIn ?? 'materials') : html;
    let body = relocate(namespaced(shiftHeadings(dropFirstH1(applyComponents(enhanceCodeBlocks(source), c.components))), id), path.posix.dirname(c.path));
    let heads = headingsOf(body, 3).map((h) => ({ text: h.text, href: `#${h.id}` }));
    if (inline) {
      body = body.replace(INLINE_TOKEN, inline.html);
      heads = withItemHeads(heads, inline.heads, c.inlineIn ?? 'materials');
    }
    return {
      id,
      hasMermaid,
      heads,
      section: `<section class="project" id="${id}">\n${projectHead(c, 2, '')}\n<div class="prose embedded">\n${body}</div>\n<p class="to-top"><a href="#projects">&#8593; Back to ${escapeHtml(config.sectionTitle)}</a></p>\n</section>`,
    };
  });
  const about = hasAbout(root);
  const aboutRendered = about ? renderMarkdown(fs.readFileSync(path.join(root, 'docs/about.md'), 'utf8')) : { html: '', hasMermaid: false };
  const aboutBody = relocate(namespaced(shiftHeadings(dropFirstH1(applyComponents(enhanceCodeBlocks(aboutRendered.html), {}))), 'about'), 'docs');
  const aboutHeads = headingsOf(aboutBody, 3).map((h) => ({ text: h.text, href: `#${h.id}` }));
  const aboutSection = !about ? '' : `<section class="about" id="about">\n<h2 class="proj-title">${escapeHtml(config.aboutButton ?? 'About Me')}</h2>\n<div class="prose embedded">\n${aboutBody}</div>\n</section>`;
  const overview = hasOverview(root);
  const ovRendered = overview ? renderMarkdown(fs.readFileSync(path.join(root, 'docs/overview.md'), 'utf8')) : { html: '', hasMermaid: false };
  const ovBody = relocate(namespaced(shiftHeadings(dropFirstH1(applyComponents(enhanceCodeBlocks(ovRendered.html), {}))), 'overview'), 'docs');
  const ovHeads = headingsOf(ovBody, 3).map((h) => ({ text: h.text, href: `#${h.id}` }));
  const overviewSection = !overview ? '' : `<section class="about" id="how-it-works">
<h2 class="proj-title">How It Works</h2>
<div class="prose embedded">
${ovBody}</div>
</section>`;
  const main = `<h1 class="sr-only">${escapeHtml(config.name)}</h1>
<section id="projects" aria-label="${escapeHtml(config.sectionTitle)}">
<ul class="chips">
${ready.map(chipHtml).join('')}
</ul>
</section>
${aboutSection}
${overviewSection}
${embeds.map((e) => e.section).join('\n')}`;
  return stageShell({
    config, title: '', description: config.intro, depth: 0, main, home: true, hasMermaid: aboutRendered.hasMermaid || ovRendered.hasMermaid || embeds.some((e) => e.hasMermaid),
    nav: sideNav(config, { prefix: '', home: true, current: '', subs: { about: aboutHeads, overview: ovHeads, ...Object.fromEntries(embeds.map((e) => [e.id, e.heads])) }, about, overview }),
  });
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
  config = { ...config, hasAbout: hasAbout(root) };
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
      const proseBody = `<article class="prose">\n${html}</article>`;
      const page = config.theme === 'stageshow'
        ? stageReadingPage({ config, rel, html, title, hasMermaid, description, depth, subnav: subnavFor(config, rel), root })
        : pageHtml({ config, title, body: proseBody, depth, subnav: subnavFor(config, rel), hasMermaid, description });
      fs.writeFileSync(target, page);
      pages.push(outRel);
    } else if (PUBLISHED_FILES.test(rel) && !/(^|\/)(\.|~\$)/.test(rel)) {
      const target = path.join(out, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(root, rel), target);
    }
  }
  fs.writeFileSync(path.join(out, 'index.html'), config.theme === 'stageshow'
    ? stageHomePage({ config, root })
    : pageHtml({ config, title: '', body: homeBody(config), depth: 0 }));
  pages.push('index.html');
  // The stageshow look is the same stylesheet plus a second one that overrides the layout.
  const css = fs.readFileSync(path.join(here, 'site.css'), 'utf8');
  fs.writeFileSync(path.join(out, 'site.css'), config.theme === 'stageshow' ? `${css}\n${fs.readFileSync(path.join(here, 'stage.css'), 'utf8')}` : css);
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
  const theme = (process.argv.find((a) => a.startsWith('--theme=')) ?? '').slice(8) || config.theme;
  const handoutHtml = await convertHandouts(repoRoot, config);
  const pages = buildSite({ config: { ...config, theme, handoutHtml } });
  const problems = checkSite(path.join(repoRoot, '_site'));
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`Site built: ${pages.length} pages, every link resolves`);
}
