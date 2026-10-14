/**
 * AERO-HUNTER: Lógica Frontend Reativa
 * Integração com API REST, gerador de deep links, modal dos 5 prompts e SQLite.
 */

// Estado da Aplicação
const state = {
  origins: {},
  regions: {},
  destinations: [],
  currentOrigin: 'RIO',
  currentRegion: 'europa',
  depDate: '',
  retDate: '',
  tripType: 'roundtrip',
  searchFilter: '',
  alerts: [],
  activePromptId: 1,
  currentHackerPayload: null,
  activeAlertModalDest: null
};

// Elementos DOM
const dom = {
  selectOrigin: document.getElementById('selectOrigin'),
  originHint: document.getElementById('originHint'),
  inputDepDate: document.getElementById('inputDepDate'),
  inputRetDate: document.getElementById('inputRetDate'),
  groupReturnDate: document.getElementById('groupReturnDate'),
  radioRoundtrip: document.getElementById('radioRoundtrip'),
  radioOneway: document.getElementById('radioOneway'),
  btnExploreGoogle: document.getElementById('btnExploreGoogle'),
  regionTabs: document.querySelectorAll('.tab-btn'),
  inputSearchFilter: document.getElementById('inputSearchFilter'),
  bannerFlag: document.getElementById('bannerFlag'),
  bannerTitle: document.getElementById('bannerTitle'),
  bannerDesc: document.getElementById('bannerDesc'),
  benchOpp: document.getElementById('benchOpp'),
  benchFair: document.getElementById('benchFair'),
  benchExp: document.getElementById('benchExp'),
  destinationsGrid: document.getElementById('destinationsGrid'),
  alertCountBadge: document.getElementById('alertCountBadge'),
  
  // Modais
  modalTravelHacker: document.getElementById('modalTravelHacker'),
  modalHackerTitle: document.getElementById('modalHackerTitle'),
  hackerContentArea: document.getElementById('hackerContentArea'),
  hackerQuickLinks: document.getElementById('hackerQuickLinks'),
  hackerTabBtns: document.querySelectorAll('.hacker-tab-btn'),
  btnCloseHackerModal: document.getElementById('btnCloseHackerModal'),
  btnDismissHacker: document.getElementById('btnDismissHacker'),

  modalAlerts: document.getElementById('modalAlerts'),
  alertsList: document.getElementById('alertsList'),
  btnOpenAlerts: document.getElementById('btnOpenAlerts'),
  btnCloseAlertsModal: document.getElementById('btnCloseAlertsModal'),
  btnDismissAlerts: document.getElementById('btnDismissAlerts'),
  btnCheckAlertsNow: document.getElementById('btnCheckAlertsNow'),

  modalCreateAlert: document.getElementById('modalCreateAlert'),
  createAlertTitle: document.getElementById('createAlertTitle'),
  formCreateAlert: document.getElementById('formCreateAlert'),
  alertTargetPrice: document.getElementById('alertTargetPrice'),
  alertTargetHint: document.getElementById('alertTargetHint'),
  alertNotes: document.getElementById('alertNotes'),
  btnCloseCreateAlertModal: document.getElementById('btnCloseCreateAlertModal'),

  modalAlternatives: document.getElementById('modalAlternatives'),
  btnOpenAlternatives: document.getElementById('btnOpenAlternatives'),
  btnCloseAlternativesModal: document.getElementById('btnCloseAlternativesModal'),
  btnDismissAlternatives: document.getElementById('btnDismissAlternatives'),
  matrixListContent: document.getElementById('matrixListContent'),
  calcDiffPassagem: document.getElementById('calcDiffPassagem'),
  calcNumPessoas: document.getElementById('calcNumPessoas'),
  calcCustoTransporte: document.getElementById('calcCustoTransporte'),
  calcSaldoReal: document.getElementById('calcSaldoReal'),
  calcVeredito: document.getElementById('calcVeredito'),

  modalSeasonality: document.getElementById('modalSeasonality'),
  btnOpenSeasonality: document.getElementById('btnOpenSeasonality'),
  btnCloseSeasonalityModal: document.getElementById('btnCloseSeasonalityModal'),
  btnDismissSeasonality: document.getElementById('btnDismissSeasonality'),
  seasonalityBody: document.getElementById('seasonalityBody'),

  // Live Radar & Madrugadão
  hudMadrugadaoBadge: document.getElementById('hudMadrugadaoBadge'),
  turboStatusText: document.getElementById('turboStatusText'),
  btnToggleMadrugadaoTurbo: document.getElementById('btnToggleMadrugadaoTurbo'),
  btnRefreshRadarNow: document.getElementById('btnRefreshRadarNow'),
  liveTickerContent: document.getElementById('liveTickerContent'),
  madrugadaoDealsGrid: document.getElementById('madrugadaoDealsGrid'),

  toastNotification: document.getElementById('toastNotification'),
  toastMessage: document.getElementById('toastMessage')
};

// Inicialização de Datas Padrão (~35 dias à frente e volta 14 dias depois)
function initDefaultDates() {
  const now = new Date();
  const dep = new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000);
  const ret = new Date(now.getTime() + 49 * 24 * 60 * 60 * 1000);

  const formatDate = (d) => d.toISOString().split('T')[0];
  state.depDate = formatDate(dep);
  state.retDate = formatDate(ret);

  dom.inputDepDate.value = state.depDate;
  dom.inputRetDate.value = state.retDate;
}

// Inicialização Principal
async function initApp() {
  initDefaultDates();
  setupEventListeners();

  try {
    await Promise.all([
      fetchOrigins(),
      fetchRegions(),
      fetchDestinations(),
      fetchAlerts(),
      fetchLiveRadar()
    ]);

    // Loop de monitoramento ao vivo (atualiza a cada 10 segundos)
    setInterval(fetchLiveRadar, 10000);
  } catch (err) {
    console.error("Erro na inicialização:", err);
  }
}

