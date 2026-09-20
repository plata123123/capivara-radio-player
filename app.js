/* CAPIVARA PLAYER — CORREÇÃO LOGIN V54
   COLE NO FINAL DO app.js
*/

(function () {

  const SERVER_V54 =
    'https://capivara-radio-server.onrender.com';

  async function capLoginV54() {

    const codeInput =
      document.getElementById('code');

    const button =
      document.getElementById('enter');

    const message =
      document.getElementById('loginMsg');

    if (!codeInput || !button) return;

    const code =
      String(codeInput.value || '').trim();

    if (!/^\d{6}$/.test(code)) {

      if (message) {
        message.textContent =
          'Digite o código de 6 dígitos';
      }

      return;
    }

    const oldText =
      button.textContent;

    button.disabled = true;
    button.textContent =
      'CONECTANDO...';

    if (message) {
      message.textContent = '';
    }

    try {

      const controller =
        new AbortController();

      const timer =
        setTimeout(
          () => controller.abort(),
          15000
        );

      const response =
        await fetch(
          SERVER_V54 +
          '/api/client/' +
          encodeURIComponent(code),
          {
            headers: {
              Accept:
                'application/json'
            },

            signal:
              controller.signal
          }
        );

      clearTimeout(timer);

      let json = {};

      try {
        json =
          await response.json();
      } catch (_) {}

      if (!response.ok) {

        if (response.status === 404) {
          throw new Error(
            'Código não encontrado'
          );
        }

        throw new Error(
          json?.error ||
          json?.message ||
          'Erro ' +
          response.status
        );
      }

      const raw =
        json?.client ||
        json?.data ||
        json;

      if (!raw) {
        throw new Error(
          'Código não encontrado'
        );
      }

      const client = {
        name:
          raw.name ||
          raw.nome ||
          raw.storeName ||
          raw.nomeFantasia ||
          'Loja',

        ramo:
          raw.ramo ||
          raw.activity ||
          raw.segment ||
          raw.type ||
          'Açougue',

        code:
          String(
            raw.code ||
            raw.codigo ||
            code
          ),

        active:
          raw.active !== false &&
          raw.ativo !== false
      };

      if (!client.active) {
        throw new Error(
          'Rádio bloqueada pelo administrador'
        );
      }

      if (
        typeof applyAdmStore ===
        'function'
      ) {

        applyAdmStore(client);

      } else {

        window.store = client;

        try {
          store = client;
        } catch (_) {}

        try {
          capClientReady = true;
        } catch (_) {}
      }

      const login =
        document.getElementById(
          'login'
        );

      const app =
        document.getElementById(
          'app'
        );

      if (login) {
        login.classList.add(
          'hidden'
        );

        login.style.display =
          'none';
      }

      if (app) {
        app.classList.remove(
          'hidden'
        );

        app.style.display = '';
      }

      try {
        if (
          typeof renderAds ===
          'function'
        ) {
          renderAds();
        }
      } catch (_) {}

      try {
        if (
          typeof renderCreatedAudiosV19 ===
          'function'
        ) {
          renderCreatedAudiosV19();
        }
      } catch (_) {}

      try {
        if (
          typeof capLoadOnlinePlaylistsV53 ===
          'function'
        ) {
          setTimeout(
            capLoadOnlinePlaylistsV53,
            200
          );
        }
      } catch (_) {}

    } catch (error) {

      console.error(
        'LOGIN V54:',
        error
      );

      if (message) {

        if (
          error?.name ===
          'AbortError'
        ) {

          message.textContent =
            'Servidor demorou para responder. Tente novamente.';

        } else {

          message.textContent =
            error?.message ||
            'Não foi possível entrar na rádio';
        }
      }

    } finally {

      button.disabled = false;

      button.textContent =
        oldText ||
        'ENTRAR NA RÁDIO';
    }
  }


  function capBindLoginV54() {

    const button =
      document.getElementById(
        'enter'
      );

    const code =
      document.getElementById(
        'code'
      );

    if (!button) return;

    button.onclick =
      function (event) {

        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }

        capLoginV54();
      };


    if (
      code &&
      code.dataset.capEnterV54 !==
        '1'
    ) {

      code.dataset.capEnterV54 =
        '1';

      code.addEventListener(
        'keydown',
        function (event) {

          if (
            event.key ===
            'Enter'
          ) {

            event.preventDefault();

            capLoginV54();
          }
        }
      );
    }
  }


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      capBindLoginV54
    );

  } else {

    capBindLoginV54();
  }


  window.addEventListener(
    'load',
    capBindLoginV54
  );


  setTimeout(
    capBindLoginV54,
    500
  );

  setTimeout(
    capBindLoginV54,
    1500
  );


  window.capLoginV54 =
    capLoginV54;

})();
