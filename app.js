const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
let ads=[], voiceTurn=0, level='medio', playing=false, createMode='normal';
let capClientReady=false;
const defaults={musicVol:'75',bedVol:'6',jingles:true,mentionStore:false,fullCurrency:false,open:'08:00',close:'20:00'};
let store={name:'Açougue Uberaba',type:'Açougue',code:'123456',ramo:'Açougue'};

function admClients(){try{return JSON.parse(localStorage.getItem('capivara_admin_clients')||'[]')}catch(e){return []}}
function admPackages(){try{return JSON.parse(localStorage.getItem('capivara_ramo_packages_v6')||'{}')}catch(e){return {}}}
function capClientKey(base){return base+'__'+String(store.code||'SEM_CLIENTE')}
function capClientAudioKey(id){return 'cliente:'+String(store.code)+':audio:'+id}

function capLoadClient(){
 if(!store.code)return;
 capClientReady=true;
 try{ads=JSON.parse(localStorage.getItem(capClientKey('cap_ads'))||'[]')}catch(e){ads=[]}
 if(!Array.isArray(ads))ads=[];
 voiceTurn=+(localStorage.getItem(capClientKey('cap_voice'))||'0');
 level=localStorage.getItem(capClientKey('cap_level'))||'medio';
 pendingAudio={};
 try{capAdCursorV16=0}catch(e){}
}

const THEMES_V11=["Jazz & Lounge","Sertanejo","MPB & Brasilidades","Flashback","Dance & Pop","Moderno / Hits","Rock & Clássicos","Instrumental & Ambiente","Leve & Relax","Popular & Animada"];
let selectedThemeV11=localStorage.getItem('capivara_theme_'+store.code)||THEMES_V11[0],pendingThemeV11=null;

function applyAdmStore(c){
 try{if(window.capCurrentSpokenAudio){window.capCurrentSpokenAudio.pause();window.capCurrentSpokenAudio=null}}catch(e){}
 try{if(radioAudio){radioAudio.pause();radioAudio=null}}catch(e){}
 store={name:c.name,type:c.ramo,ramo:c.ramo,code:c.code};
 capLoadClient();
 selectedThemeV11=localStorage.getItem('capivara_theme_'+store.code)||THEMES_V11[0];
 const sn=document.getElementById('storeName');if(sn)sn.textContent=c.name;
 const pkg=admPackages()[c.ramo]||{};
 const legacyMap={'Leve':2,'Médio':3,'Frenético':5};
 const adminCfg=(()=>{try{return JSON.parse(localStorage.getItem('capivara_admin_settings')||'{}')}catch(e){return {}}})();
 const q=pkg.adsPerBlock||legacyMap[pkg.mode]||adminCfg.defaultAdsPerBlock||3;
 setTimeout(()=>setAdsPerBlock(q,false),0);
 renderThemesV11();updateAdmStatus();loadRamoProducts();
}

function themeMusicV11(theme){
 try{return JSON.parse(localStorage.getItem('capivara_acervo_v9')||'[]').filter(m=>(m.theme||THEMES_V11[0])===theme)}catch(e){return []}
}

function chooseThemeV11(theme){
 if(playing){pendingThemeV11=theme;renderThemesV11();return}
 selectedThemeV11=theme;
 localStorage.setItem('capivara_theme_'+store.code,theme);
 radioIndex=0;renderThemesV11();updateAdmStatus();
}

function renderThemesV11(){
 const box=document.getElementById('themeButtonsV11');if(!box)return;
 box.innerHTML=THEMES_V11.map(t=>`<button class="${selectedThemeV11===t?'active':''} ${pendingThemeV11===t?'pending':''}" onclick="chooseThemeV11('${t.replace("'","\\'")}')">${t}</button>`).join('');
 const st=document.getElementById('themeStateV11');
 if(st)st.textContent=pendingThemeV11?`⏳ ${pendingThemeV11} entra quando a música atual terminar.`:`🟢 Tema ativo: ${selectedThemeV11}`;
}

window.chooseThemeV11=chooseThemeV11;

function updateAdmStatus(){
 const e=document.getElementById('admSyncInfo'),n=themeMusicV11(selectedThemeV11).length;
 if(e)e.innerHTML=`✅ ${store.ramo} • <b>${selectedThemeV11}</b> • ${n} música${n===1?'':'s'} no acervo`;
 renderThemesV11();
}

const productCatalogs={
'Açougue':['Picanha','Alcatra','Contrafilé','Patinho','Acém','Costela','Frango','Linguiça','Pernil','Carne Moída','Maminha','Cupim','Coxão Mole','Coxão Duro','Fraldinha'],
'Supermercado':['Arroz','Feijão','Açúcar','Café','Óleo','Leite','Macarrão','Farinha de Trigo','Carne','Frango','Ovos','Papel Higiênico','Sabão em Pó','Refrigerante','Cerveja'],
'Farmácia':['Fraldas','Lenços Umedecidos','Shampoo','Condicionador','Sabonete','Desodorante','Protetor Solar','Hidratante','Creme Dental','Escova Dental','Absorvente','Preservativo','Vitaminas','Repelente','Algodão'],
'Padaria':['Pão Francês','Pão de Queijo','Pão Doce','Bolo','Rosca','Sonho','Croissant','Salgados','Coxinha','Empada','Presunto','Muçarela','Leite','Café','Refrigerante'],
'Hortifruti':['Banana','Maçã','Laranja','Mamão','Limão','Abacaxi','Manga','Uva','Tomate','Batata','Cebola','Cenoura','Alface','Couve','Ovos'],
'Pet Shop':['Ração para Cães','Ração para Gatos','Petiscos','Areia para Gatos','Shampoo Pet','Antipulgas','Brinquedos','Coleiras','Guias','Camas','Tapete Higiênico','Comedouros','Sachês','Ossinhos','Banho e Tosa'],
'Pizzaria':['Pizza Calabresa','Pizza Muçarela','Pizza Portuguesa','Pizza Frango com Catupiry','Pizza Marguerita','Pizza Quatro Queijos','Pizza Bacon','Pizza Carne Seca','Pizza Chocolate','Pizza Doce','Pizza Família','Combo Pizza + Refrigerante','Refrigerante','Borda Recheada','Delivery'],
'Lanchonete':['X-Burguer','X-Salada','X-Bacon','X-Tudo','Hambúrguer Artesanal','Cachorro-Quente','Misto Quente','Batata Frita','Salgados','Coxinha','Pastel','Açaí','Suco','Refrigerante','Combo'],
'Restaurante':['Prato Feito','Self-Service','Marmitex','Almoço Executivo','Feijoada','Churrasco','Frango','Peixe','Massas','Saladas','Sobremesa','Suco','Refrigerante','Delivery','Combo do Dia'],
'Hotel / Pousada':['Diária','Suíte','Quarto Casal','Quarto Família','Café da Manhã','Pacote de Fim de Semana','Pacote Romântico','Feriado','Piscina','Restaurante','Estacionamento','Wi-Fi','Day Use','Evento','Reserva Antecipada'],
'Roupas':['Camiseta','Camisa','Calça Jeans','Bermuda','Vestido','Blusa','Short','Saia','Conjunto','Jaqueta','Moletom','Roupa Infantil','Moda Íntima','Pijama','Promoção da Coleção'],
'Calçados':['Tênis','Sapato Social','Sandália','Chinelo','Sapatilha','Bota','Tênis Infantil','Sandália Infantil','Sapato Infantil','Rasteirinha','Scarpin','Mocassim','Papete','Chuteira','Promoção de Calçados'],
'Material de Construção':['Cimento','Areia','Brita','Tijolo','Telha','Argamassa','Tinta','Piso','Revestimento','Tubo PVC','Caixa d’Água','Ferramentas','Portas','Janelas','Material Elétrico'],
'Autopeças':['Óleo do Motor','Filtro de Óleo','Filtro de Ar','Pastilha de Freio','Bateria','Palheta','Lâmpada','Correia','Vela de Ignição','Amortecedor','Pneu','Aditivo','Kit Embreagem','Rolamento','Acessórios'],
'Oficina / Auto Center':['Troca de Óleo','Alinhamento','Balanceamento','Freios','Suspensão','Troca de Pneus','Revisão','Ar-Condicionado','Injeção Eletrônica','Embreagem','Bateria','Escapamento','Correia Dentada','Diagnóstico','Higienização'],
'Posto / Conveniência':['Gasolina','Etanol','Diesel','Óleo Lubrificante','Aditivo','Calibragem','Lavagem','Café','Água','Refrigerante','Energético','Salgados','Sanduíche','Gelo','Carvão'],
'Cosméticos / Perfumaria':['Perfume Feminino','Perfume Masculino','Hidratante','Shampoo','Condicionador','Maquiagem','Batom','Base','Protetor Solar','Desodorante','Kit Presente','Creme Facial','Esmalte','Sabonete','Produtos para Cabelo'],
'Ótica':['Óculos de Grau','Óculos de Sol','Armação Feminina','Armação Masculina','Armação Infantil','Lentes','Lentes Multifocais','Lentes de Contato','Antirreflexo','Filtro de Luz Azul','Clip-on','Exame de Vista','Ajuste de Armação','Kit Limpeza','Promoção de Armações'],
'Papelaria':['Caderno','Caneta','Lápis','Borracha','Mochila','Estojo','Papel A4','Impressão','Xerox','Material Escolar','Cartolina','Cola','Tesoura','Agenda','Kit Escolar'],
'Móveis / Eletro':['Sofá','Cama','Colchão','Guarda-Roupa','Mesa','Cadeira','Rack','Geladeira','Fogão','Máquina de Lavar','Televisão','Micro-ondas','Ventilador','Air Fryer','Liquidificador'],
'Agropecuária / Rações':['Ração para Cães','Ração para Gatos','Ração para Aves','Ração para Equinos','Ração para Bovinos','Milho','Sal Mineral','Sementes','Adubo','Ferramentas','Bebedouro','Comedouro','Produtos Veterinários','Selaria','Acessórios Rurais'],
'Distribuidora de Bebidas':['Água','Refrigerante','Suco','Energético','Cerveja','Gelo','Água com Gás','Isotônico','Chá Gelado','Tônica','Carvão','Copos Descartáveis','Combo para Festa','Fardo de Água','Fardo de Refrigerante'],
'Utilidades / Variedades':['Panelas','Potes','Copos','Pratos','Talheres','Baldes','Vassouras','Produtos de Limpeza','Organizadores','Toalhas','Tapetes','Ferramentas','Brinquedos','Material Escolar','Itens para Cozinha']
};

function normRamo(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()}
function catalogForRamo(r){const k=Object.keys(productCatalogs).find(x=>normRamo(x)===normRamo(r));return k?productCatalogs[k].map(x=>x.toLowerCase()):[]}
function productKey(){return 'cap_products_'+String(store.code||'semcodigo')}
let products=catalogForRamo(store.ramo||store.type),selectedProduct='';

function loadRamoProducts(){
 let saved=null;try{saved=JSON.parse(localStorage.getItem(productKey())||'null')}catch(e){}
 const base=catalogForRamo(store.ramo||store.type);
 products=Array.isArray(saved)&&saved.length===15?saved:[...base];
 localStorage.setItem(productKey(),JSON.stringify(products));
 if(typeof renderProducts==='function')renderProducts();
 if(typeof renderProductEditor==='function')renderProductEditor();
}

function saveProducts(){localStorage.setItem(productKey(),JSON.stringify(products));renderProducts();renderProductEditor()}

function selectProduct(name){
 selectedProduct=name;
 $('#selectedName').textContent=name;
 $('#selectedProduct').classList.remove('hidden');
 $$('#favorites button').forEach(b=>b.classList.toggle('selected',b.dataset.product===name));
 $('#price').focus();
}

function renderProducts(){
 const fav=$('#favorites');fav.innerHTML='';
 products.forEach((name,i)=>{
  const b=document.createElement('button');
  b.type='button';b.dataset.product=name;
  b.title='clique para usar • duplo clique para editar';
  b.innerHTML=`<span>${name}</span>`;
  b.onclick=()=>selectProduct(name);
  b.ondblclick=(e)=>{
   e.preventDefault();
   const v=prompt('editar produto',products[i]);
   if(v&&v.trim()){products[i]=v.trim().toLowerCase();saveProducts()}
  };
  fav.appendChild(b)
 })
}

function renderProductEditor(){
 const box=$('#productEditor');box.innerHTML='';
 products.forEach((name,i)=>{
  const row=document.createElement('div');
  row.className='product-edit-row';
  row.innerHTML=`<b>${i+1}</b><input value="${name.replace(/"/g,'&quot;')}" maxlength="35">`;
  const inp=row.querySelector('input');
  inp.onchange=()=>{
   const v=inp.value.trim().toLowerCase();
   if(v){products[i]=v;saveProducts()}
  };
  box.appendChild(row)
 })
}

$('#clearProduct').onclick=()=>{
 selectedProduct='';
 $('#selectedProduct').classList.add('hidden');
 $('#price').value='';
 $$('#favorites button').forEach(b=>b.classList.remove('selected'))
};

$('#resetProducts').onclick=()=>{products=catalogForRamo(store.ramo||store.type);saveProducts()};