// Event Listeners
function setupEventListeners() {
  // Live Radar Controls
  dom.btnToggleMadrugadaoTurbo.addEventListener('click', handleToggleMadrugadaoTurbo);
  dom.btnRefreshRadarNow.addEventListener('click', () => {
    fetchLiveRadar();
    showToast('📡 Radar ao vivo atualizado!');
  });
  // Origem
  dom.selectOrigin.addEventListener('change', (e) => {
    state.currentOrigin = e.target.value;
    updateOriginHint();
    renderDestinations();
  });

  // Datas
  dom.inputDepDate.addEventListener('change', (e) => {
    state.depDate = e.target.value;
    if (state.depDate > state.retDate && state.tripType === 'roundtrip') {
      const nextWeek = new Date(new Date(state.depDate).getTime() + 14 * 24 * 60 * 60 * 1000);
      state.retDate = nextWeek.toISOString().split('T')[0];
      dom.inputRetDate.value = state.retDate;
    }
  });

  dom.inputRetDate.addEventListener('change', (e) => {
    state.retDate = e.target.value;
  });

  // Tipo de Viagem
  dom.radioRoundtrip.addEventListener('change', () => {
    state.tripType = 'roundtrip';
    dom.groupReturnDate.style.display = 'flex';
  });

  dom.radioOneway.addEventListener('change', () => {
    state.tripType = 'oneway';
    dom.groupReturnDate.style.display = 'none';
  });

  // Botão Explorar Google Flights
  dom.btnExploreGoogle.addEventListener('click', () => {
    const regName = state.regions[state.currentRegion]?.name || 'Europa';
    const query = encodeURIComponent(`Voos de ${state.currentOrigin} para ${regName}`);
    window.open(`https://www.google.com/travel/explore?q=${query}&curr=BRL&hl=pt-BR`, '_blank');
  });

  // Tabs de Regiões
  dom.regionTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      dom.regionTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentRegion = tab.dataset.region;
      updateRegionBanner();
      renderDestinations();
    });
  });

  // Filtro de Busca
  dom.inputSearchFilter.addEventListener('input', (e) => {
    state.searchFilter = e.target.value.toLowerCase().trim();
    renderDestinations();
  });

  // Modais de Controle
  dom.btnOpenAlerts.addEventListener('click', openAlertsModal);
  dom.btnCloseAlertsModal.addEventListener('click', () => dom.modalAlerts.classList.remove('active'));
  dom.btnDismissAlerts.addEventListener('click', () => dom.modalAlerts.classList.remove('active'));
  dom.btnCheckAlertsNow.addEventListener('click', handleCheckAlertsNow);

  dom.btnCloseCreateAlertModal.addEventListener('click', () => dom.modalCreateAlert.classList.remove('active'));
  dom.formCreateAlert.addEventListener('submit', handleSaveAlert);

  dom.btnOpenAlternatives.addEventListener('click', openAlternativesModal);
  dom.btnCloseAlternativesModal.addEventListener('click', () => dom.modalAlternatives.classList.remove('active'));
  dom.btnDismissAlternatives.addEventListener('click', () => dom.modalAlternatives.classList.remove('active'));

  dom.btnOpenSeasonality.addEventListener('click', openSeasonalityModal);
  dom.btnCloseSeasonalityModal.addEventListener('click', () => dom.modalSeasonality.classList.remove('active'));
  dom.btnDismissSeasonality.addEventListener('click', () => dom.modalSeasonality.classList.remove('active'));

  dom.btnCloseHackerModal.addEventListener('click', () => dom.modalTravelHacker.classList.remove('active'));
  dom.btnDismissHacker.addEventListener('click', () => dom.modalTravelHacker.classList.remove('active'));

  // Tabs do Hacker Modal
  dom.hackerTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.hackerTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activePromptId = parseInt(btn.dataset.promptId, 10);
      renderActivePrompt();
    });
  });

  // Calculadora de Trade-off de Aeroporto
  [dom.calcDiffPassagem, dom.calcNumPessoas, dom.calcCustoTransporte].forEach(input => {
    input.addEventListener('input', recomputeAirportTradeoff);
  });
}

// Atualiza dica de origem
function updateOriginHint() {
  const orig = state.origins[state.currentOrigin];
  if (orig && orig.description) {
    dom.originHint.textContent = orig.description;
  }
}

// Fetch de Origens
async function fetchOrigins() {
  const res = await fetch('/api/origins');
  const data = await res.json();
  state.origins = data.origins || {};
  updateOriginHint();
}

// Fetch de Regiões
async function fetchRegions() {
  const res = await fetch('/api/regions');
  const data = await res.json();
  state.regions = data.regions || {};
  updateRegionBanner();
}

// Fetch de Destinos
async function fetchDestinations() {
  const res = await fetch('/api/destinations');
  const data = await res.json();
  state.destinations = data.destinations || [];
  updateRegionCounters();
  renderDestinations();
}

// Atualiza Contadores nas Abas
function updateRegionCounters() {
  const counts = { europa: 0, eua: 0, nordeste: 0, sul: 0, america_do_sul: 0 };
  state.destinations.forEach(d => {
    if (counts[d.region] !== undefined) counts[d.region]++;
  });

  document.getElementById('countEuropa').textContent = counts.europa;
  document.getElementById('countEua').textContent = counts.eua;
  document.getElementById('countNordeste').textContent = counts.nordeste;
  document.getElementById('countSul').textContent = counts.sul;
  document.getElementById('countAmericaDoSul').textContent = counts.america_do_sul;
}

