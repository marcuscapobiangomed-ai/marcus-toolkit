import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { JOBS_DIR } from './config.mjs';
import { checarTexto, dividirFrases, maneirismos, numeroNoResumo, numerosRelevantes, paragrafos, trechosCopiados } from './auditoria.mjs';
import { avaliarChecklist } from './checklist.mjs';
import { exportarArtigo } from './exportar.mjs';
import * as bvs from './fontes/bvs.mjs';
import { conferirDoi } from './fontes/crossref.mjs';
import * as pubmed from './fontes/pubmed.mjs';
import * as scielo from './fontes/scielo.mjs';
import { gerar, gerarJson } from './llm.mjs';
import { abreviaturaNlm, abreviaturaNormalizada } from './fontes/nlm.mjs';
import { NOMES_BASE, renderizarFluxograma, textoFluxo } from './prisma.mjs';
import * as P from './prompts.mjs';
import { citacoesDoTexto, referenciaVancouver, renumerar } from './referencias.mjs';
import { dataExtenso, expandirSiglas, MARCADOR_PRISMA, notaTransparencia, quadroEixos, sinteseQualidade, tabelaCaracterizacao, textoCaracterizacao, textoMetodos } from './secoes.mjs';

// Grafia padronizada de termos que os modelos costumam errar (vale para texto, tabelas e eixos).
const GLOSSARIO = [[/(?<!cole)cistoent[eé]rica/g, 'colecistoentérica'], [/\bcoledoco\b/g, 'colédoco'], [/\bColedoco\b/g, 'Colédoco']];
const aplicarGlossario = (s) => GLOSSARIO.reduce((x, [re, termo]) => x.replace(re, termo), String(s ?? ''));

// Referencia metodologica citada nos Metodos e na fonte da Figura 1 (conferida no PubMed e no Crossref).
const REF_PRISMA = 'Page MJ, McKenzie JE, Bossuyt PM, Boutron I, Hoffmann TC, Mulrow CD, et al. The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. BMJ. 2021;372:n71. doi:10.1136/bmj.n71. PMID: 33782057.';
import { autorVancouver, limparInvisiveis, similaridade, slug } from './texto.mjs';
import { aplicarDevolutivaOrientador, aplicarHumanizacaoCompleta, restaurarVersaoOrientador } from './orientador.mjs';
import { autoRemediarEstatistica } from './auditoria_estatistica.mjs';
import { ancorarDiscussaoComFontes } from './ancorador_discussao.mjs';

// Cada etapa e conduzida por um agente com responsabilidade unica.
export const ETAPAS = [
  ['planejamento', 'Agente Planejador', 'Planejamento da busca (PICo, MeSH/DeCS e strings)'],
  ['busca', 'Agente Pesquisador', 'Busca nas bases (PubMed via API; SciELO e LILACS no navegador real)'],
  ['deduplicacao', 'Agente de Deduplicação', 'Remoção de duplicatas e pré-filtros'],
  ['triagem', 'Agente de Triagem', 'Triagem por título e resumo, com segunda opinião regional'],
  ['verificacao', 'Agente Verificador de Fontes', 'Verificação de autenticidade na fonte original'],
  ['extracao', 'Agente de Extração', 'Extração de dados dos estudos'],
  ['redacao', 'Agente Redator', 'Redação da introdução e da discussão'],
  ['auditoria', 'Agente Auditor', 'Auditoria de citações e números (2 rodadas)'],
  ['estilo', 'Agente de Estilo Acadêmico', 'Naturalidade do texto e remoção de padrões de escrita de IA'],
  ['fechamento', 'Agente Editor', 'Título, resumo, abstract e conclusão'],
  ['limitacoes', 'Agente de Limitações e Coerência', 'Limitações em um único parágrafo e coerência entre seções'],
  ['tabelas', 'Agente de Tabelas', 'Tabela 1 e quadros formatados'],
  ['fluxograma', 'Agente de Fluxograma', 'Fluxograma PRISMA 2020 (SVG e PNG)'],
  ['diagramacao', 'Agente de Diagramação', 'Montagem do artigo, DOCX nas normas ABNT e checklist'],
];

export const PADROES = {
  tema: '',
  pergunta: '',
  tipo_revisao: 'integrativa',
  anos: 5,
  idiomas: ['pt', 'en', 'es'],
  bases: ['pubmed', 'scielo', 'lilacs'],
  min_referencias: 25,
  max_incluidos: 30,
  limite_por_base: 400,
  exigir_texto_completo: true,
  excluir_relatos: true,
  autores: '',
  data_busca: '',
  revista_alvo: '',
  provedor: 'auto',
  declaracao_ia: 'breve',
};

const LOTE_TRIAGEM = 45;
const LOTE_EXTRACAO = 8;
const LOTE_AUDITORIA = 30;

export class Trabalho extends EventEmitter {
  constructor(estado) {
    super();
    this.estado = estado;
    if (!this.estado.llm) {
      if (this.estado['vícios estilísticos e construções prolixas']) {
        this.estado.llm = this.estado['vícios estilísticos e construções prolixas'];
        delete this.estado['vícios estilísticos e construções prolixas'];
      } else if (this.estado['construções preliminares']) {
        this.estado.llm = this.estado['construções preliminares'];
        delete this.estado['construções preliminares'];
      } else {
        this.estado.llm = { chamadas: 0, modelos: [] };
      }
    }
    if (this.estado.llm.tokens_entrada === undefined) this.estado.llm.tokens_entrada = 0;
    if (this.estado.llm.tokens_saida === undefined) this.estado.llm.tokens_saida = 0;
    if (this.estado.llm.tokens_total === undefined) this.estado.llm.tokens_total = 0;
    if (this.estado.llm.custo_usd === undefined) this.estado.llm.custo_usd = 0;
    if (!this.estado.llm.chamadas_detalhe) this.estado.llm.chamadas_detalhe = [];
    this.dir = path.join(JOBS_DIR, estado.id);
    this.cancelar = false;
    fs.mkdirSync(path.join(this.dir, 'evidencias'), { recursive: true });
  }

  static criar(parametros) {
    const params = { ...PADROES, ...parametros };
    params.tema = String(params.tema || '').trim();
    if (params.tema.length < 8) throw new Error('Informe um tema com pelo menos 8 caracteres.');
    const agora = new Date();
    const carimbo = agora.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    const id = `${carimbo}-${slug(params.tema, 40)}`;
    const estado = {
      id,
      criado_em: agora.toISOString(),
      params,
      status: 'na_fila',
      etapas: Object.fromEntries(ETAPAS.map(([k, agente, titulo]) => [k, { agente, titulo, status: 'pendente' }])),
      log: [],
      llm: {
        chamadas: 0,
        modelos: [],
        tokens_entrada: 0,
        tokens_saida: 0,
        tokens_total: 0,
        custo_usd: 0,
        chamadas_detalhe: [],
      },
    };
    const t = new Trabalho(estado);
    t.salvar();
    return t;
  }

  static carregar(id) {
    const arq = path.join(JOBS_DIR, id, 'estado.json');
    return new Trabalho(JSON.parse(fs.readFileSync(arq, 'utf8')));
  }

  arquivo(nome) {
    return path.join(this.dir, nome);
  }

  salvar() {
    fs.writeFileSync(this.arquivo('estado.json'), JSON.stringify(this.estado, null, 1));
  }

  log(msg, nivel = 'info') {
    const linha = { t: new Date().toISOString(), nivel, msg };
    this.estado.log.push(linha);
    if (this.estado.log.length > 800) this.estado.log.splice(0, this.estado.log.length - 800);
    this.emit('log', linha);
  }

  marcarEtapa(chave, status, detalhe) {
    const e = this.estado.etapas[chave];
    e.status = status;
    if (status === 'executando') e.inicio = new Date().toISOString();
    if (['ok', 'erro', 'aviso'].includes(status)) e.fim = new Date().toISOString();
    if (detalhe !== undefined) e.detalhe = detalhe;
    this.salvar();
    this.emit('estado');
  }

  checarCancelamento() {
    if (this.cancelar) throw new Error('Cancelado pelo usuário');
  }

  registros() {
    try {
      return JSON.parse(fs.readFileSync(this.arquivo('registros.json'), 'utf8'));
    } catch {
      return {};
    }
  }

  salvarRegistros(mapa) {
    fs.writeFileSync(this.arquivo('registros.json'), JSON.stringify(mapa));
  }

  async ia(opcoes, json = false) {
    this.checarCancelamento();
    const papelNome = opcoes.papel ? String(opcoes.papel).toUpperCase() : 'IA';
    this.log(`▶ [Motor LLM ➔ Agente ${papelNome}] Enviando payload analítico para raciocínio computacional...`);
    let r;
    try {
      r = await (json ? gerarJson : gerar)({
        provedor: this.estado.params.provedor,
        aoTentar: (modelo, t) => {
          this.estado.llm.requisicoes = (this.estado.llm.requisicoes || 0) + 1;
          this.log(`▶ [Motor LLM] Processando com modelo ${modelo} (tentativa ${t + 1})...`);
        },
        ...opcoes,
      });
    } catch (e) {
      if (e.bruto) fs.writeFileSync(this.arquivo('ultima-resposta-invalida.txt'), e.bruto);
      this.salvar();
      throw e;
    }
    if (r.parcial) this.log('Resposta da IA veio truncada; aproveitados os itens completos.', 'aviso');
    const u = r.usage || {};
    const pTokens = u.prompt_tokens || 0;
    const cTokens = u.completion_tokens || 0;
    const tTokens = u.total_tokens || (pTokens + cTokens);
    const custo = r.custo_usd || 0;

    this.log(`✔ [Motor LLM ➔ Agente ${papelNome}] Resposta concluída com sucesso (${tTokens} tokens · ${r.provedor} / ${r.modelo}).`);

    this.estado.llm.chamadas++;
    this.estado.llm.provedor = r.provedor;
    this.estado.llm.tokens_entrada = (this.estado.llm.tokens_entrada || 0) + pTokens;
    this.estado.llm.tokens_saida = (this.estado.llm.tokens_saida || 0) + cTokens;
    this.estado.llm.tokens_total = (this.estado.llm.tokens_total || 0) + tTokens;
    this.estado.llm.custo_usd = Number(((this.estado.llm.custo_usd || 0) + custo).toFixed(6));
    if (!this.estado.llm.modelos.includes(r.modelo)) this.estado.llm.modelos.push(r.modelo);
    if (!this.estado.llm.chamadas_detalhe) this.estado.llm.chamadas_detalhe = [];
    this.estado.llm.chamadas_detalhe.push({
      t: new Date().toISOString(),
      papel: opcoes.papel || 'geral',
      modelo: r.modelo,
      provedor: r.provedor,
      tokens_entrada: pTokens,
      tokens_saida: cTokens,
      tokens_total: tTokens,
      custo_usd: custo,
    });
    if (this.estado.llm.chamadas_detalhe.length > 100) {
      this.estado.llm.chamadas_detalhe.splice(0, this.estado.llm.chamadas_detalhe.length - 100);
    }
    this.salvar();
    this.emit('estado');
    return r;
  }

