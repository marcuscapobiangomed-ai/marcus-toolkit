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
const formatarTokens = (n) => (!n ? '0' : n >= 1000 ? (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k' : Number(n).toLocaleString('pt-BR'));
const formatarUsd = (v) => (v === undefined || v === null ? '$0,00' : '$' + Number(v).toFixed(v < 0.01 && v > 0 ? 4 : 2));

function abrirConfig() {
  $('#btn-config').click();
}

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
  const nomeProv = { dupla: '🔥 Dupla Híbrida (DeepSeek + Gemini)', deepseek: 'DeepSeek API', gemini: 'Google Gemini API', omniroute: 'OmniRoute', claude_cli: 'Claude (assinatura)', anthropic: 'Anthropic API', openrouter: 'OpenRouter' };
  const chips = [];
  if (p.escolhido === 'dupla') {
    chips.push(el('span', { class: 'chip ok', title: 'DeepSeek para dados/auditoria e Gemini para texto/estilo' }, 'IA: 🔥 Dupla Híbrida (DeepSeek + Gemini)'));
  } else if (p.escolhido) {
    const modelo = p[p.escolhido].modelo;
    const gratis = /free/.test(p[p.escolhido].detalhe) || /:free$/.test(modelo) || p.escolhido === 'omniroute' || p.escolhido === 'gemini';
    chips.push(el('span', { class: `chip ${gratis ? 'aviso' : 'ok'}`, title: p[p.escolhido].detalhe }, `IA: ${nomeProv[p.escolhido] || p.escolhido} · ${modelo.split('/').pop()}${gratis ? ' (grátis)' : ''}`));
  } else {
    chips.push(el('span', { class: 'chip erro' }, 'IA: nenhum motor disponível'));
  }
  if (estadoGlobal.uso?.deepseek?.ativo && estadoGlobal.uso?.deepseek?.saldo_total !== null) {
    const ds = estadoGlobal.uso.deepseek;
    chips.push(el('span', {
      class: 'chip custo',
      title: `DeepSeek: Saldo total ${ds.moeda} $${ds.saldo_total.toFixed(2)}. Clique para detalhes.`,
      onclick: abrirConfig,
    }, `💎 DeepSeek: $${ds.saldo_total.toFixed(2)}`));
  }
  if (estadoGlobal.uso?.gemini?.ativo) {
    const gem = estadoGlobal.uso.gemini;
    chips.push(el('span', {
      class: 'chip custo',
      title: `Google Gemini: ${gem.tier} (${gem.modelo}). Custo acumulado real: $${gem.total_gasto_usd?.toFixed(4) || '0.0000'} USD (${Math.round((gem.tokens_total || 0) / 1000)}k tokens).`,
      onclick: abrirConfig,
    }, `⚡ Gemini: ${gem.total_gasto_usd > 0 ? `$${gem.total_gasto_usd.toFixed(2)}` : 'Ativo'}`));
  }
  if (estadoGlobal.uso?.openrouter?.ativo) {
    const or = estadoGlobal.uso.openrouter;
    if (or.is_free_tier && or.gratis_restantes !== null) {
      chips.push(el('span', {
        class: 'chip custo',
        title: `OpenRouter: ${or.gratis_usadas} usadas de ${or.gratis_limite} hoje (${or.gratis_restantes} restantes). Clique para detalhes.`,
        onclick: abrirConfig,
      }, `⚡ ${or.gratis_restantes}/${or.gratis_limite} req. grátis hoje`));
    } else {
      chips.push(el('span', {
        class: 'chip custo',
        title: `OpenRouter: Créditos comprados $${or.total_creditos_usd.toFixed(2)}, uso total $${or.total_gasto_usd.toFixed(4)}. Clique para detalhes.`,
        onclick: abrirConfig,
      }, `💰 Saldo: $${or.saldo_restante_usd.toFixed(2)}`));
    }
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
      el('div', { class: 'm' },
        selo(t.status),
        t.origem === 'importado' ? el('span', { class: 'selo selo-importado', title: `Importado de: ${t.arquivo_importado || 'externo'}` }, '📥 IMPORTADO') : null,
        t.revisoes_orientador ? el('span', { class: 'selo chip-orientador-sidebar', title: `Artigo revisado com parecer do orientador (Rodada ${t.revisoes_orientador})` }, `✨ ATUALIZADO (R${t.revisoes_orientador})`) : null,
        el('span', {}, dataHora(t.criado_em)),
        t.referencias ? el('span', {}, `${t.referencias} ref.`) : null,
        t.checklist ? el('span', {}, `checklist ${t.checklist}`) : null,
        t.llm?.tokens_total ? el('span', { title: `${t.llm.tokens_total.toLocaleString('pt-BR')} tokens · Custo est.: ${formatarUsd(t.llm.custo_usd)}` }, `${formatarTokens(t.llm.tokens_total)} tokens`) : null
      ),
      el('div', { class: 'barra-mini' }, ...t.etapas.map((s) => el('span', { class: s || '' })))))) : [el('li', { class: 'pequeno' }, 'Nenhum trabalho ainda.')]));
}

// ------------------------------------------------------------------ rotas
function rotaAtual() {
  const h = location.hash.slice(1);
  if (h.startsWith('t/')) return { tela: 'trabalho', id: h.slice(2) };
  if (h === 'novo') return { tela: 'novo' };
  if (h === 'importar') return { tela: 'importar' };
  return { tela: 'inicio' };
}

async function navegar() {
  if (fonteEventos) fonteEventos.close();
  fonteEventos = null;
  clearTimeout(temporizador);
  const r = rotaAtual();
  carregarLista();
  if (r.tela === 'novo') return telaNovo();
  if (r.tela === 'importar') return telaImportar();
  if (r.tela === 'trabalho') return telaTrabalho(r.id);
  return telaInicio();
}

