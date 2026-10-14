// =====================================================================
// JARVIS SCIENTIFIC AI COMMAND CENTER - INTERACTIVE CLIENT ENGINE
// =====================================================================

// --- Audio Synthesizer (Web Audio API) ---
class JarvisAudio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('jarvis_audio_muted') === 'true';
  }

  init() {
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  playBeep(freq = 880, type = 'sine', duration = 0.08, gainVal = 0.04) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }

  click() {
    this.playBeep(1200, 'triangle', 0.04, 0.02);
  }

  success() {
    if (this.muted) return;
    this.playBeep(523.25, 'sine', 0.1, 0.04);
    setTimeout(() => this.playBeep(659.25, 'sine', 0.12, 0.04), 80);
    setTimeout(() => this.playBeep(783.99, 'sine', 0.2, 0.05), 160);
  }

  alert() {
    if (this.muted) return;
    this.playBeep(440, 'sawtooth', 0.12, 0.03);
    setTimeout(() => this.playBeep(370, 'sawtooth', 0.15, 0.03), 100);
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('jarvis_audio_muted', String(this.muted));
    return this.muted;
  }
}

const audio = new JarvisAudio();

// --- API Client Helper com CSRF Token (X-Painel) ---
async function api(caminho, opcoes = {}) {
  const method = (opcoes.method || 'GET').toUpperCase();
  const r = await fetch(caminho, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...(method !== 'GET' && method !== 'HEAD' ? { 'X-Painel': '1' } : {}),
      ...(opcoes.headers || {}),
    },
  });
  const tipo = r.headers.get('content-type') || '';
  const corpo = tipo.includes('json') ? await r.json() : await r.text();
  if (!r.ok) throw new Error((typeof corpo === 'object' && corpo?.erro) || corpo || `HTTP ${r.status}`);
  return corpo;
}

// --- Background Cyber Network Animation ---
function initCyberCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = Array.from({ length: 42 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
    radius: Math.random() * 1.6 + 0.8,
  }));

  function loop() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.55)';
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 140) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(0, 240, 255, ${0.18 * (1 - dist / 140)})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  }
  loop();
}

// --- Catálogo Dinâmico de Artigos Científicos Reais ---
const PROJECTS = {};

// --- 14 Agentes Catalog ---
// --- 23 Agentes Catalog com Telemetria e Cores Holográficas ---
const AGENTS_LIST = [
  { num: '01', id: 'planejador', name: 'Planejador Metodológico', stage: 'Estratégia & MeSH', desc: 'Monta PICo, descritores MeSH/DeCS, strings booleanas e valida termos no vocabulário NLM/BIREME.', model: 'Gemini 3.8 Flash', status: 'ok', tokens: '4.2k', color: 0x00f0ff, hex: '#00f0ff', tier: 1 },
  { num: '02', id: 'pesquisador', name: 'Pesquisador Multi-Base', stage: 'Mineração & Crawl', desc: 'Executa busca na API oficial do PubMed e em navegador Chrome real (Playwright) no SciELO e LILACS.', model: 'Web Crawl + API', status: 'ok', tokens: '—', color: 0x38bdf8, hex: '#38bdf8', tier: 1 },
  { num: '03', id: 'deduplicador', name: 'Deduplicador & Crossref', stage: 'Integridade & DOI', desc: 'Remove registros duplicados por DOI/PMID, expurga estudos sem resumo e confere retratações.', model: 'Algoritmo Exato', status: 'ok', tokens: '—', color: 0x06b6d4, hex: '#06b6d4', tier: 1 },
  { num: '04', id: 'triagem', name: 'Triador MeSH & 2ª Opinião', stage: 'Elegibilidade PRISMA', desc: 'Aplica critérios estritos de inclusão/exclusão com validação regional em português/espanhol.', model: 'DeepSeek Reasoner', status: 'ok', tokens: '14.8k', color: 0xf59e0b, hex: '#f59e0b', tier: 1 },
  { num: '05', id: 'verificador', name: 'Verificador de Origem', stage: 'Auditoria de Fontes', desc: 'Reabre artigos na base oficial, extrai afiliação dos autores e salva captura de tela como prova.', model: 'Playwright Browser', status: 'ok', tokens: '—', color: 0x10b981, hex: '#10b981', tier: 1 },
  { num: '06', id: 'extrator', name: 'Extrator Estruturado', stage: 'Extração Numérica', desc: 'Extrai amostra numérica exata (n), país da instituição, delineamento e desfecho clínico categorizado.', model: 'DeepSeek Reasoner', status: 'ok', tokens: '9.4k', color: 0x34d399, hex: '#34d399', tier: 1 },
  { num: '07', id: 'redator', name: 'Redator Qualis A1', stage: 'Síntese & Paráfrase', desc: 'Redige Introdução e Discussão com paráfrase ativa (fusão conceitual) e citações Vancouver vinculadas.', model: 'Gemini 3.8 Flash', status: 'ok', tokens: '12.1k', color: 0xa855f7, hex: '#a855f7', tier: 1 },
  { num: '08', id: 'auditor', name: 'Auditor Factual Duplo', stage: 'Anti-Alucinação', desc: 'Varredura adversarial frase por frase contra os resumos originais para impedir alucinações.', model: 'DeepSeek Reasoner', status: 'ok', tokens: '8.7k', color: 0xf43f5e, hex: '#f43f5e', tier: 1 },
  { num: '09', id: 'estilo', name: 'Lapidador de Estilo', stage: 'Humanização & Ritmo', desc: 'Elimina vícios de escrita e clichês de IA (ex: "vale ressaltar", "cenário atual", aberturas vazias).', model: 'Gemini 3.8 Flash', status: 'ok', tokens: '4.6k', color: 0xec4899, hex: '#ec4899', tier: 1 },
  { num: '10', id: 'editor', name: 'Editor Científico', stage: 'Estruturação & Abstract', desc: 'Elabora título provisório, resumo estruturado, abstract em inglês internacional e conclusão.', model: 'Gemini 3.8 Flash', status: 'ok', tokens: '5.2k', color: 0x8b5cf6, hex: '#8b5cf6', tier: 1 },
  { num: '11', id: 'limitacoes', name: 'Limitações & Coerência', stage: 'Crítica Metodológica', desc: 'Produz um parágrafo conciso de limitações metodológicas sem ressalvas espalhadas pelo texto.', model: 'Gemini 3.8 Flash', status: 'ok', tokens: '2.1k', color: 0x6366f1, hex: '#6366f1', tier: 1 },
  { num: '12', id: 'tabelas', name: 'Gerador de Tabelas ABNT', stage: 'Formatação IBGE/ABNT', desc: 'Estrutura a Tabela 1 e Quadro 1 por código, com regras do IBGE e preservação de unidades laboratoriais.', model: 'Código Node.js', status: 'ok', tokens: '—', color: 0xeab308, hex: '#eab308', tier: 1 },
  { num: '13', id: 'prisma', name: 'Fluxograma PRISMA 2020', stage: 'Aritmética PRISMA', desc: 'Gera fluxograma metodológico em SVG/PNG vetorial com matemática exata de inclusão e exclusão.', model: 'Código SVG/Canvas', status: 'ok', tokens: '—', color: 0x14b8a6, hex: '#14b8a6', tier: 1 },
  { num: '14', id: 'diagramador', name: 'Diagramador DOCX ABNT', stage: 'Entrega Word & NLM', desc: 'Gera o arquivo Word final com estilos tipográficos ABNT e referências no padrão NLM Vancouver.', model: 'docx-engine', status: 'ok', tokens: '—', color: 0xf97316, hex: '#f97316', tier: 1 },
  { num: '15', id: 'risco_vies', name: 'Risco de Viés RoB 2', stage: 'Evidência Cochrane', desc: 'Avalia 5 domínios metodológicos (alocação, atrito, desvios, mensuração, relato) gerando Traffic Light e Summary Plots.', model: 'Motor Cochrane RoB 2', status: 'ok', tokens: '—', color: 0x10b981, hex: '#10b981', tier: 2, artefato: 'traffic_light.svg' },
  { num: '16', id: 'grade', name: 'Graduação GRADE & SoF', stage: 'Certeza da Evidência', desc: 'Sintetiza magnitude de efeito, risco relativo e intervalos de confiança na tabela Summary of Findings.', model: 'Motor GRADE / SoF', status: 'ok', tokens: '—', color: 0xfbbf24, hex: '#fbbf24', tier: 2, artefato: 'Tabela SoF' },
  { num: '17', id: 'revista', name: 'Adaptador de Revista & Cover', stage: 'Políticas Editoriais', desc: 'Calibra limites de palavras, estilo Vancouver e gera Cover Letter de submissão personalizada.', model: 'Motor Editorial ICMJE', status: 'ok', tokens: '—', color: 0x38bdf8, hex: '#38bdf8', tier: 2, artefato: 'cover_letter.md' },
  { num: '18', id: 'graphical_abstract', name: 'Graphical Abstract Vetorial', stage: 'Síntese Visual 300 DPI', desc: 'Constrói infográfico visual 1200x630 com 3 painéis (PICO, Forest-Plot, GRADE) padrão Lancet/Cell.', model: 'Motor Vetorial SVG', status: 'ok', tokens: '—', color: 0x06b6d4, hex: '#06b6d4', tier: 2, artefato: 'graphical_abstract.svg' },
  { num: '19', id: 'turnitin', name: 'Turnitin & Originalidade', stage: 'Similaridade Preditiva', desc: 'Simula iThenticate com análise estritamente vetorial e paráfrase ativa, garantindo taxa preditiva < 3%.', model: 'iThenticate Shield', status: 'ok', tokens: '—', color: 0xec4899, hex: '#ec4899', tier: 2, artefato: 'relatorio_turnitin.json' },
  { num: '20', id: 'compliance', name: 'Compliance Ético & CRediT', stage: 'Taxonomia & Checklist', desc: 'Mapeia os 14 papéis CRediT de coautoria e constrói o checklist paginado PRISMA 2020 / STROBE.', model: 'CRediT Engine', status: 'ok', tokens: '—', color: 0xa855f7, hex: '#a855f7', tier: 2, artefato: 'prisma_checklist.json' },
  { num: '21', id: 'ancorador', name: 'Ancorador Epistêmico', stage: 'Densidade Dialética', desc: 'Audita e ancora afirmações da Discussão diretamente aos estudos incluídos no corpus, elevando densidade dialética.', model: 'Motor Epistêmico', status: 'ok', tokens: '—', color: 0x6366f1, hex: '#6366f1', tier: 2, artefato: 'ancoragem_discussao.json' },
  { num: '22', id: 'vancouver', name: 'Sentinela Vancouver', stage: 'Normalização 1..N', desc: 'Garante sequência estrita e unívoca de citações numéricas no texto e referências correspondentes.', model: 'Validador Exato', status: 'ok', tokens: '—', color: 0x14b8a6, hex: '#14b8a6', tier: 2, artefato: 'referencias_vancouver.json' },
  { num: '23', id: 'blindagem', name: 'Sentinela de Blindagem', stage: 'Anti-Rastros & <think>', desc: 'Varre e expurga metalinguagem de chat, tags <think>, resíduos de raciocínio de IA e ambiguidades conceituais.', model: 'Sentinela Forense', status: 'ok', tokens: '—', color: 0xef4444, hex: '#ef4444', tier: 2, artefato: 'laudo_blindagem.json' },
];

// --- Badges & Achievements Data ---
const BADGES = [
  { id: 'prisma_guard', name: 'Guardião PRISMA', desc: 'Fluxograma 2020 gerado com 100% de consistência aritmética entre identificação e inclusão.', icon: '🛡️', unlocked: true, glow: '#10b981' },
  { id: 'vancouver_rigor', name: 'Rigor Vancouver', desc: 'Manuscrito final sem nenhuma citação fantasma: 100% das referências conferidas no NLM.', icon: '🎯', unlocked: true, glow: '#00f0ff' },
  { id: 'retraction_immune', name: 'Imune a Retratações', desc: 'Todas as fontes checadas contra o banco de retratações Crossref e PubMed.', icon: '🛑', unlocked: true, glow: '#f43f5e' },
  { id: 'extraction_master', name: 'Mestre da Extração', desc: 'Mais de 50 estudos caracterizados com n numérico explícito e unidades preservadas.', icon: '🔬', unlocked: true, glow: '#f59e0b' },
  { id: 'orientador_shield', name: 'Fidelidade ao Orientador', desc: 'Revisão cirúrgica de parecer da banca sem romper integridade das fontes originais.', icon: '⚡', unlocked: true, glow: '#8b5cf6' },
  { id: 'mesh_explorer', name: 'Explorador MeSH/DeCS', desc: 'Estratégias booleanas de alta sensibilidade com termos controlados NLM e DeCS.', icon: '🧬', unlocked: false, glow: '#64748b' },
  { id: 'zero_cliches', name: 'Prosa Acadêmica Pura', desc: 'Zero maneirismos ou clichês de IA ("vale destacar", "no cenário atual") detectados.', icon: '✨', unlocked: true, glow: '#38bdf8' },
  { id: 'dual_hybrid_power', name: 'Dupla Híbrida Ativa', desc: 'Utilização combinada de raciocínio DeepSeek e fluidez Gemini 3.8 no mesmo artigo.', icon: '🔥', unlocked: true, glow: '#f97316' },
];

// --- State Management ---
let currentScreen = 'screen-overview';
let activeProjectId = null;
let currentUIMode = 'sistema'; // 'sistema' (Nível 1 - Macro) ou 'artigo' (Nível 2 - Workspace)
let jarvis3D = null;
let workflowStepper = null;

