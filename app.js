/* =========================================================
   CAPIVARA RÁDIO PLAYER
   CORREÇÃO FINAL
   1. VINHETAS OBEDECEM O CHECKBOX
   2. REMOVE "15 PRODUTOS RÁPIDOS"
   3. PLAYLISTS DO ADM APARECEM NO PLAYER
   ========================================================= */

/* =========================
   PLAYLISTS ONLINE DO ADM
========================= */

const CAP_PLAY_SERVER =
  'https://capivara-radio-server.onrender.com';

let capPlaylists = [];
let capMedia = [];
let capPlaylistAtual = '';
let capPlaylistPendente = '';

function capPlaylistKey() {
  return 'cap_playlist_' + String(store?.code || '');
}

function capNormalizeOnlineList(data, field) {
  const list =
    data?.[field] ??
    data?.data ??
    data ??
    [];

  if (Array.isArray(list)) {
    return list;
  }

  if (list && typeof list === 'object') {
    return Object.entries(list).map(([id, value]) => ({
      id,
      ...(value || {})
    }));
  }

  return [];
}

async function capGetOnlineJson(path) {
  const response = await fetch(
    CAP_PLAY_SERVER + path,
    {
      headers: {
        Accept: 'application/json'
      }
    }
  );

  let json = {};

  try {
    json = await response.json();
  } catch {}

  if (!response.ok) {
    throw new Error(
      json?.error ||
      json?.message ||
      'HTTP ' + response.status
    );
  }

  return json;
}

function capPlaylistById(id) {
  return capPlaylists.find(
    playlist =>
      String(playlist.id) === String(id)
  ) || null;
}

function capPlaylistAtualObj() {
  return capPlaylistById(capPlaylistAtual);
}

function capPlaylistIds(playlist) {
  if (!playlist) return [];

  if (Array.isArray(playlist.musicIds)) {
    return playlist.musicIds;
  }

  if (Array.isArray(playlist.music_ids)) {
    return playlist.music_ids;
  }

  if (Array.isArray(playlist.tracks)) {
    return playlist.tracks;
  }

  if (Array.isArray(playlist.songs)) {
    return playlist.songs;
  }

  if (Array.isArray(playlist.items)) {
    return playlist.items;
  }

  return [];
}

function capMusicasPlaylist() {
  const playlist = capPlaylistAtualObj();

  if (!playlist) {
    return [];
  }

  const ids = capPlaylistIds(playlist);

  const map = new Map(
    capMedia.map(item => [
      String(item.id),
      item
    ])
  );

  return ids
    .map(item => {
      if (item && typeof item === 'object') {
        const id =
          item.id ||
          item.mediaId ||
          item.media_id;

        return (
          map.get(String(id)) ||
          item
        );
      }

      return map.get(String(item));
    })
    .filter(Boolean);
}

function capMediaUrl(item) {
  if (!item) return '';

  if (
    item.url &&
    /^https?:\/\//i.test(item.url)
  ) {
    return item.url;
  }

  if (item.url) {
    return (
      CAP_PLAY_SERVER +
      (String(item.url).startsWith('/') ? '' : '/') +
      item.url
    );
  }

  if (item.id) {
    return (
      CAP_PLAY_SERVER +
      '/api/media/' +
      encodeURIComponent(item.id)
    );
  }

  return '';
}

function capEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function capEncontrarAreaPlaylist() {
  let box =
    document.getElementById('themeButtonsV11');

  if (box) return box;

  const radioPage =
    document.getElementById('radio') ||
    document.querySelector('[data-page="radio"]') ||
    document.querySelector('.page.active');

  if (!radioPage) return null;

  box = document.createElement('div');

  box.id = 'themeButtonsV11';
  box.className = 'theme-buttons';

  radioPage.appendChild(box);

  return box;
}

function capTrocarTituloPlaylist() {
  const box = capEncontrarAreaPlaylist();

  if (!box) return;

  const parent = box.parentElement;

  if (!parent) return;

  parent
    .querySelectorAll(
      'h1,h2,h3,h4,h5,strong,b,label,div'
    )
    .forEach(element => {
      const text =
        String(element.textContent || '')
          .trim();

      if (
        /^escolha o tema da rádio$/i.test(text) ||
        /^tema da rádio$/i.test(text)
      ) {
        element.textContent =
          'ESCOLHA A PLAYLIST DA RÁDIO';
      }
    });
}