// ------------------------------------------------------------------ telas
async function telaInicio() {
  let lista = [];
  try {
    lista = await api('/api/trabalhos');
  } catch {}
  const atualizados = (lista || []).filter((t) => t.revisoes_orientador > 0);
  const cardAtualizado = atualizados.length ? el('div', { class: 'banner-orientador', style: 'margin-bottom: 24px;' },
    el('div', { class: 'titulo-box' },
      el('div', { class: 'titulo-tag' }, `✨ ARTIGO ATUALIZADO — PRONTO PARA DOWNLOAD`),
      el('h3', { style: 'margin: 4px 0 6px; font-size: 15px; color: #065f46;' }, atualizados[0].titulo || atualizados[0].tema),
      el('div', { class: 'sub-tag' }, `Versão revisada conforme as orientações do orientador e modelo de escrita (Rodada ${atualizados[0].revisoes_orientador}):`),
      el('div', { class: 'banner-tags-ajustes' },
        el('span', { class: 'tag-ajuste' }, '✓ Unidades PCR calibradas (mg/L vs mg/dL)'),
        el('span', { class: 'tag-ajuste' }, '✓ Rigor metodológico JBI na Tabela 1'),
        el('span', { class: 'tag-ajuste' }, '✓ Desfechos diretos vs indiretos'),
        el('span', { class: 'tag-ajuste' }, '✓ Modelo de Escrita Científica Qualis A1')
      )
    ),
    el('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
      el('a', { class: 'btn-destaque-orientador pulsante', href: `/api/trabalhos/${atualizados[0].id}/artigo.docx?baixar=1&_t=${Date.now()}` }, `📥 Baixar .docx Atualizado (R${atualizados[0].revisoes_orientador})`),
      el('a', { class: 'btn fantasma', href: `#t/${atualizados[0].id}` }, 'Abrir no Painel →')
    )
  ) : null;

  $('#principal').replaceChildren(...[
    cardAtualizado,
    el('div', { class: 'cartao vazio' },
      el('h2', {}, 'Revisões de literatura com fontes reais e conferidas'),
      el('p', {}, 'Informe um tema para pesquisar nas bases ou envie arquivos já prontos (.docx ou .pdf) para aplicar nosso Modelo de Escrita Científica Qualis A1 e as orientações dos professores.'),
      el('div', { style: 'display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 14px;' },
        el('a', { class: 'btn primario', href: '#novo' }, '+ Criar novo artigo'),
        el('a', { class: 'btn fantasma', href: '#importar', style: 'border: 1px solid var(--borda); font-weight: 500;' }, '📥 Importar artigo pronto (.docx / .pdf)')
      ),
      el('p', { class: 'pequeno', style: 'margin-top: 16px;' }, 'Ou escolha um trabalho na lista ao lado.')
    )
  ].filter(Boolean));
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
        el('option', { value: 'breve', selected: true }, 'Breve (Recomendada ICMJE/COPE) — transparência de apoio'),
        el('option', { value: 'completa' }, 'Completa — detalha cada etapa do pipeline'),
        el('option', { value: 'nenhuma' }, 'Nenhuma — sem declaração explícita')),
      el('span', { class: 'ajuda' }, 'Transparência ética recomendada pelas diretrizes internacionais (ICMJE/COPE).')),
    el('div', { class: 'campo' },
      el('label', { for: 'provedor' }, 'Motor de IA'),
      el('select', { id: 'provedor', name: 'provedor' },
        el('option', { value: 'auto' }, 'Automático (Melhor disponível)'),
        el('option', { value: 'dupla' }, '🔥 Dupla Híbrida (DeepSeek Dados/Auditoria + Gemini Texto/Estilo)'),
        el('option', { value: 'deepseek' }, 'DeepSeek API Direta (Ultrabarato & Caching)'),
        el('option', { value: 'gemini' }, 'Google Gemini API Direta (Google AI Studio)'),
        el('option', { value: 'omniroute' }, 'OmniRoute (Gateway Local Gratuito :20128)'),
        el('option', { value: 'openrouter' }, 'OpenRouter (Escada de Modelos 2026 / :free)'),
        el('option', { value: 'claude_cli' }, 'Claude — assinatura (exige "claude auth login")'),
        el('option', { value: 'anthropic' }, 'Anthropic API'))),
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

