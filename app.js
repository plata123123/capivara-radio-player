/* =========================================================
   CAPIVARA RÁDIO — CORREÇÃO SOMENTE DAS VINHETAS
   COLE ESTE BLOCO NO FINAL DO app.js
========================================================= */

(function () {
  const CAP_SERVER_JINGLE =
    'https://capivara-radio-server.onrender.com';

  let capOnlineJingles = null;
  let capOnlineJinglesTime = 0;

  const capJingleTurn = {
    opening: 0,
    closing: 0,
    topOpening: 0,
    topClosing: 0
  };

  function capNormJingle(v) {
    return String(v || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  function capJinglesLigadas() {
    const check =
      document.getElementById('jingles');

    return !!(
      check &&
      check.checked === true
    );
  }

  function capJingleRamoAtual() {
    return capNormJingle(
      store?.ramo ||
      store?.type ||
      ''
    );
  }

  function capTransformaLista(data) {
    if (!data) return [];

    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data.jingles)) {
      return data.jingles;
    }

    if (Array.isArray(data.data)) {
      return data.data;
    }

    const raiz =
      data.jingles ||
      data.data ||
      data;

    const saida = [];

    function andar(valor, contexto = {}) {
      if (!valor) return;

      if (Array.isArray(valor)) {
        valor.forEach(item => {
          if (
            item &&
            typeof item === 'object'
          ) {
            saida.push({
              ...contexto,
              ...item
            });
          }
        });

        return;
      }

      if (
        typeof valor !== 'object'
      ) {
        return;
      }

      const pareceVinheta =
        valor.audioUrl ||
        valor.audio_url ||
        valor.url ||
        valor.src ||
        valor.mediaId ||
        valor.media_id ||
        valor.audioId ||
        valor.audio_id ||
        valor.audioKey;

      if (pareceVinheta) {
        saida.push({
          ...contexto,
          ...valor
        });

        return;
      }

      Object.entries(valor)
        .forEach(([chave, filho]) => {
          const n =
            capNormJingle(chave);

          const novo = {
            ...contexto
          };

          if (
            n === 'offeropen' ||
            n === 'entrada' ||
            n === 'opening' ||
            n === 'abertura'
          ) {
            novo.category =
              'offerOpen';
          } else if (
            n === 'offerclose' ||
            n === 'saida' ||
            n === 'closing' ||
            n === 'fechamento'
          ) {
            novo.category =
              'offerClose';
          } else if (
            n === 'topopen' ||
            n === 'top entrada' ||
            n === 'topentrada'
          ) {
            novo.category =
              'topOpen';
          } else if (
            n === 'topclose' ||
            n === 'top saida' ||
            n === 'topsaida'
          ) {
            novo.category =
              'topClose';
          } else if (
            !novo.ramo &&
            typeof filho === 'object'
          ) {
            novo.ramo = chave;
          }

          andar(filho, novo);
        });
    }

    andar(raiz);

    return saida;
  }

  async function capCarregarVinhetasOnline(
    force = false
  ) {
    if (
      !force &&
      capOnlineJingles &&
      Date.now() -
        capOnlineJinglesTime <
        30000
    ) {
      return capOnlineJingles;
    }

    try {
      const response =
        await fetch(
          CAP_SERVER_JINGLE +
          '/api/jingles',
          {
            cache: 'no-store',
            headers: {
              Accept:
                'application/json'
            }
          }
        );

      if (!response.ok) {
        throw new Error(
          'HTTP ' +
          response.status
        );
      }

      const json =
        await response.json();

      capOnlineJingles =
        capTransformaLista(json);

      capOnlineJinglesTime =
        Date.now();

      return capOnlineJingles;
    } catch (e) {
      console.warn(
        'Vinhetas online indisponíveis:',
        e
      );

      return [];
    }
  }

  function capCategoriaVinheta(v) {
    return capNormJingle(
      v?.category ||
      v?.categoria ||
      v?.type ||
      v?.tipo ||
      v?.slot ||
      v?.kind ||
      v?.grupo ||
      v?.group ||
      ''
    );
  }

  function capVinhetaDoRamo(v) {
    const ramo =
      capNormJingle(
        v?.ramo ||
        v?.segment ||
        v?.activity ||
        v?.businessType ||
        v?.business_type ||
        ''
      );

    if (!ramo) {
      return true;
    }

    return (
      ramo ===
      capJingleRamoAtual()
    );
  }

  function capEhCategoria(
    v,
    categoria
  ) {
    const c =
      capCategoriaVinheta(v);

    if (
      categoria === 'opening'
    ) {
      return (
        !c.includes('top') &&
        (
          c.includes('offeropen') ||
          c.includes('entrada') ||
          c.includes('opening') ||
          c.includes('abertura') ||
          c.includes('inicio')
        )
      );
    }

    if (
      categoria === 'closing'
    ) {
      return (
        !c.includes('top') &&
        (
          c.includes('offerclose') ||
          c.includes('saida') ||
          c.includes('closing') ||
          c.includes('fechamento') ||
          c.includes('fim')
        )
      );
    }

    if (
      categoria ===
      'topOpening'
    ) {
      return (
        (
          c.includes('topopen') ||
          (
            c.includes('top') &&
            (
              c.includes('entrada') ||
              c.includes('opening') ||
              c.includes('abertura') ||
              c.includes('inicio')
            )
          )
        )
      );
    }

    if (
      categoria ===
      'topClosing'
    ) {
      return (
        (
          c.includes('topclose') ||
          (
            c.includes('top') &&
            (
              c.includes('saida') ||
              c.includes('closing') ||
              c.includes('fechamento') ||
              c.includes('fim')
            )
          )
        )
      );
    }

    return false;
  }

  function capUrlVinheta(v) {
    if (!v) return '';

    const direto =
      v.audioUrl ||
      v.audio_url ||
      v.url ||
      v.src;

    if (
      direto &&
      /^https?:\/\//i.test(
        direto
      )
    ) {
      return direto;
    }

    if (direto) {
      return (
        CAP_SERVER_JINGLE +
        (
          String(direto)
            .startsWith('/')
            ? ''
            : '/'
        ) +
        direto
      );
    }

    const id =
      v.mediaId ||
      v.media_id ||
      v.audioId ||
      v.audio_id ||
      v.fileId ||
      v.file_id;

    if (id) {
      return (
        CAP_SERVER_JINGLE +
        '/api/media/' +
        encodeURIComponent(id)
      );
    }

    return '';
  }

  async function capTocarVinhetaUrl(
    url
  ) {
    if (!url) {
      return false;
    }

    return await new Promise(
      resolve => {
        const audio =
          new Audio(url);

        window.capCurrentSpokenAudio =
          audio;

        audio.volume = 1;

        let terminou = false;

        function fim(ok) {
          if (terminou) return;

          terminou = true;

          audio.onended = null;
          audio.onerror = null;

          resolve(ok);
        }

        audio.onended =
          () => fim(true);

        audio.onerror =
          () => fim(false);

        audio.play()
          .catch(() => {
            fim(false);
          });
      }
    );
  }

  async function capVinhetaLocalAntiga(
    kind
  ) {
    try {
      const all =
        JSON.parse(
          localStorage.getItem(
            'capivara_vignettes_v8'
          ) || '{}'
        );

      const ramo =
        all[store.ramo] ||
        all[store.type] ||
        {};

      const cat =
        kind === 'opening'
          ? 'offerOpen'
          : 'offerClose';

      const arr =
        Array.isArray(
          ramo[cat]
        )
          ? ramo[cat]
          : [];

      const prontas =
        arr.filter(
          v =>
            v &&
            (
              v.audioKey ||
              v.audioUrl ||
              v.url ||
              v.src
            )
        );

      if (prontas.length) {
        const chave =
          kind === 'opening'
            ? 'open'
            : 'close';

        if (
          typeof capJingleCursorV36 ===
          'undefined'
        ) {
          window.capJingleCursorV36 =
            {
              open: 0,
              close: 0
            };
        }

        const pos =
          capJingleCursorV36[
            chave
          ] %
          prontas.length;

        capJingleCursorV36[
          chave
        ]++;

        const v =
          prontas[pos];

        const url =
          v.audioUrl ||
          v.url ||
          v.src;

        if (url) {
          return await capTocarVinhetaUrl(
            url
          );
        }

        if (
          v.audioKey &&
          typeof capGetDbBlobV36 ===
            'function'
        ) {
          const blob =
            await capGetDbBlobV36(
              'CapivaraRadioAudio',
              1,
              'audios',
              v.audioKey
            );

          if (blob) {
            const temp =
              URL.createObjectURL(
                blob
              );

            const ok =
              await capTocarVinhetaUrl(
                temp
              );

            URL.revokeObjectURL(
              temp
            );

            return ok;
          }
        }
      }

      const legacy =
        JSON.parse(
          localStorage.getItem(
            'capivara_radio_jingles'
          ) || '{}'
        );

      const j =
        legacy[kind];

      if (
        j &&
        !j.paused &&
        j.active !== false
      ) {
        return await capTocarVinhetaUrl(
          j.audioUrl ||
          j.url ||
          j.src
        );
      }
    } catch (e) {
      console.warn(
        'Vinheta local:',
        e
      );
    }

    return false;
  }

  async function capTocarVinhetaOnline(
    categoria
  ) {
    if (!capJinglesLigadas()) {
      return false;
    }

    const todas =
      await capCarregarVinhetasOnline();

    const prontas =
      todas.filter(v => {
        if (!v) return false;

        if (
          v.active === false ||
          v.ativo === false ||
          v.paused === true ||
          v.pausado === true
        ) {
          return false;
        }

        return (
          capVinhetaDoRamo(v) &&
          capEhCategoria(
            v,
            categoria
          )
        );
      });

    if (!prontas.length) {
      return false;
    }

    const pos =
      capJingleTurn[
        categoria
      ] %
      prontas.length;

    capJingleTurn[
      categoria
    ]++;

    const vinheta =
      prontas[pos];

    const url =
      capUrlVinheta(
        vinheta
      );

    if (!url) {
      return false;
    }

    return await capTocarVinhetaUrl(
      url
    );
  }

  async function capVinhetaFinal(
    kind,
    top = false
  ) {
    if (!capJinglesLigadas()) {
      return false;
    }

    const categoria =
      top
        ? (
          kind === 'opening'
            ? 'topOpening'
            : 'topClosing'
        )
        : (
          kind === 'opening'
            ? 'opening'
            : 'closing'
        );

    const online =
      await capTocarVinhetaOnline(
        categoria
      );

    if (online) {
      return true;
    }

    return await capVinhetaLocalAntiga(
      kind
    );
  }

  capOptionalJingleV16 =
    async function (kind) {
      return await capVinhetaFinal(
        kind,
        false
      );
    };

  window.capOptionalJingleV16 =
    capOptionalJingleV16;

  const capRadioOriginalVinheta =
    capRadioAfterMusicV16;

  capRadioAfterMusicV16 =
    async function () {
      const active =
        capActiveAdsV16();

      if (!active.length) {
        playNextAdmMusic();
        return;
      }

      const qty =
        Math.min(
          capModeCountV16(),
          active.length
        );

      const block = [];

      for (
        let i = 0;
        i < qty;
        i++
      ) {
        block.push(
          active[
            (
              capAdCursorV16 +
              i
            ) %
            active.length
          ]
        );
      }

      capAdCursorV16 =
        (
          capAdCursorV16 +
          qty
        ) %
        active.length;

      const temTop =
        block.some(
          ad =>
            ad &&
            ad.top === true
        );

      const titulo =
        document.getElementById(
          'nowTitle'
        );

      const sub =
        document.getElementById(
          'nowSub'
        );

      if (titulo) {
        titulo.textContent =
          'Bloco comercial';
      }

      if (
        sub &&
        capJinglesLigadas()
      ) {
        sub.textContent =
          temTop
            ? 'Vinheta TOP de entrada'
            : 'Vinheta de entrada';
      }

      await capVinhetaFinal(
        'opening',
        temTop
      );

      if (sub) {
        sub.textContent =
          'Anúncios no ar';
      }

      const bed =
        typeof capStartBedV36 ===
          'function'
          ? await capStartBedV36()
          : null;

      try {
        for (
          const ad of block
        ) {
          if (
            typeof capPlayAdV16 ===
            'function'
          ) {
            await capPlayAdV16(
              ad
            );
          }
        }
      } finally {
        if (
          typeof capStopBedV36 ===
          'function'
        ) {
          capStopBedV36(
            bed
          );
        }
      }

      if (
        sub &&
        capJinglesLigadas()
      ) {
        sub.textContent =
          temTop
            ? 'Vinheta TOP de saída'
            : 'Vinheta de saída';
      }

      await capVinhetaFinal(
        'closing',
        temTop
      );

      playNextAdmMusic();
    };

  window.capRadioAfterMusicV16 =
    capRadioAfterMusicV16;

  function capSalvarEstadoVinheta() {
    const check =
      document.getElementById(
        'jingles'
      );

    if (!check) return;

    const key =
      'cap_jingles_' +
      String(
        store?.code ||
        'default'
      );

    localStorage.setItem(
      key,
      check.checked
        ? '1'
        : '0'
    );
  }

  function capCarregarEstadoVinheta() {
    const check =
      document.getElementById(
        'jingles'
      );

    if (!check) return;

    const key =
      'cap_jingles_' +
      String(
        store?.code ||
        'default'
      );

    const saved =
      localStorage.getItem(
        key
      );

    if (saved !== null) {
      check.checked =
        saved === '1';
    }

    if (
      !check.dataset
        .capVinhetaFinal
    ) {
      check.dataset
        .capVinhetaFinal =
        '1';

      check.addEventListener(
        'change',
        capSalvarEstadoVinheta
      );
    }
  }

  const capApplyAntesVinheta =
    applyAdmStore;

  applyAdmStore =
    function (cliente) {
      const retorno =
        capApplyAntesVinheta(
          cliente
        );

      setTimeout(
        () => {
          capCarregarEstadoVinheta();

          capCarregarVinhetasOnline(
            true
          );
        },
        100
      );

      return retorno;
    };

  window.applyAdmStore =
    applyAdmStore;

  document.addEventListener(
    'DOMContentLoaded',
    () => {
      capCarregarEstadoVinheta();
    }
  );

  window.addEventListener(
    'load',
    () => {
      capCarregarEstadoVinheta();
    }
  );
})();
