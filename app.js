````javascript
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
let ads=[], voiceTurn=0, level='medio', playing=false, createMode='normal';
let capClientReady=false;

const defaults={
 musicVol:'75',
 bedVol:'6',
 jingles:true,
 mentionStore:false,
 fullCurrency:false,
 open:'08:00',
 close:'20:00'
};

let store={
 name:'Açougue Uberaba',
 type:'Açougue',
 code:'123456',
 ramo:'Açougue'
};

function admClients(){
 try{
  return JSON.parse(localStorage.getItem('capivara_admin_clients')||'[]')
 }catch(e){
  return []
 }
}

function admPackages(){
 try{
  return JSON.parse(localStorage.getItem('capivara_ramo_packages_v6')||'{}')
 }catch(e){
  return {}
 }
}

function capClientKey(base){
 return base+'__'+String(store.code||'SEM_CLIENTE')
}

function capClientAudioKey(id){
 return 'cliente:'+String(store.code)+':audio:'+id
}

function capLoadClient(){
 if(!store.code)return;

 capClientReady=true;

 try{
  ads=JSON.parse(localStorage.getItem(capClientKey('cap_ads'))||'[]')
 }catch(e){
  ads=[]
 }

 if(!Array.isArray(ads))ads=[];

 voiceTurn=+(localStorage.getItem(capClientKey('cap_voice'))||'0');
 level=localStorage.getItem(capClientKey('cap_level'))||'medio';
 pendingAudio={};

 try{
  capAdCursorV16=0
 }catch(e){}
}

const THEMES_V11=[
 "Jazz & Lounge",
 "Sertanejo",
 "MPB & Brasilidades",
 "Flashback",
 "Dance & Pop",
 "Moderno / Hits",
 "Rock & Clássicos",
 "Instrumental & Ambiente",
 "Leve & Relax",
 "Popular & Animada"
];

let selectedThemeV11=
 localStorage.getItem('capivara_theme_'+store.code)||
 THEMES_V11[0],
 pendingThemeV11=null;

function applyAdmStore(c){
 try{
  if(window.capCurrentSpokenAudio){
   window.capCurrentSpokenAudio.pause();
   window.capCurrentSpokenAudio=null
  }
 }catch(e){}

 try{
  if(radioAudio){
   radioAudio.pause();
   radioAudio=null
  }
 }catch(e){}

 store={
  name:c.name,
  type:c.ramo,
  ramo:c.ramo,
  code:c.code
 };

 capLoadClient();

 selectedThemeV11=
  localStorage.getItem('capivara_theme_'+store.code)||
  THEMES_V11[0];

 const sn=document.getElementById('storeName');

 if(sn)sn.textContent=c.name;

 const pkg=admPackages()[c.ramo]||{};

 const legacyMap={
  'Leve':2,
  'Médio':3,
  'Frenético':5
 };

 const adminCfg=(()=>{
  try{
   return JSON.parse(localStorage.getItem('capivara_admin_settings')||'{}')
  }catch(e){
   return {}
  }
 })();

 const q=
  pkg.adsPerBlock||
  legacyMap[pkg.mode]||
  adminCfg.defaultAdsPerBlock||
  3;

 setTimeout(()=>setAdsPerBlock(q,false),0);

 renderThemesV11();
 updateAdmStatus();
 loadRamoProducts();
}

function themeMusicV11(theme){
 try{
  return JSON.parse(
   localStorage.getItem('capivara_acervo_v9')||'[]'
  ).filter(
   m=>(m.theme||THEMES_V11[0])===theme
  )
 }catch(e){
  return []
 }
}

function chooseThemeV11(theme){
 if(playing){
  pendingThemeV11=theme;
  renderThemesV11();
  return
 }

 selectedThemeV11=theme;

 localStorage.setItem(
  'capivara_theme_'+store.code,
  theme
 );

 radioIndex=0;

 renderThemesV11();
 updateAdmStatus();
}

function renderThemesV11(){
 const box=document.getElementById('themeButtonsV11');

 if(!box)return;

 box.innerHTML=THEMES_V11.map(t=>
  `<button class="${selectedThemeV11===t?'active':''} ${pendingThemeV11===t?'pending':''}" onclick="chooseThemeV11('${t.replace("'","\\'")}')">${t}</button>`
 ).join('');

 const st=document.getElementById('themeStateV11');

 if(st){
  st.textContent=pendingThemeV11
   ?`⏳ ${pendingThemeV11} entra quando a música atual terminar.`
   :`🟢 Tema ativo: ${selectedThemeV11}`;
 }
}

window.chooseThemeV11=chooseThemeV11;

function updateAdmStatus(){
 const e=document.getElementById('admSyncInfo'),
 n=themeMusicV11(selectedThemeV11).length;

 if(e){
  e.innerHTML=
   `✅ ${store.ramo} • <b>${selectedThemeV11}</b> • ${n} música${n===1?'':'s'} no acervo`;
 }

 renderThemesV11();
}

const productCatalogs={
 'Açougue':[
  'Picanha','Alcatra','Contrafilé','Patinho','Acém',
  'Costela','Frango','Linguiça','Pernil','Carne Moída',
  'Maminha','Cupim','Coxão Mole','Coxão Duro','Fraldinha'
 ],
 'Supermercado':[
  'Arroz','Feijão','Açúcar','Café','Óleo',
  'Leite','Macarrão','Farinha de Trigo','Carne','Frango',
  'Ovos','Papel Higiênico','Sabão em Pó','Refrigerante','Cerveja'
 ],
 'Farmácia':[
  'Fraldas','Lenços Umedecidos','Shampoo','Condicionador','Sabonete',
  'Desodorante','Protetor Solar','Hidratante','Creme Dental','Escova Dental',
  'Absorvente','Preservativo','Vitaminas','Repelente','Algodão'
 ],
 'Padaria':[
  'Pão Francês','Pão de Queijo','Pão Doce','Bolo','Rosca',
  'Sonho','Croissant','Salgados','Coxinha','Empada',
  'Presunto','Muçarela','Leite','Café','Refrigerante'
 ],
 'Hortifruti':[
  'Banana','Maçã','Laranja','Mamão','Limão',
  'Abacaxi','Manga','Uva','Tomate','Batata',
  'Cebola','Cenoura','Alface','Couve','Ovos'
 ],
 'Pet Shop':[
  'Ração para Cães','Ração para Gatos','Petiscos','Areia para Gatos',
  'Shampoo Pet','Antipulgas','Brinquedos','Coleiras','Guias','Camas',
  'Tapete Higiênico','Comedouros','Sachês','Ossinhos','Banho e Tosa'
 ],
 'Pizzaria':[
  'Pizza Calabresa','Pizza Muçarela','Pizza Portuguesa',
  'Pizza Frango com Catupiry','Pizza Marguerita','Pizza Quatro Queijos',
  'Pizza Bacon','Pizza Carne Seca','Pizza Chocolate','Pizza Doce',
  'Pizza Família','Combo Pizza + Refrigerante','Refrigerante',
  'Borda Recheada','Delivery'
 ],
 'Lanchonete':[
  'X-Burguer','X-Salada','X-Bacon','X-Tudo','Hambúrguer Artesanal',
  'Cachorro-Quente','Misto Quente','Batata Frita','Salgados','Coxinha',
  'Pastel','Açaí','Suco','Refrigerante','Combo'
 ],
 'Restaurante':[
  'Prato Feito','Self-Service','Marmitex','Almoço Executivo','Feijoada',
  'Churrasco','Frango','Peixe','Massas','Saladas',
  'Sobremesa','Suco','Refrigerante','Delivery','Combo do Dia'
 ],
 'Hotel / Pousada':[
  'Diária','Suíte','Quarto Casal','Quarto Família','Café da Manhã',
  'Pacote de Fim de Semana','Pacote Romântico','Feriado','Piscina',
  'Restaurante','Estacionamento','Wi-Fi','Day Use','Evento',
  'Reserva Antecipada'
 ],
 'Roupas':[
  'Camiseta','Camisa','Calça Jeans','Bermuda','Vestido',
  'Blusa','Short','Saia','Conjunto','Jaqueta',
  'Moletom','Roupa Infantil','Moda Íntima','Pijama','Promoção da Coleção'
 ],
 'Calçados':[
  'Tênis','Sapato Social','Sandália','Chinelo','Sapatilha',
  'Bota','Tênis Infantil','Sandália Infantil','Sapato Infantil',
  'Rasteirinha','Scarpin','Mocassim','Papete','Chuteira',
  'Promoção de Calçados'
 ],
 'Material de Construção':[
  'Cimento','Areia','Brita','Tijolo','Telha',
  'Argamassa','Tinta','Piso','Revestimento','Tubo PVC',
  'Caixa d’Água','Ferramentas','Portas','Janelas','Material Elétrico'
 ],
 'Autopeças':[
  'Óleo do Motor','Filtro de Óleo','Filtro de Ar','Pastilha de Freio',
  'Bateria','Palheta','Lâmpada','Correia','Vela de Ignição',
  'Amortecedor','Pneu','Aditivo','Kit Embreagem','Rolamento','Acessórios'
 ],
 'Oficina / Auto Center':[
  'Troca de Óleo','Alinhamento','Balanceamento','Freios','Suspensão',
  'Troca de Pneus','Revisão','Ar-Condicionado','Injeção Eletrônica',
  'Embreagem','Bateria','Escapamento','Correia Dentada',
  'Diagnóstico','Higienização'
 ],
 'Posto / Conveniência':[
  'Gasolina','Etanol','Diesel','Óleo Lubrificante','Aditivo',
  'Calibragem','Lavagem','Café','Água','Refrigerante',
  'Energético','Salgados','Sanduíche','Gelo','Carvão'
 ],
 'Cosméticos / Perfumaria':[
  'Perfume Feminino','Perfume Masculino','Hidratante','Shampoo',
  'Condicionador','Maquiagem','Batom','Base','Protetor Solar',
  'Desodorante','Kit Presente','Creme Facial','Esmalte',
  'Sabonete','Produtos para Cabelo'
 ],
 'Ótica':[
  'Óculos de Grau','Óculos de Sol','Armação Feminina','Armação Masculina',
  'Armação Infantil','Lentes','Lentes Multifocais','Lentes de Contato',
  'Antirreflexo','Filtro de Luz Azul','Clip-on','Exame de Vista',
  'Ajuste de Armação','Kit Limpeza','Promoção de Armações'
 ],
 'Papelaria':[
  'Caderno','Caneta','Lápis','Borracha','Mochila',
  'Estojo','Papel A4','Impressão','Xerox','Material Escolar',
  'Cartolina','Cola','Tesoura','Agenda','Kit Escolar'
 ],
 'Móveis / Eletro':[
  'Sofá','Cama','Colchão','Guarda-Roupa','Mesa',
  'Cadeira','Rack','Geladeira','Fogão','Máquina de Lavar',
  'Televisão','Micro-ondas','Ventilador','Air Fryer','Liquidificador'
 ],
 'Agropecuária / Rações':[
  'Ração para Cães','Ração para Gatos','Ração para Aves',
  'Ração para Equinos','Ração para Bovinos','Milho','Sal Mineral',
  'Sementes','Adubo','Ferramentas','Bebedouro','Comedouro',
  'Produtos Veterinários','Selaria','Acessórios Rurais'
 ],
 'Distribuidora de Bebidas':[
  'Água','Refrigerante','Suco','Energético','Cerveja',
  'Gelo','Água com Gás','Isotônico','Chá Gelado','Tônica',
  'Carvão','Copos Descartáveis','Combo para Festa',
  'Fardo de Água','Fardo de Refrigerante'
 ],
 'Utilidades / Variedades':[
  'Panelas','Potes','Copos','Pratos','Talheres',
  'Baldes','Vassouras','Produtos de Limpeza','Organizadores',
  'Toalhas','Tapetes','Ferramentas','Brinquedos',
  'Material Escolar','Itens para Cozinha'
 ]
};

