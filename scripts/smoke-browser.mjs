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
  for (const nativeMode of [false, true]) for (const width of [360, 390, 768, 1360]) {
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
    await page.locator('#dockInput').fill('14:00 빠른 입력 검사');
    await page.locator('.dock-submit').click();
    await page.getByText('빠른 입력 검사', { exact: true }).waitFor();
    await page.locator('#views [data-view=inbox]').click();
    await page.locator('#quickCategories > [data-category=reading]').click();
    await page.locator('#dockInput').fill('독서 보관 카드');
    await page.locator('.dock-submit').click();
    await page.locator('[data-edit]').filter({hasText:'수정 · 날짜 정하기'}).click();
    await page.locator('[data-detail=content]').fill('책에서 읽은 내용');
    await page.locator('[data-detail=reflection]').fill('나의 생각은 오래 남는다');
    if(width === 390 && !nativeMode) await page.screenshot({path:'.tools/screenshots/reading-form-390.png'});
    await page.locator('#editCategories [data-category=exercise]').click();
    await page.locator('[data-detail=result]').fill('걷기 30분');
    await page.locator('#editCategories [data-category=reading]').click();
    assert.equal(await page.locator('[data-detail=reflection]').inputValue(),'나의 생각은 오래 남는다');
    await page.locator('#editDlg button[type=submit]').click();
    await page.waitForTimeout(250);
    await page.reload();
    assert.equal(await page.getByText('독서 보관 카드',{exact:true}).count(),0);
    await page.locator('#views [data-view=inbox]').click();
    await page.locator('[data-edit]').filter({hasText:'수정 · 날짜 정하기'}).click();
    assert.equal(await page.locator('[data-detail=content]').inputValue(),'책에서 읽은 내용');
    await page.locator('input[name=inbox]').uncheck();
    await page.locator('#editDlg button[type=submit]').click();
    assert.equal(await page.locator('.inbox-card').count(),0);
    await page.locator('#views [data-view=day]').click();
    await page.getByText('독서 보관 카드',{exact:true}).waitFor();
    await page.locator('[data-reorder]').click();
    const before=await page.locator('.day-layout > .card .item .tx').allTextContents();
    await page.locator('.order-controls [data-step="-1"]').last().click();
    const after=await page.locator('.day-layout > .card .item .tx').allTextContents();
    assert.notDeepEqual(before,after);
    await page.waitForTimeout(250); await page.reload();
    assert.deepEqual(await page.locator('.day-layout > .card .item .tx').allTextContents(),after);
    for (const view of ['week', 'month', 'stats', 'inbox', 'day']) {
      await page.locator(`#views [data-view=${view}]`).click();
      await page.waitForTimeout(400);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Page overflow ${width}/${view}`);
      const small = await page.locator('button:visible').evaluateAll(buttons => buttons.filter(b => {
        const r = b.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5;
      }).map(b => ({ label: b.getAttribute('aria-label') || b.textContent, cls: b.className, width: b.getBoundingClientRect().width, height: b.getBoundingClientRect().height })));
      assert.deepEqual(small, [], `Touch targets ${width}/${view}`);
    }
    await page.screenshot({ path: `.tools/screenshots/calm-${nativeMode ? 'native' : 'web'}-${width}-light.png` });
    await page.locator('#settingsBtn').click();
    await page.locator('#fontSize').selectOption('large');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.body).fontSize),'19px');
    await page.locator('#fontSize').selectOption('normal');
    if (nativeMode) {
      await page.locator('#exportBtn').click();
      assert.ok(Object.values(await page.evaluate(() => window.exportedBackup.records)).some(r => r.title === '앱 보존 검사'));
      assert.equal(await page.locator('#pushBtn').isEnabled(), true);
      assert.match(await page.locator('#syncText').textContent(), /이 기기에 저장/);
    }
    await page.screenshot({ path: `.tools/screenshots/${nativeMode ? 'native-adapter' : 'web'}-${width}.png` });
    await page.locator('#themeSeg [data-theme=dark]').click();
    await page.locator('#settingsDlg [data-close]').click();
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(20, 21, 23)');
    await page.screenshot({ path: `.tools/screenshots/calm-${nativeMode ? 'native' : 'web'}-${width}-dark.png` });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const animation = await page.locator('.dock-submit').evaluate(b => getComputedStyle(b).transitionDuration);
    assert.ok(animation.split(',').every(s => parseFloat(s) < .001));
    assert.deepEqual(errors, []);
    console.log(`${nativeMode ? 'Native adapter mock' : 'Web'} ${width}px: create/reload/views/settings passed; JS errors 0`);
    await context.close();
  }
} finally { await browser.close(); server.close(); }