$('#price').addEventListener('input',e=>{
 let digits=e.target.value.replace(/\D/g,'').slice(0,8);
 if(!digits){e.target.value='';return}
 let n=parseInt(digits,10);
 e.target.value=(n/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
});

renderProducts();renderProductEditor();

function dayKey(ts=Date.now()){return new Date(ts).toLocaleDateString('en-CA')}

function capLimits(){
 let c={};
 try{c=JSON.parse(localStorage.getItem('capivara_admin_settings')||'{}')}catch{}
 return {
  daily:Math.max(1,parseInt(c.dailyLimit||15,10)),
  weekly:Math.max(1,parseInt(c.weeklyLimit||75,10)),
  top:Math.max(0,parseInt(c.topDailyLimit??1,10))
 }
}

function capWeekKey(){
 const d=new Date(),x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
 const day=x.getUTCDay()||7;
 x.setUTCDate(x.getUTCDate()+4-day);
 const y0=new Date(Date.UTC(x.getUTCFullYear(),0,1));
 return x.getUTCFullYear()+'-W'+String(Math.ceil((((x-y0)/86400000)+1)/7)).padStart(2,'0')
}

function weeklyUsage(){
 const k='cap_weekly_usage_'+store.code,w=JSON.parse(localStorage.getItem(k)||'{}'),wk=capWeekKey();
 return w.week===wk?w:{week:wk,count:0}
}
function weekCreated(){return weeklyUsage().count}

function usage(){
 const u=JSON.parse(localStorage.getItem(capClientKey('cap_daily_usage'))||'{}');
 if(u.day!==dayKey())return {day:dayKey(),count:0,topCount:0};
 if(u.topCount==null)u.topCount=u.top?1:0;
 return u
}

function todayCreated(){return usage().count}
function topCreatedToday(){return usage().topCount||0}

function registerUse(isTop){
 const u=usage();
 u.count=(u.count||0)+1;
 if(isTop)u.topCount=(u.topCount||0)+1;
 delete u.top;
 localStorage.setItem(capClientKey('cap_daily_usage'),JSON.stringify(u));
 const w=weeklyUsage();
 w.count=(w.count||0)+1;
 localStorage.setItem('cap_weekly_usage_'+store.code,JSON.stringify(w))
}

function refreshQuota(){
 const lim=capLimits(),used=todayCreated(),full=used>=lim.daily||weekCreated()>=lim.weekly,topUsed=topCreatedToday(),topFull=topUsed>=lim.top;
 $('#dailyCount').textContent=used;
 $('#suggest').classList.toggle('quota-full',full);
 $('#topDay').classList.toggle('quota-full',full||topFull);
 $('#topDay').textContent=topFull?'✓ LIMITE TOP ATINGIDO':'🔥 TOP DO DIA';
}

function setCreateMode(mode){
 createMode=mode;
 const top=mode==='top';
 $('#topStatus').classList.toggle('hidden',!top);
 $('#topDay').classList.toggle('active',top);
}

$('#topDay').onclick=()=>{
 if(todayCreated()>=capLimits().daily){alert('O limite diário de anúncios foi atingido.');return}
 if(weekCreated()>=capLimits().weekly){alert('O limite semanal de anúncios foi atingido.');return}
 if(topCreatedToday()>=capLimits().top){alert('O limite diário de TOP foi atingido.');return}
 setCreateMode(createMode==='top'?'normal':'top');
};

function saveAds(){
 if(!capClientReady)return;
 localStorage.setItem(capClientKey('cap_ads'),JSON.stringify(ads));
 renderAds()
}

function renderAds(){
 const box=$('#ads');box.innerHTML='';
 const now=Date.now();
 ads=ads.filter(a=>!a.exp||a.exp>now);
 if(capClientReady)localStorage.setItem(capClientKey('cap_ads'),JSON.stringify(ads));
 refreshQuota();
 if(!ads.length)box.innerHTML='<div class="empty">Nenhum anúncio ativo.</div>';
 ads.forEach((a,i)=>{
  let d=document.createElement('div');
  d.className='ad'+(a.top?' top-ad':'');
  const label=a.label||a.product||'anúncio';
  d.innerHTML=`<div class="copy"><b>${a.top?'<span class="top-badge">🔥 TOP DO DIA</span>':''}${label}</b><small>${a.voice} • ${a.paused?'Pausado':'Na programação'} • ${a.exp?new Date(a.exp).toLocaleDateString('pt-BR'):'Sempre'}</small><div class="ad-hidden-text hidden">${a.text||''}</div></div><button data-v="${i}">ver texto</button><button data-p="${i}">${a.paused?'▶':'⏸'}</button><button data-d="${i}">🗑</button>`;
  box.appendChild(d)
 });
 $$('[data-v]').forEach(b=>b.onclick=()=>{
  const el=b.closest('.ad').querySelector('.ad-hidden-text');
  el.classList.toggle('hidden');
  b.textContent=el.classList.contains('hidden')?'ver texto':'ocultar'
 });
 $$('[data-p]').forEach(b=>b.onclick=()=>{
  ads[b.dataset.p].paused=!ads[b.dataset.p].paused;
  saveAds();renderCreatedAudiosV19()
 });
 $$('[data-d]').forEach(b=>b.onclick=()=>{
  ads.splice(b.dataset.d,1);
  saveAds();renderCreatedAudiosV19()
 });
}

const CAP_SERVER_V50='https://capivara-radio-server.onrender.com';

async function capServerClientV50(code){
 const ctrl=new AbortController();
 const timer=setTimeout(()=>ctrl.abort(),10000);
 try{
  const r=await fetch(CAP_SERVER_V50+'/api/client/'+encodeURIComponent(code)+'?t='+Date.now(),{
   signal:ctrl.signal,
   cache:'no-store',
   headers:{Accept:'application/json'}
  });
  let data=null;
  try{data=await r.json()}catch(e){}
  if(r.status===404)return null;
  if(!r.ok)throw new Error('Servidor '+r.status);
  const c=data?.client||data?.data||data;
  if(!c||!(c.code||c.codigo))return null;
  return {
   name:c.name||c.nome||c.storeName||'Loja',
   ramo:c.ramo||c.activity||c.segment||'Açougue',
   type:c.ramo||c.activity||c.segment||'Açougue',
   code:String(c.code||c.codigo),
   active:c.active!==false&&c.ativo!==false
  };
 }finally{
  clearTimeout(timer)
 }
}

async function capLoginVFINAL(){
 const input=document.getElementById('code');
 const btn=document.getElementById('enter');
 const msg=document.getElementById('loginMsg');
 if(!input||!btn)return;

 const code=String(input.value||'').replace(/\D/g,'').slice(0,6);
 input.value=code;
 if(code.length!==6){
  if(msg)msg.textContent='Digite o código de 6 dígitos';
  input.focus();
  return;
 }

 const old=btn.textContent||'ENTRAR';
 btn.disabled=true;
 btn.textContent='CONECTANDO...';
 if(msg)msg.textContent='';

 try{
  const c=await capServerClientV50(code);
  if(!c){
   if(msg)msg.textContent='Código não encontrado';
   return;
  }
  if(!c.active){
   if(msg)msg.textContent='Rádio bloqueada pelo administrador';
   return;
  }

  applyAdmStore(c);
  document.getElementById('login')?.classList.add('hidden');
  document.getElementById('app')?.classList.remove('hidden');
  if(msg)msg.textContent='';
  try{renderAds()}catch(e){}
  try{renderCreatedAudiosV19()}catch(e){}
  try{capPullClientStateV50()}catch(e){}
 }catch(e){
  console.error('LOGIN:',e);
  if(msg)msg.textContent=e?.name==='AbortError'
   ?'Servidor demorou para responder. Tente novamente.'
   :'Não foi possível conectar ao servidor';
 }finally{
  btn.disabled=false;
  btn.textContent=old;
 }
}

(function(){
 const bind=()=>{
  const input=document.getElementById('code');
  const btn=document.getElementById('enter');
  if(input){
   input.disabled=false;
   input.readOnly=false;
   input.oninput=()=>{input.value=input.value.replace(/\D/g,'').slice(0,6)};
   input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();capLoginVFINAL()}};
  }
  if(btn){
   btn.disabled=false;
   btn.onclick=capLoginVFINAL;
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
 else bind();
})();

$$('.tab').forEach(b=>b.onclick=()=>{
 $$('.tab').forEach(x=>x.classList.remove('active'));
 $$('.page').forEach(x=>x.classList.remove('active'));
 b.classList.add('active');
 $('#'+b.dataset.tab).classList.add('active')
});

function promptForGemini(q){
 const mention=$('#mentionStore').checked,full=$('#fullCurrency').checked,top=createMode==='top';
 return `você é um redator de rádio comercial brasileiro especialista em ${store.type}. crie uma chamada natural e forte para locução. ${top?'este é o anúncio top do dia: dê mais impacto, urgência e exclusividade, sem exageros enganosos.':''} a chamada deve ter no máximo 150 caracteres. escreva em letras minúsculas. não use emojis. ${mention?`pode mencionar o nome ${store.name}.`:'não mencione o nome do estabelecimento.'} transforme números e preços em palavras para a fala. ${full?'em preços, fale reais e centavos por extenso.':'em preços, não diga as palavras reais ou centavos; exemplo: 4,77 deve virar quatro e setenta e sete.'} informação do cliente: ${q}. responda somente com a frase, sem aspas e sem explicações.`
}

async function createTexts(){
 if(todayCreated()>=capLimits().daily){alert('O limite diário de anúncios foi atingido.');return}
 if(weekCreated()>=capLimits().weekly){alert('O limite semanal de anúncios foi atingido.');return}
 if(createMode==='top'&&topCreatedToday()>=capLimits().top){alert('O limite diário de TOP foi atingido.');return}

 let q=$('#brief').value.trim();
 if(selectedProduct){
  const price=$('#price').value.trim();
  q=(q?q+'; ':'')+selectedProduct+(price?'; preço '+price:'');
 }
 if(!q)return;

 const btn=$('#suggest');
 if(btn){btn.disabled=true;btn.textContent='CRIANDO...'}

 try{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000);
  let r;
  try{
   r=await fetch(CAP_SERVER_V50+'/api/ai/generate',{
    method:'POST',
    signal:ctrl.signal,
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({
     prompt:promptForGemini(q),
     text:q,
     pedido:q,
     ramo:store?.ramo||store?.type||'',
     produto:selectedProduct||'',
     preco:($('#price')?.value||'').trim(),
     top:createMode==='top',
     mentionStore:$('#mentionStore')?.checked===true,
     fullCurrency:$('#fullCurrency')?.checked===true,
     storeName:store?.name||'',
     maxChars:150
    })
   });
  }finally{clearTimeout(timer)}

  let data={};try{data=await r.json()}catch{}
  if(!r.ok)throw new Error(data?.error||data?.message||('Servidor '+r.status));

  let raw=data?.text||data?.frase||data?.response||data?.generated_text||data?.data?.text||'';
  raw=String(raw||'').trim()
   .replace(/^```(?:json)?\s*/i,'')
   .replace(/```$/,'')
   .trim()
   .replace(/^["']|["']$/g,'');

  if(!raw)throw new Error('O servidor não retornou a frase.');

  const generated=raw.toLowerCase().slice(0,150);
  if($('#text1'))$('#text1').value=generated;
  $('#brief').value=generated;
  if($('#suggestions'))$('#suggestions').classList.add('hidden');
  updateCounts();
  document.body.dataset.v24stage='phrase';

 }catch(e){
  console.error(e);
  alert('Não foi possível criar agora.\n\n'+(e.name==='AbortError'?'Servidor demorou para responder.':e.message));
 }finally{
  if(btn){btn.disabled=false;btn.textContent='✨ CRIAR ANÚNCIO'}
 }
}

$('#suggest').onclick=createTexts;

function updateCounts(){}

['1','2'].forEach(n=>$('#text'+n).oninput=()=>{
 let el=$('#text'+n);
 el.value=el.value.toLowerCase().slice(0,150);
 updateCounts()
});

let pendingAudio={};

function capAdDb(){
 return new Promise((ok,no)=>{
  const r=indexedDB.open('CapivaraAdsV19',1);
  r.onupgradeneeded=()=>{
   if(!r.result.objectStoreNames.contains('audio'))r.result.createObjectStore('audio')
  };
  r.onsuccess=()=>ok(r.result);
  r.onerror=()=>no(r.error)
 })
}

async function capSaveAdBlob(key,blob){
 const d=await capAdDb();
 return new Promise((ok,no)=>{
  const r=d.transaction('audio','readwrite').objectStore('audio').put(blob,key);
  r.onsuccess=()=>ok(true);
  r.onerror=()=>no(r.error)
 })
}

async function capGetAdBlob(key){
 const d=await capAdDb();
 return new Promise((ok,no)=>{
  const r=d.transaction('audio').objectStore('audio').get(key);
  r.onsuccess=()=>ok(r.result);
  r.onerror=()=>no(r.error)
 })
}

function capAudioLabel(){
 const product=(selectedProduct||'anúncio').trim(),
 price=($('#price')?.value||'').trim();
 return price?product+' • '+price:product
}

async function capGenerateAudioDirectV201(text){
 text=String(text||'').trim().toLowerCase().slice(0,150);
 if(!text)throw new Error('O texto do anúncio está vazio.');

 const last=[...ads].reverse().find(a=>a&&a.voice);
 const lastWasMale=last&&/mascul|homem/i.test(last.voice||'');
 const lastWasFemale=last&&/femin|mulher/i.test(last.voice||'');
 const female=lastWasMale?true:lastWasFemale?false:false;
 const voiceName=female?'Voz feminina':'Voz masculina';

 const r=await fetch(CAP_SERVER_V50+'/api/voice/generate',{
  method:'POST',
  headers:{
   'Content-Type':'application/json',
   'Accept':'audio/mpeg'
  },
  body:JSON.stringify({
   text,
   voiceType:female?'adFemale':'adMale'
  })
 });

 if(!r.ok){
  let detail='';
  try{
   const ct=r.headers.get('content-type')||'';
   detail=ct.includes('application/json')
    ?JSON.stringify(await r.json())
    :await r.text()
  }catch{}
  throw new Error('Servidor de voz '+r.status+(detail?' — '+detail.slice(0,180):''));
 }

 const blob=await r.blob();
 if(!blob||!blob.size)throw new Error('O servidor não retornou áudio.');

 return {
  text,
  voice:voiceName,
  blob,
  top:createMode==='top',
  label:capAudioLabel(),
  product:selectedProduct||'',
  price:($('#price')?.value||'').trim()
 };
}

async function generateVoice(n,btn){
 let text=$('#text'+n).value.trim().toLowerCase().slice(0,150);
 if(!text)return;

 btn.disabled=true;
 btn.textContent='GERANDO...';

 try{
  const p=await capGenerateAudioDirectV201(text);

  if(pendingAudio[n]?.url)URL.revokeObjectURL(pendingAudio[n].url);

  const url=URL.createObjectURL(p.blob);
  pendingAudio[n]={...p,url};

  $('#audio'+n).src=url;
  $('#actions'+n).classList.remove('hidden');
  btn.textContent='✓ ÁUDIO PRONTO';

 }catch(e){
  console.error(e);
  alert('ERRO AO GERAR ÁUDIO\n\n'+e.message);
  btn.textContent='🎙 GERAR ÁUDIO';
 }finally{
  btn.disabled=false
 }
}

$$('[data-gen]').forEach(b=>b.onclick=()=>generateVoice(b.dataset.gen,b));

function playTopSting(){
 try{
  const C=window.AudioContext||window.webkitAudioContext,
  ctx=new C(),
  g=ctx.createGain();

  g.connect(ctx.destination);
  g.gain.setValueAtTime(.0001,ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(.18,ctx.currentTime+.03);
  g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+1.05);

  [[392,0],[523.25,.18],[659.25,.36],[784,.58]].forEach(([f,t])=>{
   const o=ctx.createOscillator();
   o.type='sine';
   o.frequency.value=f;
   o.connect(g);
   o.start(ctx.currentTime+t);
   o.stop(ctx.currentTime+t+.32)
  });

  return new Promise(r=>setTimeout(()=>{
   ctx.close();r()
  },1120))
 }catch{
  return Promise.resolve()
 }
}

$$('[data-preview]').forEach(b=>b.onclick=async()=>{
 const n=b.dataset.preview,a=$('#audio'+n);
 if(!a.src)return;
 if(pendingAudio[n]?.top)await playTopSting();
 a.currentTime=0;
 a.play().catch(()=>alert('Não foi possível tocar a prévia.'));
});

$$('[data-queue]').forEach(b=>b.onclick=async()=>{
 const n=b.dataset.queue,p=pendingAudio[n];
 if(!p)return;

 let days=+$('#duration').value,
 exp=days?Date.now()+days*86400000:null;

 if(todayCreated()>=capLimits().daily){
  alert('O limite diário de anúncios foi atingido.');return
 }
 if(weekCreated()>=capLimits().weekly){
  alert('O limite semanal de anúncios foi atingido.');return
 }
 if(p.top&&topCreatedToday()>=capLimits().top){
  alert('O limite diário de TOP foi atingido.');return
 }

 const id='ad_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
 audioKey=capClientAudioKey(id);

 try{
  await capSaveAdBlob(audioKey,p.blob)
 }catch(e){
  alert('Não foi possível salvar o áudio.');return
 }

 ads.push({
  id,
  label:p.label,
  product:p.product,
  price:p.price,
  text:p.text,
  voice:p.voice,
  paused:false,
  exp,
  audioKey,
  top:!!p.top,
  createdDay:dayKey()
 });

 registerUse(!!p.top);

 localStorage.setItem(
  capClientKey('cap_voice_queued_count'),
  String(+(localStorage.getItem(capClientKey('cap_voice_queued_count'))||0)+1)
 );

 pendingAudio[n]=null;
 $('#actions'+n).classList.add('hidden');
 $('#audio'+n).removeAttribute('src');

 b.textContent='✓ NA PROGRAMAÇÃO';
 setTimeout(()=>b.textContent='➕ MANDAR PRA FILA',900);

 saveAds();
 renderCreatedAudiosV19();
 capResetCreateV20();
 capStageV21('start');

 if(p.top)setCreateMode('normal');
});

function setAdsPerBlock(v,save=true){
 const n=Math.max(1,parseInt(v||'3',10));
 const el=$('#adsPerBlock');
 if(el)el.value=n;
 if(save)localStorage.setItem('cap_ads_per_block_'+store.code,n);

 $('#cycle').textContent=`🎵 Música → 🔊 Entrada → 📢 ${n} anúncio${n>1?'s':''} → 🔊 Saída → 🎵 Música${topCreatedToday()?' • 🔥 TOP entra após a música, com vinheta exclusiva':''}`;
}

const adsBlockInput=$('#adsPerBlock');

if(adsBlockInput){
 adsBlockInput.oninput=()=>setAdsPerBlock(adsBlockInput.value,true);

 const c=(()=>{
  try{return JSON.parse(localStorage.getItem('capivara_admin_settings')||'{}')}
  catch(e){return {}}
 })();

 setAdsPerBlock(
  localStorage.getItem('cap_ads_per_block_'+store.code)||
  c.defaultAdsPerBlock||
  3,
  false
 );
}

let radioAudio=null,radioIndex=0;

function acervoDb(){
 return new Promise((ok,no)=>{
  const r=indexedDB.open('CapivaraAcervoV9',1);
  r.onupgradeneeded=()=>{
   if(!r.result.objectStoreNames.contains('files'))r.result.createObjectStore('files')
  };
  r.onsuccess=()=>ok(r.result);
  r.onerror=()=>no(r.error)
 })
}

async function acervoBlob(id){
 const d=await acervoDb();
 return new Promise((ok,no)=>{
  const r=d.transaction('files').objectStore('files').get('music:'+id);
  r.onsuccess=()=>ok(r.result);
  r.onerror=()=>no(r.error)
 })
}

async function playNextAdmMusic(){
 if(!playing)return;

 if(pendingThemeV11){
  selectedThemeV11=pendingThemeV11;
  pendingThemeV11=null;
  localStorage.setItem('capivara_theme_'+store.code,selectedThemeV11);
  radioIndex=0;
  renderThemesV11();
  updateAdmStatus()
 }

 const list=themeMusicV11(selectedThemeV11);

 if(!list.length){
  $('#nowTitle').textContent='Tema sem músicas';
  $('#nowSub').textContent='Escolha outro tema ou aguarde o ADM adicionar músicas.';
  playing=false;
  syncPlayUi();
  return
 }

 if(radioIndex>=list.length)radioIndex=0;

 const meta=list[radioIndex++],
 blob=await acervoBlob(meta.id);

 if(!blob){
  $('#nowTitle').textContent='Música indisponível neste navegador';
  $('#nowSub').textContent='Na versão online, os arquivos virão do servidor.';
  setTimeout(playNextAdmMusic,1000);
  return
 }

 if(radioAudio){
  radioAudio.pause();
  if(radioAudio._u)URL.revokeObjectURL(radioAudio._u)
 }

 const u=URL.createObjectURL(blob);
 radioAudio=new Audio(u);
 radioAudio._u=u;
 radioAudio.volume=(+($('#musicVol').value||75))/100;

 $('#nowTitle').textContent=meta.name;
 $('#nowSub').textContent=`🎵 ${selectedThemeV11} • ${store.name}`;

 radioAudio.onended=()=>{
  URL.revokeObjectURL(u);
  capRadioAfterMusicV16()
 };

 radioAudio.play().catch(()=>{
  playing=false;
  syncPlayUi();
  alert('Clique novamente em INICIAR RÁDIO.')
 });
}

function syncPlayUi(){
 $('#play').textContent=playing?'⏸ PAUSAR RÁDIO':'▶ INICIAR RÁDIO';
 $('#onair').textContent=playing?'● NO AR':'● PAUSADA';
 $('#onair').style.color=playing?'#16813c':'#8b9890'
}

$('#play').onclick=()=>{
 playing=!playing;
 syncPlayUi();

 if(playing){
  playNextAdmMusic()
 }else{
  if(radioAudio)radioAudio.pause();
  $('#nowTitle').textContent='Rádio pausada';
  $('#nowSub').textContent='Escolha um tema e inicie quando quiser'
 }
};

window.addEventListener('storage',()=>{updateAdmStatus()});

['musicVol','bedVol','open','close'].forEach(id=>{
 let v=localStorage.getItem('cap_'+id);
 if(v!==null)$('#'+id).value=v;
 $('#'+id).oninput=()=>localStorage.setItem('cap_'+id,$('#'+id).value)
});

['jingles','mentionStore','fullCurrency'].forEach(id=>{
 let v=localStorage.getItem('cap_'+id);
 $('#'+id).checked=v===null?defaults[id]:v==='true';
 $('#'+id).onchange=()=>localStorage.setItem('cap_'+id,$('#'+id).checked)
});

$$('[data-reset]').forEach(b=>b.onclick=()=>{
 let id=b.dataset.reset;
 if(typeof defaults[id]==='boolean'){
  $('#'+id).checked=defaults[id];
  localStorage.setItem('cap_'+id,defaults[id])
 }else{
  $('#'+id).value=(id==='bedVol'?'6':defaults[id]);
  localStorage.setItem('cap_'+id,$('#'+id).value);
  $('#'+id).dispatchEvent(new Event('input',{bubbles:true}))
 }
});

$('#restore').onclick=()=>{
 Object.entries(defaults).forEach(([k,v])=>{
  if(typeof v==='boolean')$('#'+k).checked=v;
  else $('#'+k).value=v;
  localStorage.setItem('cap_'+k,v)
 });

 setAdsPerBlock((()=>{
  try{
   return JSON.parse(localStorage.getItem('capivara_admin_settings')||'{}').defaultAdsPerBlock||3
  }catch(e){
   return 3
  }
 })(),true)
};

renderAds();
refreshQuota();
updateCounts();

let capPendingDecision=false;

function capButtons(){
 return [...document.querySelectorAll('button')]
}

function capFindButton(words){
 const W=words.map(x=>x.toLowerCase());
 return capButtons().find(b=>W.some(w=>(b.textContent||'').toLowerCase().includes(w)))
}

function capSetGuide(btn){
 capButtons().forEach(b=>b.classList.remove('cap-guide'));
 if(btn&&!btn.disabled)btn.classList.add('cap-guide')
}

function capRefreshGuide(){
 const create=capFindButton(['criar anúncio','criar anuncio']);
 const gen=capFindButton(['gerar áudio','gerar audio']);
 const queue=capFindButton(['mandar pra fila']);
 const discard=document.querySelector('.discardGeneratedBtn');

 if(capPendingDecision){
  if(create)create.classList.add('cap-locked');
  if(gen)gen.classList.add('cap-locked');
  capSetGuide(queue||discard);
  if(discard)discard.style.display='';
 }else{
  if(create)create.classList.remove('cap-locked');
  if(gen)gen.classList.remove('cap-locked');
  if(discard)discard.style.display='none';
  capSetGuide(gen||create);
 }
}

function capMarkPending(){
 capPendingDecision=true;
 capRefreshGuide()
}

function capResolvePending(){
 capPendingDecision=false;
 capRefreshGuide()
}

function discardGeneratedAd(){
 try{
  if(typeof currentAudioUrl!=='undefined'&&currentAudioUrl){
   URL.revokeObjectURL(currentAudioUrl)
  }
 }catch(e){}

 document.querySelectorAll('audio').forEach(a=>{
  try{
   a.pause();
   a.removeAttribute('src');
   a.load()
  }catch(e){}
 });

 ['audioPreview','previewAudio','generatedAudio','audioResult'].forEach(id=>{
  const el=document.getElementById(id);
  if(el){
   if('src' in el)el.removeAttribute('src');
   else el.innerHTML=''
  }
 });

 capResolvePending();
}

document.addEventListener('click',e=>{
 const b=e.target.closest('button');
 if(!b)return;

 const t=(b.textContent||'').toLowerCase();

 if(capPendingDecision&&(
  t.includes('criar anúncio')||
  t.includes('criar anuncio')||
  t.includes('gerar áudio')||
  t.includes('gerar audio')
 )){
   e.preventDefault();
   e.stopImmediatePropagation();
   return false
 }

 if(t.includes('gerar áudio')||t.includes('gerar audio')){
  setTimeout(()=>{
   const hasAudio=[...document.querySelectorAll('audio')].some(a=>a.src);
   if(hasAudio)capMarkPending()
  },700)
 }

 if(t.includes('mandar pra fila')){
  setTimeout(capResolvePending,300)
 }
},true);

const capObserver=new MutationObserver(()=>capRefreshGuide());
capObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','disabled']});

window.discardGeneratedAd=discardGeneratedAd;
setTimeout(capRefreshGuide,600);

(function(){
 const css=document.createElement('style');
 css.textContent=`
 .cap-guide{animation:capPulse 1.15s infinite!important;box-shadow:0 0 0 0 rgba(25,170,92,.55)}
 @keyframes capPulse{0%{transform:scale(1);box-shadow:0 0 0 0 rgba(25,170,92,.5)}65%{transform:scale(1.015);box-shadow:0 0 0 12px rgba(25,170,92,0)}100%{transform:scale(1)}}
 .cap-locked{opacity:.35!important;pointer-events:none!important}
 .discardGeneratedBtn{background:transparent!important;color:#68776f!important;border:0!important;box-shadow:none!important;text-decoration:underline;font-size:13px;padding:8px 10px!important}
 `;
 document.head.appendChild(css);

 const gen=capFindButton(['gerar áudio','gerar audio']);
 if(gen&&gen.parentElement){
  const b=document.createElement('button');
  b.type='button';
  b.className='discardGeneratedBtn';
  b.textContent='desistir';
  b.style.display='none';
  b.onclick=discardGeneratedAd;
  gen.parentElement.appendChild(b)
 }
})();

function capResetCreateV20(){
 try{
  selectedProduct='';
  document.querySelectorAll('#favorites button').forEach(b=>b.classList.remove('selected'));
  const sp=document.getElementById('selectedProduct');if(sp)sp.classList.add('hidden');
  const sn=document.getElementById('selectedName');if(sn)sn.textContent='';
  const pr=document.getElementById('price');if(pr)pr.value='';
  const br=document.getElementById('brief');if(br)br.value='';
  ['text1','text2'].forEach(id=>{
   const el=document.getElementById(id);
   if(el)el.value=''
  });
  ['actions1','actions2'].forEach(id=>{
   const el=document.getElementById(id);
   if(el)el.classList.add('hidden')
  });
  ['audio1','audio2'].forEach(id=>{
   const el=document.getElementById(id);
   if(el){
    try{el.pause()}catch(e){}
    el.removeAttribute('src')
   }
  });
  pendingAudio={};
  const sg=document.getElementById('suggestions');if(sg)sg.classList.add('hidden');
  capResolvePending();
  updateCounts()
 }catch(e){}
}

(function(){
 const css=document.createElement('style');
 css.textContent=`
 #createdAudiosV19{margin-top:18px}
 .cap-audio-list-v19{display:grid;gap:9px;margin-top:10px}
 .cap-audio-row-v19{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:11px 12px;border:1px solid #dbe5de;border-radius:12px;background:#fff}
 .cap-audio-row-v19 .cap-info-v19{min-width:0}
 .cap-audio-row-v19 b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .cap-audio-row-v19 small{display:block;color:#6d7c73;margin-top:3px}
 .cap-audio-row-v19 button{border:0;border-radius:9px;padding:9px 11px;cursor:pointer;font-weight:800}
 .cap-play-v19{background:#e9f8ef;color:#126b38}
 .cap-del-v19{background:#fff0f0;color:#a22}
 @media(max-width:700px){.cap-audio-row-v19{grid-template-columns:1fr auto}.cap-audio-row-v19 .cap-info-v19{grid-column:1/-1}}
 `;
 document.head.appendChild(css);

 const adsBox=document.getElementById('ads');
 if(adsBox){
  const host=document.createElement('div');
  host.id='createdAudiosV19';
  host.innerHTML='<h3>🔊 Áudios criados</h3><div id="createdAudiosListV19" class="cap-audio-list-v19"></div>';
  adsBox.parentElement.appendChild(host)
 }
})();

async function capPlaySavedAdV19(index){
 const a=ads[index];
 if(!a)return;
 try{
  const blob=await capGetAdBlob(a.audioKey);
  if(!blob)throw new Error('Áudio não encontrado neste aparelho.');
  const url=URL.createObjectURL(blob);
  const audio=new Audio(url);
  audio.onended=()=>URL.revokeObjectURL(url);
  audio.onerror=()=>URL.revokeObjectURL(url);
  await audio.play()
 }catch(e){
  alert(e.message||'Não foi possível tocar o áudio.')
 }
}

async function capDeleteSavedAdV19(index){
 if(!confirm('Excluir este anúncio e o áudio salvo?'))return;
 const a=ads[index];
 try{
  if(a?.audioKey){
   const d=await capAdDb();
   await new Promise((ok,no)=>{
    const r=d.transaction('audio','readwrite').objectStore('audio').delete(a.audioKey);
    r.onsuccess=()=>ok(true);
    r.onerror=()=>no(r.error)
   })
  }
 }catch(e){}
 ads.splice(index,1);
 saveAds();
 renderCreatedAudiosV19()
}

function renderCreatedAudiosV19(){
 const box=document.getElementById('createdAudiosListV19');
 if(!box)return;
 if(!ads.length){
  box.innerHTML='<div class="empty">Nenhum áudio criado ainda.</div>';
  return
 }
 box.innerHTML=ads.map((a,i)=>{
  const name=a.label||a.product||('anúncio '+(i+1));
  const meta=[a.voice,a.top?'TOP do Dia':'Anúncio',a.paused?'Pausado':'Na programação'].filter(Boolean).join(' • ');
  return `<div class="cap-audio-row-v19">
   <div class="cap-info-v19"><b>${name}</b><small>${meta}</small></div>
   <button class="cap-play-v19" type="button" onclick="capPlaySavedAdV19(${i})">▶ Ouvir</button>
   <button class="cap-del-v19" type="button" onclick="capDeleteSavedAdV19(${i})">🗑 Excluir</button>
  </div>`
 }).join('')
}

window.capPlaySavedAdV19=capPlaySavedAdV19;
window.capDeleteSavedAdV19=capDeleteSavedAdV19;

const capOldRenderAdsV19=renderAds;
renderAds=function(){
 capOldRenderAdsV19();
 renderCreatedAudiosV19()
};

renderCreatedAudiosV19();

function capStageV21(stage){
 document.body.dataset.capStage=stage;
 const suggest=document.getElementById('suggest');
 const top=document.getElementById('topDay');
 const suggestions=document.getElementById('suggestions');
 const gen=document.querySelector('[data-gen="1"]');

 if(stage==='start'){
  if(suggest){suggest.style.display='';suggest.disabled=false}
  if(top)top.style.display='';
  if(suggestions)suggestions.classList.add('hidden');
  if(gen)gen.classList.remove('cap-guide');
  if(suggest)suggest.classList.add('cap-guide');
  capPendingDecision=false
 }

 if(stage==='phrase'){
  if(suggest)suggest.style.display='none';
  if(top)top.style.display='none';
  if(suggestions)suggestions.classList.remove('hidden');
  if(gen)gen.classList.add('cap-guide');
  if(suggest)suggest.classList.remove('cap-guide')
 }

 if(stage==='audio'){
  if(suggest)suggest.style.display='none';
  if(top)top.style.display='none'
 }
}

function capFindDiscardButtonV21(){
 let b=document.getElementById('capDiscardV21');
 if(b)return b;

 b=document.createElement('button');
 b.type='button';
 b.id='capDiscardV21';
 b.className='discardGeneratedBtn';
 b.textContent='✕ DESISTIR';

 b.onclick=()=>{
  capPendingDecision=false;
  document.querySelectorAll('audio').forEach(a=>{
   try{a.pause()}catch(e){}
  });

  ['actions1','actions2'].forEach(id=>{
   const el=document.getElementById(id);
   if(el)el.classList.add('hidden')
  });

  capStageV21('start')
 };

 const gen=document.querySelector('[data-gen="1"]');
 if(gen&&gen.parentElement)gen.parentElement.appendChild(b);

 return b
}

capFindDiscardButtonV21();

const capOldCreateTextsV21=createTexts;
createTexts=async function(){
 await capOldCreateTextsV21();

 const t1=document.getElementById('text1');
 const brief=document.getElementById('brief');

 if(t1&&t1.value.trim()){
  if(brief)brief.value=t1.value.trim();
  capStageV21('phrase')
 }
};

const capOldGenerateVoiceV21=generateVoice;
generateVoice=async function(n,btn){
 await capOldGenerateVoiceV21(n,btn);

 if(pendingAudio[n]){
  capPendingDecision=true;
  capStageV21('audio');

  const q=document.querySelector('[data-queue="'+n+'"]');
  if(q)q.classList.add('cap-guide')
 }
};

setTimeout(()=>capStageV21('start'),500);

/* =========================================================
   CAPIVARA RADIO — SERVIDOR CENTRAL V50
========================================================= */

const CAP_SERVER='https://capivara-radio-server.onrender.com';

function capJson(v,fallback){
 try{return JSON.parse(v)}catch(e){return fallback}
}

async function capFetchJson(url,opt={}){
 const r=await fetch(url,opt);
 let data={};

 try{
  data=await r.json()
 }catch(e){}

 if(!r.ok){
  throw new Error(
   data?.error||
   data?.message||
   ('Servidor '+r.status)
  )
 }

 return data
}

function capNormalizeClient(raw,code){
 const c=raw?.client||raw?.data||raw||{};

 return {
  name:c.name||c.nome||c.storeName||'Loja',
  ramo:c.ramo||c.activity||c.segment||'Açougue',
  type:c.ramo||c.activity||c.segment||'Açougue',
  code:String(c.code||c.codigo||code||''),
  active:c.active!==false&&c.ativo!==false
 }
}

function capApplyRemoteState(state){
 if(!state||typeof state!=='object')return;

 if(Array.isArray(state.ads)){
  ads=state.ads
 }

 if(Number.isFinite(+state.voiceTurn)){
  voiceTurn=+state.voiceTurn
 }

 if(state.level){
  level=state.level
 }

 if(state.selectedTheme){
  selectedThemeV11=state.selectedTheme
 }

 if(state.adsPerBlock){
  setAdsPerBlock(state.adsPerBlock,false)
 }

 if(state.settings&&typeof state.settings==='object'){
  Object.entries(state.settings).forEach(([k,v])=>{
   const el=document.getElementById(k);
   if(!el)return;

   if(el.type==='checkbox'){
    el.checked=!!v
   }else{
    el.value=v
   }
  })
 }

 renderAds();
 renderCreatedAudiosV19();
 renderThemesV11()
}

function capBuildRemoteState(){
 const settings={};

 ['musicVol','bedVol','open','close','jingles','mentionStore','fullCurrency']
 .forEach(id=>{
  const el=document.getElementById(id);
  if(!el)return;

  settings[id]=
   el.type==='checkbox'
   ?el.checked
   :el.value
 });

 return {
  ads,
  voiceTurn,
  level,
  selectedTheme:selectedThemeV11,
  adsPerBlock:+(
   document.getElementById('adsPerBlock')?.value||3
  ),
  settings,
  updatedAt:new Date().toISOString()
 }
}

async function capPullClientStateV50(){
 if(!store.code)return;

 try{
  const data=await capFetchJson(
   CAP_SERVER+
   '/api/client/'+
   encodeURIComponent(store.code)+
   '/state'
  );

  capApplyRemoteState(
   data?.state||
   data?.data||
   {}
  )
 }catch(e){
  console.warn(
   'Estado remoto indisponível:',
   e
  )
 }
}

let capPushTimerV50=null;

function capPushClientStateV50(){
 if(!store.code)return;

 clearTimeout(capPushTimerV50);

 capPushTimerV50=setTimeout(async()=>{
  try{
   await capFetchJson(
    CAP_SERVER+
    '/api/client/'+
    encodeURIComponent(store.code)+
    '/state',
    {
     method:'PUT',
     headers:{
      'Content-Type':'application/json'
     },
     body:JSON.stringify(
      capBuildRemoteState()
     )
    }
   )
  }catch(e){
   console.warn(
    'Não foi possível salvar estado no servidor:',
    e
   )
  }
 },450)
}

async function capGenerateTextServerV50(q){
 const data=await capFetchJson(
  CAP_SERVER+'/api/ai/generate',
  {
   method:'POST',
   headers:{
    'Content-Type':'application/json'
   },
   body:JSON.stringify({
    prompt:promptForGemini(q),
    text:q,
    pedido:q,
    ramo:store.ramo,
    storeName:store.name,
    mentionStore:
     document.getElementById('mentionStore')
      ?.checked===true,
    fullCurrency:
     document.getElementById('fullCurrency')
      ?.checked===true,
    top:createMode==='top',
    maxChars:150
   })
  }
 );

 let text=
  data?.text||
  data?.frase||
  data?.response||
  data?.generated_text||
  data?.data?.text||
  '';

 text=String(text||'')
  .trim()
  .replace(
   /^```(?:json)?\s*/i,
   ''
  )
  .replace(
   /```$/,
   ''
  )
  .trim()
  .replace(
   /^["']|["']$/g,
   ''
  )
  .toLowerCase()
  .slice(0,150);

 if(!text){
  throw new Error(
   'O servidor não retornou a frase.'
  )
 }

 return text
}

async function capGenerateVoiceServerV50(text,voiceType){
 const r=await fetch(
  CAP_SERVER+'/api/voice/generate',
  {
   method:'POST',
   headers:{
    'Content-Type':'application/json',
    'Accept':'audio/mpeg'
   },
   body:JSON.stringify({
    text,
    voiceType
   })
  }
 );

 if(!r.ok){
  let msg='';

  try{
   const j=await r.json();
   msg=
    j?.error||
    j?.message||
    JSON.stringify(j)
  }catch(e){
   try{
    msg=await r.text()
   }catch(_){}
  }

  throw new Error(
   'Servidor de voz '+
   r.status+
   (msg?' — '+msg:'')
  )
 }

 const blob=await r.blob();

 if(!blob.size){
  throw new Error(
   'Áudio vazio'
  )
 }

 return blob
}

function capNextAdVoiceV50(){
 const count=
  +(
   localStorage.getItem(
    capClientKey(
     'cap_voice_success_count'
    )
   )||0
  );

 return count%2===0
  ?'adMale'
  :'adFemale'
}

function capRegisterVoiceSuccessV50(){
 const key=
  capClientKey(
   'cap_voice_success_count'
  );

 localStorage.setItem(
  key,
  String(
   +(localStorage.getItem(key)||0)+1
  )
 )
}

async function capGenerateAudioDirectV50(text){
 text=String(text||'')
  .trim()
  .toLowerCase()
  .slice(0,150);

 if(!text){
  throw new Error(
   'O texto do anúncio está vazio.'
  )
 }

 const voiceType=
  capNextAdVoiceV50();

 const blob=
  await capGenerateVoiceServerV50(
   text,
   voiceType
  );

 capRegisterVoiceSuccessV50();

 return {
  text,
  voice:
   voiceType==='adFemale'
   ?'Voz feminina'
   :'Voz masculina',
  blob,
  top:createMode==='top',
  label:capAudioLabel(),
  product:selectedProduct||'',
  price:
   (
    document.getElementById('price')
     ?.value||''
   ).trim()
 }
}

const capOriginalApplyAdmStoreV50=
 applyAdmStore;

applyAdmStore=function(c){
 capOriginalApplyAdmStoreV50(c);

 setTimeout(()=>{
  capPullClientStateV50()
 },0)
};

createTexts=async function(){
 if(todayCreated()>=capLimits().daily){
  alert(
   'O limite diário de anúncios foi atingido.'
  );
  return
 }

 if(weekCreated()>=capLimits().weekly){
  alert(
   'O limite semanal de anúncios foi atingido.'
  );
  return
 }

 if(
  createMode==='top'&&
  topCreatedToday()>=capLimits().top
 ){
  alert(
   'O limite diário de TOP foi atingido.'
  );
  return
 }

 let q=
  document.getElementById('brief')
   ?.value.trim()||'';

 if(selectedProduct){
  const price=
   document.getElementById('price')
    ?.value.trim()||'';

  q=
   (q?q+'; ':'')+
   selectedProduct+
   (price?'; preço '+price:'')
 }

 if(!q)return;

 const btn=
  document.getElementById('suggest');

 if(btn){
  btn.disabled=true;
  btn.textContent='CRIANDO...'
 }

 try{
  const text=
   await capGenerateTextServerV50(q);

  const t1=
   document.getElementById('text1');

  const brief=
   document.getElementById('brief');

  if(t1)t1.value=text;
  if(brief)brief.value=text;

  updateCounts();
  capStageV21('phrase');

 }catch(e){
  console.error(e);

  alert(
   'Não foi possível criar agora.\n\n'+
   e.message
  )
 }finally{
  if(btn){
   btn.disabled=false;
   btn.textContent='✨ CRIAR ANÚNCIO'
  }
 }
};

const capSuggestV50=
 document.getElementById('suggest');

if(capSuggestV50){
 capSuggestV50.onclick=createTexts
}

generateVoice=async function(n,btn){
 let text=
  document.getElementById(
   'text'+n
  )?.value.trim()||
  document.getElementById(
   'brief'
  )?.value.trim()||
  '';

 text=text
  .toLowerCase()
  .slice(0,150);

 if(!text)return;

 btn.disabled=true;
 btn.textContent='GERANDO...';

 try{
  const p=
   await capGenerateAudioDirectV50(
    text
   );

  if(
   pendingAudio[n]?.url
  ){
   URL.revokeObjectURL(
    pendingAudio[n].url
   )
  }

  const url=
   URL.createObjectURL(p.blob);

  pendingAudio[n]={
   ...p,
   url
  };

  const audio=
   document.getElementById(
    'audio'+n
   );

  if(audio){
   audio.src=url
  }

  const actions=
   document.getElementById(
    'actions'+n
   );

  if(actions){
   actions.classList.remove(
    'hidden'
   )
  }

  btn.textContent=
   '✓ ÁUDIO PRONTO';

  capPendingDecision=true;
  capStageV21('audio');

 }catch(e){
  console.error(e);

  alert(
   'ERRO AO GERAR ÁUDIO\n\n'+
   e.message
  );

  btn.textContent=
   '🎙 GERAR ÁUDIO';

 }finally{
  btn.disabled=false
 }
};

document
 .querySelectorAll('[data-gen]')
 .forEach(b=>{
  b.onclick=()=>
   generateVoice(
    b.dataset.gen,
    b
   )
 });

const capOldSaveAdsV50=saveAds;

saveAds=function(){
 capOldSaveAdsV50();
 capPushClientStateV50()
};

/* =========================================================
   CAPIVARA PLAYER — PLAYLISTS ONLINE V53
   ADM -> SERVIDOR -> PLAYER
========================================================= */

(function(){
 const SERVER='https://capivara-radio-server.onrender.com';
 let remotePlaylistsV53=[];
 let remoteTracksV53=[];
 let remotePlaylistIdV53='';
 let remoteAudioV53=null;
 let remoteIndexV53=0;
 let loadingPlaylistsV53=false;

 function arr(v){
  return Array.isArray(v)?v:[]
 }

 function esc(v){
  return String(v??'')
   .replace(/&/g,'&amp;')
   .replace(/</g,'&lt;')
   .replace(/>/g,'&gt;')
   .replace(/"/g,'&quot;')
 }

 function playlistKey(){
  return 'cap_remote_playlist_'+String(store?.code||'semcliente')
 }

 function pickArray(raw){
  if(Array.isArray(raw))return raw;

  if(raw&&Array.isArray(raw.playlists)){
   return raw.playlists
  }

  if(raw?.data&&Array.isArray(raw.data)){
   return raw.data
  }

  if(raw?.data&&Array.isArray(raw.data.playlists)){
   return raw.data.playlists
  }

  if(raw?.playlists&&typeof raw.playlists==='object'){
   return Object.entries(raw.playlists).map(([id,p])=>({
    id,
    ...(p||{})
   }))
  }

  if(raw&&typeof raw==='object'){
   const values=Object.values(raw);

   if(
    values.length&&
    values.every(
     x=>x&&typeof x==='object'
    )
   ){
    return Object.entries(raw).map(([id,p])=>({
     id,
     ...(p||{})
    }))
   }
  }

  return []
 }

 function normalizeTrack(t,i){
  if(typeof t==='string'){
   return {
    id:'track_'+i,
    name:t,
    url:t
   }
  }

  t=t||{};

  const mediaId=
   t.mediaId||
   t.media_id||
   t.fileId||
   t.file_id||
   '';

  let url=
   t.url||
   t.audioUrl||
   t.audio_url||
   t.src||
   t.streamUrl||
   '';

  if(!url&&mediaId){
   url=
    SERVER+
    '/api/media/'+
    encodeURIComponent(mediaId)
  }

  return {
   ...t,
   id:
    t.id||
    mediaId||
    ('track_'+i),
   mediaId,
   name:
    t.name||
    t.title||
    t.nome||
    t.filename||
    ('Música '+(i+1)),
   url
  }
 }

 function normalizePlaylist(p,i){
  p=p||{};

  let tracks=
   p.tracks||
   p.musics||
   p.music||
   p.items||
   p.songs||
   p.faixas||
   [];

  if(!Array.isArray(tracks)){
   tracks=[]
  }

  tracks=
   tracks
    .map(normalizeTrack)
    .filter(t=>t.url);

  return {
   ...p,
   id:String(
    p.id||
    p.key||
    p.slug||
    p.name||
    p.title||
    ('playlist_'+i)
   ),
   name:
    p.name||
    p.title||
    p.nome||
    ('Playlist '+(i+1)),
   tracks
  }
 }

 async function fetchPlaylists(){
  if(loadingPlaylistsV53)return;

  loadingPlaylistsV53=true;

  try{
   const r=await fetch(
    SERVER+'/api/playlists',
    {
     cache:'no-store',
     headers:{
      'Accept':'application/json'
     }
    }
   );

   if(!r.ok){
    throw new Error(
     'Servidor '+r.status
    )
   }

   const j=await r.json();

   const source=
    j?.playlists??
    j?.data?.playlists??
    j?.data??
    j;

   remotePlaylistsV53=
    pickArray(source)
     .map(normalizePlaylist)
     .filter(p=>p.tracks.length);

   const saved=
    localStorage.getItem(
     playlistKey()
    )||'';

   remotePlaylistIdV53=
    remotePlaylistsV53.some(
     p=>p.id===saved
    )
    ?saved
    :(remotePlaylistsV53[0]?.id||'');

   if(remotePlaylistIdV53){
    localStorage.setItem(
     playlistKey(),
     remotePlaylistIdV53
    )
   }

   applySelected();
   renderSelector();

  }catch(e){
   console.warn(
    'Playlists online indisponíveis:',
    e
   );

   remotePlaylistsV53=[];
   remoteTracksV53=[];
   renderSelector()

  }finally{
   loadingPlaylistsV53=false
  }
 }

 function selectedPlaylist(){
  return remotePlaylistsV53.find(
   p=>p.id===remotePlaylistIdV53
  )||null
 }

 function applySelected(){
  const p=selectedPlaylist();

  remoteTracksV53=
   p?arr(p.tracks):[];

  if(remoteIndexV53>=remoteTracksV53.length){
   remoteIndexV53=0
  }

  selectedThemeV11=
   p?.name||
   selectedThemeV11;

  localStorage.setItem(
   'capivara_theme_'+store.code,
   selectedThemeV11
  );

  renderThemesV11();
  updateAdmStatus()
 }

 function selectorHost(){
  let host=
   document.getElementById(
    'capPlaylistOnlineV53'
   );

  if(host)return host;

  const ref=
   document.getElementById(
    'themeButtonsV11'
   );

  if(!ref)return null;

  host=document.createElement('div');
  host.id='capPlaylistOnlineV53';

  host.style.cssText=
   'margin:12px 0;padding:12px;border:1px solid #dce7df;border-radius:12px;background:#fff';

  ref.parentElement.insertBefore(
   host,
   ref
  );

  return host
 }

 function renderSelector(){
  const host=selectorHost();

  if(!host)return;

  if(!remotePlaylistsV53.length){
   host.innerHTML=
    '<b>🎵 Playlists</b>'+
    '<div style="margin-top:6px;font-size:13px;opacity:.7">Nenhuma playlist online disponível.</div>';

   return
  }

  host.innerHTML=
   '<label style="display:block;font-weight:800;margin-bottom:7px">🎵 Escolha a playlist</label>'+
   '<select id="capPlaylistSelectV53" style="width:100%;padding:11px;border:1px solid #d5dfd8;border-radius:10px;background:#fff">'+
   remotePlaylistsV53.map(p=>
    '<option value="'+
    esc(p.id)+
    '" '+
    (p.id===remotePlaylistIdV53?'selected':'')+
    '>'+
    esc(p.name)+
    ' • '+
    p.tracks.length+
    ' música'+
    (p.tracks.length===1?'':'s')+
    '</option>'
   ).join('')+
   '</select>';

  const sel=
   document.getElementById(
    'capPlaylistSelectV53'
   );

  if(sel){
   sel.onchange=()=>{
    remotePlaylistIdV53=
     sel.value;

    localStorage.setItem(
     playlistKey(),
     remotePlaylistIdV53
    );

    remoteIndexV53=0;
    applySelected();

    if(playing){
     stopRemote();
     playRemoteNext()
    }

    capPushClientStateV50()
   }
  }
 }

 function stopRemote(){
  if(remoteAudioV53){
   try{
    remoteAudioV53.pause()
   }catch(e){}

   remoteAudioV53.onended=null;
   remoteAudioV53.onerror=null;
   remoteAudioV53=null
  }
 }

 async function playRemoteNext(){
  if(!playing)return;

  if(!remoteTracksV53.length){
   await fetchPlaylists();

   if(!remoteTracksV53.length){
    return playLocalFallback()
   }
  }

  if(remoteIndexV53>=remoteTracksV53.length){
   remoteIndexV53=0
  }

  const track=
   remoteTracksV53[
    remoteIndexV53++
   ];

  if(!track?.url){
   setTimeout(
    playRemoteNext,
    200
   );
   return
  }

  stopRemote();

  const a=
   new Audio(track.url);

  remoteAudioV53=a;

  const vol=
   +(
    document.getElementById(
     'musicVol'
    )?.value||75
   );

  a.volume=
   Math.max(
    0,
    Math.min(
     1,
     vol/100
    )
   );

  const title=
   document.getElementById(
    'nowTitle'
   );

  const sub=
   document.getElementById(
    'nowSub'
   );

  if(title){
   title.textContent=
    track.name||
    'Música'
  }

  if(sub){
   sub.textContent=
    '🎵 '+
    (
     selectedPlaylist()?.name||
     'Playlist'
    )+
    ' • '+
    store.name
  }

  a.onended=()=>{
   remoteAudioV53=null;

   if(
    typeof capRadioAfterMusicV16===
    'function'
   ){
    capRadioAfterMusicV16()
   }else{
    playRemoteNext()
   }
  };

  a.onerror=()=>{
   remoteAudioV53=null;

   if(!playing)return;

   setTimeout(
    playRemoteNext,
    300
   )
  };

  try{
   await a.play()
  }catch(e){
   console.warn(
    'Falha ao tocar música online:',
    e
   );

   playing=false;
   syncPlayUi();

   const sub2=
    document.getElementById(
     'nowSub'
    );

   if(sub2){
    sub2.textContent=
     'Clique novamente em INICIAR RÁDIO.'
   }
  }
 }

 function playLocalFallback(){
  try{
   return originalPlayNextAdmMusicV53()
  }catch(e){
   console.warn(e);

   const title=
    document.getElementById(
     'nowTitle'
    );

   const sub=
    document.getElementById(
     'nowSub'
    );

   if(title){
    title.textContent=
     'Sem músicas disponíveis'
   }

   if(sub){
    sub.textContent=
     'A rádio continua pronta para anúncios.'
   }
  }
 }

 const originalPlayNextAdmMusicV53=
  playNextAdmMusic;

 playNextAdmMusic=
  async function(){
   if(remotePlaylistsV53.length){
    return playRemoteNext()
   }

   await fetchPlaylists();

   if(remotePlaylistsV53.length){
    return playRemoteNext()
   }

   return originalPlayNextAdmMusicV53()
  };

 const oldApplyAdmStoreV53=
  applyAdmStore;

 applyAdmStore=function(c){
  oldApplyAdmStoreV53(c);

  remotePlaylistIdV53=
   localStorage.getItem(
    playlistKey()
   )||'';

  remoteIndexV53=0;

  setTimeout(
   fetchPlaylists,
   0
  )
 };

 window.capRefreshPlaylistsV53=
  fetchPlaylists;

 window.capPlayRemoteNextV53=
  playRemoteNext;

 window.capHasRemotePlaylistV53=
  ()=>remotePlaylistsV53.length>0;

 window.capSelectedRemotePlaylistV53=
  ()=>selectedPlaylist();

 setTimeout(
  fetchPlaylists,
  600
 )
})();

/* =========================================================
   CAPIVARA PLAYER — BLOCO DE ANÚNCIOS / VINHETAS / FUNDOS
========================================================= */

let capAdCursorV16=0;
let capJingleCursorV16={};
let capBackgroundCursorV16=0;
let capCurrentSpokenAudio=null;
let capCurrentBedAudio=null;
let capRadioBusyV16=false;

function capMediaUrlV16(item){
 if(!item)return '';

 if(typeof item==='string'){
  if(/^https?:\/\//i.test(item))return item;

  return CAP_SERVER+
   '/api/media/'+
   encodeURIComponent(item)
 }

 const direct=
  item.url||
  item.audioUrl||
  item.audio_url||
  item.src||
  item.streamUrl||
  '';

 if(direct)return direct;

 const mediaId=
  item.mediaId||
  item.media_id||
  item.fileId||
  item.file_id||
  '';

 return mediaId
  ?CAP_SERVER+
   '/api/media/'+
   encodeURIComponent(mediaId)
  :''
}

function capNormalizeCollectionV16(raw){
 if(Array.isArray(raw))return raw;

 if(raw&&typeof raw==='object'){
  return Object.values(raw)
 }

 return []
}

function capFindRamoObjectV16(all,ramo){
 if(!all||typeof all!=='object')return null;

 const wanted=normRamo(ramo);

 const key=
  Object.keys(all).find(
   k=>normRamo(k)===wanted
  );

 return key?all[key]:null
}

async function capFetchAssetGroupV16(kind){
 try{
  const r=await fetch(
   CAP_SERVER+'/api/'+kind,
   {
    cache:'no-store',
    headers:{
     'Accept':'application/json'
    }
   }
  );

  if(!r.ok)return {};

  const j=await r.json();

  return (
   j?.[kind]??
   j?.data?.[kind]??
   j?.data??
   {}
  )
 }catch(e){
  console.warn(
   kind+' indisponível:',
   e
  );

  return {}
 }
}

function capCategoryItemsV16(ramoData,category){
 if(!ramoData)return [];

 if(Array.isArray(ramoData)){
  return ramoData.filter(
   x=>x&&(
    x.category===category||
    x.cat===category||
    x.type===category
   )
  )
 }

 const value=
  ramoData[category]||
  ramoData[
   {
    offerOpen:'open',
    offerClose:'close',
    topOpen:'topin',
    topClose:'topout'
   }[category]
  ];

 return capNormalizeCollectionV16(value)
}

async function capPlayUrlV16(url,volume=1){
 if(!url)return false;

 return new Promise(resolve=>{
  const a=new Audio(url);

  capCurrentSpokenAudio=a;

  a.volume=
   Math.max(
    0,
    Math.min(1,volume)
   );

  let done=false;

  const finish=ok=>{
   if(done)return;
   done=true;

   if(capCurrentSpokenAudio===a){
    capCurrentSpokenAudio=null
   }

   resolve(ok)
  };

  a.onended=()=>finish(true);
  a.onerror=()=>finish(false);

  a.play()
   .catch(()=>finish(false))
 })
}

async function capPlayJingleV16(category){
 const enabled=
  document.getElementById('jingles')
   ?.checked!==false;

 if(!enabled)return false;

 const all=
  await capFetchAssetGroupV16(
   'jingles'
  );

 const ramoData=
  capFindRamoObjectV16(
   all,
   store.ramo||store.type
  );

 const list=
  capCategoryItemsV16(
   ramoData,
   category
  )
  .filter(x=>capMediaUrlV16(x));

 if(!list.length)return false;

 const key=
  normRamo(store.ramo)+
  '|'+category;

 const index=
  capJingleCursorV16[key]||0;

 capJingleCursorV16[key]=
  (index+1)%list.length;

 return capPlayUrlV16(
  capMediaUrlV16(
   list[index%list.length]
  ),
  1
 )
}

async function capBackgroundListV16(){
 const all=
  await capFetchAssetGroupV16(
   'backgrounds'
  );

 const ramoData=
  capFindRamoObjectV16(
   all,
   store.ramo||store.type
  );

 return capNormalizeCollectionV16(
  ramoData
 ).filter(
  x=>capMediaUrlV16(x)
 )
}

async function capStartBackgroundV16(){
 const list=
  await capBackgroundListV16();

 if(!list.length)return null;

 const item=
  list[
   capBackgroundCursorV16%
   list.length
  ];

 capBackgroundCursorV16++;

 const url=
  capMediaUrlV16(item);

 if(!url)return null;

 try{
  const a=new Audio(url);

  a.loop=true;

  const vol=
   +(
    document.getElementById(
     'bedVol'
    )?.value||6
   );

  a.volume=
   Math.max(
    0,
    Math.min(
     1,
     vol/100
    )
   );

  await a.play();

  capCurrentBedAudio=a;

  return a
 }catch(e){
  return null
 }
}

function capStopBackgroundV16(){
 if(!capCurrentBedAudio)return;

 try{
  capCurrentBedAudio.pause();
  capCurrentBedAudio.currentTime=0
 }catch(e){}

 capCurrentBedAudio=null
}

async function capPlayAdV16(ad){
 if(!ad)return false;

 let url=
  capMediaUrlV16(ad);

 if(url){
  return capPlayUrlV16(url,1)
 }

 if(ad.audioKey){
  try{
   const blob=
    await capGetAdBlob(
     ad.audioKey
    );

   if(blob){
    const local=
     URL.createObjectURL(blob);

    const ok=
     await capPlayUrlV16(
      local,
      1
     );

    URL.revokeObjectURL(local);

    return ok
   }
  }catch(e){}
 }

 return false
}

function capActiveAdsV16(){
 const now=Date.now();

 return ads.filter(a=>
  a&&
  !a.paused&&
  (!a.exp||a.exp>now)
 )
}

function capTakeAdsV16(){
 const active=
  capActiveAdsV16();

 if(!active.length)return [];

 const topIndex=
  active.findIndex(a=>a.top);

 if(topIndex>=0){
  const top=active[topIndex];

  if(!top._capPlayedToday||
     top._capPlayedToday!==dayKey()){
   top._capPlayedToday=dayKey();
   saveAds();
   return [top]
  }
 }

 const normal=
  active.filter(a=>!a.top);

 if(!normal.length)return [];

 const count=
  Math.max(
   1,
   parseInt(
    document.getElementById(
     'adsPerBlock'
    )?.value||3,
    10
   )
  );

 const out=[];

 for(let i=0;i<count;i++){
  if(!normal.length)break;

  out.push(
   normal[
    capAdCursorV16%
    normal.length
   ]
  );

  capAdCursorV16++
 }

 return out
}

async function capPlayAdBlockV16(block){
 if(!block.length)return false;

 const top=
  block.length===1&&
  block[0]?.top;

 const openCat=
  top?'topOpen':'offerOpen';

 const closeCat=
  top?'topClose':'offerClose';

 await capPlayJingleV16(
  openCat
 );

 const bed=
  await capStartBackgroundV16();

 try{
  for(const ad of block){
   if(!playing)break;

   await capPlayAdV16(ad)
  }
 }finally{
  if(bed){
   capStopBackgroundV16()
  }
 }

 if(playing){
  await capPlayJingleV16(
   closeCat
  )
 }

 return true
}

async function capContinueMusicV16(){
 if(!playing)return;

 if(
  typeof window.capHasRemotePlaylistV53==='function'&&
  window.capHasRemotePlaylistV53()&&
  typeof window.capPlayRemoteNextV53==='function'
 ){
  return window.capPlayRemoteNextV53()
 }

 return playNextAdmMusic()
}

async function capRadioAfterMusicV16(){
 if(capRadioBusyV16||!playing)return;

 capRadioBusyV16=true;

 try{
  const block=
   capTakeAdsV16();

  if(block.length){
   await capPlayAdBlockV16(
    block
   )
  }
 }catch(e){
  console.warn(
   'Bloco de anúncios:',
   e
  )
 }finally{
  capRadioBusyV16=false
 }

 if(playing){
  capContinueMusicV16()
 }
}

window.capRadioAfterMusicV16=
 capRadioAfterMusicV16;

/* =========================================================
   TODAS AS PLAYLISTS PARA TODOS OS RAMOS
   seleção individual por cliente
========================================================= */

(function(){
 const oldBuild=
  capBuildRemoteState;

 capBuildRemoteState=function(){
  const state=oldBuild();

  state.selectedPlaylist=
   localStorage.getItem(
    'cap_remote_playlist_'+
    String(store.code||'')
   )||'';

  return state
 };

 const oldApply=
  capApplyRemoteState;

 capApplyRemoteState=function(state){
  oldApply(state);

  if(
   state?.selectedPlaylist&&
   store?.code
  ){
   localStorage.setItem(
    'cap_remote_playlist_'+
    String(store.code),
    state.selectedPlaylist
   );
  }
 };
})();

/* =========================================================
   RÁDIO SEM PLAYLIST
   anúncios continuam funcionando mesmo sem música
========================================================= */

let capNoMusicTimerV16=null;

function capScheduleNoMusicBlockV16(){
 clearTimeout(capNoMusicTimerV16);

 if(!playing)return;

 const hasRemote=
  typeof window.capHasRemotePlaylistV53==='function'&&
  window.capHasRemotePlaylistV53();

 const hasLocal=
  themeMusicV11(
   selectedThemeV11
  ).length>0;

 if(hasRemote||hasLocal)return;

 capNoMusicTimerV16=
  setTimeout(async()=>{
   if(!playing)return;

   const block=
    capTakeAdsV16();

   if(block.length){
    await capPlayAdBlockV16(
     block
    )
   }

   capScheduleNoMusicBlockV16()
  },60000)
}

const capOldSyncPlayUiV16=
 syncPlayUi;

syncPlayUi=function(){
 capOldSyncPlayUiV16();

 if(playing){
  capScheduleNoMusicBlockV16()
 }else{
  clearTimeout(
   capNoMusicTimerV16
  );

  try{
   if(capCurrentSpokenAudio){
    capCurrentSpokenAudio.pause()
   }
  }catch(e){}

  capStopBackgroundV16()
 }
};

/* =========================================================
   VOLUME EM TEMPO REAL
========================================================= */

const capMusicVolumeV16=
 document.getElementById(
  'musicVol'
 );

if(capMusicVolumeV16){
 capMusicVolumeV16.addEventListener(
  'input',
  ()=>{
   const v=
    Math.max(
     0,
     Math.min(
      1,
      +capMusicVolumeV16.value/100
     )
    );

   if(radioAudio){
    radioAudio.volume=v
   }
  }
 )
}

const capBedVolumeV16=
 document.getElementById(
  'bedVol'
 );

if(capBedVolumeV16){
 capBedVolumeV16.addEventListener(
  'input',
  ()=>{
   if(capCurrentBedAudio){
    capCurrentBedAudio.volume=
     Math.max(
      0,
      Math.min(
       1,
       +capBedVolumeV16.value/100
      )
     )
   }
  }
 )
}

/* =========================================================
   INICIALIZAÇÃO FINAL
========================================================= */

setTimeout(()=>{
 try{
  renderProducts();
  renderProductEditor();
  renderAds();
  renderCreatedAudiosV19();
  renderThemesV11();
  refreshQuota();
  capStageV21('start')
 }catch(e){
  console.error(
   'Inicialização Capivara:',
   e
  )
 }
},700);
 /* =========================================================
   CAPIVARA RÁDIO PLAYER
   PARTE 3/3
   FINALIZAÇÃO + CORREÇÕES DE FLUXO
========================================================= */

/* =========================================================
   PLAYLIST — TODAS DISPONÍVEIS PARA QUALQUER RAMO
========================================================= */

(function(){

 const SERVER=
  'https://capivara-radio-server.onrender.com';

 let capAllPlaylists=[];
 let capPlaylistCurrent='';
 let capPlaylistTracks=[];
 let capPlaylistTrackIndex=0;
 let capOnlineMusic=null;
 let capPlaylistLoading=false;

 function cleanArray(v){
  return Array.isArray(v)?v:[]
 }

 function normalizePlaylists(raw){

  let source=raw;

  if(
   source &&
   typeof source==='object' &&
   !Array.isArray(source)
  ){
   if(Array.isArray(source.playlists)){
    source=source.playlists
   }else if(
    source.data &&
    Array.isArray(source.data.playlists)
   ){
    source=source.data.playlists
   }else if(Array.isArray(source.data)){
    source=source.data
   }else{
    source=
     Object.entries(source)
      .map(([id,p])=>({
       id,
       ...(p||{})
      }))
   }
  }

  return cleanArray(source)
   .map((p,i)=>{

    p=p||{};

    let tracks=
     p.tracks||
     p.musics||
     p.music||
     p.songs||
     p.items||
     p.faixas||
     [];

    if(!Array.isArray(tracks)){
     tracks=[]
    }

    tracks=
     tracks.map((t,j)=>{

      if(typeof t==='string'){
       return {
        id:'track_'+j,
        name:'Música '+(j+1),
        url:t
       }
      }

      t=t||{};

      const mediaId=
       t.mediaId||
       t.media_id||
       t.fileId||
       t.file_id||
       '';

      const direct=
       t.url||
       t.audioUrl||
       t.audio_url||
       t.src||
       t.streamUrl||
       '';

      return {
       ...t,

       id:
        t.id||
        mediaId||
        ('track_'+j),

       name:
        t.name||
        t.title||
        t.nome||
        t.filename||
        ('Música '+(j+1)),

       url:
        direct||
        (
         mediaId
          ?SERVER+
           '/api/media/'+
           encodeURIComponent(mediaId)
          :''
        )
      }

     }).filter(t=>t.url);

    return {
     ...p,

     id:String(
      p.id||
      p.key||
      p.slug||
      p.name||
      p.title||
      ('playlist_'+i)
     ),

     name:
      p.name||
      p.title||
      p.nome||
      ('Playlist '+(i+1)),

     tracks
    }

   })
   .filter(p=>p.tracks.length)
 }

 function playlistStorageKey(){
  return (
   'cap_playlist_cliente_'+
   String(store?.code||'')
  )
 }

 function selectedPlaylist(){
  return capAllPlaylists.find(
   p=>p.id===capPlaylistCurrent
  )||null
 }

 async function loadAllPlaylists(){

  if(capPlaylistLoading)return;

  capPlaylistLoading=true;

  try{

   const r=await fetch(
    SERVER+'/api/playlists',
    {
     cache:'no-store',
     headers:{
      'Accept':'application/json'
     }
    }
   );

   if(!r.ok){
    throw new Error(
     'Servidor '+r.status
    )
   }

   const j=await r.json();

   const raw=
    j?.playlists??
    j?.data?.playlists??
    j?.data??
    {};

   capAllPlaylists=
    normalizePlaylists(raw);

   const saved=
    localStorage.getItem(
     playlistStorageKey()
    )||'';

   if(
    saved &&
    capAllPlaylists.some(
     p=>p.id===saved
    )
   ){
    capPlaylistCurrent=saved
   }else{
    capPlaylistCurrent=
     capAllPlaylists[0]?.id||
     ''
   }

   applyPlaylist();
   renderPlaylistChooser();

  }catch(e){

   console.warn(
    'Falha ao carregar playlists:',
    e
   );

   capAllPlaylists=[];
   capPlaylistTracks=[];
   renderPlaylistChooser()

  }finally{
   capPlaylistLoading=false
  }
 }

 function applyPlaylist(){

  const p=
   selectedPlaylist();

  capPlaylistTracks=
   p
    ?[...p.tracks]
    :[];

  if(
   capPlaylistTrackIndex>=
   capPlaylistTracks.length
  ){
   capPlaylistTrackIndex=0
  }

  if(capPlaylistCurrent){
   localStorage.setItem(
    playlistStorageKey(),
    capPlaylistCurrent
   )
  }

  if(p){
   selectedThemeV11=p.name;

   localStorage.setItem(
    'capivara_theme_'+
    String(store.code),
    p.name
   )
  }

  renderThemesV11();
  updateAdmStatus()
 }

 function findPlaylistHost(){

  let host=
   document.getElementById(
    'capPlaylistChooserFinal'
   );

  if(host)return host;

  const themes=
   document.getElementById(
    'themeButtonsV11'
   );

  if(!themes)return null;

  host=
   document.createElement('div');

  host.id=
   'capPlaylistChooserFinal';

  host.style.cssText=
   [
    'margin:14px 0',
    'padding:14px',
    'border:1px solid #dce7df',
    'border-radius:14px',
    'background:#fff'
   ].join(';');

  themes.parentElement.insertBefore(
   host,
   themes
  );

  return host
 }

 function renderPlaylistChooser(){

  const host=
   findPlaylistHost();

  if(!host)return;

  if(!capAllPlaylists.length){

   host.innerHTML=
    '<b>🎵 Playlist</b>'+
    '<div style="margin-top:6px;font-size:13px;opacity:.7">'+
    'Nenhuma playlist disponível.'+
    '</div>';

   return
  }

  host.innerHTML=
   '<label style="display:block;font-weight:900;margin-bottom:8px">'+
   '🎵 Escolha sua playlist'+
   '</label>'+
   '<select id="capPlaylistSelectFinal" '+
   'style="width:100%;padding:12px;border:1px solid #d4dfd8;border-radius:11px;background:#fff;font-weight:700">'+

   capAllPlaylists.map(p=>
    '<option value="'+
    String(p.id)
     .replace(/&/g,'&amp;')
     .replace(/"/g,'&quot;')+
    '" '+
    (
     p.id===capPlaylistCurrent
      ?'selected'
      :''
    )+
    '>'+
    String(p.name)
     .replace(/&/g,'&amp;')
     .replace(/</g,'&lt;')+
    ' • '+
    p.tracks.length+
    ' música'+
    (
     p.tracks.length===1
      ?''
      :'s'
    )+
    '</option>'

   ).join('')+

   '</select>';

  const sel=
   document.getElementById(
    'capPlaylistSelectFinal'
   );

  if(sel){

   sel.onchange=()=>{

    capPlaylistCurrent=
     sel.value;

    capPlaylistTrackIndex=0;

    applyPlaylist();

    if(
     typeof capPushClientStateV50===
     'function'
    ){
     capPushClientStateV50()
    }

    if(playing){

     try{
      if(capOnlineMusic){
       capOnlineMusic.pause();
       capOnlineMusic=null
      }
     }catch(e){}

     playPlaylistMusic()
    }
   }
  }
 }

 async function playPlaylistMusic(){

  if(!playing)return;

  if(!capPlaylistTracks.length){

   await loadAllPlaylists();

   if(!capPlaylistTracks.length){

    if(
     typeof capScheduleNoMusicBlockV16===
     'function'
    ){
     capScheduleNoMusicBlockV16()
    }

    const title=
     document.getElementById(
      'nowTitle'
     );

    const sub=
     document.getElementById(
      'nowSub'
     );

    if(title){
     title.textContent=
      'Rádio ligada'
    }

    if(sub){
     sub.textContent=
      'Aguardando programação'
    }

    return
   }
  }

  if(
   capPlaylistTrackIndex>=
   capPlaylistTracks.length
  ){
   capPlaylistTrackIndex=0
  }

  const track=
   capPlaylistTracks[
    capPlaylistTrackIndex++
   ];

  if(!track?.url){

   setTimeout(
    playPlaylistMusic,
    250
   );

   return
  }

  try{

   if(capOnlineMusic){
    capOnlineMusic.pause()
   }

  }catch(e){}

  const audio=
   new Audio(track.url);

  capOnlineMusic=audio;

  const musicVolume=
   +(
    document.getElementById(
     'musicVol'
    )?.value||75
   );

  audio.volume=
   Math.max(
    0,
    Math.min(
     1,
     musicVolume/100
    )
   );

  const title=
   document.getElementById(
    'nowTitle'
   );

  const sub=
   document.getElementById(
    'nowSub'
   );

  if(title){
   title.textContent=
    track.name||
    'Música'
  }

  if(sub){
   sub.textContent=
    '🎵 '+
    (
     selectedPlaylist()?.name||
     'Playlist'
    )+
    ' • '+
    store.name
  }

  audio.onended=()=>{

   if(capOnlineMusic===audio){
    capOnlineMusic=null
   }

   if(
    typeof capRadioAfterMusicV16===
    'function'
   ){
    capRadioAfterMusicV16()
   }else{
    playPlaylistMusic()
   }
  };

  audio.onerror=()=>{

   if(capOnlineMusic===audio){
    capOnlineMusic=null
   }

   if(playing){
    setTimeout(
     playPlaylistMusic,
     400
    )
   }
  };

  try{

   await audio.play()

  }catch(e){

   console.warn(
    'Falha ao iniciar música:',
    e
   );

   playing=false;

   if(
    typeof syncPlayUi===
    'function'
   ){
    syncPlayUi()
   }
  }
 }

 window.capLoadAllPlaylistsFinal=
  loadAllPlaylists;

 window.capPlayPlaylistMusicFinal=
  playPlaylistMusic;

 window.capHasPlaylistFinal=
  ()=>capPlaylistTracks.length>0;

 window.capCurrentPlaylistFinal=
  ()=>selectedPlaylist();

 const oldApply=
  applyAdmStore;

 applyAdmStore=function(c){

  oldApply(c);

  capPlaylistCurrent=
   localStorage.getItem(
    playlistStorageKey()
   )||'';

  capPlaylistTrackIndex=0;

  setTimeout(
   loadAllPlaylists,
   50
  )
 };

 const originalNextMusic=
  playNextAdmMusic;

 playNextAdmMusic=
  async function(){

   if(capPlaylistTracks.length){
    return playPlaylistMusic()
   }

   await loadAllPlaylists();

   if(capPlaylistTracks.length){
    return playPlaylistMusic()
   }

   try{
    return originalNextMusic()
   }catch(e){
    console.warn(e)
   }
  };

 const volume=
  document.getElementById(
   'musicVol'
  );

 if(volume){

  volume.addEventListener(
   'input',
   ()=>{

    if(capOnlineMusic){

     capOnlineMusic.volume=
      Math.max(
       0,
       Math.min(
        1,
        +volume.value/100
       )
      )
    }
   }
  )
 }

 setTimeout(
  loadAllPlaylists,
  800
 )
})();

/* =========================================================
   CONTINUAÇÃO DA MÚSICA APÓS BLOCO
========================================================= */

capContinueMusicV16=
 async function(){

  if(!playing)return;

  if(
   typeof window.capHasPlaylistFinal===
    'function' &&
   window.capHasPlaylistFinal() &&
   typeof window.capPlayPlaylistMusicFinal===
    'function'
  ){
   return window.capPlayPlaylistMusicFinal()
  }

  if(
   typeof window.capHasRemotePlaylistV53===
    'function' &&
   window.capHasRemotePlaylistV53() &&
   typeof window.capPlayRemoteNextV53===
    'function'
  ){
   return window.capPlayRemoteNextV53()
  }

  return playNextAdmMusic()
 };

/* =========================================================
   TOP DO DIA
   NÃO CORTA A MÚSICA
========================================================= */

function capTakeTopFirstFinal(){

 const active=
  capActiveAdsV16();

 const today=
  dayKey();

 const top=
  active.find(a=>
   a.top &&
   a._capPlayedToday!==today
  );

 if(top){

  top._capPlayedToday=today;

  saveAds();

  return [top]
 }

 const normal=
  active.filter(
   a=>!a.top
  );

 if(!normal.length){
  return []
 }

 const count=
  Math.max(
   1,
   parseInt(
    document.getElementById(
     'adsPerBlock'
    )?.value||3,
    10
   )
  );

 const result=[];

 for(
  let i=0;
  i<count;
  i++
 ){

  if(!normal.length)break;

  result.push(
   normal[
    capAdCursorV16%
    normal.length
   ]
  );

  capAdCursorV16++
 }

 return result
}

capTakeAdsV16=
 capTakeTopFirstFinal;

/* =========================================================
   FUNDO SOMENTE DO RAMO
   SEM FUNDO GERAL
========================================================= */

capBackgroundListV16=
 async function(){

  const all=
   await capFetchAssetGroupV16(
    'backgrounds'
   );

  if(
   !all ||
   typeof all!=='object'
  ){
   return []
  }

  const ramo=
   store.ramo||
   store.type||
   '';

  const ramoData=
   capFindRamoObjectV16(
    all,
    ramo
   );

  if(!ramoData){
   return []
  }

  let list=[];

  if(Array.isArray(ramoData)){

   list=ramoData

  }else if(
   ramoData &&
   typeof ramoData==='object'
  ){

   if(
    Array.isArray(
     ramoData.backgrounds
    )
   ){
    list=
     ramoData.backgrounds

   }else if(
    Array.isArray(
     ramoData.items
    )
   ){
    list=
     ramoData.items

   }else if(
    Array.isArray(
     ramoData.tracks
    )
   ){
    list=
     ramoData.tracks

   }else{

    list=
     Object.values(
      ramoData
     )
     .filter(v=>
      v &&
      (
       typeof v==='string' ||
       typeof v==='object'
      )
     )
   }
  }

  return list.filter(
   item=>!!capMediaUrlV16(item)
  )
 };

/* =========================================================
   VINHETAS SOMENTE DO RAMO
========================================================= */

capPlayJingleV16=
 async function(category){

  const enabled=
   document.getElementById(
    'jingles'
   )?.checked!==false;

  if(!enabled){
   return false
  }

  const all=
   await capFetchAssetGroupV16(
    'jingles'
   );

  const ramo=
   store.ramo||
   store.type||
   '';

  const ramoData=
   capFindRamoObjectV16(
    all,
    ramo
   );

  if(!ramoData){
   return false
  }

  const list=
   capCategoryItemsV16(
    ramoData,
    category
   )
   .filter(item=>
    !!capMediaUrlV16(item)
   );

  if(!list.length){
   return false
  }

  const key=
   normRamo(ramo)+
   '|'+
   category;

  const cursor=
   capJingleCursorV16[key]||0;

  const item=
   list[
    cursor%
    list.length
   ];

  capJingleCursorV16[key]=
   (
    cursor+1
   )%
   list.length;

  return capPlayUrlV16(
   capMediaUrlV16(item),
   1
  )
 };

/* =========================================================
   BLOCO RESILIENTE
   MÚSICA, VINHETA E FUNDO SÃO INDEPENDENTES
========================================================= */

capPlayAdBlockV16=
 async function(block){

  if(
   !Array.isArray(block) ||
   !block.length
  ){
   return false
  }

  const top=
   block.length===1 &&
   block[0]?.top;

  const open=
   top
    ?'topOpen'
    :'offerOpen';

  const close=
   top
    ?'topClose'
    :'offerClose';

  try{

   await capPlayJingleV16(
    open
   )

  }catch(e){

   console.warn(
    'Vinheta de entrada ignorada:',
    e
   )
  }

  let bed=null;

  try{

   bed=
    await capStartBackgroundV16()

  }catch(e){

   bed=null
  }

  try{

   for(
    const ad of block
   ){

    if(!playing){
     break
    }

    try{

     await capPlayAdV16(
      ad
     )

    }catch(e){

     console.warn(
      'Anúncio ignorado:',
      e
     )
    }
   }

  }finally{

   if(bed){
    capStopBackgroundV16()
   }
  }

  if(playing){

   try{

    await capPlayJingleV16(
     close
    )

   }catch(e){

    console.warn(
     'Vinheta de saída ignorada:',
     e
    )
   }
  }

  return true
 };

/* =========================================================
   APÓS A MÚSICA
========================================================= */

capRadioAfterMusicV16=
 async function(){

  if(
   capRadioBusyV16 ||
   !playing
  ){
   return
  }

  capRadioBusyV16=true;

  try{

   const block=
    capTakeAdsV16();

   if(block.length){

    await capPlayAdBlockV16(
     block
    )
   }

  }catch(e){

   console.warn(
    'Erro no bloco:',
    e
   )

  }finally{

   capRadioBusyV16=false
  }

  if(playing){

   await capContinueMusicV16()
  }
 };

window.capRadioAfterMusicV16=
 capRadioAfterMusicV16;

/* =========================================================
   SEM MÚSICA:
   ANÚNCIO NÃO FICA BLOQUEADO
========================================================= */

capScheduleNoMusicBlockV16=
 function(){

  clearTimeout(
   capNoMusicTimerV16
  );

  if(!playing)return;

  let hasMusic=false;

  try{

   hasMusic=
    (
     typeof window.capHasPlaylistFinal===
      'function' &&
     window.capHasPlaylistFinal()
    ) ||
    (
     typeof window.capHasRemotePlaylistV53===
      'function' &&
     window.capHasRemotePlaylistV53()
    ) ||
    themeMusicV11(
     selectedThemeV11
    ).length>0

  }catch(e){}

  if(hasMusic){
   return
  }

  capNoMusicTimerV16=
   setTimeout(
    async()=>{

     if(!playing){
      return
     }

     try{

      const block=
       capTakeAdsV16();

      if(block.length){

       await capPlayAdBlockV16(
        block
       )
      }

     }catch(e){

      console.warn(
       'Bloco sem música:',
       e
      )
     }

     capScheduleNoMusicBlockV16()

    },
    60000
   )
 };

/* =========================================================
   DESISTIR:
   NÃO APAGA A FRASE
========================================================= */

(function(){

 function install(){

  let btn=
   document.getElementById(
    'capDiscardFinal'
   );

  if(btn)return;

  const gen=
   document.querySelector(
    '[data-gen="1"]'
   );

  if(!gen)return;

  btn=
   document.createElement(
    'button'
   );

  btn.id=
   'capDiscardFinal';

  btn.type=
   'button';

  btn.className=
   'discardGeneratedBtn';

  btn.textContent=
   '✕ DESISTIR';

  btn.onclick=()=>{

   try{

    Object.values(
     pendingAudio||{}
    ).forEach(p=>{

     if(p?.url){
      URL.revokeObjectURL(
       p.url
      )
     }
    })

   }catch(e){}

   pendingAudio={};

   ['audio1','audio2']
    .forEach(id=>{

     const a=
      document.getElementById(
       id
      );

     if(!a)return;

     try{
      a.pause()
     }catch(e){}

     a.removeAttribute(
      'src'
     )
    });

   ['actions1','actions2']
    .forEach(id=>{

     const el=
      document.getElementById(
       id
      );

     if(el){
      el.classList.add(
       'hidden'
      )
     }
    });

   capPendingDecision=false;

   const suggest=
    document.getElementById(
     'suggest'
    );

   const top=
    document.getElementById(
     'topDay'
    );

   if(suggest){
    suggest.style.display=''
   }

   if(top){
    top.style.display=''
   }

   const suggestions=
    document.getElementById(
     'suggestions'
    );

   if(suggestions){
    suggestions.classList.add(
     'hidden'
    )
   }

   const brief=
    document.getElementById(
     'brief'
    );

   const text1=
    document.getElementById(
     'text1'
    );

   if(
    brief &&
    text1 &&
    text1.value.trim()
   ){
    brief.value=
     text1.value.trim()
   }

   capRefreshGuide()
  };

  gen.parentElement.appendChild(
   btn
  )
 }

 setTimeout(
  install,
  300
 )
})();

/* =========================================================
   GERAR ÁUDIO -> SALVAR DIRETO NA PROGRAMAÇÃO
========================================================= */

async function capSaveGeneratedDirectFinal(n){

 const p=
  pendingAudio[n];

 if(!p){
  return false
 }

 if(
  todayCreated()>=
  capLimits().daily
 ){
  alert(
   'O limite diário de anúncios foi atingido.'
  );

  return false
 }

 if(
  weekCreated()>=
  capLimits().weekly
 ){
  alert(
   'O limite semanal de anúncios foi atingido.'
  );

  return false
 }

 if(
  p.top &&
  topCreatedToday()>=
  capLimits().top
 ){
  alert(
   'O limite diário de TOP foi atingido.'
  );

  return false
 }

 const id=
  'ad_'+
  Date.now()+
  '_'+
  Math.random()
   .toString(36)
   .slice(2,7);

 const audioKey=
  capClientAudioKey(id);

 try{

  await capSaveAdBlob(
   audioKey,
   p.blob
  );

 }catch(e){

  alert(
   'Não foi possível salvar o áudio.'
  );

  return false
 }

 const days=
  +(
   document.getElementById(
    'duration'
   )?.value||1
  );

 const exp=
  Date.now()+
  Math.max(1,days)*
  86400000;

 ads.push({

  id,

  label:
   p.label||
   p.product||
   'anúncio',

  product:
   p.product||
   '',

  price:
   p.price||
   '',

  text:
   p.text,

  voice:
   p.voice,

  paused:false,

  exp,

  audioKey,

  top:
   !!p.top,

  createdDay:
   dayKey(),

  createdAt:
   Date.now()
 });

 registerUse(
  !!p.top
 );

 pendingAudio[n]=null;

 saveAds();

 renderCreatedAudiosV19();

 if(
  p.top
 ){
  setCreateMode(
   'normal'
  )
 }

 return true
}

/* =========================================================
   NOVO GERAR ÁUDIO
   1 CLIQUE = GERA + SALVA + FILA
========================================================= */

generateVoice=
 async function(n,btn){

  let text=
   document.getElementById(
    'text'+n
   )?.value.trim()||
   document.getElementById(
    'brief'
   )?.value.trim()||
   '';

  text=
   text
    .toLowerCase()
    .slice(0,150);

  if(!text){
   return
  }

  btn.disabled=true;
  btn.textContent=
   'GERANDO ÁUDIO...';

  try{

   const p=
    await capGenerateAudioDirectV50(
     text
    );

   const url=
    URL.createObjectURL(
     p.blob
    );

   pendingAudio[n]={
    ...p,
    url
   };

   const preview=
    document.getElementById(
     'audio'+n
    );

   if(preview){
    preview.src=url
   }

   const ok=
    await capSaveGeneratedDirectFinal(
     n
    );

   if(!ok){
    throw new Error(
     'Áudio não foi salvo.'
    )
   }

   btn.textContent=
    '✓ ÁUDIO NA PROGRAMAÇÃO';

   setTimeout(()=>{

    capResetCreateV20();

    capStageV21(
     'start'
    );

    btn.textContent=
     '🔊 GERAR ÁUDIO';

   },900);

  }catch(e){

   console.error(e);

   alert(
    'ERRO AO GERAR ÁUDIO\n\n'+
    (
     e?.message||
     e
    )
   );

   btn.textContent=
    '🔊 GERAR ÁUDIO';

  }finally{

   btn.disabled=false
  }
 };

document
 .querySelectorAll(
  '[data-gen]'
 )
 .forEach(b=>{

  b.onclick=()=>{

   generateVoice(
    b.dataset.gen,
    b
   )
  }
 });

/* =========================================================
   ESCONDE O ANTIGO "MANDAR PRA FILA"
========================================================= */

document
 .querySelectorAll(
  '[data-queue]'
 )
 .forEach(b=>{

  b.style.display=
   'none'
 });

/* =========================================================
   PRODUTOS RÁPIDOS
   SEM TEXTO FIXO DE "15"
========================================================= */

(function(){

 const headings=
  [
   ...document.querySelectorAll(
    'h1,h2,h3,h4,label,span'
   )
  ];

 headings.forEach(el=>{

  const t=
   String(
    el.textContent||
    ''
   );

  if(
   /15\s+produtos/i.test(t)
  ){

   el.textContent=
    t.replace(
     /15\s+produtos(?:\s+padr[aã]o)?/i,
     'Produtos rápidos'
    )
  }
 });

 const reset=
  document.getElementById(
   'resetProducts'
  );

 if(reset){

  reset.textContent=
   'RESTAURAR PADRÕES'
 }
})();

/* =========================================================
   PRODUTOS:
   PRESERVA A QUANTIDADE SALVA PELO CLIENTE
========================================================= */

loadRamoProducts=
 function(){

  let saved=null;

  try{

   saved=
    JSON.parse(
     localStorage.getItem(
      productKey()
     )||
     'null'
    )

  }catch(e){}

  const base=
   catalogForRamo(
    store.ramo||
    store.type
   );

  products=
   Array.isArray(saved)&&
   saved.length
    ?saved
    :[...base];

  localStorage.setItem(
   productKey(),
   JSON.stringify(products)
  );

  renderProducts();
  renderProductEditor()
 };

/* =========================================================
   ESTADO DO CLIENTE:
   PLAYLIST PERSISTE NO SERVIDOR
========================================================= */

(function(){

 const previousBuild=
  capBuildRemoteState;

 capBuildRemoteState=
  function(){

   const state=
    previousBuild();

   state.selectedPlaylist=
    localStorage.getItem(
     'cap_playlist_cliente_'+
     String(store?.code||'')
    )||
    localStorage.getItem(
     'cap_remote_playlist_'+
     String(store?.code||'')
    )||
    '';

   return state
  };

 const previousApply=
  capApplyRemoteState;

 capApplyRemoteState=
  function(state){

   previousApply(state);

   if(
    state &&
    state.selectedPlaylist &&
    store?.code
   ){

    localStorage.setItem(
     'cap_playlist_cliente_'+
     String(store.code),
     state.selectedPlaylist
    );

    localStorage.setItem(
     'cap_remote_playlist_'+
     String(store.code),
     state.selectedPlaylist
    )
   }

   setTimeout(()=>{

    if(
     typeof window.capLoadAllPlaylistsFinal===
     'function'
    ){
     window.capLoadAllPlaylistsFinal()
    }

   },50)
  }
})();

/* =========================================================
   PAUSAR RÁDIO:
   NÃO CORTA A MÚSICA QUANDO A PAUSA NÃO FOI PEDIDA
   MAS PARA TUDO QUANDO O USUÁRIO CLICA PAUSAR
========================================================= */

(function(){

 const play=
  document.getElementById(
   'play'
  );

 if(!play)return;

 play.onclick=async()=>{

  if(playing){

   playing=false;

   try{
    if(radioAudio){
     radioAudio.pause()
    }
   }catch(e){}

   try{
    if(capCurrentSpokenAudio){
     capCurrentSpokenAudio.pause()
    }
   }catch(e){}

   try{
    capStopBackgroundV16()
   }catch(e){}

   clearTimeout(
    capNoMusicTimerV16
   );

   syncPlayUi();

   const title=
    document.getElementById(
     'nowTitle'
    );

   const sub=
    document.getElementById(
     'nowSub'
    );

   if(title){
    title.textContent=
     'Rádio pausada'
   }

   if(sub){
    sub.textContent=
     'Clique em iniciar para continuar'
   }

   return
  }

  playing=true;

  syncPlayUi();

  try{

   if(
    typeof window.capLoadAllPlaylistsFinal===
    'function'
   ){
    await window.capLoadAllPlaylistsFinal()
   }

   await playNextAdmMusic();

   capScheduleNoMusicBlockV16()

  }catch(e){

   console.error(e);

   capScheduleNoMusicBlockV16()
  }
 }
})();

/* =========================================================
   CHECKBOX VINHETAS
   SALVA POR CLIENTE
========================================================= */

(function(){

 const el=
  document.getElementById(
   'jingles'
  );

 if(!el)return;

 const key=
  'cap_jingles_cliente_'+
  String(store?.code||'');

 const apply=()=>{

  const currentKey=
   'cap_jingles_cliente_'+
   String(store?.code||'');

  const saved=
   localStorage.getItem(
    currentKey
   );

  if(saved!==null){
   el.checked=
    saved==='true'
  }
 };

 el.addEventListener(
  'change',
  ()=>{

   localStorage.setItem(
    'cap_jingles_cliente_'+
    String(store?.code||''),
    String(el.checked)
   );

   capPushClientStateV50()
  }
 );

 const oldApply=
  applyAdmStore;

 applyAdmStore=function(c){

  oldApply(c);

  setTimeout(
   apply,
   0
  )
 };

 apply()
})();

/* =========================================================
   FUNDO — VOLUME SALVO POR CLIENTE
========================================================= */

(function(){

 const el=
  document.getElementById(
   'bedVol'
  );

 if(!el)return;

 function key(){

  return (
   'cap_bed_volume_'+
   String(store?.code||'')
  )
 }

 function apply(){

  const saved=
   localStorage.getItem(
    key()
   );

  if(saved!==null){
   el.value=saved
  }
 }

 el.addEventListener(
  'input',
  ()=>{

   localStorage.setItem(
    key(),
    el.value
   );

   if(capCurrentBedAudio){

    capCurrentBedAudio.volume=
     Math.max(
      0,
      Math.min(
       1,
       +el.value/100
      )
     )
   }

   capPushClientStateV50()
  }
 );

 const oldApply=
  applyAdmStore;

 applyAdmStore=function(c){

  oldApply(c);

  setTimeout(
   apply,
   0
  )
 };

 apply()
})();

/* =========================================================
   PROGRAMAÇÃO POR HORÁRIO
========================================================= */

function capInsideScheduleFinal(){

 const open=
  document.getElementById(
   'open'
  )?.value||
  '00:00';

 const close=
  document.getElementById(
   'close'
  )?.value||
  '23:59';

 const now=
  new Date();

 const hhmm=
  String(
   now.getHours()
  ).padStart(2,'0')+
  ':'+
  String(
   now.getMinutes()
  ).padStart(2,'0');

 if(open<=close){

  return (
   hhmm>=open &&
   hhmm<=close
  )
 }

 return (
  hhmm>=open ||
  hhmm<=close
 )
}

/* =========================================================
   NÃO COMEÇA NOVA FAIXA FORA DO HORÁRIO
   O ÁUDIO ATUAL TERMINA NORMALMENTE
========================================================= */

const capContinueMusicBeforeSchedule=
 capContinueMusicV16;

capContinueMusicV16=
 async function(){

  if(!playing)return;

  if(
   !capInsideScheduleFinal()
  ){

   playing=false;

   syncPlayUi();

   const title=
    document.getElementById(
     'nowTitle'
    );

   const sub=
    document.getElementById(
     'nowSub'
    );

   if(title){
    title.textContent=
     'Programação encerrada'
   }

   if(sub){
    sub.textContent=
     'A rádio volta no próximo horário configurado'
   }

   return
  }

  return capContinueMusicBeforeSchedule()
 };

/* =========================================================
   LIMPEZA DE DUPLICAÇÕES VISUAIS DE PLAYLIST
========================================================= */

setTimeout(()=>{

 const finalHost=
  document.getElementById(
   'capPlaylistChooserFinal'
  );

 const oldHost=
  document.getElementById(
   'capPlaylistOnlineV53'
  );

 if(
  finalHost &&
  oldHost &&
  finalHost!==oldHost
 ){
  oldHost.style.display=
   'none'
 }

},1200);

/* =========================================================
   SINCRONIZAÇÃO AO TROCAR DE CLIENTE
========================================================= */

const capFinalApplyStore=
 applyAdmStore;

applyAdmStore=
 function(c){

  capFinalApplyStore(c);

  setTimeout(()=>{

   loadRamoProducts();

   renderProducts();

   renderProductEditor();

   renderAds();

   renderCreatedAudiosV19();

   refreshQuota();

   capStageV21(
    'start'
   );

   if(
    typeof window.capLoadAllPlaylistsFinal===
    'function'
   ){
    window.capLoadAllPlaylistsFinal()
   }

  },100)
 };

/* =========================================================
   SALVA ALTERAÇÕES IMPORTANTES NO SERVIDOR
========================================================= */

[
 'musicVol',
 'bedVol',
 'open',
 'close',
 'jingles',
 'mentionStore',
 'fullCurrency',
 'adsPerBlock'
].forEach(id=>{

 const el=
  document.getElementById(id);

 if(!el)return;

 el.addEventListener(
  'change',
  ()=>{

   if(
    typeof capPushClientStateV50===
    'function'
   ){
    capPushClientStateV50()
   }
  }
 )
});

/* =========================================================
   RECUPERA PLAYLIST DO ESTADO REMOTO
========================================================= */

setTimeout(()=>{

 if(
  store?.code &&
  typeof capPullClientStateV50===
   'function'
 ){
  capPullClientStateV50()
 }

},1000);

/* =========================================================
   ESTADO INICIAL
========================================================= */

setTimeout(()=>{

 try{

  loadRamoProducts();

  renderAds();

  renderCreatedAudiosV19();

  refreshQuota();

  renderThemesV11();

  capStageV21(
   'start'
  );

  if(
   typeof window.capLoadAllPlaylistsFinal===
   'function'
  ){
   window.capLoadAllPlaylistsFinal()
  }

 }catch(e){

  console.error(
   'Capivara Player:',
   e
  )
 }

},1300);