// Atualiza Banner Superior da Região
function updateRegionBanner() {
  const reg = state.regions[state.currentRegion];
  if (!reg) return;

  dom.bannerFlag.textContent = reg.flag;
  dom.bannerTitle.textContent = `Destinos em: ${reg.name}`;
  dom.bannerDesc.textContent = reg.description;

  // Atualiza faixas de benchmark de referência da região
  const benchmarksByRegion = {
    europa: { opp: "R$ 3.100 - R$ 3.800", fair: "R$ 4.200 - R$ 5.500", exp: "> R$ 6.200" },
    eua: { opp: "R$ 2.400 - R$ 3.200", fair: "R$ 3.500 - R$ 4.800", exp: "> R$ 5.500" },
    nordeste: { opp: "R$ 490 - R$ 750", fair: "R$ 820 - R$ 1.250", exp: "> R$ 1.500" },
    sul: { opp: "R$ 350 - R$ 550", fair: "R$ 600 - R$ 950", exp: "> R$ 1.200" },
    america_do_sul: { opp: "R$ 1.100 - R$ 1.600", fair: "R$ 1.800 - R$ 2.500", exp: "> R$ 3.100" }
  };

  const bm = benchmarksByRegion[state.currentRegion] || benchmarksByRegion.europa;
  dom.benchOpp.textContent = bm.opp;
  dom.benchFair.textContent = bm.fair;
  dom.benchExp.textContent = bm.exp;
}

