/* =========================================================
   CAPIVARA RÁDIO PLAYER — V52
   PLAYLISTS ONLINE DO ADM
   SOMENTE PLAYER
   COLE NO FINAL DO app.js
========================================================= */

(function(){

const CAP_V52_SERVER =
 'https://capivara-radio-server.onrender.com';

let capPlaylistsV52 = [];
let capMediaV52 = [];
let capSelectedPlaylistV52 = '';
let capPendingPlaylistV52 = '';
let capPlaylistIndexV52 = 0;
let capLoadingV52 = false;

/* =========================================================
   CLIENTE
========================================================= */

function capCodeV52(){
 try{
  return String(store?.code || '').trim();
 }catch(e){
  return '';
 }
}

function capPlaylistKeyV52(){
 return 'capivara_playlist_' + capCodeV52();
}

/* =========================================================
   API
========================================================= */

async function capApiV52(path,opt={}){
 const r = await fetch(
  CAP_V52_SERVER + path,
  {
   ...opt,
   headers:{
    Accept:'application/json',
    ...(opt.headers || {})
   }
  }
 );

 let j = {};

 try{
  j = await r.json();
 }catch(e){}

 if(!r.ok){
  throw new Error(
   j?.error ||
   j?.message ||
   ('Erro ' + r.status)
  );
 }

 return j;
}

/* =========================================================
   NORMALIZAÇÃO
========================================================= */

function capNormalizePlaylistsV52(j){

 const raw =
  j?.playlists ??
  j?.data ??
  j ??
  [];

 if(Array.isArray(raw)){
  return raw;
 }

 if(
  raw &&
  typeof raw === 'object'
 ){
  return Object.entries(raw).map(
   ([id,p])=>({
    id,
    ...(p || {})
   })
  );
 }

 return [];
}

function capNormalizeMediaV52(j){

 const raw =
  j?.media ??
  j?.data ??
  j ??
  [];

 if(!Array.isArray(raw)){
  return [];
 }

 return raw;
}

/* =========================================================
   PLAYLIST ATUAL
========================================================= */

function capPlaylistAtualV52(){

 return capPlaylistsV52.find(
  p=>
   String(p.id) ===
   String(capSelectedPlaylistV52)
 ) || null;
}

function capMusicasPlaylistV52(){

 const playlist =
  capPlaylistAtualV52();

 if(
  !playlist ||
  !Array.isArray(playlist.musicIds)
 ){
  return [];
 }

 const mapa =
  new Map(
   capMediaV52.map(
    m=>[
     String(m.id),
     m
    ]
   )
  );

 return playlist.musicIds
  .map(
   id=>mapa.get(String(id))
  )
  .filter(Boolean);
}

/* =========================================================
   URL DA MÚSICA
========================================================= */

function capMediaUrlV52(meta){

 if(!meta){
  return '';
 }

 if(
  meta.url &&
  /^https?:\/\//i.test(meta.url)
 ){
  return meta.url;
 }

 if(meta.url){
  return (
   CAP_V52_SERVER +
   (
    String(meta.url)
     .startsWith('/')
     ? ''
     : '/'
   ) +
   meta.url
  );
 }

 if(meta.id){
  return (
   CAP_V52_SERVER +
   '/api/media/' +
   encodeURIComponent(meta.id)
  );
 }

 return '';
}

/* =========================================================
   CARREGAR PLAYLISTS + MÚSICAS
========================================================= */

async function capCarregarRadioOnlineV52(){

 if(capLoadingV52){
  return;
 }

 capLoadingV52 = true;

 try{

  const [p,m] =
   await Promise.all([
    capApiV52('/api/playlists'),
    capApiV52('/api/media')
   ]);

  capPlaylistsV52 =
   capNormalizePlaylistsV52(p)
   .filter(
    x=>
     x &&
     x.active !== false
   );

  capMediaV52 =
   capNormalizeMediaV52(m)
   .filter(
    x=>
     x &&
     String(
      x.kind || 'music'
     ).toLowerCase() === 'music'
   );

  let saved =
   localStorage.getItem(
    capPlaylistKeyV52()
   ) || '';

  /* ESTADO CENTRAL DO CLIENTE */

  const code =
   capCodeV52();

  if(code){

   try{

    const stateResponse =
     await capApiV52(
      '/api/client/' +
      encodeURIComponent(code) +
      '/state'
     );

    const state =
     stateResponse?.state ||
     stateResponse?.data ||
     stateResponse ||
     {};

    if(
     state.selectedPlaylistId ||
     state.selectedPlaylist
    ){
     saved =
      String(
       state.selectedPlaylistId ||
       state.selectedPlaylist
      );
    }

   }catch(e){}
  }

  /* CONFERE SE A PLAYLIST EXISTE */

  if(
   !capPlaylistsV52.some(
    p=>
     String(p.id) ===
     String(saved)
   )
  ){

   const first =
    capPlaylistsV52.find(
     p=>
      Array.isArray(p.musicIds) &&
      p.musicIds.length
    ) ||
    capPlaylistsV52[0];

   saved =
    first
     ? String(first.id)
     : '';
  }

  capSelectedPlaylistV52 =
   saved;

  if(saved){
   localStorage.setItem(
    capPlaylistKeyV52(),
    saved
   );
  }

  capRenderPlaylistV52();

 }catch(e){

  console.error(
   'Erro ao carregar playlists online:',
   e
  );

  capRenderErroV52();

 }finally{

  capLoadingV52 = false;
 }
}

/* =========================================================
   SALVAR ESCOLHA
========================================================= */

async function capSalvarPlaylistV52(id){

 id =
  String(id || '');

 if(!id){
  return;
 }

 capSelectedPlaylistV52 =
  id;

 capPlaylistIndexV52 =
  0;

 localStorage.setItem(
  capPlaylistKeyV52(),
  id
 );

 capRenderPlaylistV52();

 const code =
  capCodeV52();

 if(!code){
  return;
 }

 try{

  let oldState = {};

  try{

   const old =
    await capApiV52(
     '/api/client/' +
     encodeURIComponent(code) +
     '/state'
    );

   oldState =
    old?.state ||
    old?.data ||
    old ||
    {};

  }catch(e){}

  await capApiV52(
   '/api/client/' +
   encodeURIComponent(code) +
   '/state',
   {
    method:'PUT',

    headers:{
     'Content-Type':
      'application/json'
    },

    body:JSON.stringify({
     ...oldState,

     selectedPlaylistId:
      id,

     selectedPlaylist:
      id,

     updatedAt:
      new Date()
       .toISOString()
    })
   }
  );

 }catch(e){

  console.warn(
   'Playlist salva localmente.',
   e
  );
 }
}

/* =========================================================
   TROCA DE PLAYLIST
========================================================= */

async function capEscolherPlaylistV52(id){

 id =
  String(id || '');

 if(!id){
  return;
 }

 if(
  typeof playing !==
   'undefined' &&
  playing &&
  radioAudio &&
  !radioAudio.paused
 ){
  capPendingPlaylistV52 =
   id;

  capRenderPlaylistV52();

  return;
 }

 await capSalvarPlaylistV52(id);
}

window.capEscolherPlaylistV52 =
 capEscolherPlaylistV52;

/* =========================================================
   LOCALIZAR ÁREA ANTIGA DOS TEMAS
========================================================= */

function capThemeButtonsV52(){

 return document.getElementById(
  'themeButtonsV11'
 );
}

function capThemeStateV52(){

 return document.getElementById(
  'themeStateV11'
 );
}

function capTrocarTituloTemaV52(){

 const els =
  [
   ...document.querySelectorAll(
    'h1,h2,h3,h4,strong,b,div'
   )
  ];

 for(const el of els){

  const t =
   String(
    el.textContent || ''
   ).trim();

  if(
   /^escolha o tema da rádio$/i
    .test(t)
  ){
   el.textContent =
    'ESCOLHA A PLAYLIST DA RÁDIO';

   break;
  }
 }
}

/* =========================================================
   RENDER
========================================================= */

function capEscapeV52(v){

 return String(v || '')
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;');
}

function capRenderPlaylistV52(){

 capTrocarTituloTemaV52();

 const box =
  capThemeButtonsV52();

 const state =
  capThemeStateV52();

 if(!box){
  return;
 }

 if(!capPlaylistsV52.length){

  box.innerHTML = `
   <div style="
    width:100%;
    padding:15px;
    text-align:center;
    font-weight:800;
   ">
    Nenhuma playlist disponível.
   </div>
  `;

  if(state){
   state.textContent =
    'O administrador precisa criar uma playlist.';
  }

  capAtualizarStatusV52();

  return;
 }

 box.innerHTML =
  capPlaylistsV52
   .map(p=>{

    const active =
     String(p.id) ===
     String(capSelectedPlaylistV52);

    const pending =
     String(p.id) ===
     String(capPendingPlaylistV52);

    return `
     <button
      type="button"
      class="
       ${active ? 'active' : ''}
       ${pending ? 'pending' : ''}
      "
      onclick="
       capEscolherPlaylistV52(
        '${String(p.id)
          .replace(/'/g,"\\'")}'
       )
      "
     >
      ${capEscapeV52(
       p.name || 'Playlist'
      )}
     </button>
    `;
   })
   .join('');

 if(state){

  if(capPendingPlaylistV52){

   const p =
    capPlaylistsV52.find(
     x=>
      String(x.id) ===
      String(capPendingPlaylistV52)
    );

   state.textContent =
    '⏳ ' +
    (
     p?.name ||
     'Nova playlist'
    ) +
    ' entra quando a música atual terminar.';

  }else{

   state.textContent =
    '🟢 Playlist ativa: ' +
    (
     capPlaylistAtualV52()
      ?.name ||
     'nenhuma'
    );
  }
 }

 capAtualizarStatusV52();
}

/* =========================================================
   ERRO
========================================================= */

function capRenderErroV52(){

 capTrocarTituloTemaV52();

 const box =
  capThemeButtonsV52();

 const state =
  capThemeStateV52();

 if(box){

  box.innerHTML = `
   <div style="
    width:100%;
    padding:15px;
    text-align:center;
    font-weight:800;
   ">
    Não foi possível carregar as playlists.
   </div>
  `;
 }

 if(state){
  state.textContent =
   'Servidor da rádio indisponível.';
 }
}

/* =========================================================
   STATUS
========================================================= */

function capAtualizarStatusV52(){

 const info =
  document.getElementById(
   'admSyncInfo'
  );

 if(!info){
  return;
 }

 const playlist =
  capPlaylistAtualV52();

 const musicas =
  capMusicasPlaylistV52();

 info.innerHTML =
  `✅ ${capEscapeV52(
   store?.ramo || ''
  )} • <b>${
   capEscapeV52(
    playlist?.name ||
    'Sem playlist'
   )
  }</b> • ${
   musicas.length
  } música${
   musicas.length === 1
    ? ''
    : 's'
  } online`;
}

/* =========================================================
   COMPATIBILIDADE COM FUNÇÕES ANTIGAS
========================================================= */

try{

 window.chooseThemeV11 =
  function(id){
   capEscolherPlaylistV52(id);
  };

 window.renderThemesV11 =
  function(){
   capRenderPlaylistV52();
  };

 window.updateAdmStatus =
  function(){
   capAtualizarStatusV52();
  };

}catch(e){}

/* =========================================================
   TOCAR PRÓXIMA MÚSICA
========================================================= */

async function capPlayNextMusicV52(){

 if(
  typeof playing !==
   'undefined' &&
  !playing
 ){
  return;
 }

 /* APLICA TROCA PENDENTE */

 if(capPendingPlaylistV52){

  capSelectedPlaylistV52 =
   capPendingPlaylistV52;

  capPendingPlaylistV52 =
   '';

  capPlaylistIndexV52 =
   0;

  await capSalvarPlaylistV52(
   capSelectedPlaylistV52
  );
 }

 const list =
  capMusicasPlaylistV52();

 if(!list.length){

  const title =
   document.getElementById(
    'nowTitle'
   );

  const sub =
   document.getElementById(
    'nowSub'
   );

  if(title){
   title.textContent =
    'Playlist sem músicas';
  }

  if(sub){
   sub.textContent =
    'Escolha uma playlist com músicas.';
  }

  try{
   playing = false;
  }catch(e){}

  if(
   typeof syncPlayUi ===
   'function'
  ){
   syncPlayUi();
  }

  return;
 }

 if(
  capPlaylistIndexV52 >=
  list.length
 ){
  capPlaylistIndexV52 =
   0;
 }

 const meta =
  list[
   capPlaylistIndexV52++
  ];

 const url =
  capMediaUrlV52(meta);

 if(!url){

  setTimeout(
   capPlayNextMusicV52,
   500
  );

  return;
 }

 try{

  if(
   typeof radioAudio !==
    'undefined' &&
   radioAudio
  ){
   radioAudio.pause();

   radioAudio.onended =
    null;

   radioAudio.onerror =
    null;
  }

  radioAudio =
   new Audio(url);

  const volume =
   document.getElementById(
    'musicVol'
   );

  let v =
   Number(
    volume?.value || 75
   );

  if(!Number.isFinite(v)){
   v = 75;
  }

  radioAudio.volume =
   Math.max(
    0,
    Math.min(
     1,
     v / 100
    )
   );

  const title =
   document.getElementById(
    'nowTitle'
   );

  const sub =
   document.getElementById(
    'nowSub'
   );

  if(title){
   title.textContent =
    meta.name ||
    'Música';
  }

  if(sub){
   sub.textContent =
    '🎵 ' +
    (
     capPlaylistAtualV52()
      ?.name ||
     'Playlist'
    ) +
    ' • ' +
    (
     store?.name ||
     ''
    );
  }

  radioAudio.onended =
   async ()=>{

    if(
     typeof playing !==
      'undefined' &&
     !playing
    ){
     return;
    }

    /*
      A playlist solicitada durante
      a música entra somente depois
      da música terminar.
    */

    if(capPendingPlaylistV52){

     capSelectedPlaylistV52 =
      capPendingPlaylistV52;

     capPendingPlaylistV52 =
      '';

     capPlaylistIndexV52 =
      0;

     await capSalvarPlaylistV52(
      capSelectedPlaylistV52
     );
    }

    if(
     typeof capRadioAfterMusicV16 ===
     'function'
    ){
     capRadioAfterMusicV16();
    }else{
     capPlayNextMusicV52();
    }
   };

  radioAudio.onerror =
   ()=>{

    console.warn(
     'Erro ao tocar música:',
     meta
    );

    if(
     typeof playing ===
      'undefined' ||
     playing
    ){
     setTimeout(
      capPlayNextMusicV52,
      700
     );
    }
   };

  await radioAudio.play();

 }catch(e){

  console.error(
   'Erro ao iniciar música:',
   e
  );

  try{
   playing = false;
  }catch(err){}

  if(
   typeof syncPlayUi ===
   'function'
  ){
   syncPlayUi();
  }
 }
}

/* SUBSTITUI O MOTOR ANTIGO */

try{
 playNextAdmMusic =
  capPlayNextMusicV52;
}catch(e){}

window.playNextAdmMusic =
 capPlayNextMusicV52;

/* =========================================================
   BOTÃO INICIAR / PAUSAR
========================================================= */

function capBindPlayV52(){

 const btn =
  document.getElementById(
   'play'
  );

 if(!btn){
  return;
 }

 if(
  btn.dataset.capPlaylistV52 ===
  '1'
 ){
  return;
 }

 btn.dataset.capPlaylistV52 =
  '1';

 btn.onclick =
  async ()=>{

   const list =
    capMusicasPlaylistV52();

   if(
    typeof playing !==
     'undefined' &&
    !playing &&
    !list.length
   ){

    alert(
     'Escolha uma playlist com músicas.'
    );

    return;
   }

   playing =
    !playing;

   if(
    typeof syncPlayUi ===
    'function'
   ){
    syncPlayUi();
   }

   if(playing){

    await capPlayNextMusicV52();

   }else{

    try{

     if(radioAudio){
      radioAudio.pause();
     }

    }catch(e){}

    const title =
     document.getElementById(
      'nowTitle'
     );

    const sub =
     document.getElementById(
      'nowSub'
     );

    if(title){
     title.textContent =
      'Rádio pausada';
    }

    if(sub){
     sub.textContent =
      'Escolha uma playlist e inicie quando quiser';
    }
   }
  };
}

/* =========================================================
   SINCRONIZA PLAYLIST COM ESTADO V50
========================================================= */

const capOldPushV52 =
 typeof capPushClientStateV50 ===
 'function'
  ? capPushClientStateV50
  : null;

if(capOldPushV52){

 capPushClientStateV50 =
  async function(){

   if(
    !capClientReady ||
    !store.code
   ){
    return;
   }

   try{

    const safeAds =
     ads.map(
      a=>({
       ...a,
       clientCode:
        String(store.code)
      })
     );

    await fetch(
     CAP_V52_SERVER +
     '/api/client/' +
     encodeURIComponent(
      store.code
     ) +
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

       adsPerBlock:+(
        document
         .getElementById(
          'adsPerBlock'
         )
         ?.value ||
        3
       ),

       selectedPlaylistId:
        capSelectedPlaylistV52,

       selectedPlaylist:
        capSelectedPlaylistV52,

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
    );
   }
  };
}

/* =========================================================
   LOGIN
========================================================= */

if(
 typeof applyAdmStore ===
 'function'
){

 const capOldApplyStoreV52 =
  applyAdmStore;

 applyAdmStore =
  function(c){

   const result =
    capOldApplyStoreV52(c);

   capSelectedPlaylistV52 =
    localStorage.getItem(
     'capivara_playlist_' +
     String(
      c?.code ||
      store?.code ||
      ''
     )
    ) ||
    '';

   capPendingPlaylistV52 =
    '';

   capPlaylistIndexV52 =
    0;

   setTimeout(
    async ()=>{

     await capCarregarRadioOnlineV52();

     capBindPlayV52();

    },
    150
   );

   return result;
  };
}

/* =========================================================
   INIT
========================================================= */

document.addEventListener(
 'DOMContentLoaded',
 ()=>{

  capTrocarTituloTemaV52();

  capBindPlayV52();

  if(
   typeof capClientReady !==
    'undefined' &&
   capClientReady
  ){

   setTimeout(
    capCarregarRadioOnlineV52,
    300
   );
  }

  const observer =
   new MutationObserver(
    ()=>{

     capTrocarTituloTemaV52();

     capBindPlayV52();
    }
   );

  observer.observe(
   document.body,
   {
    childList:true,
    subtree:true
   }
  );
 }
);

/* =========================================================
   ATUALIZA PLAYLISTS A CADA 60 SEGUNDOS
========================================================= */

setInterval(
 ()=>{

  if(
   typeof capClientReady !==
    'undefined' &&
   capClientReady
  ){
   capCarregarRadioOnlineV52();
  }

 },
 60000
);

/* =========================================================
   FUNÇÕES GLOBAIS
========================================================= */

window.capCarregarRadioOnlineV52 =
 capCarregarRadioOnlineV52;

window.capSalvarPlaylistV52 =
 capSalvarPlaylistV52;

window.capPlayNextMusicV52 =
 capPlayNextMusicV52;

})();
