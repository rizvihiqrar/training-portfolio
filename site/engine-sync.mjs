// The site's engine is written twice: in the product portfolio and in the training portfolio. engine.sha256 pins the files that must match.
//
//   node engine-sync.mjs            checks this repository's files against engine.sha256
//   node engine-sync.mjs --update   rewrites engine.sha256 after an intended change (do it in both repositories)
//   node engine-sync.mjs --other owner/repo   also checks that the other repository's engine.sha256 on main is the same
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ENGINE_FILES = ['build.mjs', 'components.mjs', 'stage.css'];
const here = (f) => fileURLToPath(new URL(f, import.meta.url));

/** sha256 of each engine file, ignoring line endings, as "hash  name" lines. */
export function manifest(dir = here('.')) {
  return ENGINE_FILES.map((f) => {
    const text = fs.readFileSync(`${dir}/${f}`, 'utf8').replace(/\r\n/g, '\n');
    return `${crypto.createHash('sha256').update(text).digest('hex')}  ${f}`;
  }).join('\n') + '\n';
}

/** Names of the files whose hash differs between two manifests. */
export function differing(a, b) {
  const parse = (m) => new Map(m.trim().split(/\r?\n/).map((l) => l.trim().replace(/\s\*/, ' ').split(/\s+/).reverse())); // CRLF line endings (a Windows checkout) and sha256sum's * marker
  const x = parse(a), y = parse(b);
  return ENGINE_FILES.filter((f) => x.get(f) === undefined || x.get(f) !== y.get(f)); // a file missing from a list is a difference too
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pinned = here('./engine.sha256');
  const args = process.argv.slice(2);
  if (args.includes('--update')) {
    fs.writeFileSync(pinned, manifest());
    console.log('engine.sha256 updated');
  } else {
    const mine = manifest();
    const stale = differing(mine, fs.existsSync(pinned) ? fs.readFileSync(pinned, 'utf8') : '');
    if (stale.length) { console.error(`engine.sha256 does not match: ${stale.join(', ')}. After an intended change run node engine-sync.mjs --update here and in the other repository.`); process.exit(1); }
    const other = args[args.indexOf('--other') + 1];
    if (args.includes('--other') && other) {
      let res;
      try { res = await fetch(`https://raw.githubusercontent.com/${other}/main/site/engine.sha256?t=${Date.now()}`); } catch (e) { console.error(`could not reach GitHub to read ${other}'s engine.sha256: ${e.message}`); process.exit(1); }
      if (!res.ok) { console.error(`could not read ${other}'s engine.sha256 (HTTP ${res.status})`); process.exit(1); }
      const diff = differing(mine, await res.text());
      if (diff.length) { console.error(`the engine differs from ${other}: ${diff.join(', ')}. Copy the change over and update both engine.sha256 files.`); process.exit(1); }
    }
    console.log('engine files match' + (other ? ` ${other}` : ''));
  }
}
