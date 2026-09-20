/* =========================================================
   CAPIVARA RÁDIO PLAYER
   app.js COMPLETO
   LOGIN + CLIENTE + IA + VOZ + PLAYLIST ONLINE + RÁDIO
========================================================= */

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const CAP_SERVER = 'https://capivara-radio-server.onrender.com';

let store = {
  name: '',
  type: '',
  ramo: '',
  code: ''
};

let capClientReady = false;
let ads = [];
let playing = false;
let radioAudio = null;
let spokenAudio = null;
let bedAudio = null;
let radioIndex = 0;
let createMode = 'normal';

let playlists = [];
let onlineMedia = [];
let selectedPlaylistId = '';
let pendingPlaylistId = '';

let selectedProduct = '';

/* =========================================================
   UTILIDADES
========================================================= */

function capClientKey(base) {
  return base + '__' + String(store.code || 'SEM_CLIENTE');
}

function safeJson(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function dayKey(ts = Date.now()) {
  return new Date(ts).toLocaleDateString('en-CA');
}

function normalizeList(data, field) {
  const value =
    data?.[field] ??
    data?.data ??
    data ??
    [];

  if (Array.isArray(value)) return value;

  if (value && typeof value === 'object') {
    return Object.entries(value).map(([id, item]) => ({
      id,
      ...(item || {})
    }));
  }

  return [];
}

async function getJson(path) {
  const response = await fetch(CAP_SERVER + path, {
    headers: {
      Accept: 'application/json'
    }
  });

  let data = {};

  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    throw new Error(
      data?.error ||
      data?.message ||
      'Erro HTTP ' + response.status
    );
  }

  return data;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* =========================================================
   CATÁLOGOS
========================================================= */

const productCatalogs = {

  'Açougue': [
    'picanha',
    'alcatra',
    'contrafilé',
    'patinho',
    'acém',
    'costela',
    'frango',
    'linguiça',
    'pernil',
    'carne moída',
    'maminha',
    'cupim',
    'coxão mole',
    'coxão duro',
    'fraldinha'
  ],

  'Supermercado': [
    'arroz',
    'feijão',
    'açúcar',
    'café',
    'óleo',
    'leite',
    'macarrão',
    'farinha de trigo',
    'carne',
    'frango',
    'ovos',
    'papel higiênico',
    'sabão em pó',
    'refrigerante',
    'cerveja'
  ],

  'Farmácia': [
    'fraldas',
    'lenços umedecidos',
    'shampoo',
    'condicionador',
    'sabonete',
    'desodorante',
    'protetor solar',
    'hidratante',
    'creme dental',
    'escova dental',
    'absorvente',
    'preservativo',
    'vitaminas',
    'repelente',
    'algodão'
  ],

  'Padaria': [
    'pão francês',
    'pão de queijo',
    'pão doce',
    'bolo',
    'rosca',
    'sonho',
    'croissant',
    'salgados',
    'coxinha',
    'empada',
    'presunto',
    'muçarela',
    'leite',
    'café',
    'refrigerante'
  ],

  'Hortifruti': [
    'banana',
    'maçã',
    'laranja',
    'mamão',
    'limão',
    'abacaxi',
    'manga',
    'uva',
    'tomate',
    'batata',
    'cebola',
    'cenoura',
    'alface',
    'couve',
    'ovos'
  ],

  'Pet Shop': [
    'ração para cães',
    'ração para gatos',
    'petiscos',
    'areia para gatos',
    'shampoo pet',
    'antipulgas',
    'brinquedos',
    'coleiras',
    'guias',
    'camas',
    'tapete higiênico',
    'comedouros',
    'sachês',
    'ossinhos',
    'banho e tosa'
  ],

  'Pizzaria': [
    'pizza calabresa',
    'pizza muçarela',
    'pizza portuguesa',
    'pizza frango com catupiry',
    'pizza marguerita',
    'pizza quatro queijos',
    'pizza bacon',
    'pizza carne seca',
    'pizza chocolate',
    'pizza doce',
    'pizza família',
    'combo pizza e refrigerante',
    'refrigerante',
    'borda recheada',
    'delivery'
  ],

  'Lanchonete': [
    'x-burguer',
    'x-salada',
    'x-bacon',
    'x-tudo',
    'hambúrguer artesanal',
    'cachorro-quente',
    'misto quente',
    'batata frita',
    'salgados',
    'coxinha',
    'pastel',
    'açaí',
    'suco',
    'refrigerante',
    'combo'
  ],

  'Restaurante': [
    'prato feito',
    'self-service',
    'marmitex',
    'almoço executivo',
    'feijoada',
    'churrasco',
    'frango',
    'peixe',
    'massas',
    'saladas',
    'sobremesa',
    'suco',
    'refrigerante',
    'delivery',
    'combo do dia'
  ],

  'Hotel / Pousada': [
    'diária',
    'suíte',
    'quarto casal',
    'quarto família',
    'café da manhã',
    'pacote de fim de semana',
    'pacote romântico',
    'feriado',
    'piscina',
    'restaurante',
    'estacionamento',
    'wi-fi',
    'day use',
    'evento',
    'reserva antecipada'
  ],

  'Roupas': [
    'camiseta',
    'camisa',
    'calça jeans',
    'bermuda',
    'vestido',
    'blusa',
    'short',
    'saia',
    'conjunto',
    'jaqueta',
    'moletom',
    'roupa infantil',
    'moda íntima',
    'pijama',
    'promoção da coleção'
  ],

  'Calçados': [
    'tênis',
    'sapato social',
    'sandália',
    'chinelo',
    'sapatilha',
    'bota',
    'tênis infantil',
    'sandália infantil',
    'sapato infantil',
    'rasteirinha',
    'scarpin',
    'mocassim',
    'papete',
    'chuteira',
    'promoção de calçados'
  ],

  'Material de Construção': [
    'cimento',
    'areia',
    'brita',
    'tijolo',
    'telha',
    'argamassa',
    'tinta',
    'piso',
    'revestimento',
    'tubo pvc',
    'caixa d’água',
    'ferramentas',
    'portas',
    'janelas',
    'material elétrico'
  ],

  'Autopeças': [
    'óleo do motor',
    'filtro de óleo',
    'filtro de ar',
    'pastilha de freio',
    'bateria',
    'palheta',
    'lâmpada',
    'correia',
    'vela de ignição',
    'amortecedor',
    'pneu',
    'aditivo',
    'kit embreagem',
    'rolamento',
    'acessórios'
  ],

  'Oficina / Auto Center': [
    'troca de óleo',
    'alinhamento',
    'balanceamento',
    'freios',
    'suspensão',
    'troca de pneus',
    'revisão',
    'ar-condicionado',
    'injeção eletrônica',
    'embreagem',
    'bateria',
    'escapamento',
    'correia dentada',
    'diagnóstico',
    'higienização'
  ],

  'Posto / Conveniência': [
    'gasolina',
    'etanol',
    'diesel',
    'óleo lubrificante',
    'aditivo',
    'calibragem',
    'lavagem',
    'café',
    'água',
    'refrigerante',
    'energético',
    'salgados',
    'sanduíche',
    'gelo',
    'carvão'
  ],

  'Cosméticos / Perfumaria': [
    'perfume feminino',
    'perfume masculino',
    'hidratante',
    'shampoo',
    'condicionador',
    'maquiagem',
    'batom',
    'base',
    'protetor solar',
    'desodorante',
    'kit presente',
    'creme facial',
    'esmalte',
    'sabonete',
    'produtos para cabelo'
  ],

  'Ótica': [
    'óculos de grau',
    'óculos de sol',
    'armação feminina',
    'armação masculina',
    'armação infantil',
    'lentes',
    'lentes multifocais',
    'lentes de contato',
    'antirreflexo',
    'filtro de luz azul',
    'clip-on',
    'exame de vista',
    'ajuste de armação',
    'kit limpeza',
    'promoção de armações'
  ],

  'Papelaria': [
    'caderno',
    'caneta',
    'lápis',
    'borracha',
    'mochila',
    'estojo',
    'papel a4',
    'impressão',
    'xerox',
    'material escolar',
    'cartolina',
    'cola',
    'tesoura',
    'agenda',
    'kit escolar'
  ],

  'Móveis / Eletro': [
    'sofá',
    'cama',
    'colchão',
    'guarda-roupa',
    'mesa',
    'cadeira',
    'rack',
    'geladeira',
    'fogão',
    'máquina de lavar',
    'televisão',
    'micro-ondas',
    'ventilador',
    'air fryer',
    'liquidificador'
  ],

  'Agropecuária / Rações': [
    'ração para cães',
    'ração para gatos',
    'ração para aves',
    'ração para equinos',
    'ração para bovinos',
    'milho',
    'sal mineral',
    'sementes',
    'adubo',
    'ferramentas',
    'bebedouro',
    'comedouro',
    'produtos veterinários',
    'selaria',
    'acessórios rurais'
  ],

  'Distribuidora de Bebidas': [
    'água',
    'refrigerante',
    'suco',
    'energético',
    'cerveja',
    'gelo',
    'água com gás',
    'isotônico',
    'chá gelado',
    'tônica',
    'carvão',
    'copos descartáveis',
    'combo para festa',
    'fardo de água',
    'fardo de refrigerante'
  ],

  'Utilidades / Variedades': [
    'panelas',
    'potes',
    'copos',
    'pratos',
    'talheres',
    'baldes',
    'vassouras',
    'produtos de limpeza',
    'organizadores',
    'toalhas',
    'tapetes',
    'ferramentas',
    'brinquedos',
    'material escolar',
    'itens para cozinha'
  ]
};

function normRamo(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function catalogForRamo(ramo) {
  const key = Object.keys(productCatalogs)
    .find(k => normRamo(k) === normRamo(ramo));

  return key
    ? [...productCatalogs[key]]
    : [];
}

/* =========================================================
   CLIENTE
========================================================= */

async function capServerClient(code) {

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    20000
  );

  try {

    const response = await fetch(
      CAP_SERVER +
      '/api/client/' +
      encodeURIComponent(code),
      {
        signal: controller.signal,
        headers: {
          Accept: 'application/json'
        }
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch {}

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error('Servidor ' + response.status);
    }

    const c =
      data?.client ||
      data?.data ||
      data;

    if (!c || !(c.code || c.codigo)) {
      return null;
    }

    return {
      name:
        c.name ||
        c.nome ||
        c.storeName ||
        'Loja',

      ramo:
        c.ramo ||
        c.activity ||
        c.segment ||
        'Açougue',

      code:
        String(
          c.code ||
          c.codigo
        ),

      active:
        c.active !== false &&
        c.ativo !== false
    };

  } finally {

    clearTimeout(timer);
  }
}

/* =========================================================
   ESTADO DO CLIENTE
========================================================= */

function loadLocalClientState() {

  capClientReady = true;

  ads = safeJson(
    localStorage.getItem(
      capClientKey('cap_ads')
    ) || '[]',
    []
  );

  if (!Array.isArray(ads)) {
    ads = [];
  }

  selectedPlaylistId =
    localStorage.getItem(
      capClientKey('cap_playlist')
    ) || '';

  createMode = 'normal';
}

async function pullClientState() {

  if (!store.code) return;

  try {

    const response = await fetch(
      CAP_SERVER +
      '/api/client/' +
      encodeURIComponent(store.code) +
      '/state',
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );

    if (!response.ok) return;

    const json = await response.json();

    const state =
      json?.state ||
      json?.data ||
      json ||
      {};

    if (Array.isArray(state.ads)) {

      ads = state.ads.filter(
        ad =>
          !ad.clientCode ||
          String(ad.clientCode) ===
          String(store.code)
      );

      localStorage.setItem(
        capClientKey('cap_ads'),
        JSON.stringify(ads)
      );
    }

    const serverPlaylist =
      state.selectedPlaylistId ||
      state.selectedPlaylist ||
      '';

    if (serverPlaylist) {

      selectedPlaylistId =
        String(serverPlaylist);

      localStorage.setItem(
        capClientKey('cap_playlist'),
        selectedPlaylistId
      );
    }

    renderAds();

  } catch (error) {

    console.warn(
      'Estado online indisponível.',
      error
    );
  }
}

async function pushClientState() {

  if (!store.code) return;

  try {

    const safeAds = ads.map(ad => ({
      ...ad,
      clientCode: String(store.code)
    }));

    await fetch(
      CAP_SERVER +
      '/api/client/' +
      encodeURIComponent(store.code) +
      '/state',
      {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          ads: safeAds,
          selectedPlaylistId,
          selectedPlaylist:
            selectedPlaylistId,
          updatedAt:
            new Date().toISOString()
        })
      }
    );

  } catch (error) {

    console.warn(
      'Não foi possível sincronizar agora.',
      error
    );
  }
}

