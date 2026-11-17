import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = resolve('.');
const server = createServer(async (req, res) => {
  try {
    const file = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '/index.html'));
    if (!file.startsWith(root + '/')) {
      if (!file.startsWith(root + '\\')) throw new Error('outside root');
    }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
await mkdir('.tools/screenshots', { recursive: true });
try {
  for (const nativeMode of [false, true]) for (const width of [390, 1360]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    if (nativeMode) await page.addInitScript(() => {
      window.plannerNative = {
        granted: true, settings: { morning: '08:00', evening: '21:00' },
        reschedule: async () => {}, saveSettings: async () => {}, enable: async () => {}, ping: async () => {},
        exportBackup: async (text) => { window.exportedBackup = JSON.parse(text); }, share: async () => {},
      };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('#fab').click();
    await page.locator('#editDlg input[name=title]').fill('앱 보존 검사');
    await page.locator('#editDlg button[type=submit]').click();
    await page.waitForTimeout(300);
    await page.reload();
    await page.getByText('앱 보존 검사', { exact: true }).waitFor();
    for (const view of ['week', 'month', 'stats', 'day']) await page.locator(`#views [data-view=${view}]`).click();
    await page.locator('#settingsBtn').click();
    if (nativeMode) {
      await page.locator('#exportBtn').click();
      assert.ok(Object.values(await page.evaluate(() => window.exportedBackup.records)).some(r => r.title === '앱 보존 검사'));
      assert.equal(await page.locator('#pushBtn').isEnabled(), true);
      assert.match(await page.locator('#syncText').textContent(), /휴대폰에 저장/);
    }
    await page.screenshot({ path: `.tools/screenshots/${nativeMode ? 'native-adapter' : 'web'}-${width}.png` });
    assert.deepEqual(errors, []);
    console.log(`${nativeMode ? 'Native adapter mock' : 'Web'} ${width}px: create/reload/views/settings passed; JS errors 0`);
    await context.close();
  }
} finally { await browser.close(); server.close(); }