function normRamo(v){
 return String(v||'')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .trim()
  .toLowerCase()
}

function catalogForRamo(r){
 const k=Object.keys(productCatalogs)
  .find(x=>normRamo(x)===normRamo(r));

 return k
  ?productCatalogs[k].map(x=>x.toLowerCase())
  :[]
}

function productKey(){
 return 'cap_products_'+String(store.code||'semcodigo')
}

let products=catalogForRamo(store.ramo||store.type),
selectedProduct='';

function loadRamoProducts(){
 let saved=null;

 try{
  saved=JSON.parse(localStorage.getItem(productKey())||'null')
 }catch(e){}

 const base=catalogForRamo(store.ramo||store.type);

 products=
  Array.isArray(saved)&&saved.length===15
   ?saved
   :[...base];

 localStorage.setItem(
  productKey(),
  JSON.stringify(products)
 );

 if(typeof renderProducts==='function'){
  renderProducts()
 }

 if(typeof renderProductEditor==='function'){
  renderProductEditor()
 }
}

function saveProducts(){
 localStorage.setItem(
  productKey(),
  JSON.stringify(products)
 );

 renderProducts();
 renderProductEditor()
}

function selectProduct(name){
 selectedProduct=name;

 $('#selectedName').textContent=name;
 $('#selectedProduct').classList.remove('hidden');

 $$('#favorites button').forEach(
  b=>b.classList.toggle(
   'selected',
   b.dataset.product===name
  )
 );

 $('#price').focus();
}

function renderProducts(){
 const fav=$('#favorites');

 fav.innerHTML='';

 products.forEach((name,i)=>{
  const b=document.createElement('button');

  b.type='button';
  b.dataset.product=name;
  b.title='clique para usar • duplo clique para editar';
  b.innerHTML=`<span>${name}</span>`;

  b.onclick=()=>selectProduct(name);

  b.ondblclick=(e)=>{
   e.preventDefault();

   const v=prompt(
    'editar produto',
    products[i]
   );

   if(v&&v.trim()){
    products[i]=v.trim().toLowerCase();
    saveProducts()
   }
  };

  fav.appendChild(b)
 })
}

function renderProductEditor(){
 const box=$('#productEditor');

 box.innerHTML='';

 products.forEach((name,i)=>{
  const row=document.createElement('div');

  row.className='product-edit-row';

  row.innerHTML=
   `<b>${i+1}</b><input value="${name.replace(/"/g,'&quot;')}" maxlength="35">`;

  const inp=row.querySelector('input');

  inp.onchange=()=>{
   const v=inp.value.trim().toLowerCase();

   if(v){
    products[i]=v;
    saveProducts()
   }
  };

  box.appendChild(row)
 })
}

$('#clearProduct').onclick=()=>{
 selectedProduct='';

 $('#selectedProduct').classList.add('hidden');
 $('#price').value='';

 $$('#favorites button').forEach(
  b=>b.classList.remove('selected')
 )
};

$('#resetProducts').onclick=()=>{
 products=catalogForRamo(store.ramo||store.type);
 saveProducts()
};

$('#price').addEventListener('input',e=>{
 let digits=e.target.value
  .replace(/\D/g,'')
  .slice(0,8);

 if(!digits){
  e.target.value='';
  return
 }

 let n=parseInt(digits,10);

 e.target.value=(n/100).toLocaleString(
  'pt-BR',
  {
   minimumFractionDigits:2,
   maximumFractionDigits:2
  }
 )
});

renderProducts();
renderProductEditor();

function dayKey(ts=Date.now()){
 return new Date(ts).toLocaleDateString('en-CA')
}

function capLimits(){
 let c={};

 try{
  c=JSON.parse(
   localStorage.getItem('capivara_admin_settings')||'{}'
  )
 }catch{}

 return {
  daily:Math.max(
   1,
   parseInt(c.dailyLimit||15,10)
  ),
  weekly:Math.max(
   1,
   parseInt(c.weeklyLimit||75,10)
  ),
  top:Math.max(
   0,
   parseInt(c.topDailyLimit??1,10)
  )
 }
}

function capWeekKey(){
 const d=new Date(),
 x=new Date(
  Date.UTC(
   d.getFullYear(),
   d.getMonth(),
   d.getDate()
  )
 );

 const day=x.getUTCDay()||7;

 x.setUTCDate(
  x.getUTCDate()+4-day
 );

 const y0=new Date(
  Date.UTC(
   x.getUTCFullYear(),
   0,
   1
  )
 );

 return x.getUTCFullYear()+
  '-W'+
  String(
   Math.ceil(
    (((x-y0)/86400000)+1)/7
   )
  ).padStart(2,'0')
}

function weeklyUsage(){
 const k='cap_weekly_usage_'+store.code,
 w=JSON.parse(localStorage.getItem(k)||'{}'),
 wk=capWeekKey();

 return w.week===wk
  ?w
  :{
    week:wk,
    count:0
   }
}

function weekCreated(){
 return weeklyUsage().count
}

function usage(){
 const u=JSON.parse(
  localStorage.getItem(
   capClientKey('cap_daily_usage')
  )||'{}'
 );

 if(u.day!==dayKey()){
  return {
   day:dayKey(),
   count:0,
   topCount:0
  }
 }

 if(u.topCount==null){
  u.topCount=u.top?1:0
 }

 return u
}

function todayCreated(){
 return usage().count
}

function topCreatedToday(){
 return usage().topCount||0
}

function registerUse(isTop){
 const u=usage();

 u.count=(u.count||0)+1;

 if(isTop){
  u.topCount=(u.topCount||0)+1
 }

 delete u.top;

 localStorage.setItem(
  capClientKey('cap_daily_usage'),
  JSON.stringify(u)
 );

 const w=weeklyUsage();

 w.count=(w.count||0)+1;

 localStorage.setItem(
  'cap_weekly_usage_'+store.code,
  JSON.stringify(w)
 )
}

function refreshQuota(){
 const lim=capLimits(),
 used=todayCreated(),
 full=
  used>=lim.daily||
  weekCreated()>=lim.weekly,
 topUsed=topCreatedToday(),
 topFull=topUsed>=lim.top;

 $('#dailyCount').textContent=used;

 $('#suggest').classList.toggle(
  'quota-full',
  full
 );

 $('#topDay').classList.toggle(
  'quota-full',
  full||topFull
 );

 $('#topDay').textContent=
  topFull
   ?'✓ LIMITE TOP ATINGIDO'
   :'🔥 TOP DO DIA';
}

function setCreateMode(mode){
 createMode=mode;

 const top=mode==='top';

 $('#topStatus').classList.toggle(
  'hidden',
  !top
 );

 $('#topDay').classList.toggle(
  'active',
  top
 );
}

$('#topDay').onclick=()=>{
 if(todayCreated()>=capLimits().daily){
  alert('O limite diário de anúncios foi atingido.');
  return
 }

 if(weekCreated()>=capLimits().weekly){
  alert('O limite semanal de anúncios foi atingido.');
  return
 }

 if(topCreatedToday()>=capLimits().top){
  alert('O limite diário de TOP foi atingido.');
  return
 }

 setCreateMode(
  createMode==='top'
   ?'normal'
   :'top'
 );
};

function saveAds(){
 if(!capClientReady)return;

 localStorage.setItem(
  capClientKey('cap_ads'),
  JSON.stringify(ads)
 );

 renderAds()
}

function renderAds(){
 const box=$('#ads');

 box.innerHTML='';

 const now=Date.now();

 ads=ads.filter(
  a=>!a.exp||a.exp>now
 );

 if(capClientReady){
  localStorage.setItem(
   capClientKey('cap_ads'),
   JSON.stringify(ads)
  )
 }

 refreshQuota();

 if(!ads.length){
  box.innerHTML=
   '<div class="empty">Nenhum anúncio ativo.</div>';
 }

 ads.forEach((a,i)=>{
  let d=document.createElement('div');

  d.className=
   'ad'+
   (a.top?' top-ad':'');

  const label=
   a.label||
   a.product||
   'anúncio';

  d.innerHTML=
   `<div class="copy"><b>${a.top?'<span class="top-badge">🔥 TOP DO DIA</span>':''}${label}</b><small>${a.voice} • ${a.paused?'Pausado':'Na programação'} • ${a.exp?new Date(a.exp).toLocaleDateString('pt-BR'):'Sempre'}</small><div class="ad-hidden-text hidden">${a.text||''}</div></div><button data-v="${i}">ver texto</button><button data-p="${i}">${a.paused?'▶':'⏸'}</button><button data-d="${i}">🗑</button>`;

  box.appendChild(d)
 });

 $$('[data-v]').forEach(
  b=>b.onclick=()=>{
   const el=b.closest('.ad')
    .querySelector('.ad-hidden-text');

   el.classList.toggle('hidden');

   b.textContent=
    el.classList.contains('hidden')
     ?'ver texto'
     :'ocultar'
  }
 );

 $$('[data-p]').forEach(
  b=>b.onclick=()=>{
   ads[b.dataset.p].paused=
    !ads[b.dataset.p].paused;

   saveAds();
   renderCreatedAudiosV19()
  }
 );

 $$('[data-d]').forEach(
  b=>b.onclick=()=>{
   ads.splice(
    b.dataset.d,
    1
   );

   saveAds();
   renderCreatedAudiosV19()
  }
 );
}

const CAP_SERVER_V50=
 'https://capivara-radio-server.onrender.com';

async function capServerClientV50(code){
 const ctrl=new AbortController(),
 timer=setTimeout(
  ()=>ctrl.abort(),
  20000
 );

 try{
  const r=await fetch(
   CAP_SERVER_V50+
   '/api/client/'+
   encodeURIComponent(code),
   {
    signal:ctrl.signal,
    headers:{
     'Accept':'application/json'
    }
   }
  );

  let data=null;

  try{
   data=await r.json()
  }catch(e){}

  if(r.status===404){
   return null
  }

  if(!r.ok){
   throw new Error(
    'Servidor '+r.status
   )
  }

  const c=
   data?.client||
   data?.data||
   data;

  if(!c||!(c.code||c.codigo)){
   return null
  }

  return {
   name:
    c.name||
    c.nome||
    c.storeName||
    'Loja',

   ramo:
    c.ramo||
    c.activity||
    c.segment||
    'Açougue',

   code:String(
    c.code||
    c.codigo
   ),

   active:
    c.active!==false&&
    c.ativo!==false
  };

 }finally{
  clearTimeout(timer)
 }
}

