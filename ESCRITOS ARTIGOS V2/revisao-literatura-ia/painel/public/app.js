const $ = (s, r = document) => r.querySelector(s);

function el(tag, attrs = {}, ...filhos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat()) if (f !== null && f !== undefined && f !== false) n.append(f instanceof Node ? f : String(f));
  return n;
}

async function api(caminho, opcoes = {}) {
  const r = await fetch(caminho, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', ...(opcoes.method && opcoes.method !== 'GET' ? { 'X-Painel': '1' } : {}) },
  });
  const tipo = r.headers.get('content-type') || '';
  const corpo = tipo.includes('json') ? await r.json() : await r.text();
  if (!r.ok) throw new Error(corpo?.erro || `HTTP ${r.status}`);
  return corpo;
}

const NOMES_BASE = { pubmed: 'PubMed/MEDLINE', scielo: 'SciELO', lilacs: 'LILACS' };
const STATUS = { na_fila: 'na fila', executando: 'executando', concluido: 'concluído', erro: 'erro', cancelado: 'cancelado', interrompido: 'interrompido' };
const MOTIVOS = {
  fora_do_tema: 'fora do tema', nao_primario: 'não primário', populacao_inadequada: 'população inadequada',
  resumo_congresso: 'resumo de congresso', relato_de_caso: 'relato de caso', sem_desfecho: 'sem desfecho',
  sem_decisao: 'sem decisão', limite_escopo: 'limite de escopo', nao_confirmado: 'não confirmado na fonte', retratado: 'retratado',
};
const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');
const selo = (status, texto) => el('span', { class: `selo ${status}` }, texto || STATUS[status] || status);

let estadoGlobal = null;
let fonteEventos = null;
let temporizador = null;
let abaAtual = 'progresso';

// ------------------------------------------------------------------ status e lista
async function carregarStatus(forcar = false) {
  try {
    estadoGlobal = await api(`/api/status${forcar ? '?forcar=1' : ''}`);
  } catch (e) {
    $('#chips').replaceChildren(el('span', { class: 'chip erro' }, `Servidor indisponível: ${e.message}`));
    return;
  }
  const p = estadoGlobal.provedores;
  const nomeProv = { claude_cli: 'Claude (assinatura)', anthropic: 'Anthropic API', openrouter: 'OpenRouter' };
  const chips = [];
  if (p.escolhido) {
    const modelo = p[p.escolhido].modelo;
    const gratis = /free/.test(p[p.escolhido].detalhe) || /:free$/.test(modelo);
    chips.push(el('span', { class: `chip ${gratis ? 'aviso' : 'ok'}`, title: p[p.escolhido].detalhe }, `IA: ${nomeProv[p.escolhido]} · ${modelo.split('/').pop()}${gratis ? ' (grátis, 50/dia)' : ''}`));
  } else {
    chips.push(el('span', { class: 'chip erro' }, 'IA: nenhum motor disponível'));
  }
  chips.push(el('span', { class: 'chip ok', title: 'SciELO e LILACS são pesquisados em um Chrome real (Playwright), pois bloqueiam acesso automatizado simples.' }, 'Navegador: Chrome real'));
  chips.push(el('span', { class: 'chip ok' }, 'PubMed API · SciELO · LILACS'));
  chips.push(el('span', { class: 'chip ok', title: (estadoGlobal.etapas || []).map((e) => e[1]).join(' · ') }, `${(estadoGlobal.etapas || []).length} agentes`));
  if (estadoGlobal.executando) chips.push(el('span', { class: 'chip' }, 'Gerando artigo…'));
  $('#chips').replaceChildren(...chips);
}

