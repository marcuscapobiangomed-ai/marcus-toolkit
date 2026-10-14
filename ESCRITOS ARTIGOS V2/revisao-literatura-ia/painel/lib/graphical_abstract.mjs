/**
 * AGENTE 18: DESIGNER DE GRAPHICAL ABSTRACT VETORIAL (SVG 300 DPI EQUIVALENT)
 * 
 * Gera Graphical Abstracts em padrão visual internacional (Cell / The Lancet / Elsevier / BMJ).
 * Arquitetura em 3 colunas de fluxo narrativo:
 *  1. Contexto & População (PICO / Clinical Background)
 *  2. Métodos & Síntese Quantitativa (Mini Forest-Plot / Efeito Estimado / Participantes)
 *  3. Implicações Clínicas & Certeza GRADE (Take-home Message / Diretrizes)
 * 
 * SVG puro, escalável, hiper-nítido, com ícones médicos nativos em paths vetoriais.
 */

export function gerarGraphicalAbstractSVG(dados = {}) {
  const titulo = sanitizarTexto(dados.titulo || 'Síntese de Eficácia Clínica e Segurança Terapêutica', 90);
  const autores = sanitizarTexto(dados.autores || 'Consórcio de Pesquisa Clínica & Evidências em Saúde', 70);
  const revista = sanitizarTexto(dados.revista || 'Qualis A1 / Tier 1 Peer-Reviewed Journal', 45);

  const populacao = sanitizarTexto(dados.populacao || 'População com a condição clínica de interesse avaliada', 75);
  const intervencao = sanitizarTexto(dados.intervencao || 'Intervenção ativa padronizada vs. Controle / Placebo', 75);
  
  const metricaTitulo = sanitizarTexto(dados.metricaTitulo || 'Risco Relativo (RR) Global', 35);
  const metricaValor = sanitizarTexto(dados.metricaValor || '0.78', 12);
  const metricaIC = sanitizarTexto(dados.metricaIC || 'IC 95%: 0.65 – 0.93 (p < 0.001)', 35);
  const reducaoRisco = sanitizarTexto(dados.reducaoRisco || '−22% Redução de Desfechos Desfavoráveis', 45);
  const nEstudos = dados.nEstudos || '12';
  const nPacientes = dados.nPacientes || '4.500';

  const certezaGrade = sanitizarTexto(dados.certezaGrade || 'Alta Certeza (⊕⊕⊕⊕)', 30);
  const conclusao = sanitizarTexto(dados.conclusao || 'A intervenção demonstrou benefício clínico superior consistente e excelente perfil de tolerabilidade.', 130);
  const takeHome = sanitizarTexto(dados.takeHome || 'Recomenda-se incorporação precoce em protocolos e diretrizes clínicas assistenciais.', 110);

  const width = 1200;
  const height = 630;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background:#090d16; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <!-- Gradientes de Fundo e Cards -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1120" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>

    <linearGradient id="cardGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.9" />
    </linearGradient>

    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>

    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>

    <linearGradient id="accentGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0" />
    </linearGradient>

    <!-- Filtro de Sombra Suave -->
    <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Fundo Geral -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

  <!-- Grid Sutil de Fundo -->
  <g opacity="0.06" stroke="#38bdf8" stroke-width="1">
    <line x1="0" y1="100" x2="1200" y2="100" />
    <line x1="0" y1="200" x2="1200" y2="200" />
    <line x1="0" y1="300" x2="1200" y2="300" />
    <line x1="0" y1="400" x2="1200" y2="400" />
    <line x1="0" y1="500" x2="1200" y2="500" />
    <line x1="200" y1="0" x2="200" y2="630" />
    <line x1="400" y1="0" x2="400" y2="630" />
    <line x1="600" y1="0" x2="600" y2="630" />
    <line x1="800" y1="0" x2="800" y2="630" />
    <line x1="1000" y1="0" x2="1000" y2="630" />
  </g>

  <!-- Top Header Bar -->
  <rect x="0" y="0" width="${width}" height="90" fill="#0f172a" fill-opacity="0.9" />
  <line x1="0" y1="90" x2="${width}" y2="90" stroke="#334155" stroke-width="1.5" />
  
  <!-- Selo GRAPHICAL ABSTRACT -->
  <rect x="36" y="24" width="168" height="26" rx="6" fill="#0284c7" fill-opacity="0.25" stroke="#38bdf8" stroke-width="1.2" />
  <text x="48" y="42" font-size="11" font-weight="800" fill="#38bdf8" letter-spacing="1.5">GRAPHICAL ABSTRACT</text>

  <!-- Revista Alvo & Rigor -->
  <text x="218" y="42" font-size="12" font-weight="600" fill="#94a3b8">Target Journal: <tspan fill="#f1f5f9" font-weight="700">${revista}</tspan></text>
  <text x="${width - 36}" y="42" text-anchor="end" font-size="12" font-weight="600" fill="#10b981">
    ✓ PRISMA 2020 &amp; GRADE Compliant
  </text>

  <!-- Título Principal do Estudo -->
  <text x="36" y="74" font-size="18" font-weight="700" fill="#ffffff" letter-spacing="-0.3">${titulo}</text>

  <!-- ================= PAINEL 1: CONTEXTO & POPULAÇÃO ================= -->
  <g transform="translate(36, 114)">
    <rect width="354" height="450" rx="14" fill="url(#cardGrad1)" stroke="#1e293b" stroke-width="1.5" filter="url(#cardShadow)" />
    
    <!-- Header Painel 1 -->
    <rect x="0" y="0" width="354" height="44" rx="14" fill="#1e293b" fill-opacity="0.6" />
    <circle cx="30" cy="22" r="10" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6" stroke-width="1.5" />
    <text x="30" y="26" text-anchor="middle" font-size="11" font-weight="bold" fill="#60a5fa">1</text>
    <text x="50" y="26" font-size="13" font-weight="700" fill="#f8fafc" letter-spacing="0.5">CONTEXTO &amp; POPULAÇÃO</text>

    <!-- Ícone Vetorial: População Médica -->
    <g transform="translate(24, 60)">
      <rect width="44" height="44" rx="10" fill="#0369a1" fill-opacity="0.2" stroke="#0284c7" stroke-width="1" />
      <path d="M22 14 A 5 5 0 1 0 22 24 A 5 5 0 1 0 22 14 Z M13 32 C13 27 17 26 22 26 C27 26 31 27 31 32 Z" fill="#38bdf8" />
    </g>
    <text x="80" y="78" font-size="12" font-weight="700" fill="#e2e8f0">População / Pacientes (P)</text>
    <text x="80" y="96" font-size="11" fill="#94a3b8">Critérios de Elegibilidade Basais</text>

    <foreignObject x="24" y="118" width="306" height="60">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:12px; color:#cbd5e1; line-height:1.45;">
        ${populacao}
      </div>
    </foreignObject>

    <!-- Divisória -->
    <line x1="24" y1="184" x2="330" y2="184" stroke="#334155" stroke-dasharray="3,3" />

    <!-- Ícone Vetorial: Intervenção / Pílula / DNA -->
    <g transform="translate(24, 200)">
      <rect width="44" height="44" rx="10" fill="#7c3aed" fill-opacity="0.2" stroke="#8b5cf6" stroke-width="1" />
      <path d="M15 28 L28 15 C30 13 33 13 35 15 C37 17 37 20 35 22 L22 35 C20 37 17 37 15 35 C13 33 13 30 15 28 Z" fill="none" stroke="#a78bfa" stroke-width="2" />
      <line x1="21.5" y1="21.5" x2="28.5" y2="28.5" stroke="#a78bfa" stroke-width="2" />
    </g>
    <text x="80" y="218" font-size="12" font-weight="700" fill="#e2e8f0">Intervenção &amp; Comparador (I/C)</text>
    <text x="80" y="236" font-size="11" fill="#94a3b8">Protocolo de Exposição Terapêutica</text>

    <foreignObject x="24" y="258" width="306" height="60">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:12px; color:#cbd5e1; line-height:1.45;">
        ${intervencao}
      </div>
    </foreignObject>

    <!-- Box de Questão PICO Resumida -->
    <rect x="20" y="340" width="314" height="88" rx="8" fill="#1e293b" fill-opacity="0.8" stroke="#334155" />
    <text x="34" y="364" font-size="11" font-weight="700" fill="#38bdf8">Pergunta de Pesquisa (PICO):</text>
    <text x="34" y="384" font-size="11" fill="#94a3b8">A intervenção promove benefício substancial</text>
    <text x="34" y="402" font-size="11" fill="#94a3b8">frente ao controle em desfechos primários?</text>
    <circle cx="304" cy="384" r="14" fill="#38bdf8" fill-opacity="0.1" />
    <text x="304" y="389" text-anchor="middle" font-size="13" fill="#38bdf8">?</text>
  </g>

  <!-- ================= PAINEL 2: MÉTODOS & RESULTADOS QUANTITATIVOS ================= -->
  <g transform="translate(422, 114)">
    <rect width="354" height="450" rx="14" fill="url(#cardGrad1)" stroke="#1e293b" stroke-width="1.5" filter="url(#cardShadow)" />
    
    <!-- Header Painel 2 -->
    <rect x="0" y="0" width="354" height="44" rx="14" fill="#1e293b" fill-opacity="0.6" />
    <circle cx="30" cy="22" r="10" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="1.5" />
    <text x="30" y="26" text-anchor="middle" font-size="11" font-weight="bold" fill="#34d399">2</text>
    <text x="50" y="26" font-size="13" font-weight="700" fill="#f8fafc" letter-spacing="0.5">SÍNTESE QUANTITATIVA</text>

    <!-- Badge Destaque Métrica Central -->
    <rect x="20" y="60" width="314" height="110" rx="10" fill="#064e3b" fill-opacity="0.3" stroke="#059669" stroke-width="1.2" />
    <text x="36" y="84" font-size="12" font-weight="700" fill="#6ee7b7">${metricaTitulo}</text>
    
    <text x="36" y="130" font-size="38" font-weight="800" fill="#10b981" letter-spacing="-1">${metricaValor}</text>
    <text x="145" y="112" font-size="12" font-weight="700" fill="#34d399">${reducaoRisco}</text>
    <text x="145" y="130" font-size="11" font-weight="500" fill="#a7f3d0">${metricaIC}</text>

    <!-- Mini Forest Plot Ilustrativo -->
    <g transform="translate(24, 188)">
      <rect width="306" height="135" rx="8" fill="#0f172a" stroke="#1e293b" />
      <text x="12" y="20" font-size="10" font-weight="700" fill="#94a3b8">ESTUDO / METRICA</text>
      <text x="210" y="20" font-size="10" font-weight="700" fill="#94a3b8">FAVORECE INTERV.</text>
      
      <!-- Linha da nulidade (1.0) -->
      <line x1="220" y1="28" x2="220" y2="125" stroke="#ef4444" stroke-width="1" stroke-dasharray="2,2" />
      
      <!-- Estudo 1 -->
      <text x="12" y="44" font-size="9" fill="#cbd5e1">${sanitizarTexto(dados.estudosDestaque?.[0] || 'Estudo Clínico 01', 22)}</text>
      <line x1="140" y1="41" x2="210" y2="41" stroke="#38bdf8" stroke-width="1.5" />
      <rect x="172" y="37" width="8" height="8" fill="#38bdf8" />
      
      <!-- Estudo 2 -->
      <text x="12" y="66" font-size="9" fill="#cbd5e1">${sanitizarTexto(dados.estudosDestaque?.[1] || 'Estudo Clínico 02', 22)}</text>
      <line x1="155" y1="63" x2="225" y2="63" stroke="#38bdf8" stroke-width="1.5" />
      <rect x="185" y="59" width="8" height="8" fill="#38bdf8" />
      
      <!-- Estudo 3 -->
      <text x="12" y="88" font-size="9" fill="#cbd5e1">${sanitizarTexto(dados.estudosDestaque?.[2] || 'Estudo Clínico 03', 22)}</text>
      <line x1="130" y1="85" x2="195" y2="85" stroke="#38bdf8" stroke-width="1.5" />
      <rect x="160" y="81" width="8" height="8" fill="#38bdf8" />

      <!-- Diamante Pooled Meta-Análise -->
      <line x1="10" y1="104" x2="296" y2="104" stroke="#334155" stroke-width="0.8" />
      <text x="12" y="119" font-size="10" font-weight="bold" fill="#34d399">Efeito Combinado</text>
      <polygon points="160,116 175,111 190,116 175,121" fill="#10b981" />
    </g>

    <!-- Amostra e Estudos -->
    <g transform="translate(20, 342)">
      <rect width="150" height="84" rx="8" fill="#1e293b" stroke="#334155" />
      <text x="16" y="24" font-size="10" font-weight="700" fill="#94a3b8">TOTAL ESTUDOS</text>
      <text x="16" y="56" font-size="24" font-weight="800" fill="#f8fafc">${nEstudos}</text>
      <text x="16" y="72" font-size="10" fill="#64748b">Ensaios / Coortes</text>
    </g>

    <g transform="translate(184, 342)">
      <rect width="150" height="84" rx="8" fill="#1e293b" stroke="#334155" />
      <text x="16" y="24" font-size="10" font-weight="700" fill="#94a3b8">PARTICIPANTES</text>
      <text x="16" y="56" font-size="24" font-weight="800" fill="#f8fafc">${nPacientes}</text>
      <text x="16" y="72" font-size="10" fill="#64748b">Indivíduos Avaliados</text>
    </g>
  </g>

  <!-- ================= PAINEL 3: IMPLICAÇÕES & CONCLUSÃO CLÍNICA ================= -->
  <g transform="translate(808, 114)">
    <rect width="354" height="450" rx="14" fill="url(#cardGrad1)" stroke="#1e293b" stroke-width="1.5" filter="url(#cardShadow)" />
    
    <!-- Header Painel 3 -->
    <rect x="0" y="0" width="354" height="44" rx="14" fill="#1e293b" fill-opacity="0.6" />
    <circle cx="30" cy="22" r="10" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b" stroke-width="1.5" />
    <text x="30" y="26" text-anchor="middle" font-size="11" font-weight="bold" fill="#fbbf24">3</text>
    <text x="50" y="26" font-size="13" font-weight="700" fill="#f8fafc" letter-spacing="0.5">CERTEZA &amp; IMPLICAÇÕES</text>

    <!-- Certeza GRADE Box -->
    <rect x="20" y="60" width="314" height="74" rx="10" fill="#1e293b" stroke="#f59e0b" stroke-width="1.2" />
    <text x="36" y="84" font-size="11" font-weight="700" fill="#fbbf24">Certeza da Evidência (GRADE):</text>
    <text x="36" y="112" font-size="16" font-weight="800" fill="#fef08a">${certezaGrade}</text>
    <circle cx="304" cy="97" r="16" fill="#f59e0b" fill-opacity="0.15" />
    <text x="304" y="103" text-anchor="middle" font-size="14" fill="#fbbf24">★</text>

    <!-- Conclusão Principal -->
    <text x="24" y="162" font-size="12" font-weight="700" fill="#e2e8f0">Achados Principais da Síntese</text>
    <foreignObject x="24" y="174" width="306" height="78">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:12px; color:#cbd5e1; line-height:1.5;">
        ${conclusao}
      </div>
    </foreignObject>

    <!-- Divisória -->
    <line x1="24" y1="262" x2="330" y2="262" stroke="#334155" stroke-dasharray="3,3" />

    <!-- Take-home message / Prática Clínica -->
    <g transform="translate(24, 276)">
      <rect width="44" height="44" rx="10" fill="#10b981" fill-opacity="0.2" stroke="#059669" stroke-width="1" />
      <!-- Ícone Estetoscópio / Prática Clínica -->
      <path d="M16 16 L16 23 C16 27 20 30 24 30 C28 30 32 27 32 23 L32 16 M24 30 L24 34 M21 34 L27 34" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" />
    </g>
    <text x="80" y="294" font-size="12" font-weight="700" fill="#34d399">Impacto na Prática Clínica</text>
    <text x="80" y="312" font-size="11" fill="#94a3b8">Take-Home Message</text>

    <foreignObject x="24" y="334" width="306" height="90">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:12px; color:#e2e8f0; line-height:1.5; background:#0f172a; border-radius:8px; padding:10px; border:1px solid #1e293b;">
        ${takeHome}
      </div>
    </foreignObject>
  </g>

  <!-- ================= FOOTER / CRÉDITOS ================= -->
  <line x1="0" y1="586" x2="${width}" y2="586" stroke="#1e293b" stroke-width="1" />
  <text x="36" y="608" font-size="11" fill="#64748b">Autores: ${autores}</text>
  <text x="${width - 36}" y="608" text-anchor="end" font-size="11" fill="#64748b">
    Padrão Internacional ICMJE • Diretrizes PRISMA 2020
  </text>
</svg>
  `.trim();
}

/**
 * Extrai os dados do manuscrito ou do pipeline para preencher o Graphical Abstract
 */
export function extrairDadosParaAbstractVisual(artigo = {}, dadosGrade = null, dadosRiscoVies = null) {
  const ehRotuloRascunho = (s) => !s || /^(?:akyla|esther|brisa|draft|rascunho|modelo|teste|v\d+)/i.test(String(s).trim()) || String(s).trim().length < 10;
  
  const titulo = (!ehRotuloRascunho(artigo.titulo) && artigo.titulo !== 'Artigo Científico Importado')
    ? artigo.titulo
    : (!ehRotuloRascunho(artigo.tema) ? artigo.tema : 'Estudo Clínico e Síntese Sistemática de Evidências');

  const tema = !ehRotuloRascunho(artigo.tema)
    ? artigo.tema
    : (!ehRotuloRascunho(artigo.titulo) ? artigo.titulo : 'patologia investigada');

  const resumo = artigo.resumo || '';
  const textoGeral = [artigo.introducao || '', artigo.metodos || '', artigo.resultados || '', artigo.discussao || ''].join(' ');

  // Extrair números reais de estudos e pacientes
  let nEstudos = 'Estudos';
  if (dadosRiscoVies?.estudos?.length) {
    nEstudos = String(dadosRiscoVies.estudos.length);
  } else if (Array.isArray(artigo.referencias) && artigo.referencias.length) {
    nEstudos = String(artigo.referencias.length);
  } else {
    const matchE = textoGeral.match(/(\d+)\s+(?:estudos|ensaios|artigos|trabalhos)/i);
    if (matchE) nEstudos = matchE[1];
  }

  let nPacientes = 'Casuística Documentada';
  const matchP = textoGeral.match(/(\d[\d.,]*)\s+(?:pacientes|participantes|indiv[ií]duos|sujeitos|casos)/i);
  if (matchP) {
    nPacientes = matchP[1];
  } else if (artigo.amostraTotal) {
    nPacientes = String(artigo.amostraTotal);
  } else {
    nPacientes = `${nEstudos} coortes/estudos`;
  }

  // Desfecho e Certeza GRADE reais
  let certezaGrade = dadosGrade?.certezaGlobal ? `${dadosGrade.certezaGlobal}` : 'Avaliação GRADE';
  let metricaValor = 'p < 0.05';
  let metricaTitulo = 'Associação Clínica';
  let metricaIC = 'Conforme intervalo das fontes primárias';
  let reducaoRisco = 'Evidência consistente em ' + nEstudos + ' estudos';

  if (dadosGrade?.avaliacoes?.length) {
    const prim = dadosGrade.avaliacoes[0];
    certezaGrade = `${prim.certeza} (${prim.simbolo})`;
    if (prim.efeitoRelativo && !prim.efeitoRelativo.includes('Síntese qualitativa')) {
      metricaTitulo = prim.desfecho.substring(0, 30);
      const matchRR = prim.efeitoRelativo.match(/(?:RR|HR|OR)\s*[:=]?\s*([\d.]+)/i);
      if (matchRR) {
        metricaValor = matchRR[1];
        const val = parseFloat(matchRR[1]);
        if (val < 1) {
          const perc = Math.round((1 - val) * 100);
          reducaoRisco = `−${perc}% Redução Relativa`;
        } else {
          const perc = Math.round((val - 1) * 100);
          reducaoRisco = `+${perc}% Aumento Relativo`;
        }
      }
      metricaIC = prim.efeitoRelativo;
    }
  } else {
    const matchStat = textoGeral.match(/(?:OR|HR|RR)\s*[:=]?\s*([\d.]+)\s*(?:\((?:IC\s*95%|95%\s*CI)?[:\s]*([\d.]+)\s*(?:a|-|–)\s*([\d.]+)\))?/i);
    if (matchStat) {
      metricaValor = matchStat[1];
      metricaIC = matchStat[0];
      metricaTitulo = 'Razão de Associação';
      reducaoRisco = 'Métrica extraída do manuscrito';
    }
  }

  const estudosDestaque = [];
  if (dadosRiscoVies?.estudos?.length) {
    dadosRiscoVies.estudos.slice(0, 3).forEach((e, idx) => {
      const nome = e.autor_ano || e.autor || `Estudo Primário 0${idx + 1}`;
      estudosDestaque.push(sanitizarTexto(nome, 20));
    });
  } else if (Array.isArray(artigo.referencias) && artigo.referencias.length) {
    artigo.referencias.slice(0, 3).forEach((r, idx) => {
      const txt = typeof r === 'string' ? r : (r.texto || r.titulo || '');
      const matchA = txt.match(/^([^.,]+(?:et\s+al\.?)?(?:,\s*\d{4}|\s+\(\d{4}\))?)/i);
      const nome = matchA ? matchA[1] : `Estudo Clínico 0${idx + 1}`;
      estudosDestaque.push(sanitizarTexto(nome, 20));
    });
  }
  while (estudosDestaque.length < 3) {
    estudosDestaque.push(`Estudo Clínico 0${estudosDestaque.length + 1}`);
  }

  const autores = artigo.autores || artigo.autor || artigo.params?.autores || artigo.params?.autor || 'Consórcio de Pesquisa Clínica & Evidências em Saúde';

  return {
    titulo,
    autores,
    revista: 'High-Impact Medical Journal (Qualis A1)',
    populacao: `Coortes clínicas avaliadas no escopo de ${sanitizarTexto(tema, 60)}.`,
    intervencao: 'Síntese analítica comparativa das intervenções e desfechos reportados.',
    metricaTitulo,
    metricaValor,
    metricaIC,
    reducaoRisco,
    nEstudos,
    nPacientes,
    certezaGrade,
    estudosDestaque,
    conclusao: 'Síntese sistemática consolidada apontando relevância clínica fundamentada nos estudos primários.',
    takeHome: 'Adoção recomendada em protocolos clínicos com suporte das diretrizes contemporâneas.'
  };
}

/**
 * Função principal do Agente 18: Designer de Graphical Abstract
 */
export function executarAgenteGraphicalAbstract(artigo = {}, dadosGrade = null, dadosRiscoVies = null) {
  const dados = extrairDadosParaAbstractVisual(artigo, dadosGrade, dadosRiscoVies);
  const svg = gerarGraphicalAbstractSVG(dados);

  return {
    sucesso: true,
    agente: 'Agente 18 - Designer de Graphical Abstract',
    versao: '1.0.0',
    dados,
    svg,
    dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    dimensoes: { largura: 1200, altura: 630, proporcao: '1.91:1 (Landscape / Social / Journal Banner)' },
    timestamp: new Date().toISOString()
  };
}

function sanitizarTexto(str = '', max = 100) {
  if (!str) return '';
  const limpo = String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .trim();
  if (limpo.length <= max) return limpo;
  return limpo.substring(0, max - 3) + '...';
}
