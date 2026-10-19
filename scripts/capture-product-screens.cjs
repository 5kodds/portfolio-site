/* Capture authentic product screens for the portfolio.
   Runs in GitHub Actions, saving source images as local repo assets. */
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const out = path.resolve('portfolio/media');
const results = {};
(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    async function openPage(url, opts = {}) {
      const page = await browser.newPage({ viewport: { width: 1500, height: 980 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 65000 });
      await page.waitForTimeout(opts.wait || 3000);
      return page;
    }
    async function save(page, file, fullPage = false) {
      await page.screenshot({ path: path.join(out, file), fullPage, animations: 'disabled' });
      results[file] = true;
      console.log('Saved', file);
    }
    // Vuvu's live marketing site.
    try {
      const page = await openPage('https://vuvu.ng/', { wait: 5000 });
      await save(page, 'vuvu-website.png');
      await page.close();
    } catch (e) { console.log('Vuvu website capture unavailable:', e.message); }
    // The public App Store listing is used strictly as an authentic source for app UI.
    try {
      const page = await openPage('https://apps.apple.com/ng/app/vuvu/id6738325760', { wait: 5000 });
      // Apple supplies the original high-resolution screenshots through its public iTunes Lookup API.
      let appScreens = [];
      for (const country of ['ng', 'us']) {
        try {
          const resp = await page.request.get('https://itunes.apple.com/lookup?id=6738325760&country=' + country, { timeout: 25000 });
          if (!resp.ok()) { console.log('iTunes lookup HTTP:', resp.status()); continue; }
          const data = await resp.json();
          const app = (data.results || [])[0];
          appScreens = [...(app?.screenshotUrls || []), ...(app?.ipadScreenshotUrls || [])];
          console.log('Official iTunes screenshots:', country, appScreens.length);
          if (appScreens.length) break;
        } catch (e) { console.log('iTunes lookup unavailable:', e.message); }
      }
      let official = 0;
      for (const sourceUrl of appScreens.slice(0, 3)) {
        try {
          const resp = await page.request.get(sourceUrl, { timeout: 30000 });
          if (!resp.ok()) continue;
          const mime = resp.headers()['content-type'] || 'image/jpeg';
          const bytes = await resp.body();
          const imagePage = await browser.newPage({ viewport: { width: 700, height: 1300 }, deviceScaleFactor: 2 });
          await imagePage.setContent('<style>body{margin:0;background:#f1ede6;display:flex;justify-content:center}img{display:block;max-width:700px;max-height:1300px;object-fit:contain}</style><img src="data:' + mime + ';base64,' + bytes.toString('base64') + '">');
          await imagePage.waitForFunction(() => document.querySelector('img').naturalWidth > 240);
          const filename = 'vuvu-app-' + String(official + 1).padStart(2, '0') + '.png';
          await imagePage.locator('img').screenshot({ path: path.join(out, filename), animations: 'disabled' });
          results[filename] = true;
          official++;
          await imagePage.close();
        } catch(e) { console.log('Individual iTunes screenshot unavailable:', e.message); }
      }
      const matches = await page.locator('img').evaluateAll(images => images
        .filter(el => el.complete && el.naturalWidth > 240 && el.naturalHeight > 420 && el.naturalHeight > el.naturalWidth * 1.35)
        .map(el => ({ src: el.currentSrc || el.src, w: el.naturalWidth, h: el.naturalHeight })));
      console.log('Portrait image candidates from App Store:', matches.length, JSON.stringify(matches.slice(0, 5)));
      let count = 0;
      for (const data of matches) {
        if (count >= 3) break;
        const locator = page.locator('img').filter({ visible: true });
        const images = await locator.all();
        for (const img of images) {
          const src = await img.evaluate(el => el.currentSrc || el.src).catch(() => '');
          if (src !== data.src) continue;
          const filename = 'vuvu-app-' + String(count + 1).padStart(2, '0') + '.png';
          await img.screenshot({ path: path.join(out, filename), animations: 'disabled' });
          results[filename] = true;
          count++;
          break;
        }
      }
      await page.close();
    } catch (e) { console.log('App Store capture unavailable:', e.message); }
    // Parfum Agente live interface: home, questionnaire and recommendation result.
    try {
      const page = await openPage('https://5kodds.github.io/parfum-agente/', { wait: 4500 });
      await page.locator('#app .hero').waitFor({ timeout: 15000 });
      await save(page, 'parfum-home.png');
      await page.getByRole('button', { name: /Discover my Scent DNA/i }).click();
      await page.locator('.choice').first().waitFor({ timeout: 10000 });
      await save(page, 'parfum-quiz.png');
      for (let i = 0; i < 12; i++) {
        await page.locator('.choice').first().click({ timeout: 10000 });
      }
      await page.locator('.result-header').waitFor({ timeout: 15000 });
      await page.waitForTimeout(700);
      await save(page, 'parfum-results.png');
      await page.close();
    } catch (e) { console.log('Parfum Agente capture unavailable:', e.message); }
    if (!Object.keys(results).length) throw Error('No product screenshot could be captured.');
    console.log('Captured files:', Object.keys(results).join(', '));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
