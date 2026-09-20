// CAPIVARA RÁDIO PLAYER
// V51 — PLAYLISTS ONLINE + ESCOLHA SALVA POR CLIENTE
//
// COLE ESTE BLOCO NO FINAL DO app.js ATUAL.
// Esta versão mantém o Player existente e liga o acervo/playlists
// online do ADM ao cliente.

const CAP_PLAYLIST_SERVER_V51 =
  'https://capivara-radio-server.onrender.com';

let capOnlinePlaylistsV51 = {};
let capOnlineMediaV51 = [];
let capCurrentPlaylistV51 = '';
let capOnlineMusicIndexV51 = 0;
let capOnlineRadioBusyV51 = false;

/* =========================================================
   CHAVES INDIVIDUAIS DO CLIENTE
========================================================= */

function capPlaylistClientCodeV51(){
  try{
    return String(store?.code || '').trim();
  }catch{
    return '';
  }
}

function capPlaylistStorageKeyV51(){
  const code = capPlaylistClientCodeV51();

  return 'cap_online_playlist_v51_' + (code || 'sem_cliente');
}

function capGetSavedPlaylistV51(){
  return String(
    localStorage.getItem(capPlaylistStorageKeyV51()) || ''
  ).trim();
}

function capSavePlaylistLocalV51(id){
  capCurrentPlaylistV51 = String(id || '');

  localStorage.setItem(
    capPlaylistStorageKeyV51(),
    capCurrentPlaylistV51
  );
}

/* =========================================================
   API
========================================================= */

async function capFetchJsonV51(path, options = {}){
  const response = await fetch(
    CAP_PLAYLIST_SERVER_V51 + path,
    {
      ...options,
      headers:{
        Accept:'application/json',
        ...(options.headers || {})
      }
    }
  );

  let data = {};

  try{
    data = await response.json();
  }catch{}

  if(!response.ok){
    throw new Error(
      data?.error ||
      data?.message ||
      'Erro HTTP ' + response.status
    );
  }

  return data;
}

/* =========================================================
   CARREGAR PLAYLISTS E ACERVO ONLINE
========================================================= */

async function capLoadOnlinePlaylistsV51(){
  try{
    const [playlistData, mediaData] = await Promise.all([
      capFetchJsonV51('/api/playlists'),
      capFetchJsonV51('/api/media?kind=music')
    ]);

    let rawPlaylists = playlistData?.playlists || {};

    if(Array.isArray(rawPlaylists)){
      const converted = {};

      rawPlaylists.forEach(p=>{
        if(p?.id){
          converted[p.id] = p;
        }
      });

      rawPlaylists = converted;
    }

    capOnlinePlaylistsV51 = rawPlaylists || {};

    capOnlineMediaV51 = Array.isArray(mediaData?.media)
      ? mediaData.media.filter(x=>x?.kind === 'music')
      : [];

    let saved = capGetSavedPlaylistV51();

    if(
      saved &&
      (
        !capOnlinePlaylistsV51[saved] ||
        capOnlinePlaylistsV51[saved]?.active === false
      )
    ){
      saved = '';
    }

    if(!saved){
      const first = Object.values(capOnlinePlaylistsV51)
        .find(p=>
          p &&
          p.active !== false &&
          Array.isArray(p.musicIds) &&
          p.musicIds.length
        );

      if(first?.id){
        saved = first.id;
        capSavePlaylistLocalV51(saved);
      }
    }

    capCurrentPlaylistV51 = saved;

    capRenderPlaylistSelectorV51();

    return true;

  }catch(error){
    console.warn(
      'Playlists online indisponíveis.',
      error
    );

    capRenderPlaylistSelectorV51();

    return false;
  }
}

/* =========================================================
   MÚSICAS DA PLAYLIST ESCOLHIDA
========================================================= */

function capSelectedPlaylistV51(){
  return capOnlinePlaylistsV51[
    capCurrentPlaylistV51
  ] || null;
}

function capPlaylistMusicsV51(){
  const playlist = capSelectedPlaylistV51();

  if(
    !playlist ||
    playlist.active === false ||
    !Array.isArray(playlist.musicIds)
  ){
    return [];
  }

  const mediaMap = new Map(
    capOnlineMediaV51.map(m=>[
      String(m.id),
      m
    ])
  );

  return playlist.musicIds
    .map(id=>mediaMap.get(String(id)))
    .filter(Boolean);
}

