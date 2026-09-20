export function newSession(model='deepseek-v4-flash') {
  return {id:crypto.randomUUID(),title:'新对话',model,messages:[],candidate:'',draft:'',knowledgeEnabled:true,updatedAt:Date.now(),versions:[]};
}
const KEY='deepseek_prompt_chat_sessions_v2';
function merge(a,b){const map=new Map();for(const s of [...a,...b]){const old=map.get(s.id);if(!old||(s.updatedAt||0)>=(old.updatedAt||0))map.set(s.id,s);}return [...map.values()];}
export function rememberVersion(state,prompt,label='生成结果'){
  state.versions||=[];
  if(prompt?.trim() && state.versions.at(-1)?.prompt!==prompt)state.versions.push({id:crypto.randomUUID(),prompt,label,translations:structuredClone(state.translations||[]),translationPrompt:state.translationPrompt||'',createdAt:Date.now()});
}
export function persistStore(store){
  const raw=localStorage.getItem(KEY);const saved=raw?JSON.parse(raw):{sessions:[]};
  const sessions=merge(saved.sessions||[],store.sessions);
  localStorage.setItem(KEY,JSON.stringify({version:2,sessions}));
}
export function sessionStore(properties, fallback='') {
  if (!properties.dsConversations?.sessions?.length) {
    const old=properties.dsChat;
    const first=newSession(old?.model);
    if(old){first.messages=old.messages||[];first.candidate=old.candidate||fallback;first.knowledgeEnabled=old.knowledgeEnabled!==false;}
    else first.candidate=fallback;
    first.title=first.messages.find(m=>m.role==='user')?.content.slice(0,28)||'原有对话';
    properties.dsConversations={version:1,activeId:first.id,sessions:[first]};
    delete properties.dsChat;
  }
  const store=properties.dsConversations;
  try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');store.sessions=merge(store.sessions,saved.sessions||[]);}catch{}
  for(const s of store.sessions){
    if(!s.versions?.length){s.versions=[];for(const m of s.messages||[]){if(m.role==='assistant'){try{rememberVersion(s,JSON.parse(m.content).positive_prompt,'历史生成结果');}catch{}}}rememberVersion(s,s.candidate,'当前结果');}
    s.updatedAt||=0;
  }
  store.version=2;
  if(!store.sessions.some(s=>s.id===store.activeId))store.activeId=store.sessions[0].id;
  return store;
}
export function selectSession(store,id) {
  const selected=store.sessions.find(s=>s.id===id);
  if(!selected)throw new Error('对话不存在');
  store.activeId=id;
  return selected;
}