$('#enter').onclick=async()=>{
 const code=$('#code').value.trim(),
 btn=$('#enter');

 if(!/^\d{6}$/.test(code)){
  $('#loginMsg').textContent=
   'Digite o código de 6 dígitos';

  return
 }

 const old=btn.textContent;

 btn.disabled=true;
 btn.textContent='CONECTANDO...';
 $('#loginMsg').textContent='';

 try{
  const c=
   await capServerClientV50(code);

  if(!c){
   $('#loginMsg').textContent=
    'Código não encontrado';

   return
  }

  if(c.active===false){
   $('#loginMsg').textContent=
    'Rádio bloqueada pelo administrador';

   return
  }

  applyAdmStore(c);

  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');

  renderAds();
  renderCreatedAudiosV19();

 }catch(e){
  console.error(e);

  $('#loginMsg').textContent=
   e.name==='AbortError'
    ?'Servidor demorou para responder. Tente novamente.'
    :'Não foi possível conectar ao servidor';

 }finally{
  btn.disabled=false;
  btn.textContent=old
 }
};

$$('.tab').forEach(
 b=>b.onclick=()=>{
  $$('.tab').forEach(
   x=>x.classList.remove('active')
  );

  $$('.page').forEach(
   x=>x.classList.remove('active')
  );

  b.classList.add('active');

  $('#'+b.dataset.tab)
   .classList.add('active')
 }
);

function promptForGemini(q){
 const mention=
  $('#mentionStore').checked,
 full=
  $('#fullCurrency').checked,
 top=
  createMode==='top';

 return `você é um redator de rádio comercial brasileiro especialista em ${store.type}. crie uma chamada natural e forte para locução. ${top?'este é o anúncio top do dia: dê mais impacto, urgência e exclusividade, sem exageros enganosos.':''} a chamada deve ter no máximo 150 caracteres. escreva em letras minúsculas. não use emojis. ${mention?`pode mencionar o nome ${store.name}.`:'não mencione o nome do estabelecimento.'} transforme números e preços em palavras para a fala. ${full?'em preços, fale reais e centavos por extenso.':'em preços, não diga as palavras reais ou centavos; exemplo: 4,77 deve virar quatro e setenta e sete.'} informação do cliente: ${q}. responda somente com a frase, sem aspas e sem explicações.`
}

async function createTexts(){
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

 let q=$('#brief').value.trim();

 if(selectedProduct){
  const price=
   $('#price').value.trim();

  q=
   (q?q+'; ':'')+
   selectedProduct+
   (price?'; preço '+price:'');
 }

 if(!q)return;

 const btn=$('#suggest');

 if(btn){
  btn.disabled=true;
  btn.textContent='CRIANDO...'
 }

 try{
  const ctrl=
   new AbortController(),
  timer=setTimeout(
   ()=>ctrl.abort(),
   20000
  );

  let r;

  try{
   r=await fetch(
    CAP_SERVER_V50+
    '/api/ai/generate',
    {
     method:'POST',
     signal:ctrl.signal,
     headers:{
      'Content-Type':'application/json',
      'Accept':'application/json'
     },
     body:JSON.stringify({
      prompt:promptForGemini(q),
      text:q,
      pedido:q,
      ramo:
       store?.ramo||
       store?.type||
       '',
      produto:
       selectedProduct||
       '',
      preco:
       ($('#price')?.value||'').trim(),
      top:createMode==='top',
      mentionStore:
       $('#mentionStore')?.checked===true,
      fullCurrency:
       $('#fullCurrency')?.checked===true,
      storeName:
       store?.name||'',
      maxChars:150
     })
    }
   );

  }finally{
   clearTimeout(timer)
  }

  let data={};

  try{
   data=await r.json()
  }catch{}

  if(!r.ok){
   throw new Error(
    data?.error||
    data?.message||
    ('Servidor '+r.status)
   )
  }

  let raw=
   data?.text||
   data?.frase||
   data?.response||
   data?.generated_text||
   data?.data?.text||
   '';

  raw=String(raw||'')
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
   );

  if(!raw){
   throw new Error(
    'O servidor não retornou a frase.'
   )
  }

  const generated=
   raw
    .toLowerCase()
    .slice(0,150);

  if($('#text1')){
   $('#text1').value=
    generated
  }

  $('#brief').value=
   generated;

  if($('#suggestions')){
   $('#suggestions')
    .classList.add('hidden')
  }

  updateCounts();

  document.body.dataset.v24stage=
   'phrase';

 }catch(e){
  console.error(e);

  alert(
   'Não foi possível criar agora.\n\n'+
   (
    e.name==='AbortError'
     ?'Servidor demorou para responder.'
     :e.message
   )
  );

 }finally{
  if(btn){
   btn.disabled=false;
   btn.textContent=
    '✨ CRIAR ANÚNCIO'
  }
 }
}

$('#suggest').onclick=createTexts;

function updateCounts(){}

['1','2'].forEach(
 n=>$('#text'+n).oninput=()=>{
  let el=$('#text'+n);

  el.value=
   el.value
    .toLowerCase()
    .slice(0,150);

  updateCounts()
 }
);

let pendingAudio={};

function capAdDb(){
 return new Promise((ok,no)=>{
  const r=indexedDB.open(
   'CapivaraAdsV19',
   1
  );

  r.onupgradeneeded=()=>{
   if(
    !r.result.objectStoreNames
     .contains('audio')
   ){
    r.result.createObjectStore(
     'audio'
    )
   }
  };

  r.onsuccess=()=>ok(r.result);
  r.onerror=()=>no(r.error)
 })
}

async function capSaveAdBlob(key,blob){
 const d=await capAdDb();

 return new Promise((ok,no)=>{
  const r=d
   .transaction(
    'audio',
    'readwrite'
   )
   .objectStore('audio')
   .put(blob,key);

  r.onsuccess=()=>ok(true);
  r.onerror=()=>no(r.error)
 })
}

async function capGetAdBlob(key){
 const d=await capAdDb();

 return new Promise((ok,no)=>{
  const r=d
   .transaction('audio')
   .objectStore('audio')
   .get(key);

  r.onsuccess=()=>ok(r.result);
  r.onerror=()=>no(r.error)
 })
}

function capAudioLabel(){
 const product=
  (selectedProduct||'anúncio').trim(),
 price=
  ($('#price')?.value||'').trim();

 return price
  ?product+' • '+price
  :product
}

async function capGenerateAudioDirectV201(text){
 text=String(text||'')
  .trim()
  .toLowerCase()
  .slice(0,150);

 if(!text){
  throw new Error(
   'O texto do anúncio está vazio.'
  )
 }

 const last=[...ads]
  .reverse()
  .find(a=>a&&a.voice);

 const lastWasMale=
  last&&
  /mascul|homem/i.test(
   last.voice||''
  );

 const lastWasFemale=
  last&&
  /femin|mulher/i.test(
   last.voice||''
  );

 const female=
  lastWasMale
   ?true
   :lastWasFemale
    ?false
    :false;

 const voiceName=
  female
   ?'Voz feminina'
   :'Voz masculina';

 const r=await fetch(
  CAP_SERVER_V50+
  '/api/voice/generate',
  {
   method:'POST',
   headers:{
    'Content-Type':'application/json',
    'Accept':'audio/mpeg'
   },
   body:JSON.stringify({
    text,
    voiceType:
     female
      ?'adFemale'
      :'adMale'
   })
  }
 );

 if(!r.ok){
  let detail='';

  try{
   const ct=
    r.headers.get(
     'content-type'
    )||'';

   detail=
    ct.includes(
     'application/json'
    )
     ?JSON.stringify(
       await r.json()
      )
     :await r.text();

  }catch{}

  throw new Error(
   'Servidor de voz '+
   r.status+
   (
    detail
     ?' — '+detail.slice(0,180)
     :''
   )
  )
 }

 const blob=await r.blob();

 if(!blob||!blob.size){
  throw new Error(
   'O servidor não retornou áudio.'
  )
 }

 return {
  text,
  voice:voiceName,
  blob,
  top:createMode==='top',
  label:capAudioLabel(),
  product:selectedProduct||'',
  price:
   ($('#price')?.value||'').trim()
 };
}

async function generateVoice(n,btn){
 let text=
  $('#text'+n)
   .value
   .trim()
   .toLowerCase()
   .slice(0,150);

 if(!text)return;

 btn.disabled=true;
 btn.textContent='GERANDO...';

 try{
  const p=
   await capGenerateAudioDirectV201(
    text
   );

  if(pendingAudio[n]?.url){
   URL.revokeObjectURL(
    pendingAudio[n].url
   )
  }

  const url=
   URL.createObjectURL(
    p.blob
   );

  pendingAudio[n]={
   ...p,
   url
  };

  $('#audio'+n).src=url;

  $('#actions'+n)
   .classList.remove('hidden');

  btn.textContent=
   '✓ ÁUDIO PRONTO';

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
}

$$('[data-gen]').forEach(
 b=>b.onclick=()=>
  generateVoice(
   b.dataset.gen,
   b
  )
);

function playTopSting(){
 try{
  const C=
   window.AudioContext||
   window.webkitAudioContext,
  ctx=new C(),
  g=ctx.createGain();

  g.connect(
   ctx.destination
  );

  g.gain.setValueAtTime(
   .0001,
   ctx.currentTime
  );

  g.gain.exponentialRampToValueAtTime(
   .18,
   ctx.currentTime+.03
  );

  g.gain.exponentialRampToValueAtTime(
   .0001,
   ctx.currentTime+1.05
  );

  [
   [392,0],
   [523.25,.18],
   [659.25,.36],
   [784,.58]
  ].forEach(([f,t])=>{
   const o=
    ctx.createOscillator();

   o.type='sine';
   o.frequency.value=f;

   o.connect(g);

   o.start(
    ctx.currentTime+t
   );

   o.stop(
    ctx.currentTime+t+.32
   )
  });

  return new Promise(
   r=>setTimeout(
    ()=>{
     ctx.close();
     r()
    },
    1120
   )
  );

 }catch{
  return Promise.resolve()
 }
}

$$('[data-preview]').forEach(
 b=>b.onclick=async()=>{
  const n=b.dataset.preview,
  a=$('#audio'+n);

  if(!a.src)return;

  if(pendingAudio[n]?.top){
   await playTopSting()
  }

  a.currentTime=0;

  a.play().catch(
   ()=>alert(
    'Não foi possível tocar a prévia.'
   )
  );
 }
);

$$('[data-queue]').forEach(
 b=>b.onclick=async()=>{
  const n=b.dataset.queue,
  p=pendingAudio[n];

  if(!p)return;

  let days=+$('#duration').value,
  exp=days
   ?Date.now()+days*86400000
   :null;

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
   p.top&&
   topCreatedToday()>=capLimits().top
  ){
   alert(
    'O limite diário de TOP foi atingido.'
   );
   return
  }

  const id=
   'ad_'+
   Date.now()+
   '_'+
   Math.random()
    .toString(36)
    .slice(2,7),

  audioKey=
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
   return
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

  registerUse(
   !!p.top
  );

  localStorage.setItem(
   capClientKey(
    'cap_voice_queued_count'
   ),
   String(
    +(
     localStorage.getItem(
      capClientKey(
       'cap_voice_queued_count'
      )
     )||0
    )+1
   )
  );

  pendingAudio[n]=null;

  $('#actions'+n)
   .classList.add('hidden');

  $('#audio'+n)
   .removeAttribute('src');

  b.textContent=
   '✓ NA PROGRAMAÇÃO';

  setTimeout(
   ()=>b.textContent=
    '➕ MANDAR PRA FILA',
   900
  );

  saveAds();
  renderCreatedAudiosV19();
  capResetCreateV20();
  capStageV21('start');

  if(p.top){
   setCreateMode('normal')
  }
 }
);
````
````javascript
function capSafeJson(key,fallback){
 try{
  const v=JSON.parse(localStorage.getItem(key)||'null');
  return v==null?fallback:v
 }catch(e){
  return fallback
 }
}

