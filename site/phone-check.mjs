// Opens every built page at phone widths (360 and 390 px) in Chromium and Firefox and fails on sideways page scroll,
// anything sticking out of the screen (outside a box that scrolls), or a button under 40 px.
//   npm run build && npm run phone        (needs Playwright's browsers once: npx playwright install chromium firefox)
// CI has no browser, so phone.test.mjs pins the CSS rules this check proved out.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium, firefox } = await import('playwright');
const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '_site');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(siteRoot, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(siteRoot) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const base = `http://localhost:${server.address().port}/`;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.relative(siteRoot, path.join(d, e.name)).split(path.sep).join('/')] : []));
const pages = walk(siteRoot);
const widths = [360, 390];
let bad = 0;
for (const [name, type] of [['chromium', chromium], ['firefox', firefox]]) {
  const browser = await type.launch();
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, hasTouch: true, isMobile: name === 'chromium' });
    for (const p of pages) {
      const page = await ctx.newPage();
      await page.goto(base + p);
      await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
      await page.waitForTimeout(400);
      const r = await page.evaluate((w) => {
        const out = { scroll: document.documentElement.scrollWidth, wide: [], small: [] };
        const inScroller = (el) => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if ((o === 'auto' || o === 'scroll') && n.scrollWidth > n.clientWidth) return true; } return false; };
        for (const el of document.body.querySelectorAll('*')) {
          const b = el.getBoundingClientRect();
          if (!b.width || !b.height || getComputedStyle(el).visibility === 'hidden') continue;
          if (b.right > w + 1 && !inScroller(el) && !el.closest('[hidden]')) out.wide.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} right=${Math.round(b.right)}`);
        }
        for (const el of document.querySelectorAll('button, summary, a.icon-btn, a.dl, .tile, button.o, .tr, .fbt .rd')) {
          const b = el.getBoundingClientRect();
          if (b.width && b.height && !el.closest('[hidden]') && el.closest('.panel,.pick,.qz,.tw,.pc,.fold,.topbar,.sheet,.run,main,.col') && (b.height < 40 || b.width < 40) && getComputedStyle(el).display !== 'none') out.small.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 20)} ${Math.round(b.width)}x${Math.round(b.height)} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}"`);
        }
        return out;
      }, w);
      const sideways = r.scroll > w;
      if (sideways || r.wide.length || r.small.length) bad++;
      console.log(`${name} ${w} ${p}: scrollWidth ${r.scroll}${sideways ? ' SIDEWAYS' : ''}; sticking out ${r.wide.length}${r.wide.length ? ' [' + [...new Set(r.wide)].slice(0, 6).join('; ') + ']' : ''}; small taps ${r.small.length}${r.small.length ? ' [' + [...new Set(r.small)].slice(0, 8).join('; ') + ']' : ''}`);
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
}
console.log(bad ? `${bad} page checks with problems` : 'all clean');
server.close();
process.exit(bad ? 1 : 0);