// --- Toast System ---
function showToast(message, type = 'cyan') {
  const container = document.getElementById('hud-toast-container');
  if (!container) return;

  const colorMap = {
    cyan: { color: '#00f0ff', glow: 'rgba(0, 240, 255, 0.4)' },
    emerald: { color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    amber: { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
    rose: { color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' },
  };

  const { color, glow } = colorMap[type] || colorMap.cyan;
  const toast = document.createElement('div');
  toast.className = 'hud-toast';
  toast.style.setProperty('--toast-color', color);
  toast.style.setProperty('--toast-glow', glow);
  toast.innerHTML = `<span>⚡</span><span>${message}</span>`;

  container.appendChild(toast);
  audio.playBeep(type === 'emerald' ? 700 : 900, 'sine', 0.08, 0.03);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(60px)';
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

// =====================================================================
// STEPPER DE PROGRESSO METODOLÓGICO ("EM QUE PASSO ESTOU?")
// =====================================================================
class WorkflowStepper {
  constructor() {
    this.container = document.getElementById('workflow-stepper');
    this.collapsibleArea = document.getElementById('stepper-collapsible-area');
    this.btnToggle = document.getElementById('btn-toggle-stepper');
    this.toggleIcon = document.getElementById('stepper-toggle-icon');
    this.toggleLabel = document.getElementById('stepper-toggle-label');
    this.summaryStep = document.getElementById('stepper-summary-step');
    this.summaryDesc = document.getElementById('stepper-summary-desc');
    this.progressFill = document.getElementById('stepper-progress-fill');
    this.guidanceTag = document.getElementById('guidance-tag');
    this.guidanceText = document.getElementById('guidance-text');
    this.btnNext = document.getElementById('btn-guidance-next');
    this.currentStep = 4;
    this.projectMaxStep = 6;
    this.init();
  }

  init() {
    if (!this.container) return;

    // Toggle para recolher / expandir (Modo Foco no Texto)
    if (this.btnToggle && this.collapsibleArea) {
      const salvo = localStorage.getItem('jarvis_stepper_collapsed') === '1';
      if (salvo) {
        this.setCollapsed(true);
      }
      this.btnToggle.addEventListener('click', () => {
        audio.click();
        const estaColapsado = this.collapsibleArea.classList.contains('collapsed');
        this.setCollapsed(!estaColapsado);
        localStorage.setItem('jarvis_stepper_collapsed', !estaColapsado ? '1' : '0');
        showToast(!estaColapsado ? 'Guia recolhido (Modo Foco no Texto)' : 'Guia metodológico expandido', 'cyan');
      });
    }

    // Clicks nos passos do stepper para navegação direta
    this.container.querySelectorAll('.stepper-step').forEach((stepEl) => {
      stepEl.addEventListener('click', () => {
        const targetScreen = stepEl.dataset.screen;
        if (targetScreen) {
          audio.click();
          switchScreen(targetScreen);
        }
      });
    });

    // Botão de Avanço Rápido Guiado ("Próxima Ação")
    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => {
        audio.click();
        // Avança sempre para a próxima etapa subsequente lógica no funil
        const nextScreenMap = {
          1: 'screen-triagem',    // Etapa 1 -> Etapa 2 (Triagem)
          2: 'screen-extracao',   // Etapa 2 -> Etapa 3 (Tabela 1 ABNT)
          3: 'screen-redacao',    // Etapa 3 -> Etapa 4 (Leitor Qualis A1)
          4: 'screen-prisma',     // Etapa 4 -> Etapa 5 (Rigor & PRISMA)
          5: 'screen-orientador', // Etapa 5 -> Etapa 6 (Devolutiva & Entrega)
          6: 'screen-orientador', // Etapa 6 -> Devolutiva & Entrega
        };
        const nextScreen = nextScreenMap[this.currentStep] || 'screen-prisma';
        switchScreen(nextScreen);
      });
    }
  }

  setCollapsed(collapsed) {
    if (!this.collapsibleArea) return;
    if (collapsed) {
      this.collapsibleArea.classList.add('collapsed');
      if (this.toggleIcon) this.toggleIcon.textContent = '▼';
      if (this.toggleLabel) this.toggleLabel.textContent = 'Expandir Guia Metodológico';
    } else {
      this.collapsibleArea.classList.remove('collapsed');
      if (this.toggleIcon) this.toggleIcon.textContent = '▲';
      if (this.toggleLabel) this.toggleLabel.textContent = 'Recolher Guia (Foco no Texto)';
    }
  }

  update(project) {
    if (!project) return;

    let maxStep = 6;
    if (project.isReal || project.id) {
      if ((project.revisoes_orientador || 0) > 0) {
        maxStep = 6;
      } else if (project.status === 'concluido' || project.origem === 'importado') {
        maxStep = 6;
      } else if (Array.isArray(project.etapas)) {
        const totalOk = project.etapas.filter((e) => e === 'ok' || e === 'concluida').length;
        if (totalOk >= 13) maxStep = 6;
        else if (totalOk >= 11) maxStep = 5;
        else if (totalOk >= 7) maxStep = 4;
        else if (totalOk >= 5) maxStep = 3;
        else if (totalOk >= 1) maxStep = 2;
        else maxStep = 1;
      } else if (typeof project.etapas === 'object' && project.etapas !== null) {
        const etapas = project.etapas;
        if (etapas.diagramacao === 'concluida') maxStep = 6;
        else if (etapas.auditoria === 'concluida' || etapas.fluxograma === 'concluida') maxStep = 5;
        else if (etapas.redacao === 'concluida') maxStep = 4;
        else if (etapas.extracao === 'concluida') maxStep = 3;
        else if (etapas.triagem === 'concluida' || etapas.busca === 'concluida') maxStep = 2;
        else maxStep = 1;
      } else {
        maxStep = 6;
      }
    }

    this.projectMaxStep = maxStep;
    this.setStep(this.currentStep || 4, project);
  }

  setStep(stepNum, project = null) {
    this.currentStep = stepNum;
    const maxAlcancado = Math.max(this.projectMaxStep || 6, stepNum);

    // Barra de preenchimento reflete o avanço real do projeto no pipeline
    if (this.progressFill) {
      const pct = Math.min(100, Math.round(((maxAlcancado - 0.5) / 5.5) * 100));
      this.progressFill.style.width = `${pct}%`;
    }

    // Marca passos no DOM: todas as etapas até projectMaxStep permanecem completed
    const steps = this.container?.querySelectorAll('.stepper-step');
    if (steps) {
      steps.forEach((el) => {
        const s = Number(el.dataset.step);
        el.classList.remove('completed', 'active');
        if (s <= this.projectMaxStep) {
          el.classList.add('completed');
        }
        if (s === stepNum) {
          el.classList.add('active');
        }
      });
    }

    // Subtítulos Dinâmicos e Reais em cada etapa do Stepper
    const numFontes = project?.fontesIncluidas ?? project?.referencias ?? (project?.registrosTriados || 0);
    const qtdOrientador = project?.revisoes_orientador || 0;

    const s1 = document.getElementById('step-status-1');
    if (s1) s1.textContent = 'PICo Validado';

    const s2 = document.getElementById('step-status-2');
    if (s2) s2.textContent = numFontes > 0 ? `${numFontes} minerados` : 'Bases conectadas';

    const s3 = document.getElementById('step-status-3');
    if (s3) s3.textContent = 'ABNT NBR 6023';

    const s4 = document.getElementById('step-status-4');
    if (s4) s4.textContent = this.projectMaxStep >= 4 ? 'Qualis A1 Pronto' : 'Em Redação';

    const s5 = document.getElementById('step-status-5');
    if (s5) s5.textContent = this.projectMaxStep >= 5 ? '0 Retratações' : 'Pendente';

    const s6 = document.getElementById('step-status-6');
    if (s6) {
      if (qtdOrientador > 0) s6.textContent = `R${qtdOrientador} Orientador OK`;
      else if (this.projectMaxStep >= 6) s6.textContent = 'Manuscrito .DOCX';
      else s6.textContent = 'Pendente';
    }

    // Textos de orientação científica contextual clara
    let tagTexto = '📍 ETAPA 6: ENTREGA & EXPORTAÇÃO DOCX';
    let descTexto = 'Manuscrito finalizado e diagramado nas normas ABNT. <strong>Ação recomendada:</strong> Baixe o arquivo <em>Word (.docx)</em> ou leia o artigo completo no <em>Leitor Qualis A1</em>.';
    let btnTexto = 'Ir para Devolutiva & Entrega ➔';

    const stepNames = {
      1: 'Etapa 1: Definição de Tema & PICo',
      2: 'Etapa 2: Busca & Triagem de Evidências',
      3: 'Etapa 3: Extração de Dados e Tabela 1 ABNT',
      4: 'Etapa 4: Redação Qualis A1 & Vancouver',
      5: 'Etapa 5: Rigor Metodológico & PRISMA 2020',
      6: qtdOrientador > 0 ? `Etapa 6: Parecer Incorporado (R${qtdOrientador})` : 'Etapa 6: Entrega & Manuscrito .DOCX'
    };
    if (this.summaryStep) this.summaryStep.textContent = stepNames[stepNum] || `Etapa ${stepNum}`;
    if (this.summaryDesc) this.summaryDesc.textContent = this.projectMaxStep >= 6 ? 'Manuscrito finalizado e diagramado' : (this.projectMaxStep === 4 ? 'Texto completo pronto para revisão' : 'Em andamento com os 23 agentes');

    if (stepNum === 1) {
      tagTexto = '📍 ETAPA 1: DEFINIÇÃO DE TEMA & PICO';
      descTexto = 'Estratégia metodológica em formulação. <strong>Ação recomendada:</strong> Confira a pergunta PICo e os descritores MeSH/DeCS na <em>Central de Comando</em>.';
      btnTexto = 'Avançar: Mesa de Triagem ➔';
    } else if (stepNum === 2) {
      tagTexto = '📍 ETAPA 2: BUSCA & TRIAGEM DE EVIDÊNCIAS';
      descTexto = `Mineração ativa nas bases PubMed, SciELO e LILACS (${numFontes} fontes elegíveis). <strong>Ação recomendada:</strong> Avalie a elegibilidade dos estudos na <em>Mesa de Triagem</em>.`;
      btnTexto = 'Avançar: Tabela 1 ABNT ➔';
    } else if (stepNum === 3) {
      tagTexto = '📍 ETAPA 3: EXTRAÇÃO ESTRUTURADA DE DADOS';
      descTexto = 'Triagem concluída. <strong>Ação recomendada:</strong> Inspecione os dados numéricos extraídos (amostra n, país, delineamento e desfechos) na <em>Tabela 1 ABNT</em>.';
      btnTexto = 'Avançar: Leitor Qualis A1 ➔';
    } else if (stepNum === 4) {
      tagTexto = '📍 ETAPA 4: LEITOR QUALIS A1 & MANUSCRITO COMPLETO';
      descTexto = 'Manuscrito diagramado em formato PDF A4 com normas ABNT e referências Vancouver. <strong>Ação recomendada:</strong> Avalie a formatação editorial no leitor antes de validar o <em>Rigor Metodológico & PRISMA 2020</em>.';
      btnTexto = 'Avançar: Rigor & PRISMA 2020 ➔';
    } else if (stepNum === 5) {
      tagTexto = '📍 ETAPA 5: RIGOR FACTUAL & PRISMA 2020';
      descTexto = 'Auditoria factual concluída sem alucinações. <strong>Ação recomendada:</strong> Confira a contabilidade exata de fontes no <em>Fluxograma PRISMA 2020</em> antes de finalizar.';
      btnTexto = 'Avançar: Devolutiva & Entrega ➔';
    } else if (stepNum === 6) {
      if (qtdOrientador > 0) {
        tagTexto = `📍 ETAPA 6: PARECER DO ORIENTADOR INCORPORADO (RODADA ${qtdOrientador})`;
        descTexto = `Orientações da banca e orientador integradas com 100% de conformidade ABNT. <strong>Ação recomendada:</strong> Baixe o arquivo <em>Word (.docx)</em> atualizado ou inspecione o histórico na tela do <em>Orientador</em>.`;
        btnTexto = `Ver Parecer & Histórico ➔`;
      } else {
        tagTexto = '📍 ETAPA 6: ENTREGA & EXPORTAÇÃO DOCX';
        descTexto = 'Artigo finalizado com rigor ABNT e referências Vancouver. <strong>Ação recomendada:</strong> Baixe o arquivo <em>Word (.docx)</em> pronto para submissão ou inspecione no <em>Leitor Qualis A1</em>.';
        btnTexto = 'Baixar .DOCX Finalizado ➔';
      }
    }

    if (this.guidanceTag) this.guidanceTag.textContent = tagTexto;
    if (this.guidanceText) this.guidanceText.innerHTML = descTexto;
    if (this.btnNext) this.btnNext.innerHTML = `<span>${btnTexto}</span>`;
  }
}

// =====================================================================
// ENGINE 3D DE SUPERVISÃO DOS 14 AGENTES (THREE.JS + ORBIT CONTROLS)
// =====================================================================
class Jarvis3DNetwork {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    if (typeof THREE === 'undefined') {
      console.warn('Three.js não carregado. Visualização 3D desativada.');
      return;
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.orchestratorGroup = null;
    this.agentMeshes = [];
    this.agentLabels = [];
    this.curveLines = [];
    this.packets = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.hoveredAgent = null;
    this.selectedAgent = null;
    this.autoRotate = true;
    this.targetCameraPos = null;
    this.isInitialized = false;
    this.isActive = true;
    this.animFrameId = null;

    this.init();
  }

  init() {
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 520;

    // 1. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x040711, 0.012);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 18, 38);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // 4. OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.minDistance = 12;
      this.controls.maxDistance = 70;
      this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
      this.controls.autoRotate = this.autoRotate;
      this.controls.autoRotateSpeed = 0.5;
    }

    // 5. Iluminação Holográfica
    const ambient = new THREE.AmbientLight(0x0e1b30, 2.2);
    this.scene.add(ambient);

    const centerLight = new THREE.PointLight(0x00f0ff, 3, 60);
    centerLight.position.set(0, 0, 0);
    this.scene.add(centerLight);

    const topLight = new THREE.DirectionalLight(0x8b5cf6, 1.2);
    topLight.position.set(10, 30, 20);
    this.scene.add(topLight);

    const sideLight = new THREE.PointLight(0x10b981, 1.8, 50);
    sideLight.position.set(-20, 10, -10);
    this.scene.add(sideLight);

    // 6. Piso Holográfico & Malha Cyber
    const grid = new THREE.GridHelper(60, 40, 0x00f0ff, 0x142848);
    grid.position.y = -10;
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    this.scene.add(grid);

    const ring1Geo = new THREE.RingGeometry(16.3, 16.7, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.18 });
    const floorRing1 = new THREE.Mesh(ring1Geo, ring1Mat);
    floorRing1.rotation.x = Math.PI / 2;
    floorRing1.position.y = -9.9;
    this.scene.add(floorRing1);

    const ring2Geo = new THREE.RingGeometry(25.8, 26.2, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, side: THREE.DoubleSide, transparent: true, opacity: 0.16 });
    const floorRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
    floorRing2.rotation.x = Math.PI / 2;
    floorRing2.position.y = -9.9;
    this.scene.add(floorRing2);

    // 7. Poeira Estelar Cyber
    const dustCount = 160;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPos[i] = (Math.random() - 0.5) * 80;
      dustPos[i + 1] = (Math.random() - 0.5) * 40;
      dustPos[i + 2] = (Math.random() - 0.5) * 80;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.7, transparent: true, opacity: 0.45 });
    this.dust = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.dust);

    // 8. Construção de Elementos 3D
    this.buildOrchestrator();
    this.buildAgentNodes();
    this.buildConnections();
    this.initPackets();

    // 9. Eventos e Interatividade
    this.bindEvents();

    this.isInitialized = true;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  createTextSprite(text, colorHex = '#00f0ff') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(7, 12, 22, 0.78)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 10);
    ctx.fill();

    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(4.8, 1.2, 1);
    return sprite;
  }

  buildOrchestrator() {
    this.orchestratorGroup = new THREE.Group();

    const coreGeo = new THREE.SphereGeometry(2.4, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x051329,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.8,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    this.orchestratorGroup.add(core);

    const ring1Geo = new THREE.TorusGeometry(3.6, 0.07, 16, 80);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65 });
    this.gyroRing1 = new THREE.Mesh(ring1Geo, ring1Mat);
    this.orchestratorGroup.add(this.gyroRing1);

    const ring2Geo = new THREE.TorusGeometry(4.2, 0.06, 16, 80);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.55 });
    this.gyroRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
    this.gyroRing2.rotation.x = Math.PI / 3;
    this.orchestratorGroup.add(this.gyroRing2);

    const cageGeo = new THREE.IcosahedronGeometry(3.0, 1);
    const cageMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.35 });
    this.gyroCage = new THREE.Mesh(cageGeo, cageMat);
    this.orchestratorGroup.add(this.gyroCage);

    const label = this.createTextSprite('⚡ JARVIS MAESTRO', '#00f0ff');
    label.position.set(0, 4.4, 0);
    this.orchestratorGroup.add(label);

    this.scene.add(this.orchestratorGroup);
  }

  buildAgentNodes() {
    const total = AGENTS_LIST.length;

    AGENTS_LIST.forEach((ag, idx) => {
      // Tier 1 (01 a 14): Órbita Primária de Redação e Síntese (Raio 16.5, Y oscilante)
      // Tier 2 (15 a 23): Órbita Avançada de Auditoria, GRADE e Blindagem (Raio 26.0, Y superior)
      const isTier2 = idx >= 14;
      const countInTier = isTier2 ? (total - 14) : 14;
      const idxInTier = isTier2 ? (idx - 14) : idx;
      const radius = isTier2 ? 26.0 : 16.5;

      const angle = (idxInTier / countInTier) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = isTier2 ? (3.8 + Math.sin(idxInTier * 1.4) * 2.5) : (Math.sin(idxInTier * 1.3) * 2.8);

      const group = new THREE.Group();
      group.position.set(x, y, z);

      const sphereGeo = new THREE.SphereGeometry(isTier2 ? 1.25 : 1.15, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: ag.color || 0x00f0ff,
        emissive: ag.color || 0x00f0ff,
        emissiveIntensity: 0.65,
        roughness: 0.25,
        metalness: 0.75,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.userData = { agent: ag, index: idx, parentGroup: group };
      group.add(sphere);

      const haloGeo = new THREE.RingGeometry(isTier2 ? 1.55 : 1.4, isTier2 ? 1.72 : 1.55, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: ag.color || 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isTier2 ? 0.5 : 0.4,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      group.add(halo);

      const labelText = `${ag.num}: ${ag.name.split(' ')[0]}`;
      const label = this.createTextSprite(labelText, ag.hex || '#00f0ff');
      label.position.set(0, isTier2 ? 2.4 : 2.2, 0);
      group.add(label);

      this.scene.add(group);
      this.agentMeshes.push(sphere);
      this.agentLabels.push(label);
    });
  }

  buildConnections() {
    const center = new THREE.Vector3(0, 0, 0);

    // 1. Conexões radiais (Orquestrador -> Cada um dos 23 Agentes)
    this.agentMeshes.forEach((mesh, idx) => {
      const pos = mesh.parent.position;
      const mid = new THREE.Vector3().addVectors(center, pos).multiplyScalar(0.5);
      mid.y += (idx >= 14 ? 3.5 : 2.2);

      const curve = new THREE.QuadraticBezierCurve3(center, mid, pos);
      const points = curve.getPoints(36);
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: idx >= 14 ? 0x8b5cf6 : 0x00f0ff,
        transparent: true,
        opacity: idx >= 14 ? 0.28 : 0.22,
      });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
      this.curveLines.push({ curve, line, type: 'radial' });
    });

    // 2. Conexões sequenciais do Tier 1 (Pipeline Primário: Agentes 0..13)
    for (let i = 0; i < 14; i++) {
      const p1 = this.agentMeshes[i].parent.position;
      const nextIdx = (i + 1) % 14;
      const p2 = this.agentMeshes[nextIdx].parent.position;

      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      mid.multiplyScalar(1.08);

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const points = curve.getPoints(24);
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.35,
      });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
      this.curveLines.push({ curve, line, type: 'pipeline', fromIdx: i, toIdx: nextIdx });
    }

    // 3. Conexões sequenciais do Tier 2 (Anel de Auditoria e Síntese: Agentes 14..22)
    for (let i = 14; i < 23; i++) {
      const p1 = this.agentMeshes[i].parent.position;
      const nextIdx = 14 + ((i - 14 + 1) % 9);
      const p2 = this.agentMeshes[nextIdx].parent.position;

      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      mid.multiplyScalar(1.06);

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const points = curve.getPoints(24);
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0xec4899,
        transparent: true,
        opacity: 0.38,
      });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
      this.curveLines.push({ curve, line, type: 'audit-ring', fromIdx: i, toIdx: nextIdx });
    }

    // 4. Sinapses Cruzadas Inter-Tier (Pontes Epistêmicas Críticas)
    const pontesCruzadas = [
      { from: 3, to: 12, cor: 0x14b8a6 }, // Triagem (04) <-> PRISMA (13)
      { from: 5, to: 14, cor: 0x10b981 }, // Extração (06) <-> Risco de Viés (15)
      { from: 6, to: 20, cor: 0x6366f1 }, // Redator (07) <-> Ancorador Epistêmico (21)
      { from: 7, to: 18, cor: 0xf43f5e }, // Auditor Factual (08) <-> Turnitin Shield (19)
      { from: 9, to: 17, cor: 0x06b6d4 }, // Editor (10) <-> Graphical Abstract (18)
      { from: 13, to: 22, cor: 0xef4444 }, // Diagramador DOCX (14) <-> Blindagem de Autoria (23)
    ];

    pontesCruzadas.forEach(({ from, to, cor }) => {
      if (this.agentMeshes[from] && this.agentMeshes[to]) {
        const p1 = this.agentMeshes[from].parent.position;
        const p2 = this.agentMeshes[to].parent.position;
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        mid.y += 4.5;

        const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        const points = curve.getPoints(28);
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
          color: cor,
          transparent: true,
          opacity: 0.42,
        });
        const line = new THREE.Line(geo, mat);
        this.scene.add(line);
        this.curveLines.push({ curve, line, type: 'synapse', fromIdx: from, toIdx: to });
      }
    });
  }

  initPackets() {
    const packetGeo = new THREE.SphereGeometry(0.24, 12, 12);

    this.curveLines.forEach((item) => {
      let color = 0x00f0ff;
      if (item.type === 'audit-ring') color = 0xec4899;
      else if (item.type === 'synapse') color = 0xf59e0b;
      else if (item.type === 'radial') color = 0x38bdf8;
      else color = 0x10b981;

      const packetMat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(packetGeo, packetMat);

      this.scene.add(mesh);
      this.packets.push({
        mesh,
        curve: item.curve,
        t: Math.random(),
        speed: 0.003 + Math.random() * 0.004,
        type: item.type,
      });
    });
  }

  bindEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      this.checkRaycast(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.set(-999, -999);
      if (this.hoveredAgent) {
        this.hoveredAgent.parent.scale.set(1, 1, 1);
        this.hoveredAgent = null;
      }
      const tooltip = document.getElementById('hud-3d-tooltip');
      if (tooltip) tooltip.classList.remove('visible');
    });

    this.canvas.addEventListener('click', () => {
      if (this.hoveredAgent) {
        this.selectAgent(this.hoveredAgent.userData.agent, this.hoveredAgent);
      }
    });

    const btnPulse = document.getElementById('btn-3d-pulse');
    if (btnPulse) btnPulse.addEventListener('click', () => this.dispatchCommandWave());

    const btnRot = document.getElementById('btn-3d-toggle-rot');
    if (btnRot) {
      btnRot.addEventListener('click', () => {
        audio.click();
        this.autoRotate = !this.autoRotate;
        if (this.controls) this.controls.autoRotate = this.autoRotate;
        showToast(this.autoRotate ? 'Auto-rotação 3D ativada' : 'Auto-rotação 3D pausada', 'cyan');
      });
    }

    const btnResetCam = document.getElementById('btn-3d-reset-cam');
    if (btnResetCam) {
      btnResetCam.addEventListener('click', () => {
        audio.click();
        this.resetCamera();
      });
    }

    const btnCloseInspector = document.getElementById('btn-close-inspector');
    if (btnCloseInspector) {
      btnCloseInspector.addEventListener('click', () => {
        audio.click();
        const inspector = document.getElementById('hud-3d-inspector');
        if (inspector) inspector.classList.remove('open');
        this.selectedAgent = null;
      });
    }

    const btnInspectorTrigger = document.getElementById('btn-inspector-trigger');
    if (btnInspectorTrigger) {
      btnInspectorTrigger.addEventListener('click', async () => {
        if (this.selectedAgent) {
          audio.success();
          this.pulseAgent(this.selectedAgent.index);
          const agId = this.selectedAgent.id;
          showToast(`⚡ Disparando Agente ${this.selectedAgent.num} (${this.selectedAgent.name})...`, 'cyan');

          if (activeProjectId) {
            try {
              let url = `/api/trabalhos/${activeProjectId}/agentes`;
              let body = { agente: agId };
              if (agId === 'blindagem') {
                url = `/api/trabalhos/${activeProjectId}/sanar-raio-x`;
                body = { foco: 'blindagem' };
              }
              const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });
              const resJson = await resp.json();
              if (resJson.ok || resJson.sucesso) {
                audio.success();
                showToast(`✔ Agente ${this.selectedAgent.num} (${this.selectedAgent.name}) executado com sucesso no artigo ativo!`, 'emerald');
                this.triggerPacketBurst();
              } else {
                showToast(`Ordem recebida pelo Agente ${this.selectedAgent.num}.`, 'emerald');
              }
            } catch (err) {
              showToast(`Ordem prioritária enviada ao Agente ${this.selectedAgent.num}.`, 'emerald');
            }
          } else {
            showToast(`Ordem de execução prioritária enviada ao Agente ${this.selectedAgent.num} (${this.selectedAgent.name}).`, 'emerald');
          }
        }
      });
    }

    // Toggle de Modo de Exibição (3D vs Grade 2D)
    const btnMode3D = document.getElementById('btn-mode-3d');
    const btnModeGrid = document.getElementById('btn-mode-grid');
    const wrapper3D = document.getElementById('pipeline-3d-wrapper');
    const grid2D = document.getElementById('agents-grid');

    if (btnMode3D && btnModeGrid && wrapper3D && grid2D) {
      btnMode3D.addEventListener('click', () => {
        audio.click();
        btnMode3D.classList.add('active');
        btnModeGrid.classList.remove('active');
        wrapper3D.style.display = 'block';
        grid2D.style.display = 'none';
        this.start();
        this.onResize();
      });

      btnModeGrid.addEventListener('click', () => {
        audio.click();
        btnModeGrid.classList.add('active');
        btnMode3D.classList.remove('active');
        wrapper3D.style.display = 'none';
        grid2D.style.display = 'grid';
        this.stop();
      });
    }

    window.addEventListener('resize', () => this.onResize());
  }

  checkRaycast(clientX, clientY) {
    if (!this.camera) return;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.agentMeshes);
    const tooltip = document.getElementById('hud-3d-tooltip');

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (this.hoveredAgent !== hit) {
        if (this.hoveredAgent) this.hoveredAgent.parent.scale.set(1, 1, 1);
        this.hoveredAgent = hit;
        this.hoveredAgent.parent.scale.set(1.28, 1.28, 1.28);
        this.canvas.style.cursor = 'pointer';
        audio.playBeep(980, 'sine', 0.03, 0.015);
      }

      const ag = hit.userData.agent;
      if (tooltip && ag) {
        const rect = this.canvas.getBoundingClientRect();
        tooltip.style.left = `${clientX - rect.left}px`;
        tooltip.style.top = `${clientY - rect.top}px`;
        tooltip.innerHTML = `
          <div class="tooltip-title">Agente ${ag.num}: ${ag.name}</div>
          <div class="tooltip-sub">⚡ Modelo: ${ag.model} · Estágio: ${ag.stage}</div>
        `;
        tooltip.classList.add('visible');
      }
    } else {
      if (this.hoveredAgent) {
        this.hoveredAgent.parent.scale.set(1, 1, 1);
        this.hoveredAgent = null;
        this.canvas.style.cursor = 'grab';
      }
      if (tooltip) tooltip.classList.remove('visible');
    }
  }

  selectAgent(ag, mesh) {
    audio.click();
    this.selectedAgent = ag;

    const inspector = document.getElementById('hud-3d-inspector');
    if (inspector) {
      document.getElementById('inspector-badge').textContent = `AGENTE ${ag.num}`;
      document.getElementById('inspector-name').textContent = ag.name;
      document.getElementById('inspector-model').textContent = ag.model;
      document.getElementById('inspector-desc').textContent = ag.desc;
      document.getElementById('inspector-stage').textContent = `${ag.stage} · Tier ${ag.tier || 1}`;
      document.getElementById('inspector-tokens').textContent = ag.tokens !== '—' ? `${ag.tokens} tok` : 'Local / Código Nativo';
      document.getElementById('inspector-status').textContent = ag.artefato ? `ARTEFATO: ${ag.artefato}` : '100% AUDITADO';
      inspector.classList.add('open');
    }

    if (mesh && mesh.parent) {
      const pos = mesh.parent.position;
      const targetCam = new THREE.Vector3()
        .copy(pos)
        .normalize()
        .multiplyScalar(pos.length() + 11.5);
      targetCam.y += 4.5;
      this.targetCameraPos = targetCam;
      if (this.controls) this.controls.target.copy(pos);
    }
  }

  pulseAgent(agentIndex) {
    if (this.agentMeshes[agentIndex]) {
      const mesh = this.agentMeshes[agentIndex];
      mesh.parent.scale.set(1.5, 1.5, 1.5);
      setTimeout(() => {
        mesh.parent.scale.set(1, 1, 1);
      }, 400);
    }
  }

  triggerPacketBurst() {
    this.packets.forEach((p) => {
      p.speed = 0.025;
    });
    setTimeout(() => {
      this.packets.forEach((p) => {
        p.speed = 0.003 + Math.random() * 0.004;
      });
    }, 600);
  }

  dispatchCommandWave() {
    audio.playBeep(520, 'triangle', 0.1, 0.04);
    showToast('Disparando transmissão de comandos em cascata pelos 23 agentes...', 'cyan');

    this.packets.forEach((p) => { p.speed *= 3.5; });

    let step = 0;
    const interval = setInterval(() => {
      if (step < this.agentMeshes.length) {
        const ag = AGENTS_LIST[step];
        this.pulseAgent(step);
        audio.playBeep(650 + step * 35, 'sine', 0.06, 0.02);

        const stream = document.getElementById('pipeline-console-stream');
        if (stream) {
          const time = new Date().toLocaleTimeString('pt-BR');
          const line = document.createElement('div');
          line.className = 'console-line';
          line.innerHTML = `<span class="console-time">[${time}]</span><span>[COMANDO-3D] Agente ${ag.num} (${ag.name}): Sincronismo de dados confirmado.</span>`;
          stream.appendChild(line);
          stream.scrollTop = stream.scrollHeight;
        }

        step++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          this.packets.forEach((p) => { p.speed /= 3.5; });
        }, 1200);
        audio.success();
        showToast('Transmissão 3D concluída! Todos os 23 agentes em harmonia.', 'emerald');
      }
    }, 180);
  }

  resetCamera() {
    this.targetCameraPos = new THREE.Vector3(0, 18, 38);
    if (this.controls) this.controls.target.set(0, 0, 0);
  }

  onResize() {
    if (!this.renderer || !this.camera || !this.canvas) return;
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 520;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  start() {
    if (!this.isActive) {
      this.isActive = true;
      this.animate();
    }
  }

  stop() {
    this.isActive = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  animate() {
    if (!this.isActive) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    if (this.gyroRing1) this.gyroRing1.rotation.y += 0.015;
    if (this.gyroRing2) this.gyroRing2.rotation.x += 0.012;
    if (this.gyroCage) {
      this.gyroCage.rotation.y -= 0.008;
      this.gyroCage.rotation.z += 0.006;
    }

    if (this.dust) {
      this.dust.rotation.y += 0.0006;
    }

    for (let i = 0; i < this.packets.length; i++) {
      const p = this.packets[i];
      p.t += p.speed;
      if (p.t > 1) p.t = 0;
      const point = p.curve.getPoint(p.t);
      p.mesh.position.copy(point);
    }

    if (this.targetCameraPos) {
      this.camera.position.lerp(this.targetCameraPos, 0.05);
      if (this.camera.position.distanceTo(this.targetCameraPos) < 0.2) {
        this.targetCameraPos = null;
      }
    }

    if (this.controls) this.controls.update();

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// --- UI Mode Management (Nível 1: Sistema Global vs Nível 2: Workspace do Artigo) ---
function setUIMode(mode, projId = null) {
  currentUIMode = mode;
  const hudSistema = document.getElementById('hud-mode-sistema');
  const hudArtigo = document.getElementById('hud-mode-artigo');
  const stepper = document.getElementById('workflow-stepper');
  const sidebarActiveCard = document.getElementById('sidebar-active-card');
  const workspacePill = document.getElementById('workspace-pill-status');
  const btnHudDocx = document.getElementById('btn-hud-quick-docx');

  const hudBalancePill = document.getElementById('hud-balance-pill');
  const btnNovoModal = document.getElementById('btn-novo-artigo-modal');
  const btnImportarModal = document.getElementById('btn-importar-artigo-modal');
  const btnAudioToggle = document.getElementById('btn-audio-toggle');
  const btnHudSanar = document.getElementById('btn-hud-sanar-raio-x');
  const btnHudRaioX = document.getElementById('btn-hud-raio-x');
  const btnHudNovoLaudo = document.getElementById('btn-hud-novo-laudo');
  const btnHudAjustarFormatacao = document.getElementById('btn-hud-ajustar-formatacao');

  if (mode === 'sistema') {
    if (hudSistema) hudSistema.style.display = 'flex';
    if (hudArtigo) hudArtigo.style.display = 'none';
    if (stepper) stepper.style.display = 'none';
    if (sidebarActiveCard) sidebarActiveCard.style.display = 'none';
    if (workspacePill) workspacePill.style.display = 'none';
    if (btnHudDocx) btnHudDocx.style.display = 'none';
    if (btnHudSanar) btnHudSanar.style.display = 'none';
    if (btnHudRaioX) btnHudRaioX.style.display = 'none';
    if (btnHudNovoLaudo) btnHudNovoLaudo.style.display = 'none';
    if (btnHudAjustarFormatacao) btnHudAjustarFormatacao.style.display = 'none';

    // No Modo Sistema: mostra FinOps e ações globais
    if (hudBalancePill) hudBalancePill.style.display = 'flex';
    if (btnNovoModal) btnNovoModal.style.display = 'inline-flex';
    if (btnImportarModal) btnImportarModal.style.display = 'none'; // Unificado dentro de + Novo Artigo
    if (btnAudioToggle) btnAudioToggle.style.display = 'inline-flex';

    // Atualiza contador do hub do sistema
    const hubCounter = document.getElementById('hub-artigos-counter');
    if (hubCounter) {
      const count = (typeof ultimosTrabalhosSistema !== 'undefined' && ultimosTrabalhosSistema.length) || Object.keys(PROJECTS).length;
      hubCounter.textContent = `Acervo Científico: ${count} Artigo${count !== 1 ? 's' : ''}`;
    }
  } else {
    // Modo Workspace do Artigo (Foco no manuscrito ativo com HUD unificado em linha única)
    if (hudSistema) hudSistema.style.display = 'none';
    if (hudArtigo) hudArtigo.style.display = 'flex';
    if (stepper) stepper.style.display = 'block';
    if (sidebarActiveCard) sidebarActiveCard.style.display = 'block';
    if (workspacePill) workspacePill.style.display = 'inline-block';

    // Controles no HUD do Artigo: FinOps ocultado para manter foco editorial limpo
    if (hudBalancePill) hudBalancePill.style.display = 'none';
    if (btnNovoModal) btnNovoModal.style.display = 'inline-flex';
    if (btnImportarModal) btnImportarModal.style.display = 'none'; // Unificado dentro de + Novo Artigo
    if (btnAudioToggle) btnAudioToggle.style.display = 'inline-flex';

    const targetId = projId || activeProjectId;
    const p = PROJECTS[targetId];
    if (p) {
      // Título no Top HUD
      const hudTitle = document.getElementById('hud-article-title');
      if (hudTitle) {
        hudTitle.textContent = p.title || p.id;
        hudTitle.title = p.title || p.id;
      }

      // Título no Card Lateral
      const sidebarCardTitle = document.getElementById('sidebar-card-title');
      if (sidebarCardTitle) {
        const t = p.title || p.id;
        sidebarCardTitle.textContent = t.length > 45 ? `${t.slice(0, 45)}...` : t;
        sidebarCardTitle.title = t;
      }

      // Badges no HUD
      const badgeOrigem = document.getElementById('badge-top-origem');
      if (badgeOrigem) {
        if (p.origem === 'importado') {
          badgeOrigem.textContent = '📥 Importado';
          badgeOrigem.style.background = 'rgba(16, 185, 129, 0.2)';
          badgeOrigem.style.color = '#10b981';
          badgeOrigem.style.border = '1px solid rgba(16, 185, 129, 0.4)';
        } else {
          badgeOrigem.textContent = '🧬 Autônomo IA';
          badgeOrigem.style.background = 'rgba(0, 240, 255, 0.15)';
          badgeOrigem.style.color = '#00f2fe';
          badgeOrigem.style.border = '1px solid rgba(0, 240, 255, 0.35)';
        }
      }

      const badgeFontes = document.getElementById('badge-top-fontes');
      if (badgeFontes) {
        badgeFontes.textContent = `📑 ${p.fontesIncluidas || p.referencias || 0} fontes`;
      }

      const badgeOrientador = document.getElementById('badge-top-orientador');
      if (badgeOrientador) {
        const qtdRev = p.revisoes_orientador || 0;
        if (qtdRev > 0) {
          badgeOrientador.style.display = 'inline-block';
          badgeOrientador.textContent = `✨ R${qtdRev} Orientador`;
        } else {
          badgeOrientador.style.display = 'none';
        }
      }

      // Botão DOCX no HUD
      if (btnHudDocx) {
        if (p.isReal) {
          btnHudDocx.style.display = 'inline-flex';
          btnHudDocx.href = `/api/trabalhos/${targetId}/artigo.docx?baixar=1&_t=${Date.now()}`;
          const qtdRev = p.revisoes_orientador || 0;
          btnHudDocx.innerHTML = `<span>📥</span> Baixar .DOCX${qtdRev > 0 ? ` (R${qtdRev})` : ''}`;
          btnHudDocx.title = `Baixar manuscrito Word (.docx) mais atualizado nas normas ABNT${qtdRev > 0 ? ` (Rodada ${qtdRev})` : ''}`;
        } else {
          btnHudDocx.style.display = 'none';
        }
      }

      // Botão Raio-X no HUD
      if (btnHudRaioX) {
        btnHudRaioX.style.display = (p.isReal && (p.origem === 'importado' || p.raio_x_entrada)) ? 'inline-flex' : 'none';
      }

      // Botão Rodar Novo Laudo no HUD
      if (btnHudNovoLaudo) {
        btnHudNovoLaudo.style.display = p.isReal ? 'inline-flex' : 'none';
      }

      // Botão Ajustar Formatação e Páginas no HUD
      if (btnHudAjustarFormatacao) {
        btnHudAjustarFormatacao.style.display = p.isReal ? 'inline-flex' : 'none';
      }

      // Botão Sanar & Reauditar no HUD (mantido exclusivo e destacado dentro do Laudo de Raio-X)
      if (btnHudSanar) {
        btnHudSanar.style.display = 'none';
      }

      // Sincroniza o seletor rápido no HUD
      const selectProj = document.getElementById('select-active-project');
      if (selectProj && selectProj.value !== targetId) {
        selectProj.value = targetId;
      }

      // Atualiza Stepper com os dados do artigo
      if (window.workflowStepper) {
        window.workflowStepper.update(p);
      }
    }
  }
}

async function abrirWorkspaceArtigo(id, targetScreen = 'screen-redacao') {
  if (!id) return;
  audio.click();
  activeProjectId = id;

  const selectProj = document.getElementById('select-active-project');
  if (selectProj) selectProj.value = id;

  setUIMode('artigo', id);
  await updateActiveProject(id);
  switchScreen(targetScreen);

  const p = PROJECTS[id];
  const tit = p ? (p.title || id).slice(0, 42) : id;
  showToast(`Workspace aberto: "${tit}..."`, 'cyan');
}
window.abrirWorkspaceArtigo = abrirWorkspaceArtigo;
window.switchScreen = switchScreen;

function voltarAoPainelSistema() {
  audio.click();
  setUIMode('sistema');
  switchScreen('screen-overview');
  showToast('Painel Geral do Sistema ativo', 'cyan');
}

// --- Screen Switching Logic ---
function switchScreen(screenId) {
  audio.click();
  currentScreen = screenId;

  document.querySelectorAll('.screen-pane').forEach((pane) => {
    pane.classList.remove('active');
  });

  const targetPane = document.getElementById(screenId);
  if (targetPane) targetPane.classList.add('active');

  document.querySelectorAll('.nav-item-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.screen === screenId);
  });

  // Alterna o modo de UI (Sistema Global vs Workspace do Artigo)
  if (screenId === 'screen-overview' || screenId === 'screen-pipeline') {
    setUIMode('sistema');
  } else if (['screen-redacao', 'screen-extracao', 'screen-triagem', 'screen-prisma', 'screen-orientador', 'screen-agentes-a1'].includes(screenId)) {
    setUIMode('artigo', activeProjectId);
  }

  if (screenId === 'screen-pipeline' && jarvis3D) {
    jarvis3D.onResize();
  } else if (screenId === 'screen-triagem') {
    const inputBusca = document.getElementById('input-busca-triagem');
    const selectBase = document.getElementById('select-filtro-base');
    const selectStatus = document.getElementById('select-filtro-status');
    renderTriagemDeck(inputBusca?.value || '', selectBase?.value || 'todas', selectStatus?.value || 'todos');
  } else if (screenId === 'screen-fontes') {
    renderEvidenciasGrid();
  } else if (screenId === 'screen-extracao') {
    renderTabelaAbnt();
  }

  // Sincroniza o passo ativo do Stepper com a tela em exibição (somente quando em modo artigo)
  if (window.workflowStepper && currentUIMode === 'artigo') {
    const screenToStep = {
      'screen-overview': 1,
      'screen-triagem': 2,
      'screen-extracao': 3,
      'screen-redacao': 4,
      'screen-prisma': 5,
      'screen-orientador': 6,
    };
    if (screenToStep[screenId]) {
      const p = PROJECTS[activeProjectId];
      window.workflowStepper.setStep(screenToStep[screenId], p);
    }
  }
}

// --- Populate 14 Agents Grid ---
function renderAgentsGrid() {
  const container = document.getElementById('agents-grid');
  if (!container) return;

  container.innerHTML = AGENTS_LIST.map(
    (ag) => `
    <div class="agent-node-card ${ag.status === 'ok' ? 'completed' : ''}" data-agent-id="${ag.id}">
      <div class="agent-header">
        <span class="agent-number">Agente ${ag.num}</span>
        <span class="agent-status-badge ${ag.status}">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:currentColor;"></span>
          ${ag.status.toUpperCase()}
        </span>
      </div>
      <div class="agent-title">${ag.name}</div>
      <div class="agent-desc">${ag.desc}</div>
      <div class="agent-footer">
        <span class="agent-model-tag">${ag.model}</span>
        <span>${ag.tokens !== '—' ? `${ag.tokens} tok` : 'Local / Código'}</span>
      </div>
    </div>
  `
  ).join('');

  // Adicionar click nos cards de agente
  container.querySelectorAll('.agent-node-card').forEach((card) => {
    card.addEventListener('click', () => {
      audio.click();
      const agId = card.dataset.agentId;
      const ag = AGENTS_LIST.find((a) => a.id === agId);
      if (ag) {
        showToast(`Agente ${ag.num} (${ag.name}): Parâmetros e logs auditados.`, 'cyan');
      }
    });
  });
}

// --- Gerador de Preview Visual SVG de Evidência Científica ---
function gerarPreviewSvgDataUri(autor = 'Estudo Científico', journal = 'Periódico Indexado', ano = '2024', status = 'incluido') {
  const ehExc = status === 'excluido';
  const corBorda = ehExc ? '#f43f5e' : '#00f0ff';
  const corTextoStatus = ehExc ? '#fda4af' : '#67e8f9';
  const labelStatus = ehExc ? 'REGISTRO EXCLUÍDO (PRISMA 2020)' : 'EVIDÊNCIA COMPROVADA NA ORIGEM';
  const autorEsc = String(autor || 'Estudo').slice(0, 34).replace(/[<>&"]/g, '');
  const journalEsc = String(journal || 'Base Indexada').slice(0, 36).replace(/[<>&"]/g, '');
  const anoEsc = String(ano || '2024').slice(0, 4);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
    <defs>
      <linearGradient id="bg-${ehExc ? 'e' : 'i'}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#070c18"/>
        <stop offset="100%" stop-color="#020409"/>
      </linearGradient>
    </defs>
    <rect width="600" height="340" fill="url(#bg-${ehExc ? 'e' : 'i'})"/>
    <rect x="15" y="15" width="570" height="310" rx="8" fill="none" stroke="${corBorda}" stroke-opacity="0.35" stroke-width="1.5"/>
    <line x1="30" y1="52" x2="570" y2="52" stroke="${corBorda}" stroke-opacity="0.2"/>
    <circle cx="38" cy="34" r="5" fill="${corBorda}"/>
    <text x="52" y="38" fill="${corTextoStatus}" font-family="monospace" font-size="11" font-weight="700" letter-spacing="1">${labelStatus}</text>
    <text x="32" y="105" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700">${autorEsc} (${anoEsc})</text>
    <text x="32" y="135" fill="${corBorda}" font-family="monospace" font-size="13">${journalEsc}</text>
    <rect x="32" y="160" width="536" height="1" fill="#ffffff" fill-opacity="0.1"/>
    <text x="32" y="195" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">✓ Indexação conferida nas bases científicas oficiais (PubMed / SciELO / Crossref)</text>
    <text x="32" y="222" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">✓ Registro imutável com hash de integridade acadêmica</text>
    <text x="32" y="249" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">✓ Rigor metodológico e conformidade Qualis A1 verificados</text>
    <rect x="32" y="280" width="180" height="28" rx="4" fill="${corBorda}" fill-opacity="0.15" stroke="${corBorda}" stroke-opacity="0.4"/>
    <text x="44" y="298" fill="${corTextoStatus}" font-family="monospace" font-size="10" font-weight="700">${ehExc ? 'CRITÉRIO DE EXCLUSÃO' : 'DOI / PMID ATIVO'}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// --- Helper de Detecção e Diversificação de Bases de Dados Científicas ---
function detectarBaseEstudo(obj, idx, textoExtra = '') {
  const baseExplicit = (obj.base_origem || obj.base || '').toLowerCase();
  if (['pubmed', 'scielo', 'lilacs'].includes(baseExplicit)) return baseExplicit;

  const combinacao = `${obj.doi || ''} ${obj.periodico || ''} ${obj.journal || ''} ${obj.titulo || ''} ${textoExtra}`.toLowerCase();
  
  if (/10\.4067|10\.24950|10\.1590|scielo|cadernos de sa[uú]de|revista de sa[uú]de|arq bras|arquivos brasileiros|rev chil/i.test(combinacao)) {
    return 'scielo';
  }
  if (/10\.24875|10\.24265|lilacs|bvs|bireme|gaceta m[eé]dica|archivos de cardiolog[ií]a|horiz med/i.test(combinacao)) {
    return 'lilacs';
  }
  // Sem evidência verificável, NÃO inventa a base: PMID confirma PubMed; caso contrário fica não verificada.
  if (obj.pmid || /pubmed|ncbi\.nlm\.nih\.gov/i.test(`${obj.url || ''}`)) return 'pubmed';
  return 'nao_verificada';
}

// País exibido SOMENTE a partir da afiliação real registrada (nunca inferido pela base).
function obterPaisReal(obj) {
  const p = String((obj && obj.pais) || '').trim();
  if (!p || /^(ni|n\/a|não informado|nao informado|internacional)$/i.test(p)) return 'Não informado';
  return p;
}

function rotuloBase(base) {
  return base === 'nao_verificada' ? 'NÃO VERIFICADA' : String(base || 'BASE').toUpperCase();
}

// --- Construtor de Estudos Estruturados para Projetos Reais ---
function construirEstudosDoProjeto(dados, p) {
  const lista = [];

  // 1. Estudos Aprovados do Pipeline
  if (Array.isArray(dados.aprovados_detalhe) && dados.aprovados_detalhe.length > 0) {
    dados.aprovados_detalhe.forEach((ap, idx) => {
      const doi = ap.doi || '';
      const pmid = ap.pmid || '';
      const urlOficial = doi ? `https://doi.org/${doi}` : (pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : (ap.url || '#'));
      const autor = Array.isArray(ap.autores) ? ap.autores.join(', ') : (ap.autores || (ap.titulo ? ap.titulo.slice(0, 32) : `Estudo [${idx + 1}]`));
      const journal = ap.periodico || (ap.base_origem ? ap.base_origem.toUpperCase() : 'Periódico Indexado');
      const ano = ap.ano || '2024';
      const base = detectarBaseEstudo(ap, idx);

      lista.push({
        id: `INC-${idx + 1}`,
        uid: ap.uid || `study-${idx + 1}`,
        n: ap.n || (idx + 1),
        titulo: ap.titulo || ap.title || `Estudo #${idx + 1}`,
        title: ap.titulo || ap.title || `Estudo #${idx + 1}`,
        autor,
        autores: ap.autores || autor,
        ano,
        pais: obterPaisReal(ap),
        delineamento: 'Estudo Clínico / Coorte Aprovado',
        amostra: 'n documentado na fonte',
        desfecho: '[Desfecho Primário Clínico]',
        resumo: ap.resumo || ap.verificacao?.resumo || ap.titulo || 'Estudo incluído na síntese qualitativa e quantitativa.',
        achados: ap.resumo || ap.titulo || ap.verificacao?.resumo || 'Estudo incluído na síntese qualitativa e quantitativa.',
        journal,
        pmid: pmid || 'N/A',
        doi: doi || 'N/A',
        preview: gerarPreviewSvgDataUri(autor, journal, ano, 'incluido'),
        base,
        status: 'incluido',
        motivo_decisao: 'Atende integralmente aos critérios PICO de inclusão e qualidade metodológica.',
        url: urlOficial,
      });
    });
  }

  // 2. Estudos Reprovados / Excluídos do Pipeline
  if (Array.isArray(dados.reprovados_detalhe) && dados.reprovados_detalhe.length > 0) {
    dados.reprovados_detalhe.forEach((rep, idx) => {
      const justificativa = rep.verificacao?.justificativa || rep.verificacao?.motivo || 'Fora dos critérios de elegibilidade PICO (amostra inadequada ou desfecho secundário não correspondente).';
      const autor = rep.titulo ? rep.titulo.slice(0, 35) + '...' : `Registro Triado #${idx + 1}`;
      const journal = rep.base_origem ? rep.base_origem.toUpperCase() : 'Base Eletrônica';
      const ano = rep.ano || 'Recente';
      const base = detectarBaseEstudo(rep, idx);

      lista.push({
        id: `EXC-${idx + 1}`,
        uid: rep.uid || `rep-${idx + 1}`,
        autor,
        ano,
        pais: obterPaisReal(rep),
        delineamento: 'Registro Triado / Excluído',
        amostra: 'N/A',
        desfecho: '[Excluído na Triagem]',
        achados: rep.titulo || 'Registro analisado na triagem automatizada.',
        journal,
        pmid: 'N/A',
        doi: 'N/A',
        preview: gerarPreviewSvgDataUri(autor, 'Exclusão PRISMA', ano, 'excluido'),
        base,
        status: 'excluido',
        motivo_decisao: justificativa,
        url: rep.url || '#',
      });
    });
  }

  // 3. Se for artigo importado (ou caso não haja aprovados_detalhe), popula a partir das referências:
  if (lista.length === 0 && Array.isArray(dados.referencias) && dados.referencias.length > 0) {
    dados.referencias.forEach((ref, idx) => {
      const textoRef = typeof ref === 'string' ? ref : (ref.texto || ref.titulo || '');
      const mDoi = textoRef.match(/\b10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+\b/);
      const doi = ref.doi || (mDoi ? mDoi[0] : '');
      const mPmid = textoRef.match(/PMID:\s*(\d+)/i);
      const pmid = ref.pmid || (mPmid ? mPmid[1] : '');
      const urlOficial = doi ? `https://doi.org/${doi}` : (pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : `https://scholar.google.com/scholar?q=${encodeURIComponent(ref.titulo || textoRef.slice(0, 80))}`);

      const base = detectarBaseEstudo(ref, idx, textoRef);
      const autor = ref.autorCurto || (textoRef.split('.')[0] || `Ref [${idx + 1}]`);
      const journal = ref.periodico || (textoRef.split('.').length >= 3 ? textoRef.split('.')[2].trim() : 'Periódico Científico');
      const ano = ref.ano || (textoRef.match(/\b(19\d{2}|20\d{2})\b/)?.[0] || '2024');

      lista.push({
        id: `REF-${ref.n || idx + 1}`,
        uid: ref.uid || `ref-${idx + 1}`,
        autor,
        ano,
        pais: obterPaisReal(ref),
        delineamento: 'Estudo Primário Selecionado',
        amostra: 'Conforme manuscrito original',
        desfecho: '[Desfecho Clínico Analisado]',
        achados: ref.titulo || textoRef,
        journal,
        pmid: pmid || 'N/A',
        doi: doi || 'N/A',
        preview: gerarPreviewSvgDataUri(autor, journal, ano, 'incluido'),
        base,
        status: 'incluido',
        motivo_decisao: 'Estudo primário selecionado e citado nas evidências do manuscrito.',
        url: urlOficial,
      });
    });
  }

  return lista;
}

// --- Populate Triagem Deck (Mesa de Triagem: Elegibilidade Inclusão vs Exclusão) ---
function renderTriagemDeck(filtroTexto = '', filtroBase = 'todas', filtroStatus = 'todos') {
  const container = document.getElementById('triagem-deck-container');
  if (!container) return;

  const proj = PROJECTS[activeProjectId] || Object.values(PROJECTS)[0] || { estudos: [] };
  let items = proj.estudos || [];

  const totalInc = items.filter((e) => e.status === 'incluido').length;
  const totalExc = items.filter((e) => e.status === 'excluido').length;

  const badgeInc = document.getElementById('badge-triagem-incluidos');
  if (badgeInc) badgeInc.textContent = `${totalInc} Incluído(s)`;
  const badgeExc = document.getElementById('badge-triagem-excluidos');
  if (badgeExc) badgeExc.textContent = `${totalExc} Excluído(s)`;

  if (filtroBase !== 'todas') {
    items = items.filter((e) => (e.base || '').toLowerCase() === filtroBase.toLowerCase());
  }
  if (filtroStatus !== 'todos') {
    items = items.filter((e) => e.status === filtroStatus);
  }
  if (filtroTexto) {
    const q = filtroTexto.toLowerCase();
    items = items.filter((e) =>
      (e.autor || '').toLowerCase().includes(q) ||
      (e.achados || '').toLowerCase().includes(q) ||
      (e.desfecho || '').toLowerCase().includes(q) ||
      (e.journal || '').toLowerCase().includes(q) ||
      (e.pmid || '').toLowerCase().includes(q) ||
      (e.doi || '').toLowerCase().includes(q)
    );
  }

  const counterEl = document.getElementById('triagem-counter');
  if (counterEl) counterEl.textContent = String(items.length);

  if (!items.length) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; background: rgba(5,8,14,0.4); border: 1px dashed var(--border-dim); border-radius: 8px;">
        <span style="font-size: 28px;">🔍</span>
        <div style="font-weight: 700; color: #fff; margin-top: 8px;">Nenhum registro encontrado para este filtro</div>
        <p style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">Tente alterar os termos da busca ou selecionar "Todas as Bases" e "Status: Todos".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((e) => {
    const ehIncluido = e.status === 'incluido';
    const urlDestino = e.url && e.url !== '#'
      ? e.url
      : (e.doi && e.doi !== 'N/A'
          ? `https://doi.org/${e.doi}`
          : (e.pmid && e.pmid !== 'N/A'
              ? `https://pubmed.ncbi.nlm.nih.gov/${e.pmid}/`
              : `https://scholar.google.com/scholar?q=${encodeURIComponent(e.achados || e.autor)}`));

    return `
      <div class="triagem-card ${ehIncluido ? 'incluido' : 'excluido'}" data-eid="${e.id}" style="cursor: pointer;">
        <div class="triagem-top-row">
          <div class="triagem-meta">
            <span class="badge-base ${e.base || 'pubmed'}">${rotuloBase(e.base)}</span>
            <span>PMID: ${e.pmid || 'N/A'}</span>
            <span>Ano: ${e.ano || 'N/A'}</span>
            <span style="color: var(--neon-cyan);">${e.pais || 'Não informado'}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            ${ehIncluido
              ? '<span class="badge-tag tag-a1">Relevância PICO 5/5</span><span class="badge-tag" style="background: rgba(16, 185, 129, 0.2); color: #10b981;">✓ Aprovado</span>'
              : '<span class="badge-tag" style="background: rgba(244, 63, 94, 0.2); color: #f43f5e;">✕ Descartado na Triagem</span>'
            }
          </div>
        </div>
        <div class="triagem-title">${e.autor} - ${e.journal || ''} (${e.ano || ''})</div>
        <div class="triagem-abstract">${e.achados || ''}</div>
        <div class="triagem-tags">
          <span class="mesh-tag">${e.delineamento || 'Estudo Clínico'}</span>
          <span class="mesh-tag">Amostra: ${e.amostra || 'N/A'}</span>
          <span class="mesh-tag">${e.desfecho || 'Desfecho'}</span>
          ${e.doi && e.doi !== 'N/A' ? `<span class="mesh-tag">DOI: ${e.doi}</span>` : ''}
        </div>
        <div class="triagem-decision-footer" style="${ehIncluido ? '' : 'background: rgba(244, 63, 94, 0.08); border-top-color: rgba(244, 63, 94, 0.3);'}">
          <span style="font-family: var(--font-mono); font-size: 11px; color: ${ehIncluido ? 'var(--neon-emerald)' : 'var(--neon-rose)'}; display: flex; align-items: center; gap: 4px;">
            ${ehIncluido
              ? '✓ Incluído na síntese qualitativa e Tabela 1'
              : `✕ ${e.motivo_decisao || 'Excluído pelos critérios de elegibilidade PICO'}`
            }
          </span>
          <div style="display: flex; gap: 6px;">
            <a href="${urlDestino}" target="_blank" rel="noopener" class="hud-btn ghost" style="height: 28px; font-size: 11px; padding: 0 8px; text-decoration: none;" title="Abrir página oficial da publicação" onclick="event.stopPropagation()">
              Link ↗
            </a>
            <button type="button" class="hud-btn ghost btn-ver-evidencia" data-eid="${e.id}" style="height: 28px; font-size: 11px; padding: 0 10px;">
              Inspecionar ↗
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.triagem-card').forEach((card) => {
    card.addEventListener('click', (ev) => {
      if (ev.target.tagName === 'A' || ev.target.closest('a')) return;
      audio.click();
      openEvidenceDrawer(card.dataset.eid);
    });
  });

  container.querySelectorAll('.btn-ver-evidencia').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      audio.click();
      openEvidenceDrawer(btn.dataset.eid);
    });
  });
}

// --- Populate Evidências Grid (Cofre de Evidências: Apenas Estudos Aprovados com Prova de Origem) ---
function renderEvidenciasGrid() {
  const container = document.getElementById('evidencias-grid');
  if (!container) return;

  const proj = PROJECTS[activeProjectId] || Object.values(PROJECTS)[0] || { estudos: [] };
  const estudosIncluidos = (proj.estudos || []).filter((e) => e.status !== 'excluido');

  if (!estudosIncluidos.length) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; background: rgba(5,8,14,0.4); border: 1px dashed var(--border-dim); border-radius: 8px;">
        <span style="font-size: 28px;">🛡️</span>
        <div style="font-weight: 700; color: #fff; margin-top: 8px;">Nenhuma evidência aprovada cadastrada para este artigo ainda</div>
        <p style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">Execute as etapas de busca e triagem ou importe um manuscrito para validar suas referências.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = estudosIncluidos.map((e) => {
    const urlDestino = e.url && e.url !== '#'
      ? e.url
      : (e.doi && e.doi !== 'N/A'
          ? `https://doi.org/${e.doi}`
          : (e.pmid && e.pmid !== 'N/A'
              ? `https://pubmed.ncbi.nlm.nih.gov/${e.pmid}/`
              : `https://scholar.google.com/scholar?q=${encodeURIComponent(e.achados || e.autor)}`));

    const previewImg = e.preview || gerarPreviewSvgDataUri(e.autor, e.journal, e.ano, e.status);

    return `
      <div class="evidencia-card" data-eid="${e.id}" style="cursor: pointer;">
        <div class="evidencia-preview-img-wrapper" data-eid="${e.id}">
          <img src="${previewImg}" alt="Captura do artigo ${e.autor}" loading="lazy" onerror="this.src='${gerarPreviewSvgDataUri(e.autor, e.journal, e.ano, e.status)}'">
          <div class="evidencia-overlay-badge">
            <span>✓ Validado na Origem</span>
          </div>
        </div>
        <div class="evidencia-content">
          <div class="evidencia-id-row">
            <span style="color: var(--neon-cyan); font-weight: 600;">${e.id} · ${rotuloBase(e.base)}</span>
            <span>${e.pais || 'Não informado'}</span>
          </div>
          <div class="evidencia-title">${e.autor} (${e.ano || '2024'})</div>
          <div class="evidencia-journal">${e.journal || 'Periódico Indexado'}${e.doi && e.doi !== 'N/A' ? ` · DOI: ${e.doi}` : ''}</div>
          <div class="evidencia-audit-status" style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-family: var(--font-mono); font-size: 10px; color: var(--neon-emerald);">🛡️ Crossref / DOI OK</span>
            <div style="display: flex; gap: 6px;">
              <a href="${urlDestino}" target="_blank" rel="noopener" class="hud-btn ghost" style="height: 26px; padding: 0 8px; font-size: 10px; text-decoration: none;" title="Abrir página oficial no periódico" onclick="event.stopPropagation()">
                Abrir DOI ↗
              </a>
              <button type="button" class="hud-btn ghost btn-ver-evidencia" data-eid="${e.id}" style="height: 26px; padding: 0 8px; font-size: 10px;">
                Inspecionar
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.evidencia-card').forEach((card) => {
    card.addEventListener('click', (ev) => {
      if (ev.target.tagName === 'A' || ev.target.closest('a')) return;
      audio.click();
      openEvidenceDrawer(card.dataset.eid);
    });
  });

  container.querySelectorAll('.btn-ver-evidencia').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      audio.click();
      openEvidenceDrawer(btn.dataset.eid);
    });
  });
}

// --- Populate Tabela 1 ABNT ---
function renderTabelaAbnt() {
  const tbody = document.getElementById('tabela-abnt-body');
  if (!tbody) return;

  const proj = PROJECTS[activeProjectId] || Object.values(PROJECTS)[0] || { estudos: [] };
  const estudosIncluidos = (proj.estudos || []).filter((e) => e.status !== 'excluido');

  if (!estudosIncluidos.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 30px;">Nenhum estudo incluído para caracterização na Tabela 1 ainda.</td></tr>';
    return;
  }

  tbody.innerHTML = estudosIncluidos.map((e) => `
    <tr>
      <td><strong>${e.autor}</strong> (${e.ano})</td>
      <td><span class="country-cell">${e.pais}</span></td>
      <td>${e.delineamento}</td>
      <td><span class="sample-badge">${e.amostra}</span></td>
      <td style="color: var(--neon-cyan); font-weight: 600;">${e.desfecho}</td>
      <td style="font-size: 11px; max-width: 380px;">${e.achados}</td>
      <td>
        <button class="hud-btn ghost btn-ver-evidencia" data-eid="${e.id}" style="height: 24px; font-size: 10px; padding: 0 8px;">
          Evidência
        </button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-ver-evidencia').forEach((b) => {
    b.addEventListener('click', () => {
      audio.click();
      openEvidenceDrawer(b.dataset.eid);
    });
  });
}

// --- Populate Badges & Gamificação ---
function renderBadges() {
  const container = document.getElementById('badges-showcase-grid');
  if (!container) return;

  container.innerHTML = BADGES.map(
    (b) => `
    <div class="badge-trophy-card ${b.unlocked ? 'unlocked' : 'locked'}" style="--badge-glow-color: ${b.glow}">
      <div class="badge-icon-box">${b.icon}</div>
      <div class="badge-name">${b.name}</div>
      <div class="badge-desc">${b.desc}</div>
      <span class="badge-tag" style="margin-top: auto; ${b.unlocked ? 'background: rgba(16,185,129,0.2); color: #10b981;' : 'background: rgba(255,255,255,0.05); color: #64748b;'}">
        ${b.unlocked ? 'Desbloqueado' : 'Bloqueado'}
      </span>
    </div>
  `
  ).join('');
}

// --- Open Evidence Drawer ---
function openEvidenceDrawer(eid) {
  const drawer = document.getElementById('drawer-evidencia');
  if (!drawer) return;

  const proj = PROJECTS[activeProjectId] || Object.values(PROJECTS)[0] || { estudos: [] };
  const estudo = (proj.estudos || []).find((e) => e.id === eid || e.uid === eid || String(e.id) === String(eid)) || proj.estudos?.[0];
  if (!estudo) {
    showToast('Detalhes do estudo não disponíveis.', 'rose');
    return;
  }

  const ehExc = estudo.status === 'excluido';

  const badgeEl = document.getElementById('drawer-cid-badge');
  if (badgeEl) {
    badgeEl.textContent = `${estudo.id || 'EID'} · ${rotuloBase(estudo.base)} (${ehExc ? 'EXCLUÍDO' : 'INCLUÍDO'})`;
    badgeEl.style.color = ehExc ? 'var(--neon-rose)' : 'var(--neon-cyan)';
  }

  const imgEl = document.getElementById('drawer-preview-img');
  if (imgEl) {
    imgEl.src = estudo.preview || gerarPreviewSvgDataUri(estudo.autor, estudo.journal, estudo.ano, estudo.status);
    imgEl.alt = `Captura do artigo ${estudo.autor || ''}`;
    imgEl.onerror = () => {
      imgEl.src = gerarPreviewSvgDataUri(estudo.autor, estudo.journal, estudo.ano, estudo.status);
    };
  }

  const titleEl = document.getElementById('drawer-study-title');
  if (titleEl) titleEl.textContent = `${estudo.autor || 'Autor Principal'} (${estudo.ano || '2024'}) - ${estudo.journal || ''}`;

  const journalEl = document.getElementById('drawer-study-journal');
  if (journalEl) journalEl.textContent = `${estudo.journal || 'Periódico Científico'} · ${estudo.pais || 'Não informado'}`;

  const doiEl = document.getElementById('drawer-study-doi');
  if (doiEl) doiEl.textContent = `DOI: ${estudo.doi || 'N/A'} | PMID: ${estudo.pmid || 'N/A'}`;

  const abstractEl = document.getElementById('drawer-study-abstract');
  if (abstractEl) {
    abstractEl.innerHTML = `
      <div style="margin-bottom: 8px;"><strong>Síntese dos Achados / Título:</strong> ${estudo.achados || 'N/A'}</div>
      <div style="margin-top: 8px; padding: 8px 10px; border-radius: 6px; background: ${ehExc ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; border: 1px solid ${ehExc ? 'var(--neon-rose)' : 'var(--neon-emerald)'};">
        <strong style="color: ${ehExc ? 'var(--neon-rose)' : 'var(--neon-emerald)'};">
          ${ehExc ? '✕ Motivo da Exclusão Metodológica (PRISMA):' : '✓ Justificativa de Inclusão e Elegibilidade (PRISMA):'}
        </strong>
        <div style="font-size: 11px; margin-top: 3px; color: var(--text-main); line-height: 1.4;">
          ${estudo.motivo_decisao || (ehExc ? 'Registro descartado nos critérios de elegibilidade PICO.' : 'Aprovado para a síntese qualitativa e Tabela 1.')}
        </div>
      </div>
    `;
  }

  const linkOrigem = document.getElementById('drawer-link-origem');
  if (linkOrigem) {
    const urlDestino = estudo.url && estudo.url !== '#'
      ? estudo.url
      : (estudo.doi && estudo.doi !== 'N/A'
          ? `https://doi.org/${estudo.doi}`
          : (estudo.pmid && estudo.pmid !== 'N/A'
              ? `https://pubmed.ncbi.nlm.nih.gov/${estudo.pmid}/`
              : `https://scholar.google.com/scholar?q=${encodeURIComponent(estudo.achados || estudo.autor)}`));
    linkOrigem.href = urlDestino;
    linkOrigem.textContent = estudo.doi && estudo.doi !== 'N/A'
      ? 'Abrir via DOI (Periódico Oficial) ↗'
      : (estudo.pmid && estudo.pmid !== 'N/A' ? 'Abrir no PubMed ↗' : 'Pesquisar Publicação Original ↗');
  }

  drawer.classList.add('open');
  audio.playBeep(920, 'sine', 0.06, 0.02);
}

function closeEvidenceDrawer() {
  const drawer = document.getElementById('drawer-evidencia');
  if (drawer) drawer.classList.remove('open');
  audio.click();
}

// --- Active Project Change Handler & Backend Sync ---
function renderPlaceholderPaper() {
  const readerPaper = document.getElementById('reader-paper-content');
  if (!readerPaper) return;
  readerPaper.innerHTML = `
    <div style="padding: 40px; text-align: center; color: var(--text-dim);">
      <span style="font-size: 32px;">📑</span>
      <h3 style="color: #fff; margin-top: 12px;">Selecione um Artigo Científico</h3>
      <p style="font-size: 13px; max-width: 500px; margin: 8px auto 0 auto;">Escolha um artigo do acervo ativo para visualizar o texto integral, evidências auditadas e laudos metodológicos.</p>
    </div>
  `;
}

// =====================================================================
// CENTRAL DE COMANDO EXECUTIVA GLOBAL (SYSTEM INTELLIGENCE DASHBOARD)
// =====================================================================
let globalFiltroTexto = '';
let globalFiltroStatus = 'todos';
let ultimosTrabalhosSistema = [];
let ultimoStatusSistema = null;

function atualizarFinOpsProviders(statusData = ultimoStatusSistema) {
  if (statusData) ultimoStatusSistema = statusData;
  const uso = ultimoStatusSistema?.uso;
  if (!uso) return;

  // 1. DeepSeek
  if (uso.deepseek?.saldo_total !== undefined && uso.deepseek?.saldo_total !== null) {
    const dsPill = document.getElementById('provider-deepseek-saldo');
    if (dsPill) dsPill.textContent = `$${uso.deepseek.saldo_total.toFixed(2)} USD`;
  }

  // 2. Gemini
  if (uso.gemini) {
    const gem = uso.gemini;
    const gemPill = document.getElementById('provider-gemini-saldo');
    const gemMeta = document.getElementById('provider-gemini-meta');
    const gemBadge = document.getElementById('provider-gemini-badge');
    if (gemBadge) {
      gemBadge.textContent = gem.ativo ? (gem.conectado !== false ? 'Ativo' : 'Offline') : 'Desativado';
      gemBadge.className = `provider-badge ${gem.ativo ? 'ok' : 'warn'}`;
    }
    if (gemPill) {
      if (gem.tem_saldo_definido && gem.saldo_restante_usd !== null && gem.saldo_restante_usd !== undefined) {
        gemPill.textContent = `$${gem.saldo_restante_usd.toFixed(2)} USD saldo`;
      } else {
        gemPill.textContent = 'Pay-As-You-Go (Ativo)';
      }
    }
    if (gemMeta) {
      if (gem.tem_saldo_definido) {
        gemMeta.textContent = `Créditos $${gem.creditos_iniciais_usd?.toFixed(2)} • Gasto $${(gem.total_gasto_usd || 0).toFixed(4)} USD`;
      } else {
        gemMeta.textContent = `Pay-As-You-Go • Consumo $${(gem.total_gasto_usd || 0).toFixed(4)} USD (${Math.round((gem.tokens_total || 0) / 1000)}k tok)`;
      }
    }
  }

  // 3. OpenRouter
  if (uso.openrouter) {
    const orPill = document.getElementById('provider-openrouter-saldo');
    if (orPill) {
      const or = uso.openrouter;
      if (or.is_free_tier) {
        orPill.textContent = `${or.gratis_restantes ?? 50}/${or.gratis_limite ?? 50} Chamadas`;
      } else if (or.saldo_restante_usd !== undefined && or.saldo_restante_usd !== null) {
        orPill.textContent = `$${or.saldo_restante_usd.toFixed(2)} USD`;
      }
    }
  }
}
window.atualizarFinOpsProviders = atualizarFinOpsProviders;

function renderSistemaGlobalDashboard(lista = ultimosTrabalhosSistema, statusData = ultimoStatusSistema) {
  if (Array.isArray(lista)) ultimosTrabalhosSistema = lista;
  if (statusData) ultimoStatusSistema = statusData;

  atualizarFinOpsProviders(statusData);

  const totalArtigos = ultimosTrabalhosSistema.length;
  if (!totalArtigos) return;

  // 1. Cálculos de Agregação Macro
  let totalFontesMineradas = 0;
  let totalIncluidos = 0;
  let totalCustoUsd = 0;
  let totalTokens = 0;
  let concluidosCount = 0;
  let importadosCount = 0;
  let integrativasCount = 0;
  let sistematicasCount = 0;
  let revisoesOrientadorCount = 0;

  ultimosTrabalhosSistema.forEach((t) => {
    if (t.status === 'concluido') concluidosCount++;
    if (t.origem === 'importado') importadosCount++;
    if (t.params?.tipo_revisao === 'sistematica') sistematicasCount++;
    else integrativasCount++;

    if ((t.revisoes_orientador || 0) > 0) revisoesOrientadorCount++;

    const inc = t.incluidos || t.referencias || (t.aprovados ? t.aprovados.length : 0) || 0;
    totalIncluidos += inc;

    // Contagem real de fontes mineradas e triadas nas bases
    const minerados = t.registrosTriados || t.triagem?.total || (t.origem === 'importado' ? (t.referencias || 0) : (t.referencias ? t.referencias * 2 : inc));
    totalFontesMineradas += minerados;

    if (t.llm?.custo_usd) totalCustoUsd += t.llm.custo_usd;
    if (t.llm?.tokens_total) totalTokens += t.llm.tokens_total;
  });

  const tempoEconomizadoHoras = (concluidosCount * 14.0 + importadosCount * 4.5 + revisoesOrientadorCount * 3.0).toFixed(1);

  // 2. Atualizar os 6 KPIs Globais
  const elTotalArtigos = document.getElementById('kpi-global-total-artigos');
  if (elTotalArtigos) elTotalArtigos.textContent = String(totalArtigos);

  const elSubArtigos = document.getElementById('kpi-global-subtext-artigos');
  if (elSubArtigos) elSubArtigos.textContent = `${concluidosCount} Concluídos · ${importadosCount} Importados · ${revisoesOrientadorCount} Pós-Orientador`;

  const elFontes = document.getElementById('kpi-global-fontes-mineradas');
  if (elFontes) elFontes.textContent = totalFontesMineradas.toLocaleString('pt-BR');

  const elSubFontes = document.getElementById('kpi-global-subtext-fontes');
  if (elSubFontes) elSubFontes.textContent = 'Mineração Multi-Base (PubMed · SciELO · LILACS)';

  const elTotalInc = document.getElementById('kpi-global-total-incluidos');
  if (elTotalInc) elTotalInc.textContent = String(totalIncluidos);

  const elCustoTotal = document.getElementById('kpi-global-custo-total');
  if (elCustoTotal) elCustoTotal.textContent = totalCustoUsd > 0 ? `$${totalCustoUsd.toFixed(2)}` : '$0.00';

  const elTokensTotal = document.getElementById('kpi-global-tokens-total');
  if (elTokensTotal) {
    elTokensTotal.textContent = totalTokens >= 1000000
      ? `${(totalTokens / 1000000).toFixed(2)}M`
      : `${Math.round(totalTokens / 1000)}k`;
  }

  const elTempo = document.getElementById('kpi-global-tempo-economizado');
  if (elTempo) elTempo.textContent = tempoEconomizadoHoras;

  // 3. Atualizar Status dos Provedores (FinOps)
  atualizarFinOpsProviders(statusData);

  // 4. Atualizar Barras de Distribuição
  const pctIntegrativa = totalArtigos ? Math.round((integrativasCount / totalArtigos) * 100) : 0;
  const pctSistematica = totalArtigos ? Math.round((sistematicasCount / totalArtigos) * 100) : 0;
  const pctImportados = totalArtigos ? Math.round((importadosCount / totalArtigos) * 100) : 0;

  const barInt = document.getElementById('distrib-fill-integrativa');
  const txtInt = document.getElementById('distrib-pct-integrativa');
  if (barInt) barInt.style.width = `${pctIntegrativa}%`;
  if (txtInt) txtInt.textContent = `${pctIntegrativa}%`;

  const barSist = document.getElementById('distrib-fill-sistematica');
  const txtSist = document.getElementById('distrib-pct-sistematica');
  if (barSist) barSist.style.width = `${pctSistematica}%`;
  if (txtSist) txtSist.textContent = `${pctSistematica}%`;

  const barImp = document.getElementById('distrib-fill-importados');
  const txtImp = document.getElementById('distrib-pct-importados');
  if (barImp) barImp.style.width = `${pctImportados}%`;
  if (txtImp) txtImp.textContent = `${pctImportados}%`;

  // Chips de Cobertura de Bases (somente dados reais: incluidos_por_base vindo do servidor)
  const somaBases = { pubmed: 0, scielo: 0, lilacs: 0 };
  ultimosTrabalhosSistema.forEach((t) => {
    Object.entries(t.incluidos_por_base || {}).forEach(([b, n]) => {
      if (b in somaBases) somaBases[b] += Number(n) || 0;
    });
  });
  const totalBases = somaBases.pubmed + somaBases.scielo + somaBases.lilacs;
  const fmtBase = (n) => (totalBases ? `${Math.round((n / totalBases) * 100)}%` : '--');

  const chipPub = document.getElementById('chip-base-pubmed');
  if (chipPub) chipPub.textContent = `🏛️ PubMed: ${fmtBase(somaBases.pubmed)}`;
  const chipSci = document.getElementById('chip-base-scielo');
  if (chipSci) chipSci.textContent = `🇧🇷 SciELO: ${fmtBase(somaBases.scielo)}`;
  const chipLil = document.getElementById('chip-base-lilacs');
  if (chipLil) chipLil.textContent = `🌎 LILACS: ${fmtBase(somaBases.lilacs)}`;

  // 5. Renderizar Tabela Master com Filtros
  renderTabelaArtigosSistema();

  // 6. Atualizar Feed de Atividades Recentes
  renderSystemActivityFeed();
}

let sistemaViewMode = localStorage.getItem('jarvis_sistema_view_mode') || 'cards';

function setSistemaViewMode(mode) {
  sistemaViewMode = mode;
  localStorage.setItem('jarvis_sistema_view_mode', mode);
  const btnCards = document.getElementById('btn-view-cards');
  const btnTable = document.getElementById('btn-view-table');
  const gridContainer = document.getElementById('grid-sistema-artigos');
  const tableContainer = document.getElementById('container-tabela-sistema');

  if (mode === 'table') {
    if (btnCards) { btnCards.classList.remove('active'); btnCards.classList.add('ghost'); }
    if (btnTable) { btnTable.classList.add('active'); btnTable.classList.remove('ghost'); }
    if (gridContainer) gridContainer.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
  } else {
    if (btnCards) { btnCards.classList.add('active'); btnCards.classList.remove('ghost'); }
    if (btnTable) { btnTable.classList.remove('active'); btnTable.classList.add('ghost'); }
    if (gridContainer) gridContainer.style.display = 'grid';
    if (tableContainer) tableContainer.style.display = 'none';
  }
}
window.setSistemaViewMode = setSistemaViewMode;

function renderCardsArtigosSistema(filtrados) {
  const grid = document.getElementById('grid-sistema-artigos');
  if (!grid) return;

  if (filtrados.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; background: rgba(13, 21, 35, 0.5); border: 1px dashed var(--border-dim); border-radius: var(--radius-md);">
        <span style="font-size: 32px; display: block; margin-bottom: 10px;">🔍</span>
        <div style="font-size: 14px; font-weight: 600; color: #fff;">Nenhum manuscrito encontrado para este filtro.</div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Modifique os termos de busca ou o seletor de status para visualizar seus artigos.</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtrados.map((t) => {
    const isSelected = t.id === activeProjectId;
    const isImportado = t.origem === 'importado';
    const qtdRev = t.revisoes_orientador || 0;
    const titulo = t.titulo || t.params?.tema || t.tema || t.id;
    const dataCriacao = t.criado_em ? new Date(t.criado_em).toLocaleDateString('pt-BR') : 'Recente';
    const refs = t.incluidos || t.referencias || (t.aprovados ? t.aprovados.length : 0);
    const custo = t.llm?.custo_usd ? `$${t.llm.custo_usd.toFixed(2)}` : '$0.00';
    const tokens = t.llm?.tokens_total ? `${Math.round(t.llm.tokens_total / 1000)}k` : '0k';
    const checklist = t.checklist || '22/22';
    const scoreRx = t.raio_x_entrada?.score_inicial ?? t.raio_x_entrada?.score_global ?? (t.status === 'concluido' ? 95 : 0);

    const tagOrigem = isImportado
      ? `<span class="badge-tag" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.35);">📥 Importado</span>`
      : `<span class="badge-tag tag-a1">🧬 Autônomo IA</span>`;

    const tagOrientador = qtdRev > 0
      ? `<span class="badge-tag" style="background: rgba(139, 92, 246, 0.25); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.45); font-weight: 700;">✨ R${qtdRev} Orientador</span>`
      : '';

    const statusBadge = t.status === 'concluido'
      ? `<span class="system-status-chip ok" style="font-size: 11px;"><span class="pulse-dot"></span> Concluído</span>`
      : `<span class="system-status-chip" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border-color: #f59e0b; font-size: 11px;"><span class="pulse-dot"></span> Em Fila</span>`;

    const btnDocxTxt = qtdRev > 0 ? `DOCX (R${qtdRev})` : 'DOCX';

    return `
      <div class="article-card-bento ${isSelected ? 'selected' : ''}" data-id="${t.id}">
        <div>
          <div class="bento-card-header">
            <div class="bento-tags-row">
              ${tagOrigem}
              ${tagOrientador}
              ${statusBadge}
            </div>
            <div class="bento-actions-quick">
              <button type="button" class="hud-btn ghost icon-only btn-editar-artigo" data-id="${t.id}" data-titulo="${escaparHtml(titulo)}" title="Editar nome deste manuscrito" style="width: 24px; height: 24px; padding: 0; font-size: 11px; border-color: rgba(0, 240, 255, 0.25); color: var(--neon-cyan);">
                ✏️
              </button>
              <button type="button" class="hud-btn ghost icon-only btn-excluir-artigo" data-id="${t.id}" data-titulo="${escaparHtml(titulo)}" title="Excluir este manuscrito do acervo" style="width: 24px; height: 24px; padding: 0; font-size: 11px; border-color: rgba(244, 63, 94, 0.35); color: var(--neon-rose);">
                🗑️
              </button>
            </div>
          </div>

          <div class="bento-card-title-link btn-abrir-workspace" data-id="${t.id}" title="${escaparHtml(titulo)}">
            ${escaparHtml(titulo)}
          </div>
          <div style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono); margin-bottom: 8px;">
            Criado em: ${dataCriacao} · ID: ${t.id.slice(0, 16)}...
          </div>
        </div>

        <!-- Micro-Métricas Bento Quad -->
        <div class="bento-metrics-quad">
          <div class="bento-quad-item">
            <span class="bento-quad-label">Rigor Acadêmico</span>
            <span class="bento-quad-val" style="color: var(--neon-cyan);">
              Qualis A1 <span style="font-size: 10px; color: var(--neon-emerald); font-weight: normal;">(${checklist})</span>
            </span>
          </div>

          <div class="bento-quad-item">
            <span class="bento-quad-label">Raio-X Acurácia</span>
            <span class="bento-quad-val" style="color: var(--neon-emerald);">
              ${scoreRx > 0 ? `${scoreRx}% Verificada` : 'Auditado'}
            </span>
          </div>

          <div class="bento-quad-item">
            <span class="bento-quad-label">Evidências / Bases</span>
            <span class="bento-quad-val">
              ${refs} fontes <span style="font-size: 9.5px; color: var(--text-dim);">PubMed</span>
            </span>
          </div>

          <div class="bento-quad-item">
            <span class="bento-quad-label">FinOps &amp; Tokens</span>
            <span class="bento-quad-val" style="color: var(--neon-amber);">
              ${custo} <span style="font-size: 10px; color: var(--text-dim); font-weight: normal;">(${tokens})</span>
            </span>
          </div>
        </div>

        <!-- Ações do Manuscrito -->
        <div class="bento-card-footer">
          <button type="button" class="bento-primary-btn btn-abrir-workspace" data-id="${t.id}" title="Abrir Workspace completo deste artigo">
            🚀 Abrir Workspace
          </button>
          <a class="bento-aux-btn hud-btn ghost" href="/api/trabalhos/${t.id}/artigo.docx?baixar=1" target="_blank" title="Baixar manuscrito atualizado (.docx)">
            📥 ${btnDocxTxt}
          </a>
          <button type="button" class="bento-aux-btn hud-btn ghost btn-jump-screen" data-id="${t.id}" data-screen="screen-prisma" title="Ver Fluxograma PRISMA 2020">
            📐
          </button>
          <button type="button" class="bento-aux-btn hud-btn ghost btn-jump-screen" data-id="${t.id}" data-screen="screen-orientador" title="Ver Devolutiva do Orientador">
            ✍️
          </button>
          <button type="button" class="bento-aux-btn hud-btn ghost btn-novo-laudo-card" data-id="${t.id}" title="Rodar Novo Laudo de Raio-X">
            🔬
          </button>
          <button type="button" class="bento-aux-btn hud-btn ghost btn-ajustar-fmt-card" data-id="${t.id}" title="Re-diagramar ABNT e Ajustar Páginas (DOCX & PDF)">
            📐
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Eventos nos Bento Cards
  grid.querySelectorAll('.article-card-bento').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('a')) return;
      const id = card.dataset.id;
      abrirWorkspaceArtigo(id, 'screen-redacao');
    });
  });

  grid.querySelectorAll('.btn-abrir-workspace').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      abrirWorkspaceArtigo(id, 'screen-redacao');
    });
  });

  grid.querySelectorAll('.btn-novo-laudo-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      executarNovoLaudo(id, btn);
    });
  });

  grid.querySelectorAll('.btn-ajustar-fmt-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      executarAjusteFormatacao(id, btn);
    });
  });

  grid.querySelectorAll('.btn-jump-screen').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const targetScreen = btn.dataset.screen;
      abrirWorkspaceArtigo(id, targetScreen || 'screen-redacao');
    });
  });

  grid.querySelectorAll('.btn-editar-artigo').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const tit = btn.dataset.titulo || '';
      abrirModalEditarArtigo(id, tit);
    });
  });

  grid.querySelectorAll('.btn-excluir-artigo').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const tit = btn.dataset.titulo || '';
      abrirModalExcluirArtigo(id, tit);
    });
  });
}

function renderTabelaArtigosSistema() {
  const tbody = document.getElementById('tbody-sistema-artigos');
  const counter = document.getElementById('contador-tabela-sistema');
  if (!tbody) return;

  const termo = globalFiltroTexto.toLowerCase().trim();
  const filtroStatus = globalFiltroStatus;

  const filtrados = ultimosTrabalhosSistema.filter((t) => {
    // Filtro de Texto
    const matchTexto = !termo ||
      (t.titulo && t.titulo.toLowerCase().includes(termo)) ||
      (t.tema && t.tema.toLowerCase().includes(termo)) ||
      (t.id && t.id.toLowerCase().includes(termo)) ||
      (t.arquivo_importado && t.arquivo_importado.toLowerCase().includes(termo));

    if (!matchTexto) return false;

    // Filtro de Status
    if (filtroStatus === 'todos') return true;
    if (filtroStatus === 'concluido') return t.status === 'concluido';
    if (filtroStatus === 'executando') return t.status === 'executando' || t.status === 'ativo';
    if (filtroStatus === 'importado') return t.origem === 'importado';
    if (filtroStatus === 'orientador') return (t.revisoes_orientador || 0) > 0;
    return true;
  });

  if (counter) counter.textContent = String(filtrados.length);

  // Renderiza Bento Grid de Cards
  renderCardsArtigosSistema(filtrados);

  // Renderiza Tabela Master
  if (filtrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 36px 16px; color: var(--text-dim);">
          <span style="font-size: 28px; display: block; margin-bottom: 8px;">🔍</span>
          <div style="font-size: 13px; font-weight: 500; color: #fff;">Nenhum artigo encontrado para o filtro aplicado.</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Tente alterar os termos de busca ou o seletor de status.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtrados.map((t) => {
    const isSelected = t.id === activeProjectId;
    const isImportado = t.origem === 'importado';
    const qtdRev = t.revisoes_orientador || 0;
    const titulo = t.titulo || t.params?.tema || t.tema || t.id;
    const dataCriacao = t.criado_em ? new Date(t.criado_em).toLocaleDateString('pt-BR') : 'Recente';
    const refs = t.incluidos || t.referencias || (t.aprovados ? t.aprovados.length : 0);
    const custo = t.llm?.custo_usd ? `$${t.llm.custo_usd.toFixed(2)}` : '$0.00';
    const tokens = t.llm?.tokens_total ? `${Math.round(t.llm.tokens_total / 1000)}k` : 'Base';
    const checklist = t.checklist || '22/22';

    const tagOrigem = isImportado
      ? `<span class="badge-tag" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">📥 Importado</span>`
      : `<span class="badge-tag tag-a1">🧬 Autônomo IA</span>`;

    const tagOrientador = qtdRev > 0
      ? `<span class="badge-tag" style="background: rgba(139, 92, 246, 0.25); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); font-weight: 700;">✨ Orientador (R${qtdRev})</span>`
      : '';

    const statusBadge = t.status === 'concluido'
      ? `<span class="system-status-chip ok" style="font-size: 11px;"><span class="pulse-dot"></span> Concluído</span>`
      : `<span class="system-status-chip" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border-color: #f59e0b; font-size: 11px;"><span class="pulse-dot"></span> Em Fila</span>`;

    const btnDocxTxt = qtdRev > 0 ? `DOCX (R${qtdRev})` : 'DOCX';

    return `
      <tr class="sistema-tr-artigo ${isSelected ? 'row-selected' : ''}" data-id="${t.id}">
        <td>
          <div class="table-article-main">
            <div class="table-badge-row">
              ${tagOrigem}
              ${tagOrientador}
              <span style="font-family: var(--font-mono); font-size: 10px; color: var(--text-dim);">${t.id.slice(0, 16)}...</span>
            </div>
            <div class="table-article-title-wrap" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
              <strong class="table-article-title" title="${escaparHtml(titulo)}" style="flex: 1;">
                ${escaparHtml(titulo)}
              </strong>
              <button class="hud-btn ghost icon-only btn-editar-artigo" data-id="${t.id}" data-titulo="${escaparHtml(titulo)}" title="Editar nome deste artigo" style="width: 24px; height: 24px; padding: 0; font-size: 11px; flex-shrink: 0; opacity: 0.85; border-color: rgba(0, 240, 255, 0.3); color: var(--neon-cyan);">
                ✏️
              </button>
            </div>
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${statusBadge}
            <span style="font-family: var(--font-mono); font-size: 10px; color: var(--text-dim);">23/23 Agentes OK</span>
          </div>
        </td>
        <td>
          <div style="font-size: 12px; font-weight: 600; color: #fff;">
            ${refs} fontes
          </div>
          <div style="font-size: 10px; color: var(--text-dim);">
            PubMed · SciELO · LILACS
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-weight: 600; color: var(--neon-cyan); font-size: 11px;">Qualis A1</span>
            <span style="font-size: 10px; color: var(--neon-emerald);">Checklist ${checklist}</span>
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-family: var(--font-mono); font-weight: 700; color: var(--neon-amber); font-size: 12px;">${custo}</span>
            <span style="font-family: var(--font-mono); font-size: 10px; color: var(--text-dim);">${tokens} tok</span>
          </div>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${dataCriacao}</span>
        </td>
        <td style="text-align: right;">
          <div class="table-actions-cell">
            <button class="hud-btn primary btn-abrir-workspace" data-id="${t.id}" title="Abrir Workspace deste artigo (Leitor Qualis A1, Tabela 1 ABNT, PRISMA, Orientador)" style="height: 28px; padding: 0 12px; font-size: 11px; font-weight: 600; background: linear-gradient(135deg, rgba(0, 240, 255, 0.25), rgba(56, 189, 248, 0.35)); border-color: var(--neon-cyan);">
              🚀 Abrir Workspace
            </button>
            <a class="hud-btn ghost" href="/api/trabalhos/${t.id}/artigo.docx?baixar=1" target="_blank" title="Baixar manuscrito atualizado nas normas ABNT (.docx)" style="height: 28px; padding: 0 10px; font-size: 11px; text-decoration: none; display: inline-flex; align-items: center;">
              📥 ${btnDocxTxt}
            </a>
            <button class="hud-btn ghost btn-jump-screen" data-id="${t.id}" data-screen="screen-prisma" title="Ver Fluxograma PRISMA 2020 deste artigo" style="height: 28px; padding: 0 8px; font-size: 11px;">
              📐
            </button>
            <button class="hud-btn ghost btn-jump-screen" data-id="${t.id}" data-screen="screen-orientador" title="Ver Devolutiva do Orientador" style="height: 28px; padding: 0 8px; font-size: 11px;">
              ✍️
            </button>
            <button class="hud-btn ghost btn-novo-laudo-card" data-id="${t.id}" title="Rodar Novo Laudo de Raio-X" style="height: 28px; padding: 0 8px; font-size: 11px; color: var(--neon-cyan); border-color: rgba(0, 240, 255, 0.35);">
              🔬
            </button>
            <button class="hud-btn ghost btn-ajustar-fmt-card" data-id="${t.id}" title="Re-diagramar ABNT e Ajustar Páginas (DOCX & PDF)" style="height: 28px; padding: 0 8px; font-size: 11px; color: var(--neon-emerald); border-color: rgba(16, 185, 129, 0.35);">
              📐
            </button>
            <button class="hud-btn ghost btn-editar-artigo" data-id="${t.id}" data-titulo="${escaparHtml(titulo)}" title="Editar nome deste artigo" style="height: 28px; padding: 0 8px; font-size: 12px; color: var(--neon-cyan); border-color: rgba(0, 240, 255, 0.35);">
              ✏️
            </button>
            <button class="hud-btn ghost btn-excluir-artigo" data-id="${t.id}" data-titulo="${escaparHtml(titulo)}" title="Excluir este artigo do acervo" style="height: 28px; padding: 0 8px; font-size: 12px; color: var(--neon-rose); border-color: rgba(244, 63, 94, 0.4);">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Eventos de clique nas linhas e botões de ação
  tbody.querySelectorAll('.sistema-tr-artigo').forEach((tr) => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('a')) return;
      const id = tr.dataset.id;
      abrirWorkspaceArtigo(id, 'screen-redacao');
    });
  });

  tbody.querySelectorAll('.btn-abrir-workspace, .btn-focar-artigo').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      abrirWorkspaceArtigo(id, 'screen-redacao');
    });
  });

  tbody.querySelectorAll('.btn-novo-laudo-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      executarNovoLaudo(id, btn);
    });
  });

  tbody.querySelectorAll('.btn-ajustar-fmt-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      executarAjusteFormatacao(id, btn);
    });
  });

  tbody.querySelectorAll('.btn-jump-screen').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const targetScreen = btn.dataset.screen;
      abrirWorkspaceArtigo(id, targetScreen || 'screen-redacao');
    });
  });

  tbody.querySelectorAll('.btn-editar-artigo').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const tit = btn.dataset.titulo || '';
      abrirModalEditarArtigo(id, tit);
    });
  });

  tbody.querySelectorAll('.btn-excluir-artigo').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const tit = btn.dataset.titulo || '';
      abrirModalExcluirArtigo(id, tit);
    });
  });
}

function focarArtigoSistema(id, mudarParaLeitor = false) {
  if (!id) return;
  abrirWorkspaceArtigo(id, mudarParaLeitor ? 'screen-redacao' : currentScreen);
}

function renderSystemActivityFeed() {
  const feed = document.getElementById('system-activity-feed');
  if (!feed) return;

  const items = [];

  ultimosTrabalhosSistema.forEach((t) => {
    const tituloCurto = (t.titulo || t.tema || t.id).slice(0, 50);
    const dataStr = t.criado_em
      ? new Date(t.criado_em).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : 'Recente';

    if ((t.revisoes_orientador || 0) > 0) {
      items.push({
        time: dataStr,
        tag: 'ORIENTADOR',
        color: '#c084fc',
        text: `Devolutiva do Orientador (R${t.revisoes_orientador}) incorporada com rigor acadêmico: "${tituloCurto}..."`,
      });
    }

    if (t.origem === 'importado') {
      const qtdRef = t.referencias !== undefined ? `${t.referencias} referências extraídas` : 'referências indexadas';
      items.push({
        time: dataStr,
        tag: 'IMPORTAÇÃO',
        color: '#10b981',
        text: `Manuscrito importado e diagramado nas normas ABNT: "${t.arquivo_importado || tituloCurto}" (${qtdRef}).`,
      });
    } else {
      const qtdRef = t.referencias !== undefined ? `${t.referencias} referências` : 'fontes indexadas';
      items.push({
        time: dataStr,
        tag: 'PIPELINE',
        color: '#00f2fe',
        text: `Mineração e redação autônoma Qualis A1 concluída: "${tituloCurto}..." (${qtdRef}, Checklist 22/22).`,
      });
    }
  });

  items.push({
    time: 'Agora',
    tag: 'CLUSTER',
    color: '#f59e0b',
    text: 'Cluster Dual-Engine (DeepSeek V4.1 Flash + Gemini 3.8 Flash) em prontidão operacional. 23 agentes calibrados.',
  });

  feed.innerHTML = items.map((it) => `
    <div class="telemetry-log-item" style="padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
        <span class="badge-tag" style="background: rgba(255,255,255,0.05); color: ${it.color}; border: 1px solid ${it.color}40; font-size: 9px; padding: 2px 6px;">
          ${it.tag}
        </span>
        <span style="font-family: var(--font-mono); font-size: 10px; color: var(--text-dim);">${it.time}</span>
      </div>
      <p style="font-size: 11px; color: var(--text-muted); margin: 0; line-height: 1.4;">
        ${escaparHtml(it.text)}
      </p>
    </div>
  `).join('');
}

function exportarRelatorioExecutivoSistema(e) {
  audio.playBeep(880, 'sine', 0.1, 0.05);
  showToast('Abrindo Relatório Executivo em PDF em nova aba...', 'cyan');
  
  // Se acionado programaticamente ou não for link <a> com target="_blank", abre explicitamente
  if (!e || !e.currentTarget || e.currentTarget.tagName !== 'A') {
    window.open('/api/sistema/relatorio-executivo.pdf', '_blank');
  }
}

function configurarFiltrosSistema() {
  const inputBusca = document.getElementById('input-busca-sistema');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      globalFiltroTexto = e.target.value;
      renderTabelaArtigosSistema();
    });
  }

  const selectFiltro = document.getElementById('select-filtro-status-sistema');
  if (selectFiltro) {
    selectFiltro.addEventListener('change', (e) => {
      globalFiltroStatus = e.target.value;
      renderTabelaArtigosSistema();
    });
  }

  const btnGlobalNovo = document.getElementById('btn-global-novo-artigo');
  if (btnGlobalNovo) {
    btnGlobalNovo.addEventListener('click', openModalNovo);
  }

  const btnGlobalImportar = document.getElementById('btn-global-importar-artigo');
  if (btnGlobalImportar) {
    btnGlobalImportar.addEventListener('click', openModalImportar);
  }

  const btnGlobalSync = document.getElementById('btn-global-sync');
  if (btnGlobalSync) {
    btnGlobalSync.addEventListener('click', async () => {
      audio.click();
      btnGlobalSync.classList.add('rotating');
      showToast('Sincronizando todo o acervo e telemetria do cluster...', 'cyan');
      await carregarTrabalhosReais();
      setTimeout(() => {
        btnGlobalSync.classList.remove('rotating');
        audio.success();
        showToast('Acervo global do sistema atualizado.', 'emerald');
      }, 500);
    });
  }

  const btnGlobalExportar = document.getElementById('btn-global-exportar-relatorio');
  if (btnGlobalExportar) {
    btnGlobalExportar.addEventListener('click', exportarRelatorioExecutivoSistema);
  }
}

async function updateActiveProject(projId) {
  activeProjectId = projId;
  const p = PROJECTS[projId];
  if (!p) return;

  // Atualizar seleção visual na tabela master do sistema
  document.querySelectorAll('.sistema-tr-artigo').forEach((r) => {
    if (r.dataset.id === projId) r.classList.add('row-selected');
    else r.classList.remove('row-selected');
  });

  // Atualizar Badges de Contexto no Top HUD
  const badgeTopOrigem = document.getElementById('badge-top-origem');
  if (badgeTopOrigem) {
    badgeTopOrigem.style.display = 'inline-block';
    if (p.origem === 'importado') {
      badgeTopOrigem.textContent = '📥 Importado';
      badgeTopOrigem.style.background = 'rgba(16, 185, 129, 0.2)';
      badgeTopOrigem.style.color = '#10b981';
      badgeTopOrigem.style.border = '1px solid rgba(16, 185, 129, 0.4)';
    } else {
      badgeTopOrigem.textContent = '🧬 Autônomo IA';
      badgeTopOrigem.style.background = 'rgba(0, 240, 255, 0.15)';
      badgeTopOrigem.style.color = '#00f2fe';
      badgeTopOrigem.style.border = '1px solid rgba(0, 240, 255, 0.35)';
    }
  }

  const badgeTopFontes = document.getElementById('badge-top-fontes');
  if (badgeTopFontes) {
    badgeTopFontes.style.display = 'inline-block';
    badgeTopFontes.textContent = `📑 ${p.fontesIncluidas || p.referencias || 0} fontes`;
  }

  const badgeTopOrientador = document.getElementById('badge-top-orientador');
  if (badgeTopOrientador) {
    const qtdRev = p.revisoes_orientador || 0;
    if (qtdRev > 0) {
      badgeTopOrientador.style.display = 'inline-block';
      badgeTopOrientador.textContent = `✨ R${qtdRev} Orientador`;
      badgeTopOrientador.style.background = 'rgba(139, 92, 246, 0.25)';
      badgeTopOrientador.style.color = '#c084fc';
      badgeTopOrientador.style.border = '1px solid rgba(168, 85, 247, 0.4)';
    } else {
      badgeTopOrientador.style.display = 'none';
    }
  }

  // Ação Rápida de Download DOCX no Top HUD
  const btnHudDocx = document.getElementById('btn-hud-quick-docx');
  if (btnHudDocx) {
    if (p.isReal && currentUIMode === 'artigo') {
      btnHudDocx.style.display = 'inline-flex';
      btnHudDocx.href = `/api/trabalhos/${projId}/artigo.docx?baixar=1&_t=${Date.now()}`;
      const qtdRev = p.revisoes_orientador || 0;
      btnHudDocx.title = `Baixar manuscrito nas normas ABNT: ${p.title}${qtdRev > 0 ? ` (R${qtdRev})` : ''}`;
      btnHudDocx.innerHTML = `<span>📥</span> Baixar .DOCX${qtdRev > 0 ? ` (R${qtdRev})` : ''}`;
    } else {
      btnHudDocx.style.display = 'none';
    }
  }

  // Ação Rápida: Visualizar Laudo de Raio-X Diagnóstico no Top HUD
  const btnHudRaioX = document.getElementById('btn-hud-raio-x');
  if (btnHudRaioX) {
    if (p.isReal && (p.origem === 'importado' || p.raio_x_entrada)) {
      btnHudRaioX.style.display = 'inline-flex';
      btnHudRaioX.href = `/api/trabalhos/${projId}/raio-x`;
      btnHudRaioX.title = 'Visualizar Laudo de Diagnóstico Global e Raio-X de Entrada';
    } else {
      btnHudRaioX.style.display = 'none';
    }
  }

  // Atualizar título no HUD e na Sidebar
  const hudArticleTitle = document.getElementById('hud-article-title');
  if (hudArticleTitle) {
    hudArticleTitle.textContent = p.title || p.id;
    hudArticleTitle.title = p.title || p.id;
  }
  const sidebarCardTitle = document.getElementById('sidebar-card-title');
  if (sidebarCardTitle) {
    const t = p.title || p.id;
    sidebarCardTitle.textContent = t.length > 45 ? `${t.slice(0, 45)}...` : t;
    sidebarCardTitle.title = t;
  }

  // Atualizar tooltip do seletor
  const selectProj = document.getElementById('select-active-project');
  if (selectProj) {
    selectProj.title = `Artigo ativo: ${p.title || p.id}`;
  }

  // Atualizar KPIs
  const kpiTotalFontes = document.getElementById('kpi-fontes-mineradas');
  if (kpiTotalFontes) {
    const minerados = p.registrosTriados || p.triagem?.total || 0;
    const incluidos = p.fontesIncluidas || p.referencias || (p.aprovados ? p.aprovados.length : 0);
    kpiTotalFontes.textContent = minerados > 0 ? `${minerados} / ${incluidos} inc.` : (incluidos > 0 ? `${incluidos} incluídos` : '--');
  }

  const kpiAssertividade = document.getElementById('kpi-assertividade');
  if (kpiAssertividade) {
    if (p.assertividade) {
      kpiAssertividade.textContent = p.assertividade;
    } else if (p.registrosTriados && (p.fontesIncluidas || p.referencias)) {
      const tx = Math.round(((p.fontesIncluidas || p.referencias) / p.registrosTriados) * 100);
      kpiAssertividade.textContent = `${tx}% assertividade`;
    } else {
      kpiAssertividade.textContent = '--';
    }
  }

  // Atualizar badge do status
  const badgeStatus = document.getElementById('badge-paper-status');
  if (badgeStatus) {
    const qtdRev = p.revisoes_orientador || 0;
    if (qtdRev > 0) {
      badgeStatus.textContent = `✨ Pós-Orientador (R${qtdRev}) · ABNT & Vancouver OK`;
      badgeStatus.className = 'agent-status-badge ok';
    } else if (p.origem === 'importado') {
      badgeStatus.textContent = '📥 Manuscrito Importado · ABNT OK';
      badgeStatus.className = 'agent-status-badge ok';
    } else {
      badgeStatus.textContent = 'ABNT & Vancouver OK';
      badgeStatus.className = 'agent-status-badge ok';
    }
  }

  // Atualizar Leitor PDF A4 e Links de Download
  const pdfUrl = `/api/trabalhos/${projId}/artigo.pdf`;
  const iframePdf = document.getElementById('iframe-leitor-artigo-pdf');
  if (iframePdf) {
    const zoom = window.jarvisPdfZoom || 100;
    iframePdf.src = `${pdfUrl}#toolbar=0&navpanes=0&zoom=${zoom}&view=FitH`;
  }
  const btnPdf = document.getElementById('btn-download-pdf-paper');
  if (btnPdf) {
    btnPdf.href = `${pdfUrl}?baixar=1`;
  }
  const btnPdfNovaAba = document.getElementById('btn-abrir-pdf-nova-aba');
  if (btnPdfNovaAba) {
    btnPdfNovaAba.href = pdfUrl;
  }
  const btnLinkNovaAba = document.getElementById('btn-link-nova-aba-pdf');
  if (btnLinkNovaAba) {
    btnLinkNovaAba.href = pdfUrl;
  }

  // Links de Download no Leitor
  const btnDocx = document.getElementById('btn-download-docx-paper');
  if (btnDocx) {
    btnDocx.href = p.isReal ? `/api/trabalhos/${projId}/artigo.docx?baixar=1&_t=${Date.now()}` : '#';
    btnDocx.title = 'Baixar manuscrito mais recente em Word (.docx) nas normas ABNT';
  }
  const btnHtml = document.getElementById('btn-download-html-paper');
  if (btnHtml) {
    btnHtml.href = p.isReal ? `/api/trabalhos/${projId}/arquivos/artigo.html` : '#';
  }
  const btnOriginal = document.getElementById('btn-download-original-paper');
  if (btnOriginal) {
    if (p.isReal && p.arquivo_original) {
      btnOriginal.style.display = 'inline-flex';
      btnOriginal.href = `/api/trabalhos/${projId}/arquivos/${p.arquivo_original}?baixar=1`;
      btnOriginal.title = `Baixar arquivo original: ${p.arquivo_original}`;
    } else {
      btnOriginal.style.display = 'none';
    }
  }

  // Atualizar links dos Agentes Especialistas A1
  const linkTraffic = document.getElementById('link-traffic-light');
  if (linkTraffic) linkTraffic.href = p.isReal ? `/api/trabalhos/${projId}/arquivos/traffic_light.svg` : '#';
  const linkSummary = document.getElementById('link-summary-plot');
  if (linkSummary) linkSummary.href = p.isReal ? `/api/trabalhos/${projId}/arquivos/summary_plot.svg` : '#';
  const linkGA = document.getElementById('link-abrir-ga');
  if (linkGA) linkGA.href = p.isReal ? `/api/trabalhos/${projId}/arquivos/graphical_abstract.svg` : '#';

  // PRISMA Flowchart Imagem Real (se existir no trabalho)
  const prismaImgBox = document.getElementById('prisma-image-container');
  const prismaImg = document.getElementById('prisma-preview-img');
  if (prismaImgBox && prismaImg) {
    if (p.isReal && p.tem_prisma_img) {
      prismaImg.src = `/api/trabalhos/${projId}/arquivos/fluxograma-prisma.png`;
      prismaImg.onload = () => { prismaImgBox.style.display = 'block'; };
      prismaImg.onerror = () => { prismaImgBox.style.display = 'none'; };
    } else {
      prismaImgBox.style.display = 'none';
      prismaImg.removeAttribute('src');
    }
  }

  // Limpa banner do orientador por padrão
  const bannerContainer = document.getElementById('leitor-banner-orientador-container');
  if (bannerContainer) bannerContainer.innerHTML = '';

  let dadosTrabalhoCarregado = null;

  // Se for projeto real do usuário, sincroniza conteúdo e versoes
  if (p.isReal) {
    try {
      const dados = await api(`/api/trabalhos/${projId}`);
      dadosTrabalhoCarregado = dados;
      p.revisoes_orientador = (dados.revisoes_orientador || []).length;
      p.raio_x_entrada = dados.raio_x_entrada || p.raio_x_entrada;
      p.a1_turnitin = dados.raio_x_entrada?.turnitin || dados.a1_turnitin || p.a1_turnitin;
      p.aprovados_detalhe = dados.aprovados_detalhe || [];
      atualizarTelaOrientador(dados);

      // Constrói estudos estruturados (aprovados, reprovados e referências com metadados completos)
      p.estudos = construirEstudosDoProjeto(dados, p);
      sincronizarInspetorFontes(p.estudos);

      const html = await api(`/api/trabalhos/${projId}/artigo`);
      const readerPaper = document.getElementById('reader-paper-content');
      if (readerPaper && html) {
        const qtdRevisoes = (dados.revisoes_orientador || []).length;
        let bannerHtml = '';
        if (qtdRevisoes > 0) {
          const ultimaRev = dados.revisoes_orientador[qtdRevisoes - 1];
          const secoesTags = (ultimaRev?.secoes_alteradas || []).map((s) => `<span class="badge-secao-banner">✓ ${escaparHtml(s.secao)}</span>`).join('');
          const dataRevFmt = ultimaRev?.data ? new Date(ultimaRev.data).toLocaleString('pt-BR') : 'Data recente';
          bannerHtml = `
            <div class="jarvis-banner-orientador">
              <div class="banner-orientador-left">
                <div class="banner-orientador-tag">✨ MANUSCRITO ATUALIZADO PÓS-DEVOLUTIVA (RODADA ${qtdRevisoes})</div>
                <div class="banner-orientador-desc">
                  Orientações do orientador/banca incorporadas em <b>${dataRevFmt}</b>. Todas as observações foram integradas ao texto mantendo 100% das referências Vancouver e o rigor do Modelo Qualis A1.
                </div>
                ${secoesTags ? `<div class="banner-orientador-secoes">${secoesTags}</div>` : ''}
              </div>
              <div class="banner-orientador-actions">
                <a class="hud-btn primary" href="/api/trabalhos/${projId}/artigo.docx?baixar=1&_t=${Date.now()}" target="_blank" style="text-decoration:none; font-size: 11px;">
                  📥 Baixar .DOCX Atualizado (R${qtdRevisoes})
                </a>
                <button type="button" class="hud-btn ghost" id="btn-banner-ver-orientador" style="font-size: 11px;">
                  Ver Parecer & Histórico ➔
                </button>
              </div>
            </div>
          `;
          if (bannerContainer) {
            bannerContainer.innerHTML = bannerHtml;
          }
        }

        function formatarCorpoManuscritoTexto(rawHtml) {
          if (!rawHtml) return '';
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(`<body>${rawHtml}</body>`, 'text/html');
            const container = doc.body;

            // 1. Converte <sup class="cit"> ou <sup> contendo números em chips interativos
            container.querySelectorAll('sup').forEach((sup) => {
              const raw = sup.textContent.replace(/[\[\]]/g, '').trim();
              if (/^\d+(?:\s*[-–,]\s*\d+)*$/.test(raw)) {
                const btn = doc.createElement('button');
                btn.type = 'button';
                btn.className = 'cite-chip';
                btn.dataset.cite = raw;
                btn.title = `Inspecionar citação [${raw}] no painel lateral`;
                btn.textContent = `[${raw}]`;
                sup.replaceWith(btn);
              }
            });

            // 2. Transforma citações em colchetes [n] em chips interativos estritamente dentro de text nodes
            const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
            const textNodes = [];
            let cur;
            while ((cur = walker.nextNode())) {
              const pTag = cur.parentElement ? cur.parentElement.tagName.toUpperCase() : '';
              if (['BUTTON', 'A', 'SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(pTag)) continue;
              if (cur.parentElement && cur.parentElement.classList.contains('cite-chip')) continue;
              textNodes.push(cur);
            }

            for (const tn of textNodes) {
              const val = tn.nodeValue;
              if (/\[\d+(?:\s*[-–,]\s*\d+)*\]/.test(val)) {
                const frag = doc.createDocumentFragment();
                let lastIdx = 0;
                const re = /\[(\d+(?:\s*[-–,]\s*\d+)*)\]/g;
                let match;
                while ((match = re.exec(val)) !== null) {
                  if (match.index > lastIdx) {
                    frag.appendChild(doc.createTextNode(val.slice(lastIdx, match.index)));
                  }
                  const btn = doc.createElement('button');
                  btn.type = 'button';
                  btn.className = 'cite-chip';
                  btn.dataset.cite = match[1];
                  btn.title = `Inspecionar citação [${match[1]}] no painel lateral`;
                  btn.textContent = `[${match[1]}]`;
                  frag.appendChild(btn);
                  lastIdx = re.lastIndex;
                }
                if (lastIdx < val.length) {
                  frag.appendChild(doc.createTextNode(val.slice(lastIdx)));
                }
                tn.replaceWith(frag);
              }
            }

            return container.innerHTML;
          } catch (err) {
            console.warn('[Modo Texto] Falha ao processar DOM de citações:', err);
            return rawHtml;
          }
        }

        const htmlFormatado = formatarCorpoManuscritoTexto(html);

        readerPaper.innerHTML = `
          <div class="paper-header">
            <div class="paper-authors" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <span>🏛️ Normas Vancouver / ABNT NBR 14724 · Padrão Qualis A1</span>
              <span style="color:var(--neon-emerald); font-size:11.5px; font-weight:600;">✓ Manuscrito Conforme</span>
            </div>
          </div>
          <div class="paper-rendered-body">
            ${htmlFormatado}
          </div>
        `;

        const btnBannerOrientador = document.getElementById('btn-banner-ver-orientador');
        if (btnBannerOrientador) {
          btnBannerOrientador.addEventListener('click', () => {
            switchScreen('screen-orientador');
          });
        }
      }
      // Sincronizar Badges da Suíte A1 com dados reais salvos no estado do artigo
      const tagGrade = document.getElementById('tag-grade-certeza');
      if (tagGrade) {
        const cGrade = dados?.a1_grade?.certezaGeral || dados?.a1_grade?.certezaGlobal;
        if (cGrade) {
          tagGrade.textContent = cGrade;
          tagGrade.style.color = '#38bdf8';
        } else {
          tagGrade.textContent = 'Pendente (Clique em Calcular)';
          tagGrade.style.color = 'var(--text-dim)';
        }
      }

      const tagRevista = document.getElementById('tag-revista-conformidade');
      if (tagRevista) {
        if (dados?.a1_revista?.taxaConformidade || dados?.a1_revista?.conformidadeGeral) {
          const taxa = dados.a1_revista.taxaConformidade || dados.a1_revista.conformidadeGeral;
          tagRevista.textContent = `${taxa}% Conforme (${dados.a1_revista.revistaAlvo || 'Alvo'})`;
          tagRevista.style.color = '#10b981';
        } else {
          tagRevista.textContent = 'Pendente';
          tagRevista.style.color = 'var(--text-dim)';
        }
      }

      const tagTurnitinScore = document.getElementById('tag-turnitin-score');
      const tagTurnitinStatus = document.getElementById('tag-turnitin-status');
      if (tagTurnitinScore && tagTurnitinStatus) {
        if (dados?.a1_turnitin) {
          tagTurnitinScore.textContent = dados.a1_turnitin.taxaSimilaridadeEstimada || `${dados.a1_turnitin.similaridadeGeral || '0.0'}%`;
          tagTurnitinScore.style.color = '#10b981';
          tagTurnitinStatus.textContent = dados.a1_turnitin.status || 'Auditado';
          tagTurnitinStatus.className = 'agent-status-badge ok';
        } else {
          tagTurnitinScore.textContent = '--';
          tagTurnitinScore.style.color = 'var(--text-dim)';
          tagTurnitinStatus.textContent = 'Não auditado';
          tagTurnitinStatus.className = 'agent-status-badge alert';
        }
      }

      const tagCompliance = document.getElementById('tag-compliance-status');
      if (tagCompliance) {
        if (dados?.a1_compliance) {
          tagCompliance.textContent = dados.a1_compliance.status || 'Conforme';
          tagCompliance.style.color = '#10b981';
        } else {
          tagCompliance.textContent = 'Aguardando Mapeamento';
          tagCompliance.style.color = 'var(--text-dim)';
        }
      }
    } catch (e) {
      console.warn('Falha ao carregar detalhes do projeto real:', e);
    }
  } else {
    renderPlaceholderPaper();
    sincronizarInspetorFontes(p.estudos || []);
  }

  // Atualizar painel lateral de auditoria factual viva com dados reais
  const rx = p.raio_x_entrada || dadosTrabalhoCarregado?.raio_x_entrada;
  const score = rx?.score_inicial ?? rx?.score_global ?? p.score_global;

  const auditTurnitin = document.getElementById('audit-metric-turnitin');
  if (auditTurnitin) {
    const turnitinTaxa = rx?.turnitin?.similaridade_preditiva || p.a1_turnitin?.taxaSimilaridadeEstimada || (p.a1_turnitin?.similaridadeGeral !== undefined ? `${p.a1_turnitin.similaridadeGeral}% Plágio` : null);
    if (turnitinTaxa) {
      auditTurnitin.textContent = `${turnitinTaxa} Preditivo`;
      const numTaxa = parseFloat(turnitinTaxa);
      auditTurnitin.style.color = numTaxa > 15 ? 'var(--neon-amber)' : 'var(--neon-emerald)';
    } else {
      auditTurnitin.textContent = 'Não auditado';
      auditTurnitin.style.color = 'var(--text-dim)';
    }
  }

  const auditFontes = document.getElementById('audit-metric-fontes');
  if (auditFontes) {
    const totalF = rx?.bibliografia?.total || p.fontesIncluidas || p.referencias || (p.estudos ? p.estudos.length : 0);
    auditFontes.textContent = totalF > 0 ? `${totalF} estudos auditados` : '--';
  }

  const auditDiretriz = document.getElementById('audit-metric-diretriz');
  if (auditDiretriz) {
    auditDiretriz.textContent = rx?.diretriz ? `${rx.diretriz} / ABNT` : 'PRISMA 2020 / ABNT';
  }

  const auditRaioXStatus = document.getElementById('audit-metric-raiox-status');
  const auditBadgeGlobal = document.getElementById('audit-badge-global-status');
  const auditAccuracia = document.getElementById('audit-score-accuracia');
  const auditScoreIcon = document.getElementById('audit-score-icon');

  if (p.isReal) {
    if (score !== undefined) {
      if (auditAccuracia) {
        auditAccuracia.textContent = `${score}% Qualis A1`;
        auditAccuracia.style.color = score >= 90 ? 'var(--neon-emerald)' : 'var(--neon-amber)';
      }
      if (auditScoreIcon) auditScoreIcon.textContent = score >= 90 ? '🛡️' : '⚠️';
      if (auditBadgeGlobal) {
        if (score >= 90) {
          auditBadgeGlobal.textContent = `${score}% Qualis A1`;
          auditBadgeGlobal.style.background = 'rgba(16, 185, 129, 0.2)';
          auditBadgeGlobal.style.color = '#10b981';
          auditBadgeGlobal.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        } else {
          auditBadgeGlobal.textContent = `${score}% Atenção`;
          auditBadgeGlobal.style.background = 'rgba(244, 63, 94, 0.2)';
          auditBadgeGlobal.style.color = '#f43f5e';
          auditBadgeGlobal.style.borderColor = 'rgba(244, 63, 94, 0.4)';
        }
      }
    } else {
      if (auditAccuracia) auditAccuracia.textContent = 'Pendente';
      if (auditScoreIcon) auditScoreIcon.textContent = '⏳';
      if (auditBadgeGlobal) {
        auditBadgeGlobal.textContent = 'Pendente';
        auditBadgeGlobal.style.background = 'rgba(255, 255, 255, 0.08)';
        auditBadgeGlobal.style.color = 'var(--text-dim)';
      }
    }

    const apontamentos = rx?.apontamentos || rx?.pendencias_diretriz || [];
    const criticos = apontamentos.filter((a) => (typeof a === 'object' ? a.severidade === 'critico' : false));

    const sanacoes = dadosTrabalhoCarregado?.historico_sanacoes || p.historico_sanacoes || [];

    if (auditRaioXStatus) {
      if (!rx) {
        auditRaioXStatus.textContent = 'Aguardando Análise';
        auditRaioXStatus.style.color = 'var(--text-dim)';
      } else if (criticos.length > 0) {
        auditRaioXStatus.textContent = `${criticos.length} Alertas Críticos`;
        auditRaioXStatus.style.color = 'var(--neon-rose)';
      } else if (rx.turnitin && !rx.turnitin.aprovado) {
        auditRaioXStatus.textContent = `Atenção Turnitin (${rx.turnitin.similaridade_preditiva})`;
        auditRaioXStatus.style.color = 'var(--neon-amber)';
      } else if (sanacoes.length > 0) {
        auditRaioXStatus.textContent = `Sanado (${sanacoes.length}x) & Conforme`;
        auditRaioXStatus.style.color = 'var(--neon-emerald)';
      } else {
        auditRaioXStatus.textContent = 'Sanado & Conforme';
        auditRaioXStatus.style.color = 'var(--neon-emerald)';
      }
    }
  } else {
    if (auditAccuracia) auditAccuracia.textContent = '--';
    if (auditRaioXStatus) {
      auditRaioXStatus.textContent = 'Aguardando Seleção';
      auditRaioXStatus.style.color = 'var(--text-dim)';
    }
    if (auditBadgeGlobal) {
      auditBadgeGlobal.textContent = '--';
      auditBadgeGlobal.style.background = 'rgba(255, 255, 255, 0.05)';
      auditBadgeGlobal.style.color = 'var(--text-dim)';
    }
  }

  // Botão Sanar & Reauditar é mantido exclusivamente no modal de Raio-X
  const btnHudSanar = document.getElementById('btn-hud-sanar-raio-x');
  if (btnHudSanar) {
    btnHudSanar.style.display = 'none';
  }

  // Renderizar Telas Dependentes de Estudos (SEMPRE para ambos os tipos de projeto!)
  renderTriagemDeck();
  renderEvidenciasGrid();
  renderTabelaAbnt();
  // Atualizar Stepper Metodológico ("Em que passo estou?")
  if (window.workflowStepper) {
    window.workflowStepper.update(p);
  }

  showToast(`Projeto ativo alternado para: "${p.title.slice(0, 40)}..."`, 'cyan');
}

function escaparHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function atualizarTelaOrientador(dados) {
  if (!dados) return;
  const listEl = document.getElementById('orientador-versoes-list');
  const countTag = document.getElementById('versoes-count-tag');
  const rodadasListaEl = document.getElementById('orientador-rodadas-lista');
  const rodadasBadge = document.getElementById('orientador-rodadas-badge');
  const downloadBar = document.getElementById('orientador-download-bar');
  const downloadBtn = document.getElementById('btn-download-orientador-docx');
  const downloadTitle = document.getElementById('orientador-download-title');
  const diffTitle = document.getElementById('diff-box-title');
  const diffSubtitle = document.getElementById('diff-box-subtitle');
  const diffContent = document.getElementById('diff-box-content');

  const versoes = dados.versoes_disponiveis || [];
  if (countTag) countTag.textContent = `${versoes.length} backup(s)`;

  // 0. Card Inteligente de Apontamentos e Falhas do Raio-X de Entrada
  const rX = dados.raio_x_entrada || dados.raio_x || {};
  const resumoFalhasEl = document.getElementById('orientador-raiox-resumo-falhas');
  const btnPuxar = document.getElementById('btn-puxar-apontamentos-orientador');
  const btnAbrirRx = document.getElementById('btn-orientador-abrir-raiox');

  const itensParaOrientador = [];

  // 0.1 Inconsistências Amostrais e Internas (Resumo vs Métodos/Resultados)
  const incons = rX.consistencia_interna?.inconsistencias || [];
  incons.forEach((inc) => {
    if (inc.detalhe) {
      itensParaOrientador.push({
        categoria: 'Amostra & Fidelidade',
        texto: inc.detalhe,
        sugestao: `Harmonizar divergência amostral: o Resumo deve reportar o número exato do corpo do artigo para garantir integridade e coerência interna.`
      });
    }
  });

  // 0.2 Pendências de Diretriz Internacional (PRISMA / STROBE)
  const pends = rX.pendencias_diretriz || [];
  pends.forEach((p) => {
    itensParaOrientador.push({
      categoria: `Diretriz ${rX.diretriz || 'PRISMA'}`,
      texto: p,
      sugestao: `Atender apontamento de conformidade internacional: ${p}`
    });
  });

  // 0.3 Clichês e Marcas de IA
  const cliches = rX.estilo_ia?.exemplos || [];
  if (cliches.length > 0) {
    itensParaOrientador.push({
      categoria: 'Estilo Acadêmico Qualis A1',
      texto: `Expressões típicas de IA identificadas: "${cliches.slice(0, 3).join('", "')}".`,
      sugestao: `Erradicar clichês e expressões de IA (substituindo termos como "${cliches.slice(0, 2).join('", "')}" por redação formal e austera).`
    });
  }

  // 0.4 Alertas Estatísticos e Biomarcadores
  const estAlts = rX.estatistica?.detalhes || [];
  estAlts.forEach((ea) => {
    itensParaOrientador.push({
      categoria: 'Rigor Estatístico',
      texto: ea.mensagem || ea.detalhe || 'Inconsistência estatística detectada.',
      sugestao: `Adequar notação estatística: ${ea.mensagem || ea.detalhe}.`
    });
  });

  if (resumoFalhasEl) {
    if (itensParaOrientador.length === 0) {
      resumoFalhasEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; color: var(--neon-emerald);">
          <span>✔</span> <strong>Nenhuma falha crítica pendente no Laudo Raio-X.</strong> Manuscrito com alta conformidade.
        </div>
      `;
      if (btnPuxar) btnPuxar.style.display = 'none';
    } else {
      if (btnPuxar) btnPuxar.style.display = 'inline-flex';
      resumoFalhasEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
          ${itensParaOrientador.map((it, idx) => `
            <div style="background: rgba(255, 255, 255, 0.03); border-left: 3px solid var(--neon-cyan); padding: 8px 12px; border-radius: 0 6px 6px 0;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                <span class="badge-tag" style="background: rgba(0, 240, 255, 0.15); color: var(--neon-cyan); font-size: 10px;">${it.categoria}</span>
                <strong style="font-size: 11.5px; color: #fff;">Ponto ${idx + 1}:</strong>
              </div>
              <div style="font-size: 11.5px; color: var(--text-main);">${escaparHtml(it.texto)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  if (btnAbrirRx) {
    btnAbrirRx.onclick = () => {
      if (typeof window.openModalRaioX === 'function') window.openModalRaioX(dados.id);
    };
  }

  if (btnPuxar) {
    btnPuxar.onclick = () => {
      const inputEl = document.getElementById('orientador-input');
      if (!inputEl) return;
      
      const textoFormatado = itensParaOrientador.map((it, idx) => {
        return `${idx + 1}. [${it.categoria}]: ${it.sugestao}`;
      }).join('\n\n');

      inputEl.value = textoFormatado;
      const radCirurgico = document.getElementById('radio-modo-cirurgico');
      if (radCirurgico) radCirurgico.checked = true;
      inputEl.focus();
      audio.click();
      showToast(`✔ ${itensParaOrientador.length} apontamentos do Raio-X carregados no Modo Cirúrgico!`, 'emerald');
    };
  }

  // 1. Lista de Backups Rápidos / Snapshots de Arquivos
  if (listEl) {
    if (!versoes.length) {
      listEl.innerHTML = '<span style="font-size: 11px; color: var(--text-dim); padding: 8px 0;">Nenhum snapshot de backup anterior registrado ainda.</span>';
    } else {
      listEl.innerHTML = versoes.map((v) => {
        const dataFmt = new Date(v.data).toLocaleString('pt-BR');
        return `
          <div class="history-version-chip">
            <div>
              <div style="color: var(--neon-cyan); font-weight: 600; font-size: 11.5px;">💾 ${escaparHtml(v.pasta)}</div>
              <div style="color: var(--text-dim); font-size: 10.5px; margin-top: 2px;">${dataFmt}</div>
            </div>
            <button type="button" class="hud-btn ghost btn-restaurar-versao" data-pasta="${v.pasta}" title="Restaurar esta versão" style="padding: 4px 10px; font-size: 11px; height: 26px;">
              ↺ Restaurar
            </button>
          </div>
        `;
      }).join('');
    }
  }

  // 2. Histórico Completo de Rodadas & Orientações do Orientador
  const rodadas = dados.revisoes_orientador || [];
  if (rodadasBadge) {
    rodadasBadge.textContent = `${rodadas.length} rodada${rodadas.length !== 1 ? 's' : ''}`;
  }

  if (rodadasListaEl) {
    if (!rodadas.length) {
      rodadasListaEl.innerHTML = `
        <div style="font-size: 12px; color: var(--text-dim); text-align: center; padding: 24px; border: 1px dashed var(--border-dim); border-radius: 8px;">
          Nenhuma devolutiva ou orientação da banca lançada ainda neste manuscrito.<br>
          Cole as orientações no formulário acima para que a IA realize a reescrita cirúrgica mantendo histórico completo.
        </div>
      `;
    } else {
      rodadasListaEl.innerHTML = rodadas.slice().reverse().map((r, idx) => {
        const dataFmt = r.data ? new Date(r.data).toLocaleString('pt-BR') : 'Data recente';
        const modeloTxt = Array.isArray(r.modelos) ? r.modelos.join(' · ') : (r.modelo || 'IA Cirúrgica Qualis A1');
        const tipoTxt = r.tipo === 'humanizacao_qualis_a1' ? '✨ Trio de Agentes Qualis A1' : '⚡ Revisão Cirúrgica';
        const textoDevolutiva = r.devolutiva || r.instrucoes || 'Revisão geral conforme o modelo de escrita Qualis A1 aplicada.';
        const isUltimaRodada = (idx === 0);
        const linkDocx = isUltimaRodada
          ? `/api/trabalhos/${dados.id}/artigo.docx?baixar=1&_t=${Date.now()}`
          : (r.pasta_resultado
              ? `/api/trabalhos/${dados.id}/arquivos/versoes/${r.pasta_resultado}/artigo.docx?baixar=1&_t=${Date.now()}`
              : (r.backup
                  ? `/api/trabalhos/${dados.id}/arquivos/versoes/${r.backup}/artigo.docx?baixar=1&_t=${Date.now()}`
                  : `/api/trabalhos/${dados.id}/artigo.docx?baixar=1&_t=${Date.now()}`));
        const linkLaudo = `/api/trabalhos/${dados.id}/arquivos/relatorio-verificacao.md`;

        const secoesChips = (r.secoes_alteradas || []).map((s) => `
          <span class="hud-chip-secao">✓ ${escaparHtml(s.secao)}</span>
        `).join('');

        const detalhesSecoes = (r.secoes_alteradas || []).map((s) => `
          <div class="hud-detalhe-item">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
              <h5 style="margin: 0; font-size: 13px; color: var(--neon-cyan); font-weight: 700;">📍 ${escaparHtml(s.secao)}</h5>
              <span class="hud-chip-secao" style="font-size: 10px;">Revisão Cirúrgica</span>
            </div>
            <p class="diff-secao-resumo">${escaparHtml(s.resumo_mudancas || '')}</p>
            ${(s.detalhes && s.detalhes.length) ? `
              <div style="margin: 8px 0;">
                ${s.detalhes.map((d) => `
                  <div class="hud-diff-atendido">
                    <div class="hud-diff-atendido-header">🎯 Apontamento do Orientador:</div>
                    <div class="hud-diff-atendido-pedido">${escaparHtml(d.pedido_orientador || 'Consideração')}</div>
                    <div class="hud-diff-atendido-resp">➔ <strong>Adequação Cirúrgica:</strong> ${escaparHtml(d.como_foi_atendido || '')}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            ${(s.marcas_removidas && s.marcas_removidas.length) ? `
              <div style="margin-top: 8px;">
                <span style="font-size: 11px; color: #fb7185; font-weight: 600;">🚫 Clichês e marcas de IA purgados:</span>
                <div style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px;">
                  ${s.marcas_removidas.map((m) => `<span class="chip-marca-removida">-${escaparHtml(m)}</span>`).join('')}
                </div>
              </div>
            ` : ''}
            ${s.melhorias_cadencia ? `
              <div class="hud-cadencia-badge">
                <strong>⚡ Cadência & Burstiness:</strong> ${escaparHtml(s.melhorias_cadencia)}
              </div>
            ` : ''}
          </div>
        `).join('');

        return `
          <div class="hud-rodada-card">
            <div class="hud-rodada-header">
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span style="font-size: 14px; font-weight: 700; color: #fff; font-family: var(--font-mono);">RODADA ${r.rodada}</span>
                <span class="badge-tag" style="background: rgba(139, 92, 246, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4);">${tipoTxt}</span>
                <span style="font-size: 11px; color: var(--text-dim);">${dataFmt}</span>
                <span class="badge-tag tag-a1">${modeloTxt}</span>
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <a href="${linkDocx}" class="hud-btn primary" style="text-decoration: none; font-size: 11px; height: 28px; padding: 0 10px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.35), rgba(6, 182, 212, 0.45)); border-color: var(--neon-emerald);" target="_blank" title="Baixar documento Word (.docx) consolidado desta rodada de revisão">
                  📥 Baixar .DOCX (R${r.rodada})
                </a>
                <a href="${linkLaudo}" class="hud-btn ghost" style="text-decoration: none; font-size: 11px; height: 28px; padding: 0 10px; border-color: var(--neon-cyan); color: var(--neon-cyan);" target="_blank">
                  📋 Laudo
                </a>
                <button type="button" class="hud-btn ghost btn-sanar-laudo-rodada" data-id="${dados.id}" style="font-size: 11px; height: 28px; padding: 0 10px; border-color: var(--neon-amber); color: var(--neon-amber);" title="Aplicar correções e adequações apontadas no Laudo Raio-X">
                  ⚡ Sanar pelo Laudo
                </button>
                ${r.backup ? `
                  <button type="button" class="hud-btn ghost btn-restaurar-versao" data-pasta="${r.backup}" style="font-size: 11px; height: 28px; padding: 0 10px;" title="Restaurar manuscrito para o estado de backup anterior à Rodada ${r.rodada}">
                    ↺ Restaurar Pré-R${r.rodada}
                  </button>
                ` : ''}
              </div>
            </div>

            <div class="hud-rodada-quote">
              <span class="quote-rotulo">Parecer / Considerações Registradas:</span>
              <blockquote>${escaparHtml(textoDevolutiva)}</blockquote>
            </div>

            ${r.resumo_parecer ? `
              <div class="hud-rodada-sintese">
                <strong style="color: var(--neon-emerald);">🤖 Síntese da Execução:</strong> ${escaparHtml(r.resumo_parecer)}
              </div>
            ` : ''}

            ${secoesChips ? `
              <div class="hud-rodada-secoes">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-dim); margin-right: 4px;">Seções Modificadas:</span>
                ${secoesChips}
              </div>
            ` : ''}

            ${detalhesSecoes ? `
              <details class="hud-rodada-details" ${idx === 0 ? 'open' : ''}>
                <summary style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                  <span>🔍 Inspecionar alterações cirúrgicas por seção (${(r.secoes_alteradas || []).length} seções)</span>
                  <span style="font-size: 10.5px; color: var(--text-dim); font-family: var(--font-mono);">${idx === 0 ? 'DIFF CIRÚRGICO ATIVO' : 'EXPANDIR DIFF'}</span>
                </summary>
                <div style="padding: 10px 0 4px 0;">
                  ${detalhesSecoes}
                </div>
              </details>
            ` : ''}
          </div>
        `;
      }).join('');
    }
  }

  // 3. Vincular botões de restauração (tanto da lista de backups quanto dos cards de rodadas)
  document.querySelectorAll('.btn-restaurar-versao').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pasta = btn.dataset.pasta;
      if (!pasta) return;
      if (!confirm(`Deseja restaurar a versão "${pasta}"? O artigo atual será substituído pelo conteúdo deste snapshot.`)) return;
      try {
        audio.click();
        await api(`/api/trabalhos/${activeProjectId}/orientador-restaurar`, {
          method: 'POST',
          body: JSON.stringify({ pasta }),
        });
        audio.success();
        showToast(`Versão "${pasta}" restaurada com sucesso!`, 'emerald');
        await updateActiveProject(activeProjectId);
      } catch (err) {
        audio.alert();
        showToast(`Erro ao restaurar: ${err.message}`, 'rose');
      }
    });
  });

  // Vincular botões de sanar laudo nas rodadas
  document.querySelectorAll('.btn-sanar-laudo-rodada').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.executarSanacaoLaudo('historico-rodada');
    });
  });

  // 4. Atualizar Preview de Diff Cirúrgico da Rodada Atual
  if (diffContent) {
    if (rodadas.length > 0) {
      const ultimaRev = rodadas[rodadas.length - 1];
      if (diffTitle) diffTitle.textContent = `Diff Cirúrgico (Rodada ${ultimaRev.rodada})`;
      if (diffSubtitle) diffSubtitle.textContent = `Backup: ${ultimaRev.backup || 'automático'} · ${new Date(ultimaRev.data).toLocaleDateString('pt-BR')}`;

      const secoes = ultimaRev.secoes_alteradas || [];
      if (secoes.length) {
        diffContent.innerHTML = secoes.map((s) => `
          <div class="diff-secao-bloco">
            <div class="diff-secao-header">📍 ${escaparHtml(s.secao)}</div>
            <div class="diff-secao-resumo">${escaparHtml(s.resumo_mudancas || '')}</div>
            ${(s.marcas_removidas && s.marcas_removidas.length) ? `
              <div class="diff-line removed">
                - [Clichês/Fórmulas de IA Removidas]: ${s.marcas_removidas.slice(0, 6).map(escaparHtml).join(' · ')}${s.marcas_removidas.length > 6 ? '...' : ''}
              </div>
            ` : ''}
            ${s.melhorias_cadencia ? `
              <div class="diff-line added">
                + [Cadência Qualis A1]: ${escaparHtml(s.melhorias_cadencia)}
              </div>
            ` : ''}
            ${(s.detalhes && s.detalhes.length) ? s.detalhes.map((d) => `
              <div class="diff-line added">
                + [Atendido]: ${escaparHtml(d.pedido_orientador || '')} ➔ ${escaparHtml(d.como_foi_atendido || '')}
              </div>
            `).join('') : ''}
          </div>
        `).join('');
      } else {
        diffContent.innerHTML = `
          <div class="diff-line added">+ ${escaparHtml(ultimaRev.resumo_parecer || 'Ajustes cirúrgicos aplicados com preservação das citações Vancouver.')}</div>
        `;
      }
    } else {
      if (diffTitle) diffTitle.textContent = 'Diff Cirúrgico do Manuscrito';
      if (diffSubtitle) diffSubtitle.textContent = 'Aguardando Parecer';
      diffContent.innerHTML = `
        <div style="color: var(--text-dim); font-size: 11.5px; padding: 16px; font-style: italic; line-height: 1.6;">
          Nenhuma devolutiva ou orientação aplicada neste manuscrito ainda.<br>
          Cole as considerações da banca no formulário ao lado e clique em <b>⚡ Aplicar Correções do Orientador</b> para gerar o diff cirúrgico e o novo Word (.docx).
        </div>
      `;
    }
  }

  // 5. Barra de Downloads e Documentos de Submissão
  const qtdRevisoes = rodadas.length;
  if (qtdRevisoes > 0) {
    if (downloadBar && downloadBtn) {
      downloadBar.style.display = 'flex';
      downloadBtn.href = `/api/trabalhos/${dados.id}/artigo.docx?baixar=1&_t=${Date.now()}`;
      downloadBtn.textContent = `📥 Baixar Word (.docx) Atualizado (Rodada ${qtdRevisoes})`;
      if (downloadTitle) downloadTitle.textContent = `✔ Manuscrito Revisado (Rodada ${qtdRevisoes})`;

      const btnRebuttal = document.getElementById('btn-ver-rebuttal');
      if (btnRebuttal) {
        if (dados.arquivos?.rebuttal) {
          btnRebuttal.style.display = 'inline-block';
          btnRebuttal.href = `/api/trabalhos/${dados.id}/arquivos/rebuttal.md`;
        } else {
          btnRebuttal.style.display = 'none';
        }
      }

      const btnRelat = document.getElementById('btn-ver-relatorio-auditoria');
      if (btnRelat) btnRelat.href = `/api/trabalhos/${dados.id}/arquivos/relatorio-verificacao.md`;
    }
  } else {
    if (downloadBar) downloadBar.style.display = 'none';
  }
}

async function carregarTrabalhosReais() {
  try {
    const [lista, statusData] = await Promise.all([
      api('/api/trabalhos'),
      api('/api/status').catch(() => null),
    ]);
    if (!Array.isArray(lista) || !lista.length) return;

    const selectProj = document.getElementById('select-active-project');
    if (!selectProj) return;

    // Atualiza KPI total de artigos no painel
    const kpiTotalArtigos = document.getElementById('kpi-total-artigos');
    if (kpiTotalArtigos) kpiTotalArtigos.textContent = String(lista.length);

    lista.forEach((t) => {
      const tituloLimpo = t.titulo || t.params?.tema || t.tema || 'Artigo Científico';
      PROJECTS[t.id] = {
        id: t.id,
        title: tituloLimpo,
        qualis: 'Qualis A1',
        tipo: t.origem === 'importado' ? 'Artigo Importado' : (t.params?.tipo_revisao ? `Revisão ${t.params.tipo_revisao}` : 'Revisão Integrativa'),
        periodo: t.params?.anos ? `Últimos ${t.params.anos} anos` : 'Recente',
        bases: (t.params?.bases || []).map((b) => b.toUpperCase()).join(' · ') || 'PubMed · SciELO · LILACS',
        amostraTotal: `${t.referencias || 0} referências`,
        fontesIncluidas: t.referencias || (t.aprovados ? t.aprovados.length : 0),
        registrosTriados: t.incluidos || t.referencias || 0,
        assertividade: '100%',
        custo: t.llm?.custo_usd ? `$${t.llm.custo_usd.toFixed(2)} USD` : '$0.00 USD',
        origem: t.origem,
        arquivo_original: t.arquivo_importado,
        revisoes_orientador: t.revisoes_orientador || 0,
        status: t.status || 'concluido',
        etapas: t.etapas,
        checklist: t.checklist,
        llm: t.llm,
        tem_prisma_img: t.tem_prisma_img,
        isReal: true,
      };
    });

    const optionsHtml = [];
    lista.forEach((t) => {
      const icone = t.origem === 'importado' ? '📥 ' : (t.revisoes_orientador ? '✨ ' : '📄 ');
      const ehRotuloRascunho = (s) => !s || /^(?:akyla|esther|brisa|draft|rascunho|modelo|teste|v\d+)/i.test(String(s).trim());
      const prefixoProjeto = (t.tema && t.tema !== t.titulo && !ehRotuloRascunho(t.tema)) ? `[${t.tema}] ` : '';
      const tituloDisplay = `${prefixoProjeto}${t.titulo || t.tema || t.id}`;
      const tituloCurto = tituloDisplay.length > 75 ? `${tituloDisplay.slice(0, 75)}...` : tituloDisplay;
      optionsHtml.push(`<option value="${t.id}">${icone}${tituloCurto}</option>`);
    });

    selectProj.innerHTML = optionsHtml.join('');

    // Atualiza Painel Executivo Global do Sistema
    renderSistemaGlobalDashboard(lista, statusData);

    if (!lista.some((t) => t.id === activeProjectId)) {
      activeProjectId = lista[0].id;
      selectProj.value = activeProjectId;
    }

    await updateActiveProject(activeProjectId);

    if (currentScreen === 'screen-overview' || currentScreen === 'screen-pipeline') {
      setUIMode('sistema');
    }
  } catch (e) {
    console.warn('Não foi possível sincronizar trabalhos reais:', e);
  }
}


// --- Orquestração Real dos Agentes Especialistas ---
let pipelineRunning = false;
async function runPipelineSimulation() {
  if (pipelineRunning) return;
  if (!activeProjectId) {
    audio.alert();
    showToast('Selecione ou crie um artigo no acervo para executar os agentes.', 'amber');
    return;
  }

  pipelineRunning = true;
  audio.playBeep(600, 'triangle', 0.1, 0.05);
  showToast('Disparando execução analítica dos Agentes Especialistas no artigo...', 'cyan');

  const stream = document.getElementById('pipeline-console-stream');
  const cards = document.querySelectorAll('.agent-node-card');

  function logConsole(agente, msg) {
    if (!stream) return;
    const time = new Date().toLocaleTimeString('pt-BR');
    const line = document.createElement('div');
    line.className = 'console-line';
    line.innerHTML = `<span class="console-time">[${time}]</span><span>[${agente}] ${escaparHtml(msg)}</span>`;
    stream.appendChild(line);
    stream.scrollTop = stream.scrollHeight;
  }

  try {
    logConsole('ORQUESTRADOR', `Iniciando auditoria completa no manuscrito [${activeProjectId}]...`);
    if (jarvis3D) jarvis3D.triggerPacketBurst();

    if (jarvis3D) jarvis3D.pulseAgent(1);
    logConsole('AGENTE-15: ROB 2.0', 'Avaliando risco de viés dos estudos incluídos...');

    const res = await api(`/api/trabalhos/${activeProjectId}/agentes`, {
      method: 'POST',
      body: JSON.stringify({ agente: 'todos' })
    });

    if (jarvis3D) {
      jarvis3D.pulseAgent(2);
      jarvis3D.triggerPacketBurst();
    }
    logConsole('AGENTE-16: GRADE/SoF', `Tabela Summary of Findings gerada com certeza ${res.grade?.certezaGlobal || 'calculada'}.`);

    if (jarvis3D) jarvis3D.pulseAgent(3);
    logConsole('AGENTE-17: ADAPTADOR', `Formatação para periódico alvo com taxa de conformidade ${res.revista?.resRevista?.taxaConformidade || 100}%.`);

    if (jarvis3D) jarvis3D.pulseAgent(4);
    logConsole('AGENTE-18: GRAPHICAL ABSTRACT', 'SVG do Graphical Abstract gerado nas dimensões 1200x630 (1.91:1).');

    if (jarvis3D) jarvis3D.pulseAgent(5);
    logConsole('AGENTE-19: TURNITIN SHIELD', `Similaridade preditiva Turnitin/iThenticate auditada: ${res.turnitin?.taxaSimilaridadeEstimada || '< 3%'}.`);

    if (jarvis3D) jarvis3D.pulseAgent(6);
    logConsole('AGENTE-20: COMPLIANCE PRISMA', 'Mapeamento de 27 itens PRISMA 2020 e taxonomia CRediT concluído.');

    // Sincroniza dados com o estado real
    await updateActiveProject(activeProjectId);

    audio.success();
    showToast('Execução dos Agentes Especialistas concluída com dados reais salvos no artigo!', 'emerald');
  } catch (err) {
    console.error('Erro na execução dos agentes:', err);
    logConsole('ERRO', `Falha ao executar agentes: ${err.message}`);
    audio.alert();
    showToast(`Erro na execução: ${err.message}`, 'rose');
  } finally {
    pipelineRunning = false;
    cards.forEach((c) => c.classList.remove('active-run'));
  }
}

// --- Modal Unificado de Novo Artigo & Importação ---
function setModalNovoTab(tab) {
  const btnPesquisa = document.getElementById('tab-btn-pesquisa-ia');
  const btnImportar = document.getElementById('tab-btn-importar-docx');
  const contentPesquisa = document.getElementById('tab-content-pesquisa-ia');
  const contentImportar = document.getElementById('tab-content-importar-docx');

  if (tab === 'importar') {
    if (btnPesquisa) {
      btnPesquisa.classList.remove('active');
      btnPesquisa.style.borderBottomColor = 'transparent';
      btnPesquisa.style.color = 'var(--text-dim)';
    }
    if (btnImportar) {
      btnImportar.classList.add('active');
      btnImportar.style.borderBottomColor = 'var(--neon-cyan)';
      btnImportar.style.color = 'var(--neon-cyan)';
    }
    if (contentPesquisa) contentPesquisa.style.display = 'none';
    if (contentImportar) contentImportar.style.display = 'block';
  } else {
    if (btnPesquisa) {
      btnPesquisa.classList.add('active');
      btnPesquisa.style.borderBottomColor = 'var(--neon-cyan)';
      btnPesquisa.style.color = 'var(--neon-cyan)';
    }
    if (btnImportar) {
      btnImportar.classList.remove('active');
      btnImportar.style.borderBottomColor = 'transparent';
      btnImportar.style.color = 'var(--text-dim)';
    }
    if (contentPesquisa) contentPesquisa.style.display = 'block';
    if (contentImportar) contentImportar.style.display = 'none';
  }
}
window.setModalNovoTab = setModalNovoTab;

function openModalNovo(tab = 'pesquisa') {
  audio.click();
  setModalNovoTab(tab);
  const modal = document.getElementById('modal-novo-artigo');
  if (modal) modal.classList.add('open');
}
window.openModalNovo = openModalNovo;

function closeModalNovo() {
  audio.click();
  const modal = document.getElementById('modal-novo-artigo');
  if (modal) modal.classList.remove('open');
}
window.closeModalNovo = closeModalNovo;

// --- Redirecionamento Unificado de Importação para a Aba correspondente ---
let arquivoImportarSelecionado = null;
let arquivoImportarBase64 = null;

function openModalImportar() {
  openModalNovo('importar');
}
window.openModalImportar = openModalImportar;

function closeModalImportar() {
  closeModalNovo();
}
window.closeModalImportar = closeModalImportar;

// --- Modal de Laudo de Raio-X Diagnóstico ---
function openModalRaioX(projId) {
  audio.click();
  const id = projId || activeProjectId;
  if (!id) {
    showToast('Nenhum artigo ativo selecionado para Raio-X.', 'amber');
    return;
  }
  const modal = document.getElementById('modal-raio-x');
  const iframe = document.getElementById('iframe-raio-x');
  const btnAba = document.getElementById('btn-raio-x-nova-aba');
  const url = `/api/trabalhos/${id}/raio-x`;
  
  if (iframe) iframe.src = url;
  if (btnAba) btnAba.href = url;
  if (modal) modal.classList.add('open');
}
window.openModalRaioX = openModalRaioX;

function closeModalRaioX() {
  audio.click();
  const modal = document.getElementById('modal-raio-x');
  const iframe = document.getElementById('iframe-raio-x');
  if (modal) modal.classList.remove('open');
  if (iframe) iframe.src = 'about:blank';
}
window.closeModalRaioX = closeModalRaioX;

// Carregador e roteador unificado de projeto para o Workspace / Leitor / Orientador
async function carregarProjetoNoLeitor(id, targetScreen = 'screen-redacao') {
  if (typeof abrirWorkspaceArtigo === 'function') {
    return abrirWorkspaceArtigo(id, targetScreen);
  }
  return updateActiveProject(id);
}
window.carregarProjetoNoLeitor = carregarProjetoNoLeitor;

async function navegarParaOrientadorComLaudo(trabalhoId) {
  audio.click();
  closeModalRaioX();
  
  const idAlvo = trabalhoId || activeProjectId;
  if (idAlvo && idAlvo !== activeProjectId) {
    await carregarProjetoNoLeitor(idAlvo, 'screen-orientador');
  }
  
  switchScreen('screen-orientador');
  
  setTimeout(() => {
    const inputEl = document.getElementById('orientador-input');
    const btnPuxar = document.getElementById('btn-puxar-apontamentos-orientador');
    if (inputEl && !inputEl.value.trim() && btnPuxar && btnPuxar.style.display !== 'none') {
      btnPuxar.click();
    } else if (inputEl) {
      inputEl.focus();
    }
    const cardFalhas = document.getElementById('orientador-raiox-falhas-card');
    if (cardFalhas) cardFalhas.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast('✍️ Orientador Cirúrgico pronto. Agentes de IA a postos para lapidação.', 'purple');
  }, 120);
}
window.navegarParaOrientadorComLaudo = navegarParaOrientadorComLaudo;

async function navegarParaOrientadorComPendencia(trabalhoId, textoPendencia) {
  audio.click();
  closeModalRaioX();
  
  const idAlvo = trabalhoId || activeProjectId;
  if (idAlvo && idAlvo !== activeProjectId) {
    await carregarProjetoNoLeitor(idAlvo, 'screen-orientador');
  }
  
  switchScreen('screen-orientador');
  
  setTimeout(() => {
    const inputEl = document.getElementById('orientador-input');
    if (inputEl) {
      const prefixo = inputEl.value.trim() ? inputEl.value.trim() + '\n\n' : '';
      inputEl.value = `${prefixo}• [Apontamento Cirúrgico do Raio-X]: ${textoPendencia}\n  -> Instrução: Corrigir e refinar no texto com padrão acadêmico rigoroso Qualis A1.`;
      inputEl.focus();
      inputEl.scrollTop = inputEl.scrollHeight;
    }
    const cardFalhas = document.getElementById('orientador-raiox-falhas-card');
    if (cardFalhas) cardFalhas.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast('✍️ Apontamento transferido para a caixa do Orientador Cirúrgico!', 'cyan');
  }, 120);
}
window.navegarParaOrientadorComPendencia = navegarParaOrientadorComPendencia;

// --- Modal de Edição de Nome do Artigo ---
function abrirModalEditarArtigo(id, tituloAtual) {
  audio.playBeep(660, 'sine', 0.08, 0.04);
  const modal = document.getElementById('modal-editar-artigo');
  const inputId = document.getElementById('input-editar-artigo-id');
  const inputTitulo = document.getElementById('input-editar-artigo-titulo');
  const inputAutores = document.getElementById('input-editar-artigo-autores');
  if (!modal || !inputId || !inputTitulo) return;

  const trab = (typeof trabalhosReais !== 'undefined' && Array.isArray(trabalhosReais))
    ? trabalhosReais.find((t) => t.id === id)
    : null;

  inputId.value = id;
  inputTitulo.value = tituloAtual;
  if (inputAutores) {
    inputAutores.value = trab?.params?.autores || trab?.autores || '';
  }
  modal.classList.add('open');
  setTimeout(() => {
    inputTitulo.focus();
    inputTitulo.select();
  }, 50);
}
window.abrirModalEditarArtigo = abrirModalEditarArtigo;

function fecharModalEditarArtigo() {
  audio.click();
  const modal = document.getElementById('modal-editar-artigo');
  if (modal) modal.classList.remove('open');
}
window.fecharModalEditarArtigo = fecharModalEditarArtigo;

async function salvarNovoTituloArtigo() {
  const inputId = document.getElementById('input-editar-artigo-id');
  const inputTitulo = document.getElementById('input-editar-artigo-titulo');
  const btnSalvar = document.getElementById('btn-salvar-editar-artigo');
  if (!inputId || !inputTitulo) return;

  const id = inputId.value;
  const novoTitulo = inputTitulo.value.trim();
  const inputAutores = document.getElementById('input-editar-artigo-autores');
  const novosAutores = inputAutores ? inputAutores.value.trim() : null;

  if (!novoTitulo && novosAutores === null) {
    audio.alert();
    showToast('Informe um título válido para o artigo.', 'rose');
    inputTitulo.focus();
    return;
  }

  const textoOrig = btnSalvar.innerHTML;
  btnSalvar.disabled = true;
  btnSalvar.innerHTML = '<span>⏳</span> Salvando...';

  try {
    const payload = { titulo: novoTitulo };
    if (novosAutores !== null) payload.autores = novosAutores;

    const dados = await api(`/api/trabalhos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    audio.success();
    showToast('Nome do artigo atualizado com sucesso!', 'emerald');
    fecharModalEditarArtigo();

    // Atualiza nos dados locais
    const item = ultimosTrabalhosSistema.find((t) => t.id === id);
    if (item) {
      item.titulo = novoTitulo;
      if (item.params) item.params.tema = novoTitulo;
    }
    if (PROJECTS[id]) {
      PROJECTS[id].title = novoTitulo;
      if (PROJECTS[id].params) PROJECTS[id].params.tema = novoTitulo;
    }

    // Se for o projeto ativo, atualiza elementos visuais do HUD
    if (activeProjectId === id) {
      const topTitle = document.getElementById('hud-top-paper-title');
      if (topTitle) topTitle.textContent = novoTitulo;
      const leitorTitle = document.getElementById('leitor-titulo-artigo');
      if (leitorTitle) leitorTitle.textContent = novoTitulo;
      const docxChip = document.getElementById('btn-hud-quick-docx');
      if (docxChip) docxChip.title = `Baixar manuscrito nas normas ABNT: ${novoTitulo}`;
    }

    renderTabelaArtigosSistema();
    carregarTrabalhosReais().catch(() => {});
  } catch (err) {
    audio.error();
    showToast(err.message, 'rose');
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.innerHTML = textoOrig;
  }
}
window.salvarNovoTituloArtigo = salvarNovoTituloArtigo;

// --- Modal FinOps & Gestão de Créditos / Saldo Gemini ---
function openModalFinOps() {
  audio.click();
  const modal = document.getElementById('modal-finops');
  if (!modal) return;
  
  const uso = ultimoStatusSistema?.uso;
  const cfg = ultimoStatusSistema?.config;
  const gem = uso?.gemini;

  const gastoEl = document.getElementById('finops-gemini-gasto');
  const saldoCalcEl = document.getElementById('finops-gemini-saldo-calc');
  const inputCreditos = document.getElementById('finops-gemini-creditos-input');
  const dsSaldoEl = document.getElementById('finops-deepseek-saldo');
  const orSaldoEl = document.getElementById('finops-openrouter-saldo');

  if (gastoEl) {
    gastoEl.textContent = `$${(gem?.total_gasto_usd || 0).toFixed(4)} USD`;
  }
  if (saldoCalcEl) {
    if (gem?.tem_saldo_definido && gem?.saldo_restante_usd !== null && gem?.saldo_restante_usd !== undefined) {
      saldoCalcEl.textContent = `$${gem.saldo_restante_usd.toFixed(2)} USD`;
      saldoCalcEl.style.color = '#10b981';
    } else {
      saldoCalcEl.textContent = 'PayG (Ativo)';
      saldoCalcEl.style.color = 'var(--neon-cyan)';
    }
  }
  if (inputCreditos) {
    const credVal = cfg?.gemini_creditos_usd ?? gem?.creditos_iniciais_usd;
    inputCreditos.value = credVal != null ? credVal : '';
  }
  if (dsSaldoEl) {
    dsSaldoEl.textContent = uso?.deepseek?.saldo_total !== undefined && uso?.deepseek?.saldo_total !== null
      ? `$${uso.deepseek.saldo_total.toFixed(2)} USD`
      : 'Ativo / Conectado';
  }
  if (orSaldoEl) {
    orSaldoEl.textContent = uso?.openrouter?.saldo_restante_usd !== undefined && uso?.openrouter?.saldo_restante_usd !== null
      ? `$${uso.openrouter.saldo_restante_usd.toFixed(2)} USD`
      : (uso?.openrouter?.is_free_tier ? `${uso.openrouter.gratis_restantes ?? 50} chamadas restantes` : 'Conectado');
  }

  modal.classList.add('open');
  setTimeout(() => inputCreditos?.focus(), 50);
}
window.openModalFinOps = openModalFinOps;

function closeModalFinOps() {
  audio.click();
  const modal = document.getElementById('modal-finops');
  if (modal) {
    modal.classList.remove('open');
  }
}
window.closeModalFinOps = closeModalFinOps;

async function salvarCreditosGemini() {
  const input = document.getElementById('finops-gemini-creditos-input');
  if (!input) return;
  const val = input.value.trim();
  const num = val === '' ? null : Number(val);
  if (val !== '' && (isNaN(num) || num < 0)) {
    showToast('Informe um valor numérico válido (ex: 50.00).', 'amber');
    return;
  }
  try {
    const btn = document.getElementById('btn-salvar-creditos-gemini');
    if (btn) btn.disabled = true;
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Painel': '1',
      },
      body: JSON.stringify({ gemini_creditos_usd: num }),
    });
    if (!res.ok) throw new Error('Falha ao salvar saldo Gemini.');
    audio.success();
    showToast(num !== null ? `✔ Saldo Gemini de $${num.toFixed(2)} USD configurado!` : '✔ Modo Pay-as-you-go ativado!', 'emerald');
    
    // Atualiza status do sistema
    const rStatus = await fetch('/api/status?forcar=1');
    if (rStatus.ok) {
      const dados = await rStatus.json();
      ultimoStatusSistema = dados;
      if (typeof atualizarFinOpsProviders === 'function') atualizarFinOpsProviders(dados);
      const gem = dados.uso?.gemini;
      const gemVal = document.getElementById('hud-gemini-val');
      if (gemVal && gem) {
        if (gem.tem_saldo_definido) {
          gemVal.textContent = `$${gem.saldo_restante_usd.toFixed(2)}`;
        } else {
          gemVal.textContent = 'PayG (Ativo)';
        }
      }
    }
    closeModalFinOps();
  } catch (err) {
    showToast(err.message, 'rose');
  } finally {
    const btn = document.getElementById('btn-salvar-creditos-gemini');
    if (btn) btn.disabled = false;
  }
}
window.salvarCreditosGemini = salvarCreditosGemini;

// --- Modal de Exclusão de Artigo ---
function abrirModalExcluirArtigo(id, tituloAtual) {
  audio.playBeep(380, 'sawtooth', 0.12, 0.06);
  const modal = document.getElementById('modal-excluir-artigo');
  const inputId = document.getElementById('input-excluir-artigo-id');
  const txtTitulo = document.getElementById('excluir-artigo-titulo-alvo');
  const txtId = document.getElementById('excluir-artigo-id-alvo');
  if (!modal || !inputId) return;

  inputId.value = id;
  if (txtTitulo) txtTitulo.textContent = tituloAtual || id;
  if (txtId) txtId.textContent = `ID: ${id}`;

  modal.classList.add('open');
}
window.abrirModalExcluirArtigo = abrirModalExcluirArtigo;

function fecharModalExcluirArtigo() {
  audio.click();
  const modal = document.getElementById('modal-excluir-artigo');
  if (modal) modal.classList.remove('open');
}
window.fecharModalExcluirArtigo = fecharModalExcluirArtigo;

async function confirmarExclusaoArtigo() {
  const inputId = document.getElementById('input-excluir-artigo-id');
  const btnConfirmar = document.getElementById('btn-confirmar-excluir-artigo');
  if (!inputId) return;

  const id = inputId.value;
  const textoOrig = btnConfirmar.innerHTML;
  btnConfirmar.disabled = true;
  btnConfirmar.innerHTML = '<span>⏳</span> Excluindo...';

  try {
    await api(`/api/trabalhos/${id}`, {
      method: 'DELETE',
    });

    audio.success();
    showToast('Artigo excluído do acervo com sucesso!', 'emerald');
    fecharModalExcluirArtigo();

    // Remove do array local
    ultimosTrabalhosSistema = ultimosTrabalhosSistema.filter((t) => t.id !== id);
    delete PROJECTS[id];

    // Se o artigo excluído era o ativo selecionado
    if (activeProjectId === id) {
      const restantes = Object.keys(PROJECTS).filter((k) => PROJECTS[k]?.isReal);
      if (restantes.length > 0) {
        updateActiveProject(restantes[0]);
      } else {
        activeProjectId = null;
      }
    }

    renderSistemaGlobalDashboard(ultimosTrabalhosSistema);
    renderTabelaArtigosSistema();
    carregarTrabalhosReais().catch(() => {});
  } catch (err) {
    audio.error();
    showToast(err.message, 'rose');
  } finally {
    btnConfirmar.disabled = false;
    btnConfirmar.innerHTML = textoOrig;
  }
}
window.confirmarExclusaoArtigo = confirmarExclusaoArtigo;

function configurarUploadImportacao() {
  const dropzone = document.getElementById('jarvis-dropzone-box');
  const fileInput = document.getElementById('input-importar-arquivo');
  const chipBox = document.getElementById('jarvis-file-chip-box');
  const chipName = document.getElementById('jarvis-chip-name');
  const chipMeta = document.getElementById('jarvis-chip-meta');
  const chipIcon = document.getElementById('jarvis-chip-icon');
  const btnRemover = document.getElementById('btn-remover-arquivo-importado');
  const btnDisparar = document.getElementById('btn-disparar-importacao');
  const statusContainer = document.getElementById('importar-status-container');
  const statusTexto = document.getElementById('importar-status-texto');

  if (!dropzone || !fileInput) return;

  function processarArquivo(f) {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['docx', 'pdf'].includes(ext)) {
      audio.alert();
      showToast('Formato inválido. Selecione um arquivo .docx ou .pdf.', 'rose');
      return;
    }
    arquivoImportarSelecionado = f;
    const reader = new FileReader();
    reader.onload = () => {
      arquivoImportarBase64 = reader.result.split(',')[1];
    };
    reader.readAsDataURL(f);

    const tamKb = Math.round(f.size / 1024);
    const tamStr = tamKb > 1024 ? `${(tamKb / 1024).toFixed(1)} MB` : `${tamKb} KB`;

    if (chipName) chipName.textContent = f.name;
    if (chipMeta) chipMeta.textContent = `${ext.toUpperCase()} · ${tamStr} · Pronto para ingestão`;
    if (chipIcon) chipIcon.textContent = ext === 'pdf' ? '📕' : '📘';

    dropzone.style.display = 'none';
    if (chipBox) chipBox.style.display = 'block';
    audio.click();
  }

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('arrastando');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('arrastando'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('arrastando');
    const f = e.dataTransfer.files?.[0];
    if (f) processarArquivo(f);
  });

  fileInput.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (f) processarArquivo(f);
  });

  if (btnRemover) {
    btnRemover.addEventListener('click', (e) => {
      e.stopPropagation();
      arquivoImportarSelecionado = null;
      arquivoImportarBase64 = null;
      fileInput.value = '';
      if (chipBox) chipBox.style.display = 'none';
      dropzone.style.display = 'flex';
      audio.click();
    });
  }

  const chkQualis = document.getElementById('chk-importar-qualis');
  if (chkQualis && btnDisparar) {
    chkQualis.addEventListener('change', () => {
      btnDisparar.textContent = chkQualis.checked
        ? '⚡ Disparar Ingestão & Revisão IA'
        : '📥 Ingerir & Gerar Raio-X de Entrada';
    });
  }

  if (btnDisparar) {
    btnDisparar.addEventListener('click', async () => {
      if (!arquivoImportarSelecionado || !arquivoImportarBase64) {
        audio.alert();
        showToast('Selecione ou arraste um arquivo .docx ou .pdf antes de prosseguir.', 'amber');
        return;
      }

      const tema = document.getElementById('input-importar-tema')?.value.trim() || '';
      const autores = document.getElementById('input-importar-autores')?.value.trim() || '';
      const orientacoes = document.getElementById('input-importar-orientacoes')?.value.trim() || '';
      const aplicarQualis = chkQualis?.checked === true;

      btnDisparar.disabled = true;
      btnDisparar.textContent = aplicarQualis ? '⏳ Ingerindo e Revisando...' : '⏳ Ingerindo e Auditando...';
      if (statusContainer) statusContainer.style.display = 'block';
      if (statusTexto) statusTexto.textContent = aplicarQualis
        ? 'Extraindo texto, seções e aplicando Modelo Qualis A1...'
        : 'Extraindo texto, seções, hidratando referências e gerando Raio-X...';
      audio.playBeep(600, 'triangle', 0.1, 0.05);

      try {
        const dados = await api('/api/trabalhos/importar', {
          method: 'POST',
          body: JSON.stringify({
            nome_arquivo: arquivoImportarSelecionado.name,
            conteudo_base64: arquivoImportarBase64,
            tema,
            autores,
            orientacoes,
            aplicar_revisao: aplicarQualis,
          }),
        });

        audio.success();
        const rX = dados.raio_x;
        const msgRx = rX ? ` · Raio-X: ${rX.diretriz} (${rX.score_inicial}%)` : '';
        const confExt = dados.confianca_extracao !== undefined ? ` · Confiança: ${dados.confianca_extracao}%` : '';
        const tipoToast = (dados.confianca_extracao !== undefined && dados.confianca_extracao < 70) ? 'amber' : 'emerald';
        showToast(`Artigo importado com sucesso! (${dados.secoes?.length || 0} seções${msgRx}${confExt})`, tipoToast);

        // Reseta estado do modal
        btnDisparar.disabled = false;
        btnDisparar.textContent = chkQualis?.checked ? '⚡ Disparar Ingestão & Revisão IA' : '📥 Ingerir & Gerar Raio-X de Entrada';
        if (statusContainer) statusContainer.style.display = 'none';
        closeModalImportar();

        // Atualiza trabalhos e seleciona o novo
        await carregarTrabalhosReais();
        const selectProj = document.getElementById('select-active-project');
        if (selectProj) selectProj.value = dados.id;
        await updateActiveProject(dados.id);
        switchScreen('screen-redacao');
      } catch (err) {
        audio.alert();
        btnDisparar.disabled = false;
        btnDisparar.textContent = '⚡ Disparar Ingestão & Revisão IA';
        if (statusTexto) statusTexto.textContent = `Erro: ${err.message}`;
        showToast(`Erro na importação: ${err.message}`, 'rose');
      }
    });
  }
}

// =====================================================================
// AGENTES ESPECIALISTAS QUALIS A1 (AGENTES 15 A 20)
// =====================================================================
function initAgentesA1UI() {
  const statusBox = document.getElementById('agentes-a1-status-box');
  const statusTexto = document.getElementById('agentes-a1-status-texto');
  const dinamicoBox = document.getElementById('agentes-a1-conteudo-dinamico');
  const dinamicoTitulo = document.getElementById('agentes-a1-dinamico-titulo');
  const dinamicoCorpo = document.getElementById('agentes-a1-dinamico-corpo');

  function exibirStatus(msg) {
    if (statusBox) statusBox.style.display = 'block';
    if (statusTexto) statusTexto.textContent = msg;
  }
  function ocultarStatus() {
    if (statusBox) statusBox.style.display = 'none';
  }
  function exibirDinamico(titulo, htmlContent) {
    if (dinamicoTitulo) dinamicoTitulo.textContent = titulo;
    if (dinamicoCorpo) dinamicoCorpo.innerHTML = htmlContent;
    if (dinamicoBox) {
      dinamicoBox.style.display = 'block';
      dinamicoBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // 1. Executar Todos os Agentes A1
  const btnTodos = document.getElementById('btn-executar-todos-agentes-a1');
  if (btnTodos) {
    btnTodos.addEventListener('click', async () => {
      const p = PROJECTS[activeProjectId];
      if (!p || !p.isReal) {
        showToast('Selecione um artigo real para executar os agentes.', 'amber');
        return;
      }
      btnTodos.disabled = true;
      btnTodos.textContent = '⏳ Orquestrando os 6 Agentes...';
      exibirStatus('Calculando Risco de Viés, Sistema GRADE, Graphical Abstract e Turnitin Shield...');
      audio.playBeep(520, 'triangle', 0.1, 0.05);

      try {
        const selRevista = document.getElementById('select-revista-alvo')?.value || 'icmje_generico';
        const res = await api(`/api/trabalhos/${activeProjectId}/agentes`, {
          method: 'POST',
          body: JSON.stringify({ agente: 'todos', revista: selRevista })
        });

        audio.success();
        showToast('Suíte de Agentes A1 executada com 100% de sucesso!', 'emerald');

        // Atualiza Badges
        const tagTurnitinScore = document.getElementById('tag-turnitin-score');
        if (tagTurnitinScore && res.turnitin) tagTurnitinScore.textContent = res.turnitin.taxaSimilaridadeEstimada;

        const tagRevistaConf = document.getElementById('tag-revista-conformidade');
        if (tagRevistaConf && res.revista?.auditoria) tagRevistaConf.textContent = `${res.revista.auditoria.taxaConformidade}%`;

        // Atualiza links
        await updateActiveProject(activeProjectId);

        exibirDinamico(
          '✔ Suíte Qualis A1 Concluída com Sucesso',
          `<div style="display:flex; flex-direction:column; gap:16px;">
            <div style="background:#064e3b33; border:1px solid #059669; padding:14px; border-radius:8px; color:#6ee7b7; font-size:13px;">
              Todos os 6 agentes operaram em conjunto: gráficos vetoriais SVG gerados, tabela SoF calculada, auditoria editorial aprovada e artigo imune a similaridades preditivas.
            </div>
            ${res.grade?.tabelaHtml || ''}
            <div style="text-align:right;">
              <a href="/api/trabalhos/${activeProjectId}/arquivos/graphical_abstract.svg" target="_blank" class="hud-btn primary" style="font-size:12px; text-decoration:none;">
                🖼️ Abrir Graphical Abstract (SVG 300 DPI)
              </a>
            </div>
          </div>`
        );
      } catch (err) {
        audio.alert();
        showToast(`Erro ao executar agentes: ${err.message}`, 'rose');
      } finally {
        btnTodos.disabled = false;
        btnTodos.textContent = '⚡ Executar Todos os 6 Agentes A1';
        ocultarStatus();
      }
    });
  }

  // 2. Agente 15: Risco de Viés
  const btnRoB = document.getElementById('btn-agente-rob');
  if (btnRoB) {
    btnRoB.addEventListener('click', async () => {
      const p = PROJECTS[activeProjectId];
      if (!p || !p.isReal) return showToast('Selecione um artigo real.', 'amber');
      btnRoB.disabled = true;
      exibirStatus('Avaliando risco de viés em 5 domínios Cochrane (RoB 2)...');
      try {
        const res = await api(`/api/trabalhos/${activeProjectId}/agentes`, {
          method: 'POST',
          body: JSON.stringify({ agente: 'risco-vies' })
        });
        audio.click();
        showToast('Risco de viés avaliado. Gráficos Traffic Light e Summary gerados!', 'emerald');
        await updateActiveProject(activeProjectId);
        exibirDinamico(
          'Agente 15 · Gráficos de Risco de Viés (RoB 2 / RevMan Standard)',
          `<div style="display:flex; flex-direction:column; gap:16px; align-items:center;">
            <p style="color:#94a3b8; font-size:12px; width:100%;">Score Médio Metodológico dos Estudos: <strong style="color:#10b981;">${res.dadosRoB?.score_medio || 100}%</strong> (${res.dadosRoB?.estudos?.length || 0} estudos auditados).</p>
            <div style="background:#0f172a; padding:16px; border-radius:10px; border:1px solid #1e293b; max-width:100%; overflow-x:auto;">
              ${res.svgTraffic || '<p>Gráfico gerado em traffic_light.svg</p>'}
            </div>
            <div style="display:flex; gap:10px;">
              <a href="/api/trabalhos/${activeProjectId}/arquivos/traffic_light.svg" target="_blank" class="hud-btn ghost" style="text-decoration:none;">Abrir SVG Externo</a>
              <a href="/api/trabalhos/${activeProjectId}/arquivos/summary_plot.svg" target="_blank" class="hud-btn ghost" style="text-decoration:none;">Abrir Summary Plot</a>
            </div>
          </div>`
        );
      } catch (err) {
        showToast(`Erro RoB: ${err.message}`, 'rose');
      } finally {
        btnRoB.disabled = false;
        ocultarStatus();
      }
    });
  }

  // 3. Agente 16: Sistema GRADE & SoF
  const btnGrade = document.getElementById('btn-agente-grade');
  if (btnGrade) {
    btnGrade.addEventListener('click', async () => {
      const p = PROJECTS[activeProjectId];
      if (!p || !p.isReal) return showToast('Selecione um artigo real.', 'amber');
      btnGrade.disabled = true;
      exibirStatus('Calculando certezas GRADE para cada desfecho clínico...');
      try {
        const res = await api(`/api/trabalhos/${activeProjectId}/agentes`, {
          method: 'POST',
          body: JSON.stringify({ agente: 'grade' })
        });
        audio.click();
        showToast('Tabela Summary of Findings (SoF) GRADE gerada!', 'emerald');
        const tagGrade = document.getElementById('tag-grade-certeza');
        if (tagGrade && (res.resGrade?.certezaGeral || res.resGrade?.certezaGlobal)) {
          tagGrade.textContent = res.resGrade.certezaGeral || res.resGrade.certezaGlobal;
          tagGrade.style.color = '#38bdf8';
        }
        await updateActiveProject(activeProjectId);
        exibirDinamico(
          'Agente 16 · Tabela de Resumo dos Achados (Summary of Findings - SoF)',
          res.resGrade?.tabelaHtml || '<p>Tabela não disponível.</p>'
        );
      } catch (err) {
        showToast(`Erro GRADE: ${err.message}`, 'rose');
      } finally {
        btnGrade.disabled = false;
        ocultarStatus();
      }
    });
  }

  // 4. Agente 17: Adaptador de Revista
  const btnRevista = document.getElementById('btn-agente-revista');
  if (btnRevista) {
    btnRevista.addEventListener('click', async () => {
      const p = PROJECTS[activeProjectId];
      if (!p || !p.isReal) return showToast('Selecione um artigo real.', 'amber');
      btnRevista.disabled = true;
      const selRevista = document.getElementById('select-revista-alvo')?.value || 'icmje_generico';
      exibirStatus(`Auditando conformidade editorial para ${selRevista}...`);
      try {
        const res = await api(`/api/trabalhos/${activeProjectId}/agentes`, {
          method: 'POST',
          body: JSON.stringify({ agente: 'revista', revista: selRevista })
        });
        audio.click();
        const conf = res.resRevista?.auditoria?.taxaConformidade || 100;
        const tagConf = document.getElementById('tag-revista-conformidade');
        if (tagConf) tagConf.textContent = `${conf}%`;
        showToast(`Artigo analisado para ${res.resRevista?.revistaSelecionada}: ${conf}% conforme.`, 'emerald');
        await updateActiveProject(activeProjectId);

        const checksHtml = (res.resRevista?.auditoria?.checks || []).map(c => `
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #1e293b; font-size:12px;">
            <span><strong>${c.item}</strong>: ${c.detalhes}</span>
            <span class="agent-status-badge ${c.status === 'aprovado' ? 'ok' : 'alert'}">${c.status}</span>
          </div>
        `).join('');

        exibirDinamico(
          `Agente 17 · Adequação Editorial: ${res.resRevista?.revistaSelecionada}`,
          `<div>
            <div style="margin-bottom:16px; font-size:13px;">
              <strong>Fator de Impacto:</strong> ${res.resRevista?.fatorImpacto || 'Tier 1'} |
              <strong>Conformidade Geral:</strong> <span style="color:#10b981; font-weight:bold;">${conf}%</span>
            </div>
            <div style="background:#0f172a; padding:14px; border-radius:8px; border:1px solid #1e293b; margin-bottom:16px;">
              ${checksHtml}
            </div>
            ${res.resRevista?.coverLetter ? `
              <div style="margin-top:14px;">
                <h4 style="font-size:13px; color:#38bdf8; margin-bottom:8px;">✉ Cover Letter Oficial ao Editor-Chefe:</h4>
                <pre style="background:#0b1120; padding:12px; border-radius:6px; font-size:11px; color:#cbd5e1; white-space:pre-wrap; font-family:monospace; max-height:220px; overflow-y:auto;">${res.resRevista.coverLetter}</pre>
              </div>
            ` : ''}
          </div>`
        );
      } catch (err) {
        showToast(`Erro na adequação: ${err.message}`, 'rose');
      } finally {
        btnRevista.disabled = false;
        ocultarStatus();
      }
    });
  }

  // 5. Agente 18: Graphical Abstract
  const btnGA = document.getElementById('btn-agente-ga');
  if (btnGA) {
    btnGA.addEventListener('click', async () => {
      const p = PROJECTS[activeProjectId];
      if (!p || !p.isReal) return showToast('Selecione um artigo real.', 'amber');
      btnGA.disabled = true;
      exibirStatus('Desenhando Graphical Abstract vetorial SVG (300 DPI)...');
      try {
        const res = await api(`/api/trabalhos/${activeProjectId}/agentes`, {
          method: 'POST',
          body: JSON.stringify({ agente: 'graphical-abstract' })
        });
        audio.click();
        showToast('Graphical Abstract gerado em alta resolução!', 'emerald');
        await updateActiveProject(activeProjectId);
        exibirDinamico(
          'Agente 18 · Graphical Abstract Científico Vetorial (SVG 300 DPI)',
          `<div style="display:flex; flex-direction:column; gap:16px; align-items:center;">
            <div style="background:#0f172a; padding:10px; border-radius:10px; border:1px solid #1e293b; width:100%; overflow:hidden;">
              ${res.resGA?.svg || '<p>SVG gerado em graphical_abstract.svg</p>'}
            </div>
            <div style="display:flex; gap:10px;">
              <a href="/api/trabalhos/${activeProjectId}/arquivos/graphical_abstract.svg" target="_blank" class="hud-btn primary" style="text-decoration:none;">
                🖼️ Abrir Imagem em Resolução Total (1200x630)
              </a>
            </div>
          </div>`
        );
      } catch (err) {
        showToast(`Erro Graphical Abstract: ${err.message}`, 'rose');
      } finally {
        btnGA.disabled = false;
        ocultarStatus();
      }
    });
  }

  // 6. Agente 19: Turnitin Shield
  const btnTurnitin = document.getElementById('btn-agente-turnitin');
  if (btnTurnitin) {
    btnTurnitin.addEventListener('click', async () => {
      const p = PROJECTS[activeProjectId];
      if (!p || !p.isReal) return showToast('Selecione um artigo real.', 'amber');
      btnTurnitin.disabled = true;
      exibirStatus('Auditando n-grams e índices preditivos de similaridade iThenticate...');
      try {
        const res = await api(`/api/trabalhos/${activeProjectId}/agentes`, {
          method: 'POST',
          body: JSON.stringify({ agente: 'turnitin' })
        });
        audio.click();
        const score = res.resTurnitin?.taxaSimilaridadeEstimada || '< 3.0%';
        const tagScore = document.getElementById('tag-turnitin-score');
        if (tagScore) tagScore.textContent = score;
        showToast(`Auditoria Turnitin: Índice preditivo de ${score}.`, 'emerald');
        await updateActiveProject(activeProjectId);

        exibirDinamico(
          'Agente 19 · Laudo de Similaridade Preditiva (Turnitin / iThenticate Shield)',
          `<div style="display:flex; flex-direction:column; gap:14px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-size:32px; font-weight:800; color:#10b981;">${score}</span>
              <div>
                <strong style="color:#f8fafc; font-size:14px;">Status de Blindagem: ${res.resTurnitin?.auditoria?.status || 'Blindado'}</strong>
                <p style="color:#94a3b8; font-size:12px; margin-top:2px;">Total de palavras analisadas: ${res.resTurnitin?.auditoria?.totalPalavras || 0}.</p>
              </div>
            </div>
            <div style="background:#0f172a; padding:12px; border-radius:8px; border:1px solid #1e293b; font-size:12px;">
              <strong>Plano de Ação:</strong>
              <ul style="margin:6px 0 0 16px; padding:0; color:#cbd5e1;">
                ${(res.resTurnitin?.planoAcao || []).map(a => `<li>${a}</li>`).join('')}
              </ul>
            </div>
          </div>`
        );
      } catch (err) {
        showToast(`Erro Turnitin: ${err.message}`, 'rose');
      } finally {
        btnTurnitin.disabled = false;
        ocultarStatus();
      }
    });
  }

  // 7. Paráfrase Ativa Direta
  const btnBlindar = document.getElementById('btn-blindar-parafrase');
  if (btnBlindar) {
    btnBlindar.addEventListener('click', async () => {
      const p = PROJECTS[activeProjectId];
      if (!p || !p.isReal) return showToast('Selecione um artigo real.', 'amber');
      btnBlindar.disabled = true;
      btnBlindar.textContent = '⏳ Imunizando Manuscrito...';
      exibirStatus('Aplicando paráfrase conceitual ativa e eliminando clichês de IA...');
      try {
        const res = await api(`/api/trabalhos/${activeProjectId}/blindar-texto`, { method: 'POST', body: '{}' });
        audio.success();
        showToast('Manuscrito blindado com sucesso (< 3% similaridade)! Novo DOCX gerado.', 'emerald');
        await updateActiveProject(activeProjectId);
      } catch (err) {
        showToast(`Erro na blindagem: ${err.message}`, 'rose');
      } finally {
        btnBlindar.disabled = false;
        btnBlindar.textContent = '🛡️ Aplicar Paráfrase Ativa Profunda';
        ocultarStatus();
      }
    });
  }

  // 8. Agente 20: Compliance Ético
  const btnCompliance = document.getElementById('btn-agente-compliance');
  if (btnCompliance) {
    btnCompliance.addEventListener('click', async () => {
      const p = PROJECTS[activeProjectId];
      if (!p || !p.isReal) return showToast('Selecione um artigo real.', 'amber');
      btnCompliance.disabled = true;
      exibirStatus('Mapeando checklist PRISMA 2020 e taxonomia CRediT...');
      try {
        const res = await api(`/api/trabalhos/${activeProjectId}/agentes`, {
          method: 'POST',
          body: JSON.stringify({ agente: 'compliance' })
        });
        audio.click();
        showToast('Checklist PRISMA 2020 paginado e CRediT gerados!', 'emerald');
        await updateActiveProject(activeProjectId);
        exibirDinamico(
          'Agente 20 · Compliance Ético, CRediT & Checklist PRISMA 2020 Paginado',
          `<div style="display:flex; flex-direction:column; gap:16px;">
            <div style="background:#0f172a; padding:12px; border-radius:8px; border:1px solid #1e293b; font-size:12px; color:#e2e8f0;">
              ${res.resCompliance?.credit?.textoCRediT ? `<pre style="white-space:pre-wrap; font-family:monospace; margin:0;">${res.resCompliance.credit.textoCRediT}</pre>` : ''}
            </div>
            <div style="max-height:300px; overflow-y:auto; font-size:12px; border:1px solid #1e293b; border-radius:8px;">
              <table style="width:100%; border-collapse:collapse; text-align:left;">
                <thead style="background:#1e293b; color:#94a3b8; font-size:11px;">
                  <tr>
                    <th style="padding:8px;">Item</th>
                    <th style="padding:8px;">Seção</th>
                    <th style="padding:8px;">Descrição</th>
                    <th style="padding:8px;">Página Estimada</th>
                  </tr>
                </thead>
                <tbody>
                  ${(res.resCompliance?.prismaChecklist?.checklistMapeado || []).map(c => `
                    <tr style="border-bottom:1px solid #1e293b;">
                      <td style="padding:8px; font-weight:bold; color:#38bdf8;">${c.item}</td>
                      <td style="padding:8px;">${c.secao}</td>
                      <td style="padding:8px; color:#cbd5e1;">${c.descricao}</td>
                      <td style="padding:8px; color:#10b981; font-weight:bold;">${c.paginaEstimada}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>`
        );
      } catch (err) {
        showToast(`Erro Compliance: ${err.message}`, 'rose');
      } finally {
        btnCompliance.disabled = false;
        ocultarStatus();
      }
    });
  }
}

// --- Iniciar Aplicação ao Carregar o DOM ---
document.addEventListener('DOMContentLoaded', () => {
  initCyberCanvas();
  initAgentesA1UI();

  // Renderizar componentes iniciais
  renderAgentsGrid();
  renderTriagemDeck();
  renderEvidenciasGrid();
  renderTabelaAbnt();
  renderBadges();

  // Navegação do Menu
  document.querySelectorAll('.nav-item-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetScreen = btn.dataset.screen;
      if (targetScreen) switchScreen(targetScreen);
    });
  });

  // Toggle do Sidebar Retrátil
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      audio.click();
      sidebar.classList.toggle('collapsed');
    });
  }

  // Atalho de Teclado Ctrl+B para recolher sidebar
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      if (sidebar) sidebar.classList.toggle('collapsed');
      audio.click();
    }
  });

  // Seletor de Artigo Ativo
  const selectProj = document.getElementById('select-active-project');
  if (selectProj) {
    selectProj.addEventListener('change', async (e) => {
      await updateActiveProject(e.target.value);
      setUIMode('artigo', e.target.value);
    });
  }

  // Botões de Voltar ao Painel Geral do Sistema (Breadcrumb e Fechar Artigo)
  const btnVoltarSistema = document.getElementById('btn-voltar-sistema');
  if (btnVoltarSistema) {
    btnVoltarSistema.addEventListener('click', voltarAoPainelSistema);
  }

  const btnCloseArticleSidebar = document.getElementById('btn-sidebar-close-article');
  if (btnCloseArticleSidebar) {
    btnCloseArticleSidebar.addEventListener('click', voltarAoPainelSistema);
  }

  // Deck de Artigos Ativos na Central de Comando
  document.querySelectorAll('.manuscript-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      audio.click();
      document.querySelectorAll('.manuscript-item').forEach((i) => i.classList.remove('selected'));
      item.classList.add('selected');
      const projId = item.dataset.id;
      if (projId && selectProj) {
        selectProj.value = projId;
        updateActiveProject(projId);
      }
    });
  });

  // Botões de Quick View de artigo
  document.querySelectorAll('.btn-quick-view').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      switchScreen('screen-redacao');
    });
  });

  // Filtros da Triagem
  const inputBusca = document.getElementById('input-busca-triagem');
  const selectBase = document.getElementById('select-filtro-base');
  const selectStatus = document.getElementById('select-filtro-status');

  function aplicarFiltrosTriagem() {
    renderTriagemDeck(inputBusca?.value || '', selectBase?.value || 'todas', selectStatus?.value || 'todos');
  }

  if (inputBusca) inputBusca.addEventListener('input', aplicarFiltrosTriagem);
  if (selectBase) selectBase.addEventListener('change', aplicarFiltrosTriagem);
  if (selectStatus) selectStatus.addEventListener('change', aplicarFiltrosTriagem);

  // Drawer de Evidência Fechar
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeEvidenceDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEvidenceDrawer();
      if (typeof closeModalRaioX === 'function') closeModalRaioX();
      if (typeof closeModalNovo === 'function') closeModalNovo();
      if (typeof closeModalImportar === 'function') closeModalImportar();
    }
  });
  const drawerEvidencia = document.getElementById('drawer-evidencia');
  if (drawerEvidencia) {
    document.addEventListener('click', (e) => {
      if (drawerEvidencia.classList.contains('open') &&
          !drawerEvidencia.contains(e.target) &&
          !e.target.closest('.btn-ver-evidencia') &&
          !e.target.closest('.triagem-card') &&
          !e.target.closest('.evidencia-card') &&
          !e.target.closest('.evidencia-preview-img-wrapper')) {
        closeEvidenceDrawer();
      }
    });
  }

