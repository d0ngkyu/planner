import {writeFile} from 'node:fs/promises';
import {COMPANION_STATES,companionPaths} from '../companion.js';
for(const state of Object.keys(COMPANION_STATES)) {
  const paths=companionPaths(state).map(p=>`    <path android:pathData="${p.d}" android:fillColor="${p.fill==='none'?'#00000000':p.fill}"${p.stroke?` android:strokeColor="${p.stroke}" android:strokeWidth="${p.width}" android:strokeLineCap="round" android:strokeLineJoin="round"`:''}/>`).join('\n');
  await writeFile(`android/app/src/main/res/drawable/companion_${state}.xml`,`<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="100" android:viewportHeight="100">\n${paths}\n</vector>\n`);
}
console.log('Six companion vector icons generated.');
