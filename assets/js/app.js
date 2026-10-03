// Interface do sistema de reuniões do Squad D
(function(){
  const S={clients:[],meetings:[],selClient:null,selMeeting:null,search:'',loaded:{c:false,m:false}};
  const work={},pending={},inflight={},timers={},creating={};
  const $=(s,el=document)=>el.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
  const today=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);};
  const fmtDate=d=>{ if(!d) return 'Sem data'; try{ return new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).replace(/\./g,''); }catch(e){ return d; } };

  const getM=id=>work[id]||(S.meetings.find(m=>m.id===id)||null);
  const clientMeetings=cid=>S.meetings.filter(m=>m.clientId===cid).map(m=>getM(m.id))
    .sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0));
  const openActions=m=>(m.acoes||[]).filter(a=>!a.done&&(a.text||'').trim());
  const clientOpenCount=cid=>clientMeetings(cid).reduce((n,m)=>n+openActions(m).length,0);

  function setStatus(t){ const el=$('#status'); if(el) el.textContent=t; }
  function showNotice(t){ const el=$('#sideNotice'); el.innerHTML=t?`<div class="notice">${esc(t)}</div>`:''; if(t) setTimeout(()=>{ el.innerHTML=''; },5000); }
  function queueSave(id,patch){
    const base=getM(id); if(!base) return;
    work[id]=Object.assign({},base,patch);
    pending[id]=Object.assign({},pending[id]||{},patch,{updatedAt:Date.now()});
    clearTimeout(timers[id]); timers[id]=setTimeout(()=>flush(id),700);
    setStatus('Salvando…'); renderSide(); renderTabDots();
  }
  async function flush(id,retried){
    if(inflight[id]){ clearTimeout(timers[id]); timers[id]=setTimeout(()=>flush(id),300); return; }
    const p=pending[id]; if(!p) return;
    delete pending[id]; inflight[id]=true;
    try{ if(creating[id]) await creating[id]; await DB.updateMeeting(id,p); if(!pending[id]) setStatus('Salvo'); }
    catch(e){
      pending[id]=Object.assign({},p,pending[id]||{}); inflight[id]=false;
      if(!retried){ setTimeout(()=>flush(id,true),600+Math.random()*600); return; }
      setStatus('Não salvou. Tente de novo.');
    } finally{ inflight[id]=false; }
  }
  window.addEventListener('beforeunload',()=>Object.keys(pending).forEach(id=>flush(id)));

  /* Lateral */
  function renderSide(){
    const ul=$('#clientList'); if(!S.loaded.c) return;
    const q=S.search.trim().toLowerCase();
    const list=S.clients.filter(c=>!q||c.name.toLowerCase().includes(q));
    $('#listLabel').textContent=`${S.clients.length} ${S.clients.length===1?'cliente':'clientes'}`;
    if(!S.clients.length){ ul.innerHTML='<li class="muted">Nenhum cliente ainda. Cadastre o primeiro abaixo.</li>'; return; }
    if(!list.length){ ul.innerHTML='<li class="muted">Nenhum cliente com esse nome.</li>'; return; }
    ul.innerHTML=list.map(c=>{ const n=clientOpenCount(c.id);
      return `<li><button class="client-btn" data-cid="${esc(c.id)}" aria-current="${c.id===S.selClient}"><span class="nm">${esc(c.name)}</span>${n?`<span class="badge" title="${n} ações pendentes">${n}</span>`:''}</button></li>`; }).join('');
  }
  $('#clientList').addEventListener('click',e=>{ const b=e.target.closest('[data-cid]'); if(b) selectClient(b.dataset.cid); });
  $('#search').addEventListener('input',e=>{ S.search=e.target.value; renderSide(); });
  async function addClient(){
    const inp=$('#newClient'); const name=inp.value.trim(); if(!name) return;
    const order=S.clients.reduce((m,c)=>Math.max(m,c.order||0),0)+1; inp.value='';
    try{ const c=await DB.addClient(name,order); if(!S.clients.find(x=>x.id===c.id)) S.clients.push(c); selectClient(c.id); }
    catch(e){ console.error(e); inp.value=name; showNotice('Não foi possível cadastrar o cliente. Tente de novo.'); }
  }
  $('#addClientBtn').addEventListener('click',addClient);
  $('#newClient').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); addClient(); } });

  /* Seleção */
  function selectClient(cid){ cuEditing=false;
    S.selClient=cid; const ms=clientMeetings(cid); S.selMeeting=ms.length?ms[0].id:null;
    document.body.classList.toggle('has-client',!!cid); renderSide(); renderMain();
  }
  function selectMeeting(mid){ S.selMeeting=mid; renderTabs(); renderSheet(); }

  /* Principal */
  function renderMain(){
    const main=$('#main'); const c=S.clients.find(x=>x.id===S.selClient);
    if(!c){ main.innerHTML=`<div class="empty"><h2>Escolha um cliente</h2>Selecione um cliente na lista para abrir as reuniões, anotar as pautas e as ações de cada encontro.</div>`; return; }
    main.innerHTML=`<div class="head">
        <div class="head-row">
          <button class="btn btn-ghost btn-sm back" id="back" type="button">‹ Clientes</button>
          <input class="client-name" id="clientName" value="${esc(c.name)}" aria-label="Nome do cliente">
          <button class="btn btn-danger btn-sm" id="delClient" type="button" title="Apaga o cliente e todas as reuniões dele">Excluir cliente</button>
        </div>
        <div class="meta" id="clientMeta"></div>
        <div class="cubar" id="cuBar"></div>
        <div class="tabs" role="tablist" id="tabs"></div>
      </div>
      <div class="sheet" id="sheet"></div>`;
    $('#back').addEventListener('click',()=>{ S.selClient=null; document.body.classList.remove('has-client'); renderSide(); renderMain(); });
    const ni=$('#clientName');
    const save=async()=>{ const v=ni.value.trim(); if(!v){ ni.value=c.name; return; } if(v!==c.name){ try{ await DB.renameClient(c.id,v); c.name=v; renderSide(); }catch(e){ ni.value=c.name; showNotice('Não foi possível renomear. Tente de novo.'); } } };
    ni.addEventListener('blur',save);
    ni.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); ni.blur(); } if(e.key==='Escape'){ ni.value=c.name; ni.blur(); } });
    armButton($('#delClient'),'Confirmar: apagar cliente e reuniões',async()=>{
      const n=clientMeetings(c.id).length;
      try{ await DB.deleteClient(c.id); }
      catch(e){ console.error(e); showNotice('Não foi possível excluir o cliente. Tente de novo.'); return; }
      S.clients=S.clients.filter(x=>x.id!==c.id); S.meetings=S.meetings.filter(m=>m.clientId!==c.id);
      S.selClient=null; S.selMeeting=null; document.body.classList.remove('has-client');
      renderSide(); renderMain();
      showNotice(`${c.name} foi excluído${n?` junto com ${n} ${n===1?'reunião':'reuniões'}`:''}.`);
    });
    renderCuBar(); renderTabs(); renderSheet();
  }
  /* ClickUp: lista do cliente */
  function parseListId(v){
    v=String(v||'').trim();
    const m=v.match(/\/li\/(\d+)/)||v.match(/\/l\/\d+-(\d+)-\d+/)||v.match(/^(\d+)$/);
    return m?m[1]:null;
  }
  let cuEditing=false;
  function renderCuBar(){
    const el=$('#cuBar'); if(!el) return; const c=S.clients.find(x=>x.id===S.selClient); if(!c) return;
    if(cuEditing){
      el.innerHTML=`<span class="cu-tag">ClickUp</span><input class="cu-input" id="cuInput" placeholder="Cole aqui o link da lista deste cliente no ClickUp" value="${esc(c.clickupListId||'')}">
        <button class="btn btn-primary btn-sm" id="cuSave" type="button">Salvar</button><button class="btn btn-ghost btn-sm" id="cuCancel" type="button">Cancelar</button>`;
      const inp=$('#cuInput'); inp.focus();
      const save=async()=>{
        const v=inp.value.trim(); const id=v?parseListId(v):'';
        if(id===null){ showNotice('Não reconheci esse link. Abra a lista do cliente no ClickUp e copie o endereço do navegador.'); return; }
        try{ await DB.setClickupList(c.id,id); c.clickupListId=id; cuEditing=false; renderCuBar(); }
        catch(e){ console.error(e); showNotice('Não foi possível salvar a lista. Tente de novo.'); }
      };
      $('#cuSave').addEventListener('click',save);
      inp.addEventListener('keydown',e=>{ if(e.key==='Enter') save(); if(e.key==='Escape'){ cuEditing=false; renderCuBar(); } });
      $('#cuCancel').addEventListener('click',()=>{ cuEditing=false; renderCuBar(); });
      return;
    }
    el.innerHTML=c.clickupListId
      ? `<span class="cu-tag">ClickUp</span><span class="cu-ok">Ações vão para a lista ${esc(c.clickupListId)}</span><button class="btn btn-ghost btn-sm" id="cuEdit" type="button">Trocar lista</button>`
      : `<span class="cu-tag">ClickUp</span><span class="cu-none">Nenhuma lista conectada a este cliente.</span><button class="btn btn-ghost btn-sm cu-connect" id="cuEdit" type="button">Conectar lista</button>`;
    $('#cuEdit').addEventListener('click',()=>{ cuEditing=true; renderCuBar(); });
  }
  async function pushAction(aid,btn){
    const c=S.clients.find(x=>x.id===S.selClient); const mid=S.selMeeting; const m=getM(mid); if(!c||!m) return;
    if(!c.clickupListId){ cuEditing=true; renderCuBar(); showNotice('Antes de subir, conecte a lista do ClickUp deste cliente.'); return; }
    const a=(m.acoes||[]).find(x=>x.id===aid); if(!a||!a.text.trim()) return;
    btn.disabled=true; btn.textContent='Enviando…';
    try{
      const hoje=new Date(); hoje.setHours(12,0,0,0);
      const r=await DB.pushTask({listId:c.clickupListId,name:`${c.name} - ${a.text.trim()}`,dueDate:hoje.getTime(),
        description:`Ação da reunião de ${fmtDate(m.date)} com ${c.name}${m.title?` (${m.title})`:''}.\nCriada pelo sistema de reuniões do Squad D.`});
      const cur=getM(mid); const acoes=(cur.acoes||[]).map(x=>Object.assign({},x)); const t=acoes.find(x=>x.id===aid);
      if(t){ t.clickupId=r.id; t.clickupUrl=r.url; queueSave(mid,{acoes}); }
      if(S.selMeeting===mid) renderChecklist();
    }catch(e){ btn.disabled=false; btn.textContent='↑ ClickUp'; showNotice(e.message); }
  }
  function renderMeta(){
    const el=$('#clientMeta'); if(!el) return;
    const ms=clientMeetings(S.selClient); const n=clientOpenCount(S.selClient);
    el.textContent=ms.length?`${ms.length} ${ms.length===1?'reunião registrada':'reuniões registradas'}, ${n} ${n===1?'ação pendente':'ações pendentes'}`:'Nenhuma reunião registrada ainda';
  }
  function renderTabs(){
    const el=$('#tabs'); if(!el) return; const ms=clientMeetings(S.selClient);
    el.innerHTML=`<button class="tab tab-new" id="newMeeting" type="button">+ Nova reunião</button>`+
      ms.map(m=>`<button class="tab" role="tab" data-mid="${esc(m.id)}" aria-selected="${m.id===S.selMeeting}">${esc(fmtDate(m.date))}${openActions(m).length?'<span class="dot" aria-label="tem ações pendentes"></span>':''}</button>`).join('');
    $('#newMeeting').addEventListener('click',newMeeting);
    el.querySelectorAll('[data-mid]').forEach(b=>b.addEventListener('click',()=>selectMeeting(b.dataset.mid)));
    renderMeta();
  }
  function renderTabDots(){
    const el=$('#tabs'); if(!el) return;
    el.querySelectorAll('[data-mid]').forEach(b=>{ const m=getM(b.dataset.mid); if(!m) return;
      const has=openActions(m).length>0, dot=b.querySelector('.dot');
      if(has&&!dot) b.insertAdjacentHTML('beforeend','<span class="dot" aria-label="tem ações pendentes"></span>');
      if(!has&&dot) dot.remove(); });
    renderMeta();
  }
  async function newMeeting(){
    if(!S.selClient) return;
    const ref={id:(crypto.randomUUID?crypto.randomUUID():uid()+uid())};
    const data={clientId:S.selClient,date:today(),title:'',pautas:'',acoes:[],createdAt:Date.now(),updatedAt:Date.now()};
    work[ref.id]=Object.assign({id:ref.id},data); S.meetings.push(Object.assign({id:ref.id},data));
    S.selMeeting=ref.id; renderTabs(); renderSheet();
    const t=$('#mTitle'); if(t) t.focus();
    creating[ref.id]=DB.createMeeting(Object.assign({id:ref.id},data));
    try{ await creating[ref.id]; }
    catch(e){ console.error(e); setStatus('Não foi possível criar a reunião'); }
  }

  /* Folha */
  function renderSheet(){
    const el=$('#sheet'); if(!el) return;
    const m=S.selMeeting?getM(S.selMeeting):null;
    if(!m){ el.innerHTML=`<div class="empty" style="padding:40px 0"><h2>Primeira reunião com este cliente</h2>Crie a reunião para anotar as pautas e as ações que saírem dela.<br><button class="btn btn-primary" id="emptyNew" type="button">Nova reunião</button></div>`;
      $('#emptyNew').addEventListener('click',newMeeting); return; }
    el.innerHTML=`<div class="sheet-bar">
        <input type="date" class="field-date" id="mDate" value="${esc(m.date||'')}" aria-label="Data da reunião">
        <input class="field-title" id="mTitle" value="${esc(m.title||'')}" placeholder="Assunto da reunião (opcional)" aria-label="Assunto da reunião">
        <span class="status" id="status" aria-live="polite">${pending[m.id]||inflight[m.id]?'Salvando…':'Salvo'}</span>
      </div>
      <div class="cols">
        <section class="card"><div class="card-h"><h2>Pautas da reunião</h2><p>O que vai ser discutido e o que foi falado</p></div>
          <textarea class="pautas" id="mPautas" placeholder="Escreva as pautas aqui…">${esc(m.pautas||'')}</textarea></section>
        <section class="card"><div class="card-h"><h2>Ações para aplicar após a reunião</h2><p>Enter cria a próxima. Marque quando estiver feita.</p></div>
          <div class="checklist" id="checklist"></div></section>
      </div>
      <div id="carry"></div>
      <div class="sheet-foot"><span></span><button class="btn btn-danger btn-sm" id="delMeeting" type="button">Excluir esta reunião</button></div>`;
    const id=m.id;
    $('#mDate').addEventListener('change',e=>{ queueSave(id,{date:e.target.value}); renderTabs(); });
    $('#mTitle').addEventListener('input',e=>queueSave(id,{title:e.target.value}));
    $('#mPautas').addEventListener('input',e=>queueSave(id,{pautas:e.target.value}));
    armButton($('#delMeeting'),'Confirmar exclusão',async()=>{
      clearTimeout(timers[id]); delete pending[id];
      try{ await DB.deleteMeeting(id); }catch(e){ setStatus('Não foi possível excluir'); return; }
      delete work[id]; S.meetings=S.meetings.filter(x=>x.id!==id);
      const ms=clientMeetings(S.selClient); S.selMeeting=ms.length?ms[0].id:null; renderTabs(); renderSheet(); renderSide();
    });
    renderChecklist(); renderCarry();
  }
  function autosize(t){ t.style.height='auto'; t.style.height=t.scrollHeight+'px'; }
  function renderChecklist(focusId,caretEnd){
    const box=$('#checklist'); if(!box) return; const m=getM(S.selMeeting); if(!m) return;
    box.innerHTML=(m.acoes||[]).map(a=>`<div class="item${a.done?' done':''}" data-aid="${esc(a.id)}">
      <input type="checkbox" ${a.done?'checked':''} aria-label="Marcar ação como feita">
      <textarea rows="1" aria-label="Ação">${esc(a.text)}</textarea>
      ${a.clickupUrl?`<a class="cu-link" href="${esc(a.clickupUrl)}" target="_blank" rel="noopener" title="Abrir a tarefa no ClickUp">No ClickUp ↗</a>`:`<button class="cu-btn" type="button" title="Criar esta ação como tarefa na lista do cliente no ClickUp">↑ ClickUp</button>`}
      <button class="rm" type="button" aria-label="Remover ação" title="Remover">×</button></div>`).join('')+
      `<div class="new-item"><span aria-hidden="true">+</span><input id="newAction" placeholder="Adicionar ação" aria-label="Adicionar ação"></div>`;
    box.querySelectorAll('textarea').forEach(autosize);
    if(focusId){ const t=box.querySelector(`[data-aid="${focusId}"] textarea`); if(t){ t.focus(); const p=caretEnd?t.value.length:0; t.setSelectionRange(p,p); } }
  }
  const curAcoes=()=>(getM(S.selMeeting)?.acoes||[]).map(a=>Object.assign({},a));
  const setAcoes=a=>queueSave(S.selMeeting,{acoes:a});

  document.addEventListener('input',e=>{
    const it=e.target.closest&&e.target.closest('#checklist .item'); if(!it||e.target.tagName!=='TEXTAREA') return;
    autosize(e.target); const acoes=curAcoes(); const a=acoes.find(x=>x.id===it.dataset.aid); if(!a) return;
    a.text=e.target.value; setAcoes(acoes);
  });
  document.addEventListener('change',e=>{
    const it=e.target.closest&&e.target.closest('#checklist .item');
    if(it&&e.target.type==='checkbox'){ const acoes=curAcoes(); const a=acoes.find(x=>x.id===it.dataset.aid); if(!a) return;
      a.done=e.target.checked; it.classList.toggle('done',a.done); setAcoes(acoes); renderCarry(); return; }
    const ci=e.target.closest&&e.target.closest('.carry-item');
    if(ci&&e.target.type==='checkbox'){ const m=getM(ci.dataset.mid); if(!m) return;
      const acoes=(m.acoes||[]).map(x=>Object.assign({},x)); const a=acoes.find(x=>x.id===ci.dataset.aid); if(!a) return;
      a.done=e.target.checked; queueSave(m.id,{acoes}); }
  });
  document.addEventListener('click',e=>{
    const cb=e.target.closest&&e.target.closest('#checklist .cu-btn');
    if(cb){ pushAction(cb.closest('.item').dataset.aid,cb); return; }
    const rm=e.target.closest&&e.target.closest('#checklist .rm'); if(!rm) return;
    const aid=rm.closest('.item').dataset.aid; const acoes=curAcoes(); const i=acoes.findIndex(x=>x.id===aid); if(i<0) return;
    acoes.splice(i,1); setAcoes(acoes); renderChecklist(acoes[i-1]?.id||acoes[i]?.id,true);
  });
  document.addEventListener('keydown',e=>{
    if(e.target.id==='newAction'&&e.key==='Enter'){ e.preventDefault(); const v=e.target.value.trim(); if(!v) return;
      const acoes=curAcoes(); acoes.push({id:uid(),text:v,done:false}); setAcoes(acoes); renderChecklist(); $('#newAction').focus(); return; }
    const it=e.target.closest&&e.target.closest('#checklist .item'); if(!it||e.target.tagName!=='TEXTAREA') return;
    if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); const acoes=curAcoes(); const i=acoes.findIndex(x=>x.id===it.dataset.aid);
      const n={id:uid(),text:'',done:false}; acoes.splice(i+1,0,n); setAcoes(acoes); renderChecklist(n.id); }
    else if(e.key==='Backspace'&&e.target.value===''){ e.preventDefault(); const acoes=curAcoes(); const i=acoes.findIndex(x=>x.id===it.dataset.aid); if(i<0) return;
      acoes.splice(i,1); setAcoes(acoes); if(acoes[i-1]) renderChecklist(acoes[i-1].id,true); else { renderChecklist(); $('#newAction').focus(); } }
  });
  function renderCarry(){
    const el=$('#carry'); if(!el) return; const cur=getM(S.selMeeting); const items=[];
    clientMeetings(S.selClient).forEach(m=>{ if(m.id===S.selMeeting) return; if(cur&&(m.date||'')>(cur.date||'')) return; openActions(m).forEach(a=>items.push({m,a})); });
    if(!items.length){ el.innerHTML=''; return; }
    el.innerHTML=`<div class="carry"><h3>Pendentes de reuniões anteriores</h3><p class="hint">Ações que ainda não foram marcadas como feitas. Dá pra marcar aqui mesmo.</p>
      ${items.map(({m,a})=>`<label class="carry-item" data-mid="${esc(m.id)}" data-aid="${esc(a.id)}"><input type="checkbox"><span>${esc(a.text)}<span class="from">de ${esc(fmtDate(m.date))}</span></span></label>`).join('')}</div>`;
  }
  function armButton(btn,armedText,fn){
    const orig=btn.textContent; let t=null;
    btn.addEventListener('click',()=>{
      if(btn.classList.contains('armed')){ clearTimeout(t); btn.classList.remove('armed'); btn.textContent=orig; fn(); return; }
      btn.classList.add('armed'); btn.textContent=armedText; t=setTimeout(()=>{ btn.classList.remove('armed'); btn.textContent=orig; },4000);
    });
  }

  /* Dados do banco (Supabase) */
  function onClients(list){
    S.clients=list.slice().sort((a,b)=>(a.order||0)-(b.order||0)||String(a.name).localeCompare(String(b.name),'pt-BR'));
    S.loaded.c=true;
    if(S.selClient&&!S.clients.find(c=>c.id===S.selClient)){ S.selClient=null; document.body.classList.remove('has-client'); renderMain(); }
    renderSide();
    const n=$('#clientName'); const c=S.clients.find(x=>x.id===S.selClient);
    if(n&&c&&document.activeElement!==n) n.value=c.name;
    if(c&&!cuEditing) renderCuBar();
  }
  function onMeetings(list){
    S.meetings=list;
    Object.keys(work).forEach(id=>{ if(!S.meetings.find(m=>m.id===id)&&(pending[id]||inflight[id]||work[id].createdAt>Date.now()-10000)) S.meetings.push(work[id]); });
    Object.keys(work).forEach(id=>{ if(!pending[id]&&!inflight[id]&&list.find(m=>m.id===id)) delete work[id]; });
    S.loaded.m=true; renderSide(); if(!S.selClient) return;
    if(S.selMeeting&&!S.meetings.find(m=>m.id===S.selMeeting)){ const ms=clientMeetings(S.selClient); S.selMeeting=ms.length?ms[0].id:null; renderTabs(); renderSheet(); return; }
    renderTabs();
    const sheet=$('#sheet'); const editing=sheet&&sheet.contains(document.activeElement);
    const id=S.selMeeting; if(!id){ renderSheet(); return; }
    if(!editing&&!pending[id]&&!inflight[id]){
      const m=getM(id); if(!m) return; const p=$('#mPautas'); if(!p){ renderSheet(); return; }
      if(p.value!==(m.pautas||'')) p.value=m.pautas||'';
      const t=$('#mTitle'); if(t&&t.value!==(m.title||'')) t.value=m.title||'';
      const d=$('#mDate'); if(d&&d.value!==(m.date||'')) d.value=m.date||'';
      renderChecklist();
    }
    renderCarry();
  }
  let loading=false, again=false, reloadTimer=null;
  async function reload(){
    if(loading){ again=true; return; }
    loading=true;
    try{
      const [cs,ms]=await Promise.all([DB.listClients(),DB.listMeetings()]);
      onClients(cs); onMeetings(ms);
    }catch(e){ console.error(e); showNotice('Não foi possível carregar os dados. Verifique a internet e recarregue a página.'); }
    finally{ loading=false; if(again){ again=false; reload(); } }
  }
  const reloadSoon=()=>{ clearTimeout(reloadTimer); reloadTimer=setTimeout(reload,400); };

  renderMain();
  if(!window.DB){ $('#clientList').innerHTML=''; showNotice('Não foi possível conectar ao banco. Confira o arquivo assets/js/config.js.'); return; }
  reload();
  DB.onChange(reloadSoon);
  window.addEventListener('focus',reloadSoon);
})();