/* =========================================================
   ABRIR CLIENTE
========================================================= */

async function applyAdmStore(client) {

  stopAllAudio();

  store = {
    name: client.name,
    type: client.ramo,
    ramo: client.ramo,
    code: String(client.code)
  };

  loadLocalClientState();

  const storeName =
    document.getElementById('storeName');

  if (storeName) {
    storeName.textContent = store.name;
  }

  loadProducts();

  renderAds();

  await pullClientState();

  await loadOnlineRadio();

  renderProducts();

  renderPlaylists();

  updateRadioStatus();
}

/* =========================================================
   LOGIN
========================================================= */

async function loginPlayer() {

  const input =
    document.getElementById('code');

  const button =
    document.getElementById('enter');

  const message =
    document.getElementById('loginMsg');

  if (!input || !button) return;

  const code =
    String(input.value || '')
      .replace(/\D/g, '')
      .slice(0, 6);

  input.value = code;

  if (!/^\d{6}$/.test(code)) {

    if (message) {
      message.textContent =
        'Digite o código de 6 dígitos';
    }

    return;
  }

  const original =
    button.textContent;

  button.disabled = true;

  button.textContent =
    'CONECTANDO...';

  if (message) {
    message.textContent = '';
  }

  try {

    const client =
      await capServerClient(code);

    if (!client) {

      if (message) {
        message.textContent =
          'Código não encontrado';
      }

      return;
    }

    if (client.active === false) {

      if (message) {
        message.textContent =
          'Rádio bloqueada pelo administrador';
      }

      return;
    }

    await applyAdmStore(client);

    const login =
      document.getElementById('login');

    const app =
      document.getElementById('app');

    if (login) {
      login.classList.add('hidden');
    }

    if (app) {
      app.classList.remove('hidden');
    }

  } catch (error) {

    console.error(error);

    if (message) {

      message.textContent =
        error?.name === 'AbortError'
          ? 'Servidor demorou para responder. Tente novamente.'
          : 'Não foi possível conectar ao servidor';
    }

  } finally {

    button.disabled = false;

    button.textContent =
      original;
  }
}

