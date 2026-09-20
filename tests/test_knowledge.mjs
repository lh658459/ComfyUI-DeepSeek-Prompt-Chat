import fs from 'node:fs';
import assert from 'node:assert/strict';
const code=fs.readFileSync(new URL('../web/knowledge.js',import.meta.url),'utf8');
const {retrieve,referenceMessage,saveKnowledge,readKnowledge}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const files=[{name:'示例.txt',text:'海边 日落 sunset, ocean\n\n森林 月光 forest, moonlight'}];
assert.match(retrieve(files,'海边日落')[0].text,/sunset/);
assert.match(retrieve(files,'moonlight')[0].text,/森林/);
assert.equal(retrieve(files,'spaceship').length,0);
const many=retrieve([{name:'large.txt',text:'sunset '.repeat(2000)}],'sunset');
assert.equal(many.length,4);
assert.ok(many.every(x=>x.text.length<=800));
assert.match(referenceMessage(retrieve(files,'日落')),/示例.txt/);
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
saveKnowledge(files);assert.deepEqual(readKnowledge(),files);
console.log('PASS: Chinese/English retrieval, no match, size limits, source attribution, storage');

