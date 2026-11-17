import {pathToFileURL} from 'node:url';
import {companionSVG} from '../companion.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH});
const page=await browser.newPage({viewport:{width:840,height:380},deviceScaleFactor:1});
await page.setContent(`<style>body{margin:0;background:#f4f3ef;font:13px system-ui;color:#747770;padding:36px}h1{font-size:18px;color:#252e29;font-weight:500;margin:0 0 10px}p{margin:0 0 38px}main{display:flex;gap:32px}article{text-align:center;width:96px}svg{width:72px;height:72px}span{display:block;margin-top:14px;font-size:12px}</style><h1>플래너 · 홈 화면 아이콘</h1><p>단색 바탕, 달력 선, 작은 표정 변화</p><main>${[['happy','기본'],['proud','일을 마쳤을 때'],['crown','오늘 계획 완료'],['sleep','2일 쉬었을 때'],['waiting','5일 쉬었을 때'],['welcome','다시 돌아왔을 때']].map(([s,label])=>`<article>${companionSVG(s)}<span>${label}</span></article>`).join('')}</main>`);
await page.screenshot({path:'.tools/screenshots/launcher-minimal-preview.png'});await browser.close();