function capMediaUrlV51(media){
  if(!media)return '';

  if(
    media.url &&
    /^https?:\/\//i.test(media.url)
  ){
    return media.url;
  }

  if(media.url){
    return (
      CAP_PLAYLIST_SERVER_V51 +
      (
        String(media.url).startsWith('/')
          ? media.url
          : '/' + media.url
      )
    );
  }

  if(media.id){
    return (
      CAP_PLAYLIST_SERVER_V51 +
      '/api/media/' +
      encodeURIComponent(media.id)
    );
  }

  return '';
}

/* =========================================================
   SALVAR PLAYLIST ESCOLHIDA NO ESTADO CENTRAL DO CLIENTE
========================================================= */

async function capSavePlaylistServerV51(id){
  const code = capPlaylistClientCodeV51();

  if(!code)return;

  try{
    let currentState = {};

    try{
      const current = await capFetchJsonV51(
        '/api/client/' +
        encodeURIComponent(code) +
        '/state'
      );

      currentState =
        current?.state ||
        current?.data ||
        {};
    }catch{}

    await capFetchJsonV51(
      '/api/client/' +
      encodeURIComponent(code) +
      '/state',
      {
        method:'PUT',

        headers:{
          'Content-Type':'application/json'
        },

        body:JSON.stringify({
          ...currentState,

          selectedPlaylist:id,

          updatedAt:
            new Date().toISOString()
        })
      }
    );

  }catch(error){
    console.warn(
      'Não foi possível salvar a playlist no servidor.',
      error
    );
  }
}

async function capLoadPlaylistFromClientStateV51(){
  const code = capPlaylistClientCodeV51();

  if(!code)return;

  try{
    const response = await capFetchJsonV51(
      '/api/client/' +
      encodeURIComponent(code) +
      '/state'
    );

    const state =
      response?.state ||
      response?.data ||
      {};

    const id =
      String(state.selectedPlaylist || '');

    if(
      id &&
      capOnlinePlaylistsV51[id] &&
      capOnlinePlaylistsV51[id].active !== false
    ){
      capSavePlaylistLocalV51(id);
    }

  }catch(error){
    console.warn(
      'Usando playlist salva neste aparelho.',
      error
    );
  }
}

/* =========================================================
   TROCAR PLAYLIST
========================================================= */

async function capSelectPlaylistV51(id){
  id = String(id || '');

  if(
    !id ||
    !capOnlinePlaylistsV51[id]
  ){
    return;
  }

  capSavePlaylistLocalV51(id);

  capOnlineMusicIndexV51 = 0;

  await capSavePlaylistServerV51(id);

  capRenderPlaylistSelectorV51();

  if(
    typeof radioOn !== 'undefined' &&
    radioOn
  ){
    try{
      if(radioAudio){
        radioAudio.pause();
        radioAudio.src = '';
      }
    }catch{}

    setTimeout(()=>{
      capPlayNextOnlineMusicV51()
        .catch(console.error);
    },150);
  }
}

/* =========================================================
   INTERFACE DA PLAYLIST
========================================================= */

function capFindRadioSectionV51(){
  return (
    document.getElementById('radioPanel') ||
    document.getElementById('radio') ||
    document.querySelector('.radio-card') ||
    document.querySelector('[data-radio]') ||
    document.querySelector('#radioSection') ||
    document.querySelector('main') ||
    document.body
  );
}

function capEnsurePlaylistUIV51(){
  if(document.getElementById('capPlaylistBoxV51')){
    return;
  }

  const target = capFindRadioSectionV51();

  if(!target)return;

  const box = document.createElement('div');

  box.id = 'capPlaylistBoxV51';

  box.innerHTML = `
    <style>
      #capPlaylistBoxV51{
        margin:14px 0;
        padding:14px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:14px;
        background:rgba(255,255,255,.04);
      }

      #capPlaylistBoxV51 .cap-title-v51{
        font-weight:900;
        margin-bottom:8px;
      }

      #capPlaylistSelectV51{
        width:100%;
        min-height:48px;
        border-radius:11px;
        padding:0 12px;
        font:700 15px system-ui;
      }

      #capPlaylistInfoV51{
        margin-top:8px;
        font:700 12px system-ui;
        opacity:.72;
      }
    </style>

    <div class="cap-title-v51">
      🎵 Playlist da rádio
    </div>

    <select id="capPlaylistSelectV51">
      <option value="">
        Carregando playlists...
      </option>
    </select>

    <div id="capPlaylistInfoV51"></div>
  `;

  const firstChild = target.firstElementChild;

  if(firstChild){
    target.insertBefore(
      box,
      firstChild
    );
  }else{
    target.appendChild(box);
  }

  const select =
    document.getElementById(
      'capPlaylistSelectV51'
    );

  if(select){
    select.addEventListener(
      'change',
      ()=>{
        capSelectPlaylistV51(
          select.value
        );
      }
    );
  }
}