/* =========================================================
   PRODUTOS
========================================================= */

let products = [];

function productKey() {
  return capClientKey('cap_products');
}

function loadProducts() {

  const base =
    catalogForRamo(store.ramo);

  const saved =
    safeJson(
      localStorage.getItem(productKey()),
      null
    );

  if (
    Array.isArray(saved) &&
    saved.length
  ) {
    products = saved;
  } else {
    products = base;
  }

  while (products.length < 15) {
    products.push(
      'item ' + (products.length + 1)
    );
  }

  products = products.slice(0, 15);

  localStorage.setItem(
    productKey(),
    JSON.stringify(products)
  );
}

function saveProducts() {

  localStorage.setItem(
    productKey(),
    JSON.stringify(products)
  );

  renderProducts();
}

function selectProduct(name) {

  selectedProduct = name;

  const selected =
    document.getElementById(
      'selectedProduct'
    );

  const selectedName =
    document.getElementById(
      'selectedName'
    );

  if (selected) {
    selected.classList.remove('hidden');
  }

  if (selectedName) {
    selectedName.textContent = name;
  }

  $$('#favorites button')
    .forEach(button => {

      button.classList.toggle(
        'selected',
        button.dataset.product === name
      );
    });

  const price =
    document.getElementById('price');

  if (price) {
    price.focus();
  }
}

function renderProducts() {

  const box =
    document.getElementById(
      'favorites'
    );

  if (!box) return;

  box.innerHTML = '';

  products.forEach((name, index) => {

    const button =
      document.createElement('button');

    button.type = 'button';

    button.dataset.product = name;

    button.textContent = name;

    button.onclick =
      () => selectProduct(name);

    button.ondblclick = event => {

      event.preventDefault();

      const value = prompt(
        'Editar',
        products[index]
      );

      if (
        value &&
        value.trim()
      ) {

        products[index] =
          value.trim().toLowerCase();

        saveProducts();
      }
    };

    box.appendChild(button);
  });
}

/* =========================================================
   PREÇO
========================================================= */

function bindPrice() {

  const input =
    document.getElementById('price');

  if (!input) return;

  input.addEventListener(
    'input',
    event => {

      let digits =
        event.target.value
          .replace(/\D/g, '')
          .slice(0, 8);

      if (!digits) {

        event.target.value = '';

        return;
      }

      const value =
        parseInt(digits, 10) / 100;

      event.target.value =
        value.toLocaleString(
          'pt-BR',
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }
        );
    }
  );
}

/* =========================================================
   LIMITES
========================================================= */

function capLimits() {

  const config =
    safeJson(
      localStorage.getItem(
        'capivara_admin_settings'
      ),
      {}
    ) || {};

  return {
    daily:
      Math.max(
        1,
        parseInt(
          config.dailyLimit || 15,
          10
        )
      ),

    weekly:
      Math.max(
        1,
        parseInt(
          config.weeklyLimit || 75,
          10
        )
      ),

    top:
      Math.max(
        0,
        parseInt(
          config.topDailyLimit ?? 1,
          10
        )
      )
  };
}

function usage() {

  const value =
    safeJson(
      localStorage.getItem(
        capClientKey(
          'cap_daily_usage'
        )
      ),
      {}
    ) || {};

  if (value.day !== dayKey()) {

    return {
      day: dayKey(),
      count: 0,
      topCount: 0
    };
  }

  return {
    day: value.day,
    count: Number(value.count || 0),
    topCount:
      Number(value.topCount || 0)
  };
}

function todayCreated() {
  return usage().count;
}

function topCreatedToday() {
  return usage().topCount;
}

function registerUse(top) {

  const u = usage();

  u.count++;

  if (top) {
    u.topCount++;
  }

  localStorage.setItem(
    capClientKey(
      'cap_daily_usage'
    ),
    JSON.stringify(u)
  );
}

/* =========================================================
   IA DE TEXTO
========================================================= */

function promptForGemini(info) {

  const top =
    createMode === 'top';

  const mention =
    document.getElementById(
      'mentionStore'
    )?.checked === true;

  const fullCurrency =
    document.getElementById(
      'fullCurrency'
    )?.checked === true;

  return `
você é um locutor e redator de rádio comercial brasileiro.

ramo do comércio: ${store.ramo}.

crie apenas uma chamada comercial curta, natural e profissional.

regras obrigatórias:
máximo de 150 caracteres.
escreva em letras minúsculas.
não use emojis.
não use dois pontos.
não fale o ramo do comércio.
não invente preço.
não invente desconto.
não invente características.
preserve exatamente a forma de venda informada.
${mention
  ? `pode mencionar o nome ${store.name}.`
  : 'não mencione o nome do estabelecimento.'}
${fullCurrency
  ? 'escreva preços por extenso incluindo reais e centavos.'
  : 'em preços não diga as palavras reais ou centavos. exemplo 4,77 vira quatro e setenta e sete.'}
${top
  ? 'é um top do dia. dê mais impacto e urgência sem exagerar.'
  : ''}
informação do cliente:
${info}

responda somente com a frase.
`.trim();
}