function capRenderPlaylists() {
  const box = capEncontrarAreaPlaylist();

  const status =
    document.getElementById('themeStateV11');

  if (!box) return;

  capTrocarTituloPlaylist();

  if (!capPlaylists.length) {
    box.innerHTML =
      '<div style="padding:14px;text-align:center;font-weight:700;width:100%;">Nenhuma playlist disponível.</div>';

    if (status) {
      status.textContent =
        'O ADM precisa criar uma playlist.';
    }

    return;
  }

  box.innerHTML = capPlaylists
    .map(playlist => {
      const active =
        String(playlist.id) ===
        String(capPlaylistAtual);

      const pending =
        String(playlist.id) ===
        String(capPlaylistPendente);

      return `
        <button
          type="button"
          data-cap-playlist="${capEscape(playlist.id)}"
          class="${active ? 'active' : ''} ${pending ? 'pending' : ''}"
        >
          ${capEscape(playlist.name || 'Playlist')}
        </button>
      `;
    })
    .join('');

  box
    .querySelectorAll('[data-cap-playlist]')
    .forEach(button => {
      button.onclick = () => {
        capEscolherPlaylist(
          button.getAttribute('data-cap-playlist')
        );
      };
    });

  if (status) {
    if (capPlaylistPendente) {
      const pending =
        capPlaylistById(capPlaylistPendente);

      status.textContent =
        '⏳ ' +
        (pending?.name || 'Nova playlist') +
        ' entra quando a música terminar.';
    } else {
      status.textContent =
        '🟢 Playlist ativa: ' +
        (capPlaylistAtualObj()?.name || 'nenhuma');
    }
  }
}

async function capSalvarPlaylist(id) {
  capPlaylistAtual = String(id || '');

  radioIndex = 0;

  if (capPlaylistAtual) {
    localStorage.setItem(
      capPlaylistKey(),
      capPlaylistAtual
    );
  }

  capRenderPlaylists();

  if (!store?.code) return;

  try {
    let state = {};

    try {
      const response = await capGetOnlineJson(
        '/api/client/' +
        encodeURIComponent(store.code) +
        '/state'
      );

      state =
        response?.state ||
        response?.data ||
        response ||
        {};
    } catch {}

    await fetch(
      CAP_PLAY_SERVER +
      '/api/client/' +
      encodeURIComponent(store.code) +
      '/state',
      {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          ...state,
          selectedPlaylistId: capPlaylistAtual,
          selectedPlaylist: capPlaylistAtual,
          updatedAt: new Date().toISOString()
        })
      }
    );
  } catch (error) {
    console.warn(
      'Playlist salva somente neste navegador.',
      error
    );
  }
}

async function capEscolherPlaylist(id) {
  id = String(id || '');

  if (!id) return;

  if (
    playing &&
    radioAudio &&
    !radioAudio.paused
  ) {
    capPlaylistPendente = id;

    capRenderPlaylists();

    return;
  }

  capPlaylistPendente = '';

  await capSalvarPlaylist(id);
}

