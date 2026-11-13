import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyComponents, codeSegs, plainMarkdown, COMPONENT_BLOCK, COMPONENT_SCRIPT, MAX_RUN_LINES } from './components.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(new URL('./site.json', import.meta.url), 'utf8'));

const block = (kind, id = '') => `<!-- site:${kind}${id ? ` ${id}` : ''} -->\n<p>plain version</p>\n<!-- /site:${kind} -->`;
const runData = (extra = {}) => ({ tab: 'a.md', chat: 'Do <it>', alt: 'An example', lines: [{ segs: [['p', '$'], ['', 'run & done']], bar: { c: 'a', w: 40 } }], ...extra });
const days = [
  { n: 1, title: 'One', goal: 'g', time: '5 min', source: 'YouTube', video: 'abcdefghijk' },
  { n: 2, title: 'Two', goal: 'g', time: '5 min', source: 'Pluralsight', link: 'https://example.com/course' },
  { n: 3, title: 'Three', goal: 'g', time: '5 min', source: 'Hands-on' },
];
const schedule = { weeks: [{ title: 'Week 1', days: [1, 2, 3] }], days, download: { label: 'Download It', href: 'x.docx' } };

test('a run is a window with the prompt first, escaped text, and numeric bar widths', () => {
  const html = applyComponents(block('run', 'r'), { runs: { r: runData() } });
  assert.match(html, /^<div class="run" role="img" aria-label="An example">/);
  assert.match(html, /<span class="tab">a\.md<\/span><span>Copilot Chat<\/span>/);
  assert.ok(html.indexOf('class="l chat"') < html.indexOf('run &amp; done'), 'the prompt comes before the lines');
  assert.ok(html.includes('Do &lt;it&gt;') && html.includes('run &amp; done'), 'text is escaped');
  assert.ok(html.includes('<i style="--w:40%"></i>'));
  assert.doesNotMatch(html, /plain version/, 'the plain version is replaced');
});

test('a line of source code is coloured by its words, with its spaces and indentation kept', () => {
  assert.deepEqual(codeSegs("  await page.goto('/x');"), [['', '  '], ['kw', 'await'], ['', ' '], ['', 'page'], ['', '.'], ['fn', 'goto'], ['', '('], ['st', "'/x'"], ['', ');']]);
  const html = applyComponents(block('run', 'r'), { runs: { r: runData({ lines: [{ code: "  await go('a & b');" }] }) } });
  assert.ok(html.includes('<div class="l code">  <span class="kw">await</span> <span class="fn">go</span>('), 'indentation and spacing are kept');
  assert.ok(html.includes("<span class=\"st\">'a &amp; b'</span>"), 'strings are escaped');
});

test('a run with more lines than the animation has timing for is refused', () => {
  const lines = Array.from({ length: MAX_RUN_LINES }, () => ({ segs: [['', 'x']] }));
  assert.throws(() => applyComponents(block('run', 'r'), { runs: { r: runData({ lines }) } }), /at most/);
  assert.doesNotThrow(() => applyComponents(block('run', 'r'), { runs: { r: runData({ lines: lines.slice(0, MAX_RUN_LINES - 1) }) } }));
});

test('blocks are swapped, the rest of the page is kept, and a page without blocks is unchanged', () => {
  const html = `<h2>A</h2>\n${block('download')}\n<p>after</p>`;
  const out = applyComponents(html, { download: { label: 'Get', href: 'f.docx' } });
  assert.match(out, /^<h2>A<\/h2>\n<a class="dl" href="f\.docx" download>/);
  assert.ok(out.endsWith('<p>after</p>'));
  assert.equal(applyComponents('<p>nothing</p>', {}), '<p>nothing</p>');
});

test('a fold block passes through untouched, because build.mjs folds it in', () => {
  const html = '<!-- site:fold -->\n<p>link</p>\n<!-- /site:fold -->';
  assert.equal(applyComponents(html, {}), html);
});

test('an unknown piece, missing data, or an unmatched closing comment fails instead of leaving a gap', () => {
  assert.throws(() => applyComponents(block('wobble'), { wobble: {} }), /unknown piece "wobble"/);
  assert.throws(() => applyComponents(block('quiz'), {}), /no data for quiz/);
  assert.throws(() => applyComponents(block('run', 'x'), { runs: {} }), /no data for run "x"/);
  assert.ok(!new RegExp(COMPONENT_BLOCK.source).test('<!-- site:quiz --> text without the closing comment'));
});