async function createTexts() {

  const limits =
    capLimits();

  if (
    todayCreated() >=
    limits.daily
  ) {

    alert(
      'O limite diário de anúncios foi atingido.'
    );

    return;
  }

  if (
    createMode === 'top' &&
    topCreatedToday() >=
    limits.top
  ) {

    alert(
      'O limite diário de TOP foi atingido.'
    );

    return;
  }

  const brief =
    document.getElementById('brief');

  let info =
    String(
      brief?.value || ''
    ).trim();

  if (selectedProduct) {

    const price =
      String(
        document.getElementById(
          'price'
        )?.value || ''
      ).trim();

    info =
      (
        info
          ? info + '; '
          : ''
      ) +
      selectedProduct +
      (
        price
          ? '; preço ' + price
          : ''
      );
  }

  if (!info) {

    alert(
      'Escolha um item ou escreva o que deseja anunciar.'
    );

    return;
  }

  const button =
    document.getElementById(
      'suggest'
    );

  if (button) {

    button.disabled = true;

    button.textContent =
      'CRIANDO...';
  }

  try {

    const response =
      await fetch(
        CAP_SERVER +
        '/api/ai/generate',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
            Accept:
              'application/json'
          },

          body: JSON.stringify({
            prompt:
              promptForGemini(info),

            text: info,
            pedido: info,
            ramo: store.ramo,
            produto:
              selectedProduct,
            preco:
              document.getElementById(
                'price'
              )?.value || '',
            top:
              createMode === 'top',
            storeName:
              store.name,
            maxChars: 150
          })
        }
      );

    let data = {};

    try {
      data =
        await response.json();
    } catch {}

    if (!response.ok) {

      throw new Error(
        data?.error ||
        data?.message ||
        'Servidor ' +
        response.status
      );
    }

    let text =
      data?.text ||
      data?.frase ||
      data?.response ||
      data?.generated_text ||
      data?.data?.text ||
      '';

    text =
      String(text)
        .trim()
        .replace(
          /^```(?:json)?\s*/i,
          ''
        )
        .replace(/```$/g, '')
        .replace(
          /^["']|["']$/g,
          ''
        )
        .trim()
        .toLowerCase()
        .slice(0, 150);

    if (!text) {

      throw new Error(
        'A IA não retornou a frase.'
      );
    }

    if (brief) {
      brief.value = text;
    }

    const text1 =
      document.getElementById(
        'text1'
      );

    if (text1) {
      text1.value = text;
    }

    document.body.dataset
      .v24stage = 'phrase';

    updateCreateUi();

  } catch (error) {

    console.error(error);

    alert(
      'Não foi possível criar o anúncio.\n\n' +
      (
        error?.message ||
        error
      )
    );

  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        '✨ CRIAR ANÚNCIO';
    }
  }
}

/* =========================================================
   VOZ
========================================================= */

function nextVoice() {

  const last =
    [...ads]
      .reverse()
      .find(ad => ad?.voice);

  if (!last) {
    return 'male';
  }

  return /mascul|homem/i.test(
    String(last.voice)
  )
    ? 'female'
    : 'male';
}

async function generateVoice(text) {

  const voice =
    nextVoice();

  const response =
    await fetch(
      CAP_SERVER +
      '/api/voice/generate',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
          Accept:
            'audio/mpeg'
        },

        body: JSON.stringify({
          text,
          voice,
          gender: voice,
          type: 'ad',
          ramo: store.ramo
        })
      }
    );

  if (!response.ok) {

    let message =
      'Erro ao gerar voz';

    try {

      const json =
        await response.json();

      message =
        json?.error ||
        json?.message ||
        message;

    } catch {}

    throw new Error(message);
  }

  const blob =
    await response.blob();

  return {
    blob,
    voice,
    voiceName:
      voice === 'male'
        ? 'Voz masculina'
        : 'Voz feminina'
  };
}

/* =========================================================
   ÁUDIO LOCAL DOS ANÚNCIOS
========================================================= */

function openAdsDb() {

  return new Promise(
    (resolve, reject) => {

      const request =
        indexedDB.open(
          'CapivaraAdsV19',
          1
        );

      request.onupgradeneeded =
        () => {

          if (
            !request.result
              .objectStoreNames
              .contains('audio')
          ) {

            request.result
              .createObjectStore(
                'audio'
              );
          }
        };

      request.onsuccess =
        () =>
          resolve(
            request.result
          );

      request.onerror =
        () =>
          reject(
            request.error
          );
    }
  );
}

async function saveAdBlob(
  key,
  blob
) {

  const db =
    await openAdsDb();

  return new Promise(
    (resolve, reject) => {

      const request =
        db
          .transaction(
            'audio',
            'readwrite'
          )
          .objectStore('audio')
          .put(blob, key);

      request.onsuccess =
        () => resolve(true);

      request.onerror =
        () =>
          reject(
            request.error
          );
    }
  );
}

async function getAdBlob(key) {

  const db =
    await openAdsDb();

  return new Promise(
    (resolve, reject) => {

      const request =
        db
          .transaction('audio')
          .objectStore('audio')
          .get(key);

      request.onsuccess =
        () =>
          resolve(
            request.result
          );

      request.onerror =
        () =>
          reject(
            request.error
          );
    }
  );
}

/* =========================================================
   GERAR ÁUDIO E JÁ ENVIAR PARA PROGRAMAÇÃO
========================================================= */

async function generateAndQueue() {

  if (window.capAudioBusy) {
    return;
  }

  window.capAudioBusy = true;

  const button =
    document.getElementById(
      'generateAudioV24'
    ) ||
    document.getElementById(
      'generateAudioV22'
    ) ||
    document.querySelector(
      '[data-gen="1"]'
    );

  try {

    if (button) {

      button.disabled = true;

      button.textContent =
        'GERANDO ÁUDIO...';
    }

    const brief =
      document.getElementById(
        'brief'
      );

    const text =
      String(
        brief?.value || ''
      )
        .trim()
        .toLowerCase()
        .slice(0, 150);

    if (!text) {

      throw new Error(
        'O texto do anúncio está vazio.'
      );
    }

    const limits =
      capLimits();

    if (
      todayCreated() >=
      limits.daily
    ) {

      throw new Error(
        'O limite diário de anúncios foi atingido.'
      );
    }

    if (
      createMode === 'top' &&
      topCreatedToday() >=
      limits.top
    ) {

      throw new Error(
        'O limite diário de TOP foi atingido.'
      );
    }

    const voiceResult =
      await generateVoice(text);

    const id =
      'ad_' +
      Date.now() +
      '_' +
      Math.random()
        .toString(36)
        .slice(2, 7);

    const audioKey =
      'cliente:' +
      store.code +
      ':audio:' +
      id;

    await saveAdBlob(
      audioKey,
      voiceResult.blob
    );

    const duration =
      Number(
        document.getElementById(
          'duration'
        )?.value || 1
      );

    const days =
      duration > 0
        ? duration
        : 1;

    const exp =
      Date.now() +
      days *
      86400000;

    const label =
      selectedProduct ||
      (
        createMode === 'top'
          ? 'top do dia'
          : 'anúncio'
      );

    ads.push({
      id,
      label,
      product:
        selectedProduct || '',
      text,
      voice:
        voiceResult.voiceName,
      paused: false,
      exp,
      audioKey,
      top:
        createMode === 'top',
      createdDay:
        dayKey(),
      clientCode:
        store.code
    });

    registerUse(
      createMode === 'top'
    );

    saveAds();

    createMode = 'normal';

    resetCreation(true);

  } catch (error) {

    console.error(error);

    alert(
      'Não foi possível gerar o áudio.\n\n' +
      (
        error?.message ||
        error
      )
    );

  } finally {

    window.capAudioBusy = false;

    if (button) {

      button.disabled = false;

      button.textContent =
        '🔊 GERAR ÁUDIO';
    }
  }
}