// Renderiza Cards de Destinos
function renderDestinations() {
  const grid = dom.destinationsGrid;
  grid.innerHTML = '';

  const filtered = state.destinations.filter(d => {
    const matchesRegion = d.region === state.currentRegion;
    if (!matchesRegion) return false;

    if (!state.searchFilter) return true;
    const q = state.searchFilter;
    return (
      d.name.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      d.country.toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="glass-card" style="grid-column: 1 / -1; padding: 3rem; text-align: center;">
        <p style="font-size: 1.2rem; color: var(--text-muted);">Nenhum destino encontrado com o filtro "${state.searchFilter}".</p>
      </div>
    `;
    return;
  }

  filtered.forEach(dest => {
    const card = createFlightCard(dest);
    grid.appendChild(card);
  });
}

// Cria Elemento de Card de Voo
function createFlightCard(dest) {
  const card = document.createElement('div');
  card.className = 'flight-card glass-card';

  const bm = dest.benchmarks || { opportunity: 2000, fair: 3500, expensive: 5500 };
  const airlinesStr = dest.airlines ? dest.airlines.slice(0, 3).join(', ') : 'Principais Cias';

  card.innerHTML = `
    <div class="card-top">
      <div class="iata-badge">${dest.code}</div>
      <div class="dest-identity">
        <h3 class="dest-city">${dest.name}</h3>
        <p class="dest-country">${dest.country}</p>
      </div>
      ${dest.direct_flights ? '<span class="direct-tag">Direto / Conexão</span>' : '<span class="direct-tag" style="color: #fbbf24; border-color: rgba(251,191,36,0.3);">Conexão</span>'}
    </div>

    <div class="card-airlines">
      <span>✈️ Cias:</span>
      <span>${airlinesStr}</span>
    </div>

    <!-- Bloco de Preço com Ação Principal Explícita (DADOS REAIS / BENCHMARK OFICIAL) -->
    <div class="card-price-hero" data-dest="${dest.code}">
      <div class="price-header-row">
        <span class="price-sub">Faixa Real de Mercado:</span>
        <span class="price-status-badge badge-fair">Benchmark Oficial</span>
      </div>
      <div class="price-main-row">
        <div class="price-amount" id="priceAmount-${dest.code}" style="font-size: 1.25rem;">
          R$ ${bm.opportunity.toLocaleString('pt-BR')} <span>a</span> R$ ${bm.fair.toLocaleString('pt-BR')}
        </div>
        <button class="btn btn-primary btn-open-best-fare" data-dest="${dest.code}" title="Clique aqui para abrir exatamente esta oferta em tempo real no Google Flights">
          🚀 VER OFERTA AO VIVO ➔
        </button>
      </div>
      <div class="price-source-hint" id="priceHint-${dest.code}">
        ⚡ <strong>Piso Promocional Verificado:</strong> a partir de R$ ${bm.opportunity.toLocaleString('pt-BR')}. Clique para abrir as tarifas ao vivo no Google Flights.
      </div>
    </div>

    <div class="mini-benchmark-bar">
      <div class="bar-labels">
        <span>Oportunidade: &le; R$ ${bm.opportunity}</span>
        <span>Médio: R$ ${bm.fair}</span>
        <span>Caro: &gt; R$ ${bm.expensive}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width: 50%;"></div>
      </div>
    </div>

    ${dest.travel_hack ? `
      <div class="card-hack-tip">
        <strong>💡 Dica Hacker:</strong> ${dest.travel_hack}
      </div>
    ` : ''}

    <!-- 7 Motores de Busca Estratégicos -->
    <div class="engines-section-header">
      <span>Comparar nos 7 Buscadores Oficiais (100% Real):</span>
    </div>

    <div class="card-engines-grid">
      <button class="btn btn-engine btn-sm btn-action-gf" data-dest="${dest.code}" title="Mais rápido com calendário de datas">
        ⚡ Google
      </button>
      <button class="btn btn-engine btn-sm btn-action-sky" data-dest="${dest.code}" title="Aeroportos próximos e voos low-cost">
        ✈️ Skyscanner
      </button>
      <button class="btn btn-engine btn-sm btn-action-kayak" data-dest="${dest.code}" title="Agregador global com filtros de hacker fare">
        🔍 Kayak
      </button>
      <button class="btn btn-engine btn-sm btn-action-momondo" data-dest="${dest.code}" title="Acha tarifas de OTAs alternativas">
        🟣 Momondo
      </button>
      <button class="btn btn-engine btn-sm btn-action-decolar" data-dest="${dest.code}" title="Parcelamento em até 10-12x sem juros em reais">
        🔵 Decolar
      </button>
      <button class="btn btn-engine btn-sm btn-action-kiwi" data-dest="${dest.code}" title="Especialista em rotas ocultas e virtual interlining">
        🥝 Kiwi.com
      </button>
      <button class="btn btn-engine btn-sm btn-action-promo" data-dest="${dest.code}" title="Consolidadora nacional com desconto no PIX">
        🏷️ Promo
      </button>
    </div>

    <div class="card-actions-subrow">
      <button class="btn btn-hacker btn-sm btn-action-hacker" data-dest="${dest.code}">
        🧠 Travel Hacker (5 Prompts)
      </button>
      <button class="btn btn-secondary btn-sm btn-live-scrape" data-dest="${dest.code}" title="Executa consulta real via Playwright no Google Flights">
        🤖 Cotação Playwright
      </button>
    </div>
  `;

  // Bind do Botão Principal "VER OFERTA AO VIVO"
  card.querySelector('.btn-open-best-fare').addEventListener('click', (e) => {
    e.stopPropagation();
    openDirectLink('google', dest.code);
  });

  // Clicar no bloco do preço também abre direto a oferta
  card.querySelector('.card-price-hero').addEventListener('click', () => {
    openDirectLink('google', dest.code);
  });

  // Cotação sob demanda via Playwright real
  card.querySelector('.btn-live-scrape').addEventListener('click', async (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = '⏳ Coletando...';

    try {
      const res = await fetch('/api/live-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: state.currentOrigin,
          dest: dest.code,
          departure_date: state.depDate,
          return_date: state.tripType === 'roundtrip' ? state.retDate : ''
        })
      });

      const data = await res.json();
      if (data.status === 'success' && data.data?.lowest_price) {
        const p = data.data.lowest_price;
        const priceEl = document.getElementById(`priceAmount-${dest.code}`);
        const hintEl = document.getElementById(`priceHint-${dest.code}`);
        if (priceEl) priceEl.innerHTML = `<span style="color: #34d399; font-size: 1.35rem; font-weight: 800;">R$ ${p.toLocaleString('pt-BR')}</span> <span style="font-size: 0.78rem; color: #38bdf8;">(Ao Vivo)</span>`;
        if (hintEl) hintEl.innerHTML = `✅ <strong>Cotação Real Verificada via Playwright</strong> às ${new Date().toLocaleTimeString()} no Google Flights!`;
        showToast(`✅ Preço real extraído: R$ ${p.toLocaleString('pt-BR')} para ${dest.name}!`);
      } else {
        showToast('Não foi possível extrair a cotação imediata. Clique em "Google" para ver no navegador.');
      }
    } catch (err) {
      showToast('Erro ao consultar cotação ao vivo.');
    } finally {
      btn.disabled = false;
      btn.textContent = '🤖 Cotação Playwright';
    }
  });

  // Bind dos 7 Buscadores
  card.querySelector('.btn-action-gf').addEventListener('click', () => openDirectLink('google', dest.code));
  card.querySelector('.btn-action-sky').addEventListener('click', () => openDirectLink('skyscanner', dest.code));
  card.querySelector('.btn-action-kayak').addEventListener('click', () => openDirectLink('kayak', dest.code));
  card.querySelector('.btn-action-momondo').addEventListener('click', () => openDirectLink('momondo', dest.code));
  card.querySelector('.btn-action-decolar').addEventListener('click', () => openDirectLink('decolar', dest.code));
  card.querySelector('.btn-action-kiwi').addEventListener('click', () => openDirectLink('kiwi', dest.code));
  card.querySelector('.btn-action-promo').addEventListener('click', () => openDirectLink('passagenspromo', dest.code));

  // Botões de Suporte
  card.querySelector('.btn-action-hacker').addEventListener('click', () => openTravelHackerModal(dest.code));

  return card;
}

// Abertura Direta de Deep Links com 1 Clique nos 7 Buscadores
function openDirectLink(provider, destCode) {
  const orig = state.currentOrigin;
  const dep = state.depDate;
  const ret = state.tripType === 'roundtrip' ? state.retDate : null;

  let url = '';
  if (provider === 'google') {
    const q = ret ? `voos de ${orig} para ${destCode} de ${dep} a ${ret}` : `voos de ${orig} para ${destCode} em ${dep}`;
    url = `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}&curr=BRL&hl=pt-BR`;
  } else if (provider === 'skyscanner') {
    const formatSkyDate = (d) => d.replace(/-/g, '').substring(2);
    const depSky = formatSkyDate(dep);
    if (ret) {
      const retSky = formatSkyDate(ret);
      url = `https://www.skyscanner.com.br/transporte/voos/${orig.toLowerCase()}/${destCode.toLowerCase()}/${depSky}/${retSky}/?adultsv2=1&cabinclass=economy&childrenv2=&inboundalts=true&outboundalts=true&preferdirects=false&ref=home&rtn=1`;
    } else {
      url = `https://www.skyscanner.com.br/transporte/voos/${orig.toLowerCase()}/${destCode.toLowerCase()}/${depSky}/?adultsv2=1&cabinclass=economy&childrenv2=&inboundalts=true&outboundalts=true&preferdirects=false&ref=home&rtn=0`;
    }
  } else if (provider === 'kayak') {
    url = ret ? 
      `https://www.kayak.com.br/flights/${orig}-${destCode}/${dep}/${ret}?sort=bestflight_a` : 
      `https://www.kayak.com.br/flights/${orig}-${destCode}/${dep}?sort=bestflight_a`;
  } else if (provider === 'momondo') {
    url = ret ? 
      `https://www.momondo.com.br/flight-search/${orig}-${destCode}/${dep}/${ret}?sort=bestflight_a` : 
      `https://www.momondo.com.br/flight-search/${orig}-${destCode}/${dep}?sort=bestflight_a`;
  } else if (provider === 'decolar') {
    url = ret ? 
      `https://www.decolar.com/shop/flights/results/roundtrip/${orig}/${destCode}/${dep}/${ret}/1/0/0/NA/NA/NA/NA/NA?from=SB&di=1-0` : 
      `https://www.decolar.com/shop/flights/results/oneway/${orig}/${destCode}/${dep}/1/0/0/NA/NA/NA/NA/NA?from=SB&di=1-0`;
  } else if (provider === 'kiwi') {
    url = ret ? 
      `https://www.kiwi.com/br/search/results/${orig.toLowerCase()}/${destCode.toLowerCase()}/${dep}/${ret}?sortBy=price` : 
      `https://www.kiwi.com/br/search/results/${orig.toLowerCase()}/${destCode.toLowerCase()}/${dep}/no-return?sortBy=price`;
  } else if (provider === 'passagenspromo') {
    url = ret ? 
      `https://www.passagenspromo.com.br/passagens-aereas/busca?origem=${orig}&destino=${destCode}&ida=${dep}&volta=${ret}&adultos=1&criancas=0&bebes=0` : 
      `https://www.passagenspromo.com.br/passagens-aereas/busca?origem=${orig}&destino=${destCode}&ida=${dep}&adultos=1&criancas=0&bebes=0`;
  }

  if (url) {
    window.open(url, '_blank');
  }
}