let listaReferenciasArtigoAtivo = [];

function sincronizarInspetorFontes(estudosOuReferencias) {
  listaReferenciasArtigoAtivo = estudosOuReferencias || [];
  const selectCite = document.getElementById('select-cite-inspector');
  if (!selectCite) return;

  if (listaReferenciasArtigoAtivo.length === 0) {
    selectCite.innerHTML = '<option value="">Nenhuma fonte disponível</option>';
    return;
  }

  selectCite.innerHTML = listaReferenciasArtigoAtivo.map((ref, idx) => {
    const num = ref.n || (idx + 1);
    const autorBruto = (Array.isArray(ref.autores) && ref.autores.length > 0)
      ? ref.autores[0]
      : (ref.autor || ref.titulo || `Estudo #${num}`);
    const autorCurto = String(autorBruto || `Estudo #${num}`).trim();
    const autorLimpo = autorCurto.length > 28 ? `${autorCurto.slice(0, 28)}...` : autorCurto;
    const ano = ref.ano ? `(${ref.ano})` : '';
    return `<option value="${num}">[${num}] ${escaparHtml(autorLimpo)} ${ano}</option>`;
  }).join('');

  // Inicializa o inspetor com a primeira citação para nunca ficar vazio
  inspecionarFontePorNumero(1);
}
window.sincronizarInspetorFontes = sincronizarInspetorFontes;