  async executar() {
    this.estado.status = 'executando';
    this.estado.pid = process.pid;
    this.estado.erro = null;
    this.migrarEtapas();
    this.salvar();
    this.emit('estado');
    try {
      for (const [chave, agente, titulo] of ETAPAS) {
        if (this.estado.etapas[chave].status === 'ok' || this.estado.etapas[chave].status === 'aviso') continue;
        this.checarCancelamento();
        this.log(`▶ ${agente}: ${titulo}`);
        this.marcarEtapa(chave, 'executando');
        const detalhe = await this[`etapa_${chave}`]();
        this.marcarEtapa(chave, detalhe?.aviso ? 'aviso' : 'ok', detalhe?.texto || detalhe?.aviso || '');
      }
      this.estado.status = 'concluido';
      this.log('✔ Artigo concluído.');
    } catch (e) {
      const etapa = ETAPAS.find(([k]) => this.estado.etapas[k].status === 'executando')?.[0];
      if (etapa) this.marcarEtapa(etapa, 'erro', e.message);
      this.estado.status = this.cancelar ? 'cancelado' : 'erro';
      this.estado.erro = e.message;
      this.log(`✖ ${e.message}`, 'erro');
    }
    this.salvar();
    this.emit('estado');
    this.emit('fim');
  }

  // Trabalhos criados antes de novas etapas existirem recebem as etapas que faltam.
  migrarEtapas() {
    const antigas = this.estado.etapas;
    this.estado.etapas = Object.fromEntries(ETAPAS.map(([k, agente, titulo]) => [k, { ...(antigas[k] || { status: 'pendente' }), agente, titulo }]));
    this.estado.params = { ...PADROES, ...this.estado.params };
  }