function capAudioVolume(){
 const el=document.getElementById('musicVol');

 return Math.max(
  0,
  Math.min(
   1,
   Number(el?.value||75)/100
  )
 )
}

let radioAudio=null,
radioIndex=0;

function stopRadioAudio(){
 if(!radioAudio)return;

 try{
  radioAudio.onended=null;
  radioAudio.onerror=null;
  radioAudio.pause();
  radioAudio.currentTime=0;

  if(radioAudio._capObjectUrl){
   URL.revokeObjectURL(
    radioAudio._capObjectUrl
   )
  }
 }catch(e){}

 radioAudio=null
}

async function capGetMusicBlobV11(meta){
 if(!meta)return null;

 try{
  const db=await capOpenDbV36(
   'CapivaraAcervoV9',
   1,
   'files'
  );

  return await new Promise(
   (ok,no)=>{
    const tx=db.transaction('files'),
    st=tx.objectStore('files');

    const keys=[
     meta.id,
     'music:'+meta.id,
     meta.audioKey,
     meta.fileKey
    ].filter(Boolean);

    let i=0;

    const next=()=>{
     if(i>=keys.length){
      ok(null);
      return
     }

     const q=st.get(keys[i++]);

     q.onsuccess=()=>{
      if(q.result){
       ok(q.result)
      }else{
       next()
      }
     };

     q.onerror=()=>next()
    };

    next()
   }
  );

 }catch(e){
  return null
 }
}

async function capResolveMusicUrlV11(meta){
 if(!meta)return null;

 const direct=
  meta.audioUrl||
  meta.url||
  meta.src||
  meta.fileUrl;

 if(direct){
  return {
   url:direct,
   object:false
  }
 }

 const blob=
  await capGetMusicBlobV11(meta);

 if(blob){
  return {
   url:URL.createObjectURL(blob),
   object:true
  }
 }

 return null
}

async function playNextAdmMusic(){
 if(!playing)return;

 if(pendingThemeV11){
  selectedThemeV11=
   pendingThemeV11;

  pendingThemeV11=null;

  localStorage.setItem(
   'capivara_theme_'+store.code,
   selectedThemeV11
  );

  radioIndex=0;

  renderThemesV11();
  updateAdmStatus()
 }

 const list=
  themeMusicV11(
   selectedThemeV11
  );

 if(!list.length){
  $('#nowTitle').textContent=
   'Tema sem músicas';

  $('#nowSub').textContent=
   selectedThemeV11;

  return
 }

 const meta=
  list[
   radioIndex%
   list.length
  ];

 radioIndex=
  (radioIndex+1)%
  list.length;

 const source=
  await capResolveMusicUrlV11(
   meta
  );

 if(!source){
  setTimeout(
   ()=>{
    if(playing){
     playNextAdmMusic()
    }
   },
   300
  );

  return
 }

 stopRadioAudio();

 const a=
  new Audio(
   source.url
  );

 radioAudio=a;

 if(source.object){
  a._capObjectUrl=
   source.url
 }

 a.volume=
  capAudioVolume();

 $('#nowTitle').textContent=
  meta.name||
  meta.title||
  'Música';

 $('#nowSub').textContent=
  selectedThemeV11;

 a.onended=async()=>{
  if(a._capObjectUrl){
   try{
    URL.revokeObjectURL(
     a._capObjectUrl
    )
   }catch(e){}
  }

  if(radioAudio===a){
   radioAudio=null
  }

  if(!playing)return;

  await capRadioAfterMusicV16()
 };

 a.onerror=()=>{
  if(a._capObjectUrl){
   try{
    URL.revokeObjectURL(
     a._capObjectUrl
    )
   }catch(e){}
  }

  if(radioAudio===a){
   radioAudio=null
  }

  if(playing){
   setTimeout(
    playNextAdmMusic,
    300
   )
  }
 };

 try{
  await a.play()
 }catch(e){
  console.error(
   'Música:',
   e
  );

  if(playing){
   setTimeout(
    playNextAdmMusic,
    500
   )
  }
 }
}

function capSetPlayingUI(){
 const btn=
  document.getElementById(
   'radioToggle'
  );

 if(btn){
  btn.textContent=
   playing
    ?'⏸ PAUSAR RÁDIO'
    :'▶ LIGAR RÁDIO';

  btn.classList.toggle(
   'active',
   playing
  )
 }

 const state=
  document.getElementById(
   'radioState'
  );

 if(state){
  state.textContent=
   playing
    ?'● NO AR'
    :'● PAUSADA'
 }
}

function startRadio(){
 if(playing)return;

 playing=true;

 capSetPlayingUI();

 if(
  radioAudio&&
  radioAudio.src
 ){
  radioAudio.volume=
   capAudioVolume();

  radioAudio.play()
   .catch(
    ()=>playNextAdmMusic()
   );

  return
 }

 playNextAdmMusic()
}

function pauseRadio(){
 playing=false;

 capSetPlayingUI();

 try{
  if(radioAudio){
   radioAudio.pause()
  }
 }catch(e){}

 try{
  if(window.capCurrentSpokenAudio){
   window.capCurrentSpokenAudio.pause();
   window.capCurrentSpokenAudio=null
  }
 }catch(e){}

 try{
  if(window.capCurrentBedAudio){
   window.capCurrentBedAudio.pause();
   window.capCurrentBedAudio=null
  }
 }catch(e){}
}

function toggleRadio(){
 if(playing){
  pauseRadio()
 }else{
  startRadio()
 }
}

window.startRadio=startRadio;
window.pauseRadio=pauseRadio;
window.toggleRadio=toggleRadio;

document.addEventListener(
 'DOMContentLoaded',
 ()=>{
  const btn=
   document.getElementById(
    'radioToggle'
   );

  if(btn){
   btn.onclick=
    toggleRadio
  }

  capSetPlayingUI()
 }
);

function capSettingsKey(){
 return 'cap_settings_'+
  String(
   store.code||
   'default'
  )
}

function capLoadSettings(){
 const s=
  capSafeJson(
   capSettingsKey(),
   {}
  );

 const cfg={
  ...defaults,
  ...s
 };

 const music=
  document.getElementById(
   'musicVol'
  );

 const bed=
  document.getElementById(
   'bedVol'
  );

 const jingles=
  document.getElementById(
   'jingles'
  );

 const mention=
  document.getElementById(
   'mentionStore'
  );

 const currency=
  document.getElementById(
   'fullCurrency'
  );

 const open=
  document.getElementById(
   'open'
  );

 const close=
  document.getElementById(
   'close'
  );

 if(music){
  music.value=
   cfg.musicVol
 }

 if(bed){
  bed.value=
   cfg.bedVol
 }

 if(jingles){
  jingles.checked=
   cfg.jingles!==false
 }

 if(mention){
  mention.checked=
   !!cfg.mentionStore
 }

 if(currency){
  currency.checked=
   !!cfg.fullCurrency
 }

 if(open){
  open.value=
   cfg.open||
   defaults.open
 }

 if(close){
  close.value=
   cfg.close||
   defaults.close
 }
}

function capSaveSettings(){
 if(!capClientReady)return;

 const s={
  musicVol:
   document.getElementById(
    'musicVol'
   )?.value||
   defaults.musicVol,

  bedVol:
   document.getElementById(
    'bedVol'
   )?.value||
   defaults.bedVol,

  jingles:
   document.getElementById(
    'jingles'
   )?.checked!==false,

  mentionStore:
   document.getElementById(
    'mentionStore'
   )?.checked===true,

  fullCurrency:
   document.getElementById(
    'fullCurrency'
   )?.checked===true,

  open:
   document.getElementById(
    'open'
   )?.value||
   defaults.open,

  close:
   document.getElementById(
    'close'
   )?.value||
   defaults.close
 };

 localStorage.setItem(
  capSettingsKey(),
  JSON.stringify(s)
 )
}

[
 'musicVol',
 'bedVol',
 'jingles',
 'mentionStore',
 'fullCurrency',
 'open',
 'close'
].forEach(id=>{
 document.addEventListener(
  'change',
  e=>{
   if(e.target?.id===id){
    capSaveSettings()
   }
  }
 )
});

function setAdsPerBlock(
 value,
 save=true
){
 value=Math.max(
  1,
  parseInt(
   value||3,
   10
  )
 );

 const el=
  document.getElementById(
   'adsPerBlock'
  );

 if(el){
  el.value=value
 }

 if(
  save&&
  capClientReady
 ){
  localStorage.setItem(
   'cap_ads_per_block_'+
   store.code,
   String(value)
  );

  if(
   typeof capPushClientStateV50===
   'function'
  ){
   capPushClientStateV50()
  }
 }
}

window.setAdsPerBlock=
 setAdsPerBlock;

document.addEventListener(
 'change',
 e=>{
  if(
   e.target?.id===
   'adsPerBlock'
  ){
   setAdsPerBlock(
    e.target.value,
    true
   )
  }
 }
);

const capOldApplySettings=
 applyAdmStore;

applyAdmStore=function(c){
 capOldApplySettings(c);

 setTimeout(
  ()=>{
   capLoadSettings();

   const saved=
    localStorage.getItem(
     'cap_ads_per_block_'+
     store.code
    );

   if(saved){
    setAdsPerBlock(
     saved,
     false
    )
   }

   if(
    typeof capApplyMusicVolumeV39===
    'function'
   ){
    capApplyMusicVolumeV39()
   }

   if(
    typeof capApplyBedVolumeV39===
    'function'
   ){
    capApplyBedVolumeV39()
   }
  },
  0
 )
};

function capCleanTextV14(text){
 return String(text||'')
  .replace(/\s+/g,' ')
  .trim()
  .toLowerCase()
  .slice(0,150)
}

function capTextForSpeechV14(text){
 return String(text||'')
  .replace(
   /\btrês\b/gi,
   'trêis'
  )
  .replace(
   /\bpera\b/gi,
   'pêra'
  )
}