async function carregarLista() {
  let lista = [];
  try {
    lista = await api('/api/trabalhos');
  } catch {
    return;
  }
  const idAtual = rotaAtual().id;
  $('#lista').replaceChildren(...(lista.length ? lista.map((t) => el('li', {},
    el('a', { class: `item-lista ${t.id === idAtual ? 'ativo' : ''}`, href: `#t/${t.id}` },
      el('div', { class: 't' }, t.titulo || t.tema),
      el('div', { class: 'm' }, selo(t.status), el('span', {}, dataHora(t.criado_em)), t.referencias ? el('span', {}, `${t.referencias} ref.`) : null, t.checklist ? el('span', {}, `checklist ${t.checklist}`) : null),
      el('div', { class: 'barra-mini' }, ...t.etapas.map((s) => el('span', { class: s || '' })))))) : [el('li', { class: 'pequeno' }, 'Nenhum trabalho ainda.')]));
}

// ------------------------------------------------------------------ rotas
function rotaAtual() {
  const h = location.hash.slice(1);
  if (h.startsWith('t/')) return { tela: 'trabalho', id: h.slice(2) };
  if (h === 'novo') return { tela: 'novo' };
  return { tela: 'inicio' };
}

async function navegar() {
  if (fonteEventos) fonteEventos.close();
  fonteEventos = null;
  clearTimeout(temporizador);
  const r = rotaAtual();
  carregarLista();
  if (r.tela === 'novo') return telaNovo();
  if (r.tela === 'trabalho') return telaTrabalho(r.id);
  return telaInicio();
}

// ------------------------------------------------------------------ telas
function telaInicio() {
  $('#principal').replaceChildren(el('div', { class: 'cartao vazio' },
    el('h2', {}, 'Revisões de literatura com fontes reais e conferidas'),
    el('p', {}, 'Informe um tema. O painel planeja a busca (MeSH/DeCS), pesquisa no PubMed pela API oficial e no SciELO e LILACS num Chrome real, faz a triagem, reabre cada fonte na origem para confirmar que existe, redige no padrão do modelo e audita cada citação duas vezes.'),
    el('p', {}, el('a', { class: 'btn primario', href: '#novo' }, '+ Criar novo artigo')),
    el('p', { class: 'pequeno' }, 'Ou escolha um trabalho na lista ao lado.')));
}

