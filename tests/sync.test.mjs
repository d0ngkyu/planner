import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mergeRecord } from '../store.js';
let authChanged, snapshot, status, remoteCalls=0, writes=0;
const saved=new Map();
globalThis.localStorage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
const db=new Map([['a',{id:'a',updatedAt:20,deleted:true}]]);
globalThis.testSync={mergeRecord,
 app:{initializeApp:()=>({})},
 auth:{getAuth:()=>({}),getRedirectResult:async()=>{},onAuthStateChanged:(_,cb)=>{authChanged=cb;},signOut:async()=>authChanged(null)},
 fs:{initializeFirestore:()=>db,persistentLocalCache:()=>({}),persistentMultipleTabManager:()=>({}),collection:()=>({col:true}),doc:(_, ...parts)=>parts.at(-1),
 onSnapshot:(ref,options,callback)=>{if(ref.col) snapshot=callback; return ()=>{};},
 runTransaction:async(_,cb)=>cb({get:async ref=>({exists:()=>db.has(ref),data:()=>db.get(ref)}),set:(ref,data)=>{db.set(ref,data);writes++;}})
 }};
let source=await readFile(new URL('../sync.js',import.meta.url),'utf8');
source=source.replace(/import \{ firebaseConfig, vapidKey \}[^;]+;/,"const firebaseConfig = {projectId:'test'}, vapidKey=null;")
 .replace(/import \{ native \}[^;]+;/,'const native=null;')
 .replace(/import \{ mergeRecord \}[^;]+;/,'const {mergeRecord}=globalThis.testSync;')
 .replace(/import\(`\$\{CDN\}\/firebase-(app|auth|firestore)\.js`\)/g,(_,name)=>`Promise.resolve(globalThis.testSync.${name==='firestore'?'fs':name})`);
const {createSync}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const sync=createSync({onRemote:()=>remoteCalls++,onStatus:s=>status=s});
await sync.start(); authChanged({uid:'owner',email:'owner@test.invalid'});
snapshot({metadata:{fromCache:true},docs:[]}); assert.equal(remoteCalls,0);
snapshot({metadata:{fromCache:false},docs:[]}); assert.equal(remoteCalls,1);
sync.push({id:'a',updatedAt:10,deleted:false});
sync.push({id:'b',updatedAt:21,title:'new'});
await new Promise(r=>setTimeout(r,450));
assert.equal(db.get('a').deleted,true); assert.equal(db.get('b').title,'new'); assert.equal(writes,2);
authChanged({uid:'other',email:'other@test.invalid'});
assert.equal(status.state,'error'); assert.equal(sync.user,null);
sync.push({id:'c',updatedAt:30}); await new Promise(r=>setTimeout(r,450)); assert.equal(db.has('c'),false);
await sync.signOut(); assert.equal(status.state,'signedOut');
delete globalThis.testSync;
console.log('sync: cache gate, stale deletion protection, upload and account isolation passed (mock)');
