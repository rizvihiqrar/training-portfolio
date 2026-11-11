// Makes the preview image for each card: a title card drawn from the card's own text and the site's design tokens.
//   npm run previews        (run after a card's title, tags or summary changes, then commit the images)
// Needs Playwright's Chromium once: npx playwright install chromium
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { escapeHtml, repoRoot, previewKey } from './build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(here, 'site.json'), 'utf8'));
const { chromium } = await import('playwright');

const css = fs.readFileSync(path.join(here, 'site.css'), 'utf8').split('/* Header */')[0];

function cardHtml(c) {
  return `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap"><style>${css}
body { margin: 0; width: 1200px; height: 630px; background: var(--surface-2); display: flex; flex-direction: column; justify-content: space-between; padding: 64px 72px; box-sizing: border-box; }
.top { display: flex; align-items: center; gap: 16px; }
.mark { width: 14px; height: 14px; border-radius: 50%; background: var(--accent); }
.kind { font-size: 28px; font-weight: 500; color: var(--text-3); }
h1 { font-size: 76px; line-height: 1.12; margin: 0; max-width: 1000px; color: var(--text); font-weight: 600; }
.tags { display: flex; gap: 12px; flex-wrap: wrap; }
.tag { font-size: 26px; padding: 6px 22px; border-radius: 999px; background: var(--surface); border: 1px solid var(--border-strong); color: var(--text); }
.site { font-size: 26px; color: var(--text-3); margin-top: 28px; }
</style></head><body>
<div class="top"><span class="mark"></span><span class="kind">${escapeHtml(c.label)}</span></div>
<h1>${escapeHtml(c.title)}</h1>
<div><div class="tags">${c.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div><div class="site">${escapeHtml(config.name)}</div></div>
</body></html>`;
}

const manifest = {};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const card of config.cards.filter((c) => c.image)) {
  await page.setContent(cardHtml(card), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const target = path.join(repoRoot, card.image);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target });
  manifest[card.image] = previewKey(card, config.name);
  console.log('wrote', card.image);
}
await browser.close();
fs.writeFileSync(path.join(repoRoot, 'docs/assets/previews/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