function capRenderPlaylistSelectorV51(){
  capEnsurePlaylistUIV51();

  const select =
    document.getElementById(
      'capPlaylistSelectV51'
    );

  const info =
    document.getElementById(
      'capPlaylistInfoV51'
    );

  if(!select)return;

  const list =
    Object.values(
      capOnlinePlaylistsV51 || {}
    )
    .filter(p=>
      p &&
      p.active !== false &&
      Array.isArray(p.musicIds) &&
      p.musicIds.length
    );

  if(!list.length){
    select.innerHTML = `
      <option value="">
        Nenhuma playlist disponível
      </option>
    `;

    select.disabled = true;

    if(info){
      info.textContent =
        'Adicione músicas e crie uma playlist no ADM.';
    }

    return;
  }

  select.disabled = false;

  select.innerHTML =
    list.map(p=>`
      <option
        value="${capEscapeV51(p.id)}"
        ${
          String(p.id) ===
          String(capCurrentPlaylistV51)
            ? 'selected'
            : ''
        }
      >
        ${capEscapeV51(p.name || 'Playlist')}
      </option>
    `).join('');

  const selected =
    capSelectedPlaylistV51();

  if(info){
    info.textContent =
      selected
        ? (
            (selected.musicIds?.length || 0) +
            ' música' +
            (
              (selected.musicIds?.length || 0) === 1
                ? ''
                : 's'
            )
          )
        : '';
  }
}

