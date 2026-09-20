/* CAPIVARA RÁDIO PLAYER — V53
   COLE ESTE BLOCO NO FINAL DO app.js ATUAL
   PLAYER SOMENTE — PLAYLISTS ONLINE
*/

(function () {
  const SERVER = 'https://capivara-radio-server.onrender.com';

  let capPlaylistsV53 = [];
  let capMediaV53 = [];
  let capSelectedPlaylistV53 = '';
  let capPendingPlaylistV53 = '';
  let capPlaylistIndexV53 = 0;
  let capLoadingV53 = false;

  function capCodeV53() {
    return String(
      (typeof store !== 'undefined' && store && store.code) || ''
    ).trim();
  }

  function capPlaylistKeyV53() {
    return 'capivara_playlist_' + capCodeV53();
  }

  function capEscapeV53(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function capNormalizeV53(data, field) {
    const value =
      data?.[field] ??
      data?.data ??
      data ??
      [];

    if (Array.isArray(value)) {
      return value;
    }

    if (value && typeof value === 'object') {
      return Object.entries(value).map(([id, item]) => ({
        id,
        ...(item || {})
      }));
    }

    return [];
  }

  async function capGetJsonV53(path) {
    const response = await fetch(SERVER + path, {
      headers: {
        Accept: 'application/json'
      }
    });

    let json = {};

    try {
      json = await response.json();
    } catch (_) {}

    if (!response.ok) {
      throw new Error(
        json?.error ||
        json?.message ||
        ('HTTP ' + response.status)
      );
    }

    return json;
  }

  function capCurrentPlaylistV53() {
    return (
      capPlaylistsV53.find(
        playlist =>
          String(playlist.id) ===
          String(capSelectedPlaylistV53)
      ) || null
    );
  }

  function capPlaylistMusicIdsV53(playlist) {
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

    if (Array.isArray(playlist.musics)) {
      return playlist.musics;
    }

    return [];
  }

  function capPlaylistSongsV53() {
    const playlist = capCurrentPlaylistV53();

    if (!playlist) return [];

    const ids = capPlaylistMusicIdsV53(playlist);

    const mediaMap = new Map(
      capMediaV53.map(item => [
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
            item.media_id ||
            item.musicId ||
            item.music_id;

          return (
            mediaMap.get(String(id)) ||
            item
          );
        }

        return mediaMap.get(String(item));
      })
      .filter(Boolean);
  }

  function capMediaUrlV53(media) {
    if (!media) return '';

    if (
      media.url &&
      /^https?:\/\//i.test(media.url)
    ) {
      return media.url;
    }

    if (media.url) {
      return (
        SERVER +
        (String(media.url).startsWith('/')
          ? ''
          : '/') +
        media.url
      );
    }

    if (media.id) {
      return (
        SERVER +
        '/api/media/' +
        encodeURIComponent(media.id)
      );
    }

    return '';
  }

  function capRenameThemeTitleV53() {
    const box =
      document.getElementById(
        'themeButtonsV11'
      );

    if (!box) return;

    const parent = box.parentElement;

    if (!parent) return;

    const elements =
      parent.querySelectorAll(
        'h1,h2,h3,h4,h5,strong,b,div,span'
      );

    for (const element of elements) {
      const text =
        String(
          element.textContent || ''
        ).trim();

      if (
        /^escolha o tema da rádio$/i.test(
          text
        ) ||
        /^escolha o tema da radio$/i.test(
          text
        )
      ) {
        element.textContent =
          'ESCOLHA A PLAYLIST DA RÁDIO';

        break;
      }
    }
  }

  function capRenderPlaylistsV53() {
    capRenameThemeTitleV53();

    const box =
      document.getElementById(
        'themeButtonsV11'
      );

    const status =
      document.getElementById(
        'themeStateV11'
      );

    if (!box) return;

    if (!capPlaylistsV53.length) {
      box.innerHTML = `
        <div style="
          width:100%;
          padding:16px;
          text-align:center;
          font-weight:800;
        ">
          Nenhuma playlist disponível.
        </div>
      `;

      if (status) {
        status.textContent =
          'O ADM precisa criar uma playlist com músicas.';
      }

      return;
    }

    box.innerHTML =
      capPlaylistsV53
        .map(playlist => {
          const active =
            String(playlist.id) ===
            String(
              capSelectedPlaylistV53
            );

          const pending =
            String(playlist.id) ===
            String(
              capPendingPlaylistV53
            );

          return `
            <button
              type="button"
              data-cap-playlist-v53="${capEscapeV53(
                playlist.id
              )}"
              class="${
                active ? 'active' : ''
              } ${
                pending
                  ? 'pending'
                  : ''
              }"
            >
              ${capEscapeV53(
                playlist.name ||
                playlist.title ||
                'Playlist'
              )}
            </button>
          `;
        })
        .join('');

    box
      .querySelectorAll(
        '[data-cap-playlist-v53]'
      )
      .forEach(button => {
        button.onclick = () => {
          capChoosePlaylistV53(
            button.getAttribute(
              'data-cap-playlist-v53'
            )
          );
        };
      });

    if (status) {
      if (capPendingPlaylistV53) {
        const pending =
          capPlaylistsV53.find(
            playlist =>
              String(playlist.id) ===
              String(
                capPendingPlaylistV53
              )
          );

        status.textContent =
          '⏳ ' +
          (
            pending?.name ||
            'Nova playlist'
          ) +
          ' entra após a música atual.';
      } else {
        status.textContent =
          '🟢 Playlist ativa: ' +
          (
            capCurrentPlaylistV53()
              ?.name ||
            'nenhuma'
          );
      }
    }

    const info =
      document.getElementById(
        'admSyncInfo'
      );

    if (info) {
      const amount =
        capPlaylistSongsV53().length;

      const ramo =
        (
          typeof store !==
            'undefined' &&
          store
        )
          ? (
              store.ramo ||
              store.type ||
              ''
            )
          : '';

      info.innerHTML =
        '✅ ' +
        capEscapeV53(ramo) +
        ' • <b>' +
        capEscapeV53(
          capCurrentPlaylistV53()
            ?.name ||
          'Sem playlist'
        ) +
        '</b> • ' +
        amount +
        ' música' +
        (amount === 1 ? '' : 's') +
        ' online';
    }
  }

  async function capSavePlaylistV53(
    playlistId
  ) {
    capSelectedPlaylistV53 =
      String(playlistId || '');

    capPlaylistIndexV53 = 0;

    if (capSelectedPlaylistV53) {
      localStorage.setItem(
        capPlaylistKeyV53(),
        capSelectedPlaylistV53
      );
    }

    capRenderPlaylistsV53();

    const code = capCodeV53();

    if (!code) return;

    try {
      let state = {};

      try {
        const json =
          await capGetJsonV53(
            '/api/client/' +
            encodeURIComponent(code) +
            '/state'
          );

        state =
          json?.state ||
          json?.data ||
          json ||
          {};
      } catch (_) {}

      await fetch(
        SERVER +
          '/api/client/' +
          encodeURIComponent(code) +
          '/state',
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            ...state,

            selectedPlaylistId:
              capSelectedPlaylistV53,

            selectedPlaylist:
              capSelectedPlaylistV53,

            updatedAt:
              new Date().toISOString()
          })
        }
      );
    } catch (error) {
      console.warn(
        'Playlist salva localmente.',
        error
      );
    }
  }

  function capChoosePlaylistV53(
    playlistId
  ) {
    playlistId =
      String(playlistId || '');

    if (!playlistId) return;

    const radioIsPlaying =
      typeof playing !==
        'undefined' &&
      playing &&
      typeof radioAudio !==
        'undefined' &&
      radioAudio &&
      !radioAudio.paused;

    if (radioIsPlaying) {
      capPendingPlaylistV53 =
        playlistId;

      capRenderPlaylistsV53();

      return;
    }

    capPendingPlaylistV53 = '';

    capSavePlaylistV53(
      playlistId
    );
  }

  async function capLoadPlaylistsV53() {
    if (capLoadingV53) return;

    capLoadingV53 = true;

    try {
      const results =
        await Promise.all([
          capGetJsonV53(
            '/api/playlists'
          ),

          capGetJsonV53(
            '/api/media'
          )
        ]);

      const playlistJson =
        results[0];

      const mediaJson =
        results[1];

      capPlaylistsV53 =
        capNormalizeV53(
          playlistJson,
          'playlists'
        ).filter(
          playlist =>
            playlist &&
            playlist.active !== false
        );

      capMediaV53 =
        capNormalizeV53(
          mediaJson,
          'media'
        ).filter(media => {
          if (!media) return false;

          const kind =
            String(
              media.kind ||
              media.type ||
              'music'
            ).toLowerCase();

          return (
            kind === 'music' ||
            kind === 'musica' ||
            kind === 'música'
          );
        });

      let wanted =
        localStorage.getItem(
          capPlaylistKeyV53()
        ) || '';

      const code =
        capCodeV53();

      if (code) {
        try {
          const json =
            await capGetJsonV53(
              '/api/client/' +
              encodeURIComponent(
                code
              ) +
              '/state'
            );

          const state =
            json?.state ||
            json?.data ||
            json ||
            {};

          wanted =
            String(
              state.selectedPlaylistId ||
              state.selectedPlaylist ||
              wanted ||
              ''
            );
        } catch (_) {}
      }

      const exists =
        capPlaylistsV53.some(
          playlist =>
            String(playlist.id) ===
            String(wanted)
        );

      if (!exists) {
        const firstWithMusic =
          capPlaylistsV53.find(
            playlist =>
              capPlaylistMusicIdsV53(
                playlist
              ).length > 0
          );

        const first =
          firstWithMusic ||
          capPlaylistsV53[0];

        wanted =
          first
            ? String(first.id)
            : '';
      }

      capSelectedPlaylistV53 =
        wanted;

      if (wanted) {
        localStorage.setItem(
          capPlaylistKeyV53(),
          wanted
        );
      }

      capRenderPlaylistsV53();
    } catch (error) {
      console.error(
        'Erro playlists online:',
        error
      );

      const status =
        document.getElementById(
          'themeStateV11'
        );

      if (status) {
        status.textContent =
          'Não foi possível carregar as playlists online.';
      }
    } finally {
      capLoadingV53 = false;
    }
  }

  async function capApplyPendingV53() {
    if (!capPendingPlaylistV53) {
      return;
    }

    const next =
      capPendingPlaylistV53;

    capPendingPlaylistV53 = '';

    await capSavePlaylistV53(
      next
    );
  }

  async function capPlayNextOnlineV53() {
    if (
      typeof playing ===
        'undefined' ||
      !playing
    ) {
      return;
    }

    await capApplyPendingV53();

    let list =
      capPlaylistSongsV53();

    if (!list.length) {
      await capLoadPlaylistsV53();

      list =
        capPlaylistSongsV53();
    }

    if (!list.length) {
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
          capPlaylistsV53.length
            ? 'Playlist sem músicas'
            : 'Nenhuma playlist disponível';
      }

      if (sub) {
        sub.textContent =
          capPlaylistsV53.length
            ? 'Escolha uma playlist com músicas.'
            : 'Crie uma playlist no ADM.';
      }

      playing = false;

      if (
        typeof syncPlayUi ===
        'function'
      ) {
        syncPlayUi();
      }

      return;
    }

    if (
      capPlaylistIndexV53 >=
      list.length
    ) {
      capPlaylistIndexV53 = 0;
    }

    const media =
      list[
        capPlaylistIndexV53++
      ];

    const url =
      capMediaUrlV53(media);

    if (!url) {
      setTimeout(
        capPlayNextOnlineV53,
        700
      );

      return;
    }

    if (
      typeof radioAudio !==
        'undefined' &&
      radioAudio
    ) {
      try {
        radioAudio.pause();
      } catch (_) {}

      radioAudio.onended = null;
      radioAudio.onerror = null;
    }

    radioAudio =
      new Audio(url);

    const musicVolume =
      document.getElementById(
        'musicVol'
      );

    const volume =
      Number(
        musicVolume?.value || 75
      );

    radioAudio.volume =
      Math.max(
        0,
        Math.min(
          1,
          volume / 100
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

    if (title) {
      title.textContent =
        media.name ||
        media.title ||
        'Música';
    }

    if (sub) {
      sub.textContent =
        '🎵 ' +
        (
          capCurrentPlaylistV53()
            ?.name ||
          'Playlist'
        ) +
        (
          typeof store !==
            'undefined' &&
          store?.name
            ? ' • ' + store.name
            : ''
        );
    }

    radioAudio.onended =
      async function () {
        if (!playing) return;

        await capApplyPendingV53();

        if (
          typeof capRadioAfterMusicV16 ===
          'function'
        ) {
          capRadioAfterMusicV16();
        } else {
          capPlayNextOnlineV53();
        }
      };

    radioAudio.onerror =
      function () {
        if (!playing) return;

        setTimeout(
          capPlayNextOnlineV53,
          800
        );
      };

    try {
      await radioAudio.play();
    } catch (error) {
      console.error(
        'Erro ao tocar música:',
        error
      );

      playing = false;

      if (
        typeof syncPlayUi ===
        'function'
      ) {
        syncPlayUi();
      }

      alert(
        'Clique novamente em INICIAR RÁDIO.'
      );
    }
  }

  window.capLoadOnlinePlaylistsV53 =
    capLoadPlaylistsV53;

  window.capChoosePlaylistV53 =
    capChoosePlaylistV53;

  window.capPlayNextOnlineV53 =
    capPlayNextOnlineV53;

  window.chooseThemeV11 =
    capChoosePlaylistV53;

  window.renderThemesV11 =
    capRenderPlaylistsV53;

  window.updateAdmStatus =
    capRenderPlaylistsV53;

  window.playNextAdmMusic =
    capPlayNextOnlineV53;

  try {
    chooseThemeV11 =
      capChoosePlaylistV53;

    renderThemesV11 =
      capRenderPlaylistsV53;

    updateAdmStatus =
      capRenderPlaylistsV53;

    playNextAdmMusic =
      capPlayNextOnlineV53;
  } catch (_) {}

  if (
    typeof applyAdmStore ===
    'function'
  ) {
    const oldApplyAdmStoreV53 =
      applyAdmStore;

    applyAdmStore =
      function (client) {
        const result =
          oldApplyAdmStoreV53(
            client
          );

        const clientCode =
          String(
            client?.code ||
            (
              typeof store !==
                'undefined'
                ? store?.code
                : ''
            ) ||
            ''
          );

        capSelectedPlaylistV53 =
          localStorage.getItem(
            'capivara_playlist_' +
            clientCode
          ) || '';

        capPendingPlaylistV53 =
          '';

        capPlaylistIndexV53 =
          0;

        setTimeout(
          capLoadPlaylistsV53,
          100
        );

        return result;
      };

    window.applyAdmStore =
      applyAdmStore;
  }

  function capBindPlayV53() {
    const button =
      document.getElementById(
        'play'
      );

    if (!button) return;

    if (
      button.dataset
        .capOnlinePlaylistV53 ===
      '1'
    ) {
      return;
    }

    button.dataset
      .capOnlinePlaylistV53 =
      '1';

    button.onclick =
      async function () {
        if (!playing) {
          if (
            !capPlaylistSongsV53()
              .length
          ) {
            await capLoadPlaylistsV53();
          }

          if (
            !capPlaylistSongsV53()
              .length
          ) {
            alert(
              capPlaylistsV53.length
                ? 'Escolha uma playlist com músicas.'
                : 'Nenhuma playlist disponível no ADM.'
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

          await capPlayNextOnlineV53();

          return;
        }

        playing = false;

        if (
          typeof radioAudio !==
            'undefined' &&
          radioAudio
        ) {
          try {
            radioAudio.pause();
          } catch (_) {}
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
      };
  }

  document.addEventListener(
    'DOMContentLoaded',
    function () {
      capBindPlayV53();

      capRenameThemeTitleV53();

      if (
        typeof capClientReady !==
          'undefined' &&
        capClientReady
      ) {
        setTimeout(
          capLoadPlaylistsV53,
          200
        );
      }
    }
  );

  window.addEventListener(
    'load',
    function () {
      capBindPlayV53();

      capRenameThemeTitleV53();
    }
  );

  setInterval(
    function () {
      capBindPlayV53();

      if (
        typeof capClientReady !==
          'undefined' &&
        capClientReady
      ) {
        capLoadPlaylistsV53();
      }
    },
    60000
  );
})();