// ================= TRAVEL HACKER MODAL (5 PROMPTS) =================
async function openTravelHackerModal(destCode) {
  dom.modalHackerTitle.textContent = `Carregando Travel Hacker para ${state.currentOrigin} ➔ ${destCode}...`;
  dom.modalTravelHacker.classList.add('active');
  dom.hackerContentArea.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--accent-cyan);">Carregando os 5 Prompts Estratégicos...</div>`;

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: state.currentOrigin,
        dest: destCode,
        departure_date: state.depDate,
        return_date: state.retDate,
        trip_type: state.tripType
      })
    });

    const data = await res.json();
    state.currentHackerPayload = data;

    dom.modalHackerTitle.textContent = `Central Travel Hacker: ${data.origin.name} ➔ ${data.destination.name} (${data.destination.code})`;

    // Preenche botões de links rápidos no rodapé
    dom.hackerQuickLinks.innerHTML = `
      <a href="${data.links.google_flights}" target="_blank" class="btn btn-secondary btn-sm">⚡ Abrir no Google Flights</a>
      <a href="${data.links.skyscanner}" target="_blank" class="btn btn-secondary btn-sm">✈️ Abrir no Skyscanner</a>
      <a href="${data.links.kayak}" target="_blank" class="btn btn-secondary btn-sm">🔍 Abrir no Kayak</a>
    `;

    // Reseta para o prompt #1 e renderiza
    state.activePromptId = 1;
    dom.hackerTabBtns.forEach(b => b.classList.remove('active'));
    document.getElementById('hTab1').classList.add('active');
    renderActivePrompt();

  } catch (err) {
    dom.hackerContentArea.innerHTML = `<div style="color: #f43f5e; padding: 2rem;">Erro ao carregar dados do Travel Hacker.</div>`;
  }
}

