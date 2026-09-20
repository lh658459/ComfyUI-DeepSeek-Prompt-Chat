import { app } from '/scripts/app.js';
import { api } from '/scripts/api.js';
import { readKnowledge, saveKnowledge, retrieve, referenceMessage } from './knowledge.js';
import { newSession, sessionStore, selectSession, persistStore, rememberVersion } from './sessions-v3.js';

let sessionKey = '';
function openChat(node) {
  const prop = node.properties;
  if(node._dsDialog?.isConnected){node._dsDialog.focus();return;}
  const store=sessionStore(prop,node.widgets.find(w=>w.name==='approved_prompt')?.value||'');
  let state=selectSession(store,store.activeId);
  const dialog = document.createElement('dialog');
  dialog.style.cssText='width:96vw;max-width:1600px;height:92vh;max-height:96vh;padding:0;border:1px solid #43546b;border-radius:16px;background:#111923;color:#eef2f7;z-index:10000;';
  dialog.innerHTML=`<style>
  .dsc{height:100%;display:flex;flex-direction:column;font:14px system-ui,sans-serif}.dsc *{box-sizing:border-box}.dsc button,.dsc input,.dsc select,.dsc textarea{font:inherit;border:1px solid #43546b;border-radius:8px;padding:9px;background:#202e40;color:#eef2f7;min-width:0}.dsc button{cursor:pointer}.dsc button:hover{border-color:#75abfa}.dsc button:disabled{opacity:.45;cursor:wait}.dsc textarea{width:100%;resize:vertical}.dsc p{white-space:pre-wrap;overflow-wrap:anywhere}.dsc small{color:#a4b7ce;line-height:1.5}.dsc header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #304157}.dsc h2,.dsc h3{margin:0}.dsc-grid{display:grid;grid-template-columns:220px minmax(320px,1.5fr) minmax(270px,1fr);flex:1;min-height:0;overflow:auto}.dsc-col{display:flex;flex-direction:column;gap:12px;padding:16px;min-height:0;min-width:0;overflow:auto}.dsc-col+.dsc-col{border-left:1px solid #304157}.dsc .primary{background:#246bd5}.dsc .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.dsc .msg{padding:12px;margin:8px 0;border-radius:10px;background:#202e40}.dsc summary{cursor:pointer;padding:4px}.dsc .session{display:flex;flex-direction:column;text-align:left;width:100%;gap:5px;margin-bottom:7px;overflow-wrap:anywhere}.dsc .session[aria-current=true]{border-color:#73aaff;background:#213d61}.dsc .session small{font-size:11px}.dsc .scroll{overflow:auto;min-height:100px}.dsc footer{padding:9px 20px;border-top:1px solid #304157;color:#a4caff;font-size:12px}.dsc .config{border:1px solid #304157;border-radius:9px;padding:8px}.dsc label{display:block}.dsc [data-id=history]{flex:1;background:#0d141d;border-radius:10px;padding:8px}.dsc [data-id=candidate]{flex:1;min-height:160px;line-height:1.7}.dsc [data-id=versions]{max-height:180px;overflow:auto}.dsc [data-id=title]{width:100%}
  </style><section class="dsc">
  <header><div><h2>DeepSeek · 提示词工作室</h2><small>连续对话 · 本地知识库 · 确认后出图</small></div><button data-id="close">关闭</button></header>
  <div class="dsc-grid">
  <aside class="dsc-col"><button class="primary" data-id="reset">＋ 新建对话</button><label>当前对话<input aria-label="对话名称" data-id="title" maxlength="80"></label><input aria-label="搜索历史对话" data-id="search" placeholder="搜索历史对话"><div class="row"><h3>历史对话</h3><small data-id="count"></small></div><label><input type="checkbox" data-id="showarchive">显示已归档</label><div data-id="sessions" class="scroll" style="flex:1"></div><button data-id="archive">归档当前对话</button><small>最近最多 50 个对话。归档保留记录，可随时恢复。</small></aside>
  <main class="dsc-col"><details class="config" open><summary>模型与连接</summary><div class="row"><select aria-label="DeepSeek 模型" data-id="model"><option value="deepseek-v4-flash">V4 Flash</option><option value="deepseek-v4-pro">V4 Pro</option></select><input data-id="key" type="password" autocomplete="off" aria-label="DeepSeek 官方 API Key" placeholder="DeepSeek 官方 API Key" style="flex:1"></div><small data-id="keyinfo">Key 仅本次页面会话保留，不写入工作流。</small></details>
  <details class="config"><summary>TXT 提示词知识库 <span data-id="kbcount"></span></summary><div class="row"><label><input type="checkbox" data-id="kbenabled" checked>参考知识库</label><select aria-label="TXT 编码" data-id="encoding"><option value="utf-8">UTF-8</option><option value="gb18030">GBK / GB18030</option><option value="utf-16le">UTF-16 LE</option></select><button data-id="import">导入 TXT</button><input data-id="files" type="file" accept=".txt,text/plain" multiple hidden></div><small>每轮检索最多 4 个相关片段发送给 DeepSeek。</small><div data-id="kblist" style="max-height:100px;overflow:auto"></div><div data-id="sources" style="max-height:120px;overflow:auto"></div></details>
  <div data-id="history" class="scroll"></div><textarea aria-label="对话消息" data-id="message" rows="3" placeholder="描述画面，或继续修改提示词…"></textarea><div class="row"><button class="primary" data-id="send">发送给 DeepSeek（不出图）</button><small>Ctrl + Enter 发送</small></div></main>
  <section class="dsc-col"><h3>当前提示词</h3><small>与左侧选中的对话绑定 · 可直接编辑</small><textarea aria-label="当前英文提示词" data-id="candidate"></textarea><details class="config" open><summary>中英对照 · 仅供阅读，不用于出图</summary><small data-id="translationstatus"></small><div data-id="translations" style="display:flex;flex-wrap:wrap;align-content:flex-start;gap:6px;max-height:280px;overflow:auto;padding:8px 0"></div></details><div class="row" style="display:none" hidden><button data-id="copy">复制提示词</button><button data-id="saveversion">保存当前版本</button></div><details class="config"><summary>当前对话的版本历史</summary><div data-id="versions"></div></details><small>恢复旧版本或切换对话后，出图前需要重新确认。</small><div class="row"><button data-id="confirm">仅确认提示词</button><button class="primary" data-id="generate">确认并生成图片</button></div></section>
  </div><footer><span data-id="saved"></span> <span data-id="status" role="status"></span></footer></section>`;
  const q = id => dialog.querySelector(`[data-id="${id}"]`);
  const widget = name => node.widgets.find(w=>w.name===name);
  const dirty = () => { state.updatedAt=Date.now(); try{persistStore(store);q('saved').textContent='已自动保存到本机 · Ctrl+S 可同步保存工作流';}catch{q('saved').textContent='本机自动保存失败（存储空间或权限），请立即 Ctrl+S 保存工作流。';}app.graph.change(); app.graph.setDirtyCanvas(true,true); };
  const unconfirm = () => { widget('confirmed').value=false; dirty(); };
  q('key').value=sessionKey; q('model').value=state.model;
  q('candidate').value=state.candidate || '';
  q('message').value=state.draft||'';
  q('title').value=state.title;
  let busy=false;
  let knowledge=readKnowledge();
  q('kbenabled').checked=state.knowledgeEnabled!==false;
  q('kbenabled').onchange=()=>{state.knowledgeEnabled=q('kbenabled').checked;dirty();};
  const renderKnowledge=()=>{
    q('kbcount').textContent=`（${knowledge.length} 个文件）`;q('kblist').replaceChildren();
    for(const file of knowledge){const row=document.createElement('div');row.style.cssText='display:flex;justify-content:space-between;align-items:center;margin:5px 0';const label=document.createElement('span');label.textContent=file.name;const remove=document.createElement('button');remove.textContent='移除';remove.onclick=()=>{try{const next=knowledge.filter(x=>x.name!==file.name);saveKnowledge(next);knowledge=next;renderKnowledge();}catch{q('status').textContent='无法更新浏览器存储。';}};row.append(label,remove);q('kblist').append(row);}
  };
  q('import').onclick=()=>q('files').click();
  q('files').onchange=async()=>{
    try{
      const next=[...knowledge];
      for(const file of q('files').files){
        if(!file.name.toLowerCase().endsWith('.txt'))throw new Error('只支持 TXT 文件。');
        if(file.size>1024*1024)throw new Error('单个 TXT 请控制在 1 MB 内。');
        const text=new TextDecoder(q('encoding').value,{fatal:true}).decode(await file.arrayBuffer()).replace(/^\uFEFF/,'');
        if(!text.trim())throw new Error(`${file.name} 是空文件。`);
        const item={name:file.name,text};const index=next.findIndex(x=>x.name===file.name);if(index<0)next.push(item);else next[index]=item;
      }
      if(next.length>20||next.reduce((n,x)=>n+x.text.length,0)>800000)throw new Error('最多 20 个文件、合计 80 万字符。');
      saveKnowledge(next);knowledge=next;renderKnowledge();q('status').textContent='TXT 已导入。下次发送消息时会检索相关片段；同名文件会替换。';
    }catch(e){q('status').textContent=e instanceof TypeError?'无法解码，请切换 TXT 编码后重试。':e.message;}
    finally{q('files').value='';}
  };
  renderKnowledge();
  const updateButtons = () => { q('archive').disabled=busy;q('close').disabled=busy;q('message').disabled=busy;q('saveversion').disabled=busy;for(const button of q('sessions').querySelectorAll('button'))button.disabled=busy; q('send').disabled=busy; q('reset').disabled=busy; q('model').disabled=busy; q('candidate').disabled=busy; q('confirm').disabled=busy||!q('candidate').value.trim(); q('generate').disabled=busy||!q('candidate').value.trim(); };
  const renderSessions=()=>{
    q('sessions').replaceChildren();const query=q('search').value.trim().toLowerCase();
    q('count').textContent=store.sessions.filter(s=>!s.archived).length+'/50';
    const visible=store.sessions.filter(s=>(q('showarchive').checked||!s.archived)&&((s.title||'')+' '+s.candidate).toLowerCase().includes(query)).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    for(const s of visible){const button=document.createElement('button');button.className='session';button.disabled=busy;button.setAttribute('aria-current',String(s.id===state.id));const title=document.createElement('span');title.textContent=(s.archived?'[已归档] ':'')+(s.title||'新对话');const date=document.createElement('small');date.textContent=s.updatedAt?new Date(s.updatedAt).toLocaleString():'历史记录';button.append(title,date);button.onclick=()=>{if(!busy)activate(s.id);};q('sessions').append(button);}
    q('archive').textContent=state.archived?'恢复当前对话':'归档当前对话';
  };
  const renderTranslations=()=>{
    q('translations').replaceChildren();
    const rows=state.translations||[];
    q('translationstatus').textContent=!rows.length?'此结果暂无翻译，下次发送给 DeepSeek 时会一并生成。':state.translationPrompt!==state.candidate?'英文已修改，以下为上次生成的对照；发送给 DeepSeek 后可更新。':'';
    q('translationstatus').hidden=!q('translationstatus').textContent;
    for(const row of rows){const item=document.createElement('div');item.style.cssText='display:inline-flex;flex-wrap:wrap;align-items:baseline;gap:4px;padding:5px 8px;border:1px solid #43546b;border-radius:8px;background:#202e40;max-width:100%;overflow-wrap:anywhere;font-size:12px;line-height:1.4';const en=document.createElement('span');en.textContent=row.en;const zh=document.createElement('span');zh.style.color='#a4caff';zh.textContent='· '+row.zh;item.append(en,zh);q('translations').append(item);}
  };
  const renderVersions=()=>{q('versions').replaceChildren();for(const [index,v] of [...state.versions.entries()].reverse()){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=`版本 ${index+1} · ${v.label}`;const text=document.createElement('p');text.textContent=v.prompt;const restore=document.createElement('button');restore.textContent='恢复此版本';restore.onclick=()=>{if(busy)return;rememberVersion(state,state.candidate,'恢复前的编辑');state.candidate=v.prompt;state.translations=v.translations||[];state.translationPrompt=v.translationPrompt||'';q('candidate').value=v.prompt;unconfirm();renderVersions();renderTranslations();updateButtons();q('status').textContent='已恢复版本，请重新确认后出图。';};details.append(summary,text,restore);q('versions').append(details);}if(!state.versions.length)q('versions').textContent='生成或保存提示词后，版本会保留在这里。';};
  const render = () => {
    q('history').replaceChildren();
    for (const m of state.messages) {
      const item=document.createElement('div');item.className='msg';
      const label=document.createElement('strong');label.textContent=m.role==='user'?'你':'DeepSeek';
      const text=document.createElement('p');let value=m.content;
      let historicalPrompt='';
      if(m.role==='assistant'){try{const result=JSON.parse(m.content);value=result.reply;historicalPrompt=result.positive_prompt||'';}catch{}}
      text.textContent=value;item.append(label,text);q('history').append(item);
      if(historicalPrompt){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='查看本轮提示词';const result=document.createElement('p');result.textContent=historicalPrompt;details.append(summary,result);item.append(details);}
    }
    q('history').scrollTop=q('history').scrollHeight;
  };
  q('key').oninput=()=>{sessionKey=q('key').value;};
  q('model').onchange=()=>{state.model=q('model').value;dirty();};
  q('candidate').oninput=()=>{state.candidate=q('candidate').value;renderTranslations();unconfirm();updateButtons();};
  q('close').onclick=()=>dialog.close();
  dialog.onclose=()=>{dialog.remove();node._dsDialog=null;};
  dialog.oncancel=e=>{if(busy)e.preventDefault();};
  q('close').onclick=()=>{if(!busy)dialog.close();};
  const activate=id=>{state=selectSession(store,id);q('model').value=state.model;q('candidate').value=state.candidate||'';q('message').value=state.draft||'';q('title').value=state.title;q('kbenabled').checked=state.knowledgeEnabled!==false;q('sources').replaceChildren();widget('approved_prompt').value=state.candidate||'';unconfirm();renderSessions();render();renderVersions();renderTranslations();updateButtons();q('status').textContent='已切换对话和提示词；出图前请重新确认。';};
  q('search').oninput=renderSessions;q('showarchive').onchange=renderSessions;
  q('archive').onclick=()=>{if(busy)return;if(state.archived&&store.sessions.filter(s=>!s.archived).length>=50){q('status').textContent='最近对话已达 50 个，请先归档其他对话。';return;}state.archived=!state.archived;if(state.archived)q('showarchive').checked=true;dirty();renderSessions();};
  q('copy').onclick=async()=>{try{await navigator.clipboard.writeText(state.candidate||'');q('status').textContent='提示词已复制。';}catch{q('status').textContent='复制失败，请选中提示词手动复制。';}};
  q('saveversion').onclick=()=>{if(busy)return;rememberVersion(state,state.candidate,'手动保存');dirty();renderVersions();renderTranslations();};
  q('candidate').onchange=()=>{rememberVersion(state,state.candidate,'手动编辑');dirty();renderVersions();renderTranslations();};
  q('title').oninput=()=>{state.title=q('title').value;renderSessions();dirty();};
  q('message').oninput=()=>{state.draft=q('message').value;dirty();};
  q('reset').onclick=()=>{if(busy)return;if(store.sessions.filter(s=>!s.archived).length>=50){q('status').textContent='最近对话已达 50 个，请先归档旧对话；记录不会自动删除。';return;}const next=newSession(state.model);store.sessions.push(next);activate(next.id);q('status').textContent='已创建新对话，之前的对话保留在历史列表中。';};
  q('send').onclick=async()=>{
    const text=q('message').value.trim(); if(!text||busy)return;
    busy=true;unconfirm();updateButtons();q('status').textContent='DeepSeek 正在回复…';
    const pending=[...state.messages];
    if(state.candidate && pending.length){pending.push({role:'user',content:'以下是当前人工编辑后的提示词，请在后续修改中以此为基础：\n'+state.candidate});}
    pending.push({role:'user',content:text});
    const hits=q('kbenabled').checked?retrieve(knowledge,text,state.candidate||state.messages.filter(x=>x.role==='user').slice(-2).map(x=>x.content).join(' ')):[];
    const requestMessages=hits.length?[{role:'user',content:referenceMessage(hits)},...pending]:pending;
    q('sources').replaceChildren();
    const sourceTitle=document.createElement('p');sourceTitle.textContent=hits.length?'本轮参考：':(q('kbenabled').checked?'本轮没有匹配的知识库片段。':'本轮未启用知识库。');q('sources').append(sourceTitle);
    for(const h of hits){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=`${h.name} · 片段 ${h.part}`;const excerpt=document.createElement('p');excerpt.textContent=h.text;details.append(summary,excerpt);q('sources').append(details);}
    try {
      const r=await api.fetchApi('/deepseek_prompt_chat/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:state.model,api_key:sessionKey,messages:requestMessages})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'请求失败');
      state.messages=[...pending,{role:'assistant',content:data.assistant_content}];state.candidate=data.positive_prompt;state.translations=data.translations||[];state.translationPrompt=data.positive_prompt;state.draft='';rememberVersion(state,data.positive_prompt,'DeepSeek 生成');renderVersions();renderTranslations();
      if(!state.title||state.title==='新对话'){state.title=text.slice(0,28);q('title').value=state.title;renderSessions();}
      q('candidate').value=state.candidate;q('message').value='';render();dirty();q('status').textContent='回复完成。可继续对话；满意后确认出图。';
    }catch(e){q('status').textContent=e.message;}
    finally{busy=false;updateButtons();}
  };
  q('message').onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();q('send').click();}};
  async function confirm(generate){
    if(busy)return;const prompt=q('candidate').value.trim();if(!prompt)return;if(/[\u3400-\u9fff]/.test(prompt)){q('status').textContent='出图只接受纯英文，请移除英文提示词框中的中文。';return;}
    widget('approved_prompt').value=prompt;widget('confirmed').value=true;state.candidate=prompt;dirty();
    if(!generate){q('status').textContent='提示词已确认。可以关闭窗口，再点击 ComfyUI 的运行按钮。';return;}
    busy=true;updateButtons();q('status').textContent='已确认，正在提交本地图片任务…';
    try{await app.queuePrompt(0,1);q('status').textContent='已请求提交。请查看 ComfyUI 任务队列与图片输出；如有错误会在 ComfyUI 中显示。';}
    catch(e){q('status').textContent='提交失败：'+e.message;}
    finally{busy=false;updateButtons();}
  }
  q('confirm').onclick=()=>confirm(false);q('generate').onclick=()=>confirm(true);
  node._dsDialog=dialog;document.body.append(dialog);dialog.showModal();renderSessions();render();renderVersions();renderTranslations();updateButtons();widget('approved_prompt').value=state.candidate||'';unconfirm();
  api.fetchApi('/deepseek_prompt_chat/status').then(r=>r.json()).then(x=>{if(x.configured)q('keyinfo').textContent='已检测到本机配置的 DeepSeek Key，输入框可留空。密钥不会写入工作流。';}).catch(()=>{});
}
app.registerExtension({name:'local.DeepSeekPromptChat',async beforeRegisterNodeDef(nodeType,nodeData){
  if(nodeData.name!=='DeepSeekPromptChat')return;
  const original=nodeType.prototype.onNodeCreated;
  nodeType.prototype.onNodeCreated=function(){
    const result=original?.apply(this,arguments);
    const b=this.addWidget('button','打开 DeepSeek 连续对话',null,()=>openChat(this));b.serialize=false;
    const prompt=this.widgets.find(w=>w.name==='approved_prompt');
    const previous=prompt.callback;
    prompt.callback=(...args)=>{previous?.apply(prompt,args);this.widgets.find(w=>w.name==='confirmed').value=false;const store=this.properties.dsConversations;if(store){const state=store.sessions.find(s=>s.id===store.activeId);if(state){state.candidate=prompt.value;state.updatedAt=Date.now();try{persistStore(store);}catch{}}}};
    this.size=[480,330];return result;
  };
}});