async function capCarregarPlaylists() {
  try {
    const [
      playlistResponse,
      mediaResponse
    ] = await Promise.all([
      capGetOnlineJson('/api/playlists'),
      capGetOnlineJson('/api/media')
    ]);

    capPlaylists =
      capNormalizeOnlineList(
        playlistResponse,
        'playlists'
      )
        .filter(
          playlist =>
            playlist &&
            playlist.active !== false
        );

    capMedia =
      capNormalizeOnlineList(
        mediaResponse,
        'media'
      )
        .filter(item => {
          const kind =
            String(item?.kind || 'music')
              .toLowerCase();

          return kind === 'music';
        });

    let wanted =
      localStorage.getItem(
        capPlaylistKey()
      ) || '';

    if (store?.code) {
      try {
        const response =
          await capGetOnlineJson(
            '/api/client/' +
            encodeURIComponent(store.code) +
            '/state'
          );

        const state =
          response?.state ||
          response?.data ||
          response ||
          {};

        wanted =
          String(
            state.selectedPlaylistId ||
            state.selectedPlaylist ||
            wanted ||
            ''
          );
      } catch {}
    }

    if (
      !capPlaylists.some(
        playlist =>
          String(playlist.id) ===
          String(wanted)
      )
    ) {
      const firstWithMusic =
        capPlaylists.find(
          playlist =>
            capPlaylistIds(playlist).length
        );

      const first =
        firstWithMusic ||
        capPlaylists[0];

      wanted =
        first
          ? String(first.id)
          : '';
    }

    capPlaylistAtual = wanted;

    if (capPlaylistAtual) {
      localStorage.setItem(
        capPlaylistKey(),
        capPlaylistAtual
      );
    }

    capRenderPlaylists();

    capAtualizarStatusRadio();
  } catch (error) {
    console.error(
      'Erro ao carregar playlists:',
      error
    );

    const status =
      document.getElementById('themeStateV11');

    if (status) {
      status.textContent =
        'Não foi possível carregar as playlists.';
    }
  }
}

/* =========================
   TOCAR MÚSICAS ONLINE
========================= */

async function capTocarProximaMusica() {
  if (!playing) return;

  if (capPlaylistPendente) {
    capPlaylistAtual =
      capPlaylistPendente;

    capPlaylistPendente = '';

    radioIndex = 0;

    await capSalvarPlaylist(
      capPlaylistAtual
    );
  }

  const musicas =
    capMusicasPlaylist();

  if (!musicas.length) {
    const title =
      document.getElementById('nowTitle');

    const sub =
      document.getElementById('nowSub');

    if (title) {
      title.textContent =
        capPlaylists.length
          ? 'Playlist sem músicas'
          : 'Nenhuma playlist disponível';
    }

    if (sub) {
      sub.textContent =
        capPlaylists.length
          ? 'Escolha outra playlist.'
          : 'O ADM precisa criar uma playlist.';
    }

    playing = false;

    if (typeof syncPlayUi === 'function') {
      syncPlayUi();
    }

    return;
  }

  if (radioIndex >= musicas.length) {
    radioIndex = 0;
  }

  const musica =
    musicas[radioIndex++];

  const url =
    capMediaUrl(musica);

  if (!url) {
    setTimeout(
      capTocarProximaMusica,
      500
    );

    return;
  }

  if (radioAudio) {
    try {
      radioAudio.pause();
    } catch {}

    radioAudio.onended = null;
    radioAudio.onerror = null;
  }

  radioAudio = new Audio(url);

  const volume =
    Number(
      document.getElementById('musicVol')?.value ||
      75
    );

  radioAudio.volume =
    Math.max(
      0,
      Math.min(1, volume / 100)
    );

  const title =
    document.getElementById('nowTitle');

  const sub =
    document.getElementById('nowSub');

  if (title) {
    title.textContent =
      musica.name || 'Música';
  }

  if (sub) {
    sub.textContent =
      '🎵 ' +
      (
        capPlaylistAtualObj()?.name ||
        'Playlist'
      );
  }

  radioAudio.onended =
    async () => {
      if (!playing) return;

      if (capPlaylistPendente) {
        capPlaylistAtual =
          capPlaylistPendente;

        capPlaylistPendente = '';

        radioIndex = 0;

        await capSalvarPlaylist(
          capPlaylistAtual
        );
      }

      await capDepoisDaMusica();
    };

  radioAudio.onerror =
    () => {
      if (!playing) return;

      setTimeout(
        capTocarProximaMusica,
        700
      );
    };

  try {
    await radioAudio.play();
  } catch (error) {
    console.error(error);

    playing = false;

    if (typeof syncPlayUi === 'function') {
      syncPlayUi();
    }
  }
}

/* =========================
   VINHETAS
========================= */

function capVinhetasAtivas() {
  const checkbox =
    document.getElementById('jingles');

  if (!checkbox) {
    return true;
  }

  return checkbox.checked === true;
}