/* =========================================================
   ANÚNCIOS
========================================================= */

function saveAds() {

  if (!capClientReady) {
    return;
  }

  localStorage.setItem(
    capClientKey('cap_ads'),
    JSON.stringify(ads)
  );

  renderAds();

  pushClientState();
}

function renderAds() {

  const box =
    document.getElementById('ads');

  const now =
    Date.now();

  ads = ads.filter(
    ad =>
      !ad.exp ||
      ad.exp > now
  );

  if (capClientReady) {

    localStorage.setItem(
      capClientKey('cap_ads'),
      JSON.stringify(ads)
    );
  }

  if (!box) return;

  box.innerHTML = '';

  if (!ads.length) {

    box.innerHTML =
      '<div class="empty">Nenhum anúncio ativo.</div>';

    return;
  }

  ads.forEach(
    (ad, index) => {

      const row =
        document.createElement(
          'div'
        );

      row.className =
        'ad' +
        (
          ad.top
            ? ' top-ad'
            : ''
        );

      row.innerHTML = `
        <div class="copy">
          <b>
            ${
              ad.top
                ? '<span class="top-badge">🔥 TOP DO DIA</span> '
                : ''
            }
            ${escapeHtml(ad.label || 'anúncio')}
          </b>

          <small>
            ${escapeHtml(ad.voice || '')}
            •
            ${
              ad.paused
                ? 'Pausado'
                : 'Na programação'
            }
          </small>

          <div class="ad-hidden-text hidden">
            ${escapeHtml(ad.text || '')}
          </div>
        </div>

        <button type="button" data-view="${index}">
          ver texto
        </button>

        <button type="button" data-pause="${index}">
          ${
            ad.paused
              ? '▶'
              : '⏸'
          }
        </button>

        <button type="button" data-delete="${index}">
          🗑
        </button>
      `;

      box.appendChild(row);
    }
  );

  $$('[data-view]')
    .forEach(button => {

      button.onclick =
        () => {

          const row =
            button.closest('.ad');

          const text =
            row?.querySelector(
              '.ad-hidden-text'
            );

          if (!text) return;

          text.classList.toggle(
            'hidden'
          );

          button.textContent =
            text.classList
              .contains('hidden')
              ? 'ver texto'
              : 'ocultar';
        };
    });

  $$('[data-pause]')
    .forEach(button => {

      button.onclick =
        () => {

          const index =
            Number(
              button.dataset.pause
            );

          if (!ads[index]) return;

          ads[index].paused =
            !ads[index].paused;

          saveAds();
        };
    });

  $$('[data-delete]')
    .forEach(button => {

      button.onclick =
        () => {

          const index =
            Number(
              button.dataset.delete
            );

          if (!ads[index]) return;

          ads.splice(index, 1);

          saveAds();
        };
    });
}

/* =========================================================
   TOP DO DIA
========================================================= */

function setCreateMode(mode) {

  createMode = mode;

  const status =
    document.getElementById(
      'topStatus'
    );

  const button =
    document.getElementById(
      'topDay'
    );

  if (status) {

    status.classList.toggle(
      'hidden',
      mode !== 'top'
    );
  }

  if (button) {

    button.classList.toggle(
      'active',
      mode === 'top'
    );
  }
}

function toggleTop() {

  const limits =
    capLimits();

  if (
    topCreatedToday() >=
    limits.top
  ) {

    alert(
      'O limite diário de TOP foi atingido.'
    );

    return;
  }

  setCreateMode(
    createMode === 'top'
      ? 'normal'
      : 'top'
  );
}

/* =========================================================
   RESET DA CRIAÇÃO
========================================================= */

function resetCreation(
  clearText = true
) {

  if (clearText) {

    const brief =
      document.getElementById(
        'brief'
      );

    if (brief) {
      brief.value = '';
    }

    const text1 =
      document.getElementById(
        'text1'
      );

    if (text1) {
      text1.value = '';
    }
  }

  selectedProduct = '';

  const price =
    document.getElementById(
      'price'
    );

  if (price) {
    price.value = '';
  }

  const selected =
    document.getElementById(
      'selectedProduct'
    );

  if (selected) {
    selected.classList.add(
      'hidden'
    );
  }

  $$('#favorites button')
    .forEach(button => {

      button.classList.remove(
        'selected'
      );
    });

  document.body.dataset
    .v24stage = 'start';

  updateCreateUi();
}

function desistCreation() {

  selectedProduct = '';

  const price =
    document.getElementById(
      'price'
    );

  if (price) {
    price.value = '';
  }

  document.body.dataset
    .v24stage = 'start';

  setCreateMode('normal');

  updateCreateUi();
}

function updateCreateUi() {

  const phraseReady =
    document.body.dataset
      .v24stage === 'phrase';

  const create =
    document.getElementById(
      'suggest'
    );

  const top =
    document.getElementById(
      'topDay'
    );

  const audio =
    document.getElementById(
      'generateAudioV24'
    ) ||
    document.getElementById(
      'generateAudioV22'
    ) ||
    document.querySelector(
      '[data-gen="1"]'
    );

  const desist =
    document.getElementById(
      'desistV25'
    );

  if (create) {

    create.style.display =
      phraseReady
        ? 'none'
        : '';
  }

  if (top) {

    top.style.display =
      phraseReady
        ? 'none'
        : '';
  }

  if (audio) {

    audio.style.display =
      phraseReady
        ? ''
        : 'none';

    audio.textContent =
      '🔊 GERAR ÁUDIO';
  }

  if (desist) {

    desist.style.display =
      phraseReady
        ? ''
        : 'none';
  }
}

/* =========================================================
   PLAYLISTS ONLINE
========================================================= */

