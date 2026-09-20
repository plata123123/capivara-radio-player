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
const THEMES_V11=["Jazz & Lounge", "Sertanejo", "MPB & Brasilidades", "Flashback", "Dance & Pop", "Moderno / Hits", "Rock & Clássicos", "Instrumental & Ambiente", "Leve & Relax", "Popular & Animada"];
let selectedThemeV11=localStorage.getItem('capivara_theme_'+store.code)||THEMES_V11[0], pendingThemeV11=null;
function applyAdmStore(c){
 try{if(window.capCurrentSpokenAudio){window.capCurrentSpokenAudio.pause();window.capCurrentSpokenAudio=null}}catch(e){}
 try{if(radioAudio){radioAudio.pause();radioAudio=null}}catch(e){}
 store={name:c.name,type:c.ramo,ramo:c.ramo,code:c.code};
 capLoadClient();
 selectedThemeV11=localStorage.getItem('capivara_theme_'+store.code)||THEMES_V11[0];
 const sn=document.getElementById('storeName');if(sn)sn.textContent=c.name;
 const pkg=admPackages()[c.ramo]||{};
 const legacyMap={'Leve':2,'Médio':3,'Frenético':5}; const adminCfg=(()=>{try{return JSON.parse(localStorage.getItem('capivara_admin_settings')||'{}')}catch(e){return {}}})(); const q=pkg.adsPerBlock||legacyMap[pkg.mode]||adminCfg.defaultAdsPerBlock||3; setTimeout(()=>setAdsPerBlock(q,false),0);
 renderThemesV11();updateAdmStatus();loadRamoProducts();
}
function themeMusicV11(theme){
 try{return JSON.parse(localStorage.getItem('capivara_acervo_v9')||'[]').filter(m=>(m.theme||THEMES_V11[0])===theme)}catch(e){return []}
}
function chooseThemeV11(theme){
 if(playing){pendingThemeV11=theme;renderThemesV11();return}
 selectedThemeV11=theme;localStorage.setItem('capivara_theme_'+store.code,theme);radioIndex=0;renderThemesV11();updateAdmStatus();
}
function renderThemesV11(){
 const box=document.getElementById('themeButtonsV11');if(!box)return;
 box.innerHTML=THEMES_V11.map(t=>`<button class="${selectedThemeV11===t?'active':''} ${pendingThemeV11===t?'pending':''}" onclick="chooseThemeV11('${t.replace("'","\\'")}')">${t}</button>`).join('');
 const st=document.getElementById('themeStateV11');if(st)st.textContent=pendingThemeV11?`⏳ ${pendingThemeV11} entra quando a música atual terminar.`:`🟢 Tema ativo: ${selectedThemeV11}`;
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
let products=catalogForRamo(store.ramo||store.type), selectedProduct='';
function loadRamoProducts(){
 let saved=null;try{saved=JSON.parse(localStorage.getItem(productKey())||'null')}catch(e){}
 const base=catalogForRamo(store.ramo||store.type);
 products=Array.isArray(saved)&&saved.length===15?saved:[...base];
 localStorage.setItem(productKey(),JSON.stringify(products));
 if(typeof renderProducts==='function')renderProducts();
 if(typeof renderProductEditor==='function')renderProductEditor();
}
function saveProducts(){localStorage.setItem(productKey(),JSON.stringify(products));renderProducts();renderProductEditor()}
function selectProduct(name){selectedProduct=name;$('#selectedName').textContent=name;$('#selectedProduct').classList.remove('hidden');$$('#favorites button').forEach(b=>b.classList.toggle('selected',b.dataset.product===name));$('#price').focus()}
function renderProducts(){const fav=$('#favorites');fav.innerHTML='';products.forEach((name,i)=>{const b=document.createElement('button');b.type='button';b.dataset.product=name;b.title='clique para usar • duplo clique para editar';b.innerHTML=`<span>${name}</span>`;b.onclick=()=>selectProduct(name);b.ondblclick=(e)=>{e.preventDefault();const v=prompt('editar produto',products[i]);if(v&&v.trim()){products[i]=v.trim().toLowerCase();saveProducts()}};fav.appendChild(b)})}
function renderProductEditor(){const box=$('#productEditor');box.innerHTML='';products.forEach((name,i)=>{const row=document.createElement('div');row.className='product-edit-row';row.innerHTML=`<b>${i+1}</b><input value="${name.replace(/"/g,'&quot;')}" maxlength="35">`;const inp=row.querySelector('input');inp.onchange=()=>{const v=inp.value.trim().toLowerCase();if(v){products[i]=v;saveProducts()}};box.appendChild(row)})}
$('#clearProduct').onclick=()=>{selectedProduct='';$('#selectedProduct').classList.add('hidden');$('#price').value='';$$('#favorites button').forEach(b=>b.classList.remove('selected'))};
$('#resetProducts').onclick=()=>{products=catalogForRamo(store.ramo||store.type);saveProducts()};
$('#price').addEventListener('input',e=>{let digits=e.target.value.replace(/\D/g,'').slice(0,8);if(!digits){e.target.value='';return}let n=parseInt(digits,10);e.target.value=(n/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})});
renderProducts();renderProductEditor();


function dayKey(ts=Date.now()){return new Date(ts).toLocaleDateString('en-CA')}
function capLimits(){let c={};try{c=JSON.parse(localStorage.getItem('capivara_admin_settings')||'{}')}catch{}return {daily:Math.max(1,parseInt(c.dailyLimit||15,10)),weekly:Math.max(1,parseInt(c.weeklyLimit||75,10)),top:Math.max(0,parseInt(c.topDailyLimit??1,10))}}
function capWeekKey(){const d=new Date(),x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()+4-day);const y0=new Date(Date.UTC(x.getUTCFullYear(),0,1));return x.getUTCFullYear()+'-W'+String(Math.ceil((((x-y0)/86400000)+1)/7)).padStart(2,'0')}
function weeklyUsage(){const k='cap_weekly_usage_'+store.code,w=JSON.parse(localStorage.getItem(k)||'{}'),wk=capWeekKey();return w.week===wk?w:{week:wk,count:0}}
function weekCreated(){return weeklyUsage().count}
function usage(){const u=JSON.parse(localStorage.getItem(capClientKey('cap_daily_usage'))||'{}');if(u.day!==dayKey())return {day:dayKey(),count:0,topCount:0};if(u.topCount==null)u.topCount=u.top?1:0;return u}
function todayCreated(){return usage().count}
function topCreatedToday(){return usage().topCount||0}
function registerUse(isTop){const u=usage();u.count=(u.count||0)+1;if(isTop)u.topCount=(u.topCount||0)+1;delete u.top;localStorage.setItem(capClientKey('cap_daily_usage'),JSON.stringify(u));const w=weeklyUsage();w.count=(w.count||0)+1;localStorage.setItem('cap_weekly_usage_'+store.code,JSON.stringify(w))}
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
 if(todayCreated()>=capLimits().daily){alert('O limite diário de anúncios foi atingido.');return} if(weekCreated()>=capLimits().weekly){alert('O limite semanal de anúncios foi atingido.');return}
 if(topCreatedToday()>=capLimits().top){alert('O limite diário de TOP foi atingido.');return}
 setCreateMode(createMode==='top'?'normal':'top');
};

