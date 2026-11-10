// Keeps the front page honest as content is added.
//   node scripts/check-readme.mjs
// Fails (exit 1) when the README links to a file or folder that doesn't exist, or when a
// course folder (NN-section/course-name/ with its own README.md) is not linked from the README.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/** Relative link targets in a Markdown file, without anchors; web links and images from the web are skipped. */
export function relativeLinks(markdown) {
  const targets = [];
  for (const m of markdown.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const raw = m[1];
    if (/^([a-z]+:|#|mailto:)/i.test(raw)) continue;
    targets.push(decodeURIComponent(raw.split('#')[0]));
  }
  return targets.filter(Boolean);
}

/** Course folders: a folder two levels down that has its own README.md. */
export function courseFolders(root) {
  const found = [];
  for (const section of fs.readdirSync(root, { withFileTypes: true })) {
    if (!section.isDirectory() || !/^\d\d-/.test(section.name)) continue;
    for (const course of fs.readdirSync(path.join(root, section.name), { withFileTypes: true })) {
      if (course.isDirectory() && fs.existsSync(path.join(root, section.name, course.name, 'README.md'))) {
        found.push(`${section.name}/${course.name}`);
      }
    }
  }
  return found;
}

/** @returns {string[]} one line per problem; empty when the README is in step with the folders */
export function findProblems(root) {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const links = relativeLinks(readme);
  const problems = [];
  for (const target of links) {
    if (!fs.existsSync(path.join(root, target))) problems.push(`README links to ${target}, which does not exist`);
  }
  const normalized = links.map((l) => l.replace(/\/$/, ''));
  for (const course of courseFolders(root)) {
    const linked = normalized.some((l) => l === course || l.startsWith(`${course}/`));
    if (!linked) problems.push(`${course} has a README.md but the front README does not link to it`);
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const problems = findProblems(root);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`README check: ok (${courseFolders(root).length} course folders, all linked)`);
}
