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
  for(const width of [360,390,768,1360]) {
    const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
    const page=await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addLocatorHandler(page.locator('#celebDlg[open]'),async()=>{await page.locator('#celebDlg [data-close]').click();});
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('.day-dial').waitFor();
    assert.match(await page.locator('.dial-card').textContent(),/아직 시간 있는 일정/);
    const seed=await page.evaluate(()=>{
      const d=new Date(), ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const date=ymd(d); d.setDate(d.getDate()-1); const yesterday=ymd(d);
      const rows=[['sleep','수면','23:00','07:00','health','#45857b',yesterday],['exercise','아침 운동','07:30','08:30','exercise','#3b6e5c',date],['study','영어 공부','09:00','11:00','study','#3b6fd8',date],['work','프로젝트 작업','13:00','17:00','work','#b47b1d',date],['meeting','짧은 미팅','14:00','14:10','people','#b56b58',date],['reading','책 읽기','20:00','21:30','reading','#a46a3d',date],['untimed','장보기','','','life','#c46058',date]];
      const records=Object.fromEntries(rows.map(([id,title,time,end,category,color,date])=>[id,{id,title,time,end,category,color,date,kind:'item',type:id==='exercise'?'task':'event',updatedAt:Date.now(),done:false,repeat:'none'}]));
      return records;
    });
    await page.addInitScript(records=>{ if(!sessionStorage.getItem('dial-seeded')) { localStorage.setItem('planner.records.v1',JSON.stringify(records)); sessionStorage.setItem('dial-seeded','yes'); } },seed);
    await page.reload();
    assert.equal(await page.locator('path[data-dial-select]').count(),6);
    await page.locator('path[data-dial-select^="reading@"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.dial-detail h3').textContent(),'책 읽기');
    await page.locator('.dial-detail').evaluate(el=>el.scrollIntoView({block:'center'}));
    await page.locator('.dial-detail [data-edit]').click();
    assert.equal(await page.locator('#editForm [name=title]').inputValue(),'책 읽기');
    await page.locator('#editDlg [data-close]').click();
    await page.locator('.dial-schedule summary').click();
    await page.locator('.dial-schedule button[data-dial-select^="meeting@"]').click();
    assert.equal(await page.locator('.dial-detail h3').textContent(),'짧은 미팅');
    assert.ok(await page.locator('.dial-now').isVisible());
    await page.locator('path[data-dial-select^="exercise@"]').focus(); await page.keyboard.press('Enter');
    await page.locator('.dial-detail').evaluate(el=>el.scrollIntoView({block:'center'}));
    await page.locator('.dial-detail [data-toggle]').click();
    assert.equal(await page.locator('.dial-detail [data-toggle]').textContent(),'완료 취소');
    await page.locator('path[data-dial-select^="sleep@"]').focus(); await page.keyboard.press('Enter');
    assert.match(await page.locator('.dial-detail').textContent(),/전날부터/);
    assert.equal(await page.locator('.day-layout .list .tx').allTextContents().then(a=>a.includes('장보기')),true);
    await page.locator('[data-day-layout=list]').click();
    assert.equal(await page.locator('.day-dial').count(),0);
    await page.reload();
    assert.equal(await page.locator('[data-day-layout=list]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-day-layout=dial]').click();
    await page.locator('#next').click();
    assert.equal(await page.locator('.dial-now').isVisible(),false);
    await page.locator('#todayBtn').click();
    await page.locator('path[data-dial-select^="reading@"]').focus(); await page.keyboard.press('Enter');
    await page.removeLocatorHandler(page.locator('#celebDlg[open]'));
    await page.waitForTimeout(1000);
    if(await page.locator('#celebDlg').isVisible()) await page.locator('#celebDlg [data-close]').click();
    await page.waitForTimeout(350);
    await page.screenshot({path:`.tools/screenshots/dial-${width}-light.png`,fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.locator('#settingsBtn').click(); await page.locator('#themeSeg [data-theme=dark]').click();
    await page.locator('#fontSize').selectOption('large'); await page.locator('#settingsDlg [data-close]').click();
    await page.waitForTimeout(350);
    await page.screenshot({path:`.tools/screenshots/dial-${width}-dark.png`,fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const small=await page.locator('button:visible').evaluateAll(bs=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.width<43.5||r.height<43.5;}).map(b=>b.textContent));
    assert.deepEqual(small,[]);
    assert.deepEqual(errors,[]);
    console.log(`Dial ${width}: default, keyboard/detail, overlap selection, completion, midnight, untimed, preference, themes passed`);
    await context.close();
  }
} finally { await browser.close(); server.close(); }

