import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { ENGINE_FILES, differing, manifest } from './engine-sync.mjs';

const pinned = fs.readFileSync(new URL('./engine.sha256', import.meta.url), 'utf8');

test('the engine files match engine.sha256 (after an intended change run: node engine-sync.mjs --update, here and in the other repository)', () => {
  assert.deepEqual(differing(manifest(), pinned), []);
});

test('engine.sha256 lists every engine file once', () => {
  assert.deepEqual(pinned.trim().split('\n').map((l) => l.split(/\s+/)[1]), ENGINE_FILES);
});

test('the comparison names the files that differ and ignores line endings', () => {
  const a = 'aaa  build.mjs\nbbb  components.mjs\nccc  stage.css\n';
  assert.deepEqual(differing(a, a.replace('bbb', 'xxx')), ['components.mjs']);
  assert.deepEqual(differing(a, a), []);
  assert.deepEqual(differing(a.replace('ccc  stage.css\n', ''), a.replace('ccc  stage.css\n', '')), ['stage.css'], 'a file missing from both lists is a difference');
});