function capSelectedProductV14(){
 return String(
  selectedProduct||
  ''
 ).trim()
}

function capCurrentPriceV14(){
 return String(
  document.getElementById(
   'price'
  )?.value||
  ''
 ).trim()
}

function capCurrentBriefV14(){
 return String(
  document.getElementById(
   'brief'
  )?.value||
  ''
 ).trim()
}

function capBuildRequestV14(){
 const produto=
  capSelectedProductV14();

 const preco=
  capCurrentPriceV14();

 const livre=
  capCurrentBriefV14();

 const parts=[];

 if(livre){
  parts.push(livre)
 }

 if(produto){
  parts.push(
   'produto ou serviço: '+
   produto
  )
 }

 if(preco){
  parts.push(
   'preço informado: '+
   preco
  )
 }

 return parts.join('. ')
}

function capSetGeneratedTextV14(
 text
){
 text=
  capCleanTextV14(
   text
  );

 const brief=
  document.getElementById(
   'brief'
  );

 const text1=
  document.getElementById(
   'text1'
  );

 if(brief){
  brief.value=text
 }

 if(text1){
  text1.value=text
 }

 return text
}

function capGetGeneratedTextV14(){
 const brief=
  document.getElementById(
   'brief'
  );

 return capCleanTextV14(
  brief?.value||
  ''
 )
}

function capButtonBusyV14(
 btn,
 busy,
 normalText,
 busyText
){
 if(!btn)return;

 btn.disabled=!!busy;

 btn.textContent=
  busy
   ?busyText
   :normalText
}

async function capGenerateTextV14(){
 if(
  todayCreated()>=
  capLimits().daily
 ){
  alert(
   'O limite diário de anúncios foi atingido.'
  );

  return
 }

 if(
  weekCreated()>=
  capLimits().weekly
 ){
  alert(
   'O limite semanal de anúncios foi atingido.'
  );

  return
 }

 if(
  createMode==='top'&&
  topCreatedToday()>=
  capLimits().top
 ){
  alert(
   'O limite diário de TOP foi atingido.'
  );

  return
 }

 const q=
  capBuildRequestV14();

 if(!q){
  alert(
   'Escolha um produto ou escreva o que quer anunciar.'
  );

  return
 }

 const btn=
  document.getElementById(
   'suggest'
  );

 capButtonBusyV14(
  btn,
  true,
  '✨ CRIAR ANÚNCIO',
  'CRIANDO...'
 );

 try{
  const ctrl=
   new AbortController();

  const timer=
   setTimeout(
    ()=>ctrl.abort(),
    20000
   );

  let r;

  try{
   r=await fetch(
    CAP_SERVER_V50+
    '/api/ai/generate',
    {
     method:'POST',
     signal:ctrl.signal,
     headers:{
      'Content-Type':
       'application/json',
      'Accept':
       'application/json'
     },
     body:JSON.stringify({
      prompt:
       promptForGemini(q),

      text:q,
      pedido:q,

      ramo:
       store?.ramo||
       store?.type||
       '',

      produto:
       capSelectedProductV14(),

      preco:
       capCurrentPriceV14(),

      top:
       createMode==='top',

      mentionStore:
       document
        .getElementById(
         'mentionStore'
        )
        ?.checked===true,

      fullCurrency:
       document
        .getElementById(
         'fullCurrency'
        )
        ?.checked===true,

      storeName:
       store?.name||
       '',

      maxChars:150
     })
    }
   );

  }finally{
   clearTimeout(timer)
  }

  let data={};

  try{
   data=await r.json()
  }catch(e){}

  if(!r.ok){
   throw new Error(
    data?.error||
    data?.message||
    (
     'Servidor '+
     r.status
    )
   )
  }

  let raw=
   data?.text||
   data?.frase||
   data?.response||
   data?.generated_text||
   data?.data?.text||
   '';

  raw=String(raw||'')
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
   );

  if(!raw){
   throw new Error(
    'O servidor não retornou a frase.'
   )
  }

  capSetGeneratedTextV14(
   raw
  );

  document.body.dataset.v24stage=
   'phrase';

 }catch(e){
  console.error(e);

  alert(
   'Não foi possível criar agora.\n\n'+
   (
    e.name==='AbortError'
     ?'Servidor demorou para responder.'
     :e.message
   )
  );

 }finally{
  capButtonBusyV14(
   btn,
   false,
   '✨ CRIAR ANÚNCIO',
   'CRIANDO...'
  )
 }
}

function capBindGenerateV14(){
 const btn=
  document.getElementById(
   'suggest'
  );

 if(!btn)return;

 btn.onclick=
  capGenerateTextV14
}

document.addEventListener(
 'DOMContentLoaded',
 capBindGenerateV14
);

function capStoreOpenNow(){
 const open=
  document.getElementById(
   'open'
  )?.value||
  defaults.open;

 const close=
  document.getElementById(
   'close'
  )?.value||
  defaults.close;

 if(!open||!close){
  return true
 }

 const now=
  new Date();

 const current=
  now.getHours()*60+
  now.getMinutes();

 const [oh,om]=
  open.split(':')
   .map(Number);

 const [ch,cm]=
  close.split(':')
   .map(Number);

 const start=
  oh*60+om;

 const end=
  ch*60+cm;

 if(start===end){
  return true
 }

 if(start<end){
  return (
   current>=start&&
   current<end
  )
 }

 return (
  current>=start||
  current<end
 )
}

function capCheckSchedule(){
 if(!playing)return;

 if(!capStoreOpenNow()){
  pauseRadio();

  const t=
   document.getElementById(
    'nowTitle'
   );

  const s=
   document.getElementById(
    'nowSub'
   );

  if(t){
   t.textContent=
    'Fora do horário'
  }

  if(s){
   s.textContent=
    'A rádio volta no horário configurado.'
  }
 }
}

setInterval(
 capCheckSchedule,
 60000
);

function capFormatDuration(
 exp
){
 if(!exp){
  return 'sempre'
 }

 const diff=
  exp-Date.now();

 if(diff<=0){
  return 'expirado'
 }

 const days=
  Math.ceil(
   diff/86400000
  );

 return days===1
  ?'1 dia'
  :days+' dias'
}

function capSyncExpiredAds(){
 if(!capClientReady)return;

 const before=
  ads.length;

 const now=
  Date.now();

 ads=
  ads.filter(
   a=>
    !a.exp||
    a.exp>now
  );

 if(
  before!==ads.length
 ){
  saveAds()
 }
}

setInterval(
 capSyncExpiredAds,
 60000
);

function capNormalizeRamoPackage(
 ramo
){
 const packs=
  admPackages();

 return (
  packs[ramo]||
  packs[
   Object.keys(packs)
    .find(
     k=>
      normRamo(k)===
      normRamo(ramo)
    )
  ]||
  {}
 )
}

function capApplyPackageDefaults(){
 if(!capClientReady)return;

 const pkg=
  capNormalizeRamoPackage(
   store.ramo
  );

 if(!pkg)return;

 if(pkg.adsPerBlock){
  setAdsPerBlock(
   pkg.adsPerBlock,
   false
  )
 }
}

const capOldApplyPackage=
 applyAdmStore;

applyAdmStore=function(c){
 capOldApplyPackage(c);

 setTimeout(
  capApplyPackageDefaults,
  0
 )
};

