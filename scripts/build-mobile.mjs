import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import './build-companion.mjs';
await mkdir('www', { recursive: true });
for (const f of ['styles.css', 'icon.svg', 'icon-192.png', 'icon-512.png']) await copyFile(f, `www/${f}`);
const html = (await readFile('index.html', 'utf8'))
  .replace('<link rel="manifest" href="manifest.webmanifest">', '')
  .replace(/<link rel="stylesheet" href="https:[^>]+>/, '')
  .replace('src="app.js"', 'src="mobile.js"');
await writeFile('www/index.html', html);
await build({ entryPoints: ['mobile/entry.js'], outfile: 'www/mobile.js', bundle: true, format: 'esm', target: 'chrome100' });
console.log('Android web assets built (no remote app URL).');