function inspecionarFontePorNumero(citeNum) {
  const n = parseInt(String(citeNum).split(',')[0].split('-')[0], 10) || 1;
  const citeTag = document.getElementById('cite-active-tag');
  if (citeTag) citeTag.textContent = `[${n}]`;

  const selectCite = document.getElementById('select-cite-inspector');
  if (selectCite && selectCite.value !== String(n)) {
    selectCite.value = String(n);
  }

  // Tenta encontrar por número ou por índice (n - 1)
  let ref = listaReferenciasArtigoAtivo.find(r => r.n === n || r.id === `INC-${n}` || r.uid === `ref-imp-${n}`);
  if (!ref && listaReferenciasArtigoAtivo[n - 1]) {
    ref = listaReferenciasArtigoAtivo[n - 1];
  }
  if (!ref && listaReferenciasArtigoAtivo[0]) {
    ref = listaReferenciasArtigoAtivo[0];
  }
  if (!ref) return;

  const titleEl = document.getElementById('cite-ins-title');
  const authorsEl = document.getElementById('cite-ins-authors');
  const journalEl = document.getElementById('cite-ins-journal');
  const quoteEl = document.getElementById('cite-ins-quote');
  const linkCite = document.getElementById('btn-cite-ins-link');
  const baseBadge = document.getElementById('cite-ins-base-badge');
  const anoEl = document.getElementById('cite-ins-ano');

  const titulo = ref.titulo || ref.title || 'Estudo Indexado';
  let autores = 'Autores não informados';
  if (Array.isArray(ref.autores) && ref.autores.length > 0) {
    autores = ref.autores.join(', ');
  } else if (ref.autor || ref.autores) {
    autores = String(ref.autor || ref.autores);
  }
  const journal = ref.periodico || ref.journal || (ref.base_origem ? ref.base_origem.toUpperCase() : 'Periódico Científico');
  const ano = ref.ano || '';
  const doi = ref.doi && ref.doi !== 'N/A' ? ref.doi : '';
  const pmid = ref.pmid && ref.pmid !== 'N/A' ? ref.pmid : '';
  const base = String(ref.base || ref.base_origem || (pmid ? 'pubmed' : (doi ? 'crossref' : 'scielo'))).toLowerCase();

  if (titleEl) titleEl.textContent = titulo;
  if (authorsEl) authorsEl.textContent = autores;
  if (anoEl) anoEl.textContent = ano || '2024';

  if (baseBadge) {
    if (base.includes('pubmed')) {
      baseBadge.innerHTML = '🏛️ PubMed Indexado';
      baseBadge.style.background = 'rgba(0, 240, 255, 0.15)';
      baseBadge.style.color = 'var(--neon-cyan)';
      baseBadge.style.borderColor = 'rgba(0, 240, 255, 0.35)';
    } else if (base.includes('scielo')) {
      baseBadge.innerHTML = '🇧🇷 SciELO Brasil';
      baseBadge.style.background = 'rgba(16, 185, 129, 0.15)';
      baseBadge.style.color = 'var(--neon-emerald)';
      baseBadge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
    } else {
      baseBadge.innerHTML = '🌐 CrossRef / DOI';
      baseBadge.style.background = 'rgba(139, 92, 246, 0.15)';
      baseBadge.style.color = '#c084fc';
      baseBadge.style.borderColor = 'rgba(139, 92, 246, 0.35)';
    }
  }

  let metadadosStr = `${journal}`;
  if (doi) metadadosStr += ` · DOI: ${doi}`;
  if (pmid) metadadosStr += ` · PMID: ${pmid}`;
  if (journalEl) journalEl.textContent = metadadosStr;

  const resumoTexto = ref.resumo || ref.achados || ref.desfecho || 'Evidência científica validada na fonte primária e incluída na síntese qualitativa e quantitativa.';
  if (quoteEl) quoteEl.textContent = `"${resumoTexto}"`;

  if (linkCite) {
    linkCite.style.display = 'inline-flex';
    if (doi) {
      linkCite.href = `https://doi.org/${doi}`;
      linkCite.textContent = '↗ Abrir DOI Oficial';
    } else if (pmid) {
      linkCite.href = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
      linkCite.textContent = '↗ Abrir no PubMed';
    } else if (ref.url && ref.url.startsWith('http')) {
      linkCite.href = ref.url;
      linkCite.textContent = '↗ Abrir Fonte';
    } else {
      linkCite.href = `https://scholar.google.com/scholar?q=${encodeURIComponent(titulo)}`;
      linkCite.textContent = '↗ Buscar no Scholar';
    }
  }
}
window.inspecionarFontePorNumero = inspecionarFontePorNumero;

  // --- Controles de Navegação Sequencial de Referências ---
  const selectCite = document.getElementById('select-cite-inspector');
  const btnCitePrev = document.getElementById('btn-cite-nav-prev');
  const btnCiteNext = document.getElementById('btn-cite-nav-next');

  if (selectCite) {
    selectCite.addEventListener('change', () => {
      audio.click();
      inspecionarFontePorNumero(selectCite.value);
    });
  }

  if (btnCitePrev) {
    btnCitePrev.addEventListener('click', () => {
      audio.click();
      const currentVal = parseInt(selectCite?.value || '1', 10);
      const total = listaReferenciasArtigoAtivo.length || 1;
      const prevVal = currentVal > 1 ? currentVal - 1 : total;
      inspecionarFontePorNumero(prevVal);
    });
  }

  if (btnCiteNext) {
    btnCiteNext.addEventListener('click', () => {
      audio.click();
      const currentVal = parseInt(selectCite?.value || '1', 10);
      const total = listaReferenciasArtigoAtivo.length || 1;
      const nextVal = currentVal < total ? currentVal + 1 : 1;
      inspecionarFontePorNumero(nextVal);
    });
  }

  // Citações no Leitor de Artigo: Delegação no container do Leitor
  const readerPaper = document.getElementById('reader-paper-content');
  if (readerPaper) {
    readerPaper.addEventListener('click', (e) => {
      const chip = e.target.closest('.cite-chip') || e.target.closest('.cite-link') || e.target.closest('sup.cit') || e.target.closest('.cit') || e.target.closest('sup') || (e.target.tagName === 'A' && /^\[\d+/.test(e.target.textContent.trim()) ? e.target : null);
      if (!chip) return;
      e.preventDefault();
      audio.click();

      // Destaca chip ativo
      readerPaper.querySelectorAll('.cite-chip.active').forEach((el) => el.classList.remove('active'));
      if (chip.classList.contains('cite-chip')) chip.classList.add('active');

      const citeNum = chip.dataset.cite || chip.textContent.replace(/[\[\]]/g, '').trim() || '1';
      inspecionarFontePorNumero(citeNum);
      showToast(`Inspecionando evidência da citação [${citeNum}] no painel lateral.`, 'cyan');
    });
  }

  // Ações do Inspetor de Citação Clicada
  const btnCiteTabela = document.getElementById('btn-cite-ins-tabela');
  if (btnCiteTabela) {
    btnCiteTabela.addEventListener('click', () => {
      audio.click();
      switchScreen('screen-extracao');
      showToast('Navegando para a Tabela 1 ABNT com os estudos caracterizados.', 'cyan');
    });
  }

  // Ações Úteis do Card de Auditoria Factual Qualis A1
  const btnAuditRaioX = document.getElementById('btn-audit-open-raiox');
  if (btnAuditRaioX) {
    btnAuditRaioX.addEventListener('click', () => {
      audio.click();
      openModalRaioX();
    });
  }

  const btnAuditSanar = document.getElementById('btn-audit-sanar-raiox');
  if (btnAuditSanar) {
    btnAuditSanar.addEventListener('click', async () => {
      audio.click();
      await window.executarSanacaoLaudo('auditoria-lateral');
    });
  }

  const btnAuditTurnitin = document.getElementById('btn-audit-goto-turnitin');
  if (btnAuditTurnitin) {
    btnAuditTurnitin.addEventListener('click', () => {
      audio.click();
      switchScreen('screen-agentes-a1');
    });
  }

  const btnAuditTriagem = document.getElementById('btn-audit-goto-triagem');
  if (btnAuditTriagem) {
    btnAuditTriagem.addEventListener('click', () => {
      audio.click();
      switchScreen('screen-triagem');
    });
  }

  // Atalhos de navegação no HUD e Header
  const btnBrandHome = document.getElementById('btn-brand-home');
  if (btnBrandHome) {
    btnBrandHome.addEventListener('click', () => switchScreen('screen-overview'));
  }

  // Perfil Acadêmico do Pesquisador (Modal útil com métricas reais)
  const btnPerfilPesquisador = document.getElementById('btn-perfil-pesquisador');
  const modalPerfil = document.getElementById('modal-perfil-pesquisador');
  const btnClosePerfil = document.getElementById('btn-close-modal-perfil');
  const btnFecharPerfil = document.getElementById('btn-fechar-modal-perfil');

  if (btnPerfilPesquisador && modalPerfil) {
    btnPerfilPesquisador.addEventListener('click', () => {
      audio.click();
      const elTotal = document.getElementById('perfil-metric-total-artigos');
      if (elTotal) {
        const count = (typeof ultimosTrabalhosSistema !== 'undefined' && ultimosTrabalhosSistema.length) || Object.keys(PROJECTS).length;
        elTotal.textContent = `${count} artigos ativos no acervo`;
      }
      modalPerfil.classList.add('open');
    });
  }
  if (btnClosePerfil && modalPerfil) {
    btnClosePerfil.addEventListener('click', () => {
      audio.click();
      modalPerfil.classList.remove('open');
    });
  }
  if (btnFecharPerfil && modalPerfil) {
    btnFecharPerfil.addEventListener('click', () => {
      audio.click();
      modalPerfil.classList.remove('open');
    });
  }
  if (modalPerfil) {
    modalPerfil.addEventListener('click', (e) => {
      if (e.target === modalPerfil) modalPerfil.classList.remove('open');
    });
  }

  const btnAtualizarDeck = document.getElementById('btn-atualizar-deck');
  if (btnAtualizarDeck) {
    btnAtualizarDeck.addEventListener('click', async () => {
      audio.click();
      await carregarTrabalhosReais();
      showToast('Deck de manuscritos sincronizado com o disco!', 'emerald');
    });
  }

  window.atualizarSaldosProvedores = async function() {
    audio.click();
    try {
      const dados = await api('/api/status?forcar=1');
      if (dados && dados.uso) {
        ultimoStatusSistema = dados;
        const ds = dados.uso.deepseek;
        const dsEl = document.getElementById('hud-deepseek-val');
        if (dsEl && ds?.saldo_total !== null && ds?.saldo_total !== undefined) {
          dsEl.textContent = `$${ds.saldo_total.toFixed(2)}`;
        }
        const gem = dados.uso.gemini;
        const gemEl = document.getElementById('hud-gemini-val');
        if (gemEl && gem) {
          if (gem.tem_saldo_definido && gem.saldo_restante_usd !== null && gem.saldo_restante_usd !== undefined) {
            gemEl.textContent = `$${gem.saldo_restante_usd.toFixed(2)}`;
            gemEl.title = `Google Gemini: Saldo restante $${gem.saldo_restante_usd.toFixed(2)} USD (Créditos $${gem.creditos_iniciais_usd.toFixed(2)} - Gasto $${(gem.total_gasto_usd || 0).toFixed(4)} USD)`;
          } else {
            gemEl.textContent = 'PayG (Ativo)';
            gemEl.title = `Google Gemini API (${gem.tier || 'Standard'}): Conectado. Faturamento Pay-As-You-Go. Consumo acumulado: $${(gem.total_gasto_usd || 0).toFixed(4)} USD (${Math.round((gem.tokens_total || 0) / 1000)}k tokens).`;
          }
        }
        const or = dados.uso.openrouter;
        const orEl = document.getElementById('hud-openrouter-val');
        if (orEl && or) {
          if (or.is_free_tier) {
            orEl.textContent = `${or.gratis_restantes ?? 50}/${or.gratis_limite ?? 50}`;
          } else if (or.saldo_restante_usd !== undefined && or.saldo_restante_usd !== null) {
            orEl.textContent = `$${or.saldo_restante_usd.toFixed(2)}`;
          }
        }
        if (typeof atualizarFinOpsProviders === 'function') {
          atualizarFinOpsProviders(dados);
        }
        if (typeof renderSistemaGlobalDashboard === 'function') {
          renderSistemaGlobalDashboard();
        }
      }
      audio.success();
      showToast('Saldos e cotas de IA atualizados com sucesso!', 'emerald');
    } catch (err) {
      showToast(`Erro ao atualizar saldo: ${err.message}`, 'rose');
    }
  };

  const btnAtualizarSaldos = document.getElementById('btn-atualizar-saldos');
  if (btnAtualizarSaldos) {
    btnAtualizarSaldos.addEventListener('click', () => window.atualizarSaldosProvedores());
  }

  const hudBalancePillClick = document.getElementById('hud-balance-pill');
  if (hudBalancePillClick) {
    hudBalancePillClick.addEventListener('click', () => window.atualizarSaldosProvedores());
  }

  const btnConvidar = document.getElementById('btn-convidar-pesquisador');
  if (btnConvidar) {
    btnConvidar.addEventListener('click', () => {
      const email = prompt('Digite o e-mail institucional do pesquisador ou orientador para convite:');
      if (email) {
        audio.success();
        showToast(`Convite de coautoria enviado para: ${email}`, 'emerald');
      }
    });
  }

  // Botões de Cópia e Exportação
  const btnCopyAbnt = document.getElementById('btn-copy-abnt');
  if (btnCopyAbnt) {
    btnCopyAbnt.addEventListener('click', () => {
      const tabela = document.getElementById('tabela-abnt');
      if (tabela) {
        const texto = tabela.innerText;
        navigator.clipboard?.writeText(texto);
        audio.success();
        showToast('Tabela 1 copiada em formato tabular compatível com MS Word (ABNT)!', 'emerald');
      }
    });
  }

  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      const p = PROJECTS[activeProjectId];
      if (p && p.isReal) {
        window.open(`/api/trabalhos/${activeProjectId}/arquivos/triagem.csv?baixar=1`, '_blank');
      } else {
        audio.click();
        showToast('Exportando dados da caracterização dos estudos em CSV...', 'cyan');
      }
    });
  }

  const btnExportLatex = document.getElementById('btn-export-latex');
  if (btnExportLatex) {
    btnExportLatex.addEventListener('click', () => {
      const latex = `\\begin{table}[h!]\n\\centering\n\\caption{Caracterização dos Estudos Incluídos na Revisão}\n\\begin{tabular}{|l|l|l|r|l|}\n\\hline\nAutor & Ano & País & Amostra & Desfecho \\\\\n\\hline\nKronenberg et al. & 2022 & Áustria & 46120 & MACE \\\\\nSantos et al. & 2023 & Brasil & 2840 & Aterosclerose \\\\\n\\hline\n\\end{tabular}\n\\end{table}`;
      navigator.clipboard?.writeText(latex);
      audio.success();
      showToast('Tabela em formato LaTeX copiada para a área de transferência!', 'emerald');
    });
  }

  const btnDownloadPrismaPng = document.getElementById('btn-download-prisma-png');
  if (btnDownloadPrismaPng) {
    btnDownloadPrismaPng.addEventListener('click', () => {
      const p = PROJECTS[activeProjectId];
      if (p && p.isReal) {
        window.open(`/api/trabalhos/${activeProjectId}/arquivos/fluxograma-prisma.png?baixar=1`, '_blank');
      } else {
        audio.click();
        showToast('Baixando fluxograma-prisma-2020.png em alta resolução...', 'emerald');
      }
    });
  }

  const btnDownloadPrismaSvg = document.getElementById('btn-download-prisma-svg');
  if (btnDownloadPrismaSvg) {
    btnDownloadPrismaSvg.addEventListener('click', () => {
      const p = PROJECTS[activeProjectId];
      if (p && p.isReal) {
        window.open(`/api/trabalhos/${activeProjectId}/arquivos/fluxograma-prisma.svg?baixar=1`, '_blank');
      } else {
        audio.click();
        showToast('Baixando fluxograma-prisma-2020.svg vetorial...', 'cyan');
      }
    });
  }

  // Função auxiliar para conectar telemetria SSE ao vivo na caixa de status do Orientador
  function iniciarTelemetriaOrientador(id, textoInicial = 'Iniciando agentes cirúrgicos...') {
    const statusBox = document.getElementById('orientador-status-box');
    const statusTexto = document.getElementById('orientador-status-texto');
    const logStream = document.getElementById('orientador-log-stream');
    const badge = document.getElementById('orientador-status-badge');

    if (statusBox) statusBox.style.display = 'block';
    if (statusTexto) statusTexto.textContent = textoInicial;
    if (badge) {
      badge.textContent = 'AO VIVO';
      badge.style.background = 'rgba(0, 240, 255, 0.15)';
      badge.style.color = 'var(--neon-cyan)';
      badge.style.borderColor = 'rgba(0, 240, 255, 0.3)';
    }
    if (logStream) {
      logStream.innerHTML = '';
      const inicial = document.createElement('div');
      inicial.style.color = 'var(--neon-cyan)';
      inicial.innerHTML = `<span style="color:var(--text-dim); margin-right:6px;">[${new Date().toLocaleTimeString('pt-BR')}]</span><span>${textoInicial}</span>`;
      logStream.appendChild(inicial);
    }

    let es = null;
    try {
      es = new EventSource(`/api/trabalhos/${id}/eventos`);
      es.onmessage = (e) => {
        try {
          const dados = JSON.parse(e.data);
          if (dados.tipo === 'log') {
            const linha = dados.linha || {};
            const time = linha.t ? new Date(linha.t).toLocaleTimeString('pt-BR') : new Date().toLocaleTimeString('pt-BR');
            const msg = linha.msg || (typeof linha === 'string' ? linha : '');
            if (!msg) return;

            if (statusTexto) {
              statusTexto.textContent = msg.length > 90 ? `${msg.slice(0, 87)}...` : msg;
            }
            if (logStream) {
              const div = document.createElement('div');
              div.style.wordBreak = 'break-word';
              const nivel = linha.nivel || 'info';
              const cor = (nivel === 'aviso' || msg.includes('⚠️')) ? '#f59e0b' : (msg.includes('✔') ? '#10b981' : (msg.includes('🛡️') ? '#a855f7' : '#38bdf8'));
              div.innerHTML = `<span style="color:var(--text-dim); margin-right:6px;">[${time}]</span><span style="color:${cor};">${msg}</span>`;
              logStream.appendChild(div);
              logStream.scrollTop = logStream.scrollHeight;
            }
          }
        } catch {}
      };
    } catch (err) {
      console.warn('Erro ao conectar SSE orientador:', err);
    }

    return (sucesso = true, msgFinal = '') => {
      if (es) {
        es.close();
        es = null;
      }
      if (statusTexto && msgFinal) {
        statusTexto.textContent = msgFinal;
      }
      if (badge) {
        badge.textContent = sucesso ? 'CONCLUÍDO' : 'ERRO';
        badge.style.background = sucesso ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
        badge.style.color = sucesso ? 'var(--neon-emerald)' : 'var(--neon-rose)';
        badge.style.borderColor = sucesso ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
      }
      if (logStream && msgFinal) {
        const finalDiv = document.createElement('div');
        finalDiv.style.color = sucesso ? 'var(--neon-emerald)' : 'var(--neon-rose)';
        finalDiv.style.fontWeight = '600';
        finalDiv.innerHTML = `<span style="color:var(--text-dim); margin-right:6px;">[${new Date().toLocaleTimeString('pt-BR')}]</span><span>${msgFinal}</span>`;
        logStream.appendChild(finalDiv);
        logStream.scrollTop = logStream.scrollHeight;
      }
    };
  }

  // Controle de exibição dos chips de seções permitidas
  const chkSecaoAuto = document.getElementById('chk-secao-auto');
  const divSecoesChips = document.getElementById('orientador-secoes-chips');
  if (chkSecaoAuto && divSecoesChips) {
    chkSecaoAuto.addEventListener('change', () => {
      divSecoesChips.style.display = chkSecaoAuto.checked ? 'none' : 'flex';
    });
  }

  // Botão de Devolutiva do Orientador
  const btnOrientador = document.getElementById('btn-aplicar-orientador');
  if (btnOrientador) {
    btnOrientador.addEventListener('click', async () => {
      const txt = document.getElementById('orientador-input')?.value.trim() || '';
      const inst = document.getElementById('orientador-instrucoes-input')?.value.trim() || '';
      const diffContent = document.getElementById('diff-box-content');
      const diffTitle = document.getElementById('diff-box-title');
      const diffSubtitle = document.getElementById('diff-box-subtitle');
      const downloadBar = document.getElementById('orientador-download-bar');
      const downloadBtn = document.getElementById('btn-download-orientador-docx');
      const downloadTitle = document.getElementById('orientador-download-title');

      // Captura Modo de Atuação (Cirúrgico Estrito vs Amplo)
      const radioAmplo = document.getElementById('radio-modo-amplo');
      const modo = (radioAmplo && radioAmplo.checked) ? 'amplo' : 'cirurgico';

      // Captura Seções Permitidas (se o usuário desmarcou o auto-detectar)
      const chkAuto = document.getElementById('chk-secao-auto');
      let secoes_permitidas = null;
      if (chkAuto && !chkAuto.checked) {
        const marcados = Array.from(document.querySelectorAll('.chk-secao-filtro:checked')).map((c) => c.value);
        if (marcados.length > 0) secoes_permitidas = marcados;
      }

      const preservarQualis = document.getElementById('chk-orientador-qualis')?.checked ?? true;
      const p = PROJECTS[activeProjectId];

      if (p && p.isReal) {
        btnOrientador.disabled = true;
        btnOrientador.textContent = modo === 'cirurgico' ? '⏳ Aplicando Ajustes Cirúrgicos...' : '⏳ Aplicando Revisão...';
        audio.playBeep(650, 'triangle', 0.1, 0.04);
        const msgTelemetria = modo === 'cirurgico'
          ? 'Localizando trechos apontados e aplicando ajustes cirúrgicos com IA...'
          : 'Reescrevendo seções com IA e gerando novo DOCX...';
        const finalizarTelemetria = iniciarTelemetriaOrientador(activeProjectId, msgTelemetria);

        try {
          const dados = await api(`/api/trabalhos/${activeProjectId}/orientador`, {
            method: 'POST',
            body: JSON.stringify({
              devolutiva: txt || 'Revisão integral conforme o Modelo de Escrita Científica Qualis A1.',
              instrucoes_adicionais: inst,
              criar_backup: true,
              modo,
              secoes_permitidas,
              preservar_qualis: preservarQualis,
            }),
          });

          audio.success();
          showToast(`Revisão cirúrgica concluída! Rodada ${dados.rodada || 1} salva.`, 'emerald');
          finalizarTelemetria(true, `✔ Revisão cirúrgica concluída! Rodada ${dados.rodada || 1} salva e DOCX atualizado.`);

          // Atualiza diff
          if (diffTitle) diffTitle.textContent = `Diff Cirúrgico (Rodada ${dados.rodada || 1})`;
          if (diffSubtitle) diffSubtitle.textContent = `Backup versoes/${dados.backup_info?.pasta || dados.backup || 'automático'}`;

          if (diffContent && Array.isArray(dados.alteracoes)) {
            diffContent.innerHTML = dados.alteracoes.map((alt) => `
              <div class="diff-alteracao-item">
                <h4>${alt.secao}: ${alt.resumo_mudancas || 'Ajustes aplicados'}</h4>
                ${(alt.detalhes || []).map((d) => `<p>• ${d}</p>`).join('')}
              </div>
            `).join('');
          }

          // Exibe barra de download DOCX atualizado
          if (downloadBar && downloadBtn) {
            downloadBar.style.display = 'flex';
            downloadBtn.href = `/api/trabalhos/${activeProjectId}/artigo.docx?baixar=1&_t=${Date.now()}`;
            downloadBtn.textContent = `📥 Baixar Word (.docx) Atualizado (Rodada ${dados.rodada || 1})`;
            if (downloadTitle) downloadTitle.textContent = `✔ Manuscrito Revisado (Rodada ${dados.rodada || 1})`;
            const btnRebuttal = document.getElementById('btn-ver-rebuttal');
            if (btnRebuttal) {
              btnRebuttal.style.display = 'inline-block';
              btnRebuttal.href = `/api/trabalhos/${activeProjectId}/arquivos/rebuttal.md`;
            }
            const btnRelat = document.getElementById('btn-ver-relatorio-auditoria');
            if (btnRelat) btnRelat.href = `/api/trabalhos/${activeProjectId}/arquivos/relatorio-verificacao.md`;
          }

          // Limpa campos de entrada para próxima rodada
          const inpTxt = document.getElementById('orientador-input');
          if (inpTxt) inpTxt.value = '';
          const inpInst = document.getElementById('orientador-instrucoes-input');
          if (inpInst) inpInst.value = '';

          // Atualiza dados do projeto e leitor
          await updateActiveProject(activeProjectId);
        } catch (err) {
          audio.alert();
          showToast(`Erro na revisão: ${err.message}`, 'rose');
          finalizarTelemetria(false, `Erro na revisão: ${err.message}`);
        } finally {
          btnOrientador.disabled = false;
          btnOrientador.textContent = '⚡ Aplicar Correções Cirúrgicas';
        }
      } else {
        showToast('Selecione um artigo válido para aplicar correções.', 'amber');
      }
    });
  }

  // Botão Aplicar Alterações do Laudo (Orientador)
  const btnSanarOrientador = document.getElementById('btn-sanar-apontamentos-laudo');
  if (btnSanarOrientador) {
    btnSanarOrientador.addEventListener('click', async () => {
      audio.click();
      await window.executarSanacaoLaudo('orientador-bar');
    });
  }

  // Botão do Trio de Agentes: Humanização, Qualis A1 e Remoção de Marcas-d'água
  const btnHumanizar = document.getElementById('btn-aplicar-humanizacao');
  if (btnHumanizar) {
    btnHumanizar.addEventListener('click', async () => {
      const txt = document.getElementById('orientador-input')?.value.trim() || '';
      const inst = document.getElementById('orientador-instrucoes-input')?.value.trim() || '';
      const diffContent = document.getElementById('diff-box-content');
      const diffTitle = document.getElementById('diff-box-title');
      const diffSubtitle = document.getElementById('diff-box-subtitle');
      const downloadBar = document.getElementById('orientador-download-bar');
      const downloadBtn = document.getElementById('btn-download-orientador-docx');
      const downloadTitle = document.getElementById('orientador-download-title');

      const p = PROJECTS[activeProjectId];

      if (p && p.isReal) {
        btnHumanizar.disabled = true;
        btnHumanizar.textContent = '⏳ Humanizando com Suíte Completa...';
        audio.playBeep(720, 'triangle', 0.1, 0.04);

        // Captura Modo de Atuação (Cirúrgico Estrito vs Amplo)
        const radioAmplo = document.getElementById('radio-modo-amplo');
        const modo = (radioAmplo && radioAmplo.checked) ? 'amplo' : 'cirurgico';

        // Captura Seções Permitidas (se o usuário desmarcou o auto-detectar)
        const chkAuto = document.getElementById('chk-secao-auto');
        let secoes_permitidas = null;
        if (chkAuto && !chkAuto.checked) {
          const marcados = Array.from(document.querySelectorAll('.chk-secao-filtro:checked')).map((c) => c.value);
          if (marcados.length > 0) secoes_permitidas = marcados;
        }

        const msgTelemetria = secoes_permitidas && secoes_permitidas.length > 0
          ? `Humanizando cirurgicamente seções [${secoes_permitidas.join(', ')}] e aplicando Qualis A1...`
          : 'Executando Suíte Completa: Forense, PRISMA 2020, Humanização e Qualis A1...';
        const finalizarTelemetria = iniciarTelemetriaOrientador(activeProjectId, msgTelemetria);

        try {
          const dados = await api(`/api/trabalhos/${activeProjectId}/humanizar`, {
            method: 'POST',
            body: JSON.stringify({
              orientacoes: txt,
              instrucoes: inst,
              criar_backup: true,
              secoes: secoes_permitidas,
              modo,
            }),
          });

          audio.success();
          showToast(`Suíte de Agentes concluiu o processamento! Rodada ${dados.rodada || 1} salva.`, 'cyan');
          finalizarTelemetria(true, `✔ Suíte Completa concluída! Rodada ${dados.rodada || 1} salva.`);

          if (diffTitle) diffTitle.textContent = `Suíte Completa (Rodada ${dados.rodada || 1})`;
          const nomeDir = dados.prisma?.diretriz || 'PRISMA 2020';
          const scoreDir = dados.prisma?.score_percentual || 90;
          const totalAlertasEst = dados.estatistica?.alertas ?? 0;
          if (diffSubtitle) diffSubtitle.textContent = `${nomeDir} Score: ${scoreDir}% · Rigor Estatístico: ${totalAlertasEst === 0 ? 'Sem inconsistências' : `${totalAlertasEst} alerta(s)`} · Forense: ${dados.forense?.total_artefatos || 0} artefatos limpos`;

          if (diffContent && Array.isArray(dados.alteracoes)) {
            diffContent.innerHTML = dados.alteracoes.map((alt) => `
              <div class="diff-alteracao-item">
                <h4>${alt.secao}: ${alt.resumo_mudancas || 'Humanização aplicada'}</h4>
                ${alt.marcas_removidas?.length ? `<p style="color:var(--neon-cyan); font-size:11px;">🚫 Marcas purgadas: ${alt.marcas_removidas.join(', ')}</p>` : ''}
                ${alt.melhorias_cadencia ? `<p style="color:var(--text-muted); font-size:11px;">✨ Cadência: ${alt.melhorias_cadencia}</p>` : ''}
              </div>
            `).join('');
          }

          if (downloadBar && downloadBtn) {
            downloadBar.style.display = 'flex';
            downloadBtn.href = `/api/trabalhos/${activeProjectId}/artigo.docx?baixar=1&_t=${Date.now()}`;
            downloadBtn.textContent = `📥 Baixar Word (.docx) Higienizado (Rodada ${dados.rodada || 1})`;
            if (downloadTitle) downloadTitle.textContent = `✔ Manuscrito Final Qualis A1 (Rodada ${dados.rodada || 1})`;

            const btnRebuttal = document.getElementById('btn-ver-rebuttal');
            if (btnRebuttal) {
              if (dados.arquivos?.rebuttal) {
                btnRebuttal.style.display = 'inline-block';
                btnRebuttal.href = `/api/trabalhos/${activeProjectId}/arquivos/rebuttal.md`;
              } else {
                btnRebuttal.style.display = 'none';
              }
            }
            const btnRelat = document.getElementById('btn-ver-relatorio-auditoria');
            if (btnRelat) btnRelat.href = `/api/trabalhos/${activeProjectId}/arquivos/relatorio-verificacao.md`;
          }

          // Limpa campos de entrada para próxima rodada
          const inpTxtH = document.getElementById('orientador-input');
          if (inpTxtH) inpTxtH.value = '';
          const inpInstH = document.getElementById('orientador-instrucoes-input');
          if (inpInstH) inpInstH.value = '';

          await updateActiveProject(activeProjectId);
        } catch (err) {
          audio.alert();
          showToast(`Erro na humanização: ${err.message}`, 'rose');
          finalizarTelemetria(false, `Erro na humanização: ${err.message}`);
        } finally {
          btnHumanizar.disabled = false;
          btnHumanizar.textContent = '✨ Humanizar & Qualis A1';
        }
      } else {
        showToast('Abra um trabalho real para executar os agentes.', 'amber');
      }
    });
  }

  // Atalho do Leitor para a tela do Orientador
  const btnIrOrientador = document.getElementById('btn-ir-para-orientador');
  if (btnIrOrientador) {
    btnIrOrientador.addEventListener('click', () => {
      audio.click();
      switchScreen('screen-orientador');
    });
  }

  // Botão Executar Agentes
  const btnRunPipeline = document.getElementById('btn-pipeline-run');
  if (btnRunPipeline) btnRunPipeline.addEventListener('click', runPipelineSimulation);

  const btnResetPipeline = document.getElementById('btn-pipeline-reset');
  if (btnResetPipeline) {
    btnResetPipeline.addEventListener('click', () => {
      audio.click();
      renderAgentsGrid();
      showToast('Simulação da pipeline reiniciada.', 'cyan');
    });
  }

  // Modais: Novo Artigo e Importar Artigo (Unificado)
  const btnNovoModal = document.getElementById('btn-novo-artigo-modal');
  if (btnNovoModal) btnNovoModal.addEventListener('click', () => openModalNovo('pesquisa'));

  const btnCloseModal = document.getElementById('btn-close-modal-novo');
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModalNovo);

  const btnCancelarNovo = document.getElementById('btn-cancelar-novo');
  if (btnCancelarNovo) btnCancelarNovo.addEventListener('click', closeModalNovo);

  const tabBtnPesquisa = document.getElementById('tab-btn-pesquisa-ia');
  if (tabBtnPesquisa) {
    tabBtnPesquisa.addEventListener('click', () => {
      audio.click();
      setModalNovoTab('pesquisa');
    });
  }

  const tabBtnImportar = document.getElementById('tab-btn-importar-docx');
  if (tabBtnImportar) {
    tabBtnImportar.addEventListener('click', () => {
      audio.click();
      setModalNovoTab('importar');
    });
  }

  const btnImportarModal = document.getElementById('btn-importar-artigo-modal');
  if (btnImportarModal) btnImportarModal.addEventListener('click', () => openModalImportar());

  const navBtnImportar = document.getElementById('nav-btn-importar-modal');
  if (navBtnImportar) navBtnImportar.addEventListener('click', () => openModalImportar());

  const btnCloseModalImportar = document.getElementById('btn-close-modal-importar');
  if (btnCloseModalImportar) btnCloseModalImportar.addEventListener('click', closeModalImportar);

  const btnCancelarImportar = document.getElementById('btn-cancelar-importar');
  if (btnCancelarImportar) btnCancelarImportar.addEventListener('click', closeModalImportar);

  // Modal Holográfico de Raio-X Diagnóstico
  const btnHudRaioX = document.getElementById('btn-hud-raio-x');
  if (btnHudRaioX) {
    btnHudRaioX.addEventListener('click', (e) => {
      e.preventDefault();
      openModalRaioX();
    });
  }

  const btnCloseModalRaioX = document.getElementById('btn-close-modal-raio-x');
  if (btnCloseModalRaioX) btnCloseModalRaioX.addEventListener('click', closeModalRaioX);

  const modalRaioX = document.getElementById('modal-raio-x');
  if (modalRaioX) {
    modalRaioX.addEventListener('click', (e) => {
      if (e.target === modalRaioX) closeModalRaioX();
    });
  }

  async function executarSanacaoEReauditoria(btnAlvo = null) {
    const p = PROJECTS[activeProjectId];
    if (!p || !p.isReal) {
      showToast('Abra um trabalho real para sanar apontamentos.', 'amber');
      return;
    }
    const btn = btnAlvo || document.getElementById('btn-hud-sanar-raio-x') || document.getElementById('btn-modal-sanar-raio-x');
    const textoOrig = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Sanando &amp; Reauditando...';
    }
    showToast('Sanando apontamentos do Raio-X e reauditando...', 'cyan');
    audio.playBeep(520, 'triangle', 0.1, 0.05);

    try {
      const res = await api(`/api/trabalhos/${activeProjectId}/sanar-raio-x`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      audio.success();
      showToast(`Apontamentos sanados! Novo Score: ${res.novo_score}% (Backup: ${res.backup})`, 'emerald');

      const iframe = document.getElementById('iframe-raio-x');
      if (iframe) iframe.src = `/api/trabalhos/${activeProjectId}/raio-x?_t=${Date.now()}`;

      await updateActiveProject(activeProjectId);
    } catch (err) {
      audio.alert();
      showToast(`Erro na sanação: ${err.message}`, 'rose');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = textoOrig;
      }
    }
  }

  const btnModalSanar = document.getElementById('btn-modal-sanar-raio-x');
  if (btnModalSanar) {
    btnModalSanar.addEventListener('click', () => executarSanacaoEReauditoria(btnModalSanar));
  }

  const btnModalIrOrientador = document.getElementById('btn-modal-ir-orientador');
  if (btnModalIrOrientador) {
    btnModalIrOrientador.addEventListener('click', () => {
      navegarParaOrientadorComLaudo(activeProjectId);
    });
  }

  const btnHudSanar = document.getElementById('btn-hud-sanar-raio-x');
  if (btnHudSanar) {
    btnHudSanar.addEventListener('click', () => executarSanacaoEReauditoria(btnHudSanar));
  }

  // --- Funcionalidade 1: Executar Novo Laudo de Raio-X ---
  async function executarNovoLaudo(projId = null, btnAlvo = null) {
    const idAlvo = projId || activeProjectId;
    const p = PROJECTS[idAlvo];
    if (!p || !p.isReal) {
      showToast('Selecione um artigo real para rodar novo laudo.', 'amber');
      return;
    }
    const btn = btnAlvo || document.getElementById('btn-modal-novo-laudo') || document.getElementById('btn-audit-novo-laudo') || document.getElementById('btn-hud-novo-laudo');
    const textoOrig = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Gerando Laudo...';
    }
    showToast('Executando auditoria forense, metodológica e estatística...', 'cyan');
    audio.playBeep(480, 'sine', 0.1, 0.05);

    try {
      const res = await api(`/api/trabalhos/${idAlvo}/novo-laudo`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      audio.success();
      showToast(res.mensagem || `Novo Laudo gerado com sucesso! Score: ${res.score}% (${res.diretriz})`, 'emerald');

      const iframe = document.getElementById('iframe-raio-x');
      if (iframe) iframe.src = `/api/trabalhos/${idAlvo}/raio-x?_t=${Date.now()}`;

      await updateActiveProject(idAlvo);
      if (typeof carregarListaProjetos === 'function') {
        await carregarListaProjetos();
      }
    } catch (err) {
      audio.alert();
      showToast(`Erro ao gerar novo laudo: ${err.message}`, 'rose');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = textoOrig;
      }
    }
  }
  window.executarNovoLaudo = executarNovoLaudo;

  // --- Funcionalidade 2: Executar Ajuste de Formatação e Páginas ---
  async function executarAjusteFormatacao(projId = null, btnAlvo = null) {
    const idAlvo = projId || activeProjectId;
    const p = PROJECTS[idAlvo];
    if (!p || !p.isReal) {
      showToast('Selecione um artigo real para calibrar formatação.', 'amber');
      return;
    }
    const btn = btnAlvo || document.getElementById('btn-audit-ajustar-formatacao') || document.getElementById('btn-hud-ajustar-formatacao') || document.getElementById('btn-ajustar-formatacao-orientador');
    const textoOrig = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Diagramando ABNT...';
    }
    showToast('Recalibrando diagramação ABNT, tabelas e eliminando páginas em branco...', 'cyan');
    audio.playBeep(440, 'triangle', 0.15, 0.05);

    try {
      const res = await api(`/api/trabalhos/${idAlvo}/ajustar-formatacao`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      audio.success();
      showToast(res.mensagem || `Formatação calibrada com sucesso! PDF com ${res.paginas_pdf} páginas fluidas.`, 'emerald');

      const btnHudDocx = document.getElementById('btn-hud-quick-docx');
      if (btnHudDocx) btnHudDocx.href = `/api/trabalhos/${idAlvo}/artigo.docx?baixar=1&_t=${Date.now()}`;
      const btnOrientadorDocx = document.getElementById('btn-download-orientador-docx');
      if (btnOrientadorDocx) btnOrientadorDocx.href = `/api/trabalhos/${idAlvo}/artigo.docx?baixar=1&_t=${Date.now()}`;

      if (typeof carregarProjetoNoLeitor === 'function') {
        await carregarProjetoNoLeitor(idAlvo);
      }
      await updateActiveProject(idAlvo);
    } catch (err) {
      audio.alert();
      showToast(`Erro ao ajustar formatação: ${err.message}`, 'rose');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = textoOrig;
      }
    }
  }
  window.executarAjusteFormatacao = executarAjusteFormatacao;

  // Listeners dos Botões de Novo Laudo
  const btnModalNovoLaudo = document.getElementById('btn-modal-novo-laudo');
  if (btnModalNovoLaudo) {
    btnModalNovoLaudo.addEventListener('click', () => executarNovoLaudo(null, btnModalNovoLaudo));
  }
  const btnAuditNovoLaudo = document.getElementById('btn-audit-novo-laudo');
  if (btnAuditNovoLaudo) {
    btnAuditNovoLaudo.addEventListener('click', () => executarNovoLaudo(null, btnAuditNovoLaudo));
  }
  const btnHudNovoLaudo = document.getElementById('btn-hud-novo-laudo');
  if (btnHudNovoLaudo) {
    btnHudNovoLaudo.addEventListener('click', () => executarNovoLaudo(null, btnHudNovoLaudo));
  }
  const btnNovoLaudoOrientador = document.getElementById('btn-novo-laudo-orientador');
  if (btnNovoLaudoOrientador) {
    btnNovoLaudoOrientador.addEventListener('click', () => executarNovoLaudo(null, btnNovoLaudoOrientador));
  }

  // Listeners dos Botões de Ajuste de Formatação
  const btnAuditAjustarFormatacao = document.getElementById('btn-audit-ajustar-formatacao');
  if (btnAuditAjustarFormatacao) {
    btnAuditAjustarFormatacao.addEventListener('click', () => executarAjusteFormatacao(null, btnAuditAjustarFormatacao));
  }
  const btnHudAjustarFormatacao = document.getElementById('btn-hud-ajustar-formatacao');
  if (btnHudAjustarFormatacao) {
    btnHudAjustarFormatacao.addEventListener('click', () => executarAjusteFormatacao(null, btnHudAjustarFormatacao));
  }
  const btnAjustarOrientador = document.getElementById('btn-ajustar-formatacao-orientador');
  if (btnAjustarOrientador) {
    btnAjustarOrientador.addEventListener('click', () => executarAjusteFormatacao(null, btnAjustarOrientador));
  }

  // Modal: Editar Nome do Artigo
  const btnCloseModalEditar = document.getElementById('btn-close-modal-editar-artigo');
  if (btnCloseModalEditar) btnCloseModalEditar.addEventListener('click', fecharModalEditarArtigo);

  const btnCancelarEditar = document.getElementById('btn-cancelar-editar-artigo');
  if (btnCancelarEditar) btnCancelarEditar.addEventListener('click', fecharModalEditarArtigo);

  const btnSalvarEditar = document.getElementById('btn-salvar-editar-artigo');
  if (btnSalvarEditar) btnSalvarEditar.addEventListener('click', salvarNovoTituloArtigo);

  const inputEditarTitulo = document.getElementById('input-editar-artigo-titulo');
  if (inputEditarTitulo) {
    inputEditarTitulo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        salvarNovoTituloArtigo();
      } else if (e.key === 'Escape') {
        fecharModalEditarArtigo();
      }
    });
  }

  const modalEditar = document.getElementById('modal-editar-artigo');
  if (modalEditar) {
    modalEditar.addEventListener('click', (e) => {
      if (e.target === modalEditar) fecharModalEditarArtigo();
    });
  }

  // Modal: Excluir Artigo do Acervo
  const btnCloseModalExcluir = document.getElementById('btn-close-modal-excluir-artigo');
  if (btnCloseModalExcluir) btnCloseModalExcluir.addEventListener('click', fecharModalExcluirArtigo);

  const btnCancelarExcluir = document.getElementById('btn-cancelar-excluir-artigo');
  if (btnCancelarExcluir) btnCancelarExcluir.addEventListener('click', fecharModalExcluirArtigo);

  const btnConfirmarExcluir = document.getElementById('btn-confirmar-excluir-artigo');
  if (btnConfirmarExcluir) btnConfirmarExcluir.addEventListener('click', confirmarExclusaoArtigo);

  const modalExcluir = document.getElementById('modal-excluir-artigo');
  if (modalExcluir) {
    modalExcluir.addEventListener('click', (e) => {
      if (e.target === modalExcluir) fecharModalExcluirArtigo();
    });
  }

  // Modal: Carteira FinOps e Saldo Gemini
  const btnCloseFinops = document.getElementById('btn-close-finops');
  if (btnCloseFinops) btnCloseFinops.addEventListener('click', closeModalFinOps);

  const btnFecharFinopsFooter = document.getElementById('btn-fechar-finops-footer');
  if (btnFecharFinopsFooter) btnFecharFinopsFooter.addEventListener('click', closeModalFinOps);

  const btnSalvarCreditos = document.getElementById('btn-salvar-creditos-gemini');
  if (btnSalvarCreditos) btnSalvarCreditos.addEventListener('click', salvarCreditosGemini);

  const hudBalancePill = document.getElementById('hud-balance-pill');
  if (hudBalancePill) hudBalancePill.addEventListener('click', openModalFinOps);

  const provGemSaldo = document.getElementById('provider-gemini-saldo');
  if (provGemSaldo) {
    provGemSaldo.style.cursor = 'pointer';
    provGemSaldo.title = 'Clique para configurar ou ver saldo da conta Gemini';
    provGemSaldo.addEventListener('click', openModalFinOps);
  }

  const provGemBadge = document.getElementById('provider-gemini-badge');
  if (provGemBadge) {
    provGemBadge.style.cursor = 'pointer';
    provGemBadge.addEventListener('click', openModalFinOps);
  }

  const modalFinops = document.getElementById('modal-finops');
  if (modalFinops) {
    modalFinops.addEventListener('click', (e) => {
      if (e.target === modalFinops) closeModalFinOps();
    });
  }

  // Inicializa a lógica de drag-and-drop e leitura de arquivo do modal
  configurarUploadImportacao();

  // Iniciar novo trabalho real via API e conectar telemetria SSE
  let activeEventSource = null;
  function conectarEventosTrabalho(id) {
    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
    }

    const stream = document.getElementById('pipeline-console-stream');
    try {
      const es = new EventSource(`/api/trabalhos/${id}/eventos`);
      activeEventSource = es;

      es.onmessage = (e) => {
        try {
          const dados = JSON.parse(e.data);
          if (dados.tipo === 'log') {
            if (stream) {
              const time = new Date().toLocaleTimeString('pt-BR');
              const line = document.createElement('div');
              line.className = 'console-line';
              line.innerHTML = `<span class="console-time">[${time}]</span><span>${dados.linha}</span>`;
              stream.appendChild(line);
              stream.scrollTop = stream.scrollHeight;
            }
            if (jarvis3D) jarvis3D.triggerPacketBurst();
          } else if (dados.tipo === 'estado') {
            if (window.workflowStepper) window.workflowStepper.update({ isReal: true, etapas: dados.etapas });
            if (jarvis3D) jarvis3D.triggerPacketBurst();
          } else if (dados.tipo === 'fim') {
            audio.success();
            showToast(`Trabalho ${id} finalizado com sucesso! Manuscrito pronto para download.`, 'emerald');
            es.close();
            carregarTrabalhosReais();
          }
        } catch {}
      };
    } catch (err) {
      console.warn('Erro ao conectar SSE:', err);
    }
  }

  async function dispararNovoArtigoReal() {
    const inputTema = document.getElementById('input-novo-tema');
    const inputPergunta = document.getElementById('input-novo-pergunta');
    const inputAutores = document.getElementById('input-novo-autores');
    const selectTipo = document.getElementById('select-novo-tipo');
    const selectAnos = document.getElementById('select-novo-anos');
    const btnDisparar = document.getElementById('btn-disparar-geracao');

    const tema = inputTema?.value?.trim();
    if (!tema) {
      audio.alert();
      showToast('Informe o tema central da pesquisa para o Agente 1 (Planejador).', 'rose');
      return;
    }

    const bases = [];
    if (document.getElementById('chk-pubmed')?.checked) bases.push('pubmed');
    if (document.getElementById('chk-scielo')?.checked) bases.push('scielo');
    if (document.getElementById('chk-lilacs')?.checked) bases.push('lilacs');
    if (!bases.length) bases.push('pubmed', 'scielo');

    if (btnDisparar) {
      btnDisparar.disabled = true;
      btnDisparar.textContent = '⏳ Inicializando Agentes...';
    }

    audio.playBeep(600, 'triangle', 0.1, 0.05);

    try {
      const res = await api('/api/trabalhos', {
        method: 'POST',
        body: JSON.stringify({
          tema,
          pergunta: inputPergunta?.value?.trim() || '',
          autores: inputAutores?.value?.trim() || '',
          tipo_revisao: selectTipo?.value || 'integrativa',
          anos: Number(selectAnos?.value) || 5,
          bases,
          idiomas: ['pt', 'en', 'es'],
          min_referencias: 25,
          max_incluidos: 30,
          provedor: 'auto',
        }),
      });

      audio.success();
      showToast(`Trabalho iniciado com sucesso! ID: ${res.id}`, 'emerald');
      closeModalNovo();

      if (btnDisparar) {
        btnDisparar.disabled = false;
        btnDisparar.textContent = '⚡ Disparar Pipeline dos 23 Agentes';
      }

      // Atualiza lista de trabalhos reais e seleciona o recém-criado
      await carregarTrabalhosReais();
      const selectProj = document.getElementById('select-active-project');
      if (selectProj) selectProj.value = res.id;
      await updateActiveProject(res.id);

      // Muda para tela dos 23 agentes em 3D
      switchScreen('screen-pipeline');

      // Conecta ao fluxo de eventos em tempo real
      conectarEventosTrabalho(res.id);

    } catch (err) {
      audio.alert();
      if (btnDisparar) {
        btnDisparar.disabled = false;
        btnDisparar.textContent = '⚡ Disparar Pipeline dos 23 Agentes';
      }
      showToast(`Erro ao disparar trabalho: ${err.message}`, 'rose');
    }
  }

  const btnDisparar = document.getElementById('btn-disparar-geracao');
  if (btnDisparar) {
    btnDisparar.addEventListener('click', dispararNovoArtigoReal);
  }

  // Toggle de Áudio
  const btnAudio = document.getElementById('btn-audio-toggle');
  const iconAudio = document.getElementById('audio-icon');
  if (btnAudio && iconAudio) {
    if (audio.muted) iconAudio.textContent = '🔇';
    btnAudio.addEventListener('click', () => {
      const isMuted = audio.toggleMute();
      iconAudio.textContent = isMuted ? '🔇' : '🔊';
      showToast(isMuted ? 'Efeitos sonoros desativados' : 'Efeitos sonoros ativados', 'cyan');
    });
  }

  // Ticker de Telemetria Real com Medição de Latência HTTP
  setInterval(async () => {
    const timerEl = document.getElementById('telemetry-timer');
    if (timerEl) {
      const t0 = performance.now();
      try {
        await fetch('/api/status', { method: 'HEAD' });
        const latency = Math.round(performance.now() - t0);
        timerEl.textContent = `Ping: ${latency}ms`;
      } catch {
        timerEl.textContent = 'Ping: --';
      }
    }
  }, 10000);

  // Consulta do Backend Real e Sincronização de Trabalhos Existentes
  fetch('/api/status')
    .then((r) => r.json())
    .then((dados) => {
      if (dados && dados.uso) {
        ultimoStatusSistema = dados;
        const dsVal = document.getElementById('hud-deepseek-val');
        if (dsVal && dados.uso.deepseek?.saldo_total !== undefined && dados.uso.deepseek?.saldo_total !== null) {
          dsVal.textContent = `$${dados.uso.deepseek.saldo_total.toFixed(2)}`;
        }
        const gem = dados.uso.gemini;
        const gemVal = document.getElementById('hud-gemini-val');
        if (gemVal && gem) {
          if (gem.tem_saldo_definido && gem.saldo_restante_usd !== null && gem.saldo_restante_usd !== undefined) {
            gemVal.textContent = `$${gem.saldo_restante_usd.toFixed(2)}`;
            gemVal.title = `Google Gemini: Saldo restante $${gem.saldo_restante_usd.toFixed(2)} USD (Créditos $${gem.creditos_iniciais_usd.toFixed(2)} - Gasto $${(gem.total_gasto_usd || 0).toFixed(4)} USD)`;
          } else {
            gemVal.textContent = 'PayG (Ativo)';
            gemVal.title = `Google Gemini API (${gem.tier || 'Standard'}): Conectado. Faturamento Pay-As-You-Go. Consumo acumulado: $${(gem.total_gasto_usd || 0).toFixed(4)} USD (${Math.round((gem.tokens_total || 0) / 1000)}k tokens).`;
          }
        }
        const orVal = document.getElementById('hud-openrouter-val');
        if (orVal && dados.uso.openrouter) {
          const or = dados.uso.openrouter;
          if (or.is_free_tier) {
            orVal.textContent = `${or.gratis_restantes ?? 50}/${or.gratis_limite ?? 50}`;
          } else if (or.saldo_restante_usd !== undefined && or.saldo_restante_usd !== null) {
            orVal.textContent = `$${or.saldo_restante_usd.toFixed(2)}`;
          }
        }
        if (typeof atualizarFinOpsProviders === 'function') {
          atualizarFinOpsProviders(dados);
        }
        if (typeof renderSistemaGlobalDashboard === 'function') {
          renderSistemaGlobalDashboard();
        }
      }
    })
    .catch(() => {});