function capEscapeHtml(s){
 return String(s||'')
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;')
  .replace(/'/g,'&#039;')
}

function capShowClientHeader(){
 const name=
  document.getElementById(
   'storeName'
  );

 if(name){
  name.textContent=
   store.name||
   'Capivara Rádio'
 }
}

const capOldApplyHeader=
 applyAdmStore;

applyAdmStore=function(c){
 capOldApplyHeader(c);

 setTimeout(
  capShowClientHeader,
  0
 )
};

function capSafeStopAudio(
 audio
){
 if(!audio)return;

 try{
  audio.pause();
  audio.currentTime=0
 }catch(e){}
}

window.addEventListener(
 'beforeunload',
 ()=>{
  capSafeStopAudio(
   radioAudio
  );

  capSafeStopAudio(
   window.capCurrentSpokenAudio
  );

  capSafeStopAudio(
   window.capCurrentBedAudio
  )
 }
);

function capPreviewCurrentText(){
 const text=
  capGetGeneratedTextV14();

 if(!text){
  return
 }

 const el=
  document.getElementById(
   'text1'
  );

 if(el){
  el.value=text
 }
}

document.addEventListener(
 'input',
 e=>{
  if(
   e.target?.id===
   'brief'
  ){
   const v=
    String(
     e.target.value||
     ''
    )
    .toLowerCase()
    .slice(0,150);

   if(e.target.value!==v){
    e.target.value=v
   }

   const text1=
    document.getElementById(
     'text1'
    );

   if(text1){
    text1.value=v
   }
  }
 }
);

function capResetPendingAudio(){
 Object.keys(
  pendingAudio||
  {}
 ).forEach(k=>{
  const p=
   pendingAudio[k];

  if(p?.url){
   try{
    URL.revokeObjectURL(
     p.url
    )
   }catch(e){}
  }
 });

 pendingAudio={}
}

function capClientLogout(){
 pauseRadio();

 capResetPendingAudio();

 capClientReady=false;
 ads=[];
 voiceTurn=0;
 selectedProduct='';

 const app=
  document.getElementById(
   'app'
  );

 const login=
  document.getElementById(
   'login'
  );

 if(app){
  app.classList.add(
   'hidden'
  )
 }

 if(login){
  login.classList.remove(
   'hidden'
  )
 }

 const code=
  document.getElementById(
   'code'
  );

 if(code){
  code.value='';
  code.focus()
 }
}

window.capClientLogout=
 capClientLogout;

function capRadioResume(){
 if(!playing)return;

 if(
  radioAudio&&
  radioAudio.paused
 ){
  radioAudio.volume=
   capAudioVolume();

  radioAudio.play()
   .catch(()=>{})
 }
}

document.addEventListener(
 'visibilitychange',
 ()=>{
  if(
   document.visibilityState===
   'visible'
  ){
   capRadioResume()
  }
 }
);

function capRefreshAll(){
 if(!capClientReady)return;

 capLoadSettings();
 renderProducts();
 renderProductEditor();
 renderAds();
 renderCreatedAudiosV19();
 renderThemesV11();
 updateAdmStatus();
 refreshQuota();
 capSetPlayingUI()
}

window.capRefreshAll=
 capRefreshAll;

document.addEventListener(
 'DOMContentLoaded',
 ()=>{
  refreshQuota();
  renderThemesV11();
  capSetPlayingUI()
 }
);

let capAdCursorV16=0,
capBedCursorV36=0,
capJingleCursorV36={
 open:0,
 close:0
};

function capModeCountV16(){
 const el=
  document.getElementById(
   'adsPerBlock'
  );

 const c=(()=>{
  try{
   return JSON.parse(
    localStorage.getItem(
     'capivara_admin_settings'
    )||'{}'
   )
  }catch(e){
   return {}
  }
 })();

 return Math.max(
  1,
  parseInt(
   (
    el&&el.value
   )||
   localStorage.getItem(
    'cap_ads_per_block_'+
    store.code
   )||
   c.defaultAdsPerBlock||
   3,
   10
  )
 )
}

function capActiveAdsV16(){
 if(!capClientReady){
  return []
 }

 let arr=[];

 try{
  arr=JSON.parse(
   localStorage.getItem(
    capClientKey(
     'cap_ads'
    )
   )||'[]'
  )
 }catch(e){
  arr=[]
 }

 if(!Array.isArray(arr)){
  arr=[]
 }

 const now=
  Date.now();

 return arr.filter(
  a=>
   a&&
   a.paused!==true&&
   a.active!==false&&
   (
    !a.exp||
    a.exp>now
   )&&
   (
    !a.expiresAt||
    new Date(
     a.expiresAt
    ).getTime()>=now
   )
 )
}

async function capPlayUrlV16(
 url,
 volume=1
){
 if(!url){
  return false
 }

 return await new Promise(
  resolve=>{
   const a=
    new Audio(url);

   window.capCurrentSpokenAudio=
    a;

   a.volume=
    Math.max(
     0,
     Math.min(
      1,
      volume
     )
    );

   let finished=false;

   const done=ok=>{
    if(finished)return;

    finished=true;

    a.onended=null;
    a.onerror=null;

    if(
     window.capCurrentSpokenAudio===
     a
    ){
     window.capCurrentSpokenAudio=
      null
    }

    resolve(ok)
   };

   a.onended=
    ()=>done(true);

   a.onerror=
    ()=>done(false);

   a.play()
    .catch(
     ()=>done(false)
    )
  }
 )
}

async function capPlayAdV16(ad){
 if(!ad){
  return false
 }

 const url=
  ad.audioUrl||
  ad.url||
  ad.audio||
  ad.src;

 if(url){
  return await capPlayUrlV16(
   url,
   Math.max(
    0,
    Math.min(
     1,
     Number(
      document.getElementById(
       'adVol'
      )?.value||
      100
     )/100
    )
   )
  )
 }

 if(ad.audioKey){
  try{
   const blob=
    await capGetAdBlob(
     ad.audioKey
    );

   if(blob){
    const u=
     URL.createObjectURL(
      blob
     );

    const ok=
     await capPlayUrlV16(
      u,
      Math.max(
       0,
       Math.min(
        1,
        Number(
         document.getElementById(
          'adVol'
         )?.value||
         100
        )/100
       )
      )
     );

    URL.revokeObjectURL(
     u
    );

    return ok
   }
  }catch(e){
   console.error(e)
  }
 }

 return false
}

function capOpenDbV36(
 name,
 version,
 storeName
){
 return new Promise(
  (ok,no)=>{
   const r=
    indexedDB.open(
     name,
     version,
     storeName
    );

   r.onsuccess=
    ()=>ok(r.result);

   r.onerror=
    ()=>no(r.error)
  }
 )
}

async function capGetDbBlobV36(
 dbName,
 version,
 storeName,
 key
){
 try{
  const db=
   await capOpenDbV36(
    dbName,
    version,
    storeName
   );

  return await new Promise(
   (ok,no)=>{
    const q=
     db.transaction(
      storeName
     )
     .objectStore(
      storeName
     )
     .get(key);

    q.onsuccess=
     ()=>ok(
      q.result||
      null
     );

    q.onerror=
     ()=>no(q.error)
   }
  );

 }catch(e){
  return null
 }
}

/* =========================================================
   VINHETAS
   ESTA É A PARTE QUE VAMOS CORRIGIR SEM MEXER NO RESTO
========================================================= */

let capOnlineJinglesV51=[];
let capOnlineJinglesLoadedV51=0;

function capNormJingleV51(v){
 return String(v||'')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .trim()
  .toLowerCase()
}

async function capLoadOnlineJinglesV51(
 force=false
){
 if(
  !force&&
  capOnlineJinglesLoadedV51&&
  (
   Date.now()-
   capOnlineJinglesLoadedV51
  )<30000
 ){
  return capOnlineJinglesV51
 }

 try{
  const r=
   await fetch(
    CAP_SERVER_V50+
    '/api/jingles',
    {
     cache:'no-store',
     headers:{
      'Accept':
       'application/json'
     }
    }
   );

  if(!r.ok){
   return []
  }

  const data=
   await r.json();

  const raw=
   data?.jingles||
   data?.data||
   data||
   [];

  if(Array.isArray(raw)){
   capOnlineJinglesV51=
    raw
  }else{
   capOnlineJinglesV51=
    [];

   Object.entries(raw)
    .forEach(
     ([ramo,cats])=>{
      if(
       !cats||
       typeof cats!==
       'object'
      ){
       return
      }

      Object.entries(cats)
       .forEach(
        ([category,items])=>{
         const list=
          Array.isArray(items)
           ?items
           :items
            ?[items]
            :[];

         list.forEach(
          item=>{
           if(
            item&&
            typeof item===
            'object'
           ){
            capOnlineJinglesV51
             .push({
              ...item,
              ramo:
               item.ramo||
               ramo,
              category:
               item.category||
               item.categoria||
               category
             })
           }
          }
         )
        }
       )
     }
    )
  }

  capOnlineJinglesLoadedV51=
   Date.now();

  return capOnlineJinglesV51

 }catch(e){
  console.warn(
   'Vinhetas online:',
   e
  );

  return []
 }
}

function capJingleCategoryV51(v){
 return capNormJingleV51(
  v?.category||
  v?.categoria||
  v?.type||
  v?.tipo||
  v?.slot||
  v?.group||
  ''
 )
}

function capJingleRamoV51(v){
 return capNormJingleV51(
  v?.ramo||
  v?.segment||
  v?.activity||
  v?.businessType||
  ''
 )
}

function capJingleMatchesRamoV51(v){
 const vr=
  capJingleRamoV51(v);

 if(!vr){
  return true
 }

 const sr=
  capNormJingleV51(
   store?.ramo||
   store?.type||
   ''
  );

 return vr===sr
}

function capJingleMatchesKindV51(
 v,
 kind
){
 const c=
  capJingleCategoryV51(v);

 if(kind==='opening'){
  return (
   !c.includes('top')&&
   (
    c.includes('offeropen')||
    c.includes('entrada')||
    c.includes('opening')||
    c.includes('abertura')||
    c.includes('inicio')
   )
  )
 }

 if(kind==='closing'){
  return (
   !c.includes('top')&&
   (
    c.includes('offerclose')||
    c.includes('saida')||
    c.includes('closing')||
    c.includes('fechamento')||
    c.includes('fim')
   )
  )
 }

 return false
}

function capJingleUrlV51(v){
 if(!v){
  return ''
 }

 const direct=
  v.audioUrl||
  v.audio_url||
  v.url||
  v.src||
  v.fileUrl;

 if(direct){
  if(
   /^https?:\/\//i.test(
    direct
   )
  ){
   return direct
  }

  return (
   CAP_SERVER_V50+
   (
    String(direct)
     .startsWith('/')
     ?''
     :'/'
   )+
   direct
  )
 }

 const mediaId=
  v.mediaId||
  v.media_id||
  v.audioId||
  v.audio_id||
  v.fileId||
  v.file_id;

 if(mediaId){
  return (
   CAP_SERVER_V50+
   '/api/media/'+
   encodeURIComponent(
    mediaId
   )
  )
 }

 return ''
}

async function capOptionalJingleV16(
 kind
){
 const enabled=
  document.getElementById(
   'jingles'
  )?.checked===true;

 if(!enabled){
  return false
 }

 try{
  const online=
   await capLoadOnlineJinglesV51();

  const ready=
   online.filter(
    v=>
     v&&
     v.active!==false&&
     v.ativo!==false&&
     v.paused!==true&&
     v.pausado!==true&&
     capJingleMatchesRamoV51(v)&&
     capJingleMatchesKindV51(
      v,
      kind
     )
   );

  if(ready.length){
   const ck=
    kind==='opening'
     ?'open'
     :'close';

   const v=
    ready[
     capJingleCursorV36[
      ck
     ]++%
     ready.length
    ];

   const url=
    capJingleUrlV51(v);

   if(url){
    const ok=
     await capPlayUrlV16(
      url,
      1
     );

    if(ok){
     return true
    }
   }
  }

  const all=
   JSON.parse(
    localStorage.getItem(
     'capivara_vignettes_v8'
    )||'{}'
   );

  const ramo=
   all[store.ramo]||
   all[store.type]||
   {};

  const cat=
   kind==='opening'
    ?'offerOpen'
    :'offerClose';

  const arr=
   Array.isArray(
    ramo[cat]
   )
    ?ramo[cat]
    :[];

  const localReady=
   arr.filter(
    v=>v&&v.audioKey
   );

  if(localReady.length){
   const ck=
    kind==='opening'
     ?'open'
     :'close';

   const v=
    localReady[
     capJingleCursorV36[
      ck
     ]++%
     localReady.length
    ];

   const blob=
    await capGetDbBlobV36(
     'CapivaraRadioAudio',
     1,
     'audios',
     v.audioKey
    );

   if(blob){
    const u=
     URL.createObjectURL(
      blob
     );

    const ok=
     await capPlayUrlV16(
      u,
      1
     );

    URL.revokeObjectURL(
     u
    );

    if(ok){
     return true
    }
   }
  }

  const legacy=
   JSON.parse(
    localStorage.getItem(
     'capivara_radio_jingles'
    )||'{}'
   );

  const j=
   legacy[kind];

  if(
   j&&
   !j.paused&&
   j.active!==false
  ){
   return await capPlayUrlV16(
    j.audioUrl||
    j.url||
    j.src,
    1
   )
  }

 }catch(e){
  console.error(
   'Vinheta:',
   e
  )
 }

 return false
}

async function capStartBedV36(){
 try{
  const bg=
   JSON.parse(
    localStorage.getItem(
     'capivara_backgrounds_v9'
    )||'[]'
   );

  if(
   !Array.isArray(bg)||
   !bg.length
  ){
   return null
  }

  const meta=
   bg[
    capBedCursorV36++%
    bg.length
   ];

  const blob=
   await capGetDbBlobV36(
    'CapivaraAcervoV9',
    1,
    'files',
    'bg:'+meta.id
   );

  if(!blob){
   return null
  }

  const u=
   URL.createObjectURL(
    blob
   );

  const a=
   new Audio(u);

  window.capCurrentBedAudio=
   a;

  a.loop=true;

  a.volume=
   Math.max(
    0,
    Math.min(
     1,
     +(
      document.getElementById(
       'bedVol'
      )?.value||
      6
     )/100
    )
   );

  a._capUrl=u;

  await a.play()
   .catch(()=>{});

  return a

 }catch(e){
  console.error(
   'Fundo:',
   e
  );

  return null
 }
}

function capStopBedV36(a){
 if(!a)return;

 try{
  a.pause();
  a.currentTime=0;

  if(
   window.capCurrentBedAudio===
   a
  ){
   window.capCurrentBedAudio=
    null
  }

  if(a._capUrl){
   URL.revokeObjectURL(
    a._capUrl
   )
  }

 }catch(e){}
}

