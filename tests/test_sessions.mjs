import fs from 'node:fs';
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
const code=fs.readFileSync(new URL('../web/sessions-v3.js',import.meta.url),'utf8');
const {sessionStore,newSession,selectSession,persistStore,rememberVersion}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const props={dsChat:{messages:[{role:'assistant',content:JSON.stringify({reply:'好',positive_prompt:'ocean'})}],candidate:'ocean'}};
const store=sessionStore(props);const first=store.sessions[0];
assert.equal(first.versions[0].prompt,'ocean');
for(let i=0;i<49;i++){const s=newSession();s.title='对话'+i;s.candidate='prompt'+i;s.messages=[{role:'user',content:'request'+i}];store.sessions.push(s);}
persistStore(store);
const older=JSON.parse(JSON.stringify(props));
first.translations=[{en:'forest',zh:'森林'}];first.translationPrompt='forest';first.candidate='forest';first.draft='继续修改';first.updatedAt=Date.now()+100;rememberVersion(first,'forest');persistStore(store);
const restored=sessionStore(older);
assert.equal(restored.sessions.length,50);assert.equal(restored.sessions.find(s=>s.id===first.id).versions.at(-1).translations[0].zh,'森林');
assert.equal(selectSession(restored,first.id).candidate,'forest');
assert.equal(selectSession(restored,first.id).draft,'继续修改');
assert.equal(selectSession(restored,first.id).versions.length,2);
assert.equal(restored.sessions[30].candidate,'prompt29');
assert.equal(restored.sessions[30].messages[0].content,'request29');
first.archived=true;first.updatedAt+=100;persistStore(store);
assert.equal(sessionStore(older).sessions.find(s=>s.id===first.id).archived,true);
localStorage.setItem=()=>{throw new Error('quota');};assert.throws(()=>persistStore(store),/quota/);
console.log('PASS: 50 sessions, reload merge, independent prompts/history/drafts, versions, archive persistence, quota errors');