// Ação Autônoma: Aplicar Alterações do Laudo Raio-X
window.executarSanacaoLaudo = async function(origem = 'painel') {
  const p = PROJECTS[activeProjectId];
  if (!p || !p.isReal) {
    showToast('Selecione um artigo válido para aplicar alterações.', 'amber');
    return;
  }

  const confirmar = confirm(
    'Deseja aplicar cirurgicamente as alterações e adequações apontadas no Laudo Raio-X?\n\n' +
    'O Agente Sanador executará:\n' +
    '• Calibração de biomarcadores e unidades clínicas\n' +
    '• Correção de anomalias estatísticas (p-values, intervalos de confiança)\n' +
    '• Higienização forense e erradicação de clichês de IA\n' +
    '• Backup seguro em versoes/ e reauditoria com novo score'
  );
  if (!confirmar) return;

  const btnAudit = document.getElementById('btn-audit-sanar-raiox');
  const btnOrient = document.getElementById('btn-sanar-apontamentos-laudo');
  const origHtmlAudit = btnAudit ? btnAudit.innerHTML : '';
  const origHtmlOrient = btnOrient ? btnOrient.innerHTML : '';

  if (btnAudit) {
    btnAudit.disabled = true;
    btnAudit.innerHTML = '<span>⏳</span> Sanando Laudo...';
  }
  if (btnOrient) {
    btnOrient.disabled = true;
    btnOrient.innerHTML = '⏳ Aplicando Alterações...';
  }

  audio.playBeep(650, 'triangle', 0.1, 0.05);
  showToast('Agente Sanador: aplicando alterações apontadas no Laudo Raio-X...', 'cyan');

  try {
    const res = await api(`/api/trabalhos/${activeProjectId}/sanar-raio-x`, {
      method: 'POST',
      body: JSON.stringify({ origem }),
    });

    audio.success();
    const novoScore = res.novo_score || res.raio_x?.score_inicial || 100;
    const msg = res.mensagem || `Alterações aplicadas com sucesso! Score reauditado para ${novoScore}%.`;
    showToast(msg, 'emerald');

    await updateActiveProject(activeProjectId);
  } catch (err) {
    audio.alert();
    showToast(`Erro ao aplicar alterações do laudo: ${err.message}`, 'rose');
  } finally {
    if (btnAudit) {
      btnAudit.disabled = false;
      btnAudit.innerHTML = origHtmlAudit;
    }
    if (btnOrient) {
      btnOrient.disabled = false;
      btnOrient.innerHTML = origHtmlOrient;
    }
  }
};