function telaNovo() {
  const pad = estadoGlobal?.padroes || {};
  const f = el('form', { class: 'form cartao', onsubmit: enviarNovo },
    el('h2', {}, 'Novo artigo de revisão'),
    el('div', { class: 'campo' },
      el('label', { for: 'tema' }, 'Tema *'),
      el('textarea', { id: 'tema', name: 'tema', required: true, minlength: 8, placeholder: 'Ex.: Fatores preditores de conversão da colecistectomia videolaparoscópica para cirurgia aberta' }),
      el('span', { class: 'ajuda' }, 'Quanto mais específico, mais replicável a busca (o painel refina a estratégia se vierem registros demais ou nenhum).')),
    el('div', { class: 'campo' },
      el('label', { for: 'pergunta' }, 'Pergunta norteadora (opcional)'),
      el('input', { type: 'text', id: 'pergunta', name: 'pergunta', placeholder: 'Deixe em branco para o painel formular a partir do PICo' })),
    el('div', { class: 'grade-3' },
      el('div', { class: 'campo' },
        el('label', { for: 'tipo' }, 'Tipo de revisão'),
        el('select', { id: 'tipo', name: 'tipo_revisao', onchange: (e) => { $('#nota-sist').hidden = e.target.value !== 'sistematica'; } },
          el('option', { value: 'integrativa' }, 'Integrativa'),
          el('option', { value: 'sistematica' }, 'Sistemática (com campos para os autores)'),
          el('option', { value: 'narrativa' }, 'Narrativa'))),
      el('div', { class: 'campo' },
        el('label', { for: 'anos' }, 'Período (últimos N anos)'),
        el('input', { type: 'number', id: 'anos', name: 'anos', min: 1, max: 30, value: pad.anos || 5 })),
      el('div', { class: 'campo' },
        el('label', { for: 'minref' }, 'Mínimo de referências'),
        el('input', { type: 'number', id: 'minref', name: 'min_referencias', min: 5, max: 100, value: pad.min_referencias || 25 }))),
    el('div', { class: 'nota aviso', id: 'nota-sist', hidden: true }, 'Revisão sistemática exige dupla seleção humana independente e avaliação de risco de viés. O painel não inventa esses procedimentos: os Métodos virão com campos [AUTORES: …] para vocês preencherem depois de realizá-los.'),
    el('div', { class: 'grade-2' },
      el('div', { class: 'campo' },
        el('span', { class: 'rot' }, 'Bases de dados'),
        el('div', { class: 'opcoes' },
          ...['pubmed', 'scielo', 'lilacs'].map((b) => el('label', {}, el('input', { type: 'checkbox', name: 'bases', value: b, checked: true }), NOMES_BASE[b]))),
        el('span', { class: 'ajuda' }, 'O modelo do professor exige PubMed + SciELO ou LILACS.')),
      el('div', { class: 'campo' },
        el('span', { class: 'rot' }, 'Idiomas'),
        el('div', { class: 'opcoes' },
          ...[['pt', 'Português'], ['en', 'Inglês'], ['es', 'Espanhol']].map(([v, t]) => el('label', {}, el('input', { type: 'checkbox', name: 'idiomas', value: v, checked: true }), t))))),
    el('div', { class: 'grade-2' },
      el('div', { class: 'campo' },
        el('label', { for: 'autores' }, 'Autores e orientador'),
        el('input', { type: 'text', id: 'autores', name: 'autores', placeholder: 'Opcional — pode preencher depois' })),
      el('div', { class: 'campo' },
        el('label', { for: 'revista' }, 'Revista-alvo'),
        el('input', { type: 'text', id: 'revista', name: 'revista_alvo', placeholder: 'Ex.: Revista do Colégio Brasileiro de Cirurgiões' }))),
    el('div', { class: 'campo' },
      el('label', { for: 'declaracao' }, 'Declaração de uso de IA no artigo'),
      el('select', { id: 'declaracao', name: 'declaracao_ia' },
        el('option', { value: 'nenhuma' }, 'Nenhuma (padrão)'),
        el('option', { value: 'breve' }, 'Breve — uma linha discreta'),
        el('option', { value: 'completa' }, 'Completa — detalha cada etapa')),
      el('span', { class: 'ajuda' }, 'Decisão dos autores. Confira a política do periódico ou da disciplina.')),
    el('div', { class: 'campo' },
      el('label', { for: 'provedor' }, 'Motor de IA'),
      el('select', { id: 'provedor', name: 'provedor' },
        el('option', { value: 'auto' }, 'Automático (melhor disponível)'),
        el('option', { value: 'claude_cli' }, 'Claude — assinatura (exige "claude auth login")'),
        el('option', { value: 'anthropic' }, 'Anthropic API'),
        el('option', { value: 'openrouter' }, 'OpenRouter'))),
    el('div', { class: 'acoes' }, el('button', { class: 'btn primario', type: 'submit' }, 'Gerar artigo'), el('span', { class: 'pequeno', id: 'msg-novo' })));
  $('#principal').replaceChildren(f);
}

async function enviarNovo(ev) {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const corpo = Object.fromEntries([...fd.entries()].filter(([k]) => !['bases', 'idiomas'].includes(k)));
  corpo.bases = fd.getAll('bases');
  corpo.idiomas = fd.getAll('idiomas');
  corpo.anos = Number(corpo.anos);
  corpo.min_referencias = Number(corpo.min_referencias);
  const botao = ev.target.querySelector('button[type=submit]');
  botao.disabled = true;
  try {
    const { id } = await api('/api/trabalhos', { method: 'POST', body: JSON.stringify(corpo) });
    location.hash = `#t/${id}`;
  } catch (e) {
    $('#msg-novo').textContent = e.message;
    botao.disabled = false;
  }
}