function capEscapeV51(value){
  return String(value || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* =========================================================
   ÁUDIO ONLINE
========================================================= */

function capEnsureRadioAudioV51(){
  if(
    typeof radioAudio !== 'undefined' &&
    radioAudio
  ){
    return radioAudio;
  }

  try{
    radioAudio = new Audio();
    return radioAudio;
  }catch{
    return new Audio();
  }
}

function capMusicVolumeV51(){
  const input =
    document.getElementById('musicVol');

  let value =
    input
      ? Number(input.value)
      : Number(
          localStorage.getItem(
            'cap_musicVol'
          ) || 75
        );

  if(!Number.isFinite(value)){
    value = 75;
  }

  return Math.max(
    0,
    Math.min(1,value / 100)
  );
}

async function capPlayMusicObjectV51(media){
  const url = capMediaUrlV51(media);

  if(!url){
    throw new Error(
      'Música sem endereço online.'
    );
  }

  const audio =
    capEnsureRadioAudioV51();

  audio.pause();

  audio.src = url;

  audio.volume =
    capMusicVolumeV51();

  audio.preload = 'auto';

  await audio.play();

  return new Promise(resolve=>{
    let finished = false;

    const done = ()=>{
      if(finished)return;

      finished = true;

      audio.removeEventListener(
        'ended',
        done
      );

      audio.removeEventListener(
        'error',
        fail
      );

      resolve(true);
    };

    const fail = ()=>{
      if(finished)return;

      finished = true;

      audio.removeEventListener(
        'ended',
        done
      );

      audio.removeEventListener(
        'error',
        fail
      );

      resolve(false);
    };

    audio.addEventListener(
      'ended',
      done,
      {once:true}
    );

    audio.addEventListener(
      'error',
      fail,
      {once:true}
    );
  });
}

/* =========================================================
   PRÓXIMA MÚSICA ONLINE
========================================================= */

async function capPlayNextOnlineMusicV51(){
  if(capOnlineRadioBusyV51){
    return false;
  }

  const music =
    capPlaylistMusicsV51();

  if(!music.length){
    return false;
  }

  capOnlineRadioBusyV51 = true;

  try{
    if(
      capOnlineMusicIndexV51 >=
      music.length
    ){
      capOnlineMusicIndexV51 = 0;
    }

    const current =
      music[
        capOnlineMusicIndexV51
      ];

    capOnlineMusicIndexV51++;

    if(
      capOnlineMusicIndexV51 >=
      music.length
    ){
      capOnlineMusicIndexV51 = 0;
    }

    await capPlayMusicObjectV51(
      current
    );

    return true;

  }finally{
    capOnlineRadioBusyV51 = false;
  }
}

/* =========================================================
   VINHETAS ONLINE
========================================================= */

async function capGetJinglesV51(){
  try{
    const d =
      await capFetchJsonV51(
        '/api/jingles'
      );

    return d?.jingles || {};
  }catch{
    return {};
  }
}

function capRamoV51(){
  try{
    return String(
      store?.ramo ||
      store?.businessType ||
      ''
    ).trim();
  }catch{
    return '';
  }
}

function capUseJinglesV51(){
  const possible = [
    document.getElementById(
      'useJingles'
    ),
    document.getElementById(
      'jinglesOn'
    )
  ].filter(Boolean);

  if(possible.length){
    const el = possible[0];

    if(
      el.type === 'checkbox'
    ){
      return !!el.checked;
    }

    const value =
      String(el.value || '')
        .toLowerCase();

    if(
      value === 'não' ||
      value === 'nao' ||
      value === '0' ||
      value === 'false'
    ){
      return false;
    }
  }

  const saved =
    localStorage.getItem(
      'cap_use_jingles_' +
      capPlaylistClientCodeV51()
    );

  return saved !== '0';
}

async function capPlayOnlineJingleV51(type){
  if(!capUseJinglesV51()){
    return false;
  }

  const ramo =
    capRamoV51();

  if(!ramo){
    return false;
  }

  const jingles =
    await capGetJinglesV51();

  const list =
    jingles?.[ramo]?.[type];

  if(
    !Array.isArray(list) ||
    !list.length
  ){
    return false;
  }

  const item =
    list[
      Math.floor(
        Math.random() *
        list.length
      )
    ];

  const mediaId =
    item?.mediaId;

  if(!mediaId){
    return false;
  }

  const audio =
    new Audio(
      CAP_PLAYLIST_SERVER_V51 +
      '/api/media/' +
      encodeURIComponent(mediaId)
    );

  audio.volume = 1;

  try{
    await audio.play();

    await new Promise(resolve=>{
      audio.onended = resolve;
      audio.onerror = resolve;
    });

    return true;

  }catch{
    return false;
  }
}

/* =========================================================
   ANÚNCIOS
========================================================= */

function capActiveAdsV51(){
  try{
    const now = Date.now();

    return (ads || [])
      .filter(ad=>
        ad &&
        !ad.paused &&
        (
          !ad.exp ||
          Number(ad.exp) > now
        )
      );
  }catch{
    return [];
  }
}

function capAdsPerBlockV51(){
  const el =
    document.getElementById(
      'adsPerBlock'
    );

  let value =
    el
      ? Number(el.value)
      : Number(
          localStorage.getItem(
            'cap_ads_per_block_' +
            capPlaylistClientCodeV51()
          ) || 3
        );

  if(
    !Number.isFinite(value) ||
    value < 1
  ){
    value = 3;
  }

  return Math.max(
    1,
    Math.min(20,value)
  );
}

async function capGetAdBlobV51(ad){
  if(!ad)return null;

  if(ad.mediaId){
    return {
      online:true,
      url:
        CAP_PLAYLIST_SERVER_V51 +
        '/api/media/' +
        encodeURIComponent(
          ad.mediaId
        )
    };
  }

  if(ad.url){
    return {
      online:true,
      url:
        /^https?:\/\//i.test(ad.url)
          ? ad.url
          : CAP_PLAYLIST_SERVER_V51 +
            (
              String(ad.url)
                .startsWith('/')
                ? ad.url
                : '/' + ad.url
            )
    };
  }

  if(
    ad.audioKey &&
    typeof capGetAdBlob ===
      'function'
  ){
    try{
      const blob =
        await capGetAdBlob(
          ad.audioKey
        );

      if(blob){
        return {
          online:false,
          blob
        };
      }
    }catch{}
  }

  if(
    ad.audioKey &&
    typeof capGetAdBlobV19 ===
      'function'
  ){
    try{
      const blob =
        await capGetAdBlobV19(
          ad.audioKey
        );

      if(blob){
        return {
          online:false,
          blob
        };
      }
    }catch{}
  }

  return null;
}

async function capPlayOneAdV51(ad){
  const source =
    await capGetAdBlobV51(ad);

  if(!source){
    return false;
  }

  let url = '';
  let revoke = false;

  if(source.online){
    url = source.url;
  }else{
    url =
      URL.createObjectURL(
        source.blob
      );

    revoke = true;
  }

  const audio =
    new Audio(url);

  audio.volume = 1;

  try{
    await audio.play();

    await new Promise(resolve=>{
      audio.onended = resolve;
      audio.onerror = resolve;
    });

    return true;

  }catch{
    return false;

  }finally{
    if(revoke){
      try{
        URL.revokeObjectURL(url);
      }catch{}
    }
  }
}

async function capPlayAdsBlockV51(){
  const active =
    capActiveAdsV51();

  if(!active.length){
    return false;
  }

  const amount =
    Math.min(
      capAdsPerBlockV51(),
      active.length
    );

  window.capAdCursorV51 =
    Number(
      window.capAdCursorV51 || 0
    );

  const selected = [];

  for(let i=0;i<amount;i++){
    if(
      window.capAdCursorV51 >=
      active.length
    ){
      window.capAdCursorV51 = 0;
    }

    selected.push(
      active[
        window.capAdCursorV51
      ]
    );

    window.capAdCursorV51++;
  }

  await capPlayOnlineJingleV51(
    'entry'
  );

  for(const ad of selected){
    await capPlayOneAdV51(ad);
  }

  await capPlayOnlineJingleV51(
    'exit'
  );

  return true;
}

/* =========================================================
   TOP DO DIA
========================================================= */

function capTopAdsV51(){
  return capActiveAdsV51()
    .filter(ad=>!!ad.top);
}

async function capPlayTopV51(){
  const topAds =
    capTopAdsV51();

  if(!topAds.length){
    return false;
  }

  const day =
    new Date()
      .toISOString()
      .slice(0,10);

  const key =
    'cap_top_played_v51_' +
    capPlaylistClientCodeV51();

  if(
    localStorage.getItem(key) ===
    day
  ){
    return false;
  }

  const ad = topAds[0];

  await capPlayOnlineJingleV51(
    'top-entry'
  );

  await capPlayOneAdV51(ad);

  await capPlayOnlineJingleV51(
    'top-exit'
  );

  localStorage.setItem(
    key,
    day
  );

  return true;
}

/* =========================================================
   MOTOR DA RÁDIO ONLINE
========================================================= */

let capRadioLoopRunningV51 = false;

function capRadioIsOnV51(){
  try{
    if(
      typeof radioOn !==
      'undefined'
    ){
      return !!radioOn;
    }
  }catch{}

  return !!window.capRadioOnV51;
}

async function capRadioLoopV51(){
  if(capRadioLoopRunningV51){
    return;
  }

  capRadioLoopRunningV51 = true;

  try{
    while(capRadioIsOnV51()){

      const musics =
        capPlaylistMusicsV51();

      /*
        COM PLAYLIST:
        música inteira
        TOP se houver
        vinheta entrada
        anúncios
        vinheta saída
        próxima música
      */

      if(musics.length){

        await capPlayNextOnlineMusicV51();

        if(!capRadioIsOnV51()){
          break;
        }

        await capPlayTopV51();

        if(!capRadioIsOnV51()){
          break;
        }

        await capPlayAdsBlockV51();

        continue;
      }

      /*
        SEM PLAYLIST:
        a rádio não fica muda.
        Se houver anúncio, toca bloco.
      */

      const adsAvailable =
        capActiveAdsV51();

      if(adsAvailable.length){

        await capPlayTopV51();

        if(!capRadioIsOnV51()){
          break;
        }

        await capPlayAdsBlockV51();

        if(!capRadioIsOnV51()){
          break;
        }

        await new Promise(
          resolve=>
            setTimeout(
              resolve,
              1500
            )
        );

        continue;
      }

      /*
        Sem música e sem anúncio:
        aguarda sem travar.
      */

      await new Promise(
        resolve=>
          setTimeout(
            resolve,
            3000
          )
      );
    }

  }catch(error){
    console.error(
      'Erro no motor online da rádio:',
      error
    );

  }finally{
    capRadioLoopRunningV51 = false;
  }
}

/* =========================================================
   LIGAR / DESLIGAR
========================================================= */

function capStartOnlineRadioV51(){
  window.capRadioOnV51 = true;

  try{
    radioOn = true;
  }catch{}

  capRadioLoopV51();
}

function capStopOnlineRadioV51(){
  window.capRadioOnV51 = false;

  try{
    radioOn = false;
  }catch{}

  try{
    if(radioAudio){
      radioAudio.pause();
    }
  }catch{}
}

/* =========================================================
   CONECTAR AOS BOTÕES EXISTENTES DO PLAYER
========================================================= */

function capBindRadioButtonsV51(){
  const buttons =
    [...document.querySelectorAll(
      'button'
    )];

  buttons.forEach(button=>{

    if(button.dataset.capV51){
      return;
    }

    const text =
      String(
        button.textContent || ''
      )
      .trim()
      .toLowerCase();

    const looksLikeStart =
      text === 'ligar rádio' ||
      text === 'ligar radio' ||
      text === '▶ ligar rádio' ||
      text === '▶ ligar radio' ||
      text === 'iniciar rádio' ||
      text === 'iniciar radio';

    const looksLikeStop =
      text === 'desligar rádio' ||
      text === 'desligar radio' ||
      text === '⏹ desligar rádio' ||
      text === '⏹ desligar radio' ||
      text === 'parar rádio' ||
      text === 'parar radio';

    if(looksLikeStart){
      button.dataset.capV51 = 'start';

      button.addEventListener(
        'click',
        ()=>{
          setTimeout(
            capStartOnlineRadioV51,
            80
          );
        }
      );
    }

    if(looksLikeStop){
      button.dataset.capV51 = 'stop';

      button.addEventListener(
        'click',
        ()=>{
          capStopOnlineRadioV51();
        }
      );
    }
  });
}

/* =========================================================
   SINCRONIZAR COM LOGIN DO CLIENTE
========================================================= */

async function capInitClientPlaylistV51(){
  if(
    !capPlaylistClientCodeV51()
  ){
    return;
  }

  await capLoadOnlinePlaylistsV51();

  await capLoadPlaylistFromClientStateV51();

  capCurrentPlaylistV51 =
    capGetSavedPlaylistV51();

  capRenderPlaylistSelectorV51();
}

/*
  O applyAdmStore já é chamado quando o código do cliente
  é validado no Player V50.
*/

if(
  typeof applyAdmStore ===
  'function'
){
  const capOldApplyAdmStoreV51 =
    applyAdmStore;

  applyAdmStore = function(c){

    const result =
      capOldApplyAdmStoreV51(c);

    setTimeout(
      ()=>{
        capInitClientPlaylistV51()
          .catch(console.error);
      },
      150
    );

    return result;
  };
}

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  ()=>{
    capEnsurePlaylistUIV51();

    capBindRadioButtonsV51();

    const observer =
      new MutationObserver(
        ()=>{
          capBindRadioButtonsV51();

          if(
            !document.getElementById(
              'capPlaylistBoxV51'
            )
          ){
            capEnsurePlaylistUIV51();
          }
        }
      );

    observer.observe(
      document.body,
      {
        childList:true,
        subtree:true
      }
    );

    if(
      capPlaylistClientCodeV51()
    ){
      setTimeout(
        ()=>{
          capInitClientPlaylistV51()
            .catch(console.error);
        },
        300
      );
    }
  }
);

/* =========================================================
   ATUALIZAÇÃO PERIÓDICA DO ACERVO
========================================================= */

setInterval(
  ()=>{
    if(
      capPlaylistClientCodeV51()
    ){
      capLoadOnlinePlaylistsV51()
        .catch(()=>{});
    }
  },
  60000
);

/* =========================================================
   FUNÇÕES GLOBAIS
========================================================= */

window.capLoadOnlinePlaylistsV51 =
  capLoadOnlinePlaylistsV51;

window.capSelectPlaylistV51 =
  capSelectPlaylistV51;

window.capStartOnlineRadioV51 =
  capStartOnlineRadioV51;

window.capStopOnlineRadioV51 =
  capStopOnlineRadioV51;

window.capRadioLoopV51 =
  capRadioLoopV51;
