// Interactive pieces of the site (a two-week schedule, a quiz, a folder explorer, an animated result, a time bar, a "what happens when" picker, a funnel), made from data in site.json.
//
// In a Markdown file a piece sits between two comments, with a plain version inside them:
//
//   <!-- site:quiz -->
//   ...the same questions as a list, which is what GitHub shows...
//   <!-- /site:quiz -->
//
// GitHub hides the comments and shows the plain version. The site swaps the whole block for the piece, filled from the
// card's `components` in site.json (`runs.<id>` for an animated result). A piece with no data, or an unknown kind, fails the build.
// A `fold` block is not a piece: build.mjs swaps it for the card's long version.
// This file, build.mjs and stage.css are the same in the product and training portfolios: engine.sha256 pins them.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const COMPONENT_BLOCK = /<!-- site:([a-z-]+)(?: ([\w-]+))? -->[\s\S]*?<!-- \/site:\1 -->/g; // global: use it with replace or matchAll, not test
export const MAX_RUN_LINES = 14; // the animation's CSS has timing for this many lines
const VIDEO_ID = /^[\w-]{11}$/;

const DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/></svg>';

const CODE_WORDS = new Set(['import', 'from', 'await', 'async', 'const', 'let', 'return']);

/** One line of source as coloured pieces: words that are code keywords, strings, and names that are called. Spaces are kept. */
export function codeSegs(line) {
  const out = [];
  for (const m of line.matchAll(/('(?:[^'\\]|\\.)*')|([A-Za-z_]\w*)(?=\()|([A-Za-z_]\w*)|(\s+|[^\sA-Za-z_']+)/g)) {
    if (m[1]) out.push(['st', m[1]]);
    else if (m[2]) out.push(['fn', m[2]]);
    else if (m[3]) out.push([CODE_WORDS.has(m[3]) ? 'kw' : '', m[3]]);
    else out.push(['', m[4]]);
  }
  return out;
}

function need(cond, message) {
  if (!cond) throw new Error(`site component: ${message}`);
}

const text = (v, what) => { need(typeof v === 'string' && v.trim(), `${what} must be some text`); return v; };
const percent = (v, what) => { need(Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100, `${what} must be a number from 0 to 100`); return Number(v); };
let instances = 0; // radio groups need names that differ from one piece to the next on the same page

const downloadButton = (label, href) => `<a class="dl" href="${esc(href)}" download>${DOWNLOAD_ICON}${esc(label)}</a>`;

/** A window like VS Code with a Copilot Chat prompt, then lines that appear one after another and bars that fill. */
function run(d) {
  need(d.tab && d.chat && Array.isArray(d.lines) && d.alt, 'a run needs tab, chat, alt and lines');
  need(d.lines.length + 1 <= MAX_RUN_LINES, `a run has at most ${MAX_RUN_LINES - 1} lines besides the prompt`);
  const lines = d.lines.map((line) => {
    need(typeof line.code === 'string' || (Array.isArray(line.segs) && line.segs.length), 'every line of a run needs segs or code');
    const pieces = typeof line.code === 'string' ? codeSegs(line.code) : line.segs;
    const segs = pieces.map(([cls, text]) => (cls ? `<span class="${esc(cls)}">${esc(text)}</span>` : esc(text))).join('');
    const bar = line.bar ? ` <span class="b ${esc(line.bar.c ?? '')}"><i style="--w:${percent(line.bar.w, 'a bar width')}%"></i></span>` : '';
    const cls = [typeof line.code === 'string' ? 'code' : '', line.cls ?? ''].filter(Boolean).join(' ');
    return `<div class="l${cls ? ` ${esc(cls)}` : ''}">${segs}${bar}</div>`;
  }).join('\n');
  return `<div class="run" role="img" aria-label="${esc(d.alt)}"><div class="bar"><span class="tab">${esc(d.tab)}</span><span>Copilot Chat</span></div><div class="body">\n<div class="l chat"><b>COPILOT CHAT</b>${esc(d.chat)}</div>\n${lines}\n</div></div>`;
}