async function telaTrabalho(id) {
  let t;
  try {
    t = await api(`/api/trabalhos/${id}`);
  } catch (e) {
    $('#principal').replaceChildren(el('div', { class: 'cartao vazio' }, el('h2', {}, 'Trabalho não encontrado'), el('p', {}, e.message)));
    return;
  }
  renderizarTrabalho(t);
  const ativo = ['executando', 'na_fila'].includes(t.status);
  if (ativo && t.em_execucao_aqui) {
    fonteEventos = new EventSource(`/api/trabalhos/${id}/eventos`);
    fonteEventos.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.tipo === 'log') acrescentarLog(d.linha);
      if (d.tipo === 'estado' || d.tipo === 'fim') agendarAtualizacao(id, d.tipo === 'fim' ? 50 : 800);
    };
  } else if (ativo) {
    temporizador = setTimeout(() => rotaAtual().id === id && telaTrabalho(id), 5000);
  }
}

function agendarAtualizacao(id, ms) {
  clearTimeout(temporizador);
  temporizador = setTimeout(async () => {
    if (rotaAtual().id !== id) return;
    const t = await api(`/api/trabalhos/${id}`);
    renderizarTrabalho(t, true);
    carregarLista();
    if (!['executando', 'na_fila'].includes(t.status)) {
      fonteEventos?.close();
      carregarStatus();
    }
  }, ms);
}

function acrescentarLog(linha) {
  const caixa = $('#caixa-log');
  if (!caixa) return;
  const noFim = caixa.scrollHeight - caixa.scrollTop - caixa.clientHeight < 40;
  caixa.append(linhaLog(linha));
  if (noFim) caixa.scrollTop = caixa.scrollHeight;
}

const linhaLog = (l) => el('div', { class: l.nivel }, el('span', { class: 't' }, `${new Date(l.t).toLocaleTimeString('pt-BR')} `), l.msg);