function renderActivePrompt() {
  if (!state.currentHackerPayload) return;
  const pData = state.currentHackerPayload.hacker_prompts;
  const area = dom.hackerContentArea;
  area.innerHTML = '';

  let currentP = null;
  if (state.activePromptId === 1) currentP = pData.p1_ofertas_ocultas;
  else if (state.activePromptId === 2) currentP = pData.p2_alertas_inteligentes;
  else if (state.activePromptId === 3) currentP = pData.p3_datas_estrategicas;
  else if (state.activePromptId === 4) currentP = pData.p4_insider_secrets;
  else if (state.activePromptId === 5) currentP = pData.p5_aeroportos_alternativos;

  if (!currentP) return;

  const promptBox = document.createElement('div');
  promptBox.className = 'prompt-box';

  promptBox.innerHTML = `
    <div class="prompt-box-header">
      <span class="prompt-lang-tag">PROMPT PRONTO PARA USO</span>
      <div class="prompt-copy-btns">
        <button class="btn btn-accent btn-sm btn-copy-pt">📋 Copiar Prompt (PT)</button>
        ${currentP.prompt_en ? '<button class="btn btn-secondary btn-sm btn-copy-en">🌐 Copiar (EN)</button>' : ''}
      </div>
    </div>

    <div class="prompt-text" id="activePromptText">${escapeHtml(currentP.prompt_pt)}</div>
  `;

  // Botões de cópia
  promptBox.querySelector('.btn-copy-pt').addEventListener('click', () => {
    copyToClipboard(currentP.prompt_pt, 'Prompt em Português copiado para sua área de transferência!');
  });

  if (currentP.prompt_en) {
    promptBox.querySelector('.btn-copy-en').addEventListener('click', () => {
      copyToClipboard(currentP.prompt_en, 'Prompt in English copied to clipboard!');
    });
  }

  // Seção de Insights Adicionais Específicos do Prompt
  const insightsBox = document.createElement('div');
  insightsBox.className = 'prompt-insights';

  if (state.activePromptId === 1) {
    insightsBox.innerHTML = `
      <h4 class="insights-title">🎯 Táticas de Tarifas Escondidas para Esta Rota:</h4>
      <ul class="insights-list">
        ${currentP.suggested_tactics.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
      </ul>
    `;
  } else if (state.activePromptId === 2) {
    insightsBox.innerHTML = `
      <h4 class="insights-title">🔔 Gatilhos Recomendados de Monitoramento:</h4>
      <ul class="insights-list">
        ${currentP.action_plan.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
      </ul>
    `;
  } else if (state.activePromptId === 3) {
    const da = currentP.data_analysis;
    insightsBox.innerHTML = `
      <h4 class="insights-title">📅 Matriz de Economia por Datas:</h4>
      <ul class="insights-list">
        <li><strong>Melhores Dias para Voar:</strong> ${escapeHtml(da.dias_mais_baratos)} (economias de 20% a 35%).</li>
        <li><strong>Dias Mais Caros:</strong> ${escapeHtml(da.dias_mais_caros)} (alta demanda corporativa e lazer).</li>
        <li><strong>Antecedência Ideal de Compra:</strong> ${escapeHtml(da.antecedencia_ideal)}.</li>
        <li><strong>Regra Prática:</strong> ${escapeHtml(da.dica_sazonal)}</li>
      </ul>
    `;
  } else if (state.activePromptId === 4) {
    insightsBox.innerHTML = `
      <h4 class="insights-title">🤫 Segredos de Ex-Funcionário de Companhia Aérea:</h4>
      <ul class="insights-list">
        ${currentP.secrets.map(s => `
          <li>
            <strong>${escapeHtml(s.titulo)}:</strong> ${escapeHtml(s.detalhes)}
          </li>
        `).join('')}
      </ul>
    `;
  } else if (state.activePromptId === 5) {
    let origHtml = currentP.origin_alternatives.map(o => `
      <li>
        <strong>${escapeHtml(o.aeroporto)}:</strong> Economia média de ${escapeHtml(o.economia_esperada)}.
        Translado: ${escapeHtml(o.custo_transporte)} (${escapeHtml(o.tempo_adicional)}).
        <em>Veredito: ${escapeHtml(o.veredito)}</em>
      </li>
    `).join('');

    let destHtml = currentP.destination_alternatives.map(d => `
      <li><strong>${escapeHtml(d.nome)} (${escapeHtml(d.codigo)}):</strong> Alternativa no país de destino para pesquisar vôos em conjunto.</li>
    `).join('');

    insightsBox.innerHTML = `
      <h4 class="insights-title">🔄 Análise de Aeroportos Próximos:</h4>
      <ul class="insights-list">
        ${origHtml || '<li>A rota atual já utiliza o aeroporto metropolitano principal.</li>'}
        ${destHtml}
      </ul>
    `;
  }

  area.appendChild(promptBox);
  area.appendChild(insightsBox);
}

// ================= MODAL DE CRIAÇÃO DE ALERTA =================
function openCreateAlertModal(dest) {
  state.activeAlertModalDest = dest;
  dom.createAlertTitle.textContent = `Monitorar: ${state.currentOrigin} ➔ ${dest.name} (${dest.code})`;
  
  const oppPrice = dest.benchmarks?.opportunity || 2500;
  dom.alertTargetPrice.value = oppPrice;
  dom.alertTargetHint.textContent = `Preço Oportunidade recomendado para esta rota: até R$ ${oppPrice.toLocaleString('pt-BR')}.`;
  dom.modalCreateAlert.classList.add('active');
}

async function handleSaveAlert(e) {
  e.preventDefault();
  if (!state.activeAlertModalDest) return;

  const target = parseFloat(dom.alertTargetPrice.value);
  const notes = dom.alertNotes.value;

  try {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin_code: state.currentOrigin,
        dest_code: state.activeAlertModalDest.code,
        departure_date: state.depDate,
        return_date: state.tripType === 'roundtrip' ? state.retDate : null,
        target_price: target,
        notes: notes
      })
    });

    const data = await res.json();
    dom.modalCreateAlert.classList.remove('active');
    dom.alertNotes.value = '';
    showToast(`✅ Alerta para ${state.activeAlertModalDest.name} salvo com sucesso!`);
    await fetchAlerts();
  } catch (err) {
    showToast(`❌ Erro ao salvar alerta.`);
  }
}

// ================= MODAL DE ALERTAS SALVOS (SQLITE) =================
async function fetchAlerts() {
  try {
    const res = await fetch('/api/alerts');
    const data = await res.json();
    state.alerts = data.alerts || [];
    dom.alertCountBadge.textContent = state.alerts.length;
    renderAlertsList();
  } catch (err) {
    console.error("Erro ao buscar alertas:", err);
  }
}

function openAlertsModal() {
  fetchAlerts();
  dom.modalAlerts.classList.add('active');
}

