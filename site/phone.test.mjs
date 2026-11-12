// The phone rules in stage.css (checked in real browsers at 360 and 390 px wide with `npm run phone`; CI has no browser, so this pins the rules).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';

const css = fs.readFileSync(new URL('./stage.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const phone = css.split('/* ---- Phones')[1]?.split('\n}\n')[0] ?? '';

test('stage.css has a phone block for widths up to 600px', () => {
  assert.match(css, /\/\* ---- Phones \(checked at 360 and 390 px wide\)/);
  assert.match(css, /@media \(max-width: 600px\) \{\n  \.run/);
});

test('on a phone every button the pieces draw is at least 40px tall, and code in the animated windows wraps instead of being cut off', () => {
  for (const sel of ['.stage .icon-btn', '.copy', '.pc button.rp', '.tw button.tr', '.qz button.o', '.pick button.tile', '.fold > summary', '.fbt .rd']) {
    const rule = phone.split('\n').find((l) => l.includes(sel));
    assert.ok(rule, `${sel} has a phone rule`);
    const size = rule.match(/(?:min-)?(?:height|width|min-height): (\d+)px/g) ?? [];
    assert.ok(size.some((m) => Number(m.match(/\d+/)[0]) >= 40), `${sel} is at least 40px on a phone: ${rule.trim()}`);
  }
  assert.match(phone, /\.run \.l\.code \{ white-space: pre-wrap; overflow-wrap: anywhere; \}/);
  assert.match(phone, /\.run \.l \{ flex-wrap: wrap;/);
});

test('every radio in the feedback form sits in a label that is the tap target', async () => {
  const { applyComponents } = await import('./components.mjs');
  const html = applyComponents('<!-- site:feedback -->\n<!-- /site:feedback -->', { feedback: { statements: ['a', 'b'], questions: ['q1', 'q2'] } });
  assert.equal((html.match(/<label class="rd"><input type="radio"/g) ?? []).length, 10);
  assert.equal((html.match(/<input type="radio"/g) ?? []).length, 10);
});