function renderizarTrabalho(t, preservarRolagem = false) {
  const y = window.scrollY;
  const ativo = ['executando', 'na_fila'].includes(t.status);
  const podeRetomar = ['erro', 'cancelado', 'interrompido'].includes(t.status);
  const cab = el('div', { class: 'cartao' },
    el('div', { class: 'cabecalho-trab' },
      el('div', { class: 'info' },
        el('h2', {}, t.titulo || t.params.tema),
        el('div', { class: 'meta' },
          selo(t.status),
          el('span', {}, `Criado em ${dataHora(t.criado_em)}`),
          t.data_busca ? el('span', {}, `Busca em ${dataHora(t.data_busca)}`) : null,
          el('span', {}, `IA: ${t.llm?.provedor || '—'} (${t.llm?.chamadas || 0} chamadas)`),
          el('span', {}, `Revisão ${t.params.tipo_revisao}`)),
        t.erro ? el('p', { class: 'nota aviso' }, `Erro: ${t.erro}`) : null),
      el('div', { class: 'acoes' },
        ativo && t.em_execucao_aqui ? el('button', { class: 'btn perigo', onclick: () => acao(t.id, 'cancelar') }, 'Cancelar') : null,
        podeRetomar ? el('button', { class: 'btn primario', onclick: () => acao(t.id, 'retomar') }, 'Retomar de onde parou') : null,
        t.arquivos?.docx ? el('a', { class: 'btn primario', href: `/api/trabalhos/${t.id}/arquivos/artigo.docx?baixar=1` }, 'Baixar .docx') : null,
        t.arquivos?.md ? el('a', { class: 'btn', href: `/api/trabalhos/${t.id}/arquivos/artigo.md?baixar=1` }, '.md') : null,
        t.arquivos?.html ? el('a', { class: 'btn', href: `/api/trabalhos/${t.id}/arquivos/artigo.html`, target: '_blank' }, 'Versão para imprimir') : null,
        t.arquivos?.docx ? el('button', { class: 'btn fantasma', onclick: async () => { await acao(t.id, 'reexportar'); alert('Word (.docx) e versão HTML regenerados com sucesso!'); } }, 'Regenerar .docx') : null)),
    el('div', { class: 'etapas' }, ...(estadoGlobal?.etapas || []).map(([k, agente, titulo], i) => {
      const e = t.etapas[k] || {};
      return el('div', { class: `etapa ${e.status || ''}` },
        el('span', { class: 'n' }, `${i + 1} · ${(e.status || 'pendente').toUpperCase()}`),
        el('span', { class: 'tt' }, agente),
        el('span', { class: 'dd' }, e.detalhe || titulo));
    })),
    el('p', { class: 'pequeno' }, 'Pasta do trabalho: ', el('span', { class: 'mono' }, t.pasta)));

  const chkTexto = t.checklist ? ` (${t.checklist.aprovados}/${t.checklist.total})` : '';
  const abas = [
    ['progresso', 'Progresso'], ['artigo', 'Artigo'], ['fontes', `Fontes verificadas${t.aprovados_detalhe?.length ? ` (${t.aprovados_detalhe.length})` : ''}`],
    ['triagem', `Triagem${t.candidatos?.length ? ` (${t.candidatos.length})` : ''}`], ['busca', 'Estratégias de busca'], ['checklist', `Checklist${chkTexto}`],
  ];
  if (!t.arquivos && abaAtual === 'artigo') abaAtual = 'progresso';
  const conteudo = el('div', { id: 'conteudo-aba' });
  const barra = el('div', { class: 'abas' }, ...abas.map(([k, rot]) => el('button', {
    class: `aba ${k === abaAtual ? 'ativa' : ''}`,
    onclick: () => { abaAtual = k; renderizarTrabalho(t); },
    disabled: k === 'artigo' && !t.arquivos ? true : null,
  }, rot)));
  $('#principal').replaceChildren(cab, el('div', { class: 'cartao' }, barra, conteudo));
  ({ progresso: abaProgresso, artigo: abaArtigo, fontes: abaFontes, triagem: abaTriagem, busca: abaBusca, checklist: abaChecklist })[abaAtual](t, conteudo);
  if (preservarRolagem) window.scrollTo(0, y);
}

async function acao(id, qual) {
  try {
    await api(`/api/trabalhos/${id}/${qual}`, { method: 'POST' });
  } catch (e) {
    alert(e.message);
  }
  setTimeout(() => telaTrabalho(id), 400);
}

// ------------------------------------------------------------------ abas
function abaProgresso(t, alvo) {
  const p = t.prisma || {};
  const soma = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  alvo.append(
    el('div', { class: 'numeros' },
      ...[
        ['Identificados', p.identificados], ['Triados', p.triados], ['Excluídos na triagem', p.excluidos_triagem ? soma(p.excluidos_triagem) : null],
        ['Conferidos na fonte', p.verificados], ['Reprovados na verificação', p.falha_verificacao ? soma(p.falha_verificacao) : null], ['Incluídos', p.incluidos],
      ].map(([r, v]) => el('div', { class: 'numero' }, el('b', {}, v ?? '—'), el('span', {}, r)))));

  if (t.arquivos?.fluxograma) {
    const urlFluxo = `/api/trabalhos/${t.id}/arquivos/${t.arquivos.fluxograma}`;
    const urlSvg = t.arquivos.fluxograma_svg ? `/api/trabalhos/${t.id}/arquivos/${t.arquivos.fluxograma_svg}` : null;
    alvo.append(el('div', { class: 'card-prisma' },
      el('h3', { style: 'margin:0 0 12px 0;font-size:15px;' }, 'Fluxograma de Seleção dos Estudos (PRISMA 2020)'),
      el('a', { href: urlFluxo, target: '_blank', rel: 'noopener' },
        el('img', { src: urlFluxo, alt: 'Fluxograma PRISMA 2020' })),
      el('div', { style: 'margin-top:10px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;' },
        el('a', { class: 'btn fantasma', href: `${urlFluxo}?baixar=1` }, 'Baixar PNG em alta resolução'),
        urlSvg ? el('a', { class: 'btn fantasma', href: `${urlSvg}?baixar=1` }, 'Baixar SVG vetorial editável') : null)));
  }

  alvo.append(el('div', { class: 'log', id: 'caixa-log' }, ...(t.log || []).map(linhaLog)));
  const caixa = $('#caixa-log');
  if (caixa) caixa.scrollTop = caixa.scrollHeight;
}