function telaImportar() {
  let arquivoSelecionado = null;
  let arquivoBase64 = null;

  const inputArquivo = el('input', {
    type: 'file',
    accept: '.docx,.pdf',
    style: 'display: none;',
    onchange: async (e) => {
      const f = e.target.files?.[0];
      if (f) carregarArquivo(f);
    },
  });

  const areaUpload = el('div', {
    class: 'area-upload',
    onclick: () => inputArquivo.click(),
    ondragover: (e) => { e.preventDefault(); areaUpload.classList.add('arrastando'); },
    ondragleave: () => areaUpload.classList.remove('arrastando'),
    ondrop: (e) => {
      e.preventDefault();
      areaUpload.classList.remove('arrastando');
      const f = e.dataTransfer.files?.[0];
      if (f) carregarArquivo(f);
    },
  },
    el('div', { class: 'icone-upload' }, '📄'),
    el('div', { class: 'texto-principal' }, 'Arraste o arquivo .docx ou .pdf aqui, ou clique para selecionar'),
    el('div', { class: 'texto-secundario' }, 'Manuscritos em Word (.docx) ou PDF (.pdf) com texto completo, seções e referências')
  );

  const containerArquivo = el('div', { style: 'display: none;' });
  const inputTema = el('input', { type: 'text', placeholder: 'Detectado automaticamente do documento se deixar em branco' });
  const inputAutores = el('input', { type: 'text', placeholder: 'Ex: Silva JA, Santos M, Oliveira R (opcional)' });
  const txtOrientacoes = el('textarea', {
    rows: 5,
    placeholder: 'Cole aqui os apontamentos, críticas, e-mails ou anotações do orientador/banca.\n\nExemplo: "O orientador solicitou aprofundar a discussão sobre complicações cirúrgicas, ajustar o objetivo na introdução e reescrever a conclusão destacando o papel da estratificação de risco..."\n\n(Deixe em branco se desejar apenas importar e aplicar o nosso Modelo de Escrita Científica Qualis A1)',
  });
  const chkAplicar = el('input', { type: 'checkbox', checked: false });
  const selDeclaracao = el('select', {},
    el('option', { value: 'breve', selected: true }, 'Breve (Recomendada ICMJE/COPE) — transparência de apoio'),
    el('option', { value: 'completa' }, 'Completa — detalha metodologia de apoio por IA'),
    el('option', { value: 'nenhuma' }, 'Nenhuma — sem declaração explícita')
  );
  const msgStatus = el('div', { style: 'margin-top: 14px; font-size: 13.5px; line-height: 1.5;' });
  const btnProcessar = el('button', { class: 'btn primario', type: 'submit' }, '📥 Ingerir, Auditar e Gerar Raio-X Diagnóstico');

  chkAplicar.addEventListener('change', () => {
    btnProcessar.textContent = chkAplicar.checked
      ? '🚀 Ingerir, Auditar e Aprimorar com Qualis A1'
      : '📥 Ingerir, Auditar e Gerar Raio-X Diagnóstico';
  });

  function carregarArquivo(f) {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['docx', 'pdf'].includes(ext)) {
      alert('Selecione um arquivo .docx ou .pdf válido.');
      return;
    }
    arquivoSelecionado = f;
    const reader = new FileReader();
    reader.onload = () => {
      arquivoBase64 = reader.result.split(',')[1];
    };
    reader.readAsDataURL(f);

    const tamKb = Math.round(f.size / 1024);
    const tamStr = tamKb > 1024 ? `${(tamKb / 1024).toFixed(1)} MB` : `${tamKb} KB`;

    containerArquivo.replaceChildren(
      el('div', { class: 'arquivo-selecionado' },
        el('div', { class: 'arquivo-selecionado-info' },
          el('span', { class: 'arquivo-selecionado-icone' }, ext === 'pdf' ? '📕' : '📘'),
          el('div', {},
            el('div', { class: 'arquivo-selecionado-nome' }, f.name),
            el('div', { class: 'arquivo-selecionado-tamanho' }, `${tamStr} · Formato ${ext.toUpperCase()}`)
          )
        ),
        el('button', {
          class: 'btn fantasma pequeno',
          type: 'button',
          onclick: (e) => {
            e.stopPropagation();
            arquivoSelecionado = null;
            arquivoBase64 = null;
            containerArquivo.style.display = 'none';
            areaUpload.style.display = 'block';
            inputArquivo.value = '';
          },
        }, '✕ Trocar arquivo')
      )
    );
    containerArquivo.style.display = 'block';
    areaUpload.style.display = 'none';
  }

  async function submeter(e) {
    e.preventDefault();
    if (!arquivoSelecionado || !arquivoBase64) {
      alert('Por favor, selecione um arquivo .docx ou .pdf antes de continuar.');
      return;
    }

    btnProcessar.disabled = true;
    btnProcessar.textContent = '⏳ Processando e estruturando documento...';
    msgStatus.innerHTML = '<span style="color:var(--primaria);">⏳ Extraindo texto, seções e tabelas do documento...</span>';

    try {
      const res = await api('/api/trabalhos/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_arquivo: arquivoSelecionado.name,
          conteudo_base64: arquivoBase64,
          tema: inputTema.value.trim(),
          autores: inputAutores.value.trim(),
          orientacoes: txtOrientacoes.value.trim(),
          aplicar_revisao: chkAplicar.checked,
          declaracao_ia: selDeclaracao.value,
        }),
      });

      msgStatus.innerHTML = '<span style="color:var(--ok); font-weight:600;">✔ Artigo importado e estruturado com sucesso! Redirecionando...</span>';
      setTimeout(() => {
        location.hash = `#t/${res.id}`;
      }, 700);
    } catch (err) {
      btnProcessar.disabled = false;
      btnProcessar.textContent = '🚀 Processar, Estruturar e Corrigir Artigo';
      msgStatus.innerHTML = `<span style="color:var(--erro); font-weight:600;">Erro ao importar: ${err.message}</span>`;
    }
  }

  const f = el('form', { class: 'form cartao', onsubmit: submeter },
    el('div', { class: 'banner-importacao' },
      el('h2', {}, '📥 Importar Artigo Pronto (.docx ou .pdf)'),
      el('p', {}, 'Submeta um manuscrito ou trabalho acadêmico já escrito. O sistema extrai e estrutura as seções no padrão ABNT (Título, Resumo, Introdução, Métodos, Resultados, Discussão, Conclusão e Referências Vancouver), gera o Word (.docx) diagramado e aciona nossos agentes e skills para revisar o texto com base nas orientações do professor e no nosso modelo de escrita científica Qualis A1.')
    ),
    inputArquivo,
    areaUpload,
    containerArquivo,
    el('div', { class: 'campo' },
      el('label', {}, 'Título / Tema do Trabalho (opcional)'),
      inputTema,
      el('span', { class: 'ajuda' }, 'Se deixar em branco, o sistema detecta o título diretamente do arquivo.')
    ),
    el('div', { class: 'campo' },
      el('label', {}, 'Autores do Manuscrito (opcional)'),
      inputAutores,
      el('span', { class: 'ajuda' }, 'Nomes dos pesquisadores (ex: Silva JA, Santos M) para taxonomia CRediT real e metadados OpenXML honestos.')
    ),
    el('div', { class: 'campo' },
      el('label', {}, 'Orientações do Professor / Devolutiva da Banca (opcional)'),
      txtOrientacoes,
      el('span', { class: 'ajuda' }, 'Cole aqui feedbacks, e-mails ou anotações do orientador. Se omitido, o sistema executará o aprimoramento acadêmico com base no nosso Modelo de Escrita Científica Qualis A1.')
    ),
    el('div', { class: 'campo' },
      el('label', {}, 'Declaração de uso de IA no manuscrito'),
      selDeclaracao,
      el('span', { class: 'ajuda' }, 'Transparência ética recomendada por ICMJE/COPE caso correções ou humanização por IA sejam executadas.')
    ),
    el('div', { class: 'campo-check', style: 'margin: 14px 0; background: var(--fundo-destaque, #f8fafc); padding: 12px; border-radius: 8px; border: 1px solid var(--borda, #e2e8f0);' },
      el('label', { style: 'display: flex; align-items: flex-start; gap: 10px; cursor: pointer;' },
        chkAplicar,
        el('div', {},
          el('strong', { style: 'display: block; margin-bottom: 2px;' }, 'Aplicar Reescrita e Humanização Qualis A1 Imediatamente'),
          el('span', { class: 'ajuda', style: 'margin: 0; line-height: 1.4;' }, 'Recomendamos manter desmarcado no primeiro envio para inspecionar o Laudo de Raio-X e a confiança da extração estrutural. Após validar, você poderá disparar a suíte com 1 clique diretamente no painel.')
        )
      )
    ),
    el('div', { style: 'display: flex; gap: 10px; align-items: center; margin-top: 18px;' },
      btnProcessar,
      el('a', { class: 'btn fantasma', href: '#inicio' }, 'Cancelar')
    ),
    msgStatus
  );

  $('#principal').replaceChildren(f);
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
  const qtdRevisoes = (t.revisoes_orientador || []).length;
  const ultimaRev = qtdRevisoes ? t.revisoes_orientador[qtdRevisoes - 1] : null;

  const cab = el('div', { class: 'cartao' },
    el('div', { class: 'cabecalho-trab' },
      el('div', { class: 'info' },
        el('h2', {}, t.titulo || t.params.tema, qtdRevisoes ? el('span', { class: 'selo-atualizado-inline' }, `✓ ATUALIZADO (R${qtdRevisoes})`) : null),
        el('div', { class: 'meta' },
          selo(t.status),
          t.origem === 'importado' ? el('span', { class: 'selo selo-importado', title: `Importado de: ${t.arquivo_importado || 'externo'}` }, `📥 IMPORTADO${t.arquivo_importado ? ` (${t.arquivo_importado})` : ''}`) : null,
          qtdRevisoes ? el('span', { class: 'chip ok', style: 'font-weight: 700;' }, `Versão Pós-Orientador (R${qtdRevisoes})`) : null,
          el('span', {}, `Criado em ${dataHora(t.criado_em)}`),
          t.data_busca ? el('span', {}, `Busca em ${dataHora(t.data_busca)}`) : null,
          el('span', {}, `IA: ${t.llm?.provedor || '—'} (${t.llm?.chamadas || 0} chamadas)`),
          el('span', {}, `Tokens: ${formatarTokens(t.llm?.tokens_total || 0)} (${formatarTokens(t.llm?.tokens_entrada || 0)} ent. · ${formatarTokens(t.llm?.tokens_saida || 0)} saí.)`),
          el('span', {}, `Custo est.: ${t.llm?.custo_usd > 0 ? formatarUsd(t.llm.custo_usd) : '$0,00 (grátis)'}`),
          el('span', {}, `Revisão ${t.params.tipo_revisao}`)),
        t.erro ? el('p', { class: 'nota aviso' }, `Erro: ${t.erro}`) : null),
      el('div', { class: 'acoes' },
        ativo && t.em_execucao_aqui ? el('button', { class: 'btn perigo', onclick: () => acao(t.id, 'cancelar') }, 'Cancelar') : null,
        podeRetomar ? el('button', { class: 'btn primario', onclick: () => acao(t.id, 'retomar') }, 'Retomar de onde parou') : null,
        t.arquivos?.original ? el('a', { class: 'btn fantasma', href: `/api/trabalhos/${t.id}/arquivos/${t.arquivos.original}?baixar=1`, title: 'Baixar arquivo original enviado' }, '📄 Original') : null,
        t.arquivos?.md ? el('button', { class: 'btn primario', style: 'background: linear-gradient(135deg, #1f5fa8, #0e7490);', onclick: () => { abaAtual = 'orientador'; renderizarTrabalho(t); } }, '✍ Devolutiva do Orientador') : null,
        t.arquivos?.docx ? el('a', { class: qtdRevisoes ? 'btn-destaque-orientador pulsante' : 'btn primario', href: `/api/trabalhos/${t.id}/artigo.docx?baixar=1&_t=${Date.now()}`, title: 'Baixar arquivo Word (.docx) formatado para submissão' }, qtdRevisoes ? `📥 Baixar .docx Atualizado (R${qtdRevisoes})` : 'Baixar .docx') : null,
        t.arquivos?.md ? el('a', { class: 'btn', href: `/api/trabalhos/${t.id}/arquivos/artigo.md?baixar=1` }, '.md') : null,
        t.arquivos?.html ? el('a', { class: 'btn', href: `/api/trabalhos/${t.id}/arquivos/artigo.html`, target: '_blank' }, qtdRevisoes ? 'Versão para imprimir (atualizada)' : 'Versão para imprimir') : null,
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
  const bannerOrientador = qtdRevisoes ? el('div', { class: 'banner-orientador' },
    el('div', { class: 'titulo-box' },
      el('div', { class: 'titulo-tag' }, `✨ ARTIGO ATUALIZADO — PÓS-DEVOLUTIVA DO ORIENTADOR (RODADA ${qtdRevisoes})`),
      el('div', { class: 'sub-tag' },
        `Modificações incorporadas em ${dataHora(ultimaRev?.data)}. Todas as correções e ressalvas do orientador foram aplicadas com sucesso:`
      ),
      el('div', { class: 'banner-tags-ajustes' },
        el('span', { class: 'tag-ajuste' }, '✓ Escala PCR 10 mg/dL = 100 mg/L'),
        el('span', { class: 'tag-ajuste' }, '✓ Rigor metodológico JBI na Tabela 1'),
        el('span', { class: 'tag-ajuste' }, '✓ Desfechos diretos vs substitutos discriminados'),
        el('span', { class: 'tag-ajuste' }, '✓ PRISMA 2020 critérios metodológicos')
      )
    ),
    el('div', { class: 'acoes', style: 'display: flex; gap: 8px; flex-wrap: wrap; align-items: center;' },
      el('a', { class: 'btn-destaque-orientador pulsante', href: `/api/trabalhos/${t.id}/artigo.docx?baixar=1&_t=${Date.now()}` }, `📥 Baixar .docx Atualizado (Rodada ${qtdRevisoes})`),
      el('button', { class: 'btn fantasma', onclick: () => { abaAtual = 'orientador'; renderizarTrabalho(t); } }, 'Ver Detalhes do Parecer')
    )
  ) : null;

  const abas = [
    ['progresso', 'Progresso'],
    ['artigo', `Artigo${qtdRevisoes ? ' (Atualizado)' : ''}`],
    ['orientador', `Devolutiva do Orientador${qtdRevisoes ? ` (${qtdRevisoes})` : ''}`],
    ['fontes', `Fontes verificadas${t.aprovados_detalhe?.length ? ` (${t.aprovados_detalhe.length})` : ''}`],
    ['triagem', `Triagem${t.candidatos?.length ? ` (${t.candidatos.length})` : ''}`],
    ['busca', 'Estratégias de busca'],
    ['checklist', `Checklist${chkTexto}`],
    ['tokens', `Tokens & Custos${t.llm?.tokens_total ? ` (${formatarTokens(t.llm.tokens_total)})` : ''}`],
  ];
  if (!t.arquivos && abaAtual === 'artigo') abaAtual = 'progresso';
  const conteudo = el('div', { id: 'conteudo-aba' });
  const barra = el('div', { class: 'abas' }, ...abas.map(([k, rot]) => el('button', {
    class: `aba ${k === abaAtual ? 'ativa' : ''}`,
    onclick: () => { abaAtual = k; renderizarTrabalho(t); },
    disabled: k === 'artigo' && !t.arquivos ? true : null,
  }, rot)));

  $('#principal').replaceChildren(...[bannerOrientador, cab, el('div', { class: 'cartao' }, barra, conteudo)].filter(Boolean));
  ({ progresso: abaProgresso, artigo: abaArtigo, orientador: abaOrientador, fontes: abaFontes, triagem: abaTriagem, busca: abaBusca, checklist: abaChecklist, tokens: abaTokens })[abaAtual](t, conteudo);
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
  const qtdRevisoes = (t.revisoes_orientador || []).length;

  if (qtdRevisoes > 0) {
    alvo.append(el('div', { class: 'alerta-versao-atualizada' },
      el('div', {},
        el('div', { style: 'font-weight: 700; color: #065f46; display: flex; align-items: center; gap: 6px; font-size: 14px;' },
          `✨ Artigo Atualizado — Versão Pós-Orientador Disponível (Rodada ${qtdRevisoes})`
        ),
        el('p', { class: 'pequeno', style: 'margin: 4px 0 0; color: var(--texto-2);' },
          'Todas as solicitações do parecer foram atendidas. Baixe o documento definitivo em Word (.docx):'
        )
      ),
      el('a', { class: 'btn-destaque-orientador pulsante', href: `/api/trabalhos/${t.id}/arquivos/artigo.docx?baixar=1` },
        `📥 Baixar .docx Atualizado (Rodada ${qtdRevisoes})`
      )
    ));
  }
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
    const qtd = (t.revisoes_orientador || []).length;
    const banner = qtd ? el('div', { class: 'banner-orientador', style: 'margin-bottom: 20px;' },
      el('div', { class: 'titulo-box' },
        el('div', { class: 'titulo-tag' }, `📄 Versão Atualizada pós-Orientador (Rodada ${qtd})`),
        el('div', { class: 'sub-tag' }, 'Todas as observações do parecer do orientador foram incorporadas ao manuscrito. Baixe a versão Word (.docx) formatada nas normas ABNT:')
      ),
      el('a', { class: 'btn-destaque-orientador', href: `/api/trabalhos/${t.id}/arquivos/artigo.docx?baixar=1` }, `📥 Baixar Word (.docx) Atualizado (Rodada ${qtd})`)
    ) : null;
    alvo.replaceChildren(...[banner, el('div', { class: 'artigo', html })].filter(Boolean));
  } catch (e) {
    alvo.replaceChildren(el('p', {}, e.message));
  }
}

function abaOrientador(t, alvo) {
  const semArtigo = !t.arquivos?.md;
  if (semArtigo) {
    alvo.append(
      el('div', { class: 'nota aviso' },
        el('b', {}, 'Artigo ainda não gerado: '),
        'A funcionalidade de devolutiva do orientador fica disponível assim que o artigo estiver pronto (após a etapa de Diagramação).'
      )
    );
    return;
  }

  const historico = t.revisoes_orientador || [];

  // 1. Banner explicativo
  const banner = el('div', { class: 'card-orientador-banner' },
    el('div', { class: 'icone-banner' }, '🎓'),
    el('div', {},
      el('h3', {}, 'Devolutiva e Correções do Orientador'),
      el('p', { class: 'pequeno' },
        'Após enviar o artigo ao seu orientador e receber críticas ou sugestões, lance o parecer dele abaixo. ',
        'A IA analisa os pontos apontados, reescreve com precisão apenas as seções afetadas (Introdução, Discussão, Conclusão, Resumo, etc.), ',
        'mantém todas as fontes científicas e referências Vancouver intactas, e gera uma nova versão em Word (.docx) nas normas ABNT com histórico completo.'
      )
    )
  );

  // 2. Formulário de envio da devolutiva
  const txtDevolutiva = el('textarea', {
    id: 'txt-devolutiva',
    rows: 6,
    placeholder: 'Exemplo de devolutiva do orientador:\n1. Na Introdução: enfatizar mais o cenário clínico no Brasil e ajustar o objetivo no último parágrafo para focar no risco residual.\n2. Na Discussão: no tópico de interpretação, suavizar a afirmação do parágrafo 3 pois os estudos são observacionais.\n3. Na Conclusão: ressaltar que os dados são de revisões observacionais e sugerir ensaios clínicos futuros.',
    required: true,
  });

  const txtInstrucoes = el('input', {
    type: 'text',
    id: 'txt-instrucoes-orientador',
    placeholder: 'Ex: Priorizar tom formal Qualis A1, manter o estilo conciso...',
  });

  const chkBackup = el('input', {
    type: 'checkbox',
    id: 'chk-backup-orientador',
    checked: true,
  });

  const msgStatus = el('div', { class: 'pequeno status-orientador', style: 'margin-top: 8px;' });

  const btnEnviar = el('button', {
    type: 'submit',
    class: 'btn primario',
    style: 'display: inline-flex; align-items: center; gap: 6px;',
  }, '🚀 Aplicar Correções do Orientador');

  const form = el('form', {
    class: 'form-orientador cartao-sub',
    onsubmit: async (ev) => {
      ev.preventDefault();
      const devolutiva = txtDevolutiva.value.trim();
      if (!devolutiva) return;

      if (!confirm(`Deseja aplicar as correções da devolutiva no artigo?\n\nUma nova versão (.docx e .md) será gerada mantendo um backup da versão atual.`)) {
        return;
      }

      btnEnviar.disabled = true;
      btnEnviar.textContent = '⏳ Processando correções com a IA...';
      msgStatus.innerHTML = '<span class="pulso-loading">Analisando parecer do orientador e aplicando modificações cirúrgicas... Por favor, aguarde alguns instantes.</span>';

      try {
        const res = await api(`/api/trabalhos/${t.id}/orientador`, {
          method: 'POST',
          body: JSON.stringify({
            devolutiva,
            instrucoes_adicionais: txtInstrucoes.value.trim(),
            criar_backup: chkBackup.checked,
            modo: 'cirurgico',
          }),
        });

        msgStatus.innerHTML = `<span style="color:var(--ok);font-weight:600;">✔ Rodada ${res.rodada} concluída! Word (.docx) atualizado.</span>`;
        txtDevolutiva.value = '';
        setTimeout(() => telaTrabalho(t.id), 800);
      } catch (err) {
        msgStatus.innerHTML = `<span style="color:var(--erro);font-weight:600;">Erro: ${err.message}</span>`;
        btnEnviar.disabled = false;
        btnEnviar.textContent = '🚀 Aplicar Correções do Orientador';
      }
    }
  },
    el('div', { class: 'campo' },
      el('label', { for: 'txt-devolutiva' }, el('b', {}, 'Parecer / Devolutiva de correções do orientador *')),
      txtDevolutiva,
      el('span', { class: 'ajuda' }, 'Cole o texto do e-mail, apontamentos, áudio transcrito ou lista de alterações pedidas pelo professor.')
    ),
    el('div', { class: 'campo' },
      el('label', { for: 'txt-instrucoes-orientador' }, 'Instruções adicionais suas para a IA (opcional)'),
      txtInstrucoes
    ),
    el('div', { style: 'display: flex; align-items: center; gap: 8px; margin: 10px 0;' },
      chkBackup,
      el('label', { for: 'chk-backup-orientador', style: 'margin: 0; cursor: pointer;' },
        'Salvar backup da versão atual em ', el('code', {}, 'versoes/'), ' antes de aplicar (permite restaurar a qualquer momento)'
      )
    ),
    el('div', { class: 'acoes' }, btnEnviar),
    msgStatus
  );

  // 3. Histórico de rodadas
  const containerHistorico = el('div', { class: 'historico-orientador' });

  if (historico.length) {
    containerHistorico.append(
      el('h3', { style: 'margin: 24px 0 12px; font-size: 16px; display: flex; align-items: center; gap: 8px;' },
        'Histórico de Rodadas Aplicadas',
        el('span', { class: 'selo ok' }, `${historico.length} rodada${historico.length > 1 ? 's' : ''}`)
      )
    );

    const cards = historico.slice().reverse().map((r) => {
      const secoesPills = (r.secoes_alteradas || []).map((alt) =>
        el('span', { class: 'chip ok' }, alt.secao)
      );

      const detalhesItens = (r.secoes_alteradas || []).map((alt) =>
        el('div', { class: 'item-detalhe-secao' },
          el('h4', { style: 'margin: 8px 0 4px; font-size: 14px; color: var(--primaria);' }, `📍 ${alt.secao}`),
          el('p', { class: 'pequeno', style: 'margin: 0 0 6px;' }, alt.resumo_mudancas),
          alt.detalhes?.length ? el('ul', { style: 'margin: 0; padding-left: 20px;' },
            ...alt.detalhes.map((d) => el('li', { class: 'pequeno' },
              el('b', {}, `${d.pedido_orientador || 'Pedido'}: `),
              d.como_foi_atendido || ''
            ))
          ) : null
        )
      );

      const isUltima = (idx === 0);
      const linkDocx = isUltima
        ? `/api/trabalhos/${t.id}/artigo.docx?baixar=1&_t=${Date.now()}`
        : (r.pasta_resultado
            ? `/api/trabalhos/${t.id}/arquivos/versoes/${r.pasta_resultado}/artigo.docx?baixar=1&_t=${Date.now()}`
            : (r.backup
                ? `/api/trabalhos/${t.id}/arquivos/versoes/${r.backup}/artigo.docx?baixar=1&_t=${Date.now()}`
                : `/api/trabalhos/${t.id}/artigo.docx?baixar=1&_t=${Date.now()}`));

      return el('div', { class: 'card-rodada cartao-sub' },
        el('div', { class: 'topo-rodada' },
          el('div', { style: 'display:flex; align-items:center; gap:10px;' },
            el('b', { style: 'font-size: 15px;' }, `Rodada ${r.rodada}`),
            el('span', { class: 'pequeno' }, dataHora(r.data)),
            r.modelo ? el('span', { class: 'chip' }, r.modelo) : null
          ),
          el('div', { style: 'display: flex; gap: 8px; flex-wrap: wrap;' },
            el('a', { class: 'btn primario pequeno', href: linkDocx, target: '_blank' }, `📥 Baixar .docx (R${r.rodada})`),
            r.backup ? el('button', {
              class: 'btn fantasma pequeno',
              onclick: async () => {
                if (!confirm(`Deseja restaurar a versão do backup "${r.backup}"?\n\nOs arquivos atuais serão substituídos pelo estado salvo nesta rodada.`)) return;
                try {
                  await api(`/api/trabalhos/${t.id}/orientador-restaurar`, {
                    method: 'POST',
                    body: JSON.stringify({ pasta: r.backup }),
                  });
                  alert('Versão restaurada com sucesso!');
                  telaTrabalho(t.id);
                } catch (e) {
                  alert(e.message);
                }
              }
            }, '↺ Restaurar esta versão') : null
          )
        ),
        el('div', { class: 'bloco-devolutiva-original' },
          el('span', { class: 'rotulo-pequeno' }, 'Devolutiva do orientador:'),
          el('blockquote', { class: 'citacao-devolutiva' }, r.devolutiva)
        ),
        r.resumo_parecer ? el('p', { class: 'pequeno', style: 'margin: 8px 0;' },
          el('b', {}, 'Síntese da IA: '), r.resumo_parecer
        ) : null,
        el('div', { style: 'display: flex; gap: 6px; align-items: center; margin: 10px 0; flex-wrap: wrap;' },
          el('span', { class: 'pequeno', style: 'font-weight: 600;' }, 'Seções alteradas:'),
          ...secoesPills
        ),
        detalhesItens.length ? el('details', { style: 'margin-top: 10px;' },
          el('summary', { style: 'cursor: pointer; font-size: 13px; color: var(--primaria);' }, 'Ver detalhamento das alterações por seção'),
          el('div', { style: 'padding: 8px 0;' }, ...detalhesItens)
        ) : null
      );
    });

    containerHistorico.append(...cards);
  } else {
    containerHistorico.append(
      el('p', { class: 'pequeno', style: 'margin-top: 20px;' },
        'Nenhuma devolutiva lançada ainda. Quando seu orientador revisar o artigo, cole as correções acima para atualizar o trabalho.'
      )
    );
  }

  alvo.append(banner, form, containerHistorico);
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
  const elementos = [
    el('p', {}, el('b', {}, `${c.aprovados} de ${c.total} itens automáticos aprovados.`), ' Itens marcados como manuais dependem de vocês.'),
    el('ul', { class: 'check' }, ...c.itens.map((i) => el('li', { class: i.manual && !i.ok ? 'man' : i.ok ? 'sim' : 'nao' },
      el('span', { class: 'ic' }, i.ok ? '✓' : i.manual ? '!' : '✗'), el('span', {}, i.item, i.manual ? el('span', { class: 'pequeno' }, ' (manual)') : null)))),
    t.auditoria?.pendentes?.length ? el('h3', { style: 'margin:20px 0 8px;font-size:14px' }, 'Pendências para revisão humana') : null,
    t.auditoria?.pendentes?.length ? el('ul', { class: 'check' }, ...t.auditoria.pendentes.map((p) => el('li', { class: 'nao' }, el('span', { class: 'ic' }, '!'),
      el('span', {}, el('b', {}, `${p.secao}: `), p.detalhe, el('div', { class: 'pequeno' }, `“${String(p.trecho).slice(0, 240)}”`))))) : null,
    (t.auditoria?.rodadas || []).length ? el('p', { class: 'pequeno' }, `Auditoria: ${t.auditoria.rodadas.map((r) => `rodada ${r.rodada} — ${r.problemas.length} problema(s), ${r.corrigidos} corrigido(s), ${r.removidos} removido(s)`).join(' · ')}`) : null,
  ].filter(Boolean);
  alvo.append(...elementos);
}

function abaTokens(t, alvo) {
  const llm = t.llm || {};
  const chamadas = llm.chamadas_detalhe || [];
  const modelos = llm.modelos || [];

  alvo.append(
    el('div', { class: 'cartao-metricas-grid' },
      el('div', { class: 'cartao-kpi' },
        el('span', { class: 'rotulo-kpi' }, 'Tokens de Entrada (Prompt)'),
        el('span', { class: 'valor-kpi' }, (llm.tokens_entrada || 0).toLocaleString('pt-BR')),
        el('span', { class: 'sub-kpi' }, 'Contexto, prompts e literatura enviada')),
      el('div', { class: 'cartao-kpi' },
        el('span', { class: 'rotulo-kpi' }, 'Tokens de Saída (Geração)'),
        el('span', { class: 'valor-kpi' }, (llm.tokens_saida || 0).toLocaleString('pt-BR')),
        el('span', { class: 'sub-kpi' }, 'Triagem, síntese e redação produzida')),
      el('div', { class: 'cartao-kpi' },
        el('span', { class: 'rotulo-kpi' }, 'Total de Tokens'),
        el('span', { class: 'valor-kpi' }, (llm.tokens_total || 0).toLocaleString('pt-BR')),
        el('span', { class: 'sub-kpi' }, `${llm.chamadas || 0} chamada(s) à IA no total`)),
      el('div', { class: 'cartao-kpi' },
        el('span', { class: 'rotulo-kpi' }, 'Custo Estimado'),
        el('span', { class: 'valor-kpi', style: 'color: var(--ok);' }, formatarUsd(llm.custo_usd || 0)),
        el('span', { class: 'sub-kpi' }, llm.custo_usd > 0 ? 'Faturado via provedor' : 'Nível gratuito / sem custo adicional'))),
  );

  alvo.append(
    el('div', { style: 'margin-bottom: 14px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;' },
      el('b', {}, 'Modelos empregados: '),
      ...(modelos.length ? modelos.map((m) => el('span', { class: 'chip' }, m)) : [el('span', { class: 'pequeno' }, 'Nenhum ainda.')]))
  );

  if (chamadas.length) {
    const linhas = chamadas.slice().reverse().map((c, i) => el('tr', {},
      el('td', {}, chamadas.length - i),
      el('td', { class: 'pequeno' }, dataHora(c.t)),
      el('td', {}, el('span', { class: 'mono' }, c.modelo?.split('/').pop() || c.modelo || '—')),
      el('td', {}, c.provedor || '—'),
      el('td', { style: 'text-align: right;' }, (c.tokens_entrada || 0).toLocaleString('pt-BR')),
      el('td', { style: 'text-align: right;' }, (c.tokens_saida || 0).toLocaleString('pt-BR')),
      el('td', { style: 'text-align: right; font-weight: 600;' }, (c.tokens_total || 0).toLocaleString('pt-BR')),
      el('td', { style: 'text-align: right;' }, formatarUsd(c.custo_usd || 0))
    ));

    alvo.append(
      el('h3', { style: 'margin: 18px 0 8px; font-size: 14px;' }, 'Histórico de Chamadas e Consumo de Tokens'),
      el('div', { class: 'tabela-rolagem' },
        el('table', { class: 'dados' },
          el('thead', {},
            el('tr', {},
              el('th', {}, '#'),
              el('th', {}, 'Horário'),
              el('th', {}, 'Modelo'),
              el('th', {}, 'Provedor'),
              el('th', { style: 'text-align: right;' }, 'Entrada'),
              el('th', { style: 'text-align: right;' }, 'Saída'),
              el('th', { style: 'text-align: right;' }, 'Total'),
              el('th', { style: 'text-align: right;' }, 'Custo')
            )),
          el('tbody', {}, ...linhas))));
  } else {
    alvo.append(el('p', { class: 'pequeno' }, 'O detalhamento de chamadas e tokens aparecerá à medida que os agentes forem acionados.'));
  }
}

function renderizarUsoOpenRouter(uso) {
  const container = $('#dados-uso-tokens');
  if (!container) return;
  const or = uso?.openrouter;
  const ds = uso?.deepseek;
  const gem = uso?.gemini;
  if ((!or || !or.ativo) && (!ds || !ds.ativo) && (!gem || !gem.ativo)) {
    container.replaceChildren(el('p', { class: 'pequeno' }, 'Nenhuma chave DeepSeek, Gemini ou OpenRouter configurada.'));
    return;
  }
  const itens = [];
  if (ds && ds.ativo) {
    const temSaldo = ds.saldo_total !== null;
    itens.push(el('div', { class: 'item-uso', style: 'grid-column: 1 / -1; text-align: left; background: rgba(59, 130, 246, 0.08); padding: 12px; border-radius: 8px;' },
      el('div', { style: 'display: flex; justify-content: space-between; align-items: baseline;' },
        el('span', { class: 'desc', style: 'font-weight: 700; color: var(--primaria);' }, 'DeepSeek API Oficial (Mais rápida & econômica)'),
        el('span', { class: 'val', style: 'font-size: 16px; color: var(--ok); font-weight: 700;' }, temSaldo ? `${ds.moeda} $${ds.saldo_total.toFixed(2)}` : 'Chave ativa')),
      el('span', { class: 'pequeno', style: 'display: block; margin-top: 4px;' },
        temSaldo
          ? `Origem: ${ds.origem} · Recarregado: $${ds.saldo_recarregado.toFixed(2)} · Concedido: $${ds.saldo_concedido.toFixed(2)} · Cache Hit: $0.014/M`
          : `Origem: ${ds.origem} · Não foi possível obter o saldo da conta.`)
    ));
  }
  if (gem && gem.ativo) {
    itens.push(el('div', { class: 'item-uso', style: 'grid-column: 1 / -1; text-align: left; background: rgba(16, 185, 129, 0.08); padding: 12px; border-radius: 8px;' },
      el('div', { style: 'display: flex; justify-content: space-between; align-items: baseline;' },
        el('span', { class: 'desc', style: 'font-weight: 700; color: #10b981;' }, `Google Gemini API (${gem.modelo || 'gemini-3.8-flash'})`),
        el('span', { class: 'val', style: 'font-size: 16px; color: var(--ok); font-weight: 700;' }, gem.total_gasto_usd > 0 ? `$${gem.total_gasto_usd.toFixed(2)} USD` : 'Ativo (Standard)')),
      el('span', { class: 'pequeno', style: 'display: block; margin-top: 4px;' },
        `Origem: ${gem.origem} · Tier: ${gem.tier} · Tokens: ${gem.tokens_total.toLocaleString('pt-BR')} · Custo real acumulado: $${gem.total_gasto_usd.toFixed(4)} USD`)
    ));
  }
  if (or && or.ativo) {
    if (or.is_free_tier && or.gratis_limite !== null) {
      const pct = or.gratis_limite > 0 ? Math.round((or.gratis_usadas / or.gratis_limite) * 100) : 0;
      itens.push(el('div', { class: 'item-uso', style: 'grid-column: 1 / -1; text-align: left;' },
        el('div', { style: 'display: flex; justify-content: space-between; align-items: baseline;' },
          el('span', { class: 'desc', style: 'font-weight: 600;' }, 'OpenRouter: Cota Diária de Modelos Gratuitos (:free)'),
          el('span', { class: 'val', style: 'font-size: 15px;' }, `${or.gratis_usadas} de ${or.gratis_limite} usadas hoje (${or.gratis_restantes} restantes)`)),
        el('div', { class: 'barra-progresso-trilha' },
          el('div', { class: 'barra-progresso-preenchimento', style: `width: ${pct}%; background: ${pct > 80 ? 'var(--aviso)' : 'var(--primaria)'}` })),
        el('span', { class: 'pequeno', style: 'margin-top: 4px; display: block;' }, 'Reseta automaticamente à meia-noite UTC.')
      ));
    }
    itens.push(el('div', { class: 'item-uso' },
      el('div', { class: 'val' }, `$${or.total_creditos_usd.toFixed(2)}`),
      el('div', { class: 'desc' }, 'Créditos OpenRouter')));
    itens.push(el('div', { class: 'item-uso' },
      el('div', { class: 'val' }, `$${or.total_gasto_usd.toFixed(4)}`),
      el('div', { class: 'desc' }, 'Gasto total OpenRouter')));
    itens.push(el('div', { class: 'item-uso' },
      el('div', { class: 'val', style: 'color: var(--ok);' }, `$${or.saldo_restante_usd.toFixed(2)}`),
      el('div', { class: 'desc' }, 'Saldo disponível')));
  }

  container.replaceChildren(...itens);
}

async function atualizarUsoPainel() {
  const statusMsg = $('#uso-status-msg');
  if (statusMsg) statusMsg.textContent = 'Consultando provedores…';
  try {
    const uso = await api('/api/uso');
    if (estadoGlobal) estadoGlobal.uso = uso;
    renderizarUsoOpenRouter(uso);
    if (statusMsg) statusMsg.textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR')}`;
  } catch (e) {
    if (statusMsg) statusMsg.textContent = `Erro ao consultar: ${e.message}`;
  }
}

// ------------------------------------------------------------------ configuracoes
$('#btn-config').addEventListener('click', async () => {
  await carregarStatus();
  const c = estadoGlobal?.config || {};
  $('#cfg-deepseek').value = '';
  $('#cfg-deepseek-origem').textContent = c.tem_deepseek ? `Chave configurada (${c.origem_deepseek}).` : 'Nenhuma chave configurada.';
  $('#cfg-modelo-deepseek').value = c.modelo_deepseek || 'deepseek-v4.1-flash';
  $('#cfg-modelo-deepseek-reasoner').value = c.modelo_deepseek_reasoner || 'deepseek-v4-reasoner';
  $('#cfg-gemini').value = '';
  $('#cfg-gemini-origem').textContent = c.tem_gemini ? `Chave configurada (${c.origem_gemini}).` : 'Nenhuma chave configurada.';
  $('#cfg-modelo-gemini').value = c.modelo_gemini || 'gemini-3.8-flash';
  if ($('#cfg-gemini-creditos')) $('#cfg-gemini-creditos').value = c.gemini_creditos_usd != null ? c.gemini_creditos_usd : '';
  $('#cfg-omniroute').value = c.omniroute_url || 'http://localhost:20128/v1';

  $('#cfg-openrouter').value = '';
  $('#cfg-anthropic').value = '';
  $('#cfg-ncbi').value = '';
  $('#cfg-openrouter-origem').textContent = c.tem_openrouter ? `Chave atual encontrada em: ${c.origem_openrouter}` : 'Nenhuma chave encontrada.';
  $('#cfg-modelo').value = c.modelo_openrouter || '';
  $('#cfg-email').value = c.contato_email || '';
  $('#cfg-janela').value = c.janela_navegador || 'visivel';
  renderizarUsoOpenRouter(estadoGlobal?.uso);
  const statusMsg = $('#uso-status-msg');
  if (statusMsg) statusMsg.textContent = '';
  $('#dlg-config').showModal();
});

$('#btn-atualizar-uso')?.addEventListener('click', (ev) => {
  ev.preventDefault();
  atualizarUsoPainel();
});

$('#dlg-config').addEventListener('close', async () => {
  if ($('#dlg-config').returnValue !== 'salvar') return;
  const corpo = {
    modelo_deepseek: $('#cfg-modelo-deepseek').value.trim(),
    modelo_deepseek_reasoner: $('#cfg-modelo-deepseek-reasoner').value.trim(),
    modelo_gemini: $('#cfg-modelo-gemini').value.trim(),
    gemini_creditos_usd: $('#cfg-gemini-creditos')?.value ? Number($('#cfg-gemini-creditos').value) : null,
    omniroute_url: $('#cfg-omniroute').value.trim(),
    modelo_openrouter: $('#cfg-modelo').value.trim(),
    contato_email: $('#cfg-email').value.trim(),
    janela_navegador: $('#cfg-janela').value,
  };
  for (const [id, k] of [
    ['#cfg-deepseek', 'deepseek_api_key'],
    ['#cfg-gemini', 'gemini_api_key'],
    ['#cfg-openrouter', 'openrouter_api_key'],
    ['#cfg-anthropic', 'anthropic_api_key'],
    ['#cfg-ncbi', 'ncbi_api_key']
  ]) {
    if ($(id).value.trim()) corpo[k] = $(id).value.trim();
  }
  try {
    await api('/api/config', { method: 'POST', body: JSON.stringify(corpo) });
    await carregarStatus(true);
  } catch (e) {
    alert(e.message);
  }
});

$('#btn-desligar')?.addEventListener('click', async () => {
  if (!confirm('Deseja realmente desligar o servidor do painel?\n\nPara iniciá-lo novamente, basta clicar duas vezes no ícone "Revisão Literatura IA" na sua Área de Trabalho.')) return;
  try {
    await fetch('/api/desligar', { method: 'POST' });
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;background:#0b0f17;text-align:center;padding:24px;">
        <div style="font-size:48px;margin-bottom:16px;">🛑</div>
        <h1 style="font-size:24px;font-weight:600;margin-bottom:8px;">Servidor Encerrado</h1>
        <p style="font-size:16px;color:#94a3b8;max-width:440px;line-height:1.5;">O painel foi desligado com sucesso e todos os recursos foram liberados.</p>
        <p style="font-size:14px;color:#64748b;margin-top:20px;">Para reabrir quando quiser, dê dois cliques no ícone <strong>Revisão Literatura IA</strong> na sua Área de Trabalho.</p>
      </div>
    `;
  } catch (e) {
    alert('Erro ao desligar: ' + e.message);
  }
});

window.addEventListener('hashchange', navegar);
await carregarStatus();
navegar();
setInterval(carregarLista, 10000);
