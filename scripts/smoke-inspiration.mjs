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
 for(const nativeMode of [false,true]) for(const width of [360,390,768,1360]) {
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}), page=await context.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date(2026,10,17,8));
  if(nativeMode) await page.addInitScript(()=>{
    let enabled=true;
    window.plannerNative={granted:true,settings:{morning:'08:00',evening:'21:00'},reschedule:async()=>{},updateWidget:async()=>{},saveSettings:async()=>{},enable:async()=>{},ping:async()=>{},exportBackup:async text=>{window.testBackup=JSON.parse(text);},share:async()=>{},companion:async options=>{
      window.companionCalls ||= []; window.companionCalls.push(options);if('enabled' in options)enabled=options.enabled;
      return {enabled,state:options.total>0&&options.done>=options.total?'crown':options.done>0?'proud':'happy'};
    }};
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.locator('#nextPiece').waitFor();
  const first=await page.locator('#nextPiece').textContent();
  const texts=new Set([first]);
  for(let i=0;i<12;i++){await page.locator('#nextPiece').click();texts.add(await page.locator('#nextPiece').textContent());}
  assert.equal(texts.size,13);
  const selected=await page.locator('#nextPiece').textContent();
  await page.locator('#inspirationHost [data-piece-save]').click();
  assert.equal(await page.locator('#nextPiece').textContent(),selected);
  assert.equal(await page.locator('#inspirationHost [data-piece-save]').getAttribute('aria-pressed'),'true');
  await page.locator('#advancePiece').click();await page.locator('#pieceSource').click();await page.locator('#previousPiece').click();
  assert.equal(await page.locator('#nextPiece').textContent(),selected);
  await page.waitForTimeout(250);await page.reload();
  assert.equal(await page.locator('#nextPiece').textContent(),selected);
  assert.match(await page.locator('#openInspiration').textContent(),/1/);
  await page.locator('#openInspiration').click();
  assert.equal(await page.locator('.saved-pieces .inspiration-entry').count(),1);
  assert.equal(await page.locator('.saved-pieces p').textContent(),selected);
  assert.equal(await page.locator('.recommended-pieces .inspiration-entry').count(),3);
  const recommended=await page.locator('.recommended-pieces p').first().textContent();
  await page.locator('.recommended-pieces [data-piece-save]').first().click();
  assert.equal(await page.locator('.saved-pieces .inspiration-entry').count(),2);
  assert.ok((await page.locator('.saved-pieces p').allTextContents()).includes(recommended));
  if(width===390) await page.screenshot({path:`.tools/screenshots/inspiration-library-${nativeMode?'native':'web'}.png`});
  await page.locator('.saved-pieces [data-piece-save]').first().click();
  assert.equal(await page.locator('.saved-pieces .inspiration-entry').count(),1);
  await page.locator('#inspirationDlg [data-close]').click();
  await page.locator('#pieceSource').click();
  assert.ok(await page.locator('#pieceDetailBody .piece-source').textContent());
  await page.locator('#pieceDetailDlg [data-close]').click();
  await page.locator('#settingsBtn').click();
  if(nativeMode) {
    await page.locator('#dynamicIcon').uncheck();
    assert.ok(await page.evaluate(()=>window.companionCalls.some(x=>x.enabled===false)));
    await page.locator('#dynamicIcon').check();
    await page.locator('#exportBtn').click();
    assert.equal(await page.evaluate(()=>Object.values(window.testBackup.records).filter(r=>r.kind==='inspiration'&&!r.deleted).length),1);
  } else assert.equal(await page.locator('#dynamicIcon').isDisabled(),true);
  await page.locator('#fontSize').selectOption('large');
  await page.locator('#settingsDlg [data-close]').click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`.tools/screenshots/inspiration-${nativeMode?'native':'web'}-${width}-light.png`});
  const morning=await page.locator('#nextPiece').textContent();
  await page.clock.setFixedTime(new Date(2026,10,17,13));
  await page.evaluate(()=>window.dispatchEvent(new Event('planner-resume')));
  assert.notEqual(await page.locator('#nextPiece').textContent(),morning);
  await page.locator('#settingsBtn').click();await page.locator('#themeSeg [data-theme=dark]').click();await page.locator('#settingsDlg [data-close]').click();
  await page.waitForTimeout(350);await page.screenshot({path:`.tools/screenshots/inspiration-${nativeMode?'native':'web'}-${width}-dark.png`});
  const small=await page.locator('button:visible').evaluateAll(bs=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.width<43.5||r.height<43.5;}).map(b=>b.textContent));assert.deepEqual(small,[]);
  assert.deepEqual(errors,[]);console.log(`Inspiration ${nativeMode?'native mock':'web'} ${width}: next/back, save, reload, grouped recommendations, remove, source, backup, icon settings, time block, large/dark passed`);
  await context.close();
 }
} finally {await browser.close();server.close();}