function saveAds(){if(!capClientReady)return;localStorage.setItem(capClientKey('cap_ads'),JSON.stringify(ads));renderAds()}
function renderAds(){
 const box=$('#ads');box.innerHTML='';const now=Date.now();ads=ads.filter(a=>!a.exp||a.exp>now);if(capClientReady)localStorage.setItem(capClientKey('cap_ads'),JSON.stringify(ads));refreshQuota();
 if(!ads.length)box.innerHTML='<div class="empty">Nenhum anúncio ativo.</div>';
 ads.forEach((a,i)=>{let d=document.createElement('div');d.className='ad'+(a.top?' top-ad':'');const label=a.label||a.product||'anúncio';
 d.innerHTML=`<div class="copy"><b>${a.top?'<span class="top-badge">🔥 TOP DO DIA</span>':''}${label}</b><small>${a.voice} • ${a.paused?'Pausado':'Na programação'} • ${a.exp?new Date(a.exp).toLocaleDateString('pt-BR'):'Sempre'}</small><div class="ad-hidden-text hidden">${a.text||''}</div></div><button data-v="${i}">ver texto</button><button data-p="${i}">${a.paused?'▶':'⏸'}</button><button data-d="${i}">🗑</button>`;box.appendChild(d)});
 $$('[data-v]').forEach(b=>b.onclick=()=>{const el=b.closest('.ad').querySelector('.ad-hidden-text');el.classList.toggle('hidden');b.textContent=el.classList.contains('hidden')?'ver texto':'ocultar'});
 $$('[data-p]').forEach(b=>b.onclick=()=>{ads[b.dataset.p].paused=!ads[b.dataset.p].paused;saveAds();renderCreatedAudiosV19()});
 $$('[data-d]').forEach(b=>b.onclick=()=>{ads.splice(b.dataset.d,1);saveAds();renderCreatedAudiosV19()});
}