function currentPlaylist() {

  return playlists.find(
    playlist =>
      String(playlist.id) ===
      String(selectedPlaylistId)
  ) || null;
}

function playlistMusicIds(
  playlist
) {

  if (!playlist) return [];

  if (
    Array.isArray(
      playlist.musicIds
    )
  ) {
    return playlist.musicIds;
  }

  if (
    Array.isArray(
      playlist.music_ids
    )
  ) {
    return playlist.music_ids;
  }

  if (
    Array.isArray(
      playlist.tracks
    )
  ) {
    return playlist.tracks;
  }

  if (
    Array.isArray(
      playlist.songs
    )
  ) {
    return playlist.songs;
  }

  return [];
}

function currentPlaylistSongs() {

  const playlist =
    currentPlaylist();

  if (!playlist) {
    return [];
  }

  const ids =
    playlistMusicIds(
      playlist
    );

  const map =
    new Map(
      onlineMedia.map(
        media => [
          String(media.id),
          media
        ]
      )
    );

  return ids
    .map(item => {

      if (
        item &&
        typeof item === 'object'
      ) {

        const id =
          item.id ||
          item.mediaId ||
          item.media_id;

        return (
          map.get(
            String(id)
          ) ||
          item
        );
      }

      return map.get(
        String(item)
      );
    })
    .filter(Boolean);
}

function mediaUrl(media) {

  if (!media) {
    return '';
  }

  if (
    media.url &&
    /^https?:\/\//i.test(
      media.url
    )
  ) {
    return media.url;
  }

  if (media.url) {

    return (
      CAP_SERVER +
      (
        String(media.url)
          .startsWith('/')
          ? ''
          : '/'
      ) +
      media.url
    );
  }

  if (media.id) {

    return (
      CAP_SERVER +
      '/api/media/' +
      encodeURIComponent(
        media.id
      )
    );
  }

  return '';
}