function renderAlertsList() {
  const container = dom.alertsList;
  container.innerHTML = '';

  if (state.alerts.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Nenhum alerta cadastrado ainda. Clique em '🔔 Monitorar' em qualquer card de voo para criar um!</div>`;
    return;
  }

  state.alerts.forEach(alert => {
    const item = document.createElement('div');
    item.className = 'alert-item';

    const isTriggered = alert.current_price && alert.current_price <= alert.target_price;
    const currentClass = isTriggered ? 'alert-current triggered' : 'alert-current';

    item.innerHTML = `
      <div class="alert-info">
        <span class="alert-route">${alert.origin_code} ➔ ${alert.dest_name} (${alert.dest_code})</span>
        <span class="alert-dates">Datas: ${alert.departure_date} ${alert.return_date ? 'até ' + alert.return_date : '(Só Ida)'}</span>
        ${alert.notes ? `<span style="font-size: 0.74rem; color: var(--accent-amber);">${escapeHtml(alert.notes)}</span>` : ''}
      </div>

      <div class="alert-prices">
        <div style="display: flex; flex-direction: column; text-align: right;">
          <span class="alert-target">Alvo: &le; R$ ${alert.target_price.toLocaleString('pt-BR')}</span>
          <span class="${currentClass}">
            ${alert.current_price ? 'R$ ' + alert.current_price.toLocaleString('pt-BR') : 'Aguardando'}
            ${isTriggered ? '🔥 ALERTA!' : ''}
          </span>
        </div>

        <button class="btn btn-secondary btn-sm btn-delete-alert" style="color: #f43f5e; border-color: rgba(244,63,94,0.3);">
          🗑️
        </button>
      </div>
    `;

    item.querySelector('.btn-delete-alert').addEventListener('click', async () => {
      if (confirm(`Deseja remover o alerta para ${alert.dest_name}?`)) {
        await fetch(`/api/alerts/${alert.id}`, { method: 'DELETE' });
        showToast('Alerta removido.');
        fetchAlerts();
      }
    });

    container.appendChild(item);
  });
}

async function handleCheckAlertsNow() {
  dom.btnCheckAlertsNow.disabled = true;
  dom.btnCheckAlertsNow.textContent = '⏳ Checando cotações no backend...';

  try {
    const res = await fetch('/api/alerts/check', { method: 'POST' });
    const data = await res.json();
    showToast(`✅ ${data.checked_count} rotas verificadas! (${data.triggered_count} oportunidades disparadas)`);
    await fetchAlerts();
  } catch (err) {
    showToast('❌ Erro ao checar alertas.');
  } finally {
    dom.btnCheckAlertsNow.disabled = false;
    dom.btnCheckAlertsNow.textContent = '⚡ Checar Todos os Preços Agora';
  }
}

// ================= MODAL MATRIZ DE AEROPORTOS & TRADE-OFF =================
async function openAlternativesModal() {
  dom.modalAlternatives.classList.add('active');
  recomputeAirportTradeoff();

  try {
    const res = await fetch('/api/alternatives');
    const data = await res.json();
    renderAlternativesMatrix(data.matrix || []);
  } catch (err) {
    console.error("Erro ao carregar matriz de aeroportos:", err);
  }
}

function renderAlternativesMatrix(clusters) {
  const container = dom.matrixListContent;
  container.innerHTML = '';

  clusters.forEach(c => {
    const block = document.createElement('div');
    block.className = 'matrix-cluster';

    block.innerHTML = `
      <h4 class="cluster-title">📍 Hub: ${escapeHtml(c.cluster)}</h4>
      <div class="cluster-airports">
        ${c.airports.map(a => `
          <div class="cluster-airport-card">
            <div class="ca-header">
              <span class="ca-code">${a.code}</span>
              <span class="ca-score">Nota ${a.convenience_score}/10</span>
            </div>
            <div class="ca-name">${escapeHtml(a.name)}</div>
            <div class="ca-transfer"><strong>Translado:</strong> ${escapeHtml(a.transfer_cost_estimate)} (${escapeHtml(a.transfer_time)})</div>
            <div class="ca-notes">💡 ${escapeHtml(a.notes)}</div>
          </div>
        `).join('')}
      </div>
    `;

    container.appendChild(block);
  });
}

function recomputeAirportTradeoff() {
  const diffPerPerson = parseFloat(dom.calcDiffPassagem.value) || 0;
  const numPessoas = parseInt(dom.calcNumPessoas.value) || 1;
  const custoTransporte = parseFloat(dom.calcCustoTransporte.value) || 0;

  const totalEconomiaPassagem = diffPerPerson * numPessoas;
  const saldoLiquido = totalEconomiaPassagem - custoTransporte;

  const saldoFmt = saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  if (saldoLiquido > 200) {
    dom.calcSaldoReal.textContent = `Economia Líquida: +R$ ${saldoFmt}`;
    dom.calcSaldoReal.style.color = '#34d399';
    dom.calcVeredito.textContent = `🚀 ALTAMENTE VANTAJOSO! O desconto na passagem cobre o transporte e sobra muito dinheiro.`;
  } else if (saldoLiquido > 0) {
    dom.calcSaldoReal.textContent = `Economia Líquida: +R$ ${saldoFmt}`;
    dom.calcSaldoReal.style.color = '#fbbf24';
    dom.calcVeredito.textContent = `⚖️ ECONOMIA MODERADA. Avalie se o tempo extra no trânsito compensa a sobra líquida.`;
  } else {
    dom.calcSaldoReal.textContent = `Saldo Negativo: R$ ${saldoFmt}`;
    dom.calcSaldoReal.style.color = '#f43f5e';
    dom.calcVeredito.textContent = `❌ NÃO VALE A PENA! O custo de deslocamento anula totalmente a economia da passagem.`;
  }
}

// ================= MODAL SAZONALIDADE =================
async function openSeasonalityModal() {
  dom.modalSeasonality.classList.add('active');
  const body = dom.seasonalityBody;
  body.innerHTML = `<div style="text-align: center; padding: 2rem;">Carregando diretrizes de sazonalidade...</div>`;

  try {
    const res = await fetch('/api/seasonality');
    const data = await res.json();
    const seas = data.seasonality || {};

    const regionTitles = {
      europa: "🇪🇺 Europa",
      eua: "🇺🇸 Estados Unidos",
      nordeste: "🏖️ Nordeste (Brasil)",
      sul: "🏔️ Sul (Brasil)",
      america_do_sul: "🌎 América do Sul"
    };

    body.innerHTML = Object.keys(seas).map(key => {
      const s = seas[key];
      const title = regionTitles[key] || key;
      return `
        <div class="glass-card" style="padding: 1.2rem; margin-bottom: 1rem; border-left: 4px solid var(--accent-cyan);">
          <h4 style="font-family: var(--font-heading); font-size: 1.15rem; color: #fff; margin-bottom: 0.5rem;">${title}</h4>
          <ul class="insights-list">
            <li><strong>Antecedência Ideal de Compra:</strong> ${escapeHtml(s.best_booking_advance)}</li>
            <li><strong>Dias Mais Baratos:</strong> <span style="color: #34d399;">${escapeHtml(s.cheapest_days)}</span></li>
            <li><strong>Dias Mais Caros:</strong> <span style="color: #fb7185;">${escapeHtml(s.expensive_days)}</span></li>
            <li><strong>Baixa Temporada (Menor Preço):</strong> ${escapeHtml(s.low_season)}</li>
            <li><strong>Alta Temporada (Tarifas de Pico):</strong> ${escapeHtml(s.high_season)}</li>
            <li><strong>Estratégia Recomendada:</strong> ${escapeHtml(s.tips)}</li>
          </ul>
        </div>
      `;
    }).join('');

  } catch (err) {
    body.innerHTML = `<div style="color: #f43f5e;">Erro ao carregar dados de sazonalidade.</div>`;
  }
}

// ================= LIVE RADAR & MADRUGADÕES CONTROLLER =================
async function fetchLiveRadar() {
  try {
    const res = await fetch(`/api/live-radar?origin=${state.currentOrigin}`);
    const data = await res.json();

    // 1. Atualiza Badge de Madrugadão
    if (dom.hudMadrugadaoBadge) {
      dom.hudMadrugadaoBadge.textContent = data.madrugadao_status_text || 'Monitorando...';
      if (data.madrugadao_active) {
        dom.hudMadrugadaoBadge.style.background = 'rgba(244, 63, 94, 0.25)';
        dom.hudMadrugadaoBadge.style.color = '#fecdd3';
      } else {
        dom.hudMadrugadaoBadge.style.background = 'rgba(56, 189, 248, 0.15)';
        dom.hudMadrugadaoBadge.style.color = '#38bdf8';
      }
    }

    // 2. Status do Modo Turbo
    if (dom.turboStatusText) {
      dom.turboStatusText.textContent = data.force_madrugadao_mode ? 'TURBO ON ⚡' : 'AUTO (OFF)';
      dom.turboStatusText.style.color = data.force_madrugadao_mode ? '#34d399' : '#94a3b8';
    }

    // 3. Atualiza Ticker de Eventos ao Vivo
    if (dom.liveTickerContent && data.recent_events && data.recent_events.length > 0) {
      const itemsHtml = data.recent_events.slice(0, 3).map(ev => `
        <span style="margin-right: 1.5rem; ${ev.is_madrugadao ? 'color: #fef08a; font-weight: 700;' : ''}">
          [${ev.timestamp}] ${escapeHtml(ev.message)}
        </span>
      `).join(' • ');
      dom.liveTickerContent.innerHTML = itemsHtml;
    }

    // 4. Renderiza Ofertas Relâmpago e Promoções Reais
    if (dom.madrugadaoDealsGrid && data.real_deals) {
      renderMadrugadaoDeals(data.real_deals);
    }

  } catch (err) {
    console.error("Erro ao atualizar Live Radar:", err);
  }
}

function renderMadrugadaoDeals(deals) {
  const grid = dom.madrugadaoDealsGrid;
  if (!grid) return;
  grid.innerHTML = '';

  if (!deals || deals.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">Nenhuma promoção relâmpago capturada neste instante no feed oficial.</div>`;
    return;
  }

  deals.forEach(deal => {
    const card = document.createElement('div');
    card.className = 'deal-card';

    const priceHtml = deal.real_price ? 
      `<div class="dc-prices">
         <span class="dc-deal-price">a partir de R$ ${deal.real_price.toLocaleString('pt-BR')}</span>
         <span class="dc-regular-price">ida e volta</span>
       </div>` : 
      `<div class="dc-prices"><span class="dc-deal-price" style="font-size: 0.95rem; color: #38bdf8;">Preços Promocionais</span></div>`;

    card.innerHTML = `
      <div class="dc-header">
        <span class="dc-route">${escapeHtml(deal.city)} (${deal.code})</span>
        <span class="dc-discount" style="background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.4); color: #34d399;">PROMOÇÃO REAL</span>
      </div>
      <div style="font-size: 0.82rem; color: #f1f5f9; line-height: 1.35; margin: 0.2rem 0;">
        ${escapeHtml(deal.title)}
      </div>
      ${priceHtml}
      <div class="dc-footer">
        <a href="${deal.link}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 0.25rem 0.55rem; color: #38bdf8;" onclick="event.stopPropagation();">
          📄 Matéria Oficial
        </a>
        <button class="btn btn-primary btn-sm btn-deal-search" style="font-size: 0.72rem; padding: 0.25rem 0.55rem;">
          ⚡ Abrir no Google
        </button>
      </div>
    `;

    card.querySelector('.btn-deal-search').addEventListener('click', (e) => {
      e.stopPropagation();
      openDirectLink('google', deal.code);
    });

    card.addEventListener('click', () => {
      if (deal.code && deal.code !== 'PROMO') {
        openDirectLink('google', deal.code);
      } else {
        window.open(deal.link, '_blank');
      }
    });

    grid.appendChild(card);
  });
}

async function handleToggleMadrugadaoTurbo() {
  try {
    const res = await fetch('/api/live-radar/toggle-madrugadao', { method: 'POST' });
    const data = await res.json();
    showToast(data.message);
    fetchLiveRadar();
  } catch (err) {
    showToast('Erro ao alternar modo Madrugadão');
  }
}

// ================= UTILITÁRIOS =================
function copyToClipboard(text, successMsg = 'Copiado com sucesso!') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg);
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(successMsg);
  });
}

function showToast(message) {
  dom.toastMessage.textContent = message;
  dom.toastNotification.classList.add('show');
  setTimeout(() => {
    dom.toastNotification.classList.remove('show');
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Inicializa a aplicação ao carregar a página
document.addEventListener('DOMContentLoaded', initApp);