$('#enter').onclick=()=>{
 const code=$('#code').value.trim(), list=admClients();
 const c=list.find(x=>String(x.code)===code);
 if(c&&c.active===false){$('#loginMsg').textContent='Rádio bloqueada pelo administrador';return}
 if(c){applyAdmStore(c);$('#login').classList.add('hidden');$('#app').classList.remove('hidden');renderAds();return}
 if(!list.length&&code==='123456'){applyAdmStore({name:'Açougue Uberaba',ramo:'Açougue',code:'123456',active:true});$('#login').classList.add('hidden');$('#app').classList.remove('hidden');renderAds();return}
 $('#loginMsg').textContent='Código não encontrado';
};
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));$$('.page').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.tab).classList.add('active')});
function promptForGemini(q){const mention=$('#mentionStore').checked, full=$('#fullCurrency').checked, top=createMode==='top';return `você é um redator de rádio comercial brasileiro especialista em ${store.type}. crie uma chamada natural e forte para locução. ${top?'este é o anúncio top do dia: dê mais impacto, urgência e exclusividade, sem exageros enganosos.':''} a chamada deve ter no máximo 150 caracteres. escreva em letras minúsculas. não use emojis. ${mention?`pode mencionar o nome ${store.name}.`:'não mencione o nome do estabelecimento.'} transforme números e preços em palavras para a fala. ${full?'em preços, fale reais e centavos por extenso.':'em preços, não diga as palavras reais ou centavos; exemplo: 4,77 deve virar quatro e setenta e sete.'} informação do cliente: ${q}. responda somente com a frase, sem aspas e sem explicações.`}
async function createTexts(){
 if(todayCreated()>=capLimits().daily){alert('O limite diário de anúncios foi atingido.');return} if(weekCreated()>=capLimits().weekly){alert('O limite semanal de anúncios foi atingido.');return}
 if(createMode==='top'&&topCreatedToday()>=capLimits().top){alert('O limite diário de TOP foi atingido.');return}
 let q=$('#brief').value.trim();if(selectedProduct){const price=$('#price').value.trim();q=(q?q+'; ':'')+selectedProduct+(price?'; preço '+price:'');}if(!q)return;
 let cfg={};try{cfg=JSON.parse(localStorage.getItem('capivara_admin_settings')||'{}')}catch{}
 const modeRaw=String(cfg.aiMode||'hybrid').trim().toLowerCase();
 const geminiOnly=(modeRaw==='gemini'||modeRaw.includes('somente gemini'));
 const voxOnly=(modeRaw==='vox'||modeRaw.includes('somente capivara')||modeRaw.includes('somente vox'));
 const mode=geminiOnly?'gemini':(voxOnly?'vox':'hybrid');
 const voxUrl=(cfg.ownAiUrl||'https://capivara-vox-ai.onrender.com/generate').trim();
 const btn=$('#suggest');if(btn){btn.disabled=true;btn.textContent='CRIANDO...';}
 try{
   let raw='', geminiErr='', voxErr='';
   // V29: modo híbrido oficial = Gemini primeiro, no máximo 5 s; Vox entra automaticamente.
   if(mode!=='vox'){
     const key=cfg.gemini, model=cfg.geminiModel;
     if(key&&model){
       const url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent';
       const body={contents:[{role:'user',parts:[{text:promptForGemini(q)}]}]};
       const ctrl=new AbortController(), timer=setTimeout(()=>ctrl.abort(),Math.max(1000,+(cfg.geminiTimeout||5000)));
       try{
         const r=await fetch(url,{method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)});
         let j={};try{j=await r.json()}catch{}
         if(!r.ok)throw new Error('Gemini '+r.status+(j?.error?.message?' — '+j.error.message:''));
         raw=j?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
         if(!raw)throw new Error('Gemini não retornou texto.');
       }catch(e){geminiErr=e.name==='AbortError'?'tempo excedido':e.message}
       finally{clearTimeout(timer)}
     } else geminiErr='não configurado';
   }
   if(!raw && mode==='gemini'){
     throw new Error('Somente Gemini ativo. '+(geminiErr||'Gemini não retornou texto.')+' A Capivara Vox AI não foi usada.');
   }
   if(!raw && mode!=='gemini'){
     if(!voxUrl)throw new Error('Capivara Vox AI não configurada.');
     const ctrl=new AbortController(), timer=setTimeout(()=>ctrl.abort(),15000);
     try{
       const r=await fetch(voxUrl,{method:'POST',headers:{'Content-Type':'application/json'},signal:ctrl.signal,
         body:JSON.stringify({ramo:store?.ramo||store?.type||'',produto:selectedProduct||'',preco:($('#price')?.value||'').trim(),pedido:q,max_chars:150,top:createMode==='top',mention_store:$('#mentionStore').checked,full_currency:$('#fullCurrency').checked,store_name:store?.name||''})});
       if(!r.ok)throw new Error('HTTP '+r.status);
       const ct=r.headers.get('content-type')||'';
       if(ct.includes('application/json')){const j=await r.json();raw=j.text||j.frase||j.response||j.generated_text||''}
       else raw=await r.text();
       if(!raw)throw new Error('Vox AI não retornou texto.');
     }catch(e){voxErr=e.name==='AbortError'?'tempo excedido':e.message}
     finally{clearTimeout(timer)}
   }
   raw=String(raw||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim().replace(/^["']|["']$/g,'');
   if(!raw)throw new Error('Gemini: '+(geminiErr||'sem resposta')+' | Capivara Vox AI: '+(voxErr||'sem resposta'));
   const generated=raw.toLowerCase().slice(0,150);
   if($('#text1'))$('#text1').value=generated;
   $('#brief').value=generated;
   if($('#suggestions'))$('#suggestions').classList.add('hidden');
   updateCounts();document.body.dataset.v24stage='phrase';
 }catch(e){console.error(e);alert('Não foi possível criar agora.\n\n'+e.message)}
 finally{if(btn){btn.disabled=false;btn.textContent='✨ CRIAR ANÚNCIO'}}
}
$('#suggest').onclick=createTexts;
function updateCounts(){};['1','2'].forEach(n=>$('#text'+n).oninput=()=>{let el=$('#text'+n);el.value=el.value.toLowerCase().slice(0,150);updateCounts()});
let pendingAudio={};
function capAdDb(){return new Promise((ok,no)=>{const r=indexedDB.open('CapivaraAdsV19',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('audio'))r.result.createObjectStore('audio')};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function capSaveAdBlob(key,blob){const d=await capAdDb();return new Promise((ok,no)=>{const r=d.transaction('audio','readwrite').objectStore('audio').put(blob,key);r.onsuccess=()=>ok(true);r.onerror=()=>no(r.error)})}
async function capGetAdBlob(key){const d=await capAdDb();return new Promise((ok,no)=>{const r=d.transaction('audio').objectStore('audio').get(key);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function capAudioLabel(){const product=(selectedProduct||'anúncio').trim(),price=($('#price')?.value||'').trim();return price?product+' • '+price:product}

async function generateVoice(n,btn){let text=$('#text'+n).value.trim().toLowerCase().slice(0,150);if(!text)return;let _cfg={};try{_cfg=JSON.parse(localStorage.getItem('capivara_admin_settings')||'{}')}catch{}const api=_cfg.eleven,male=_cfg.male,female=_cfg.female;if(!api||!male||!female){alert('Serviço de voz não configurado pelo administrador.');return}const useFemale=voiceTurn===1, voiceId=useFemale?female:male, voiceName=useFemale?'Voz feminina':'Voz masculina';btn.disabled=true;btn.textContent='GERANDO...';try{const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,{method:'POST',headers:{'Content-Type':'application/json','xi-api-key':api,'Accept':'audio/mpeg'},body:JSON.stringify({text,model_id:'eleven_multilingual_v2'})});if(!r.ok){let detail='';try{const j=await r.json();detail=j?.detail?.message||j?.detail||''}catch{}throw new Error('ElevenLabs '+r.status+(detail?' — '+detail:''));}const blob=await r.blob();if(pendingAudio[n]?.url)URL.revokeObjectURL(pendingAudio[n].url);const url=URL.createObjectURL(blob);pendingAudio[n]={text,voice:voiceName,url,blob,top:createMode==='top',label:capAudioLabel(),product:selectedProduct||'',price:($('#price')?.value||'').trim()};
$('#audio'+n).src=url;$('#actions'+n).classList.remove('hidden');btn.textContent='✓ ÁUDIO PRONTO';voiceTurn=1-voiceTurn;localStorage.setItem(capClientKey('cap_voice'),voiceTurn)}catch(e){console.error(e);alert('ERRO AO GERAR ÁUDIO\n\n'+e.message);btn.textContent='🎙 GERAR ÁUDIO'}finally{btn.disabled=false}}
$$('[data-gen]').forEach(b=>b.onclick=()=>generateVoice(b.dataset.gen,b));
function playTopSting(){try{const C=window.AudioContext||window.webkitAudioContext,ctx=new C(),g=ctx.createGain();g.connect(ctx.destination);g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.18,ctx.currentTime+.03);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+1.05);[[392,0],[523.25,.18],[659.25,.36],[784,.58]].forEach(([f,t])=>{const o=ctx.createOscillator();o.type='sine';o.frequency.value=f;o.connect(g);o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+.32)});return new Promise(r=>setTimeout(()=>{ctx.close();r()},1120))}catch{return Promise.resolve()}}
$$('[data-preview]').forEach(b=>b.onclick=async()=>{const n=b.dataset.preview,a=$('#audio'+n);if(!a.src)return;if(pendingAudio[n]?.top)await playTopSting();a.currentTime=0;a.play().catch(()=>alert('Não foi possível tocar a prévia.'));});
$$('[data-queue]').forEach(b=>b.onclick=async()=>{
 const n=b.dataset.queue,p=pendingAudio[n];if(!p)return;
 let days=+$('#duration').value,exp=days?Date.now()+days*86400000:null;
 if(todayCreated()>=capLimits().daily){alert('O limite diário de anúncios foi atingido.');return} if(weekCreated()>=capLimits().weekly){alert('O limite semanal de anúncios foi atingido.');return}
 if(p.top&&topCreatedToday()>=capLimits().top){alert('O limite diário de TOP foi atingido.');return}
 const id='ad_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),audioKey=capClientAudioKey(id);
 try{await capSaveAdBlob(audioKey,p.blob)}catch(e){alert('Não foi possível salvar o áudio.');return}
 ads.push({id,label:p.label,product:p.product,price:p.price,text:p.text,voice:p.voice,paused:false,exp,audioKey,top:!!p.top,createdDay:dayKey()});
 registerUse(!!p.top);
 localStorage.setItem(capClientKey('cap_voice_queued_count'),String(+(localStorage.getItem(capClientKey('cap_voice_queued_count'))||0)+1));
 pendingAudio[n]=null;$('#actions'+n).classList.add('hidden');$('#audio'+n).removeAttribute('src');
 b.textContent='✓ NA PROGRAMAÇÃO';setTimeout(()=>b.textContent='➕ MANDAR PRA FILA',900);saveAds();renderCreatedAudiosV19();capResetCreateV20();capStageV21('start');if(p.top)setCreateMode('normal');
});

function setAdsPerBlock(v,save=true){const n=Math.max(1,parseInt(v||'3',10));const el=$('#adsPerBlock');if(el)el.value=n;if(save)localStorage.setItem('cap_ads_per_block_'+store.code,n);$('#cycle').textContent=`🎵 Música → 🔊 Entrada → 📢 ${n} anúncio${n>1?'s':''} → 🔊 Saída → 🎵 Música${topCreatedToday()?' • 🔥 TOP entra após a música, com vinheta exclusiva':''}`;} const adsBlockInput=$('#adsPerBlock');if(adsBlockInput){adsBlockInput.oninput=()=>setAdsPerBlock(adsBlockInput.value,true);const c=(()=>{try{return JSON.parse(localStorage.getItem('capivara_admin_settings')||'{}')}catch(e){return {}}})();setAdsPerBlock(localStorage.getItem('cap_ads_per_block_'+store.code)||c.defaultAdsPerBlock||3,false);}
let radioAudio=null,radioIndex=0;
function acervoDb(){return new Promise((ok,no)=>{const r=indexedDB.open('CapivaraAcervoV9',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('files'))r.result.createObjectStore('files')};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function acervoBlob(id){const d=await acervoDb();return new Promise((ok,no)=>{const r=d.transaction('files').objectStore('files').get('music:'+id);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function playNextAdmMusic(){
 if(!playing)return;
 if(pendingThemeV11){selectedThemeV11=pendingThemeV11;pendingThemeV11=null;localStorage.setItem('capivara_theme_'+store.code,selectedThemeV11);radioIndex=0;renderThemesV11();updateAdmStatus()}
 const list=themeMusicV11(selectedThemeV11);
 if(!list.length){$('#nowTitle').textContent='Tema sem músicas';$('#nowSub').textContent='Escolha outro tema ou aguarde o ADM adicionar músicas.';playing=false;syncPlayUi();return}
 if(radioIndex>=list.length)radioIndex=0;
 const meta=list[radioIndex++], blob=await acervoBlob(meta.id);
 if(!blob){$('#nowTitle').textContent='Música indisponível neste navegador';$('#nowSub').textContent='Na versão online, os arquivos virão do servidor.';setTimeout(playNextAdmMusic,1000);return}
 if(radioAudio){radioAudio.pause();if(radioAudio._u)URL.revokeObjectURL(radioAudio._u)}
 const u=URL.createObjectURL(blob);radioAudio=new Audio(u);radioAudio._u=u;radioAudio.volume=(+($('#musicVol').value||75))/100;
 $('#nowTitle').textContent=meta.name;$('#nowSub').textContent=`🎵 ${selectedThemeV11} • ${store.name}`;
 radioAudio.onended=()=>{URL.revokeObjectURL(u);capRadioAfterMusicV16()};radioAudio.play().catch(()=>{playing=false;syncPlayUi();alert('Clique novamente em INICIAR RÁDIO.')});
}
function syncPlayUi(){$('#play').textContent=playing?'⏸ PAUSAR RÁDIO':'▶ INICIAR RÁDIO';$('#onair').textContent=playing?'● NO AR':'● PAUSADA';$('#onair').style.color=playing?'#16813c':'#8b9890'}
$('#play').onclick=()=>{playing=!playing;syncPlayUi();if(playing)playNextAdmMusic();else{if(radioAudio)radioAudio.pause();$('#nowTitle').textContent='Rádio pausada';$('#nowSub').textContent='Escolha um tema e inicie quando quiser'}};
window.addEventListener('storage',()=>{updateAdmStatus()});

['musicVol','bedVol','open','close'].forEach(id=>{let v=localStorage.getItem('cap_'+id);if(v!==null)$('#'+id).value=v;$('#'+id).oninput=()=>localStorage.setItem('cap_'+id,$('#'+id).value)});
['jingles','mentionStore','fullCurrency'].forEach(id=>{let v=localStorage.getItem('cap_'+id);$('#'+id).checked=v===null?defaults[id]:v==='true';$('#'+id).onchange=()=>localStorage.setItem('cap_'+id,$('#'+id).checked)});
$$('[data-reset]').forEach(b=>b.onclick=()=>{let id=b.dataset.reset;if(typeof defaults[id]==='boolean'){$('#'+id).checked=defaults[id];localStorage.setItem('cap_'+id,defaults[id])}else{$('#'+id).value=(id==='bedVol'?'6':defaults[id]);localStorage.setItem('cap_'+id,$('#'+id).value);$('#'+id).dispatchEvent(new Event('input',{bubbles:true}))}});
$('#restore').onclick=()=>{Object.entries(defaults).forEach(([k,v])=>{if(typeof v==='boolean')$('#'+k).checked=v;else $('#'+k).value=v;localStorage.setItem('cap_'+k,v)});setAdsPerBlock((()=>{try{return JSON.parse(localStorage.getItem('capivara_admin_settings')||'{}').defaultAdsPerBlock||3}catch(e){return 3}})(),true)};
renderAds();refreshQuota();updateCounts();

// V14 — fluxo guiado profissional: o próximo passo pulsa e uma prévia pendente bloqueia novo anúncio.
let capPendingDecision=false;
function capButtons(){
 return [...document.querySelectorAll('button')];
}
function capFindButton(words){
 const W=words.map(x=>x.toLowerCase());
 return capButtons().find(b=>W.some(w=>(b.textContent||'').toLowerCase().includes(w)));
}
function capSetGuide(btn){
 capButtons().forEach(b=>b.classList.remove('cap-guide'));
 if(btn && !btn.disabled) btn.classList.add('cap-guide');
}
function capRefreshGuide(){
 const create=capFindButton(['criar anúncio','criar anuncio']);
 const gen=capFindButton(['gerar áudio','gerar audio']);
 const queue=capFindButton(['mandar pra fila']);
 const discard=document.querySelector('.discardGeneratedBtn');
 if(capPendingDecision){
   if(create) create.classList.add('cap-locked');
   if(gen) gen.classList.add('cap-locked');
   capSetGuide(queue||discard);
   if(discard) discard.style.display='';
 }else{
   if(create) create.classList.remove('cap-locked');
   if(gen) gen.classList.remove('cap-locked');
   if(discard) discard.style.display='none';
   // guide the first actionable primary step without adding explanatory phrases
   capSetGuide(gen||create);
 }
}
function capMarkPending(){
 capPendingDecision=true;capRefreshGuide();
}
function capResolvePending(){
 capPendingDecision=false;capRefreshGuide();
}
function discardGeneratedAd(){
 try{
   if(typeof currentAudioUrl!=='undefined' && currentAudioUrl){URL.revokeObjectURL(currentAudioUrl)}
 }catch(e){}
 document.querySelectorAll('audio').forEach(a=>{try{a.pause();a.removeAttribute('src');a.load()}catch(e){}});
 // clear common generated preview containers without touching product selection
 ['audioPreview','previewAudio','generatedAudio','audioResult'].forEach(id=>{const el=document.getElementById(id);if(el){if('src' in el)el.removeAttribute('src'); else el.innerHTML=''}});
 capResolvePending();
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button'); if(!b)return;
 const t=(b.textContent||'').toLowerCase();
 if(capPendingDecision && (t.includes('criar anúncio')||t.includes('criar anuncio')||t.includes('gerar áudio')||t.includes('gerar audio'))){e.preventDefault();e.stopImmediatePropagation();return}
 if(t.includes('mandar pra fila')) setTimeout(capResetCreationAfterQueue,180);
 if(t.includes('gerar áudio')||t.includes('gerar audio')){
   // after TTS completes, audio element/source appears; observer below marks decision pending.
   setTimeout(capRefreshGuide,50);
 }
},true);
const capAudioObserver=new MutationObserver(()=>{
 const playable=[...document.querySelectorAll('audio')].some(a=>a.src || a.querySelector('source[src]'));
 if(playable && !capPendingDecision) capMarkPending();
});
capAudioObserver.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
window.addEventListener('load',()=>setTimeout(capRefreshGuide,200));

// V14.2 — depois de enviar para a fila, limpa a criação e deixa pronta para o próximo anúncio.
function capResetCreationAfterQueue(){
  try{
    // limpa produto selecionado/estado temporário mais comum
    if(typeof selectedProduct!=='undefined') selectedProduct='';
    if(typeof selectedPrice!=='undefined') selectedPrice='';
    if(typeof generatedTexts!=='undefined') generatedTexts=[];
  }catch(e){}

  // campos de criação: texto livre, preço e textos gerados/editáveis.
  const selectors=[
    '#customText','#freeText','#announceText','#productText','#price','#productPrice',
    '#text1','#text2','#adText1','#adText2','#option1','#option2',
    'textarea[data-generated="true"]'
  ];
  selectors.forEach(sel=>document.querySelectorAll(sel).forEach(el=>{
    if('value' in el) el.value='';
  }));

  // Pela estrutura visual: cartões que contêm botão "ÁUDIO PRONTO" voltam ao estado vazio/oculto.
  [...document.querySelectorAll('button')].filter(b=>(b.textContent||'').toLowerCase().includes('áudio pronto')||(b.textContent||'').toLowerCase().includes('audio pronto')).forEach(b=>{
    const card=b.closest('.card,.option,.suggestion,.result,.ad-option')||b.parentElement;
    if(card){
      card.querySelectorAll('textarea').forEach(t=>t.value='');
      card.style.display='none';
    }else b.style.display='none';
  });

  // Para áudios/prévias da criação, para e remove a fonte.
  document.querySelectorAll('audio').forEach(a=>{
    // não mexer em player principal identificado como rádio
    const id=(a.id||'').toLowerCase();
    if(id.includes('radio')||id.includes('music')) return;
    try{a.pause();a.removeAttribute('src');a.load()}catch(e){}
  });

  // desmarca produto visualmente sem apagar a lista de atalhos
  document.querySelectorAll('.product.active,.product.selected,.product-btn.active,.product-btn.selected').forEach(el=>{
    el.classList.remove('active','selected');
  });

  capResolvePending();
  setTimeout(capRefreshGuide,80);
}

// V15 — criação com UMA frase por vez.
function capSinglePhraseUI(){
  const genBtns=[...document.querySelectorAll('button')].filter(b=>{
    const t=(b.textContent||'').toLowerCase();
    return t.includes('gerar áudio')||t.includes('gerar audio')||t.includes('áudio pronto')||t.includes('audio pronto');
  });
  if(!genBtns.length)return;

  // O primeiro cartão é a única opção ativa; esconde os demais cartões equivalentes.
  const cards=genBtns.map(b=>b.closest('.card,.option,.suggestion,.result,.ad-option')||b.parentElement).filter(Boolean);
  cards.slice(1).forEach(c=>c.style.display='none');

  const first=cards[0];
  if(first && !first.querySelector('.cap-regenerate')){
    const b=document.createElement('button');
    b.type='button'; b.className='btn secondary cap-regenerate';
    b.textContent='↻ GERAR OUTRA';
    b.onclick=()=>{
      if(capPendingDecision)return;
      const create=[...document.querySelectorAll('button')].find(x=>{
        const t=(x.textContent||'').toLowerCase();
        return t.includes('criar textos')||t.includes('criar texto');
      });
      if(create) create.click();
    };
    const audioBtn=genBtns[0];
    audioBtn.insertAdjacentElement('beforebegin',b);
  }
  capRefreshGuide();
}
const capSingleObserver=new MutationObserver(()=>setTimeout(capSinglePhraseUI,20));
capSingleObserver.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('load',()=>setTimeout(capSinglePhraseUI,250));
// V36 — motor Rádio: música -> vinheta entrada -> anúncios com fundo -> vinheta saída -> música.
let capAdCursorV16=0, capBedCursorV36=0, capJingleCursorV36={open:0,close:0};
function capModeCountV16(){const el=document.getElementById('adsPerBlock');const c=(()=>{try{return JSON.parse(localStorage.getItem('capivara_admin_settings')||'{}')}catch(e){return {}}})();return Math.max(1,parseInt((el&&el.value)||localStorage.getItem('cap_ads_per_block_'+store.code)||c.defaultAdsPerBlock||3,10));}
function capActiveAdsV16(){
 if(!capClientReady)return [];
 let arr=[];
 try{arr=JSON.parse(localStorage.getItem(capClientKey('cap_ads'))||'[]')}catch(e){arr=[]}
 if(!Array.isArray(arr))arr=[];
 const now=Date.now();
 return arr.filter(a=>a&&a.paused!==true&&a.active!==false&&(!a.exp||a.exp>now)&&(!a.expiresAt||new Date(a.expiresAt).getTime()>=now));
}
async function capPlayUrlV16(url,volume=1){
  if(!url)return false;
  return await new Promise(resolve=>{const a=new Audio(url);window.capCurrentSpokenAudio=a;a.volume=Math.max(0,Math.min(1,volume));a.onended=()=>resolve(true);a.onerror=()=>resolve(false);a.play().catch(()=>resolve(false));});
}
async function capPlayAdV16(ad){
 if(!ad)return false;
 const url=ad.audioUrl||ad.url||ad.audio||ad.src;if(url)return await capPlayUrlV16(url,Math.max(0,Math.min(1,Number(document.getElementById('adVol')?.value||100)/100)));
 if(ad.audioKey){try{const blob=await capGetAdBlob(ad.audioKey);if(blob){const u=URL.createObjectURL(blob),ok=await capPlayUrlV16(u,Math.max(0,Math.min(1,Number(document.getElementById('adVol')?.value||100)/100)));URL.revokeObjectURL(u);return ok}}catch(e){console.error(e)}}
 return false;
}
function capOpenDbV36(name,version,storeName){
 return new Promise((ok,no)=>{const r=indexedDB.open(name,version);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
}
async function capGetDbBlobV36(dbName,version,storeName,key){
 try{const db=await capOpenDbV36(dbName,version,storeName);return await new Promise((ok,no)=>{const q=db.transaction(storeName).objectStore(storeName).get(key);q.onsuccess=()=>ok(q.result||null);q.onerror=()=>no(q.error)})}catch(e){return null}
}
async function capOptionalJingleV16(kind){
 if(!document.getElementById('jingles')?.checked)return false;
 try{
   const all=JSON.parse(localStorage.getItem('capivara_vignettes_v8')||'{}');
   const ramo=all[store.ramo]||all[store.type]||{};
   const cat=kind==='opening'?'offerOpen':'offerClose';
   const arr=Array.isArray(ramo[cat])?ramo[cat]:[];
   const ready=arr.filter(v=>v&&v.audioKey);
   if(ready.length){
     const ck=kind==='opening'?'open':'close',v=ready[capJingleCursorV36[ck]++%ready.length];
     const blob=await capGetDbBlobV36('CapivaraRadioAudio',1,'audios',v.audioKey);
     if(blob){const u=URL.createObjectURL(blob),ok=await capPlayUrlV16(u,1);URL.revokeObjectURL(u);return ok}
   }
   // compatibilidade com formato antigo
   const legacy=JSON.parse(localStorage.getItem('capivara_radio_jingles')||'{}'),j=legacy[kind];
   if(j&&!j.paused&&j.active!==false)return await capPlayUrlV16(j.audioUrl||j.url||j.src,1);
 }catch(e){console.error('Vinheta:',e)}
 return false;
}
async function capStartBedV36(){
 try{
   const bg=JSON.parse(localStorage.getItem('capivara_backgrounds_v9')||'[]');
   if(!Array.isArray(bg)||!bg.length)return null;
   const meta=bg[capBedCursorV36++%bg.length];
   const blob=await capGetDbBlobV36('CapivaraAcervoV9',1,'files','bg:'+meta.id);
   if(!blob)return null;
   const u=URL.createObjectURL(blob),a=new Audio(u);
   window.capCurrentBedAudio=a;
   a.loop=true;a.volume=Math.max(0,Math.min(1,(+(document.getElementById('bedVol')?.value||6))/100));window.capCurrentBedAudio=a;
   a._capUrl=u;await a.play().catch(()=>{});
   return a;
 }catch(e){console.error('Fundo:',e);return null}
}
function capStopBedV36(a){
 if(!a)return;try{a.pause();a.currentTime=0;if(window.capCurrentBedAudio===a)window.capCurrentBedAudio=null;if(a._capUrl)URL.revokeObjectURL(a._capUrl)}catch(e){}
}
async function capRadioAfterMusicV16(){
 const active=capActiveAdsV16();
 if(!active.length){playNextAdmMusic();return}
 const qty=Math.min(capModeCountV16(),active.length),block=[];
 for(let i=0;i<qty;i++)block.push(active[(capAdCursorV16+i)%active.length]);
 capAdCursorV16=(capAdCursorV16+qty)%active.length;
 $('#nowTitle').textContent='Bloco comercial';
 $('#nowSub').textContent='Vinheta de entrada';
 await capOptionalJingleV16('opening');
 $('#nowSub').textContent='Anúncios no ar • fundo de locução';
 const bed=await capStartBedV36();
 try{for(const ad of block)await capPlayAdV16(ad)}finally{capStopBedV36(bed)}
 $('#nowSub').textContent='Vinheta de saída';
 await capOptionalJingleV16('closing');
 playNextAdmMusic();
}


// V17.1 — Enter no código de acesso executa o mesmo botão de entrada.
window.addEventListener('DOMContentLoaded',()=>{
  const inputs=[...document.querySelectorAll('input')];
  const codeInput=inputs.find(i=>{
    const x=((i.id||'')+' '+(i.name||'')+' '+(i.placeholder||'')).toLowerCase();
    return x.includes('codigo')||x.includes('código')||x.includes('senha')||x.includes('acesso');
  }) || inputs.find(i=>i.maxLength===6 || i.getAttribute('maxlength')==='6');
  if(!codeInput)return;
  codeInput.addEventListener('keydown',e=>{
    if(e.key!=='Enter')return;
    e.preventDefault();
    const btn=[...document.querySelectorAll('button')].find(b=>{
      const t=(b.textContent||'').toLowerCase();
      return t.includes('entrar')||t.includes('acessar')||t.includes('continuar');
    });
    if(btn)btn.click();
  });
});

function renderCreatedAudiosV19(){
 const box=document.getElementById('createdAudiosV19');if(!box)return;if(!capClientReady){box.innerHTML='<div class="empty">Nenhum áudio criado.</div>';return}if(!ads.length){box.innerHTML='<div class="empty">Nenhum áudio criado.</div>';return}box.innerHTML='';
 [...ads].reverse().forEach(a=>{const row=document.createElement('div'),female=(a.voice||'').toLowerCase().includes('femin');row.className='created-audio-v19 '+(female?'female':'male');
 row.innerHTML=`<div><b>${a.label||a.product||'anúncio'}</b><small>${female?'Mulher':'Homem'} • ${a.paused?'Pausado':'Na programação'}</small></div><button type="button">▶</button>`;
 row.querySelector('button').onclick=async()=>{if(a.audioKey){const blob=await capGetAdBlob(a.audioKey);if(blob){const u=URL.createObjectURL(blob),au=new Audio(u);au.onended=()=>URL.revokeObjectURL(u);au.play()}}else if(a.audioUrl)new Audio(a.audioUrl).play()};box.appendChild(row)})
}
window.addEventListener('DOMContentLoaded',renderCreatedAudiosV19);

function capResetCreateV20(){
 selectedProduct=null;
 $$('.product').forEach(x=>x.classList.remove('selected'));
 const price=$('#price'); if(price)price.value='';
 const brief=$('#brief'); if(brief)brief.value='';
 const t1=$('#text1');if(t1)t1.value='';
 const sug=$('#suggestions');if(sug)sug.classList.add('hidden');
 ['1','2'].forEach(n=>{if(pendingAudio[n]?.url)try{URL.revokeObjectURL(pendingAudio[n].url)}catch{};pendingAudio[n]=null;const a=$('#audio'+n);if(a){a.pause();a.removeAttribute('src')}const ac=$('#actions'+n);if(ac)ac.classList.add('hidden')});
}


// V49 — roteador oficial de IDs por função, vindo do ADM
function capOfficialVoiceIdsV49(){
 let cfg={};try{cfg=JSON.parse(localStorage.getItem('capivara_admin_settings')||'{}')}catch(e){}
 let jv={};try{jv=JSON.parse(localStorage.getItem('capivara_vinheta_voice_ids_v2')||'{}')}catch(e){}
 let vm={};try{vm=JSON.parse(localStorage.getItem('capivara_voice_map_v26')||'{}')}catch(e){}
 return {
   adMale:vm.adMale||cfg.male||cfg.maleVoice||cfg.voiceMale||'',
   adFemale:vm.adFemale||cfg.female||cfg.femaleVoice||cfg.voiceFemale||'',
   jingleMale:vm.jingleMale||jv.jingleMaleVoice||'',
   jingleFemale:vm.jingleFemale||jv.jingleFemaleVoice||''
 };
}
function capVoiceIdForV49(kind,female){
 const v=capOfficialVoiceIdsV49();
 if(kind==='jingle')return female?v.jingleFemale:v.jingleMale;
 // anúncio normal, texto digitado e TOP usam o mesmo par oficial de anúncios
 return female?v.adFemale:v.adMale;
}

async function capGenerateAudioDirectV201(text){
 let cfg={};try{cfg=JSON.parse(localStorage.getItem('capivara_admin_settings')||'{}')}catch{}
 if(!cfg.eleven)throw new Error('ElevenLabs não configurado no administrador.');
 // V26: usa os MESMOS campos do ADM que o gerador antigo já usava: male / female.
 // A próxima voz é definida pelo último anúncio realmente salvo.
 const last=[...ads].reverse().find(a=>a && a.voice);
 const lastWasMale=last && /mascul|homem/i.test(last.voice||'');
 const lastWasFemale=last && /femin|mulher/i.test(last.voice||'');
 const female=lastWasMale ? true : lastWasFemale ? false : false;
 const voiceName=female?'Voz feminina':'Voz masculina';
 const ids=capOfficialVoiceIdsV49();
 const maleId=ids.adMale, femaleId=ids.adFemale;
 const voiceId=capVoiceIdForV49('ad',female);
 if(!voiceId)throw new Error((female?'Voice ID feminino':'Voice ID masculino')+' não encontrado na configuração do administrador.');
 const r=await fetch('https://api.elevenlabs.io/v1/text-to-speech/'+encodeURIComponent(voiceId),{
   method:'POST',
   headers:{'Content-Type':'application/json','xi-api-key':cfg.eleven,'Accept':'audio/mpeg'},
   body:JSON.stringify({text,model_id:'eleven_multilingual_v2'})
 });
 if(!r.ok){let detail='';try{detail=await r.text()}catch{};throw new Error('ElevenLabs '+r.status+(detail?' — '+detail.slice(0,180):''))}
 const blob=await r.blob();
 if(!blob||!blob.size)throw new Error('ElevenLabs não retornou áudio.');
 return {text,voice:voiceName,blob,top:createMode==='top',label:capAudioLabel(),product:selectedProduct||'',price:($('#price')?.value||'').trim()};
}
async function capCreateOneClickV20(){
 if(window.capCreatingV20)return;
 window.capCreatingV20=true;
 const btn=$('#suggest'),old=btn.textContent;
 try{
   // create phrase
   await createTexts();
   const text=($('#text1')?.value||'').trim();
   if(!text)throw new Error('A frase não foi criada.');
   // cria o áudio diretamente, sem depender dos botões do modo passo a passo
   const p=await capGenerateAudioDirectV201(text);
   // queue directly, same persistent path used by radio engine
   let days=+$('#duration').value,exp=days?Date.now()+days*86400000:null;
   if(todayCreated()>=capLimits().daily)throw new Error('O limite diário de anúncios foi atingido.');if(weekCreated()>=capLimits().weekly)throw new Error('O limite semanal de anúncios foi atingido.');
   if(p.top&&topCreatedToday()>=capLimits().top)throw new Error('O limite diário de TOP foi atingido.');
   const id='ad_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),audioKey=capClientAudioKey(id);
   await capSaveAdBlob(audioKey,p.blob);
   ads.push({id,label:p.label,product:p.product,price:p.price,text:p.text,voice:p.voice,paused:false,exp,audioKey,top:!!p.top,createdDay:dayKey()});
   registerUse(!!p.top);
   localStorage.setItem(capClientKey('cap_voice_queued_count'),String(+(localStorage.getItem(capClientKey('cap_voice_queued_count'))||0)+1));
   saveAds();renderCreatedAudiosV19();
   if(p.top)setCreateMode('normal');
   capResetCreateV20();
 }catch(e){console.error(e);alert('Não foi possível criar o anúncio.\n\n'+(e.message||e))}
 finally{window.capCreatingV20=false;if(btn){btn.disabled=false;btn.textContent='✨ CRIAR ANÚNCIO'}}
}
function capSetStepModeV20(on){
 localStorage.setItem('cap_step_mode',on?'1':'0');
 document.body.classList.toggle('step-mode-v20',on);
 const b=document.getElementById('stepModeV20');if(b)b.textContent=on?'⚡ VOLTAR PARA 1 CLIQUE':'⚙ FAZER PASSO A PASSO';
}
window.addEventListener('DOMContentLoaded',()=>{
 const b=document.getElementById('stepModeV20');
 capSetStepModeV20(localStorage.getItem('cap_step_mode')==='1');
 if(b)b.onclick=()=>capSetStepModeV20(!document.body.classList.contains('step-mode-v20'));
 const main=$('#suggest');
 if(main)main.addEventListener('click',async e=>{
   return; // V21: fluxo guiado é o padrão; createTexts() segue normalmente.
 },true);
});

function capStageV21(stage){
 document.body.dataset.capstage=stage;
 const sug=document.getElementById('suggestions');
 if(stage==='start' && sug)sug.classList.add('hidden');
 const gen=document.querySelector('[data-gen="1"]');
 const actions=document.getElementById('actions1');
 if(gen){
   gen.classList.toggle('pulse-v21',stage==='phrase');
   gen.textContent=stage==='phrase'?'🔊 GERAR ÁUDIO':'GERAR ÁUDIO';
 }
 if(actions){
   actions.classList.toggle('hidden',stage!=='audio');
   actions.classList.toggle('confirm-v21',stage==='audio');
 }
}
function capDiscardV21(){
 if(pendingAudio[1]?.url)try{URL.revokeObjectURL(pendingAudio[1].url)}catch{}
 pendingAudio[1]=null;
 const a=document.getElementById('audio1');if(a){a.pause();a.removeAttribute('src')}
 capResetCreateV20();capStageV21('start');
}
window.addEventListener('DOMContentLoaded',()=>{
 capStageV21('start');
 const actions=document.getElementById('actions1');
 if(actions && !document.getElementById('discardV21')){
   const no=document.createElement('button');
   no.type='button';no.id='discardV21';no.className='discard-v21';no.textContent='🗑 DESCARTAR';
   no.onclick=capDiscardV21;actions.appendChild(no);
 }
 const q=document.querySelector('[data-queue="1"]');
 if(q)q.textContent='✅ MANDAR PRA FILA';
});

function capStageV22(stage){
 document.body.dataset.capstage22=stage;
 const gen=document.getElementById('generateAudioV22');
 if(gen){
   gen.classList.toggle('pulse-v22',stage==='phrase');
   gen.textContent='🔊 GERAR ÁUDIO';
 }
}
async function capGenerateAndQueueV22(){
 if(window.capAudioBusyV22)return;
 window.capAudioBusyV22=true;
 const btn=document.getElementById('generateAudioV22');
 try{
   if(btn){btn.disabled=true;btn.textContent='GERANDO ÁUDIO...'}
   const text=($('#brief')?.value||'').trim();
   if(!text)throw new Error('O texto do anúncio está vazio.');
   // Use the edited large-field text as the final spoken phrase.
   $('#text1').value=text;
   const pa=await capGenerateAudioDirectV201(text);
   let days=+$('#duration').value,exp=days?Date.now()+days*86400000:null;
   if(todayCreated()>=capLimits().daily)throw new Error('O limite diário de anúncios foi atingido.');if(weekCreated()>=capLimits().weekly)throw new Error('O limite semanal de anúncios foi atingido.');
   if(pa.top&&topCreatedToday()>=capLimits().top)throw new Error('O limite diário de TOP foi atingido.');
   const id='ad_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),audioKey=capClientAudioKey(id);
   await capSaveAdBlob(audioKey,pa.blob);
   ads.push({id,label:pa.label,product:pa.product,price:pa.price,text:text,voice:pa.voice,paused:false,exp,audioKey,top:!!pa.top,createdDay:dayKey()});
   registerUse(!!pa.top);
   localStorage.setItem(capClientKey('cap_voice_queued_count'),String(+(localStorage.getItem(capClientKey('cap_voice_queued_count'))||0)+1));
   saveAds();renderCreatedAudiosV19();
   if(pa.top)setCreateMode('normal');
   capResetCreateV20();capStageV22('start');
 }catch(e){console.error(e);alert('Não foi possível gerar o áudio.\n\n'+(e.message||e))}
 finally{window.capAudioBusyV22=false;if(btn){btn.disabled=false;btn.textContent='🔊 GERAR ÁUDIO'}}
}


async function capGenerateQueueV24(){
 if(window.capV24busy)return;
 window.capV24busy=true;
 const btn=document.getElementById('generateAudioV24');
 try{
  if(btn){btn.disabled=true;btn.textContent='GERANDO ÁUDIO...'}
  const text=(document.getElementById('brief')?.value||'').trim();
  if(!text)throw new Error('O texto do anúncio está vazio.');
  const pa=await capGenerateAudioDirectV201(text);
  if(todayCreated()>=capLimits().daily)throw new Error('O limite diário de anúncios foi atingido.');if(weekCreated()>=capLimits().weekly)throw new Error('O limite semanal de anúncios foi atingido.');
  if(pa.top&&topCreatedToday()>=capLimits().top)throw new Error('O limite diário de TOP foi atingido.');
  const days=+document.getElementById('duration').value, exp=days?Date.now()+days*86400000:null;
  const id='ad_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),audioKey=capClientAudioKey(id);
  await capSaveAdBlob(audioKey,pa.blob);
  ads.push({id,label:pa.label,product:pa.product,price:pa.price,text,voice:pa.voice,paused:false,exp,audioKey,top:!!pa.top,createdDay:dayKey()});
  registerUse(!!pa.top);
  localStorage.setItem(capClientKey('cap_voice_queued_count'),String(+(localStorage.getItem(capClientKey('cap_voice_queued_count'))||0)+1));
  saveAds();renderCreatedAudiosV19();
  if(pa.top)setCreateMode('normal');
  capResetCreateV20();
  document.body.dataset.v24stage='start';
 }catch(e){console.error(e);alert('Não foi possível gerar o áudio.\n\n'+(e.message||e))}
 finally{window.capV24busy=false;if(btn){btn.disabled=false;btn.textContent='🔊 GERAR ÁUDIO'}}
}
window.addEventListener('DOMContentLoaded',()=>{
 document.body.dataset.v24stage='start';
 const b=document.getElementById('generateAudioV24');
 if(b)b.onclick=capGenerateQueueV24;
 // hard cleanup of any legacy button that may be created dynamically
 const clean=()=>document.querySelectorAll('button').forEach(x=>{
   if(/gerar outra/i.test((x.textContent||'').trim()))x.remove();
 });
 clean();
 new MutationObserver(clean).observe(document.body,{childList:true,subtree:true});
});

function capV25SetMainButtons(show){
 const create=document.getElementById('suggest');
 if(create)create.style.display=show?'':'none';
 document.querySelectorAll('button').forEach(b=>{
   if(/top do dia/i.test((b.textContent||'').trim()))b.style.display=show?'':'none';
 });
}
window.addEventListener('DOMContentLoaded',()=>{
 const desist=document.getElementById('desistV25');
 if(desist)desist.onclick=()=>{
   // Keep the generated/edited phrase exactly as-is.
   document.body.dataset.v24stage='start';
   capV25SetMainButtons(true);
 };
 const obs=new MutationObserver(()=>{
   capV25SetMainButtons(document.body.dataset.v24stage!=='phrase');
 });
 obs.observe(document.body,{attributes:true,attributeFilter:['data-v24stage']});
});


// V39 — volume REAL, aplicado no áudio que já está tocando
(function(){
 function clamp(v,f){v=Number(v);return Number.isFinite(v)?Math.max(0,Math.min(100,v)):f}
 function applyMusic(){
   const e=document.getElementById('musicVol'); if(!e)return;
   const v=clamp(e.value,75)/100;
   localStorage.setItem('cap_musicVol',e.value);
   if(radioAudio) radioAudio.volume=v;
 }
 function applyBed(){
   const e=document.getElementById('bedVol'); if(!e)return;
   const v=clamp(e.value,6)/100;
   localStorage.setItem('cap_bedVol',e.value);
   if(window.capCurrentBedAudio) window.capCurrentBedAudio.volume=v;
 }
 function bind(){
   const music=document.getElementById('musicVol'),bed=document.getElementById('bedVol');
   if(music && !music.dataset.v39){
     music.dataset.v39='1';
     const sv=localStorage.getItem('cap_musicVol'); if(sv!==null)music.value=sv;
     music.addEventListener('input',applyMusic);
     music.addEventListener('change',applyMusic);
     applyMusic();
   }
   if(bed && !bed.dataset.v39){
     bed.dataset.v39='1';
     const sv=localStorage.getItem('cap_bedVol');
     if(sv!==null) bed.value=sv; else {bed.value='6';localStorage.setItem('cap_bedVol','6')}
     bed.addEventListener('input',applyBed);
     bed.addEventListener('change',applyBed);
     applyBed();
   }
 }
 document.addEventListener('DOMContentLoaded',bind);
 window.addEventListener('load',bind);
 window.capApplyMusicVolumeV39=applyMusic;
 window.capApplyBedVolumeV39=applyBed;
})();


// V48 — texto digitado diretamente usando o MESMO fluxo real do Player
(function(){
 function manualText(){const e=document.getElementById('brief');return e?String(e.value||'').trim():''}
 function update(){
   const w=document.getElementById('manualAudioWrapV47');
   if(w)w.style.display=manualText()?'block':'none';
 }
 async function run(){
   const t=manualText();
   if(!t){alert('Digite o texto do anúncio.');return}
   // Prepara a opção 1 exatamente como o fluxo normal de áudio espera.
   const text1=document.getElementById('text1');
   if(text1) text1.value=t;
   const audio1=document.getElementById('audio1');
   if(audio1) audio1.classList.remove('hidden');
   // Função real da base V40/V46: gera TTS e salva na programação.
   if(typeof capGenerateQueueV24==='function'){
      await capGenerateQueueV24(1);
   }else if(typeof capGenerateAndQueueV22==='function'){
      await capGenerateAndQueueV22(1);
   }else if(typeof capGenerateAudioDirectV201==='function'){
      await capGenerateAudioDirectV201(1);
   }else{
      throw new Error('Fluxo interno de áudio indisponível.');
   }
   update();
 }
 document.addEventListener('DOMContentLoaded',()=>{
   const e=document.getElementById('brief');
   const b=document.getElementById('manualAudioBtnV47');
   if(e)e.addEventListener('input',update);
   if(b)b.addEventListener('click',()=>run().catch(err=>alert('Erro ao gerar áudio: '+(err?.message||err))));
   update();
 });
})();