async function loadOnlineRadio() {

  try {

    const [
      playlistData,
      mediaData
    ] =
      await Promise.all([
        getJson(
          '/api/playlists'
        ),
        getJson(
          '/api/media'
        )
      ]);

    playlists =
      normalizeList(
        playlistData,
        'playlists'
      )
        .filter(
          playlist =>
            playlist &&
            playlist.active !== false
        );

    onlineMedia =
      normalizeList(
        mediaData,
        'media'
      )
        .filter(media => {

          const kind =
            String(
              media?.kind ||
              'music'
            ).toLowerCase();

          return kind === 'music';
        });

    if (
      !selectedPlaylistId
    ) {

      selectedPlaylistId =
        localStorage.getItem(
          capClientKey(
            'cap_playlist'
          )
        ) || '';
    }

    if (
      !playlists.some(
        playlist =>
          String(playlist.id) ===
          String(
            selectedPlaylistId
          )
      )
    ) {

      const first =
        playlists.find(
          playlist =>
            playlistMusicIds(
              playlist
            ).length
        ) ||
        playlists[0];

      selectedPlaylistId =
        first
          ? String(first.id)
          : '';
    }

    if (selectedPlaylistId) {

      localStorage.setItem(
        capClientKey(
          'cap_playlist'
        ),
        selectedPlaylistId
      );
    }

    renderPlaylists();

    updateRadioStatus();

  } catch (error) {

    console.error(
      'Erro playlists:',
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
  }
}

function retitlePlaylistArea() {

  const box =
    document.getElementById(
      'themeButtonsV11'
    );

  if (!box) return;

  const parent =
    box.parentElement;

  if (!parent) return;

  const elements =
    parent.querySelectorAll(
      'h1,h2,h3,h4,strong,b,div'
    );

  for (
    const element of elements
  ) {

    if (
      /^escolha o tema da rádio$/i
        .test(
          String(
            element.textContent ||
            ''
          ).trim()
        )
    ) {

      element.textContent =
        'ESCOLHA A PLAYLIST DA RÁDIO';

      break;
    }
  }
}

function renderPlaylists() {

  retitlePlaylistArea();

  const box =
    document.getElementById(
      'themeButtonsV11'
    );

  const status =
    document.getElementById(
      'themeStateV11'
    );

  if (!box) return;

  if (!playlists.length) {

    box.innerHTML = `
      <div style="
        width:100%;
        padding:14px;
        text-align:center;
        font-weight:800
      ">
        Nenhuma playlist disponível.
      </div>
    `;

    if (status) {

      status.textContent =
        'O ADM precisa criar uma playlist.';
    }

    return;
  }

  box.innerHTML =
    playlists.map(
      playlist => {

        const active =
          String(
            playlist.id
          ) ===
          String(
            selectedPlaylistId
          );

        const pending =
          String(
            playlist.id
          ) ===
          String(
            pendingPlaylistId
          );

        return `
          <button
            type="button"
            class="
              ${active ? 'active' : ''}
              ${pending ? 'pending' : ''}
            "
            data-playlist="${escapeHtml(playlist.id)}"
          >
            ${escapeHtml(playlist.name || 'Playlist')}
          </button>
        `;
      }
    ).join('');

  box.querySelectorAll(
    '[data-playlist]'
  ).forEach(button => {

    button.onclick =
      () =>
        choosePlaylist(
          button.dataset.playlist
        );
  });

  if (status) {

    if (pendingPlaylistId) {

      const pending =
        playlists.find(
          playlist =>
            String(
              playlist.id
            ) ===
            String(
              pendingPlaylistId
            )
        );

      status.textContent =
        '⏳ ' +
        (
          pending?.name ||
          'Nova playlist'
        ) +
        ' entra quando a música terminar.';

    } else {

      status.textContent =
        '🟢 Playlist ativa: ' +
        (
          currentPlaylist()?.name ||
          'nenhuma'
        );
    }
  }
}

async function savePlaylistChoice(
  id
) {

  selectedPlaylistId =
    String(id || '');

  radioIndex = 0;

  localStorage.setItem(
    capClientKey(
      'cap_playlist'
    ),
    selectedPlaylistId
  );

  renderPlaylists();

  updateRadioStatus();

  await pushClientState();
}

async function choosePlaylist(id) {

  id = String(id || '');

  if (!id) return;

  if (
    playing &&
    radioAudio &&
    !radioAudio.paused
  ) {

    pendingPlaylistId =
      id;

    renderPlaylists();

    return;
  }

  pendingPlaylistId = '';

  await savePlaylistChoice(
    id
  );
}

/* =========================================================
   STATUS DA RÁDIO
========================================================= */

function updateRadioStatus() {

  const info =
    document.getElementById(
      'admSyncInfo'
    );

  if (!info) return;

  const count =
    currentPlaylistSongs()
      .length;

  info.innerHTML = `
    ✅ ${escapeHtml(store.ramo)}
    •
    <b>
      ${escapeHtml(
        currentPlaylist()?.name ||
        'Sem playlist'
      )}
    </b>
    •
    ${count}
    música${count === 1 ? '' : 's'}
    online
  `;
}

/* =========================================================
   PLAYER DE ÁUDIO
========================================================= */

function musicVolume() {

  const value =
    Number(
      document.getElementById(
        'musicVol'
      )?.value || 75
    );

  return Math.max(
    0,
    Math.min(
      1,
      value / 100
    )
  );
}

function bedVolume() {

  const value =
    Number(
      document.getElementById(
        'bedVol'
      )?.value || 6
    );

  return Math.max(
    0,
    Math.min(
      1,
      value / 100
    )
  );
}

function stopAllAudio() {

  try {

    if (radioAudio) {
      radioAudio.pause();
    }

  } catch {}

  try {

    if (spokenAudio) {
      spokenAudio.pause();
    }

  } catch {}

  try {

    if (bedAudio) {
      bedAudio.pause();
    }

  } catch {}

  radioAudio = null;
  spokenAudio = null;
  bedAudio = null;

  playing = false;
}

/* =========================================================
   UI PLAY
========================================================= */

function syncPlayUi() {

  const button =
    document.getElementById(
      'play'
    );

  if (!button) return;

  button.textContent =
    playing
      ? '⏸ PAUSAR RÁDIO'
      : '▶ INICIAR RÁDIO';

  button.classList.toggle(
    'active',
    playing
  );
}

/* =========================================================
   TOCAR MÚSICA
========================================================= */

async function playNextMusic() {

  if (!playing) return;

  if (pendingPlaylistId) {

    selectedPlaylistId =
      pendingPlaylistId;

    pendingPlaylistId = '';

    radioIndex = 0;

    await savePlaylistChoice(
      selectedPlaylistId
    );
  }

  const songs =
    currentPlaylistSongs();

  if (!songs.length) {

    const title =
      document.getElementById(
        'nowTitle'
      );

    const subtitle =
      document.getElementById(
        'nowSub'
      );

    if (title) {

      title.textContent =
        playlists.length
          ? 'Playlist sem músicas'
          : 'Nenhuma playlist disponível';
    }

    if (subtitle) {

      subtitle.textContent =
        playlists.length
          ? 'Escolha uma playlist com músicas.'
          : 'Crie uma playlist no ADM.';
    }

    /*
      Se não houver música mas houver anúncio,
      não deixa a rádio morta.
    */

    const activeAds =
      getActiveAds();

    if (activeAds.length) {

      await playAdBlock();

      if (playing) {

        setTimeout(
          playNextMusic,
          1000
        );
      }

      return;
    }

    playing = false;

    syncPlayUi();

    return;
  }

  if (
    radioIndex >=
    songs.length
  ) {

    radioIndex = 0;
  }

  const media =
    songs[radioIndex++];

  const url =
    mediaUrl(media);

  if (!url) {

    setTimeout(
      playNextMusic,
      700
    );

    return;
  }

  if (radioAudio) {

    try {
      radioAudio.pause();
    } catch {}
  }

  radioAudio =
    new Audio(url);

  radioAudio.volume =
    musicVolume();

  const title =
    document.getElementById(
      'nowTitle'
    );

  const subtitle =
    document.getElementById(
      'nowSub'
    );

  if (title) {

    title.textContent =
      media.name ||
      'Música';
  }

  if (subtitle) {

    subtitle.textContent =
      '🎵 ' +
      (
        currentPlaylist()?.name ||
        'Playlist'
      );
  }

  radioAudio.onended =
    async () => {

      if (!playing) return;

      if (pendingPlaylistId) {

        selectedPlaylistId =
          pendingPlaylistId;

        pendingPlaylistId = '';

        radioIndex = 0;

        await savePlaylistChoice(
          selectedPlaylistId
        );
      }

      await playAdBlock();

      if (playing) {

        playNextMusic();
      }
    };

  radioAudio.onerror =
    () => {

      if (playing) {

        setTimeout(
          playNextMusic,
          800
        );
      }
    };

  try {

    await radioAudio.play();

  } catch (error) {

    console.error(error);

    playing = false;

    syncPlayUi();

    alert(
      'Clique novamente em INICIAR RÁDIO.'
    );
  }
}

/* =========================================================
   BLOCO DE ANÚNCIOS
========================================================= */

function getActiveAds() {

  const now =
    Date.now();

  return ads.filter(
    ad =>
      !ad.paused &&
      (
        !ad.exp ||
        ad.exp > now
      )
  );
}

function adsPerBlock() {

  const field =
    document.getElementById(
      'adsPerBlock'
    );

  const value =
    Number(
      field?.value ||
      localStorage.getItem(
        capClientKey(
          'ads_per_block'
        )
      ) ||
      3
    );

  return Math.max(
    1,
    Math.min(
      20,
      value
    )
  );
}

let adCursor = 0;

async function playAdBlock() {

  if (!playing) return;

  const active =
    getActiveAds();

  if (!active.length) {
    return;
  }

  const quantity =
    Math.min(
      adsPerBlock(),
      active.length
    );

  const block = [];

  for (
    let i = 0;
    i < quantity;
    i++
  ) {

    if (
      adCursor >=
      active.length
    ) {
      adCursor = 0;
    }

    block.push(
      active[adCursor++]
    );
  }

  for (
    const ad of block
  ) {

    if (!playing) break;

    await playSingleAd(ad);
  }
}

async function playSingleAd(ad) {

  if (
    !ad ||
    !ad.audioKey
  ) {
    return;
  }

  try {

    const blob =
      await getAdBlob(
        ad.audioKey
      );

    if (!blob) {
      return;
    }

    const url =
      URL.createObjectURL(blob);

    await new Promise(
      resolve => {

        spokenAudio =
          new Audio(url);

        spokenAudio.volume = 1;

        const title =
          document.getElementById(
            'nowTitle'
          );

        const subtitle =
          document.getElementById(
            'nowSub'
          );

        if (title) {

          title.textContent =
            ad.top
              ? '🔥 TOP DO DIA'
              : ad.label ||
                'Anúncio';
        }

        if (subtitle) {

          subtitle.textContent =
            ad.voice || '';
        }

        spokenAudio.onended =
          () => {

            URL.revokeObjectURL(
              url
            );

            resolve();
          };

        spokenAudio.onerror =
          () => {

            URL.revokeObjectURL(
              url
            );

            resolve();
          };

        spokenAudio.play()
          .catch(() => {

            URL.revokeObjectURL(
              url
            );

            resolve();
          });
      }
    );

  } catch (error) {

    console.warn(
      'Erro anúncio:',
      error
    );
  }
}

/* =========================================================
   BOTÃO RÁDIO
========================================================= */

async function toggleRadio() {

  if (!capClientReady) {
    return;
  }

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

    syncPlayUi();

    const title =
      document.getElementById(
        'nowTitle'
      );

    const subtitle =
      document.getElementById(
        'nowSub'
      );

    if (title) {
      title.textContent =
        'Rádio pausada';
    }

    if (subtitle) {

      subtitle.textContent =
        'Inicie quando quiser';
    }

    return;
  }

  if (!playlists.length) {

    await loadOnlineRadio();
  }

  const songs =
    currentPlaylistSongs();

  const activeAds =
    getActiveAds();

  if (
    !songs.length &&
    !activeAds.length
  ) {

    alert(
      playlists.length
        ? 'A playlist está sem músicas e não há anúncios ativos.'
        : 'Nenhuma playlist disponível no ADM.'
    );

    return;
  }

  playing = true;

  syncPlayUi();

  if (songs.length) {

    playNextMusic();

  } else {

    await playAdBlock();

    if (playing) {

      setTimeout(
        async () => {

          if (!playing) return;

          await playAdBlock();

        },
        1000
      );
    }
  }
}