async function capRadioAfterMusicV16(){
 const active=
  capActiveAdsV16();

 if(!active.length){
  playNextAdmMusic();
  return
 }

 const qty=
  Math.min(
   capModeCountV16(),
   active.length
  );

 const block=[];

 for(
  let i=0;
  i<qty;
  i++
 ){
  block.push(
   active[
    (
     capAdCursorV16+i
    )%
    active.length
   ]
  )
 }

 capAdCursorV16=
  (
   capAdCursorV16+
   qty
  )%
  active.length;

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
   'Bloco comercial'
 }

 if(sub){
  sub.textContent=
   document.getElementById(
    'jingles'
   )?.checked
    ?'Vinheta de entrada'
    :'Bloco comercial'
 }

 await capOptionalJingleV16(
  'opening'
 );

 if(sub){
  sub.textContent=
   'Anúncios no ar • fundo de locução'
 }

 const bed=
  await capStartBedV36();

 try{
  for(
   const ad of block
  ){
   await capPlayAdV16(
    ad
   )
  }

 }finally{
  capStopBedV36(
   bed
  )
 }

 if(sub){
  sub.textContent=
   document.getElementById(
    'jingles'
   )?.checked
    ?'Vinheta de saída'
    :'Fim do bloco'
 }

 await capOptionalJingleV16(
  'closing'
 );

 playNextAdmMusic()
}
````
function renderCreatedAudiosV19(){
 const box=document.getElementById('createdAudiosV19');

 if(!box)return;

 if(!capClientReady||!ads.length){
  box.innerHTML='<div class="empty">Nenhum áudio criado.</div>';
  return
 }

 box.innerHTML='';

 [...ads].reverse().forEach(a=>{
  const row=document.createElement('div'),
  female=(a.voice||'').toLowerCase().includes('femin');

  row.className='created-audio-v19 '+(female?'female':'male');

  row.innerHTML=
   `<div><b>${a.label||a.product||'anúncio'}</b><small>${female?'Mulher':'Homem'} • ${a.paused?'Pausado':'Na programação'}</small></div><button type="button">▶</button>`;

  row.querySelector('button').onclick=async()=>{
   if(a.audioKey){
    const blob=await capGetAdBlob(a.audioKey);

    if(blob){
     const u=URL.createObjectURL(blob),
     au=new Audio(u);

     au.onended=()=>URL.revokeObjectURL(u);
     au.play().catch(()=>{})
    }

   }else if(a.audioUrl){
    new Audio(a.audioUrl).play().catch(()=>{})
   }
  };

  box.appendChild(row)
 })
}

window.addEventListener(
 'DOMContentLoaded',
 renderCreatedAudiosV19
);

function capResetCreateV20(){
 selectedProduct='';

 document.querySelectorAll(
  '#favorites button'
 ).forEach(
  x=>x.classList.remove('selected')
 );

 const selected=
  document.getElementById('selectedProduct');

 if(selected){
  selected.classList.add('hidden')
 }

 const price=
  document.getElementById('price');

 if(price){
  price.value=''
 }

 const brief=
  document.getElementById('brief');

 if(brief){
  brief.value=''
 }

 const t1=
  document.getElementById('text1');

 if(t1){
  t1.value=''
 }

 const sug=
  document.getElementById('suggestions');

 if(sug){
  sug.classList.add('hidden')
 }

 ['1','2'].forEach(n=>{
  if(pendingAudio[n]?.url){
   try{
    URL.revokeObjectURL(
     pendingAudio[n].url
    )
   }catch(e){}
  }

  pendingAudio[n]=null;

  const a=
   document.getElementById(
    'audio'+n
   );

  if(a){
   a.pause();
   a.removeAttribute('src')
  }

  const ac=
   document.getElementById(
    'actions'+n
   );

  if(ac){
   ac.classList.add('hidden')
  }
 })
}

function capOfficialVoiceIdsV49(){
 return {
  adMale:'',
  adFemale:'',
  jingleMale:'',
  jingleFemale:''
 }
}

function capVoiceIdForV49(){
 return ''
}

function capStageV21(stage){
 document.body.dataset.capstage=
  stage;

 const sug=
  document.getElementById(
   'suggestions'
  );

 if(stage==='start'&&sug){
  sug.classList.add('hidden')
 }

 const gen=
  document.querySelector(
   '[data-gen="1"]'
  );

 const actions=
  document.getElementById(
   'actions1'
  );

 if(gen){
  gen.classList.toggle(
   'pulse-v21',
   stage==='phrase'
  );

  gen.textContent=
   stage==='phrase'
    ?'🔊 GERAR ÁUDIO'
    :'GERAR ÁUDIO'
 }

 if(actions){
  actions.classList.toggle(
   'hidden',
   stage!=='audio'
  );

  actions.classList.toggle(
   'confirm-v21',
   stage==='audio'
  )
 }
}

function capDiscardV21(){
 if(pendingAudio[1]?.url){
  try{
   URL.revokeObjectURL(
    pendingAudio[1].url
   )
  }catch(e){}
 }

 pendingAudio[1]=null;

 const a=
  document.getElementById(
   'audio1'
  );

 if(a){
  a.pause();
  a.removeAttribute('src')
 }

 capResetCreateV20();
 capStageV21('start')
}

window.addEventListener(
 'DOMContentLoaded',
 ()=>{
  capStageV21('start');

  const actions=
   document.getElementById(
    'actions1'
   );

  if(
   actions&&
   !document.getElementById(
    'discardV21'
   )
  ){
   const no=
    document.createElement(
     'button'
    );

   no.type='button';
   no.id='discardV21';
   no.className='discard-v21';
   no.textContent='🗑 DESCARTAR';
   no.onclick=capDiscardV21;

   actions.appendChild(no)
  }
 }
);

function capV25SetMainButtons(show){
 const create=
  document.getElementById(
   'suggest'
  );

 if(create){
  create.style.display=
   show?'':'none'
 }

 document
  .querySelectorAll('button')
  .forEach(b=>{
   if(
    /top do dia/i.test(
     (b.textContent||'').trim()
    )
   ){
    b.style.display=
     show?'':'none'
   }
  })
}

function capSetPhraseStageV25(){
 document.body.dataset.v24stage=
  'phrase';

 capV25SetMainButtons(false);

 const audioBtn=
  document.getElementById(
   'generateAudioV24'
  );

 if(audioBtn){
  audioBtn.style.display='';
  audioBtn.classList.add(
   'pulse-v22'
  )
 }

 const desist=
  document.getElementById(
   'desistV25'
  );

 if(desist){
  desist.style.display=''
 }
}

function capSetStartStageV25(
 keepText=false
){
 document.body.dataset.v24stage=
  'start';

 capV25SetMainButtons(true);

 const audioBtn=
  document.getElementById(
   'generateAudioV24'
  );

 if(audioBtn){
  audioBtn.classList.remove(
   'pulse-v22'
  )
 }

 const desist=
  document.getElementById(
   'desistV25'
  );

 if(desist){
  desist.style.display='none'
 }

 if(!keepText){
  const brief=
   document.getElementById(
    'brief'
   );

  if(brief){
   brief.value=''
  }
 }
}

async function capGenerateQueueV24(){
 if(window.capV24busy)return;

 window.capV24busy=true;

 const btn=
  document.getElementById(
   'generateAudioV24'
  );

 try{
  if(btn){
   btn.disabled=true;
   btn.textContent=
    'GERANDO ÁUDIO...'
  }

  const text=
   (
    document.getElementById(
     'brief'
    )?.value||
    ''
   )
   .trim()
   .toLowerCase()
   .slice(0,150);

  if(!text){
   throw new Error(
    'O texto do anúncio está vazio.'
   )
  }

  if(
   todayCreated()>=
   capLimits().daily
  ){
   throw new Error(
    'O limite diário de anúncios foi atingido.'
   )
  }

  if(
   weekCreated()>=
   capLimits().weekly
  ){
   throw new Error(
    'O limite semanal de anúncios foi atingido.'
   )
  }

  if(
   createMode==='top'&&
   topCreatedToday()>=
   capLimits().top
  ){
   throw new Error(
    'O limite diário de TOP foi atingido.'
   )
  }

  const pa=
   await capGenerateAudioDirectV201(
    capTextForSpeechV14(text)
   );

  const days=
   +(
    document.getElementById(
     'duration'
    )?.value||
    1
   );

  const exp=
   Date.now()+
   (
    Math.max(
     1,
     days||1
    )*
    86400000
   );

  const id=
   'ad_'+
   Date.now()+
   '_'+
   Math.random()
    .toString(36)
    .slice(2,7);

  const audioKey=
   capClientAudioKey(id);

  await capSaveAdBlob(
   audioKey,
   pa.blob
  );

  ads.push({
   id,
   label:pa.label,
   product:pa.product,
   price:pa.price,
   text,
   voice:pa.voice,
   paused:false,
   exp,
   audioKey,
   top:!!pa.top,
   createdDay:dayKey()
  });

  registerUse(
   !!pa.top
  );

  voiceTurn=
   (voiceTurn+1)%2;

  localStorage.setItem(
   capClientKey(
    'cap_voice'
   ),
   String(voiceTurn)
  );

  saveAds();
  renderCreatedAudiosV19();

  if(pa.top){
   setCreateMode('normal')
  }

  capResetCreateV20();
  capSetStartStageV25(false);

 }catch(e){
  console.error(e);

  alert(
   'Não foi possível gerar o áudio.\n\n'+
   (e.message||e)
  );

 }finally{
  window.capV24busy=false;

  if(btn){
   btn.disabled=false;
   btn.textContent=
    '🔊 GERAR ÁUDIO'
  }
 }
}

window.addEventListener(
 'DOMContentLoaded',
 ()=>{
  document.body.dataset.v24stage=
   'start';

  const b=
   document.getElementById(
    'generateAudioV24'
   );

  if(b){
   b.onclick=
    capGenerateQueueV24
  }

  const desist=
   document.getElementById(
    'desistV25'
   );

  if(desist){
   desist.onclick=()=>{
    /*
      DESISTIR NÃO APAGA A FRASE.
      Apenas volta para o início.
    */
    capSetStartStageV25(true)
   }
  }

  const clean=()=>{
   document
    .querySelectorAll(
     'button'
    )
    .forEach(x=>{
     if(
      /gerar outra/i.test(
       (x.textContent||'').trim()
      )
     ){
      x.remove()
     }
    })
  };

  clean();

  new MutationObserver(
   clean
  ).observe(
   document.body,
   {
    childList:true,
    subtree:true
   }
  )
 }
);

const capOriginalCreateTextV51=
 capGenerateTextV14;

capGenerateTextV14=
 async function(){
  await capOriginalCreateTextV51();

  const text=
   capGetGeneratedTextV14();

  if(text){
   capSetPhraseStageV25()
  }
 };