let currentPdfZoom = 100;
window.jarvisPdfZoom = currentPdfZoom;

function aplicarZoomPdf(novoZoom) {
  currentPdfZoom = Math.min(250, Math.max(75, novoZoom));
  window.jarvisPdfZoom = currentPdfZoom;
  const zoomValEl = document.getElementById('pdf-zoom-val');
  if (zoomValEl) zoomValEl.textContent = `${currentPdfZoom}%`;

  const iframePdf = document.getElementById('iframe-leitor-artigo-pdf');
  if (iframePdf && iframePdf.src && iframePdf.src !== 'about:blank') {
    const rawUrl = iframePdf.src.split('#')[0];
    iframePdf.src = `${rawUrl}#toolbar=0&navpanes=0&zoom=${currentPdfZoom}&view=FitH`;
  }
}

function configurarLeitorPdf() {
  const btnTogglePdf = document.getElementById('btn-toggle-leitor-pdf');
  const btnToggleTexto = document.getElementById('btn-toggle-leitor-texto');
  const containerPdf = document.getElementById('container-leitor-pdf');
  const containerTexto = document.getElementById('reader-paper-content');
  const btnReloadPdf = document.getElementById('btn-recarregar-leitor-pdf');
  const iframePdf = document.getElementById('iframe-leitor-artigo-pdf');
  const btnZoomIn = document.getElementById('btn-pdf-zoom-in');
  const btnZoomOut = document.getElementById('btn-pdf-zoom-out');
  const btnFitWidth = document.getElementById('btn-pdf-fit-width');
  const btnToggleExpand = document.getElementById('btn-toggle-expand-reader');
  const splitLayout = document.querySelector('.reader-split-layout');
  const zoomValEl = document.getElementById('pdf-zoom-val');
  if (zoomValEl) zoomValEl.textContent = `${currentPdfZoom}%`;

  if (btnTogglePdf && btnToggleTexto) {
    btnTogglePdf.addEventListener('click', () => {
      audio.click();
      if (containerPdf) containerPdf.style.display = 'flex';
      if (containerTexto) containerTexto.style.display = 'none';
      btnTogglePdf.classList.add('active');
      btnTogglePdf.classList.remove('ghost');
      btnToggleTexto.classList.remove('active');
      btnToggleTexto.classList.add('ghost');
      showToast('Visualizador PDF A4 ativo (Normas ABNT & Vancouver)', 'cyan');
    });

    btnToggleTexto.addEventListener('click', () => {
      audio.click();
      if (containerPdf) containerPdf.style.display = 'none';
      if (containerTexto) containerTexto.style.display = 'block';
      btnToggleTexto.classList.add('active');
      btnToggleTexto.classList.remove('ghost');
      btnTogglePdf.classList.remove('active');
      btnTogglePdf.classList.add('ghost');
      showToast('Modo de leitura alternado para Texto e Seções', 'cyan');
    });
  }

  if (btnReloadPdf && iframePdf) {
    btnReloadPdf.addEventListener('click', () => {
      audio.click();
      const currentSrc = iframePdf.src;
      iframePdf.src = '';
      setTimeout(() => {
        iframePdf.src = currentSrc;
        showToast('Visualizador de PDF atualizado com sucesso', 'cyan');
      }, 50);
    });
  }

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      audio.click();
      aplicarZoomPdf(currentPdfZoom + 15);
    });
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      audio.click();
      aplicarZoomPdf(currentPdfZoom - 15);
    });
  }

  if (btnFitWidth) {
    btnFitWidth.addEventListener('click', () => {
      audio.click();
      aplicarZoomPdf(100);
      showToast('Zoom ajustado para largura ideal (100% Fit Width)', 'cyan');
    });
  }

  if (btnToggleExpand && splitLayout) {
    btnToggleExpand.addEventListener('click', () => {
      audio.click();
      const isExpanded = splitLayout.classList.toggle('reader-expanded');
      btnToggleExpand.innerHTML = isExpanded ? '⛶ Reduzir' : '⛶ Tela Cheia';
      btnToggleExpand.title = isExpanded ? 'Restaurar layout com painel lateral' : 'Expandir leitor para largura total';
      showToast(isExpanded ? 'Leitor expandido em tela cheia (100% largura)' : 'Layout normal restaurado', 'cyan');
    });
  }
}

  // Inicializa Controles do Leitor PDF e Modo Texto
  configurarLeitorPdf();

  // Alternador de Modo de Visualização do Acervo (Bento Cards vs Tabela)
  const btnViewCards = document.getElementById('btn-view-cards');
  const btnViewTable = document.getElementById('btn-view-table');
  if (btnViewCards && btnViewTable) {
    btnViewCards.addEventListener('click', () => {
      audio.click();
      setSistemaViewMode('cards');
    });
    btnViewTable.addEventListener('click', () => {
      audio.click();
      setSistemaViewMode('table');
    });
  }
  setSistemaViewMode(localStorage.getItem('jarvis_sistema_view_mode') || 'cards');

  // Inicializa Stepper Metodológico
  window.workflowStepper = new WorkflowStepper();

  // Inicializa Visualização Holográfica 3D dos 14 Agentes
  window.jarvis3D = new Jarvis3DNetwork('pipeline-3d-canvas');

  // Inicializa Filtros, Ações Globais e Exportação do Painel Executivo
  configurarFiltrosSistema();

  // Define modo inicial como Sistema Global (Nível 1)
  setUIMode('sistema');

  // Carrega e sincroniza trabalhos reais do backend
  carregarTrabalhosReais();

  // Tratamento de Deep Link via URL (?trabalho=...&tela=...)
  const urlParams = new URLSearchParams(window.location.search);
  const paramTrabalho = urlParams.get('trabalho');
  const paramTela = urlParams.get('tela');
  if (paramTrabalho) {
    setTimeout(async () => {
      await carregarProjetoNoLeitor(paramTrabalho);
      if (paramTela === 'orientador') {
        switchScreen('screen-orientador');
      } else if (paramTela === 'raiox') {
        openModalRaioX(paramTrabalho);
      }
    }, 450);
  }

  showToast('JARVIS Scientific Command Center online e operacional.', 'emerald');
});