async function abaArtigo(t, alvo) {
  alvo.append(el('p', { class: 'pequeno' }, 'Carregando…'));
  try {
    const html = await api(`/api/trabalhos/${t.id}/artigo`);
    alvo.replaceChildren(el('div', { class: 'artigo', html }));
  } catch (e) {
    alvo.replaceChildren(el('p', {}, e.message));
  }
}

function abaFontes(t, alvo) {
  const refNum = new Map((t.referencias || []).map((r) => [r.uid, r.n]));
  const linhas = (t.aprovados_detalhe || []).sort((a, b) => (refNum.get(a.uid) || 999) - (refNum.get(b.uid) || 999)).map((f) => {
    const v = f.verificacao || {};
    const evid = v.evidencia ? `/api/trabalhos/${t.id}/arquivos/${v.evidencia}` : null;
    return el('tr', {},
      el('td', {}, refNum.get(f.uid) ?? '—'),
      el('td', {}, NOMES_BASE[f.base_origem] || f.base_origem, f.tambem_em?.length ? el('div', { class: 'pequeno' }, `também: ${f.tambem_em.join(', ')}`) : null),
      el('td', {}, el('div', {}, f.titulo), el('div', { class: 'pequeno' }, [f.autores?.[0], f.periodico, f.ano].filter(Boolean).join(' · '))),
      el('td', {}, selo(v.status || 'pendente', v.status), el('div', { class: 'pequeno' }, ...(v.checagens || []).map((c) => el('div', {}, `• ${c}`)))),
      el('td', {}, v.url_confirmada ? el('a', { href: v.url_confirmada, target: '_blank', rel: 'noopener' }, 'abrir fonte') : '',
        evid ? (evid.endsWith('.png') ? el('a', { href: evid, target: '_blank' }, el('img', { class: 'miniatura', src: evid, alt: 'captura da página conferida', loading: 'lazy' })) : el('div', {}, el('a', { href: evid, target: '_blank' }, 'registro da API'))) : null));
  });
  const reprov = (t.reprovados_detalhe || []).map((f) => el('tr', {},
    el('td', {}, NOMES_BASE[f.base_origem] || ''), el('td', {}, f.titulo), el('td', {}, MOTIVOS[f.verificacao?.motivo] || f.verificacao?.motivo),
    el('td', { class: 'pequeno' }, (f.verificacao?.checagens || []).join(' · '))));
  alvo.append(
    linhas.length
      ? el('div', { class: 'tabela-rolagem' }, el('table', { class: 'dados' },
        el('thead', {}, el('tr', {}, ...['Ref.', 'Base', 'Estudo', 'Verificação na fonte', 'Evidência'].map((h) => el('th', {}, h)))), el('tbody', {}, ...linhas)))
      : el('p', { class: 'pequeno' }, 'As fontes aparecem aqui depois da etapa de verificação.'),
    reprov.length ? el('h3', { style: 'margin:20px 0 8px;font-size:14px' }, `Reprovadas na verificação (${reprov.length})`) : null,
    reprov.length ? el('div', { class: 'tabela-rolagem' }, el('table', { class: 'dados' }, el('tbody', {}, ...reprov))) : null);
}