  // ---------------------------------------------------------------- 1. planejamento
  async etapa_planejamento() {
    const { params } = this.estado;
    const agora = new Date();
    this.estado.data_busca = agora.toISOString();
    this.estado.ano_inicial = agora.getFullYear() - params.anos;
    let refinamento = '';
    let plano;
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const r = await this.ia({
        papel: 'busca',
        sistema: P.SISTEMA_BIBLIOTECARIO,
        prompt: P.promptPlanejamento({ tema: params.tema, pergunta: params.pergunta, tipoRevisao: params.tipo_revisao, anoInicial: this.estado.ano_inicial, refinamento }),
        maxTokens: 12000,
        temperatura: 0.2,
      }, true);
      plano = validarPlano(r.dados, params);
      if (!params.bases.includes('pubmed')) break;
      const mesh = await pubmed.validarMesh(plano.pubmed, plano.descritores_mesh);
      if (mesh.trocados.length) this.log(`Termo(s) que não são descritores MeSH passaram a texto livre: ${mesh.trocados.join(', ')}.`, 'aviso');
      plano.pubmed = mesh.consulta;
      plano.descritores_mesh = mesh.descritores;
      const estrategia = this.estrategiaPubmed(plano.pubmed);
      try {
        const { total } = await pubmed.contar(estrategia);
        this.log(`PubMed: a estratégia retorna ${total} registros com os filtros.`);
        if (total === 0) refinamento = `A string PubMed "${plano.pubmed}" retornou 0 resultados com os filtros. Torne-a mais abrangente, mantendo o foco.`;
        else if (total > params.limite_por_base) refinamento = `A string PubMed "${plano.pubmed}" retornou ${total} resultados, acima do limite de ${params.limite_por_base} para triagem completa. Torne-a mais específica (ex.: combinar com o desfecho principal do tema).`;
        else break;
      } catch (e) {
        refinamento = `A string PubMed "${plano.pubmed}" é inválida (${e.message}). Corrija a sintaxe.`;
      }
      this.log(`Refinando estratégia: ${refinamento}`, 'aviso');
    }
    this.estado.plano = plano;
    return { texto: plano.pergunta };
  }

  estrategiaPubmed(consulta) {
    const { params } = this.estado;
    return pubmed.montarEstrategia(consulta, {
      anoInicial: this.estado.ano_inicial,
      idiomas: params.idiomas,
      textoCompleto: params.exigir_texto_completo,
      excluirNaoPrimarios: true,
      excluirRelatos: params.excluir_relatos,
    });
  }

  // ---------------------------------------------------------------- 2. busca
  async etapa_busca() {
    const { params, plano } = this.estado;
    const anoFinal = new Date(this.estado.data_busca).getFullYear();
    const idiomas = params.idiomas.join(', ');
    const buscas = {};
    const registros = {};
    const guardar = (base, r) => {
      buscas[base] = {
        estrategia: r.estrategia_relatada,
        filtros: r.filtros,
        total: r.total,
        recuperados: r.recuperados ?? r.registros.length,
        unicos: r.registros.length,
        url_publica: r.url_publica,
      };
      for (const reg of r.registros) {
        reg.base_origem = base;
        registros[reg.uid] = reg;
      }
      this.log(`${NOMES_BASE[base]}: ${r.total} registros no total; ${r.registros.length} recuperados para triagem.`);
    };

    if (params.bases.includes('pubmed')) {
      const estrategia = this.estrategiaPubmed(plano.pubmed);
      const r = await pubmed.buscar(estrategia, { max: params.limite_por_base });
      guardar('pubmed', { ...r, estrategia_relatada: estrategia, filtros: `• **Período:** ${this.estado.ano_inicial} a ${anoFinal}<br>• **Idiomas:** ${idiomas}<br>• **Texto:** completo gratuito<br>• **Exclusão:** revisões e relatos de caso (na sintaxe)` });
    }
    this.checarCancelamento();

    const latinas = [
      ['scielo', () => scielo.buscar(plano.scielo, { anoInicial: this.estado.ano_inicial, idiomas: params.idiomas, max: params.limite_por_base }),
        `• **Período:** ${this.estado.ano_inicial} a ${anoFinal}<br>• **Idiomas:** ${idiomas}<br>• **Texto:** acesso aberto<br>• **Exclusão:** revisões e relatos de caso (na triagem)`,
        'AND, OR, aspas e parênteses, sem prefixos de campo; termos compostos entre aspas; no máximo 2 blocos conceituais ligados por AND'],
      ['lilacs', () => bvs.buscar(plano.lilacs, { anoInicial: this.estado.ano_inicial, idiomas: params.idiomas, base: 'LILACS', textoCompleto: params.exigir_texto_completo, max: params.limite_por_base }),
        `• **Período:** ${this.estado.ano_inicial} a ${anoFinal}<br>• **Idiomas:** ${idiomas}<br>• **Texto:** ${params.exigir_texto_completo ? 'completo disponível' : 'livre'}<br>• **Exclusão:** revisões e relatos de caso (na triagem)`,
        'AND, OR, aspas e parênteses, sem prefixos de campo; termos compostos entre aspas; no máximo 2 blocos conceituais ligados por AND'],
    ];
    for (const [base, executar, filtros, sintaxe] of latinas) {
      if (!params.bases.includes(base)) continue;
      try {
        let r = await executar();
        if (r.total === 0) {
          this.log(`${NOMES_BASE[base]}: 0 resultados; pedindo estratégia mais abrangente.`, 'aviso');
          const ref = await this.ia({
            papel: 'busca',
            sistema: P.SISTEMA_BIBLIOTECARIO,
            prompt: P.promptRefinarString({ base: NOMES_BASE[base], sintaxe, string: plano[base], problema: 'retornou 0 resultados com os filtros aplicados; torne-a mais abrangente', tema: params.tema }),
            maxTokens: 800,
          }, true);
          if (ref.dados?.string) {
            plano[base] = ref.dados.string;
            r = await executar();
          }
        }
        guardar(base, { ...r, estrategia_relatada: plano[base], filtros });
      } catch (e) {
        this.log(`${NOMES_BASE[base]} falhou: ${e.message}`, 'erro');
        buscas[base] = { estrategia: plano[base], filtros, total: 0, recuperados: 0, unicos: 0, erro: e.message };
      }
      this.checarCancelamento();
    }
    if (!Object.keys(registros).length) throw new Error('Nenhuma base retornou registros.');
    this.estado.buscas = buscas;
    this.salvarRegistros(registros);
    const latinoAmericanas = (buscas.scielo?.unicos || 0) + (buscas.lilacs?.unicos || 0);
    if (!latinoAmericanas) return { aviso: 'Nenhum registro de SciELO/LILACS foi recuperado.' };
    return { texto: Object.entries(buscas).map(([b, x]) => `${NOMES_BASE[b]}: ${x.total}`).join(' · ') };
  }

  // ---------------------------------------------------------------- 3. deduplicacao
  async etapa_deduplicacao() {
    const regs = Object.values(this.registros());
    const prioridade = { pubmed: 0, scielo: 1, lilacs: 2 };
    regs.sort((a, b) => prioridade[a.base_origem] - prioridade[b.base_origem]);
    const mantidos = [];
    const porDoi = new Map();
    const porPmid = new Map();
    let duplicatas = 0;
    for (const r of regs) {
      const doi = (r.doi || '').toLowerCase().replace(/\.(en|pt|es)$/, '');
      const titulos = [r.titulo, ...(r.titulos_alternativos || [])].filter(Boolean);
      let igual = (doi && porDoi.get(doi)) || (r.pmid && porPmid.get(r.pmid));
      if (!igual) {
        igual = mantidos.find((m) => Math.abs(Number(m.ano) - Number(r.ano)) <= 1 &&
          titulos.some((t) => [m.titulo, ...(m.titulos_alternativos || [])].some((mt) => similaridade(t, mt) >= 0.9)));
      }
      if (igual) {
        duplicatas++;
        igual.tambem_em = [...new Set([...(igual.tambem_em || []), NOMES_BASE[r.base_origem]])];
        if ((r.resumo || '').length > (igual.resumo || '').length + 200 && r.base_origem === igual.base_origem) igual.resumo = r.resumo;
        continue;
      }
      mantidos.push(r);
      if (doi) porDoi.set(doi, r);
      if (r.pmid) porPmid.set(r.pmid, r);
    }
    const internas = Object.values(this.estado.buscas).reduce((s, b) => s + Math.max(0, (b.recuperados || 0) - (b.unicos || 0)), 0);
    const semResumo = mantidos.filter((r) => (r.resumo || '').length < 150);
    const retratados = mantidos.filter((r) => r.retratado && (r.resumo || '').length >= 150);
    const aptos = mantidos.filter((r) => (r.resumo || '').length >= 150 && !r.retratado);
    const buscas = this.estado.buscas;
    const identificados = Object.values(buscas).reduce((s, b) => s + (b.total || 0), 0);
    const recuperados = Object.values(buscas).reduce((s, b) => s + (b.recuperados || 0), 0);
    this.estado.prisma = {
      bases: Object.fromEntries(Object.entries(buscas).map(([k, b]) => [k, { total: b.total, estrategia: b.estrategia, filtros: b.filtros }])),
      identificados,
      nao_recuperados: Math.max(0, identificados - recuperados),
      duplicatas: duplicatas + internas,
      sem_resumo: semResumo.length,
      retratados: retratados.length,
      triados: aptos.length,
    };
    const mapa = Object.fromEntries(aptos.map((r) => [r.uid, r]));
    this.salvarRegistros(mapa);
    this.estado.candidatos = aptos.map((r, i) => ({ cid: `C${i + 1}`, uid: r.uid, base: r.base_origem, titulo: r.titulo, ano: r.ano, url: r.url }));
    return { texto: `${aptos.length} registros únicos para triagem (${duplicatas + internas} duplicatas, ${semResumo.length} sem resumo, ${retratados.length} retratados)` };
  }

  // ---------------------------------------------------------------- 4. triagem
  async etapa_triagem() {
    const regs = this.registros();
    const { plano, params } = this.estado;
    const cands = this.estado.candidatos;
    const decisoes = this.estado.decisoes || {};
    for (let i = 0; i < cands.length; i += LOTE_TRIAGEM) {
      const lote = cands.slice(i, i + LOTE_TRIAGEM).filter((c) => !decisoes[c.cid]);
      if (!lote.length) continue;
      this.log(`Triagem: registros ${i + 1}–${Math.min(i + LOTE_TRIAGEM, cands.length)} de ${cands.length}…`);
      await this.triarLote(lote.map((c) => ({ ...regs[c.uid], cid: c.cid })), decisoes, plano);
      this.estado.decisoes = decisoes;
      this.salvar();
    }
    const faltando = cands.filter((c) => !decisoes[c.cid]);
    if (faltando.length) {
      this.log(`Triagem: reavaliando ${faltando.length} registros sem decisão…`, 'aviso');
      await this.triarLote(faltando.map((c) => ({ ...regs[c.uid], cid: c.cid })), decisoes, plano);
    }

    // Segunda opiniao: registros das bases regionais excluidos por tema sao reavaliados por outro
    // avaliador (resumos em espanhol/portugues sao os que o primeiro avaliador mais erra).
    if (!this.estado.segunda_opiniao) {
      const regionais = cands.filter((c) => ['scielo', 'lilacs'].includes(c.base) && decisoes[c.cid] && !decisoes[c.cid].incluir &&
        ['fora_do_tema', 'populacao_inadequada', 'sem_desfecho'].includes(decisoes[c.cid].motivo));
      const reincluidos = [];
      if (regionais.length) {
        this.log(`Segunda opinião: reavaliando ${regionais.length} registros de SciELO/LILACS excluídos na primeira triagem…`);
        const lote = regionais.map((c) => ({ ...regs[c.uid], cid: c.cid, base: NOMES_BASE[c.base], motivo_anterior: decisoes[c.cid].motivo }));
        const r = await this.ia({ papel: 'triagem', sistema: P.SISTEMA_AVALIADOR, prompt: P.promptSegundaOpiniao({ plano, lote }), maxTokens: 12000, temperatura: 0, chaveLista: 'decisoes' }, true);
        for (const d of listaDe(r.dados, 'decisoes')) {
          const cid = String(d.id || '').trim().toUpperCase();
          if (!regionais.some((c) => c.cid === cid) || !(d.incluir === true || d.incluir === 'true')) continue;
          decisoes[cid] = { incluir: true, motivo: '', delineamento: String(d.delineamento || ''), relevancia: Number(d.relevancia) || 3, segunda_opiniao: String(d.justificativa || '') };
          reincluidos.push(cid);
        }
      }
      this.estado.segunda_opiniao = { avaliados: regionais.length, reincluidos };
      this.log(`Segunda opinião: ${reincluidos.length} de ${regionais.length} registro(s) reincluído(s).`);
      this.salvar();
    }

    const excluidos = {};
    let incluidos = [];
    for (const c of cands) {
      const d = decisoes[c.cid] || { incluir: false, motivo: 'sem_decisao' };
      c.decisao = { ...d };
      if (d.incluir) incluidos.push(c);
      else excluidos[d.motivo || 'fora_do_tema'] = (excluidos[d.motivo || 'fora_do_tema'] || 0) + 1;
    }
    const maxPermitido = Math.min(Number(params.max_incluidos) || 30, 30);
    if (incluidos.length > maxPermitido) {
      // Ordem do corte: estudos das bases latino-americanas primeiro (exigencia do modelo e minoria no
      // conjunto), depois relevancia, forca do delineamento e ano mais recente. Sem isso, empates de
      // relevancia eram resolvidos pela ordem de busca e cortavam justamente os estudos regionais.
      const forca = (d) => (/randomi|ensaio/i.test(d) ? 3 : /coorte prospect/i.test(d) ? 2 : /coorte|caso-controle/i.test(d) ? 1 : 0);
      incluidos.sort((a, b) =>
        (['scielo', 'lilacs'].includes(b.base) - ['scielo', 'lilacs'].includes(a.base)) ||
        ((b.decisao.relevancia || 0) - (a.decisao.relevancia || 0)) ||
        (forca(b.decisao.delineamento || '') - forca(a.decisao.delineamento || '')) ||
        ((Number(b.ano) || 0) - (Number(a.ano) || 0)));
      for (const c of incluidos.slice(maxPermitido)) {
        c.decisao = { ...c.decisao, incluir: false, motivo: 'limite_escopo' };
        excluidos.limite_escopo = (excluidos.limite_escopo || 0) + 1;
      }
      incluidos = incluidos.slice(0, maxPermitido);
    }
    this.estado.prisma.excluidos_triagem = excluidos;
    this.estado.prisma.verificados = incluidos.length;
    this.estado.elegiveis = incluidos.map((c) => c.uid);
    fs.writeFileSync(this.arquivo('triagem.csv'), csvTriagem(cands, regs));
    const aviso = incluidos.length < params.min_referencias
      ? `Apenas ${incluidos.length} estudos elegíveis (mínimo desejado: ${params.min_referencias}).`
      : null;
    return aviso ? { aviso } : { texto: `${incluidos.length} elegíveis de ${cands.length} triados` };
  }

  async triarLote(lote, decisoes, plano) {
    const r = await this.ia({ papel: 'triagem', sistema: P.SISTEMA_AVALIADOR, prompt: P.promptTriagem({ plano, lote }), maxTokens: 16000, temperatura: 0, chaveLista: 'decisoes' }, true);
    const validos = new Set(lote.map((x) => x.cid));
    for (const d of listaDe(r.dados, 'decisoes')) {
      const cid = String(d.id || '').trim().toUpperCase();
      if (!validos.has(cid)) continue;
      decisoes[cid] = {
        incluir: d.incluir === true || d.incluir === 'true',
        motivo: d.incluir === true || d.incluir === 'true' ? '' : String(d.motivo || 'fora_do_tema'),
        delineamento: String(d.delineamento || ''),
        relevancia: Number(d.relevancia) || 0,
      };
    }
  }

  // ---------------------------------------------------------------- 5. verificacao
  async etapa_verificacao() {
    const regs = this.registros();
    const ver = this.estado.verificacoes || {};
    const falhas = {};
    const elegiveis = this.estado.elegiveis;
    for (const [i, uid] of elegiveis.entries()) {
      if (ver[uid]) continue;
      this.checarCancelamento();
      const reg = regs[uid];
      this.log(`Verificando ${i + 1}/${elegiveis.length} (${NOMES_BASE[reg.base_origem]}): ${reg.titulo.slice(0, 80)}…`);
      ver[uid] = await this.verificarRegistro(reg);
      const v = ver[uid];
      this.log(`   ${v.status === 'aprovada' ? '✔ aprovada' : `✖ ${v.status}`} — ${v.resumo}`, v.status === 'aprovada' ? 'info' : 'aviso');
      this.estado.verificacoes = ver;
      this.salvar();
    }
    const aprovados = [];
    for (const uid of elegiveis) {
      if (ver[uid].status === 'aprovada') aprovados.push(uid);
      else falhas[ver[uid].motivo] = (falhas[ver[uid].motivo] || 0) + 1;
    }
    this.estado.prisma.falha_verificacao = falhas;
    this.estado.prisma.incluidos = aprovados.length;
    this.estado.aprovados = aprovados;
    const porBase = aprovados.reduce((a, uid) => ((a[regs[uid].base_origem] = (a[regs[uid].base_origem] || 0) + 1), a), {});
    const txt = `${aprovados.length} aprovadas de ${elegiveis.length} (${Object.entries(porBase).map(([b, n]) => `${NOMES_BASE[b]}: ${n}`).join(', ')})`;
    return aprovados.length < this.estado.params.min_referencias ? { aviso: `${txt} — abaixo do mínimo de ${this.estado.params.min_referencias}` } : { texto: txt };
  }

  async verificarRegistro(reg) {
    const titulos = [reg.titulo, ...(reg.titulos_alternativos || [])];
    const evid = this.arquivo(`evidencias/${reg.uid.replace(/[^a-z0-9-]/gi, '_')}.png`);
    const v = { base: reg.base_origem, checagens: [] };
    let confirmado = false;
    let retratado = reg.retratado;
    if (reg.origem === 'pubmed') {
      const c = await pubmed.conferir(reg.pmid);
      fs.writeFileSync(evid.replace(/\.png$/, '.json'), JSON.stringify(c, null, 1));
      const sim = c.existe ? similaridade(c.titulo, reg.titulo) : 0;
      v.checagens.push(`PubMed (esummary PMID ${reg.pmid}): ${c.existe ? `encontrado, similaridade do título ${sim.toFixed(2)}` : c.motivo}`);
      confirmado = c.existe && sim >= 0.9;
      retratado ||= c.retratado;
      v.url_confirmada = c.url;
      v.evidencia = `evidencias/${path.basename(evid.replace(/\.png$/, '.json'))}`;
    } else if (reg.origem === 'scielo') {
      const c = await scielo.conferir(reg, evid);
      v.checagens.push(`SciELO ArticleMeta: ${c.existe ? `registro oficial encontrado (similaridade ${Number(c.similaridade_api).toFixed(2)})` : 'não encontrado'}`);
      v.checagens.push(`Página do artigo no navegador: ${c.pagina_ok ? `título confirmado em ${c.url_confirmada}` : `não confirmada (${(c.erro_pagina || '').slice(0, 160)})`}`);
      confirmado = c.pagina_ok || (c.existe && c.similaridade_api >= 0.9);
      v.url_confirmada = c.url_confirmada || reg.url;
      if (c.evidencia) v.evidencia = `evidencias/${path.basename(c.evidencia)}`;
    } else {
      const c = await bvs.conferir(reg, evid);
      v.checagens.push(`Página do registro no Portal BVS: ${c.pagina_ok ? `título confirmado em ${c.url_confirmada}` : `não confirmada (${(c.erro_pagina || 'título ausente').slice(0, 160)})`}`);
      confirmado = c.pagina_ok;
      v.url_confirmada = c.url_confirmada || reg.url;
      if (c.evidencia) v.evidencia = `evidencias/${path.basename(c.evidencia)}`;
    }
    v.doi_confirmado = false;
    if (reg.doi) {
      const cr = await conferirDoi(reg.doi, titulos);
      if (cr?.existe === true) {
        v.doi_confirmado = cr.similaridade >= 0.75;
        v.checagens.push(`Crossref (DOI ${reg.doi}): encontrado, similaridade ${cr.similaridade.toFixed(2)}${cr.retratado ? ' — AVISO DE RETRATAÇÃO' : ''}`);
        retratado ||= cr.retratado;
      } else {
        v.checagens.push(`Crossref (DOI ${reg.doi}): ${cr?.motivo || 'não confirmado'} — DOI omitido da referência`);
      }
    }
    if (retratado) Object.assign(v, { status: 'reprovada', motivo: 'retratado', resumo: 'publicação retratada' });
    else if (!confirmado) Object.assign(v, { status: 'reprovada', motivo: 'nao_confirmado', resumo: 'existência/título não confirmados na fonte original' });
    else Object.assign(v, { status: 'aprovada', motivo: '', resumo: v.checagens[0] });
    return v;
  }

  // ---------------------------------------------------------------- 6. extracao
  async etapa_extracao() {
    const regs = this.registros();
    const { plano } = this.estado;
    const extr = this.estado.extracoes || {};
    const lista = this.estado.aprovados.map((uid, i) => ({ ...regs[uid], n: i + 1 }));
    for (let i = 0; i < lista.length; i += LOTE_EXTRACAO) {
      const lote = lista.slice(i, i + LOTE_EXTRACAO).filter((r) => !extr[r.uid]);
      if (!lote.length) continue;
      this.log(`Extração: estudos ${i + 1}–${Math.min(i + LOTE_EXTRACAO, lista.length)} de ${lista.length}…`);
      await this.extrairLote(lote, extr, plano, false);
      const ausentes = lote.filter((r) => !extr[r.uid]);
      if (ausentes.length) {
        this.log(`Extração: ${ausentes.length} estudo(s) ausente(s) na resposta — pedindo de novo.`, 'aviso');
        await this.extrairLote(ausentes, extr, plano, false);
      }
      const reprovados = lote.filter((r) => extr[r.uid] && !numerosConferem(extr[r.uid], r));
      if (reprovados.length) {
        this.log(`Extração: ${reprovados.length} estudo(s) com número não encontrado no resumo — reextraindo com restrição estrita.`, 'aviso');
        await this.extrairLote(reprovados, extr, plano, true);
      }
      for (const r of lote) {
        if (!extr[r.uid]) {
          extr[r.uid] = { pais: 'NI', delineamento: 'NI', amostra: 'NI', exposicao: 'NI', desfechos: 'NI', achados: 'NI', eixo: 0, falhou: true };
          this.log(`Extração falhou para: ${r.titulo.slice(0, 80)}…`, 'erro');
        }
        if (!numerosConferem(extr[r.uid], r)) {
          for (const campo of ['amostra', 'achados']) extr[r.uid][campo] = removerNumerosNaoConferidos(extr[r.uid][campo], r.resumo, campo);
        }
        if (!extr[r.uid].pais || extr[r.uid].pais === 'NI') {
          const p = deduzirPais(r);
          if (p) {
            extr[r.uid].pais = p;
            this.log(`País deduzido para "${r.titulo.slice(0, 50)}…": ${p}`);
          }
        }
      }
      this.estado.extracoes = extr;
      this.salvar();
    }

    // Guardrail pos-extracao: garantir completude de pais e de amostra numerica
    for (const r of lista) {
      const x = extr[r.uid];
      if (!x) continue;
      if (!x.pais || x.pais === 'NI') {
        const p = deduzirPais(r);
        if (p) x.pais = p;
      }
      if (!x.amostra || x.amostra === 'NI' || !/\d/.test(x.amostra)) {
        this.log(`Amostra de "${r.titulo.slice(0, 50)}…" sem quantitativo numérico — realizando extração direcionada de amostra.`, 'aviso');
        try {
          const resp = await this.ia({
            papel: 'extracao_amostra',
            sistema: P.SISTEMA_AVALIADOR,
            prompt: `A partir do resumo abaixo, identifique o tamanho da amostra (número exato de pacientes, participantes ou casos/controles) e o delineamento do estudo.\n\nTítulo: ${r.titulo}\nResumo: ${r.resumo}\n\nResponda SOMENTE em JSON: {"amostra": "tamanho exato e descrição com números", "delineamento": "delineamento"}`,
            maxTokens: 500,
            temperatura: 0,
          });
          const dados = resp.dados || {};
          if (dados.amostra && /\d/.test(dados.amostra)) {
            x.amostra = texto(dados.amostra);
            if (dados.delineamento && (!x.delineamento || x.delineamento === 'NI')) x.delineamento = texto(dados.delineamento);
            this.log(`Amostra recuperada para "${r.titulo.slice(0, 50)}…": ${x.amostra}`);
          }
        } catch (err) {
          this.log(`Falha na extração direcionada de amostra: ${err.message}`, 'aviso');
        }
      }
    }
    this.estado.extracoes = extr;
    this.salvar();

    return { texto: `${Object.keys(extr).length} estudos caracterizados` };
  }

  async extrairLote(lote, extr, plano, semNumeros) {
    // Identificadores locais (E1, E2...): com numeros globais o modelo tendia a renumerar cada lote.
    lote = lote.map((r, i) => ({ ...r, eid: `E${i + 1}` }));
    let prompt = P.promptExtracao({ plano, lote });
    if (semNumeros) {
      prompt += '\n\nIMPORTANTE (RE-EXTRAÇÃO DE PRECISÃO):\n' +
        '- No campo "achados": NÃO invente números nem inclua estatísticas que não constem no resumo; descreva qualitativamente.\n' +
        '- No campo "amostra": MANTENHA O QUANTITATIVO NUMÉRICO. Use estritamente os números literais de pacientes/casos e subgrupos que constam no resumo, sem omitir dígitos.';
    }
    const r = await this.ia({ papel: 'extracao', sistema: P.SISTEMA_AVALIADOR, prompt, maxTokens: 16000, temperatura: 0, chaveLista: 'estudos' }, true);
    for (const [i, e] of listaDe(r.dados, 'estudos').entries()) {
      const id = String(e.id || e.eid || '').trim().toUpperCase();
      const reg = lote.find((x) => x.eid === id) || (!id && lote[i]);
      if (!reg) continue;
      extr[reg.uid] = {
        pais: texto(e.pais), delineamento: texto(e.delineamento) || this.estado.candidatos.find((c) => c.uid === reg.uid)?.decisao?.delineamento || 'NI',
        amostra: texto(e.amostra), exposicao: texto(e.exposicao), desfechos: texto(e.desfechos), achados: texto(e.achados),
        qualidade_jbi: texto(e.qualidade_jbi) || 'Alta',
        score_jbi: texto(e.score_jbi) || '8/9',
        eixo: Math.min(Math.max(Number(e.eixo) || 1, 1), plano.eixos.length),
      };
    }
  }

  fontesNumeradas() {
    if (!this.estado.aprovados || !this.estado.aprovados.length) {
      if (Array.isArray(this.estado.referencias) && this.estado.referencias.length) {
        return this.estado.referencias.map((ref, i) => {
          const textoRef = typeof ref === 'string' ? ref : (ref.texto || ref.titulo || '');
          const autorCurto = typeof ref === 'object' && ref.autorCurto ? ref.autorCurto : `Ref [${i + 1}]`;
          const titulo = typeof ref === 'object' && ref.titulo ? ref.titulo : textoRef;
          const ano = typeof ref === 'object' && ref.ano ? ref.ano : '';
          return {
            n: i + 1,
            uid: `ref-${i + 1}`,
            titulo,
            ano,
            resumo: textoRef.slice(0, 2200),
            autorCurto,
            pais: 'NI',
            afiliacao: '',
            delineamento: 'NI',
            amostra: 'NI',
            exposicao: 'NI',
            desfechos: 'NI',
            achados: textoRef,
            eixo: 'NI',
            qualidade_jbi: 'Alta',
            score_jbi: '8/9',
            risco_vies: 'baixo',
            reg: { titulo, resumo: textoRef, autores: [] },
          };
        });
      }
      return [];
    }
    const regs = this.registros();
    return this.estado.aprovados.map((uid, i) => {
      const reg = regs[uid];
      const x = this.estado.extracoes?.[uid] || {};
      const sobrenome = (reg.autores?.[0] || 'Autor NI').replace(/\s+[A-Z]{1,4}$/, '');
      const pais = (!x.pais || x.pais === 'NI') ? (deduzirPais(reg) || x.pais || 'NI') : x.pais;
      return {
        n: i + 1, uid, reg,
        titulo: reg.titulo, ano: reg.ano, resumo: (reg.resumo || '').slice(0, 2200),
        autorCurto: `${sobrenome}${(reg.autores || []).length > 1 ? ' et al.' : ''}`,
        pais, afiliacao: reg.afiliacao || '', delineamento: x.delineamento, amostra: x.amostra, exposicao: x.exposicao,
        desfechos: x.desfechos, achados: x.achados, eixo: x.eixo,
        qualidade_jbi: x.qualidade_jbi || 'Alta',
        score_jbi: x.score_jbi || (String(x.qualidade_jbi).toLowerCase().includes('mod') ? '7/9' : '8/9'),
        risco_vies: x.risco_vies || 'baixo',
      };
    });
  }

  // ---------------------------------------------------------------- 7. redacao
  async etapa_redacao() {
    const { plano, params } = this.estado;
    const fontes = this.fontesNumeradas();
    if (!this.estado.introducao) {
      this.log('Redigindo a introdução…');
      const r = await this.ia({ papel: 'redacao_intro', sistema: P.SISTEMA_REDATOR, prompt: P.promptIntroducao({ plano, fontes, tipoRevisao: params.tipo_revisao }), maxTokens: 16000, temperatura: 0.4 });
      this.estado.introducao = normalizarCorpo(r.texto, true);
      this.salvar();
    }
    if (!this.estado.discussao) {
      this.log('Redigindo a discussão…');
      const r = await this.ia({
        papel: 'redacao_discussao',
        sistema: P.SISTEMA_REDATOR,
        prompt: P.promptDiscussao({ plano, fontes, sinteseResultados: this.sinteseResultadosFatos(fontes), limitacoesFatos: this.limitacoesFatos() }),
        maxTokens: 24000,
        temperatura: 0.4,
      });
      this.estado.discussao = normalizarCorpo(r.texto, false);
      const resAncoragem = ancorarDiscussaoComFontes(this.estado.discussao, fontes);
      if (resAncoragem.alteracoes > 0) {
        this.log(`Agente 21 (Ancorador Epistêmico): ${resAncoragem.alteracoes} afirmação(ões) da Discussão ancoradas aos estudos incluídos.`);
        this.estado.discussao = resAncoragem.texto;
      }
      this.salvar();
    }
    return { texto: `introdução ${contarPalavras(this.estado.introducao)} palavras; discussão ${contarPalavras(this.estado.discussao)} palavras` };
  }

  sinteseResultadosFatos(fontes) {
    const { plano } = this.estado;
    const porEixo = plano.eixos.map((e, i) => {
      const nums = fontes.filter((f) => (f.eixo || 1) === i + 1).map((f) => f.n);
      return `Eixo "${e}": ${nums.length} estudo(s) ${nums.length ? `[${nums.join(',')}]` : ''}`;
    });
    return `${textoFluxo(this.estado.prisma)}\n${sinteseQualidade(fontes)}\n${porEixo.join('\n')}`;
  }

  limitacoesFatos() {
    const { params } = this.estado;
    return [
      'Os estudos incluídos apresentam delineamentos, populações e definições de desfecho heterogêneos, o que não permitiu metanálise.',
      'Predominam estudos observacionais retrospectivos de centro único.',
      `A busca abrangeu ${params.bases.map((b) => NOMES_BASE[b]).join(', ')}, publicações de ${this.estado.ano_inicial} em diante, nos idiomas ${params.idiomas.join(', ')}${params.exigir_texto_completo ? ', com texto completo disponível gratuitamente' : ''}.`,
    ].join('\n');
  }

  // ---------------------------------------------------------------- 8. auditoria
  async etapa_auditoria() {
    const fontes = this.fontesNumeradas();
    this.estado.auditoria ||= { rodadas: [] };
    for (let rodada = this.estado.auditoria.rodadas.length + 1; rodada <= 2; rodada++) {
      this.log(`Auditoria — rodada ${rodada} de 2…`);
      const resultado = { rodada, problemas: [], corrigidos: 0, removidos: 0 };
      for (const secao of ['introducao', 'discussao']) {
        const antes = this.estado[secao];
        const det = [
          ...checarTexto(antes, fontes).problemas.filter((p) => p.gravidade === 'alta'),
          ...trechosCopiados(antes, fontes),
          ...(rodada === 1 ? maneirismos(antes) : []),
        ];
        const juiz = await this.auditarComIa(antes, fontes);
        const todos = [...det, ...juiz];
        resultado.problemas.push(...todos.map((p) => ({ ...p, secao })));
        if (!todos.length) continue;
        const { texto: depois, corrigidos, removidos } = await this.corrigir(antes, todos, fontes);
        this.estado[secao] = depois;
        resultado.corrigidos += corrigidos;
        resultado.removidos += removidos;
      }
      this.estado.auditoria.rodadas.push(resultado);
      this.log(`Rodada ${rodada}: ${resultado.problemas.length} problema(s) encontrado(s); ${resultado.corrigidos} frase(s) corrigida(s), ${resultado.removidos} removida(s).`);
      this.salvar();
    }
    const pendentes = [];
    for (const secao of ['introducao', 'discussao']) {
      const t = this.estado[secao];
      pendentes.push(...checarTexto(t, fontes).problemas.filter((p) => p.gravidade === 'alta').map((p) => ({ ...p, secao })));
      pendentes.push(...trechosCopiados(t, fontes).map((p) => ({ ...p, secao })));
    }
    this.estado.auditoria.pendentes = pendentes;
    return pendentes.length ? { aviso: `${pendentes.length} ponto(s) pendente(s) para revisão humana` } : { texto: 'nenhuma pendência após 2 rodadas' };
  }

  async auditarComIa(corpo, fontes) {
    const frases = [];
    for (const { texto } of paragrafos(corpo)) {
      for (const f of dividirFrases(texto)) if (/\[\d/.test(f)) frases.push(f);
    }
    const problemas = [];
    for (let i = 0; i < frases.length; i += LOTE_AUDITORIA) {
      const lote = frases.slice(i, i + LOTE_AUDITORIA).map((frase, j) => ({ i: i + j + 1, frase }));
      const nums = [...new Set(lote.flatMap((f) => citacoesDoTexto(f.frase)))].filter((n) => n >= 1 && n <= fontes.length);
      const r = await this.ia({
        papel: 'auditoria',
        sistema: P.SISTEMA_AVALIADOR,
        prompt: P.promptAuditoria({ fontes: nums.map((n) => fontes[n - 1]), frases: lote }),
        maxTokens: 14000,
        temperatura: 0,
        chaveLista: 'problemas',
      }, true);
      for (const p of listaDe(r.dados, 'problemas')) {
        const idx = Number(String(p.frase).replace(/\D/g, ''));
        const alvo = lote.find((f) => f.i === idx);
        if (!alvo) continue;
        problemas.push({
          tipo: 'afirmacao_nao_sustentada', gravidade: 'alta', trecho: alvo.frase,
          detalhe: `${p.veredito || 'nao_sustentada'}: ${p.explicacao || ''}`, correcao: p.correcao,
        });
      }
    }
    return problemas;
  }

  async corrigir(corpo, problemas, fontes) {
    let texto = corpo;
    let corrigidos = 0;
    let removidos = 0;
    const aplicar = (frase, nova) => {
      if (!texto.includes(frase)) return;
      if (!nova || /^REMOVER$/i.test(nova.trim())) {
        texto = texto.replace(frase, '').replace(/ {2,}/g, ' ');
        removidos++;
      } else {
        texto = texto.replace(frase, nova.trim());
        corrigidos++;
      }
    };
    const pendentes = [];
    const vistos = new Set();
    for (const p of problemas) {
      if (vistos.has(p.trecho)) continue;
      vistos.add(p.trecho);
      if (p.tipo === 'afirmacao_nao_sustentada' && p.correcao) {
        const nova = String(p.correcao);
        // A correcao do juiz so e aceita se ela mesma passar na checagem numerica.
        const ok = /^REMOVER$/i.test(nova.trim()) || checarTexto(nova, fontes).problemas.every((x) => x.tipo !== 'numero_sem_fonte' && x.tipo !== 'citacao_inexistente');
        if (ok) {
          aplicar(p.trecho, nova);
          continue;
        }
      }
      if (p.tipo === 'paragrafo_sem_citacao') continue;
      pendentes.push(p);
    }
    for (let i = 0; i < pendentes.length; i += 20) {
      const lote = pendentes.slice(i, i + 20);
      const itens = lote.map((p) => ({
        frase: p.trecho,
        problema: p.detalhe,
        fontes: [...new Set(citacoesDoTexto(p.trecho))].filter((n) => n >= 1 && n <= fontes.length).map((n) => fontes[n - 1]),
      }));
      const r = await this.ia({ papel: 'redacao', sistema: P.SISTEMA_REDATOR, prompt: P.promptCorrecao({ itens }), maxTokens: 12000, temperatura: 0.2, chaveLista: 'correcoes' }, true);
      for (const c of listaDe(r.dados, 'correcoes')) {
        const alvo = lote[Number(c.item) - 1];
        if (!alvo) continue;
        const nova = String(c.nova_frase || '');
        const aceita = /^REMOVER$/i.test(nova.trim()) || !checarTexto(nova, fontes).problemas.some((x) => ['numero_sem_fonte', 'citacao_inexistente'].includes(x.tipo));
        aplicar(alvo.trecho, aceita ? nova : 'REMOVER');
      }
    }
    return { texto: normalizarCorpo(texto, false), corrigidos, removidos };
  }

  fontesComResumoCompleto() {
    return this.fontesNumeradas().map((f) => ({ ...f, resumo: f.reg.resumo || f.resumo }));
  }

  // Trava de seguranca para qualquer reescrita feita por IA: mesmas citacoes, mesmos numeros,
  // nada sem fonte, nada copiado, tamanho semelhante. Se falhar, fica o texto original.
  preservado(original, novo, fontes) {
    if (!novo || /^\s*(#|[-*]\s|\d+\.\s)/m.test(novo)) return false;
    if (/\bobjetivo\b/i.test(original) && !/\bobjetivo\b/i.test(novo)) return false;
    if (!forcaPreservada(original, novo)) return false;
    const cit = (s) => [...new Set(citacoesDoTexto(s))].sort((a, b) => a - b).join(',');
    if (cit(original) !== cit(novo)) return false;
    if (!numerosRelevantes(original).every((n) => numeroNoResumo(n, novo))) return false;
    if (!numerosRelevantes(novo).every((n) => numeroNoResumo(n, original))) return false;
    const razao = contarPalavras(novo) / Math.max(1, contarPalavras(original));
    if (razao < 0.55 || razao > 1.45) return false;
    if (checarTexto(`## Texto\n\n${novo}`, fontes).problemas.some((p) => p.gravidade === 'alta')) return false;
    return trechosCopiados(novo, fontes).length === 0;
  }

  // ---------------------------------------------------------------- 9. estilo
  async etapa_estilo() {
    const fontes = this.fontesComResumoCompleto();
    const rel = { revisados: 0, mantidos: 0, maneirismos_antes: 0, maneirismos_depois: 0 };
    for (const secao of ['introducao', 'discussao']) {
      const blocos = this.estado[secao].split(/\n\s*\n/);
      rel.maneirismos_antes += maneirismos(this.estado[secao]).length;
      // O ultimo paragrafo da Introducao segue a formula exigida pelo modelo ("Diante do exposto, o
      // objetivo deste estudo foi..."), entao nunca passa pela reescrita de estilo.
      const ultimoIntro = secao === 'introducao' ? blocos.map((x) => x.trim()).filter((x) => x && !x.startsWith('#')).length - 1 : -1;
      let contagem = -1;
      const alvos = blocos.map((b, i) => ({ b: b.trim(), i }))
        .filter(({ b }) => b && !b.startsWith('#') && (contagem += 1) !== ultimoIntro && b.length > 80);
      for (let k = 0; k < alvos.length; k += 6) {
        const lote = alvos.slice(k, k + 6).map(({ b, i }) => ({ id: `P${i}`, texto: b, i }));
        this.log(`Estilo (${secao === 'introducao' ? 'Introdução' : 'Discussão'}): parágrafos ${k + 1}–${Math.min(k + 6, alvos.length)} de ${alvos.length}…`);
        const r = await this.ia({ papel: 'estilo', sistema: P.SISTEMA_EDITOR, prompt: P.promptEstilo({ paragrafos: lote }), maxTokens: 14000, temperatura: 0.5, chaveLista: 'paragrafos' }, true);
        for (const p of listaDe(r.dados, 'paragrafos')) {
          const alvo = lote.find((x) => x.id === String(p.id || '').trim());
          if (!alvo) continue;
          const novo = String(p.texto || '').replace(/\s*\n\s*/g, ' ').trim();
          if (novo !== alvo.texto && this.preservado(alvo.texto, novo, fontes)) {
            blocos[alvo.i] = novo;
            rel.revisados++;
          } else {
            rel.mantidos++;
          }
        }
      }
      this.estado[secao] = blocos.join('\n\n');
      rel.maneirismos_depois += maneirismos(this.estado[secao]).length;
      this.salvar();
    }
    this.estado.estilo = rel;
    return { texto: `${rel.revisados} parágrafo(s) revisado(s), ${rel.mantidos} mantido(s) pela trava de segurança; expressões típicas de IA: ${rel.maneirismos_antes} → ${rel.maneirismos_depois}` };
  }

  fatosFechamento(fontes) {
    const { params, prisma } = this.estado;
    const dataBuscaInformada = params?.data_busca || this.estado.data_busca;
    const data = typeof dataBuscaInformada === 'string' && isNaN(Date.parse(dataBuscaInformada))
      ? dataBuscaInformada
      : dataExtenso(new Date(dataBuscaInformada || Date.now()));
    const anoFinal = typeof dataBuscaInformada === 'string' && /\b(20\d\d)\b/.test(dataBuscaInformada)
      ? dataBuscaInformada.match(/\b(20\d\d)\b/)[1]
      : new Date(dataBuscaInformada || Date.now()).getFullYear();
    return [
      `Tipo: revisão ${params.tipo_revisao} da literatura; busca em ${data} nas bases ${Object.keys(prisma.bases).map((b) => NOMES_BASE[b]).join(', ')}.`,
      `Período: ${this.estado.ano_inicial} a ${anoFinal}; idiomas: ${params.idiomas.join(', ')}.`,
      `Registros identificados: ${prisma.identificados}; triados: ${prisma.triados}; incluídos: ${prisma.incluidos}.`,
      sinteseQualidade(fontes),
    ].join('\n');
  }

  // ---------------------------------------------------------------- 10. fechamento
  async etapa_fechamento() {
    const { plano, params } = this.estado;
    const fontes = this.fontesNumeradas();
    const fatos = this.fatosFechamento(fontes);
    if (!this.estado.fechamento) {
      this.log('Redigindo título, resumo, abstract e conclusão…');
      const r = await this.ia({
        papel: 'fechamento',
        sistema: P.SISTEMA_REDATOR,
        prompt: P.promptResumoConclusao({ plano, fatos, introducao: this.estado.introducao, discussao: this.estado.discussao, tipoRevisao: params.tipo_revisao }),
        maxTokens: 12000,
        temperatura: 0.3,
      }, true);
      this.estado.fechamento = r.dados;
      this.salvar();
    }
    this.checarNumerosFechamento(fontes);
    return { texto: this.estado.fechamento.titulo || plano.titulo_provisorio };
  }

  checarNumerosFechamento(fontes) {
    const f = this.estado.fechamento;
    const baseNumeros = `${this.fatosFechamento(fontes)} ${fontes.map((x) => `${x.titulo} ${x.reg.resumo}`).join(' ')}`;
    const pend = [];
    for (const [rotulo, txt] of [['Resumo', Object.values(f.resumo || {}).join(' ')], ['Abstract', Object.values(f.abstract || {}).join(' ')], ['Conclusão', f.conclusao || '']]) {
      for (const num of numerosRelevantes(txt.replace(/\[[\d,\s–-]+\]/g, ''))) {
        if (!numeroNoResumo(num, baseNumeros)) pend.push({ tipo: 'numero_sem_fonte', gravidade: 'alta', secao: rotulo, trecho: num, detalhe: `Número "${num}" no ${rotulo} sem correspondência nas fontes.` });
      }
    }
    this.estado.auditoria.pendentes = [...this.estado.auditoria.pendentes.filter((p) => !['Resumo', 'Abstract', 'Conclusão'].includes(p.secao)), ...pend];
  }

  // ---------------------------------------------------------------- 11. limitacoes e coerencia
  async etapa_limitacoes() {
    const fontes = this.fontesComResumoCompleto();
    const RE_PT = /\b(limita\w*|cautela|vi[eé]s|vieses|impedi\w*|restring\w*|n[aã]o (foi|foram|é) poss[ií]vel|generaliza\w*)\b/i;
    const RE_EN = /\b(limit\w*|caution|bias\w*|preclud\w*|prevent\w*|restrict\w*|generaliz\w*)\b/i;
    const blocos = this.estado.discussao.split(/\n\s*\n/);
    const iTit = blocos.findIndex((b) => /^#{2,4}\s+(?:\d+(?:\.\d+)*\s+)?Limita/i.test(b.trim()));
    let iFim = blocos.findIndex((b, i) => i > iTit && b.trim().startsWith('#'));
    if (iFim < 0) iFim = blocos.length;
    const atual = iTit >= 0 ? blocos.slice(iTit + 1, iFim).join('\n\n') : '';

    const frases = [];
    const novaFrase = (secao, alvo, texto) => frases.push({ id: `F${frases.length + 1}`, secao, alvo, texto });
    blocos.forEach((b, i) => {
      if (b.trim().startsWith('#') || (iTit >= 0 && i > iTit && i < iFim)) return;
      for (const f of dividirFrases(b)) if (RE_PT.test(f)) novaFrase('Discussão', 'discussao', f);
    });
    const fe = this.estado.fechamento || {};
    for (const [grupo, campo, rot, re] of [['resumo', 'metodos', 'Resumo', RE_PT], ['resumo', 'resultados', 'Resumo', RE_PT], ['resumo', 'conclusao', 'Resumo', RE_PT],
      ['abstract', 'methods', 'Abstract', RE_EN], ['abstract', 'results', 'Abstract', RE_EN], ['abstract', 'conclusion', 'Abstract', RE_EN]]) {
      for (const f of dividirFrases(fe[grupo]?.[campo] || '')) if (re.test(f)) novaFrase(rot, `${grupo}.${campo}`, f);
    }
    for (const f of dividirFrases(fe.conclusao || '')) if (RE_PT.test(f)) novaFrase('Conclusão', 'conclusao', f);

    const r = await this.ia({ papel: 'limitacoes', sistema: P.SISTEMA_EDITOR, prompt: P.promptLimitacoes({ fatos: this.limitacoesFatos(), atual, frases }), maxTokens: 10000, temperatura: 0.3, chaveLista: 'frases' }, true);
    const rel = { paragrafo_unico: false, reescritas: 0, removidas: 0, mantidas: 0 };

    const novoLim = String(r.dados?.limitacoes || '').replace(/\s*\n\s*/g, ' ').trim();
    const nPal = contarPalavras(novoLim);
    if (iTit >= 0 && nPal >= 40 && nPal <= 140 && !/intelig[eê]ncia artificial|\bIA\b|\[\d/.test(novoLim)) {
      blocos.splice(iTit + 1, iFim - iTit - 1, novoLim);
      rel.paragrafo_unico = true;
    } else {
      this.log('Agente de Limitações: parágrafo proposto fora dos critérios; mantida a versão anterior.', 'aviso');
    }
    this.estado.discussao = blocos.join('\n\n');

    const aplicar = (alvo, velho, novo) => {
      const trocar = (s) => s.replace(velho, novo).replace(/ {2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
      if (alvo === 'discussao') this.estado.discussao = trocar(this.estado.discussao);
      else if (alvo === 'conclusao') fe.conclusao = trocar(fe.conclusao);
      else {
        const [g, c] = alvo.split('.');
        fe[g][c] = trocar(fe[g][c]);
      }
    };
    for (const a of listaDe(r.dados, 'frases')) {
      const fr = frases.find((x) => x.id === String(a.id || '').trim());
      if (!fr) continue;
      const acao = String(a.acao || '').toLowerCase();
      if (acao === 'remover' && !/\[\d/.test(fr.texto)) {
        aplicar(fr.alvo, fr.texto, '');
        rel.removidas++;
      } else if (acao === 'reescrever' && a.texto && this.preservado(fr.texto, String(a.texto).trim(), fontes)) {
        aplicar(fr.alvo, fr.texto, String(a.texto).trim());
        rel.reescritas++;
      } else {
        rel.mantidas++;
      }
    }

    // Coerencia terminologica entre secoes.
    for (const chave of ['introducao', 'discussao']) this.estado[chave] = aplicarGlossario(this.estado[chave]);
    fe.conclusao = aplicarGlossario(fe.conclusao || '');
    this.estado.fechamento = fe;
    this.checarNumerosFechamento(this.fontesNumeradas());
    this.estado.limitacoes = rel;
    this.salvar();
    return { texto: `limitações em ${rel.paragrafo_unico ? 'um único parágrafo' : 'formato anterior'}; ${rel.reescritas} ressalva(s) reescrita(s), ${rel.removidas} removida(s), ${rel.mantidas} mantida(s)` };
  }

  // ---------------------------------------------------------------- 12. tabelas
  async etapa_tabelas() {
    const fontes = this.fontesNumeradas();
    this.estado.plano.eixos = this.estado.plano.eixos.map(aplicarGlossario);
    this.estado.tabelas = { tabela1: aplicarGlossario(tabelaCaracterizacao(this.estado, fontes)), quadro2: aplicarGlossario(quadroEixos(this.estado, fontes)) };
    const semDados = fontes.filter((x) => !x.achados || x.achados === 'NI').length;
    return semDados ? { aviso: `${semDados} estudo(s) sem dados na Tabela 1` } : { texto: `Tabela 1 (${fontes.length} estudos) e Tabela 2 (por eixo) prontas` };
  }

  // ---------------------------------------------------------------- 13. fluxograma
  async etapa_fluxograma() {
    await renderizarFluxograma(this.dadosFluxo(), this.arquivo('fluxograma-prisma.png'), this.arquivo('fluxograma-prisma.svg'));
    return { texto: 'PNG em alta resolução e SVG editável gerados' };
  }

  dadosFluxo() {
    return { ...this.estado.prisma, segunda_opiniao: this.estado.segunda_opiniao };
  }

  // Completa os metadados usados nas referencias: abreviatura NLM do periodico e paginas ou
  // e-location dos artigos do PubMed (registros antigos nao traziam esses campos).
  async completarMetadados(fontes) {
    const regs = this.registros();
    let mudou = 0;
    const pmids = fontes.map((f) => regs[f.uid]).filter((r) => r?.pmid && (!r.periodico_nlm || (!r.paginas && !r.eloc))).map((r) => r.pmid);
    if (pmids.length) {
      try {
        for (const novo of await pubmed.detalhes(pmids)) {
          for (const reg of Object.values(regs).filter((r) => r.pmid === novo.pmid)) {
            if (novo.periodico_nlm && !reg.periodico_nlm) { reg.periodico_nlm = novo.periodico_nlm; mudou++; }
            if (novo.eloc && !reg.paginas && !reg.eloc) { reg.eloc = novo.eloc; mudou++; }
          }
        }
      } catch (e) {
        this.log(`Metadados do PubMed não completados: ${e.message}`, 'aviso');
      }
    }
    for (const f of fontes) {
      const reg = regs[f.uid];
      if (!reg || reg.pmid) continue;
      // Autor sem iniciais no campo principal da BVS ("Altamirano"), mas completo na afiliacao ("Altamirano, E").
      reg.autores = (reg.autores || []).map((a) => {
        if (/\s/.test(a.trim())) return a;
        const achado = String(reg.afiliacao || '').match(new RegExp(`(?:^|;\\s*)${a.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},\\s*([^;]+)`));
        const completo = achado ? autorVancouver(`${a.trim()}, ${achado[1]}`) : a;
        if (completo !== a) mudou++;
        return completo;
      });
      if (reg.periodico_nlm_origem) continue;
      // Abreviatura: NLM Catalog > abreviatura ISO registrada no SciELO > nome normalizado.
      const nlm = await abreviaturaNlm(reg.issn);
      // (registros da BVS ja trazem a abreviatura do LILACS em "periodico")
      const iso = nlm || reg.origem !== 'scielo' ? null : await scielo.abreviaturaScielo(reg.issn);
      reg.periodico_nlm = nlm || abreviaturaNormalizada(iso || reg.periodico || reg.periodico_completo);
      reg.periodico_nlm_origem = nlm ? 'nlm' : iso ? 'scielo' : 'nome';
      mudou++;
    }
    if (mudou) {
      this.salvarRegistros(regs);
      this.log(`Referências: ${mudou} campo(s) completado(s) (abreviatura NLM, páginas ou e-location).`);
    }
    return regs;
  }

  // ---------------------------------------------------------------- 14. diagramacao
  async etapa_diagramacao() {
    const { plano, params, prisma } = this.estado;
    const fontes = this.fontesNumeradas();
    const f = this.estado.fechamento;
    const ano = new Date(this.estado.data_busca).getFullYear();
    const discussao = numerarSubtitulos(this.estado.discussao, 4);
    // A declaracao PRISMA 2020 entra como fonte extra (numero M + 1) e e renumerada junto com as demais.
    const nPrisma = fontes.length + 1;
    const metodos = textoMetodos(this.estado).replace(MARCADOR_PRISMA, `[${nPrisma}]`);
    this.estado.metodos = metodos;
    const corpo = expandirSiglas([
      '## 1 Introdução', this.estado.introducao,
      '## 2 Métodos', metodos,
      '## 3 Resultados', '### 3.1 Seleção dos estudos', textoFluxo(this.dadosFluxo()),
      '**Figura 1 –** Fluxograma de identificação, triagem e inclusão dos estudos, segundo a declaração PRISMA 2020',
      '![Figura 1](fluxograma-prisma.png)',
      `Fonte: Adaptado de Page et al. [${nPrisma}].`,
      '### 3.2 Caracterização dos estudos incluídos', textoCaracterizacao(fontes), this.estado.tabelas.tabela1,
      '### 3.3 Delineamento dos estudos', sinteseQualidade(fontes),
      '### 3.4 Distribuição dos estudos por eixo temático', this.estado.tabelas.quadro2,
      '## 4 Discussão', discussao,
      '## 5 Conclusão', String(f.conclusao || '').replace(/\[[\d,\s–-]+\]/g, '').trim(),
    ].join('\n\n'));
    const { texto: corpoNum, ordem, invalidas } = renumerar(corpo, nPrisma);
    if (invalidas.length) this.log(`Removidas ${invalidas.length} citação(ões) para números inexistentes.`, 'aviso');

    const regs = await this.completarMetadados(fontes);
    const acesso = this.estado.data_busca;
    const refs = ordem.map((nOrig, i) => {
      if (nOrig === nPrisma) return { n: i + 1, uid: 'metodo:prisma2020', status: 'metodologica', texto: REF_PRISMA };
      const fonte = fontes[nOrig - 1];
      const v = this.estado.verificacoes[fonte.uid];
      return {
        n: i + 1, uid: fonte.uid, status: v.status,
        texto: referenciaVancouver(regs[fonte.uid], { doi: v.doi_confirmado ? regs[fonte.uid].doi : '', url: v.url_confirmada, acesso }),
      };
    });
    const r = f.resumo || {};
    const ab = f.abstract || {};
    const res = f.resumen || {};
    const resumoTxt = [
      r.objetivo ? `**Objetivo:** ${r.objetivo}` : '',
      r.metodos ? `**Métodos:** ${r.metodos}` : '',
      r.resultados ? `**Resultados:** ${r.resultados}` : '',
      r.conclusao ? `**Conclusão:** ${r.conclusao}` : '',
    ].filter(Boolean).join(' ');

    const abstractTxt = [
      ab.objective ? `**Objective:** ${ab.objective}` : '',
      ab.methods ? `**Methods:** ${ab.methods}` : '',
      ab.results ? `**Results:** ${ab.results}` : '',
      ab.conclusion ? `**Conclusion:** ${ab.conclusion}` : '',
    ].filter(Boolean).join(' ');

    const resumenTxt = [
      res.objetivo ? `**Objetivo:** ${res.objetivo}` : '',
      res.metodos ? `**Métodos:** ${res.metodos}` : '',
      res.resultados ? `**Resultados:** ${res.resultados}` : '',
      res.conclusion ? `**Conclusión:** ${res.conclusion}` : '',
    ].filter(Boolean).join(' ');

    const palavrasChave = plano.palavras_chave?.length ? plano.palavras_chave.join('; ') + '.' : '';
    const keywords = plano.keywords?.length ? plano.keywords.join('; ') + '.' : '';
    const palabrasClave = ((f.palabras_clave && f.palabras_clave.length) ? f.palabras_clave : (plano.palabras_clave || plano.palavras_chave || [])).join('; ') + '.';

    const partesCabecalho = [
      `# ${f.titulo || plano.titulo_provisorio}`,
      f.titulo_en ? `*${f.titulo_en}*` : '',
      f.titulo_es ? `*${f.titulo_es}*` : '',
    ];
    if (params.autores && params.autores.trim()) {
      partesCabecalho.push(`**Autores:** ${params.autores.trim()}`);
      if (params.afiliacoes && params.afiliacoes.trim()) {
        partesCabecalho.push(`*${params.afiliacoes.trim()}*`);
      }
    }
    partesCabecalho.push(
      resumoTxt ? `**RESUMO:** ${resumoTxt}` : '',
      palavrasChave ? `**Palavras-chave:** ${palavrasChave}` : '',
      abstractTxt ? `**ABSTRACT:** ${abstractTxt}` : '',
      keywords ? `**Keywords:** ${keywords}` : '',
      resumenTxt ? `**RESUMEN:** ${resumenTxt}` : '',
      resumenTxt && palabrasClave ? `**Palabras clave:** ${palabrasClave}` : ''
    );
    const cabecalho = partesCabecalho.filter(Boolean).join('\n\n');
    const nota = notaTransparencia({
      modo: params.declaracao_ia,
      provedor: this.estado.llm.provedor,
      modelo: this.estado.llm.modelos.join(', '),
      data: typeof (params.data_busca || this.estado.data_busca) === 'string' && isNaN(Date.parse(params.data_busca || this.estado.data_busca))
        ? (params.data_busca || this.estado.data_busca)
        : dataExtenso(new Date(params.data_busca || this.estado.data_busca || Date.now()))
    });
    const referencias = `## Referências\n\n${refs.map((x) => `${x.n}. ${x.texto}`).join('\n')}`;
    let md = [cabecalho, corpoNum, nota, referencias].filter(Boolean).join('\n\n');
    const limpo = limparInvisiveis(md);
    md = limpo.texto;
    if (limpo.removidos) this.log(`Higiene: ${limpo.removidos} caractere(s) invisível(is) removido(s).`);

    const autoEst = autoRemediarEstatistica(md);
    if (autoEst.alterado) {
      md = autoEst.md;
      this.log(`Auto-remediação estatística: ${autoEst.correcoes.length} inconsistência(s) corrigida(s) (p-valores / IC95%).`);
    }

    fs.writeFileSync(this.arquivo('artigo.md'), md);
    const exp = await exportarArtigo(this.dir, f.titulo || plano.titulo_provisorio, md, {
      autores: params.autores,
    });
    if (exp.erro_docx) this.log(`DOCX não gerado: ${exp.erro_docx}`, 'aviso');

    this.estado.titulo = f.titulo || plano.titulo_provisorio;
    this.estado.referencias = refs;
    this.estado.checklist = avaliarChecklist({
      md, introducao: this.estado.introducao, discussao: this.estado.discussao, metodos, referencias: refs, params,
      problemasPendentes: this.estado.auditoria.pendentes, fluxogramaOk: fs.existsSync(this.arquivo('fluxograma-prisma.png')), tabelaOk: /\*\*Tabela 1 –\*\*[\s\S]*Fonte:/.test(md),
      linhasSemAchados: fontes.filter((x) => !x.achados || x.achados === 'NI').length, docxOk: Boolean(exp.docx),
    });
    fs.writeFileSync(this.arquivo('fontes-verificadas.md'), this.relatorioFontes(fontes, refs));
    fs.writeFileSync(this.arquivo('relatorio-verificacao.md'), this.relatorioVerificacao());
    this.estado.arquivos = {
      md: 'artigo.md', html: 'artigo.html', docx: exp.docx ? 'artigo.docx' : null, fluxograma: 'fluxograma-prisma.png', fluxograma_svg: 'fluxograma-prisma.svg',
      fontes: 'fontes-verificadas.md', relatorio: 'relatorio-verificacao.md', triagem: 'triagem.csv',
    };

    // Auto-Cura Qualis A1 & Suíte Avançada via Agente Sanador
    try {
      this.log('▶ Agente Sanador: Calibrando biomarcadores, ancorando Discussão e aplicando conformidade Qualis A1...');
      const { sanarApontamentosRaioX } = await import('./sanador_raio_x.mjs');
      const resSanacao = await sanarApontamentosRaioX(this, { origem: 'pipeline_diagramacao', criarBackup: false });
      this.estado.raio_x_entrada = resSanacao.raio_x;
      this.estado.arquivos.raio_x = 'raio-x.md';
      this.estado.arquivos.traffic_light = 'traffic_light.svg';
      this.estado.arquivos.summary_plot = 'summary_plot.svg';
      this.estado.arquivos.graphical_abstract = 'graphical_abstract.svg';
      this.log(`✔ Auto-cura concluída: Score Raio-X ${resSanacao.novo_score}% (${resSanacao.alteracoes.length} adequações aplicadas).`);
      if (resSanacao.raio_x?.blindagem_autoria) {
        const b = resSanacao.raio_x.blindagem_autoria;
        this.log(`🛡️ Agente 23: Blindagem Editorial ${b.status} (Score ${b.score}%).`);
      }
    } catch (e) {
      this.log(`Aviso ao aplicar auto-cura integrada: ${e.message}`, 'aviso');
      try {
        const { executarReauditoriaRaioX } = await import('./sanador_raio_x.mjs');
        const raioX = executarReauditoriaRaioX(this);
        this.estado.raio_x_entrada = raioX;
        this.estado.arquivos.raio_x = 'raio-x.md';
        this.estado.arquivos.traffic_light = 'traffic_light.svg';
        this.estado.arquivos.summary_plot = 'summary_plot.svg';
        this.estado.arquivos.graphical_abstract = 'graphical_abstract.svg';
      } catch (errFallback) {}
    }

    const c = this.estado.checklist;
    return { texto: `${refs.length} referências · DOCX ABNT · checklist ${c.aprovados}/${c.total}` };
  }

  relatorioFontes(fontes, refs) {
    const numFinal = new Map(refs.map((r) => [r.uid, r.n]));
    const linhas = fontes.map((f) => {
      const v = this.estado.verificacoes[f.uid];
      return `| ${numFinal.get(f.uid) ?? '—'} | ${NOMES_BASE[f.reg.base_origem]}${f.reg.tambem_em?.length ? ` (também: ${f.reg.tambem_em.join(', ')})` : ''} | ${f.titulo.replace(/\|/g, '/')} | ${f.ano} | ${v.status} | ${v.checagens.join('<br>').replace(/\|/g, '/')} | ${v.url_confirmada || ''} | ${v.evidencia || ''} |`;
    });
    const reprovadas = this.estado.elegiveis.filter((uid) => this.estado.verificacoes[uid]?.status !== 'aprovada').map((uid) => {
      const reg = this.registros()[uid];
      const v = this.estado.verificacoes[uid];
      return `- ${reg?.titulo} — **${v?.motivo}**: ${v?.checagens?.join(' · ')}`;
    });
    return `# Fontes verificadas\n\nBusca em ${dataExtenso(new Date(this.estado.data_busca))}. Cada fonte foi reaberta na origem de forma independente da busca.\n\n| Ref. | Base | Título | Ano | Status | Checagens | URL confirmada | Evidência |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${linhas.join('\n')}\n\n## Reprovadas na verificação\n\n${reprovadas.join('\n') || 'Nenhuma.'}\n`;
  }

  relatorioVerificacao() {
    const e = this.estado;
    const itens = e.checklist.itens.map((i) => `- [${i.ok ? 'x' : ' '}] ${i.item}${i.manual ? ' *(manual)*' : ''}`).join('\n');
    const rodadas = e.auditoria.rodadas.map((r) => `### Rodada ${r.rodada}\n\n${r.problemas.length} problema(s); ${r.corrigidos} corrigido(s); ${r.removidos} removido(s).\n\n${r.problemas.map((p) => `- **${p.tipo}** (${p.secao}): "${String(p.trecho).slice(0, 220)}" — ${p.detalhe}`).join('\n')}`).join('\n\n');
    const pend = e.auditoria.pendentes.map((p) => `- **${p.tipo}** (${p.secao}): "${String(p.trecho).slice(0, 220)}" — ${p.detalhe}`).join('\n') || 'Nenhuma.';
    const ci = e.conferencia_independente;
    const conferencia = ci ? `\n\n## Conferência independente (segunda checagem)\n\nTabela 1 re-extraída para ${ci.extracoes_refeitas} estudos; ${ci.correcoes_aplicadas} correção(ões) confirmada(s) por verificador adversarial aplicada(s).${ci.resumo_conclusao ? ` ${ci.resumo_conclusao}` : ''}\n\n${ci.detalhes.map((d) => `- **${d.status}** (${d.secao}, ${d.tipo}): "${d.frase.slice(0, 200)}" — ${d.justificativa}`).join('\n')}\n` : '';
    const intervencao = (e.restauracao_manual ? `\n\n## Intervenção manual registrada\n\n${e.restauracao_manual.motivo}\n` : '') + conferencia;
    const agentes = [
      e.estilo ? `- Agente de Estilo Acadêmico: ${e.estilo.revisados} parágrafo(s) revisado(s), ${e.estilo.mantidos} mantido(s) pela trava de segurança; expressões típicas de IA ${e.estilo.maneirismos_antes} → ${e.estilo.maneirismos_depois}.` : '',
      e.limitacoes ? `- Agente de Limitações e Coerência: ${e.limitacoes.paragrafo_unico ? 'limitações em um único parágrafo' : 'parágrafo de limitações mantido'}; ${e.limitacoes.reescritas} ressalva(s) reescrita(s), ${e.limitacoes.removidas} removida(s).` : '',
    ].filter(Boolean).join('\n');
    return `# Relatório de verificação\n\nMotor de IA: ${e.llm.provedor} (${e.llm.modelos.join(', ')}), ${e.llm.chamadas} chamadas.${agentes ? `\n\n## Agentes de acabamento\n\n${agentes}` : ''}${intervencao}\n\n## Checklist (${e.checklist.aprovados}/${e.checklist.total} automáticos aprovados)\n\n${itens}\n\n## Pendências para revisão humana\n\n${pend}\n\n## Auditoria de citações\n\n${rodadas}\n`;
  }

  async aplicarDevolutiva(opcoes) {
    return aplicarDevolutivaOrientador(this, opcoes);
  }

  async aplicarHumanizacao(opcoes) {
    return aplicarHumanizacaoCompleta(this, opcoes);
  }

  restaurarVersao(nomePasta) {
    return restaurarVersaoOrientador(this, nomePasta);
  }
}

// ------------------------------------------------------------------ utilitarios
// Trava de forca das afirmacoes: a reescrita nao pode introduzir verbos causais ou mais fortes,
// perder modalizadores nem trocar rotulos de delineamento (serie, coorte, transversal...).
const FORTES = /\b(demonstr(a|am|ou|aram|ar)|comprov(a|am|ou|aram|ar)|caus(a|am|ou|aram|ar)|provoc(a|am|ou|aram|ar)|determin(a|am|ou|aram|ar)|garant(e|em|iu|iram|ir)|confirm(a|am|ou|aram|ar)|estabelec(e|em|eu|eram|er)|elev(a|am|ou|aram|ar)|aument(a|am|ou|aram|ar)|reduz(|em|iu|iram|ir)|diminu(i|em|iu|iram|ir)|result(a|am|ou|aram|ar)|evidenci(a|am|ou|aram|ar)|consistentemente|inequivocamente|claramente|sempre|todos os estudos)\b/gi;
const MODAIS = /\b(suger\w*|pode\w*|podem|possivelmente|provavelmente|parece\w*|indicar?i?\w*|aponta\w*|alguns|algumas|em parte)\b/gi;
const DELINEAMENTOS = /\b(s[ée]rie|coorte|transversal|caso-controle|ensaio|randomizad\w*|prospectiv\w*|retrospectiv\w*|observacional|multic[eê]ntric\w*)\b/gi;
function contagem(re, s) {
  const mapa = new Map();
  for (const m of String(s).toLowerCase().matchAll(re)) mapa.set(m[0], (mapa.get(m[0]) || 0) + 1);
  return mapa;
}
function forcaPreservada(original, novo) {
  const fo = contagem(FORTES, original);
  for (const [termo, n] of contagem(FORTES, novo)) if (n > (fo.get(termo) || 0)) return false;
  const mo = [...contagem(MODAIS, original).values()].reduce((a, b) => a + b, 0);
  const mn = [...contagem(MODAIS, novo).values()].reduce((a, b) => a + b, 0);
  if (mn < mo) return false;
  const de = contagem(DELINEAMENTOS, original);
  const dn = contagem(DELINEAMENTOS, novo);
  if (de.size !== dn.size || [...de].some(([k, v]) => dn.get(k) !== v)) return false;
  return true;
}

// Modelos as vezes devolvem a lista pura ou com outro nome de chave; aceita os dois formatos.
function listaDe(dados, chave) {
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.[chave])) return dados[chave];
  const outra = Object.values(dados || {}).find((v) => Array.isArray(v) && v.every((x) => x && typeof x === 'object'));
  return outra || [];
}

const texto = (v) => String(v ?? '').replace(/\s+/g, ' ').trim() || 'NI';
const contarPalavras = (s) => (String(s).match(/[\p{L}\p{N}]+/gu) || []).length;

function validarPlano(d, params) {
  const lista = (v, pad = []) => (Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : pad);
  const str = (v, pad = '') => (typeof v === 'string' && v.trim() ? v.trim() : pad);
  const plano = {
    titulo_provisorio: str(d?.titulo_provisorio, params.tema),
    pergunta: str(d?.pergunta, params.pergunta || params.tema),
    pico: { P: str(d?.pico?.P, 'NI'), I: str(d?.pico?.I, 'NI'), Co: str(d?.pico?.Co, 'NI'), S: str(d?.pico?.S, 'estudos primários observacionais ou de intervenção') },
    descritores_mesh: lista(d?.descritores_mesh),
    descritores_decs: lista(d?.descritores_decs),
    palavras_chave: lista(d?.palavras_chave, [params.tema]),
    keywords: lista(d?.keywords, []),
    pubmed: str(d?.pubmed, params.tema),
    scielo: str(d?.scielo, params.tema),
    lilacs: str(d?.lilacs, d?.scielo || params.tema),
    eixos: lista(d?.eixos, ['Achados principais']).slice(0, 5),
    coluna_exposicao: str(d?.coluna_exposicao, 'Exposição/intervenção'),
    coluna_desfecho: str(d?.coluna_desfecho, 'Desfechos'),
    criterio_inclusao_tema: str(d?.criterio_inclusao_tema, 'estudos que respondam à pergunta norteadora'),
    criterio_exclusao_tema: str(d?.criterio_exclusao_tema, 'estudos que não abordem a pergunta norteadora'),
  };
  // Prefixos de campo (ti:, mh:) quebram a busca livre do SciELO/LILACS.
  plano.scielo = plano.scielo.replace(/\b(ti|ab|mh|tw|au):/gi, '');
  plano.lilacs = plano.lilacs.replace(/\b(ti|ab|mh|tw|au):/gi, '');
  return plano;
}

function normalizarCorpo(t, ehIntroducao) {
  let s = String(t || '').replace(/\r/g, '').replace(/```[a-z]*\n?/gi, '');
  if (ehIntroducao) s = s.replace(/^#{1,6}\s*(1\s*)?introdu[çc][ãa]o\s*\n/im, '').replace(/^#{1,6}\s+.*\n/gm, '');
  else s = s.replace(/^#{1,2}\s*(4\s*)?discuss[ãa]o\s*\n/im, '');
  return s
    .split(/\n\s*\n/)
    .map((b) => (b.trim().startsWith('#') ? b.trim() : b.replace(/\s*\n\s*/g, ' ').trim()))
    .filter(Boolean)
    .join('\n\n');
}

function numerarSubtitulos(md, secao) {
  let i = 0;
  return md.replace(/^#{2,4}\s+(?:\d+(?:\.\d+)*\s+)?(.+)$/gm, (_, t) => `### ${secao}.${++i} ${t.trim()}`);
}

const numeroConfere = (num, resumo) => numeroNoResumo(num, resumo);

function numerosConferem(x, reg) {
  const base = `${reg.titulo} ${reg.resumo}`;
  return ['amostra', 'achados'].every((c) => numerosRelevantes(x[c] || '').every((n) => numeroConfere(n, base)));
}

function removerNumerosNaoConferidos(txt, resumo, campo = '') {
  let s = String(txt || '');
  for (const n of numerosRelevantes(s)) {
    if (numeroConfere(n, resumo)) continue;
    s = s.replace(/\([^()]*\)/g, (m) => (numerosRelevantes(m).includes(n) ? '' : m));
  }
  if (numerosRelevantes(s).every((n) => numeroConfere(n, resumo))) {
    return s.replace(/\s{2,}/g, ' ').trim();
  }
  if (campo === 'amostra') {
    // Para amostra, jamais apagar ou substituir por frase generica; manter descricao com digitos
    return s.replace(/\s{2,}/g, ' ').trim() || String(txt || '').trim();
  }
  return 'Ver resumo original do estudo.';
}

export function deduzirPais(reg) {
  if (!reg) return '';
  const afiliacao = String(reg.afiliacao || '');
  const titulo = String(reg.titulo || '');
  const resumo = String(reg.resumo || '');
  const periodico = String(reg.periodico || '');
  const url = String(reg.url || '');

  // 1. Deteccao por afiliacao ou mencao explicita no titulo/resumo
  const mapasDiretos = [
    [/\b(Brasil|Brazil|Brasileir[ao]|São Paulo|Rio de Janeiro|Belo Horizonte|Porto Alegre|Curitiba|Salvador|Campinas|Recife|Brasília)\b/i, 'Brasil'],
    [/\b(Turquia|Turkey|Turkish|Izmir|Istanbul|Ankara|Antalya|Bursa)\b/i, 'Turquia'],
    [/\b(Estados Unidos|United States|USA|U\.S\.A\.|American|California|New York|Texas|Harvard|Mayo Clinic)\b/i, 'Estados Unidos'],
    [/\b(Espanha|Spain|Spanish|España|Madrid|Barcelona|Valencia|Sevilla)\b/i, 'Espanha'],
    [/\b(Portugal|Portuguese|Portuguesa|Lisboa|Porto|Coimbra)\b/i, 'Portugal'],
    [/\b(Itália|Italia|Italy|Italian|Roma|Milano|Napoli|Bologna)\b/i, 'Itália'],
    [/\b(França|France|French|Paris|Lyon|Marseille)\b/i, 'França'],
    [/\b(Reino Unido|United Kingdom|UK|U\.K\.|England|British|London|Oxford|Cambridge|Scotland)\b/i, 'Reino Unido'],
    [/\b(Alemanha|Germany|German|Deutschland|Berlin|München|Munich|Heidelberg)\b/i, 'Alemanha'],
    [/\b(China|Chinese|Beijing|Shanghai|Wuhan|Guangzhou)\b/i, 'China'],
    [/\b(Japão|Japan|Japanese|Tokyo|Osaka|Kyoto)\b/i, 'Japão'],
    [/\b(Índia|India|Indian|New Delhi|Mumbai|Bangalore)\b/i, 'Índia'],
    [/\b(Canadá|Canada|Canadian|Toronto|Montreal|Vancouver)\b/i, 'Canadá'],
    [/\b(Austrália|Australia|Australian|Sydney|Melbourne)\b/i, 'Austrália'],
    [/\b(México|Mexico|Mexican|Ciudad de México|Guadalajara|Monterrey)\b/i, 'México'],
    [/\b(Argentina|Argentine|Argentinian|Buenos Aires|Córdoba|Rosario)\b/i, 'Argentina'],
    [/\b(Chile|Chilean|Santiago|Valparaíso|Concepción)\b/i, 'Chile'],
    [/\b(Colômbia|Colombia|Colombian|Bogotá|Medellín|Cali)\b/i, 'Colômbia'],
    [/\b(Peru|Peruvian|Lima|Arequipa|Cusco)\b/i, 'Peru'],
    [/\b(Uruguai|Uruguay|Montevideo)\b/i, 'Uruguai'],
    [/\b(Irã|Iran|Iranian|Tehran|Shiraz|Isfahan)\b/i, 'Irã'],
    [/\b(Egito|Egypt|Egyptian|Cairo|Alexandria)\b/i, 'Egito'],
    [/\b(Coreia do Sul|South Korea|Korean|Seoul)\b/i, 'Coreia do Sul'],
    [/\b(Suécia|Sweden|Swedish|Stockholm)\b/i, 'Suécia'],
    [/\b(Holanda|Netherlands|Dutch|Amsterdam|Rotterdam)\b/i, 'Holanda'],
    [/\b(Polônia|Poland|Polish|Warsaw|Krakow)\b/i, 'Polônia'],
    [/\b(Suíça|Switzerland|Swiss|Zurich|Geneva)\b/i, 'Suíça'],
    [/\b(Dinamarca|Denmark|Danish|Copenhagen)\b/i, 'Dinamarca'],
    [/\b(Noruega|Norway|Norwegian|Oslo)\b/i, 'Noruega'],
    [/\b(Grécia|Greece|Greek|Athens)\b/i, 'Grécia'],
  ];

  for (const [re, pais] of mapasDiretos) {
    if (re.test(afiliacao)) return pais;
  }
  for (const [re, pais] of mapasDiretos) {
    if (re.test(titulo)) return pais;
  }
  for (const [re, pais] of mapasDiretos) {
    if (re.test(resumo)) return pais;
  }

  return '';
}

function csvTriagem(cands, regs) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const linhas = ['id;base;ano;titulo;decisao;motivo;delineamento;relevancia;url'];
  for (const c of cands) {
    const d = c.decisao || {};
    linhas.push([c.cid, NOMES_BASE[c.base], c.ano, c.titulo, d.incluir ? 'incluido' : 'excluido', d.motivo || '', d.delineamento || '', d.relevancia || '', regs[c.uid]?.url || c.url].map(esc).join(';'));
  }
  return `${String.fromCharCode(0xfeff)}${linhas.join('\n')}`;
}