test('the schedule has a tile and a hidden panel for every day, and hands-on days look different', () => {
  const html = applyComponents(block('schedule'), { schedule });
  assert.equal((html.match(/<button type="button" class="tile/g) ?? []).length, 3);
  assert.equal((html.match(/<div class="panel" data-for="\d" hidden>/g) ?? []).length, 3);
  assert.match(html, /class="tile hands" data-day="3"/);
  assert.doesNotMatch(html, /class="tile hands" data-day="[12]"/);
  assert.match(html, /<div class="vid" data-id="abcdefghijk">/);
  assert.match(html, /<a class="vid card" href="https:\/\/example\.com\/course">/);
  assert.match(html, /Hands-on, no video/);
  assert.match(html, /<a class="dl" href="x\.docx" download>.*Download It<\/a>$/s);
});

test('the schedule refuses a bad video ID, a link that is not https, or a week naming a missing day', () => {
  const bad = (day, weeks) => () => applyComponents(block('schedule'), { schedule: { ...schedule, weeks: weeks ?? schedule.weeks, days: [day] } });
  assert.throws(bad({ ...days[0], video: 'short' }, [{ title: 'W', days: [1] }]), /not a video ID/);
  assert.throws(bad({ ...days[1], link: 'http://example.com' }, [{ title: 'W', days: [2] }]), /must be https/);
  assert.throws(bad(days[0], [{ title: 'W', days: [1, 9] }]), /day 9, which has no entry/);
});

test('the quiz shows its answer as an option number and escapes its text', () => {
  const q = { questions: [{ q: 'Which <b>?', options: ['A', 'B'], answer: 1, why: 'Because & so' }], pass: 1, passMessage: 'Well done.', failMessage: 'Try again.' };
  const html = applyComponents(block('quiz'), { quiz: q });
  assert.match(html, /<div class="qitem" data-answer="1" hidden>/);
  assert.ok(html.includes('Which &lt;b&gt;?') && html.includes('Because &amp; so'));
  assert.match(html, /data-pass="1" data-pass-message="Well done\." data-fail-message="Try again\."/);
  assert.throws(() => applyComponents(block('quiz'), { quiz: { questions: q.questions } }), /passMessage and failMessage/);
  assert.throws(() => applyComponents(block('quiz'), { quiz: { ...q, questions: [{ ...q.questions[0], answer: 2 }] } }), /not one of the options/);
});

test('missing fields fail with a clear message, not a raw error or the word undefined', () => {
  const quizOf = (q) => applyComponents(block('quiz'), { quiz: { passMessage: 'a', failMessage: 'b', questions: [q] } });
  assert.throws(() => quizOf({ q: 'Q', why: 'w', answer: 0 }), /at least two options/);
  assert.throws(() => applyComponents(block('run', 'r'), { runs: { r: runData({ lines: [{}] }) } }), /every line of a run needs segs or code/);
  assert.throws(() => applyComponents(block('run', 'r'), { runs: { r: runData({ lines: [{ segs: [['', 'x']], bar: { w: 'wide' } }] }) } }), /a bar width must be a number from 0 to 100/);
  assert.throws(() => applyComponents(block('schedule'), { schedule: { ...schedule, days: [{ ...days[0], time: '' }, days[1], days[2]] } }), /day 1: time must be some text/);
  assert.throws(() => applyComponents(block('tree'), { tree: { nodes: [{ depth: 0, kind: 'o', name: 'root', title: 'T', text: 'x' }] } }), /node's like must be some text/);
  assert.throws(() => applyComponents(block('tree'), { tree: { nodes: [{ depth: 2, kind: 'o', name: 'deep', title: 'T', text: 'x', like: 'y' }] } }), /depth must follow its parent's/);
});

test('two feedback forms on one page do not share radio groups', () => {
  const data = { feedback: { statements: ['One'], questions: ['A?', 'B?'] } };
  const names = [...applyComponents(block('feedback') + block('feedback'), data).matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(names).size, 2);
});

test('the panel and tree titles are not headings, so the home page heading shift cannot restyle them', () => {
  assert.doesNotMatch(applyComponents(block('schedule'), { schedule }), /<h[1-6]/);
  assert.ok(COMPONENT_SCRIPT.includes('class="ttitle"') && !/<h[1-6]/.test(COMPONENT_SCRIPT));
});

test('the feedback form is a five-column grid and two written questions, and says it sends nothing', () => {
  const html = applyComponents(block('feedback'), { feedback: { statements: ['One', 'Two'], questions: ['Hardest day?', 'Cut or add?'] } });
  assert.equal((html.match(/<input type="radio"/g) ?? []).length, 10);
  assert.equal((html.match(/<textarea>/g) ?? []).length, 2);
  assert.match(html, /sends nothing/);
  assert.throws(() => applyComponents(block('feedback'), { feedback: { statements: ['One'], questions: ['Only one'] } }), /two questions/);
});

test('the tree keeps each row\'s path, types and notes in data the page script reads', () => {
  const nodes = [
    { depth: 0, kind: 'o', name: 'root', title: 'T0', text: 'x', like: 'y' },
    { depth: 1, kind: 'ts', name: 'a.ts', title: 'T1', text: 'x', like: 'y', inside: 'z' },
  ];
  const html = applyComponents(block('tree'), { tree: { nodes } });
  const attr = html.match(/data-nodes="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  assert.deepEqual(JSON.parse(attr)[1], ['ts', 'root / a.ts', 'T1', 'x', 'y', 'z']);
  assert.match(html, /<button type="button" class="tr k-ts" style="--d:1" data-i="1">/);
  assert.throws(() => applyComponents(block('tree'), { tree: { nodes: [{ ...nodes[0], kind: 'py' }] } }), /kind must be one of/);
});

test('download cards and the download button name the file and keep the text escaped', () => {
  const html = applyComponents(block('downloads'), { downloads: [{ title: 'A & B', line: 'One line', href: 'a.docx' }] });
  assert.match(html, /<b>A &amp; B<\/b><p>One line<\/p><a class="dl" href="a\.docx" download>/);
});

test('the Markdown that GitHub shows keeps the plain version and drops only the markers', () => {
  assert.equal(plainMarkdown('a\n<!-- site:run ideas -->\nplain\n<!-- /site:run -->\nb'), 'a\n\nplain\n\nb');
});

test('the page script is valid JavaScript and runs every kind of piece', () => {
  assert.doesNotThrow(() => new Function(COMPONENT_SCRIPT));
  for (const kind of ['schedule', 'quiz', 'tree']) assert.ok(COMPONENT_SCRIPT.includes(`data-site="${kind}"`), `${kind} is handled`);
});

test('every site block in this repository\'s pages is closed and has data in site.json', () => {
  for (const c of config.cards.filter((x) => x.path)) {
    const md = fs.readFileSync(path.join(root, c.path), 'utf8');
    const opens = [...md.matchAll(/<!-- site:([a-z-]+)(?: ([\w-]+))? -->/g)];
    const closes = [...md.matchAll(/<!-- \/site:([a-z-]+) -->/g)];
    assert.equal(opens.length, closes.length, `${c.path}: every site comment is closed`);
    assert.doesNotThrow(() => applyComponents(md.replace(/\r\n/g, '\n'), c.components), `${c.path}: its pieces have data`);
    assert.equal([...md.matchAll(COMPONENT_BLOCK)].length, opens.length, `${c.path}: blocks pair up in order`);
  }
});

const timebarData = (extra = {}) => ({
  title: 'An 8-hour release', alt: 'Eight hours split three ways', total: 8, unit: 'hours',
  segments: [
    { name: 'Critical', share: 60, amount: 4.8, line: 'First <always>' },
    { name: 'Medium', share: 30, amount: 2.4, line: 'Next' },
    { name: 'Low', share: 10, amount: 0.8, line: 'Last' },
  ],
  summary: { title: 'Then four lines', lines: [['Tested', 'All & more']], note: 'Example wording' },
  ...extra,
});
const scopeData = (extra = {}) => ({
  alt: 'What runs', events: [{ id: 'pr', text: 'Pull request' }, { id: 'main', text: 'Push to main' }],
  check: { text: 'Touches the tests?' },
  outcomes: [{ id: 'smoke', text: 'Smoke', detail: '16 of 65' }, { id: 'full', text: 'Full', detail: 'Everything' }],
  scenarios: [
    { label: 'A pull request', event: 'pr', check: 'no', outcome: 'smoke', why: 'Only smoke.' },
    { label: 'A push', event: 'main', outcome: 'full', why: 'Everything.' },
  ],
  ...extra,
});
const funnelData = (extra = {}) => ({
  title: 'The list', alt: 'A funnel', asOf: 'As of today',
  stages: [{ value: 100, label: 'all' }, { value: 60, label: 'kept', step: 'minus 40', delta: -40 }, { value: 5, label: 'built', step: 'then built' }],
  ...extra,
});

test('a time bar shows each share as a width, escapes its text, and holds the finished picture (the page only rewinds it when it plays)', () => {
  const html = applyComponents(block('timebar'), { timebar: timebarData() });
  assert.match(html, /^<div class="pc tb" data-site="timebar" role="group" aria-label="Eight hours split three ways">/);
  for (const w of [60, 30, 10]) assert.ok(html.includes(`style="--w:${w}%;`), `a segment is ${w}% wide`);
  assert.ok(html.includes('4.8 hours') && html.includes('First &lt;always&gt;') && html.includes('All &amp; more'), 'amounts shown, text escaped');
  assert.doesNotMatch(html, /rewind|plain version/, 'no starting state in the markup, and the plain version is replaced');
  assert.ok(COMPONENT_SCRIPT.includes('IntersectionObserver') && COMPONENT_SCRIPT.includes('prefers-reduced-motion'), 'it plays on scroll and not with reduced motion');
});

test('a time bar whose shares do not add up to 100, or whose hours do not match its shares, is refused', () => {
  const segs = (a, b, c) => timebarData().segments.map((s, i) => ({ ...s, share: [a, b, c][i] }));
  assert.throws(() => applyComponents(block('timebar'), { timebar: timebarData({ segments: segs(60, 30, 20) }) }), /add up to 110/);
  assert.throws(() => applyComponents(block('timebar'), { timebar: timebarData({ segments: timebarData().segments.map((s, i) => ({ ...s, amount: [4, 3.2, 0.8][i] })) }) }), /is not 60% of 8/);
  assert.throws(() => applyComponents(block('timebar'), { timebar: timebarData({ summary: { title: 'x', lines: [] } }) }), /summary with lines/);
});

test('the picker starts on its first case with that path lit, and every case names real nodes', () => {
  const html = applyComponents(block('scope'), { scope: scopeData() });
  assert.match(html, /<div class="nd ev lit" data-e="pr">/);
  assert.match(html, /<div class="nd out t-purple lit" data-o="smoke">/);
  assert.match(html, /<span class="ans lit" data-a="no">/);
  assert.doesNotMatch(html, /class="nd ev lit" data-e="main"/, 'only the first case is lit');
  assert.match(html, /<p class="sc-why">Only smoke\.<\/p>/);
  assert.match(html, /<button type="button" aria-pressed="true" class="on">A pull request<\/button>/);
  assert.throws(() => applyComponents(block('scope'), { scope: scopeData({ scenarios: [{ label: 'x', event: 'nope', outcome: 'full', why: 'y' }] }) }), /event nope/);
  assert.throws(() => applyComponents(block('scope'), { scope: scopeData({ scenarios: [{ label: 'x', event: 'pr', outcome: 'gone', why: 'y' }] }) }), /outcome gone/);
  assert.throws(() => applyComponents(block('scope'), { scope: scopeData({ scenarios: [{ label: 'x', event: 'pr', check: 'maybe', outcome: 'full', why: 'y' }] }) }), /yes or no/);
});

test('a funnel draws each bar in proportion to the first, never thinner than 3%, and the arithmetic between stages must hold', () => {
  const html = applyComponents(block('funnel'), { funnel: funnelData() });
  assert.ok(html.includes('--w:100.0%') && html.includes('--w:60.0%') && html.includes('--w:5.0%'));
  assert.ok(html.includes('data-from="100"') && html.includes('data-to="60"'), 'the count ticks from the first value to each value');
  assert.ok(applyComponents(block('funnel'), { funnel: funnelData({ stages: [{ value: 1000, label: 'all' }, { value: 2, label: 'tiny', step: 's' }] }) }).includes('--w:3.0%'));
  assert.throws(() => applyComponents(block('funnel'), { funnel: funnelData({ stages: [{ value: 100, label: 'all' }, { value: 70, label: 'kept', step: 'minus 40', delta: -40 }] }) }), /100 - 40 is not 70/);
  assert.throws(() => applyComponents(block('funnel'), { funnel: funnelData({ stages: [{ value: 100, label: 'all' }, { value: 60, label: 'kept' }] }) }), /step must be some text/);
});

test('the three pieces need their data: a block with none fails the build', () => {
  for (const kind of ['timebar', 'scope', 'funnel']) assert.throws(() => applyComponents(block(kind), {}), new RegExp(`no data for ${kind}`));
});

test('a time bar whose amounts do not add up to its total is refused', () => {
  const amounts = (a, b, c) => timebarData().segments.map((s, i) => ({ ...s, amount: [a, b, c][i] }));
  assert.doesNotThrow(() => applyComponents(block('timebar'), { timebar: timebarData({ segments: amounts(4.8, 2.4, 0.8) }) }));
  assert.throws(() => applyComponents(block('timebar'), { timebar: timebarData({ segments: amounts(4.8, 2.4, 1.5) }) }), /amounts add up to/);
});

test('the script cancels a running count on replay, plays pieces taller than the screen, and never leaves a piece hidden if it fails', () => {
  assert.ok(COMPONENT_SCRIPT.includes('gen++') && COMPONENT_SCRIPT.includes('mine===gen') && COMPONENT_SCRIPT.includes('if(mine!==gen)return'), 'a replay stops the count still running');
  assert.doesNotMatch(COMPONENT_SCRIPT, /threshold:\s*0\.\d/, 'no visibility threshold that a tall piece can never reach');
  assert.match(COMPONENT_SCRIPT, /catch\(e\)\{root\.classList\.remove\('rewind'\)/, 'a failing observer shows the finished picture');
});

test('the picker columns do not reuse the site\'s own stage class', () => {
  const html = applyComponents(block('scope'), { scope: scopeData() });
  assert.equal((html.match(/class="sc-col"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /class="stage"/);
});

test('the picker colours each stage by what it is: an outcome picks one of six tones (purple when it says nothing), and the first path starts fully drawn', () => {
  const tones = scopeData({ outcomes: [{ id: 'smoke', text: 'Smoke', detail: 'a', tone: 'green' }, { id: 'full', text: 'Full', detail: 'b', tone: 'grey' }] });
  const html = applyComponents(block('scope'), { scope: tones });
  assert.match(html, /<div class="nd out t-green lit" data-o="smoke">/);
  assert.match(html, /<div class="nd out t-grey" data-o="full">/);
  assert.match(html, /class="pc sc st3" style="--l2:var\(--green\)"/, 'the link into the last stage is green too');
  assert.match(applyComponents(block('scope'), { scope: scopeData() }), /style="--l2:var\(--purple\)"/, 'no tone means purple');
  assert.throws(() => applyComponents(block('scope'), { scope: scopeData({ outcomes: [{ id: 'smoke', text: 'S', detail: 'd', tone: 'pink' }, { id: 'full', text: 'F', detail: 'd' }] }) }), /tone must be one of blue, amber, green, red, purple, grey/);
});

test('the picker sends a token down the path, lights the stages one after another, and skips the animation with reduced motion (the break: light everything at once)', () => {
  const html = applyComponents(block('scope'), { scope: scopeData() });
  assert.equal((html.match(/class="sc-token"/g) ?? []).length, 1, 'one token, inside the map');
  assert.ok(html.indexOf('class="sc-token"') > html.indexOf('What runs'), 'the token is the last child of the map, so the stage links keep their place');
  const js = COMPONENT_SCRIPT;
  const scope = js.slice(js.indexOf("each('[data-site=\"scope\"]'"));
  assert.match(scope, /prefers-reduced-motion/, 'reduced motion is read');
  assert.match(scope, /if\(calm\)\{[^}]*showCheck\(\);showOut\(\)/, 'with reduced motion every stage is lit at once');
  assert.ok((scope.match(/at\(\d+,/g) ?? []).length >= 5, 'the stages are timed one after another');
  assert.match(scope, /clearTimeout/, 'picking another case stops the one still running');
  assert.match(scope, /IntersectionObserver/, 'the first case plays when the picker scrolls into view');
});