function abaTriagem(t, alvo) {
  const cands = t.candidatos || [];
  if (!cands.length) return alvo.append(el('p', { class: 'pequeno' }, 'A triagem aparece aqui depois da busca.'));
  let filtro = 'todos';
  let termoBusca = '';
  const tabela = el('tbody');
  const desenhar = () => {
    const filtrados = cands.filter((c) => {
      const matchStatus = filtro === 'todos' || (filtro === 'incluidos' ? c.decisao?.incluir : c.decisao && !c.decisao.incluir);
      const matchTermo = !termoBusca || (c.titulo || '').toLowerCase().includes(termoBusca) || (c.cid || '').toLowerCase().includes(termoBusca) || (c.decisao?.delineamento || '').toLowerCase().includes(termoBusca);
      return matchStatus && matchTermo;
    });
    tabela.replaceChildren(...filtrados.map((c) => el('tr', {},
      el('td', { class: 'pequeno' }, c.cid), el('td', {}, NOMES_BASE[c.base] || c.base), el('td', {}, c.ano),
      el('td', {}, el('a', { href: c.url, target: '_blank', rel: 'noopener' }, c.titulo)),
      el('td', {}, c.decisao ? selo(c.decisao.incluir ? 'incluido' : 'excluido', c.decisao.incluir ? 'incluído' : MOTIVOS[c.decisao.motivo] || c.decisao.motivo) : selo('pendente', 'pendente')),
      el('td', { class: 'pequeno' }, c.decisao?.delineamento || ''))));
  };
  alvo.append(
    el('div', { class: 'filtros' },
      ...[['todos', 'Todos'], ['incluidos', 'Incluídos'], ['excluidos', 'Excluídos']].map(([k, r]) => el('button', { class: 'btn', onclick: () => { filtro = k; desenhar(); } }, r)),
      el('input', { type: 'search', placeholder: 'Filtrar por título, ID ou delineamento…', style: 'padding:7px 12px;border-radius:8px;border:1px solid var(--borda);background:var(--superficie-2);color:inherit;flex:1;min-width:200px;', oninput: (e) => { termoBusca = e.target.value.toLowerCase().trim(); desenhar(); } }),
      t.arquivos?.triagem ? el('a', { class: 'btn fantasma', href: `/api/trabalhos/${t.id}/arquivos/triagem.csv?baixar=1` }, 'Baixar planilha (.csv)') : null),
    el('div', { class: 'tabela-rolagem' }, el('table', { class: 'dados' },
      el('thead', {}, el('tr', {}, ...['ID', 'Base', 'Ano', 'Título', 'Decisão', 'Delineamento'].map((h) => el('th', {}, h)))), tabela)));
  desenhar();
}

function abaBusca(t, alvo) {
  const b = t.buscas || {};
  const plano = t.plano;
  if (!plano) return alvo.append(el('p', { class: 'pequeno' }, 'O planejamento aparece aqui em instantes.'));
  alvo.append(
    el('div', { class: 'nota' }, 'Para replicar a busca (como o professor fará), use exatamente as estratégias e filtros abaixo. A data da busca consta nos Métodos do artigo.'),
    el('p', {}, el('b', {}, 'Pergunta: '), plano.pergunta),
    el('p', { class: 'pequeno' }, `PICo — P: ${plano.pico.P} · I: ${plano.pico.I} · Co: ${plano.pico.Co} · S: ${plano.pico.S}`),
    el('p', { class: 'pequeno' }, `MeSH: ${plano.descritores_mesh.join('; ')} · DeCS: ${plano.descritores_decs.join('; ')}`),
    el('div', { class: 'tabela-rolagem' }, el('table', { class: 'dados' },
      el('thead', {}, el('tr', {}, ...['Base', 'Estratégia exata', 'Filtros', 'Registros', 'Replicar'].map((h) => el('th', {}, h)))),
      el('tbody', {}, ...Object.entries(b).map(([k, x]) => el('tr', {},
        el('td', {}, NOMES_BASE[k]), el('td', { class: 'mono' }, x.estrategia), el('td', { class: 'pequeno' }, x.filtros),
        el('td', {}, x.total, x.erro ? el('div', { class: 'pequeno' }, `erro: ${x.erro}`) : null),
        el('td', {}, x.url_publica ? el('a', { href: x.url_publica, target: '_blank', rel: 'noopener' }, 'abrir busca') : '')))))));
}