function videoHtml(day) {
  if (day.video) {
    need(VIDEO_ID.test(day.video), `day ${day.n}: ${day.video} is not a video ID`);
    return `<div class="vid" data-id="${day.video}"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/${day.video}/hqdefault.jpg"><button type="button" aria-label="Play the video for day ${day.n}"></button></div>`;
  }
  if (day.link) {
    need(/^https:\/\//.test(day.link), `day ${day.n}: the link must be https`);
    return `<a class="vid card" href="${esc(day.link)}"><div><b>${esc(day.title)}</b><span>Open the course on ${esc(day.source)} (subscription needed)</span></div></a>`;
  }
  return '<div class="vid card hands"><div><b>Hands-on, no video</b><span>Do it yourself</span></div></div>';
}

/** Ten days as tiles in two weeks; picking one shows its goal, time, source and video. */
function schedule(d) {
  need(Array.isArray(d.days) && d.days.length && Array.isArray(d.weeks), 'a schedule needs weeks and days');
  for (const x of d.days) { need(Number.isInteger(x.n), 'every day needs a number n'); text(x.title, `day ${x.n}: title`); }
  const byN = new Map(d.days.map((x) => [x.n, x]));
  const weeks = d.weeks.map((w) => {
    const tiles = w.days.map((n) => {
      const day = byN.get(n);
      need(day, `week "${w.title}" names day ${n}, which has no entry`);
      const hands = !day.video && !day.link;
      return `<button type="button" class="tile${hands ? ' hands' : ''}" data-day="${n}" aria-pressed="false"><b>Day ${n}</b>${esc(day.title)}</button>`;
    }).join('');
    return `<div class="wk">${esc(w.title)}</div><div class="row5">${tiles}</div>`;
  }).join('\n');
  const panels = d.days.map((day) => `<div class="panel" data-for="${day.n}" hidden><div><div class="ptitle">Day ${day.n}: ${esc(day.title)}</div><div>${esc(text(day.goal, `day ${day.n}: goal`))}</div><div class="meta"><span>${esc(text(day.time, `day ${day.n}: time`))}</span><span class="srcchip">${esc(text(day.source, `day ${day.n}: source`))}</span></div></div>${videoHtml(day)}</div>`).join('\n');
  const dl = d.download ? `\n${downloadButton(d.download.label, d.download.href)}` : '';
  return `<div class="pick" data-site="schedule" data-first="${d.days[0].n}">\n${weeks}\n${panels}\n</div>${dl}`;
}

/** One question at a time with the right answer and a reason shown after each pick, then a score. */
function quiz(d) {
  need(Array.isArray(d.questions) && d.questions.length, 'a quiz needs questions');
  need(d.passMessage && d.failMessage, 'a quiz needs passMessage and failMessage');
  const items = d.questions.map((q, i) => {
    text(q.q, `question ${i + 1}`); text(q.why, `question ${i + 1}: why`);
    need(Array.isArray(q.options) && q.options.length > 1, `question ${i + 1}: it needs at least two options`);
    need(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `question ${i + 1}: the answer is not one of the options`);
    const opts = q.options.map((o) => `<button type="button" class="o">${esc(o)}</button>`).join('');
    return `<div class="qitem" data-answer="${q.answer}" hidden><p>${i + 1}. ${esc(q.q)}</p><div class="opts">${opts}</div><div class="why">${esc(q.why)}</div></div>`;
  }).join('\n');
  return `<div class="qz" data-site="quiz" data-pass="${Number(d.pass ?? 8)}" data-pass-message="${esc(d.passMessage)}" data-fail-message="${esc(d.failMessage)}">\n<div class="top"><span class="qn"></span><span class="qs"></span></div><div class="bar2"><i></i></div>\n${items}\n<div class="qend" hidden><p></p><button type="button" class="nx again">Start again</button></div>\n<button type="button" class="nx next" hidden>Next question</button>\n</div>`;
}

/** A form to look at and print: a rating grid and two written questions. It sends nothing. */
function feedback(d) {
  need(Array.isArray(d.statements) && Array.isArray(d.questions) && d.questions.length === 2, 'feedback needs statements and two questions');
  const group = `fb${++instances}`;
  const head = [1, 2, 3, 4, 5].map((n) => `<th>${n}</th>`).join('');
  const rows = d.statements.map((t, i) => `<tr><td>${esc(t)}</td>${[1, 2, 3, 4, 5].map((n) => `<td><label class="rd"><input type="radio" name="${group}-${i}" aria-label="${n}"></label></td>`).join('')}</tr>`).join('');
  const qs = d.questions.map((q) => `<label>${esc(q)}<textarea></textarea></label>`).join('');
  return `<table class="fbt"><tr><th>${esc(d.scale ?? '1 = disagree, 5 = agree')}</th>${head}</tr>${rows}</table><div class="fbq">${qs}</div><p class="fbnote">${esc(d.note ?? 'A form to look at: it sends nothing. Print it or copy the questions into your own survey tool.')}</p>`;
}

const KINDS = {
  o: ['FOLDER', 'A drawer that holds other things'],
  c: ['FOLDER', 'A drawer that holds other things'],
  yml: ['YAML FILE', 'A plain list of settings and steps'],
  ts: ['TYPESCRIPT FILE', 'Code a computer can run'],
};
const isFolder = (k) => k === 'o' || k === 'c';

/** A folder tree on the left and, for the picked row, a plain-words note on the right. It tours itself until clicked. */
function tree(d) {
  need(Array.isArray(d.nodes) && d.nodes.length, 'a tree needs nodes');
  const parents = [];
  let last = -1;
  const nodes = d.nodes.map((n) => {
    need(Number.isInteger(n.depth) && n.depth >= 0 && n.depth <= last + 1, `${n.name}: depth must follow its parent's`);
    last = n.depth;
    for (const k of ['name', 'title', 'text', 'like']) text(n[k], `a tree node's ${k}`);
    need(KINDS[n.kind], `${n.name}: kind must be one of ${Object.keys(KINDS).join(', ')}`);
    parents[n.depth] = n.name;
    return { ...n, path: parents.slice(0, n.depth + 1).join(' / ') };
  });
  const rows = nodes.map((n, i) => {
    const icon = isFolder(n.kind) ? `<span class="c">${n.kind === 'c' ? '&#9656;' : '&#9662;'}</span><span class="f"></span>` : `<span class="ic ${n.kind}">${n.kind.toUpperCase()}</span>`;
    return `<button type="button" class="tr k-${n.kind}" style="--d:${Number(n.depth)}" data-i="${i}">${icon}<span class="nm">${esc(n.name)}</span></button>`;
  }).join('');
  const data = esc(JSON.stringify(nodes.map((n) => [n.kind, n.path, n.title, n.text, n.like, n.inside ?? ''])));
  return `<div class="tw" data-site="tree" data-nodes="${data}"><div class="ex"><div class="hd"><span>EXPLORER</span></div><div class="rows">${rows}</div></div><div class="info"></div></div>`;
}

/** Download cards: a title, one line and a button. */
function downloads(d) {
  need(Array.isArray(d) && d.length, 'downloads needs a list');
  for (const c of d) { text(c.title, 'a download title'); text(c.line, 'a download line'); text(c.href, 'a download href'); }
  return `<div class="sheets">${d.map((c) => `<div class="sheet"><b>${esc(c.title)}</b><p>${esc(c.line)}</p>${downloadButton('Download', c.href)}</div>`).join('')}</div>`;
}

/** The title line of a piece that can be replayed; the button is shown by the script, only when the piece animates. */
const pieceHead = (title) => `<div class="pc-head"><span>${esc(title)}</span><button type="button" class="rp" hidden>Replay</button></div>`;

/** A time split as one bar that fills segment by segment, a plain line for each, then the summary that closes the rule. */
function timebar(d) {
  need(d.alt && d.title && Array.isArray(d.segments) && d.segments.length, 'a timebar needs alt, title and segments');
  need(Number.isFinite(d.total) && d.total > 0 && d.unit, 'a timebar needs a total and a unit');
  need(d.summary && Array.isArray(d.summary.lines) && d.summary.lines.length, 'a timebar needs a summary with lines');
  const sum = d.segments.reduce((t, s) => t + percent(s.share, 'a segment share'), 0);
  need(Math.abs(sum - 100) < 0.01, `the shares add up to ${sum}, not 100`);
  const amounts = d.segments.reduce((t, s) => t + Number(s.amount), 0);
  need(Math.abs(amounts - d.total) < 0.1, `the amounts add up to ${amounts} ${d.unit}, not ${d.total}`);
  const parts = d.segments.map((s, i) => {
    text(s.name, 'a segment name'); text(s.line, `segment ${s.name}: line`);
    need(Math.abs(Number(s.amount) - (d.total * s.share) / 100) < 0.05, `segment ${s.name}: ${s.amount} ${d.unit} is not ${s.share}% of ${d.total}`);
    return { bar: `<i class="s${i + 1}" style="--w:${s.share}%;--i:${i}">${s.share}%</i>`, row: `<li style="--i:${i}"><b>${esc(s.name)}</b><span>${s.share}% &middot; ${s.amount} ${esc(d.unit)}</span><p>${esc(s.line)}</p></li>` };
  });
  const lines = d.summary.lines.map(([k, v]) => `<dt>${esc(text(k, 'a summary label'))}</dt><dd>${esc(text(v, 'a summary line'))}</dd>`).join('');
  return `<div class="pc tb" data-site="timebar" role="group" aria-label="${esc(d.alt)}">
${pieceHead(d.title)}
<div class="tb-bar" aria-hidden="true">${parts.map((p) => p.bar).join('')}</div>
<ol class="tb-rows">${parts.map((p) => p.row).join('')}</ol>
<div class="tb-sum" style="--i:${d.segments.length}"><b>${esc(d.summary.title)}</b><dl>${lines}</dl>${d.summary.note ? `<small>${esc(d.summary.note)}</small>` : ''}</div>
</div>`;
}

const TONES = ['blue', 'amber', 'green', 'red', 'purple', 'grey']; // one palette, used the same way everywhere: blue starts, amber checks, green is done, red is blocked, purple hands over, grey is left out

/** The test-scope decision as three stages (what happened, the check, what runs); picking a case sends a token down its path and lights each stage in turn, in the colour of what the stage is. */
function scope(d) {
  need(d.alt && Array.isArray(d.events) && d.events.length && d.check && Array.isArray(d.outcomes) && d.outcomes.length && Array.isArray(d.scenarios) && d.scenarios.length, 'a scope needs alt, events, check, outcomes and scenarios');
  const ids = (list) => new Set(list.map((x) => text(x.id, 'a node id')));
  const events = ids(d.events), outcomes = ids(d.outcomes);
  for (const s of d.scenarios) {
    text(s.label, 'a scenario label'); text(s.why, `scenario ${s.label}: why`);
    need(events.has(s.event), `scenario ${s.label}: event ${s.event} is not one of the events`);
    need(outcomes.has(s.outcome), `scenario ${s.label}: outcome ${s.outcome} is not one of the outcomes`);
    need(s.check === undefined || s.check === 'yes' || s.check === 'no', `scenario ${s.label}: check must be yes or no`);
  }
  const first = d.scenarios[0];
  const lit = (on) => (on ? ' lit' : '');
  const buttons = d.scenarios.map((s, i) => `<button type="button" aria-pressed="${i === 0}"${i === 0 ? ' class="on"' : ''}>${esc(s.label)}</button>`).join('');
  const evNodes = d.events.map((e) => `<div class="nd ev${lit(e.id === first.event)}" data-e="${esc(e.id)}">${esc(text(e.text, 'an event'))}</div>`).join('');
  const answers = ['yes', 'no'].map((a) => `<span class="ans${lit(first.check === a)}" data-a="${a}">${a}</span>`).join('');
  const check = `<div class="nd chk${lit(first.check !== undefined)}" data-c><span>${esc(text(d.check.text, 'the check'))}</span><span class="answers">${answers}</span><em class="skip">${esc(d.check.skipped ?? 'Not asked for this one')}</em></div>`;
  for (const o of d.outcomes) need(o.tone === undefined || TONES.includes(o.tone), `outcome ${o.id}: tone must be one of ${TONES.join(', ')}`);
  const toneOf = (o) => o.tone ?? 'purple';
  const outNodes = d.outcomes.map((o) => `<div class="nd out t-${toneOf(o)}${lit(o.id === first.outcome)}" data-o="${esc(o.id)}"><b>${esc(text(o.text, 'an outcome'))}</b><span>${esc(text(o.detail, 'an outcome detail'))}</span></div>`).join('');
  const data = esc(JSON.stringify(d.scenarios.map((s) => [s.event, s.check ?? '', s.outcome, s.why])));
  const firstTone = toneOf(d.outcomes.find((o) => o.id === first.outcome));
  return `<div class="pc sc st3" style="--l2:var(--${firstTone})" data-site="scope" data-scenarios="${data}" role="group" aria-label="${esc(d.alt)}">
<div class="sc-pick">${buttons}</div>
<div class="sc-map"><div class="sc-col"><h5>What happens</h5>${evNodes}</div><div class="sc-col"><h5>The check</h5>${check}</div><div class="sc-col"><h5>What runs</h5>${outNodes}</div><i class="sc-token" aria-hidden="true"></i></div>
<p class="sc-why">${esc(first.why)}</p>${d.asOf ? `<small class="pc-note">${esc(d.asOf)}</small>` : ''}
</div>`;
}

/** A funnel: a bar for each stage, narrowing in proportion, with the change that led to it and a count that ticks down. */
function funnel(d) {
  need(d.alt && d.title && Array.isArray(d.stages) && d.stages.length > 1, 'a funnel needs alt, title and stages');
  const top = Number(d.stages[0].value);
  need(top > 0, 'the first stage needs a value above 0');
  let previous = top;
  const rows = d.stages.map((s, i) => {
    text(s.label, 'a stage label');
    need(Number.isInteger(s.value) && s.value >= 0, `stage ${s.label}: value must be a whole number`);
    if (s.delta !== undefined) need(previous + s.delta === s.value, `stage ${s.label}: ${previous} ${s.delta >= 0 ? '+' : '-'} ${Math.abs(s.delta)} is not ${s.value}`);
    previous = s.value;
    const width = Math.max((s.value / top) * 100, 3).toFixed(1);
    const step = i === 0 ? '' : `<div class="fn-step" style="--i:${i}">${esc(text(s.step, `stage ${s.label}: step`))}</div>`;
    const note = s.note ? `<small>${esc(s.note)}</small>` : '';
    return `${step}<div class="fn-row${s.mark ? ' mark' : ''}" style="--w:${width}%;--i:${i}"><div class="fn-bar"><i></i></div><div class="fn-txt"><b class="n" data-to="${s.value}">${s.value}</b> <span>${esc(s.label)}</span>${note}</div></div>`;
  }).join('\n');
  return `<div class="pc fn" data-site="funnel" data-from="${top}" role="group" aria-label="${esc(d.alt)}">
${pieceHead(d.title)}
${rows}
${d.asOf ? `<small class="pc-note">${esc(d.asOf)}</small>` : ''}
</div>`;
}

const RENDERERS = {
  run: (d) => run(d),
  schedule: (d) => schedule(d),
  quiz: (d) => quiz(d),
  feedback: (d) => feedback(d),
  tree: (d) => tree(d),
  downloads: (d) => downloads(d),
  timebar: (d) => timebar(d),
  scope: (d) => scope(d),
  funnel: (d) => funnel(d),
  download: (d) => downloadButton(d.label, d.href),
};

/** Swaps every site block in rendered HTML for its piece. `data` is the card's `components`. */
export function applyComponents(html, data = {}) {
  return html.replace(COMPONENT_BLOCK, (whole, kind, id) => {
    if (kind === 'fold') return whole; // the long version is folded in by build.mjs, which reads the card's full file
    const render = RENDERERS[kind];
    need(render, `unknown piece "${kind}"`);
    const part = kind === 'run' ? data.runs?.[id] : data[kind];
    need(part, `no data for ${kind}${id ? ` "${id}"` : ''} in the card's components`);
    return render(part);
  });
}

/** The Markdown with every site block's plain version in place, as GitHub shows it (for word counts and checks). */
export function plainMarkdown(markdown) {
  return markdown.replace(/<!-- site:[a-z-]+(?: [\w-]+)? -->/g, '').replace(/<!-- \/site:[a-z-]+ -->/g, '');
}

export const COMPONENT_SCRIPT = `(function(){
var KINDS=${JSON.stringify(KINDS)};
function each(sel,fn){[].forEach.call(document.querySelectorAll(sel),fn)}
each('[data-site="schedule"]',function(root){
  var tiles=root.querySelectorAll('.tile'),panels=root.querySelectorAll('.panel');
  function show(n){tiles.forEach(function(t){var on=t.getAttribute('data-day')===n;t.classList.toggle('on',on);t.setAttribute('aria-pressed',on)});panels.forEach(function(p){p.hidden=p.getAttribute('data-for')!==n})}
  root.addEventListener('click',function(e){
    var t=e.target.closest('.tile');if(t){show(t.getAttribute('data-day'));return}
    var v=e.target.closest('.vid[data-id]');if(v&&e.target.closest('button')){v.innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+v.getAttribute('data-id')+'?autoplay=1" title="Video" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'}
  });
  show(root.getAttribute('data-first'));
});
each('[data-site="quiz"]',function(root){
  var items=[].slice.call(root.querySelectorAll('.qitem')),i=0,score=0,done=false;
  var next=root.querySelector('.next'),end=root.querySelector('.qend'),bar=root.querySelector('.bar2 i'),pass=+root.getAttribute('data-pass');
  function draw(){
    if(i>=items.length){items.forEach(function(x){x.hidden=true});next.hidden=true;end.hidden=false;bar.style.width='100%';root.querySelector('.qn').textContent='Done';end.querySelector('p').textContent='Score: '+score+' of '+items.length+'. '+root.getAttribute(score>=pass?'data-pass-message':'data-fail-message');return}
    end.hidden=true;done=false;next.hidden=true;next.textContent=i===items.length-1?'See score':'Next question';
    items.forEach(function(x,k){x.hidden=k!==i;if(k===i){x.querySelectorAll('.o').forEach(function(o){o.className='o'});x.classList.remove('done')}});
    root.querySelector('.qn').textContent='Question '+(i+1)+' of '+items.length;root.querySelector('.qs').textContent=score+' correct';bar.style.width=(i*100/items.length)+'%';
  }
  root.addEventListener('click',function(e){
    var o=e.target.closest('.o');
    if(o&&!done){done=true;var it=o.closest('.qitem'),opts=[].slice.call(it.querySelectorAll('.o')),right=+it.getAttribute('data-answer'),pick=opts.indexOf(o);
      if(pick===right){score++;o.classList.add('right')}else{o.classList.add('wrong');opts[right].classList.add('right')}
      it.classList.add('done');root.querySelector('.qs').textContent=score+' correct';next.hidden=false;return}
    if(e.target.closest('.next')){i++;draw();return}
    if(e.target.closest('.again')){i=0;score=0;draw()}
  });
  draw();
});
each('[data-site="tree"]',function(root){
  var nodes=JSON.parse(root.getAttribute('data-nodes')),info=root.querySelector('.info'),rows=root.querySelectorAll('.tr'),cur=0,timer=null;
  var kinds=KINDS;
  var auto=!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
  function sel(i){cur=i;var n=nodes[i],k=kinds[n[0]];
    rows.forEach(function(r,j){r.classList.toggle('on',j===i)});
    info.className='info k-'+n[0];
    info.innerHTML='<div class="kind">'+k[0]+'</div><div class="what">'+k[1]+'</div><div class="path">'+esc(n[1])+'</div><div class="ttitle">'+esc(n[2])+'</div><p>'+esc(n[3])+'</p><p class="like">'+esc(n[4])+'</p>'+(n[5]?'<div class="inside">'+esc(n[5])+'</div>':'')+'<div class="nav"><span>'+(i+1)+' of '+nodes.length+(timer?' \\u00b7 touring':'')+'</span><button type="button" data-next>Next</button></div>';}
  function stop(){if(timer){clearInterval(timer);timer=null}}
  root.addEventListener('click',function(e){var r=e.target.closest('.tr');if(r){stop();sel(+r.getAttribute('data-i'));return}if(e.target.closest('[data-next]')){stop();sel((cur+1)%nodes.length)}});
  if(auto){timer=setInterval(function(){sel((cur+1)%nodes.length)},4500)}
  sel(0);
});
function motion(){return !(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)&&'IntersectionObserver' in window}
function replayable(root,start){
  var b=root.querySelector('.rp');
  function play(){start(true);root.classList.add('rewind');void root.offsetWidth;root.classList.remove('rewind');start(false)}
  if(!motion())return;
  b.hidden=false;b.addEventListener('click',play);
  try{
    var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();root.classList.remove('rewind');start(false)}},{rootMargin:'0px 0px -20% 0px'});
    root.classList.add('rewind');start(true);io.observe(root);
  }catch(e){root.classList.remove('rewind');start(false)}
}
each('[data-site="timebar"]',function(root){replayable(root,function(){})});
each('[data-site="funnel"]',function(root){
  var ns=[].slice.call(root.querySelectorAll('.n')),from=+root.getAttribute('data-from'),timers=[],gen=0;
  replayable(root,function(reset){
    timers.forEach(clearTimeout);timers=[];gen++;
    if(reset){ns.forEach(function(n){n.textContent=from});return}
    ns.forEach(function(n,i){var to=+n.getAttribute('data-to'),t0=null,mine=gen;
      timers.push(setTimeout(function(){requestAnimationFrame(function step(t){if(t0===null)t0=t;if(mine!==gen)return;var k=Math.min((t-t0)/900,1);n.textContent=Math.round(from+(to-from)*(1-Math.pow(1-k,3)));if(k<1&&mine===gen)requestAnimationFrame(step)})},i*450))});
  });
});
each('[data-site="scope"]',function(root){
  var sc=JSON.parse(root.getAttribute('data-scenarios')),btns=root.querySelectorAll('.sc-pick button'),why=root.querySelector('.sc-why'),map=root.querySelector('.sc-map'),tk=root.querySelector('.sc-token'),chk=root.querySelector('[data-c]'),timers=[],calm=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  function node(attr,v){return root.querySelector('['+attr+'="'+v+'"]')}
  function tone(n){return getComputedStyle(n).getPropertyValue('--tone').trim()}
  function put(n,color,instant){var m=map.getBoundingClientRect(),r=n.getBoundingClientRect();
    if(instant)tk.style.transition='none';
    tk.style.left=(r.left-m.left+r.width/2)+'px';tk.style.top=(r.top-m.top+r.height/2)+'px';tk.style.setProperty('--tk',color);tk.classList.add('on');
    if(instant){void tk.offsetWidth;tk.style.transition=''}}
  function clear(){timers.forEach(clearTimeout);timers=[];root.classList.remove('st2','st3');root.querySelectorAll('.lit').forEach(function(n){n.classList.remove('lit')});tk.classList.remove('on')}
  function at(ms,f){timers.push(setTimeout(f,ms))}
  function pick(i){var s=sc[i],ev=node('data-e',s[0]),out=node('data-o',s[2]),ans=s[1]!==''?node('data-a',s[1]):null;
    btns.forEach(function(b,k){b.classList.toggle('on',k===i);b.setAttribute('aria-pressed',k===i)});
    clear();
    function showCheck(){root.classList.add('st2');if(ans){chk.classList.add('lit');ans.classList.add('lit')}}
    function showOut(){root.style.setProperty('--l2',tone(out));root.classList.add('st3');out.classList.add('lit');why.textContent=s[3]}
    if(calm){ev.classList.add('lit');showCheck();showOut();return}
    why.textContent='';ev.classList.add('lit');put(ev,tone(ev),true);
    if(ans){at(450,function(){put(chk,tone(chk))});at(850,showCheck);at(1350,function(){put(out,tone(out))});at(1750,showOut)}
    else{at(450,function(){put(out,tone(out))});at(850,function(){showCheck();showOut()})}
    at(2300,function(){tk.classList.remove('on')});}
  btns.forEach(function(b,i){b.addEventListener('click',function(){pick(i)})});
  if(!calm&&'IntersectionObserver' in window){try{var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();pick(0)}},{rootMargin:'0px 0px -20% 0px'});io.observe(root)}catch(e){}}
});
})();`;