/* =========================================================
   ABAS
========================================================= */

function bindTabs() {

  $$('.tab').forEach(
    button => {

      button.onclick =
        () => {

          $$('.tab')
            .forEach(
              item =>
                item.classList
                  .remove('active')
            );

          $$('.page')
            .forEach(
              item =>
                item.classList
                  .remove('active')
            );

          button.classList.add(
            'active'
          );

          const page =
            document.getElementById(
              button.dataset.tab
            );

          if (page) {

            page.classList.add(
              'active'
            );
          }
        };
    }
  );
}

/* =========================================================
   EVENTOS
========================================================= */

function bindEvents() {

  const loginButton =
    document.getElementById(
      'enter'
    );

  if (loginButton) {

    loginButton.onclick =
      loginPlayer;
  }

  const code =
    document.getElementById(
      'code'
    );

  if (code) {

    code.addEventListener(
      'input',
      () => {

        code.value =
          code.value
            .replace(/\D/g, '')
            .slice(0, 6);
      }
    );

    code.addEventListener(
      'keydown',
      event => {

        if (
          event.key === 'Enter'
        ) {

          event.preventDefault();

          loginPlayer();
        }
      }
    );
  }

  const create =
    document.getElementById(
      'suggest'
    );

  if (create) {

    create.onclick =
      createTexts;
  }

  const top =
    document.getElementById(
      'topDay'
    );

  if (top) {

    top.onclick =
      toggleTop;
  }

  const clear =
    document.getElementById(
      'clearProduct'
    );

  if (clear) {

    clear.onclick =
      () => {

        selectedProduct = '';

        const selected =
          document.getElementById(
            'selectedProduct'
          );

        if (selected) {

          selected.classList.add(
            'hidden'
          );
        }

        const price =
          document.getElementById(
            'price'
          );

        if (price) {
          price.value = '';
        }

        $$('#favorites button')
          .forEach(
            button =>
              button.classList
                .remove('selected')
          );
      };
  }

  const reset =
    document.getElementById(
      'resetProducts'
    );

  if (reset) {

    reset.onclick =
      () => {

        products =
          catalogForRamo(
            store.ramo
          );

        saveProducts();
      };
  }

  const audioButtons = [
    document.getElementById(
      'generateAudioV24'
    ),
    document.getElementById(
      'generateAudioV22'
    ),
    document.querySelector(
      '[data-gen="1"]'
    )
  ].filter(Boolean);

  audioButtons.forEach(
    button => {

      button.onclick =
        generateAndQueue;
    }
  );

  const desist =
    document.getElementById(
      'desistV25'
    );

  if (desist) {

    desist.onclick =
      desistCreation;
  }

  const play =
    document.getElementById(
      'play'
    );

  if (play) {

    play.onclick =
      toggleRadio;
  }

  const musicVol =
    document.getElementById(
      'musicVol'
    );

  if (musicVol) {

    const saved =
      localStorage.getItem(
        'cap_musicVol'
      );

    if (saved !== null) {
      musicVol.value = saved;
    }

    musicVol.addEventListener(
      'input',
      () => {

        localStorage.setItem(
          'cap_musicVol',
          musicVol.value
        );

        if (radioAudio) {

          radioAudio.volume =
            musicVolume();
        }
      }
    );
  }

  const bedVol =
    document.getElementById(
      'bedVol'
    );

  if (bedVol) {

    const saved =
      localStorage.getItem(
        'cap_bedVol'
      );

    if (saved !== null) {
      bedVol.value = saved;
    }

    bedVol.addEventListener(
      'input',
      () => {

        localStorage.setItem(
          'cap_bedVol',
          bedVol.value
        );

        if (bedAudio) {

          bedAudio.volume =
            bedVolume();
        }
      }
    );
  }

  const adsBlock =
    document.getElementById(
      'adsPerBlock'
    );

  if (adsBlock) {

    const saved =
      localStorage.getItem(
        capClientKey(
          'ads_per_block'
        )
      );

    if (saved) {
      adsBlock.value = saved;
    }

    adsBlock.addEventListener(
      'change',
      () => {

        localStorage.setItem(
          capClientKey(
            'ads_per_block'
          ),
          adsBlock.value
        );

        pushClientState();
      }
    );
  }

  bindPrice();

  bindTabs();
}

/* =========================================================
   COMPATIBILIDADE COM NOMES ANTIGOS
========================================================= */

window.chooseThemeV11 =
  choosePlaylist;

window.renderThemesV11 =
  renderPlaylists;

window.updateAdmStatus =
  updateRadioStatus;

window.playNextAdmMusic =
  playNextMusic;

window.capLoadOnlinePlaylistsV53 =
  loadOnlineRadio;

window.capGenerateQueueV24 =
  generateAndQueue;

window.capGenerateAndQueueV22 =
  generateAndQueue;

window.createTexts =
  createTexts;

window.applyAdmStore =
  applyAdmStore;

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  () => {

    bindEvents();

    syncPlayUi();

    updateCreateUi();

    const login =
      document.getElementById(
        'login'
      );

    const app =
      document.getElementById(
        'app'
      );

    if (login) {

      login.classList.remove(
        'hidden'
      );
    }

    if (app) {

      app.classList.add(
        'hidden'
      );
    }

    const code =
      document.getElementById(
        'code'
      );

    if (code) {
      code.focus();
    }
  }
);

/* =========================================================
   ATUALIZAÇÃO ONLINE
========================================================= */

setInterval(
  async () => {

    if (!capClientReady) {
      return;
    }

    try {

      await loadOnlineRadio();

    } catch {}
  },
  60000
);