function abaChecklist(t, alvo) {
  const c = t.checklist;
  if (!c) return alvo.append(el('p', { class: 'pequeno' }, 'O checklist é avaliado ao final da geração.'));
  alvo.append(
    el('p', {}, el('b', {}, `${c.aprovados} de ${c.total} itens automáticos aprovados.`), ' Itens marcados como manuais dependem de vocês.'),
    el('ul', { class: 'check' }, ...c.itens.map((i) => el('li', { class: i.manual && !i.ok ? 'man' : i.ok ? 'sim' : 'nao' },
      el('span', { class: 'ic' }, i.ok ? '✓' : i.manual ? '!' : '✗'), el('span', {}, i.item, i.manual ? el('span', { class: 'pequeno' }, ' (manual)') : null)))),
    t.auditoria?.pendentes?.length ? el('h3', { style: 'margin:20px 0 8px;font-size:14px' }, 'Pendências para revisão humana') : null,
    t.auditoria?.pendentes?.length ? el('ul', { class: 'check' }, ...t.auditoria.pendentes.map((p) => el('li', { class: 'nao' }, el('span', { class: 'ic' }, '!'),
      el('span', {}, el('b', {}, `${p.secao}: `), p.detalhe, el('div', { class: 'pequeno' }, `“${String(p.trecho).slice(0, 240)}”`))))) : null,
    (t.auditoria?.rodadas || []).length ? el('p', { class: 'pequeno' }, `Auditoria: ${t.auditoria.rodadas.map((r) => `rodada ${r.rodada} — ${r.problemas.length} problema(s), ${r.corrigidos} corrigido(s), ${r.removidos} removido(s)`).join(' · ')}`) : null);
}

// ------------------------------------------------------------------ configuracoes
$('#btn-config').addEventListener('click', async () => {
  await carregarStatus();
  const c = estadoGlobal?.config || {};
  $('#cfg-openrouter').value = '';
  $('#cfg-anthropic').value = '';
  $('#cfg-ncbi').value = '';
  $('#cfg-openrouter-origem').textContent = c.tem_openrouter ? `Chave atual encontrada em: ${c.origem_openrouter}` : 'Nenhuma chave encontrada.';
  $('#cfg-modelo').value = c.modelo_openrouter || '';
  $('#cfg-email').value = c.contato_email || '';
  $('#cfg-janela').value = c.janela_navegador || 'visivel';
  $('#dlg-config').showModal();
});

$('#dlg-config').addEventListener('close', async () => {
  if ($('#dlg-config').returnValue !== 'salvar') return;
  const corpo = {
    modelo_openrouter: $('#cfg-modelo').value.trim(),
    contato_email: $('#cfg-email').value.trim(),
    janela_navegador: $('#cfg-janela').value,
  };
  for (const [id, k] of [['#cfg-openrouter', 'openrouter_api_key'], ['#cfg-anthropic', 'anthropic_api_key'], ['#cfg-ncbi', 'ncbi_api_key']]) {
    if ($(id).value.trim()) corpo[k] = $(id).value.trim();
  }
  try {
    await api('/api/config', { method: 'POST', body: JSON.stringify(corpo) });
    await carregarStatus(true);
  } catch (e) {
    alert(e.message);
  }
});

window.addEventListener('hashchange', navegar);
await carregarStatus();
navegar();
setInterval(carregarLista, 10000);
