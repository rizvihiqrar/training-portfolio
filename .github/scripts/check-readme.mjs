// Keeps the front page honest as content is added.
//   node .github/scripts/check-readme.mjs
// Fails (exit 1) when:
//   - any Markdown file links to a file or folder that doesn't exist (exact letter case, as on GitHub),
//     or to a #heading that is not in the file it points at;
//   - a course folder (NN-section/course-name/) is not linked from the front README;
//   - a top-level folder is neither a numbered section (NN-name), docs, site nor .github (a course placed elsewhere would escape the check);
// Written style: headings are in title case, and the phrase "plain English" is not used anywhere.
// Web links are not checked: third-party sites block bots and would make the build flaky.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/** Markdown with fenced code blocks and inline code removed, so example links are not read as real ones. */
export function withoutCode(markdown) {
  return markdown.replace(/^(```|~~~)[\s\S]*?^\1/gm, '').replace(/`[^`\n]*`/g, '');
}

/** Links in a Markdown text as { target, anchor }: web links skipped, queries removed; target is '' for a link within the same file. */
export function links(markdown) {
  const found = [];
  const link = /\]\((<[^>]+>|[^()\s]*(?:\([^()\s]*\)[^()\s]*)*)(?:\s+"[^"]*")?\)/g;
  for (const m of withoutCode(markdown).matchAll(link)) {
    const raw = m[1].replace(/^<|>$/g, '');
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
    const [pathPart, ...rest] = raw.split('#');
    const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } }; // a bare % is kept as written
    found.push({ target: decode(pathPart.split('?')[0]), anchor: decode(rest.join('#')) });
  }
  return found;
}

/** Relative link targets in a Markdown text: anchors and queries removed, web links and same-file links skipped. */
export function relativeLinks(markdown) {
  return links(markdown).map((l) => l.target).filter(Boolean);
}

/** GitHub's anchor for a heading: lower case, punctuation removed, spaces to hyphens. */
export function slug(heading) {
  return heading
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/** The anchors a Markdown file offers (a repeated heading gets -1, -2, as on GitHub). */
export function headingSlugs(markdown) {
  const seen = new Map();
  const out = [];
  for (const m of withoutCode(markdown).matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = slug(m[1]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.push(n ? `${base}-${n}` : base);
  }
  return out;
}

/** True when every segment of rel exists with exactly this letter case (GitHub is case-sensitive, Windows is not). */
export function existsExact(root, rel) {
  let dir = root;
  for (const segment of rel.split('/').filter(Boolean)) {
    if (!fs.existsSync(dir) || !fs.readdirSync(dir).includes(segment)) return false;
    dir = path.join(dir, segment);
  }
  return true;
}

/** Link target resolved from the file that contains it to a path from the repository root. */
export function fromRoot(fileRel, target) {
  const base = target.startsWith('/') ? '' : path.posix.dirname(fileRel);
  return path.posix.normalize(path.posix.join(base, target.replace(/^\/+/, ''))).replace(/\/$/, '');
}

function markdownFiles(root, dir = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (e.name === '.git' || e.name === '.github' || e.name === 'node_modules') continue;
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...markdownFiles(root, rel));
    else if (e.name.endsWith('.md')) out.push(rel);
  }
  return out;
}

/** Course folders: any folder directly inside a numbered section folder (01-name/course-name/). */
export function courseFolders(root) {
  const found = [];
  for (const section of fs.readdirSync(root, { withFileTypes: true })) {
    if (!section.isDirectory() || !/^\d\d-/.test(section.name)) continue;
    for (const course of fs.readdirSync(path.join(root, section.name), { withFileTypes: true })) {
      if (course.isDirectory()) found.push(`${section.name}/${course.name}`);
    }
  }
  return found;
}

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'of', 'off', 'on', 'onto', 'or', 'out', 'over', 'per', 'so', 'the', 'to', 'up', 'upon', 'vs', 'via', 'with', 'from', 'into', 'than', 'nor', 'yet']);
// Names that are written in lower case on purpose.
const LOWERCASE_NAMES = new Set(['npm', 'npx', 'pnpm', 'k6', 'ios', 'macos', 'iphone', 'ipad', 'e2e', 'eslint']);

/** Headings that are not in title case: a word starts in lower case, unless it is a small word in the middle (a, of, to, with...) or a name written in lower case (npm, k6). The first word, the last word and the word after a colon are always capitalized. Later parts of a hyphenated word may be lower case (Low-fidelity). */
export function headingProblems(markdown) {
  const out = [];
  for (const m of withoutCode(markdown).matchAll(/^#{1,6}[ \t]+(.+)$/gm)) {
    const text = m[1].replace(/\s+#+\s*$/, '').trim();
    const words = text.split(/\s+/).filter(Boolean);
    const checkable = words.map((w, i) => ({ w, i })).filter(({ w }) => !/^(`|\[|http)/.test(w));
    const lastIndex = checkable.length ? checkable[checkable.length - 1].i : -1;
    for (const { w, i } of checkable) {
      const core = (w.match(/^[^A-Za-z0-9]*([A-Za-z0-9'’-]+)/) ?? [])[1];
      if (!core) continue;
      const first = core.split('-')[0];
      const forced = i === 0 || i === lastIndex || words[i - 1].endsWith(':');
      if (/^[a-z]/.test(first) && !LOWERCASE_NAMES.has(first.toLowerCase()) && (forced || !SMALL_WORDS.has(first))) {
        out.push(`the heading "${text}" is not in title case ("${first}"): capitalize it, or add it to LOWERCASE_NAMES if it is a name written in lower case`);
        break;
      }
    }
  }
  return out;
}

/** Phrases that must not appear in the written text, and what to say instead. */
export const BANNED_PHRASES = [
  { pattern: /plain[- ]english/i, name: 'plain English', say: 'use "Overview" for a heading, or describe it differently' },
];

/** @returns {string[]} one line per problem; empty when the README is in step with the folders */
export function findProblems(root) {
  const problems = [];
  for (const file of markdownFiles(root)) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const problem of headingProblems(text)) problems.push(`${file}: ${problem}`);
    for (const { pattern, name, say } of BANNED_PHRASES) {
      if (pattern.test(withoutCode(text))) problems.push(`${file} uses the banned phrase "${name}"; ${say}`);
    }
    for (const { target, anchor } of links(text)) {
      const resolved = target ? fromRoot(file, target) : file;
      if (target && !existsExact(root, resolved)) {
        problems.push(`${file} links to ${target}, which does not exist`);
      } else if (anchor && resolved.endsWith('.md')) {
        const slugs = headingSlugs(fs.readFileSync(path.join(root, resolved), 'utf8'));
        if (!slugs.includes(anchor.toLowerCase())) problems.push(`${file} links to ${target}#${anchor}, but ${resolved} has no such heading`);
      }
    }
  }
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    if (e.isDirectory() && !/^\d\d-/.test(e.name) && !['docs', 'site', '_site', '.github', '.git', 'node_modules'].includes(e.name)) {
      problems.push(`${e.name}/ is not a numbered section folder (01-name), docs, site or .github, so courses in it would not be checked`);
    }
  }
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const linked = relativeLinks(readme).map((t) => fromRoot('README.md', t));
  const courses = courseFolders(root);
  for (const course of courses) {
    if (!linked.some((l) => l === course || l.startsWith(`${course}/`))) {
      problems.push(`${course} exists but the front README does not link to it`);
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const problems = findProblems(root);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`README check: ok (${courseFolders(root).length} course folders, every Markdown link resolves)`);
}