function capApplyMusicVolumeV39(){
 const e=
  document.getElementById(
   'musicVol'
  );

 if(!e)return;

 const v=
  Math.max(
   0,
   Math.min(
    100,
    Number(e.value||75)
   )
  )/100;

 if(radioAudio){
  radioAudio.volume=v
 }

 capSaveSettings()
}

function capApplyBedVolumeV39(){
 const e=
  document.getElementById(
   'bedVol'
  );

 if(!e)return;

 const v=
  Math.max(
   0,
   Math.min(
    100,
    Number(e.value||6)
   )
  )/100;

 if(window.capCurrentBedAudio){
  window.capCurrentBedAudio.volume=
   v
 }

 capSaveSettings()
}

window.capApplyMusicVolumeV39=
 capApplyMusicVolumeV39;

window.capApplyBedVolumeV39=
 capApplyBedVolumeV39;

window.addEventListener(
 'DOMContentLoaded',
 ()=>{
  const music=
   document.getElementById(
    'musicVol'
   );

  const bed=
   document.getElementById(
    'bedVol'
   );

  if(music){
   music.addEventListener(
    'input',
    capApplyMusicVolumeV39
   )
  }

  if(bed){
   bed.addEventListener(
    'input',
    capApplyBedVolumeV39
   )
  }
 }
);

/* =========================================================
   TOP DO DIA
   Usa as categorias:
   topOpen
   topClose
========================================================= */

function capJingleMatchesTopV51(
 v,
 kind
){
 const c=
  capJingleCategoryV51(v);

 if(kind==='topOpening'){
  return (
   c.includes('top')&&
   (
    c.includes('open')||
    c.includes('entrada')||
    c.includes('inicio')||
    c.includes('abertura')
   )
  )
 }

 if(kind==='topClosing'){
  return (
   c.includes('top')&&
   (
    c.includes('close')||
    c.includes('saida')||
    c.includes('fim')||
    c.includes('fechamento')
   )
  )
 }

 return false
}

async function capOptionalTopJingleV51(
 kind
){
 if(
  document.getElementById(
   'jingles'
  )?.checked!==true
 ){
  return false
 }

 try{
  const online=
   await capLoadOnlineJinglesV51();

  const ready=
   online.filter(
    v=>
     v&&
     v.active!==false&&
     v.ativo!==false&&
     v.paused!==true&&
     v.pausado!==true&&
     capJingleMatchesRamoV51(v)&&
     capJingleMatchesTopV51(
      v,
      kind
     )
   );

  if(ready.length){
   const v=
    ready[
     Math.floor(
      Math.random()*
      ready.length
     )
    ];

   const url=
    capJingleUrlV51(v);

   if(url){
    const ok=
     await capPlayUrlV16(
      url,
      1
     );

    if(ok){
     return true
    }
   }
  }

  const all=
   capSafeJson(
    'capivara_vignettes_v8',
    {}
   );

  const ramo=
   all[store.ramo]||
   all[store.type]||
   {};

  const cat=
   kind==='topOpening'
    ?'topOpen'
    :'topClose';

  const arr=
   Array.isArray(
    ramo[cat]
   )
    ?ramo[cat]
    :[];

  const readyLocal=
   arr.filter(
    v=>v&&v.audioKey
   );

  if(readyLocal.length){
   const v=
    readyLocal[0];

   const blob=
    await capGetDbBlobV36(
     'CapivaraRadioAudio',
     1,
     'audios',
     v.audioKey
    );

   if(blob){
    const u=
     URL.createObjectURL(
      blob
     );

    const ok=
     await capPlayUrlV16(
      u,
      1
     );

    URL.revokeObjectURL(u);

    return ok
   }
  }

 }catch(e){
  console.error(
   'Vinheta TOP:',
   e
  )
 }

 return false
}

/* =========================================================
   ESTADO CENTRAL DO CLIENTE
========================================================= */

async function capPullClientStateV50(){
 if(
  !capClientReady||
  !store.code
 ){
  return
 }

 try{
  const r=
   await fetch(
    CAP_SERVER_V50+
    '/api/client/'+
    encodeURIComponent(
     store.code
    )+
    '/state',
    {
     headers:{
      'Accept':
       'application/json'
     }
    }
   );

  if(!r.ok){
   return
  }

  const j=
   await r.json();

  const s=
   j?.state||
   j?.data||
   j||
   {};

  if(Array.isArray(s.ads)){
   /*
     Áudios locais continuam locais.
     Não substitui anúncio que possui
     Blob local válido por metadado vazio.
   */
   const serverAds=
    s.ads.filter(
     a=>
      !a.clientCode||
      String(
       a.clientCode
      )===
      String(
       store.code
      )
    );

   if(serverAds.length){
    const localMap=
     new Map(
      ads.map(
       a=>[
        a.id,
        a
       ]
      )
     );

    ads=
     serverAds.map(
      a=>{
       const local=
        localMap.get(
         a.id
        );

       if(
        local?.audioKey&&
        !a.audioKey
       ){
        return {
         ...a,
         audioKey:
          local.audioKey
        }
       }

       return a
      }
     );

    localStorage.setItem(
     capClientKey(
      'cap_ads'
     ),
     JSON.stringify(ads)
    )
   }
  }

  if(
   Number.isFinite(
    +s.voiceTurn
   )
  ){
   voiceTurn=
    +s.voiceTurn;

   localStorage.setItem(
    capClientKey(
     'cap_voice'
    ),
    String(voiceTurn)
   )
  }

  if(s.adsPerBlock){
   localStorage.setItem(
    'cap_ads_per_block_'+
    store.code,
    String(
     s.adsPerBlock
    )
   );

   setAdsPerBlock(
    s.adsPerBlock,
    false
   )
  }

  renderAds();
  renderCreatedAudiosV19();

 }catch(e){
  console.warn(
   'Estado central indisponível; usando cache individual local.',
   e
  )
 }
}

async function capPushClientStateV50(){
 if(
  !capClientReady||
  !store.code
 ){
  return
 }

 try{
  const safeAds=
   ads.map(
    a=>({
     ...a,
     clientCode:
      String(store.code)
    })
   );

  await fetch(
   CAP_SERVER_V50+
   '/api/client/'+
   encodeURIComponent(
    store.code
   )+
   '/state',
   {
    method:'PUT',
    headers:{
     'Content-Type':
      'application/json'
    },
    body:JSON.stringify({
     ads:safeAds,
     voiceTurn,
     adsPerBlock:
      +(
       document.getElementById(
        'adsPerBlock'
       )?.value||
       3
      ),
     updatedAt:
      new Date()
       .toISOString()
    })
   }
  );

 }catch(e){
  console.warn(
   'Não foi possível sincronizar o estado agora.',
   e
  )
 }
}

const capOldApplyAdmStoreV50=
 applyAdmStore;

applyAdmStore=function(c){
 capOldApplyAdmStoreV50(c);

 setTimeout(
  capPullClientStateV50,
  0
 );

 /*
   Atualiza vinhetas online
   ao entrar no cliente.
  */
 setTimeout(
  ()=>capLoadOnlineJinglesV51(true),
  100
 )
};

const capOldSaveAdsV50=
 saveAds;

saveAds=function(){
 capOldSaveAdsV50();

 capPushClientStateV50()
};

/* =========================================================
   CHECKBOX DAS VINHETAS
   MARCADO = TOCA
   DESMARCADO = NÃO TOCA
   SALVO INDIVIDUALMENTE POR CLIENTE
========================================================= */

function capBindJinglesV51(){
 const el=
  document.getElementById(
   'jingles'
  );

 if(!el)return;

 const key=
  'cap_jingles_enabled_'+
  String(
   store.code||
   'default'
  );

 const saved=
  localStorage.getItem(
   key
  );

 if(saved!==null){
  el.checked=
   saved==='true'
 }

 if(
  !el.dataset.capJingleBind
 ){
  el.dataset.capJingleBind='1';

  el.addEventListener(
   'change',
   ()=>{
    localStorage.setItem(
     'cap_jingles_enabled_'+
     String(
      store.code||
      'default'
     ),
     String(
      el.checked
     )
    );

    capSaveSettings()
   }
  )
 }
}

const capOldApplyJingleSettingV51=
 applyAdmStore;

applyAdmStore=function(c){
 capOldApplyJingleSettingV51(c);

 setTimeout(
  capBindJinglesV51,
  0
 )
};

window.addEventListener(
 'DOMContentLoaded',
 capBindJinglesV51
);

/* =========================================================
   ENTER NO LOGIN
========================================================= */

window.addEventListener(
 'DOMContentLoaded',
 ()=>{
  const code=
   document.getElementById(
    'code'
   );

  if(!code)return;

  code.addEventListener(
   'keydown',
   e=>{
    if(e.key!=='Enter'){
     return
    }

    e.preventDefault();

    const enter=
     document.getElementById(
      'enter'
     );

    if(enter){
     enter.click()
    }
   }
  )
 }
);

/* =========================================================
   RESTAURAR CONFIGURAÇÕES
========================================================= */

window.addEventListener(
 'DOMContentLoaded',
 ()=>{
  const restore=
   document.getElementById(
    'restore'
   );

  if(!restore)return;

  restore.onclick=()=>{
   const music=
    document.getElementById(
     'musicVol'
    );

   const bed=
    document.getElementById(
     'bedVol'
    );

   const jingles=
    document.getElementById(
     'jingles'
    );

   const mention=
    document.getElementById(
     'mentionStore'
    );

   const currency=
    document.getElementById(
     'fullCurrency'
    );

   const open=
    document.getElementById(
     'open'
    );

   const close=
    document.getElementById(
     'close'
    );

   if(music){
    music.value=
     defaults.musicVol
   }

   if(bed){
    bed.value=
     defaults.bedVol
   }

   if(jingles){
    jingles.checked=
     defaults.jingles
   }

   if(mention){
    mention.checked=
     defaults.mentionStore
   }

   if(currency){
    currency.checked=
     defaults.fullCurrency
   }

   if(open){
    open.value=
     defaults.open
   }

   if(close){
    close.value=
     defaults.close
   }

   capSaveSettings();

   localStorage.setItem(
    'cap_jingles_enabled_'+
    String(
     store.code||
     'default'
    ),
    String(
     defaults.jingles
    )
   );

   capApplyMusicVolumeV39();
   capApplyBedVolumeV39()
  }
 }
);

/* =========================================================
   SEGURANÇA DO FLUXO DA RÁDIO
   Se a vinheta falhar, a rádio continua.
========================================================= */

window.addEventListener(
 'error',
 e=>{
  const msg=
   String(
    e?.message||
    ''
   );

  if(
   /audio|vinheta|jingle/i.test(
    msg
   )
  ){
   console.warn(
    'Áudio ignorado:',
    msg
   )
  }
 }
);

/* =========================================================
   INICIALIZAÇÃO FINAL
========================================================= */

window.addEventListener(
 'load',
 ()=>{
  try{
   renderProducts();
   renderProductEditor();
   renderAds();
   renderCreatedAudiosV19();
   renderThemesV11();
   refreshQuota();
   capSetPlayingUI()
  }catch(e){
   console.error(
    'Inicialização:',
    e
   )
  }
 }
);