async function capBuscarVinhetas() {
  try {
    const response =
      await capGetOnlineJson('/api/jingles');

    const jingles =
      capNormalizeOnlineList(
        response,
        'jingles'
      );

    return jingles.filter(item => {
      if (!item) return false;

      const ramo =
        String(
          item.ramo ||
          item.segment ||
          item.activity ||
          ''
        );

      if (!ramo) return true;

      return (
        normRamo(ramo) ===
        normRamo(store?.ramo)
      );
    });
  } catch (error) {
    console.warn(
      'Vinhetas indisponíveis:',
      error
    );

    return [];
  }
}

function capTipoVinheta(item) {
  return String(
    item?.type ||
    item?.tipo ||
    item?.category ||
    item?.categoria ||
    ''
  )
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function capUrlVinheta(item) {
  if (!item) return '';

  if (
    item.url &&
    /^https?:\/\//i.test(item.url)
  ) {
    return item.url;
  }

  if (item.url) {
    return (
      CAP_PLAY_SERVER +
      (
        String(item.url).startsWith('/')
          ? ''
          : '/'
      ) +
      item.url
    );
  }

  const mediaId =
    item.mediaId ||
    item.media_id ||
    item.audioId ||
    item.audio_id ||
    item.id;

  if (!mediaId) return '';

  return (
    CAP_PLAY_SERVER +
    '/api/media/' +
    encodeURIComponent(mediaId)
  );
}

async function capTocarUrl(url) {
  if (!url || !playing) return;

  await new Promise(resolve => {
    const audio =
      new Audio(url);

    spokenAudio = audio;

    audio.volume = 1;

    audio.onended =
      () => resolve();

    audio.onerror =
      () => resolve();

    audio.play()
      .catch(() => resolve());
  });
}

async function capTocarVinheta(tipo) {
  if (!capVinhetasAtivas()) {
    return;
  }

  const jingles =
    await capBuscarVinhetas();

  if (!jingles.length) {
    return;
  }

  const wanted =
    String(tipo)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  let candidates =
    jingles.filter(item => {
      const type =
        capTipoVinheta(item);

      if (wanted === 'entrada') {
        return (
          type === 'entrada' ||
          type === 'opening' ||
          type === 'inicio' ||
          type === 'abertura'
        );
      }

      if (wanted === 'saida') {
        return (
          type === 'saida' ||
          type === 'closing' ||
          type === 'fim' ||
          type === 'fechamento'
        );
      }

      if (wanted === 'top entrada') {
        return (
          type.includes('top') &&
          (
            type.includes('entrada') ||
            type.includes('inicio') ||
            type.includes('abertura')
          )
        );
      }

      if (wanted === 'top saida') {
        return (
          type.includes('top') &&
          (
            type.includes('saida') ||
            type.includes('fim') ||
            type.includes('fechamento')
          )
        );
      }

      return false;
    });

  if (!candidates.length) {
    return;
  }

  const item =
    candidates[
      Math.floor(
        Math.random() *
        candidates.length
      )
    ];

  const url =
    capUrlVinheta(item);

  if (url) {
    await capTocarUrl(url);
  }
}

/* =========================
   BLOCO DE ANÚNCIOS
========================= */

function capAnunciosAtivos() {
  const now = Date.now();

  return (ads || []).filter(
    ad =>
      ad &&
      !ad.paused &&
      (
        !ad.exp ||
        ad.exp > now
      )
  );
}

function capQuantidadeBloco() {
  const field =
    document.getElementById(
      'adsPerBlock'
    );

  let value =
    Number(
      field?.value ||
      localStorage.getItem(
        'cap_ads_per_block_' +
        String(store?.code || '')
      ) ||
      3
    );

  if (
    !Number.isFinite(value) ||
    value < 1
  ) {
    value = 1;
  }

  return Math.min(50, value);
}

async function capTocarAnuncio(ad) {
  if (!ad || !playing) return;

  try {
    if (
      ad.url &&
      /^https?:\/\//i.test(ad.url)
    ) {
      await capTocarUrl(ad.url);

      return;
    }

    if (
      ad.mediaId ||
      ad.media_id
    ) {
      const mediaId =
        ad.mediaId ||
        ad.media_id;

      await capTocarUrl(
        CAP_PLAY_SERVER +
        '/api/media/' +
        encodeURIComponent(mediaId)
      );

      return;
    }

    if (
      ad.audioKey &&
      typeof capGetAdBlob === 'function'
    ) {
      const blob =
        await capGetAdBlob(ad.audioKey);

      if (!blob) return;

      const url =
        URL.createObjectURL(blob);

      await capTocarUrl(url);

      URL.revokeObjectURL(url);

      return;
    }

    if (
      ad.audioKey &&
      typeof getAdBlob === 'function'
    ) {
      const blob =
        await getAdBlob(ad.audioKey);

      if (!blob) return;

      const url =
        URL.createObjectURL(blob);

      await capTocarUrl(url);

      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.warn(
      'Erro ao tocar anúncio:',
      error
    );
  }
}

let capAdIndex = 0;

async function capTocarBloco() {
  if (!playing) return;

  const active =
    capAnunciosAtivos();

  if (!active.length) {
    return;
  }

  const qtd =
    Math.min(
      capQuantidadeBloco(),
      active.length
    );

  const bloco = [];

  for (
    let i = 0;
    i < qtd;
    i++
  ) {
    if (
      capAdIndex >=
      active.length
    ) {
      capAdIndex = 0;
    }

    bloco.push(
      active[capAdIndex++]
    );
  }

  const temTop =
    bloco.some(ad => ad.top);

  if (capVinhetasAtivas()) {
    if (temTop) {
      await capTocarVinheta(
        'top entrada'
      );
    } else {
      await capTocarVinheta(
        'entrada'
      );
    }
  }

  for (const ad of bloco) {
    if (!playing) break;

    await capTocarAnuncio(ad);
  }

  if (
    playing &&
    capVinhetasAtivas()
  ) {
    if (temTop) {
      await capTocarVinheta(
        'top saida'
      );
    } else {
      await capTocarVinheta(
        'saida'
      );
    }
  }
}

async function capDepoisDaMusica() {
  if (!playing) return;

  const active =
    capAnunciosAtivos();

  if (active.length) {
    await capTocarBloco();
  }

  if (playing) {
    await capTocarProximaMusica();
  }
}

/* =========================
   CHECKBOX VINHETAS
========================= */

function capBindVinhetas() {
  const checkbox =
    document.getElementById('jingles');

  if (!checkbox) return;

  const key =
    'cap_jingles_' +
    String(store?.code || 'default');

  const saved =
    localStorage.getItem(key);

  if (saved !== null) {
    checkbox.checked =
      saved === '1';
  }

  checkbox.onchange =
    () => {
      localStorage.setItem(
        key,
        checkbox.checked
          ? '1'
          : '0'
      );
    };
}

/* =========================
   REMOVE "15 PRODUTOS RÁPIDOS"
========================= */

function capRemoverTexto15Produtos() {
  const walker =
    document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

  const nodes = [];

  while (walker.nextNode()) {
    nodes.push(
      walker.currentNode
    );
  }

  nodes.forEach(node => {
    const text =
      String(node.nodeValue || '');

    if (
      /15\s+produtos\s+r[aá]pidos/i
        .test(text)
    ) {
      node.nodeValue =
        text.replace(
          /15\s+produtos\s+r[aá]pidos/ig,
          'Produtos rápidos'
        );
    }
  });
}

/* =========================
   STATUS
========================= */

function capAtualizarStatusRadio() {
  const info =
    document.getElementById(
      'admSyncInfo'
    );

  if (!info) return;

  const playlist =
    capPlaylistAtualObj();

  const qtd =
    capMusicasPlaylist().length;

  info.innerHTML =
    '✅ ' +
    capEscape(store?.ramo || '') +
    ' • <b>' +
    capEscape(
      playlist?.name ||
      'Sem playlist'
    ) +
    '</b> • ' +
    qtd +
    ' música' +
    (qtd === 1 ? '' : 's') +
    ' online';
}

/* =========================
   PLAY / PAUSE
========================= */

async function capPlayRadioFinal() {
  if (!capClientReady) return;

  if (playing) {
    playing = false;

    if (radioAudio) {
      try {
        radioAudio.pause();
      } catch {}
    }

    if (spokenAudio) {
      try {
        spokenAudio.pause();
      } catch {}
    }

    if (
      typeof syncPlayUi ===
      'function'
    ) {
      syncPlayUi();
    }

    const title =
      document.getElementById(
        'nowTitle'
      );

    const sub =
      document.getElementById(
        'nowSub'
      );

    if (title) {
      title.textContent =
        'Rádio pausada';
    }

    if (sub) {
      sub.textContent =
        'Escolha uma playlist e inicie quando quiser';
    }

    return;
  }

  if (!capPlaylists.length) {
    await capCarregarPlaylists();
  }

  if (!capPlaylistAtual) {
    alert(
      'Escolha uma playlist.'
    );

    return;
  }

  if (
    !capMusicasPlaylist().length
  ) {
    alert(
      'Esta playlist está sem músicas.'
    );

    return;
  }

  playing = true;

  if (
    typeof syncPlayUi ===
    'function'
  ) {
    syncPlayUi();
  }

  await capTocarProximaMusica();
}

/* =========================
   APLICAR AO CLIENTE
========================= */

const capApplyOriginalFinal =
  typeof applyAdmStore === 'function'
    ? applyAdmStore
    : null;

if (capApplyOriginalFinal) {
  applyAdmStore =
    async function(client) {
      const result =
        await capApplyOriginalFinal(
          client
        );

      capPlaylistAtual =
        localStorage.getItem(
          'cap_playlist_' +
          String(
            client?.code ||
            store?.code ||
            ''
          )
        ) || '';

      capPlaylistPendente = '';

      radioIndex = 0;

      capBindVinhetas();

      capRemoverTexto15Produtos();

      await capCarregarPlaylists();

      return result;
    };

  window.applyAdmStore =
    applyAdmStore;
}

/* =========================
   SUBSTITUI FUNÇÕES ANTIGAS
========================= */

window.chooseThemeV11 =
  capEscolherPlaylist;

window.renderThemesV11 =
  capRenderPlaylists;

window.updateAdmStatus =
  capAtualizarStatusRadio;

window.playNextAdmMusic =
  capTocarProximaMusica;

window.capRadioAfterMusicV16 =
  capDepoisDaMusica;

try {
  chooseThemeV11 =
    capEscolherPlaylist;
} catch {}

try {
  renderThemesV11 =
    capRenderPlaylists;
} catch {}

try {
  updateAdmStatus =
    capAtualizarStatusRadio;
} catch {}

try {
  playNextAdmMusic =
    capTocarProximaMusica;
} catch {}

try {
  capRadioAfterMusicV16 =
    capDepoisDaMusica;
} catch {}

/* =========================
   INICIALIZAÇÃO
========================= */

function capInicializarCorrecaoFinal() {
  capRemoverTexto15Produtos();

  capTrocarTituloPlaylist();

  capBindVinhetas();

  const play =
    document.getElementById('play');

  if (play) {
    play.onclick =
      capPlayRadioFinal;
  }

  const adsPerBlock =
    document.getElementById(
      'adsPerBlock'
    );

  if (adsPerBlock) {
    const key =
      'cap_ads_per_block_' +
      String(store?.code || '');

    const saved =
      localStorage.getItem(key);

    if (saved) {
      adsPerBlock.value = saved;
    }

    adsPerBlock.onchange =
      () => {
        let value =
          Number(
            adsPerBlock.value
          );

        if (
          !Number.isFinite(value) ||
          value < 1
        ) {
          value = 1;
        }

        adsPerBlock.value =
          value;

        localStorage.setItem(
          key,
          String(value)
        );

        if (
          typeof capPushClientStateV50 ===
          'function'
        ) {
          capPushClientStateV50();
        }
      };
  }

  if (
    typeof capClientReady !==
      'undefined' &&
    capClientReady
  ) {
    capCarregarPlaylists();
  }
}

document.addEventListener(
  'DOMContentLoaded',
  capInicializarCorrecaoFinal
);

window.addEventListener(
  'load',
  () => {
    capInicializarCorrecaoFinal();

    setTimeout(
      capRemoverTexto15Produtos,
      500
    );
  }
);

setInterval(
  () => {
    capRemoverTexto15Produtos();

    if (
      typeof capClientReady !==
        'undefined' &&
      capClientReady
    ) {
      capCarregarPlaylists();
    }
  },
  60000
);
