import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {COMPANION_STATES,companionPaths} from '../companion.js';
const root='android/app/src/main/res';
await mkdir(`${root}/mipmap-anydpi-v26`,{recursive:true});
await mkdir(`${root}/mipmap-anydpi`,{recursive:true});
const vector=paths=>`<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="100" android:viewportHeight="100">\n${paths.map(p=>`    <path android:pathData="${p.d}" android:fillColor="${p.fill==='none'?'#00000000':p.fill}"${p.stroke?` android:strokeColor="${p.stroke}" android:strokeWidth="${p.width}" android:strokeLineCap="round" android:strokeLineJoin="round"`:''}/>`).join('\n')}\n</vector>\n`;
for(const state of Object.keys(COMPANION_STATES)) {
  const legacy=vector(companionPaths(state));
  await writeFile(`${root}/drawable/companion_${state}.xml`,legacy);
  await writeFile(`${root}/mipmap-anydpi/companion_${state}.xml`,legacy);
  await writeFile(`${root}/drawable/companion_mark_${state}.xml`,vector(companionPaths(state,false)));
  await writeFile(`${root}/mipmap-anydpi-v26/companion_${state}.xml`,`<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/companion_background"/><foreground android:drawable="@drawable/companion_mark_${state}"/><monochrome android:drawable="@drawable/companion_mark_${state}"/></adaptive-icon>\n`);
}
await writeFile(`${root}/values/companion_colors.xml`,'<resources><color name="companion_background">#3E5C50</color></resources>\n');
console.log('Six minimal launcher icons generated, including adaptive and monochrome variants.');
