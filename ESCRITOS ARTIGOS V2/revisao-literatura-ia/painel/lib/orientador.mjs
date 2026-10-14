import fs from 'node:fs';
import path from 'node:path';
import { exportarArtigo } from './exportar.mjs';
import { citacoesDoTexto } from './referencias.mjs';
import { limparInvisiveis } from './texto.mjs';
import {
  promptAnaliseOrientador,
  promptHumanizacaoCompleta,
  promptHumanizacaoFechamento,
  promptRevisaoFechamento,
  promptRevisaoSecao,
  SISTEMA_ANALISADOR_ORIENTADOR,
  SISTEMA_HUMANIZADOR_A1,
  SISTEMA_REDATOR_ORIENTADOR,
} from './prompts.mjs';
import { higienizarTextoForense } from './forense.mjs';
import { auditarReferenciasERetracoes } from './validacao_bibliografica.mjs';
import { auditarConformidade, auditarConformidadePrisma } from './conformidade.mjs';
import { auditarEstatisticaEBiomarcadores, autoRemediarEstatistica } from './auditoria_estatistica.mjs';
import { gerarCoverLetter, gerarEstruturaRebuttal, sanitizarTextoRebuttal } from './submissao.mjs';
import { avaliarRiscoVies, gerarTrafficLightSVG, gerarSummaryPlotSVG } from './risco_vies.mjs';
import { executarAgenteGrade } from './grade_sof.mjs';
import { executarAgenteGraphicalAbstract } from './graphical_abstract.mjs';
import { executarAgenteTurnitinShield, aplicarParafraseAtiva } from './turnitin_shield.mjs';
import { executarAgenteComplianceEtico } from './compliance_etico.mjs';
import { executarAgenteAdaptadorRevista } from './adaptador_revista.mjs';
import { aplicarGuardrailFidelidade, auditarConsistenciaResumoVsCorpo } from './fidelidade.mjs';

// ====================================================================
// Desmembramento e Remontagem Cirúrgica do Artigo
// ====================================================================

/**
 * Higieniza o bloco de referências bibliográficas, eliminando textos narrativos espúrios
 * acidentalmente anexados após o término das referências Vancouver.
 */
export function sanitizarBlocoReferencias(textoCru) {
  if (!textoCru) return '';
  const blocos = textoCru.split(/\n\s*\n/);
  const blocosValidos = [];
  let contadorRef = 1;

  for (const b of blocos) {
    const trim = b.trim();
    if (!trim) continue;
    // Item de referência numerada (ex: "1. Silva ...", "[1] Silva ...")
    const mItem = trim.match(/^(?:\[\d+\]|\d+\.)\s+([\s\S]+)$/);
    if (mItem) {
      blocosValidos.push(`${contadorRef}. ${mItem[1].trim()}`);
      contadorRef++;
      continue;
    }
    // Declarações éticas ou notas permitidas pós-referências
    if (/^(?:##\s*Declaração|\*(?:Declaração|Transparência|Financiamento|Conflito|Agradecimentos))/i.test(trim)) {
      blocosValidos.push(trim);
      continue;
    }
    // Se já temos referências e este bloco é texto narrativo solto sem numeração: descarta
    if (blocosValidos.length > 0) {
      continue;
    }
    blocosValidos.push(trim);
  }

  return blocosValidos.join('\n\n').trim();
}

/**
 * Desmembra o artigo em suas seções estruturadas para modificação pontual,
 * preservando byte-a-byte as seções que não forem afetadas.
 */
export function desmembrarArtigo(md) {
  const blocos = md.split(/(?=^## (?:[1-5] |Referências|Metodologia|Materiais e Métodos|Considerações Finais|Resultados e Discussão|Declaração (?:de|sobre o) uso de inteligência artificial))/m);
  const mapa = {
    cabecalho: blocos[0] || '',
    introducao: '',
    metodos: '',
    resultados: '',
    discussao: '',
    conclusao: '',
    transparencia: '',
    referencias: '',
    bruto: blocos,
  };

  for (let i = 1; i < blocos.length; i++) {
    const b = blocos[i];
    if (/^## (?:1 |1\. )?Introdução/mi.test(b)) {
      mapa.introducao = b.replace(/^## (?:1 |1\. )?Introdução\s*/mi, '').trim();
    } else if (/^## (?:2 |2\. )?(?:Métodos|Metodologia|Materiais e Métodos)/mi.test(b)) {
      mapa.metodos = b.replace(/^## (?:2 |2\. )?(?:Métodos|Metodologia|Materiais e Métodos)\s*/mi, '').trim();
    } else if (/^## (?:3 |3\. )?Resultados/mi.test(b)) {
      mapa.resultados = b.replace(/^## (?:3 |3\. )?Resultados\s*/mi, '').trim();
    } else if (/^## (?:4 |4\. )?Discussão/mi.test(b)) {
      mapa.discussao = b.replace(/^## (?:4 |4\. )?Discussão\s*/mi, '').trim();
    } else if (/^## (?:5 |5\. )?(?:Conclusão|Considerações Finais)/mi.test(b)) {
      const semCab = b.replace(/^## (?:5 |5\. )?(?:Conclusão|Considerações Finais)\s*/mi, '').trim();
      // Isola eventual declaração de transparência no final da conclusão
      const mTransp = semCab.match(/(\n\n\*(?:Declaração de transparência|Transparência)[\s\S]*)$/);
      if (mTransp) {
        mapa.conclusao = semCab.slice(0, mTransp.index).trim();
        mapa.transparencia = mTransp[1].trim();
      } else {
        mapa.conclusao = semCab;
      }
    } else if (/^## Declaração (?:de|sobre o) uso de inteligência artificial/mi.test(b)) {
      mapa.transparencia = b.trim();
    } else if (/^## (?:Referências|Referencias|References)/mi.test(b)) {
      const textoCru = b.replace(/^## (?:Referências|Referencias|References)\s*/mi, '').trim();
      mapa.referencias = sanitizarBlocoReferencias(textoCru);
    }
  }

  // Extrai títulos e resumos do cabeçalho
  const mTitulo = mapa.cabecalho.match(/^# ([^\n]+)/m);
  mapa.titulo = mTitulo ? mTitulo[1].trim() : '';

  const mResumo = mapa.cabecalho.match(/\*\*RESUMO:\*\*\s*([\s\S]*?)(?=\n\n\*\*Palavras-chave:|$)/m);
  mapa.resumo = mResumo ? mResumo[1].trim() : '';

  const mAbstract = mapa.cabecalho.match(/\*\*ABSTRACT:\*\*\s*([\s\S]*?)(?=\n\n\*\*Keywords:|$)/m);
  mapa.abstract = mAbstract ? mAbstract[1].trim() : '';

  const mResumen = mapa.cabecalho.match(/\*\*RESUMEN:\*\*\s*([\s\S]*?)(?=\n\n\*\*Palabras clave:|$)/m);
  mapa.resumen = mResumen ? mResumen[1].trim() : '';

  return mapa;
}

/**
 * Remonta o artigo Markdown a partir de suas partes estruturadas.
 */
export function remontarArtigo(mapa) {
  const partes = [
    mapa.cabecalho.trim(),
    `## 1 Introdução\n\n${mapa.introducao.trim()}`,
    `## 2 Métodos\n\n${mapa.metodos.trim()}`,
    `## 3 Resultados\n\n${mapa.resultados.trim()}`,
    `## 4 Discussão\n\n${mapa.discussao.trim()}`,
    `## 5 Conclusão\n\n${mapa.conclusao.trim()}`,
    mapa.transparencia ? mapa.transparencia.trim() : '',
    mapa.referencias ? `## Referências\n\n${mapa.referencias.trim()}` : '',
  ].filter(Boolean);

  const md = partes.join('\n\n');
  const limpo = limparInvisiveis(md);
  return limpo.texto;
}

// ====================================================================
// Sistema de Snapshot e Backup de Versões
// ====================================================================

export function criarBackup(dir, rodada) {
  const agora = new Date();
  const carimbo = agora.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const nomePasta = `rodada-${rodada}-${carimbo}`;
  const pastaVersoes = path.join(dir, 'versoes');
  const pastaDestino = path.join(pastaVersoes, nomePasta);
  fs.mkdirSync(pastaDestino, { recursive: true });

  const arquivosCopiados = [];
  for (const nome of ['artigo.md', 'artigo.docx', 'artigo.html', 'estado.json', 'relatorio-verificacao.md']) {
    const origem = path.join(dir, nome);
    if (fs.existsSync(origem)) {
      fs.copyFileSync(origem, path.join(pastaDestino, nome));
      arquivosCopiados.push(nome);
    }
  }

  return {
    pasta: nomePasta,
    pasta_completa: pastaDestino,
    timestamp: agora.toISOString(),
    arquivos: arquivosCopiados,
  };
}

export function restaurarVersaoOrientador(trabalho, nomePasta) {
  const pastaSegura = path.basename(nomePasta);
  const pastaOrigem = path.join(trabalho.dir, 'versoes', pastaSegura);
  if (!fs.existsSync(pastaOrigem)) {
    throw new Error(`Pasta de backup "${pastaSegura}" não encontrada.`);
  }

  for (const nome of ['artigo.md', 'artigo.docx', 'artigo.html', 'estado.json']) {
    const src = path.join(pastaOrigem, nome);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(trabalho.dir, nome));
    }
  }

  const novoEstado = JSON.parse(fs.readFileSync(path.join(trabalho.dir, 'estado.json'), 'utf8'));
  trabalho.estado = novoEstado;
  trabalho.salvar();
  trabalho.emit('estado');
  return { ok: true, mensagem: `Versão ${pastaSegura} restaurada com sucesso.` };
}

// ====================================================================
// Fluxo Principal do Agente de Revisão da Devolutiva
// ====================================================================

export async function aplicarDevolutivaOrientador(trabalho, {
  devolutiva,
  instrucoes_adicionais = '',
  criar_backup = true,
  modo = 'cirurgico',
  secoes_permitidas = null,
}) {
  let textoDevolutiva = String(devolutiva || '').trim();
  if (textoDevolutiva.length < 5) {
    textoDevolutiva = 'Revisão integral conforme o Modelo de Escrita Científica Qualis A1: eliminar clichês de IA (ex: "é importante ressaltar", "vale destacar", "no cenário atual", "desempenha um papel crucial"), aprimorar a voz autoral acadêmica e cadência das frases, reforçar o rigor metodológico na distinção de desfechos primários vs secundários, assegurar a precisão das unidades de biomarcadores (PCR mg/L vs mg/dL) e garantir paráfrase ativa sem alterar citações [n] nem números.';
  }

  const arqMd = path.join(trabalho.dir, 'artigo.md');
  if (!fs.existsSync(arqMd)) {
    throw new Error('O artigo principal (artigo.md) ainda não foi gerado neste trabalho.');
  }

  const mdAtual = fs.readFileSync(arqMd, 'utf8');
  const mapaSecoes = desmembrarArtigo(mdAtual);

  const historico = trabalho.estado.revisoes_orientador || [];
  const rodada = historico.length + 1;

  let backupInfo = null;
  if (criar_backup !== false) {
    backupInfo = criarBackup(trabalho.dir, rodada);
    trabalho.log(`Backup de segurança da versão anterior criado em versoes/${backupInfo.pasta}`);
  }

  trabalho.log(`▶ Agente Revisor: Analisando apontamentos do orientador (Rodada ${rodada} — Modo: ${modo.toUpperCase()})...`);

  // Extrai resumo estruturado das seções do artigo atual para dar visibilidade real ao planejador
  const resumoArtigo = Object.entries(mapaSecoes)
    .filter(([k, v]) => Boolean(v && typeof v === 'string' && v.trim().length > 0 && k !== 'referencias'))
    .map(([k, v]) => {
      const paragrafos = v.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
      return `- Seção "${k}": ${paragrafos.length} parágrafo(s) (${v.length} caracteres). Início: "${(paragrafos[0] || '').slice(0, 130).replace(/\n/g, ' ')}..."`;
    })
    .join('\n');

  // 1. Planejamento analítico da devolutiva com contexto do manuscrito
  const rAnalise = await trabalho.ia({
    papel: 'orientador',
    sistema: SISTEMA_ANALISADOR_ORIENTADOR,
    prompt: promptAnaliseOrientador({
      devolutiva: textoDevolutiva,
      instrucoesAdicionais: instrucoes_adicionais,
      tema: trabalho.estado.params?.tema || '',
      pergunta: trabalho.estado.plano?.pergunta || '',
      resumoArtigo,
      secoesDisponiveis: Object.keys(mapaSecoes).filter((k) => k !== 'referencias'),
      secoesPermitidas: Array.isArray(secoes_permitidas) && secoes_permitidas.length > 0 ? secoes_permitidas : null,
      modoPreferido: modo,
    }),
    temperatura: 0.15,
    maxTokens: 4000,
  }, true);

  const plano = rAnalise.dados || {};
  const modoOperacao = plano.modo === 'amplo' || modo === 'amplo' ? 'amplo' : 'cirurgico';
  let secoesAfetadas = Array.isArray(plano.secoes_afetadas) ? plano.secoes_afetadas : [];

  // Se o usuário restringiu as seções na UI, respeita estritamente
  if (Array.isArray(secoes_permitidas) && secoes_permitidas.length > 0) {
    if (secoesAfetadas.length === 0) {
      secoesAfetadas = [...secoes_permitidas];
    } else {
      secoesAfetadas = secoesAfetadas.filter((s) => secoes_permitidas.includes(s));
    }
  }

  // Fallback inteligente: delimita baseado no texto sem impor seções aleatórias
  if (secoesAfetadas.length === 0) {
    const textoBaixo = textoDevolutiva.toLowerCase();
    if (/introdu[cç]/i.test(textoBaixo)) secoesAfetadas.push('introducao');
    if (/m[eé]todo/i.test(textoBaixo)) secoesAfetadas.push('metodos');
    if (/resultado/i.test(textoBaixo)) secoesAfetadas.push('resultados');
    if (/discuss[aã]o/i.test(textoBaixo)) secoesAfetadas.push('discussao');
    if (/conclus[aã]o/i.test(textoBaixo)) secoesAfetadas.push('conclusao');
    if (/resumo|abstract|t[ií]tulo/i.test(textoBaixo)) secoesAfetadas.push('resumo');

    if (secoesAfetadas.length === 0) {
      secoesAfetadas = modoOperacao === 'cirurgico' ? ['discussao'] : ['introducao', 'discussao'];
    }
  }

  trabalho.log(`Modo de revisão ativo: ${modoOperacao.toUpperCase()} (${modoOperacao === 'cirurgico' ? 'preservando trechos estáveis' : 'remodelação Qualis A1'})`);
  trabalho.log(`Parecer sintetizado: ${plano.resumo_parecer || 'Ajustes solicitados identificados.'}`);
  trabalho.log(`Seções a serem revisadas: ${secoesAfetadas.join(', ')}`);

  const fontes = trabalho.fontesNumeradas ? trabalho.fontesNumeradas() : [];
  const alteracoes = [];
  const orientacoesPorSecao = Object.fromEntries(
    (plano.orientacoes || []).map((o) => [o.secao, `${o.apontamento_orientador}\nAção recomendada: ${o.acao_recomendada}`])
  );

  // 2. Revisão da Introdução
  if (secoesAfetadas.includes('introducao')) {
    trabalho.log(`▶ Agente Revisor: ${modoOperacao === 'cirurgico' ? 'Ajustando pontualmente' : 'Reescrevendo'} a Introdução conforme orientação...`);
    try {
      const orientacao = orientacoesPorSecao['introducao'] || textoDevolutiva;
      const fnPromptIntro = (extraInstrucao = '') => promptRevisaoSecao({
        secao: 'introducao',
        tituloSecao: 'Introdução',
        textoAtual: mapaSecoes.introducao,
        orientacao: extraInstrucao ? `${orientacao}\n\n${extraInstrucao}` : orientacao,
        fontes,
        tema: trabalho.estado.params?.tema,
        pergunta: trabalho.estado.plano?.pergunta,
        modo: modoOperacao,
        contextoArtigo: {
          metodos: mapaSecoes.metodos,
          resultados: mapaSecoes.resultados,
        },
      });

      const r = await trabalho.ia({
        papel: 'revisao_orientador',
        sistema: SISTEMA_REDATOR_ORIENTADOR,
        prompt: fnPromptIntro(),
        temperatura: 0.3,
        maxTokens: 6000,
      }, true);

      const dados = r.dados || {};
      if (dados.novo_texto) {
        const textoProposto = dados.novo_texto.replace(/^## 1 Introdução\s*/m, '').trim();
        const guardrail = await aplicarGuardrailFidelidade({
          trabalho,
          secao: 'introducao',
          tituloSecao: 'Introdução',
          textoOriginal: mapaSecoes.introducao,
          textoReescrito: textoProposto,
          fontes,
          orientacao,
          modo: modoOperacao,
          funcaoReexecutarIa: async (discrepancias) => {
            const r2 = await trabalho.ia({
              papel: 'revisao_orientador',
              sistema: SISTEMA_REDATOR_ORIENTADOR,
              prompt: fnPromptIntro(`ATENÇÃO - CORREÇÃO DE FIDELIDADE FACTUAL:\nA tentativa anterior introduziu inconsistências que não constam nas fontes:\n${discrepancias}\nReescreva atendendo ao orientador, mas PRESERVANDO EXATAMENTE todas as citações [n] e os valores numéricos do original.`),
              temperatura: 0.2,
              maxTokens: 6000,
            }, true);
            return r2.dados?.novo_texto ? r2.dados.novo_texto.replace(/^## 1 Introdução\s*/m, '').trim() : null;
          },
        });

        if (!guardrail.revertido) {
          mapaSecoes.introducao = guardrail.textoFinal;
          trabalho.estado.introducao = mapaSecoes.introducao;
          alteracoes.push({
            secao: 'Introdução',
            resumo_mudancas: dados.resumo_mudancas || 'Texto readequado aos apontamentos do orientador.',
            detalhes: dados.detalhes || [],
          });
          trabalho.log(`✔ Introdução revisada e validada: ${dados.resumo_mudancas || 'Concluída com sucesso'}`);
        } else {
          alteracoes.push({
            secao: 'Introdução',
            resumo_mudancas: 'Seção original mantida por Guardrail de Segurança (prevenção de inconsistência factual).',
            revertida: true,
          });
        }
      }
    } catch (errIntro) {
      trabalho.log(`⚠️ Aviso na revisão de Introdução: ${errIntro.message}. Seção mantida original por segurança.`, 'aviso');
      alteracoes.push({
        secao: 'Introdução',
        resumo_mudancas: `Seção mantida original por segurança (${errIntro.message}).`,
        revertida: true,
      });
    }
  }

  // 3. Revisão da Discussão
  if (secoesAfetadas.includes('discussao')) {
    trabalho.log(`▶ Agente Revisor: ${modoOperacao === 'cirurgico' ? 'Ajustando pontualmente' : 'Reescrevendo'} a Discussão conforme orientação...`);
    try {
      const orientacao = orientacoesPorSecao['discussao'] || textoDevolutiva;
      const fnPromptDiscussao = (extraInstrucao = '') => promptRevisaoSecao({
        secao: 'discussao',
        tituloSecao: 'Discussão',
        textoAtual: mapaSecoes.discussao,
        orientacao: extraInstrucao ? `${orientacao}\n\n${extraInstrucao}` : orientacao,
        fontes,
        tema: trabalho.estado.params?.tema,
        pergunta: trabalho.estado.plano?.pergunta,
        modo: modoOperacao,
        contextoArtigo: {
          introducao: mapaSecoes.introducao,
          metodos: mapaSecoes.metodos,
          resultados: mapaSecoes.resultados,
        },
      });

      const r = await trabalho.ia({
        papel: 'revisao_orientador',
        sistema: SISTEMA_REDATOR_ORIENTADOR,
        prompt: fnPromptDiscussao(),
        temperatura: 0.25,
        maxTokens: 8500,
      }, true);

      const dados = r.dados || {};
      if (dados.novo_texto) {
        const textoProposto = dados.novo_texto.replace(/^## 4 Discussão\s*/m, '').trim();
        const guardrail = await aplicarGuardrailFidelidade({
          trabalho,
          secao: 'discussao',
          tituloSecao: 'Discussão',
          textoOriginal: mapaSecoes.discussao,
          textoReescrito: textoProposto,
          fontes,
          orientacao,
          modo: modoOperacao,
          funcaoReexecutarIa: async (discrepancias) => {
            const r2 = await trabalho.ia({
              papel: 'revisao_orientador',
              sistema: SISTEMA_REDATOR_ORIENTADOR,
              prompt: fnPromptDiscussao(`ATENÇÃO - CORREÇÃO DE FIDELIDADE FACTUAL:\nA tentativa anterior introduziu inconsistências que não constam nas fontes:\n${discrepancias}\nReescreva atendendo ao orientador, mas PRESERVANDO EXATAMENTE todas as citações [n] e os valores numéricos do original.`),
              temperatura: 0.15,
              maxTokens: 8500,
            }, true);
            return r2.dados?.novo_texto ? r2.dados.novo_texto.replace(/^## 4 Discussão\s*/m, '').trim() : null;
          },
        });

        if (!guardrail.revertido) {
          mapaSecoes.discussao = guardrail.textoFinal;
          trabalho.estado.discussao = mapaSecoes.discussao;
          alteracoes.push({
            secao: 'Discussão',
            resumo_mudancas: dados.resumo_mudancas || 'Discussão readequada aos apontamentos do orientador.',
            detalhes: dados.detalhes || [],
          });
          trabalho.log(`✔ Discussão revisada e validada: ${dados.resumo_mudancas || 'Concluída com sucesso'}`);
        } else {
          alteracoes.push({
            secao: 'Discussão',
            resumo_mudancas: 'Seção original mantida por Guardrail de Segurança (prevenção de inconsistência factual).',
            revertida: true,
          });
        }
      }
    } catch (errDiscussao) {
      trabalho.log(`⚠️ Aviso na revisão de Discussão: ${errDiscussao.message}. Seção mantida original por segurança.`, 'aviso');
      alteracoes.push({
        secao: 'Discussão',
        resumo_mudancas: `Seção mantida original por segurança (${errDiscussao.message}).`,
        revertida: true,
      });
    }
  }

  // 4. Revisão de Conclusão / Resumo / Título (Fechamento)
  const temFechamento = secoesAfetadas.some((s) => ['conclusao', 'resumo', 'titulo'].includes(s));
  if (temFechamento) {
    trabalho.log('▶ Agente Revisor: Ajustando conclusão, resumo e/ou título...');
    try {
      const orientacao = ['conclusao', 'resumo', 'titulo']
        .filter((s) => orientacoesPorSecao[s])
        .map((s) => `[${s.toUpperCase()}]: ${orientacoesPorSecao[s]}`)
        .join('\n\n') || textoDevolutiva;

      const fAtual = trabalho.estado.fechamento || {};
      const r = await trabalho.ia({
        papel: 'revisao_orientador',
        sistema: SISTEMA_REDATOR_ORIENTADOR,
        prompt: promptRevisaoFechamento({
          tituloAtual: trabalho.estado.titulo || mapaSecoes.titulo,
          resumoAtual: fAtual.resumo || mapaSecoes.resumo,
          abstractAtual: fAtual.abstract || mapaSecoes.abstract,
          resumenAtual: fAtual.resumen || mapaSecoes.resumen,
          conclusaoAtual: fAtual.conclusao || mapaSecoes.conclusao,
          orientacao,
          tema: trabalho.estado.params?.tema,
          pergunta: trabalho.estado.plano?.pergunta,
        }),
        temperatura: 0.2,
        maxTokens: 6000,
      }, true);

      const dados = r.dados || {};

      if (dados.alterou_titulo && dados.titulo) {
        trabalho.estado.titulo = dados.titulo;
        if (trabalho.estado.fechamento) {
          trabalho.estado.fechamento.titulo = dados.titulo;
          if (dados.titulo_en) trabalho.estado.fechamento.titulo_en = dados.titulo_en;
          if (dados.titulo_es) trabalho.estado.fechamento.titulo_es = dados.titulo_es;
        }
        mapaSecoes.cabecalho = mapaSecoes.cabecalho.replace(/^# [^\n]+/m, `# ${dados.titulo}`);
        alteracoes.push({
          secao: 'Título',
          resumo_mudancas: `Título atualizado para: "${dados.titulo}"`,
        });
        trabalho.log(`✔ Título atualizado: ${dados.titulo}`);
      }

      if (dados.alterou_conclusao && dados.conclusao) {
        mapaSecoes.conclusao = dados.conclusao.replace(/^## 5 Conclusão\s*/m, '').trim();
        if (trabalho.estado.fechamento) trabalho.estado.fechamento.conclusao = mapaSecoes.conclusao;
        alteracoes.push({
          secao: 'Conclusão',
          resumo_mudancas: dados.resumo_mudancas || 'Conclusão reescrita atendendo aos pontos do orientador.',
        });
        trabalho.log('✔ Conclusão revisada com sucesso.');
      }

      if (dados.alterou_resumo && dados.resumo) {
        if (trabalho.estado.fechamento) {
          trabalho.estado.fechamento.resumo = dados.resumo;
          if (dados.abstract) trabalho.estado.fechamento.abstract = dados.abstract;
          if (dados.resumen) trabalho.estado.fechamento.resumen = dados.resumen;
        }
        const resumoFormatado = typeof dados.resumo === 'string' ? dados.resumo : [
          dados.resumo.objetivo ? `**Objetivo:** ${dados.resumo.objetivo}` : '',
          dados.resumo.metodos ? `**Métodos:** ${dados.resumo.metodos}` : '',
          dados.resumo.resultados ? `**Resultados:** ${dados.resumo.resultados}` : '',
          dados.resumo.conclusao ? `**Conclusão:** ${dados.resumo.conclusao}` : '',
        ].filter(Boolean).join(' ');

        mapaSecoes.cabecalho = mapaSecoes.cabecalho.replace(
          /\*\*RESUMO:\*\*[\s\S]*?(?=\n\n\*\*Palavras-chave:|$)/m,
          `**RESUMO:** ${resumoFormatado}`
        );

        if (dados.abstract) {
          const abstractFormatado = typeof dados.abstract === 'string' ? dados.abstract : [
            dados.abstract.objective ? `**Objective:** ${dados.abstract.objective}` : '',
            dados.abstract.methods ? `**Methods:** ${dados.abstract.methods}` : '',
            dados.abstract.results ? `**Results:** ${dados.abstract.results}` : '',
            dados.abstract.conclusion ? `**Conclusion:** ${dados.abstract.conclusion}` : '',
          ].filter(Boolean).join(' ');

          mapaSecoes.cabecalho = mapaSecoes.cabecalho.replace(
            /\*\*ABSTRACT:\*\*[\s\S]*?(?=\n\n\*\*Keywords:|$)/m,
            `**ABSTRACT:** ${abstractFormatado}`
          );
        }

        alteracoes.push({
          secao: 'Resumo / Abstract',
          resumo_mudancas: 'Resumo estruturado e abstract atualizados em consonância com o manuscrito.',
        });
        trabalho.log('✔ Resumo estruturado e abstract alinhados.');
      }
    } catch (errFechamento) {
      trabalho.log(`⚠️ Aviso na revisão de Conclusão/Fechamento: ${errFechamento.message}. Seção mantida original por segurança.`, 'aviso');
      alteracoes.push({
        secao: 'Conclusão / Fechamento',
        resumo_mudancas: `Seção mantida original por segurança (${errFechamento.message}).`,
        revertida: true,
      });
    }
  }

  // 5. Revisão de Métodos (se expressamente solicitada)
  if (secoesAfetadas.includes('metodos')) {
    trabalho.log(`▶ Agente Revisor: ${modoOperacao === 'cirurgico' ? 'Ajustando pontualmente' : 'Reescrevendo'} Métodos conforme orientação do orientador...`);
    try {
      const orientacao = orientacoesPorSecao['metodos'] || textoDevolutiva;
      const fnPromptMetodos = (extraInstrucao = '') => promptRevisaoSecao({
        secao: 'metodos',
        tituloSecao: 'Métodos',
        textoAtual: mapaSecoes.metodos,
        orientacao: extraInstrucao ? `${orientacao}\n\n${extraInstrucao}` : orientacao,
        fontes,
        tema: trabalho.estado.params?.tema,
        pergunta: trabalho.estado.plano?.pergunta,
        modo: modoOperacao,
        contextoArtigo: {
          introducao: mapaSecoes.introducao,
        },
      });

      const r = await trabalho.ia({
        papel: 'revisao_orientador',
        sistema: SISTEMA_REDATOR_ORIENTADOR,
        prompt: fnPromptMetodos(),
        temperatura: 0.2,
        maxTokens: 5000,
      }, true);

      const dados = r.dados || {};
      if (dados.novo_texto) {
        const textoProposto = dados.novo_texto.replace(/^## 2 Métodos\s*/m, '').trim();
        const guardrail = await aplicarGuardrailFidelidade({
          trabalho,
          secao: 'metodos',
          tituloSecao: 'Métodos',
          textoOriginal: mapaSecoes.metodos,
          textoReescrito: textoProposto,
          fontes,
          orientacao,
          modo: modoOperacao,
          funcaoReexecutarIa: async (discrepancias) => {
            const r2 = await trabalho.ia({
              papel: 'revisao_orientador',
              sistema: SISTEMA_REDATOR_ORIENTADOR,
              prompt: fnPromptMetodos(`ATENÇÃO - CORREÇÃO DE FIDELIDADE FACTUAL:\nA tentativa anterior introduziu inconsistências que não constam nas fontes:\n${discrepancias}\nReescreva atendendo ao orientador, mas PRESERVANDO EXATAMENTE todas as citações [n] e os valores numéricos do original.`),
              temperatura: 0.15,
              maxTokens: 5000,
            }, true);
            return r2.dados?.novo_texto ? r2.dados.novo_texto.replace(/^## 2 Métodos\s*/m, '').trim() : null;
          },
        });

        if (!guardrail.revertido) {
          mapaSecoes.metodos = guardrail.textoFinal;
          trabalho.estado.metodos = mapaSecoes.metodos;
          alteracoes.push({
            secao: 'Métodos',
            resumo_mudancas: dados.resumo_mudancas || 'Métodos ajustados conforme solicitação do orientador.',
            detalhes: dados.detalhes || [],
          });
          trabalho.log('✔ Métodos revisados e validados pelo Guardrail de Fidelidade.');
        } else {
          alteracoes.push({
            secao: 'Métodos',
            resumo_mudancas: 'Seção Métodos mantida original por Guardrail de Segurança (prevenção de inconsistência).',
            revertida: true,
          });
        }
      }
    } catch (errMetodos) {
      trabalho.log(`⚠️ Aviso na revisão de Métodos: ${errMetodos.message}. Seção mantida original por segurança.`, 'aviso');
      alteracoes.push({
        secao: 'Métodos',
        resumo_mudancas: `Seção mantida original por segurança (${errMetodos.message}).`,
        revertida: true,
      });
    }
  }

  // 6. Revisão de Resultados (se solicitada)
  if (secoesAfetadas.includes('resultados')) {
    trabalho.log(`▶ Agente Revisor: ${modoOperacao === 'cirurgico' ? 'Ajustando pontualmente' : 'Reescrevendo'} Resultados conforme orientação do orientador...`);
    try {
      const orientacao = orientacoesPorSecao['resultados'] || textoDevolutiva;
      const fnPromptResultados = (extraInstrucao = '') => promptRevisaoSecao({
        secao: 'resultados',
        tituloSecao: 'Resultados',
        textoAtual: mapaSecoes.resultados,
        orientacao: extraInstrucao ? `${orientacao}\n\n${extraInstrucao}` : orientacao,
        fontes,
        tema: trabalho.estado.params?.tema,
        pergunta: trabalho.estado.plano?.pergunta,
        modo: modoOperacao,
        contextoArtigo: {
          introducao: mapaSecoes.introducao,
          metodos: mapaSecoes.metodos,
        },
      });

      const r = await trabalho.ia({
        papel: 'revisao_orientador',
        sistema: SISTEMA_REDATOR_ORIENTADOR,
        prompt: fnPromptResultados(),
        temperatura: 0.2,
        maxTokens: 8500,
      }, true);

      const dados = r.dados || {};
      if (dados.novo_texto) {
        const textoProposto = dados.novo_texto.replace(/^## 3 Resultados\s*/m, '').trim();
        const guardrail = await aplicarGuardrailFidelidade({
          trabalho,
          secao: 'resultados',
          tituloSecao: 'Resultados',
          textoOriginal: mapaSecoes.resultados,
          textoReescrito: textoProposto,
          fontes,
          orientacao,
          modo: modoOperacao,
          funcaoReexecutarIa: async (discrepancias) => {
            const r2 = await trabalho.ia({
              papel: 'revisao_orientador',
              sistema: SISTEMA_REDATOR_ORIENTADOR,
              prompt: fnPromptResultados(`ATENÇÃO - CORREÇÃO DE FIDELIDADE FACTUAL:\nA tentativa anterior introduziu inconsistências que não constam nas fontes:\n${discrepancias}\nReescreva atendendo ao orientador, mas PRESERVANDO EXATAMENTE todas as citações [n] e os valores numéricos do original.`),
              temperatura: 0.15,
              maxTokens: 8500,
            }, true);
            return r2.dados?.novo_texto ? r2.dados.novo_texto.replace(/^## 3 Resultados\s*/m, '').trim() : null;
          },
        });

        if (!guardrail.revertido) {
          mapaSecoes.resultados = guardrail.textoFinal;
          trabalho.estado.resultados = mapaSecoes.resultados;
          alteracoes.push({
            secao: 'Resultados',
            resumo_mudancas: dados.resumo_mudancas || 'Resultados e caracterização dos estudos ajustados.',
            detalhes: dados.detalhes || [],
          });
          trabalho.log('✔ Resultados revisados e validados pelo Guardrail de Fidelidade.');
        } else {
          alteracoes.push({
            secao: 'Resultados',
            resumo_mudancas: 'Seção Resultados mantida original por Guardrail de Segurança (prevenção de inconsistência).',
            revertida: true,
          });
        }
      }
    } catch (errResultados) {
      trabalho.log(`⚠️ Aviso na revisão de Resultados: ${errResultados.message}. Seção mantida original por segurança.`, 'aviso');
      alteracoes.push({
        secao: 'Resultados',
        resumo_mudancas: `Seção mantida original por segurança devido a resposta extensa (${errResultados.message}).`,
        revertida: true,
      });
    }
  }

  // 6. Remontagem e Validação
  let novoMd = remontarArtigo(mapaSecoes);
  const remediacaoEst = autoRemediarEstatistica(novoMd);
  if (remediacaoEst.alterado) {
    novoMd = remediacaoEst.md;
    trabalho.log(`✔ Auto-remediação estatística: ${remediacaoEst.correcoes.length} inconsistência(s) corrigida(s) deterministicamente (ex: p < 0,001 / IC95%).`);
  }
  fs.writeFileSync(arqMd, novoMd, 'utf8');

  // Checagem de integridade das citações
  const totalRefs = (trabalho.estado.referencias || []).length;
  if (totalRefs > 0) {
    const cits = citacoesDoTexto(novoMd);
    const invalidas = cits.filter((n) => n < 1 || n > totalRefs);
    if (invalidas.length) {
      trabalho.log(`Aviso de integridade: detectadas citações fora do intervalo esperado (1-${totalRefs}).`, 'aviso');
    }
  }

  // 6.1 Auditoria Estatística e Biomarcadores
  trabalho.log('▶ Auditoria Estatística: Inspecionando p-valores, intervalos de confiança e unidades laboratoriais...');
  const auditEst = auditarEstatisticaEBiomarcadores(novoMd);
  if (auditEst.alertas.length > 0) {
    trabalho.log(`Aviso estatístico: ${auditEst.alertas.length} ponto(s) de atenção em notações estatísticas/biomarcadores.`, 'aviso');
  }

  // 6.2 Auditoria de Conformidade (PRISMA 2020 / STROBE)
  const auditPrisma = auditarConformidade(novoMd, mapaSecoes);
  trabalho.log(`✔ Auditoria de Diretriz (${auditPrisma.diretriz}): Score ${auditPrisma.score_percentual}% (${auditPrisma.itens_conformes}/${auditPrisma.total_itens} itens atendidos — ${auditPrisma.status_geral}).`);

  // 6.3 Auditoria de Consistência Interna (Resumo vs Métodos/Resultados)
  const auditConsistencia = auditarConsistenciaResumoVsCorpo({
    resumo: mapaSecoes.resumo || '',
    metodos: mapaSecoes.metodos || '',
    resultados: mapaSecoes.resultados || '',
    discussao: mapaSecoes.discussao || '',
  });
  if (auditConsistencia.inconsistencias.length > 0) {
    trabalho.log(`⚠️ Consistência Interna: ${auditConsistencia.inconsistencias.length} divergência(s) entre Resumo e Métodos/Resultados (Score: ${auditConsistencia.score}%).`, 'aviso');
  } else {
    trabalho.log('✔ Consistência Interna: Resumo 100% alinhado aos números do corpo do artigo.');
  }

  // 6.4 Tabela de Resposta Ponto a Ponto (Rebuttal Table)
  trabalho.log('▶ Gerando Tabela de Resposta Ponto a Ponto aos Revisores (Rebuttal)...');
  const rebuttalMd = gerarEstruturaRebuttal({
    parecer: textoDevolutiva,
    alteracoes: alteracoes.map((alt) => ({
      secao: alt.secao,
      pedido_orientador: orientacoesPorSecao[alt.secao.toLowerCase()] || 'Ajustes solicitados',
      resumo_mudancas: alt.resumo_mudancas,
    })),
  });
  fs.writeFileSync(path.join(trabalho.dir, 'rebuttal.md'), rebuttalMd, 'utf8');
  if (!trabalho.estado.arquivos) trabalho.estado.arquivos = {};
  trabalho.estado.arquivos.rebuttal = 'rebuttal.md';

  // 7. Regeneração dos Documentos (Word .docx e versão HTML)
  trabalho.log('▶ Regenerando documento Word (.docx) diagramado e versão HTML...');
  const exp = await exportarArtigo(trabalho.dir, trabalho.estado.titulo, novoMd, {
    autores: trabalho.estado.params?.autores,
  });
  if (exp.erro_docx) {
    trabalho.log(`Aviso na geração do Word (.docx): ${exp.erro_docx}`, 'aviso');
  } else {
    trabalho.log('✔ Documento Word (.docx) nas normas ABNT atualizado com sucesso.');
  }

  // Preserva snapshot imutável da versão resultante final desta rodada
  const pastaVersoes = path.join(trabalho.dir, 'versoes');
  fs.mkdirSync(pastaVersoes, { recursive: true });
  const nomePastaRodadaFinal = `rodada-${rodada}-final`;
  const destinoRodadaFinal = path.join(pastaVersoes, nomePastaRodadaFinal);
  fs.mkdirSync(destinoRodadaFinal, { recursive: true });
  for (const nome of ['artigo.md', 'artigo.docx', 'artigo.html']) {
    const src = path.join(trabalho.dir, nome);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(destinoRodadaFinal, nome));
  }

  // 7.1 Sincronização dos Ativos Visuais e Epistêmicos (Agentes 15 a 20)
  // Executa apenas se foram alteradas seções com impacto em evidências ou metodologia (metodos, resultados) ou se modo for amplo
  const afetaEvidencias = secoesAfetadas.some((s) => ['metodos', 'resultados'].includes(s)) || modoOperacao === 'amplo';
  if (afetaEvidencias) {
    try {
      const regs = Object.values(trabalho.registros ? trabalho.registros() : {});
      const dadosRoB = avaliarRiscoVies(regs.length ? regs : (trabalho.estado.referencias || []));
      const svgTraffic = gerarTrafficLightSVG(dadosRoB);
      const svgSummary = gerarSummaryPlotSVG(dadosRoB);
      fs.writeFileSync(path.join(trabalho.dir, 'traffic_light.svg'), svgTraffic, 'utf8');
      fs.writeFileSync(path.join(trabalho.dir, 'summary_plot.svg'), svgSummary, 'utf8');

      const artigoParaAgentes = {
        titulo: trabalho.estado.titulo || 'Manuscrito Científico',
        ...mapaSecoes,
        referencias: trabalho.estado.referencias || []
      };
      const resGrade = executarAgenteGrade(artigoParaAgentes, dadosRoB);
      const resGA = executarAgenteGraphicalAbstract(artigoParaAgentes, resGrade.resultadoGrade, dadosRoB);
      fs.writeFileSync(path.join(trabalho.dir, 'graphical_abstract.svg'), resGA.svg, 'utf8');

      if (!trabalho.estado.arquivos) trabalho.estado.arquivos = {};
      trabalho.estado.arquivos.traffic_light = 'traffic_light.svg';
      trabalho.estado.arquivos.summary_plot = 'summary_plot.svg';
      trabalho.estado.arquivos.graphical_abstract = 'graphical_abstract.svg';
      trabalho.log('✔ Gráficos científicos sincronizados: Traffic Light Plot e Graphical Abstract SVG.');
    } catch (errAgentes) {
      trabalho.log(`Aviso ao sincronizar agentes visuais: ${errAgentes.message}`, 'aviso');
    }
  } else {
    trabalho.log('⚡ Modo Cirúrgico Textual: Gráficos científicos mantidos estáveis sem recálculo desnecessário.');
  }

  // 7.2 Reauditoria Dinâmica e Atualização do Laudo de Raio-X
  try {
    const { executarReauditoriaRaioX } = await import('./sanador_raio_x.mjs');
    const novoRaioX = executarReauditoriaRaioX(trabalho);
    trabalho.estado.raio_x_entrada = novoRaioX;
    trabalho.log(`✔ Laudo de Raio-X reauditado pós-correções do orientador: Score ${novoRaioX.score_inicial}% (${novoRaioX.status_inicial}).`);
  } catch (errRx) {
    trabalho.log(`Aviso na reauditoria do Raio-X: ${errRx.message}`, 'aviso');
  }

  // 8. Registro no histórico do estado
  const registroRodada = {
    rodada,
    data: new Date().toISOString(),
    modo: modoOperacao,
    devolutiva: textoDevolutiva,
    instrucoes_adicionais: instrucoes_adicionais || '',
    resumo_parecer: plano.resumo_parecer || 'Ajustes solicitados pelo orientador incorporados.',
    secoes_alteradas: alteracoes,
    prisma: {
      score: auditPrisma.score_percentual,
      conformes: auditPrisma.itens_conformes,
      status: auditPrisma.status_geral,
    },
    estatistica: {
      alertas: auditEst.total_alertas,
      p_valores: auditEst.achados.p_valores_analisados,
    },
    backup: backupInfo ? backupInfo.pasta : null,
    pasta_resultado: nomePastaRodadaFinal,
    modelos: (trabalho.estado.llm?.modelos || []).slice(-2),
  };

  trabalho.estado.revisoes_orientador = historico;
  trabalho.estado.revisoes_orientador.push(registroRodada);

  // 9. Atualização do Relatório de Verificação
  const arqRelatorio = path.join(trabalho.dir, 'relatorio-verificacao.md');
  if (fs.existsSync(arqRelatorio)) {
    let relatorio = fs.readFileSync(arqRelatorio, 'utf8');
    const secaoRelatorio = `\n\n## Devolutiva do Orientador — Rodada ${rodada} (${new Date().toLocaleDateString('pt-BR')})\n\n**Modo:** ${modoOperacao.toUpperCase()}\n\n**Parecer do orientador:**\n> ${textoDevolutiva.replace(/\n/g, '\n> ')}\n\n**Síntese das alterações aplicadas:**\n${alteracoes.map((a) => `- **${a.secao}:** ${sanitizarTextoRebuttal(a.resumo_mudancas)}`).join('\n')}\n\n**Auditoria de Qualidade:**\n- **PRISMA 2020 Score:** ${auditPrisma.score_percentual}% (${auditPrisma.itens_conformes}/27 itens)\n- **Auditoria Estatística:** ${auditEst.total_alertas === 0 ? 'Sem inconsistências de p-valores ou unidades' : `${auditEst.total_alertas} observação(ões)`}\n- **Rebuttal Table:** Gerada e salva em \`rebuttal.md\`\n${backupInfo ? `\n*Backup da versão anterior arquivado em: \`versoes/${backupInfo.pasta}\`.*` : ''}\n`;
    relatorio += secaoRelatorio;
    fs.writeFileSync(arqRelatorio, relatorio, 'utf8');
  }

  trabalho.salvar();
  trabalho.emit('estado');
  trabalho.log(`✔ Rodada ${rodada} de correções do orientador concluída com sucesso (${modoOperacao.toUpperCase()})!`);

  return {
    ok: true,
    rodada,
    modo: modoOperacao,
    resumo_parecer: plano.resumo_parecer,
    alteracoes,
    backup: backupInfo ? backupInfo.pasta : null,
    backup_info: backupInfo,
    arquivos: trabalho.estado.arquivos,
  };
}

// ====================================================================
// Trio de Agentes: Humanizador, Qualis A1 e Remoção de Marcas-d'água
// ====================================================================

/**
 * Executa o Comitê dos Três Agentes Especialistas:
 * 1. Agente Humanizador de Voz e Cadência
 * 2. Agente de Escrita Científica Qualis A1
 * 3. Agente de Remoção de Marcas-d'água de IA
 * com aplicação da Nova Regra de Ouro (autorização de remodelação profunda).
 */
export async function aplicarHumanizacaoCompleta(trabalho, {
  secoes = null,
  instrucoes = '',
  orientacoes = '',
  criar_backup = true,
  modo = 'cirurgico',
} = {}) {
  const instrucaoFinal = (instrucoes || orientacoes || '').trim();
  const arqMd = path.join(trabalho.dir, 'artigo.md');
  if (!fs.existsSync(arqMd)) {
    throw new Error('O artigo principal (artigo.md) ainda não foi gerado neste trabalho.');
  }

  const mdAtual = fs.readFileSync(arqMd, 'utf8');


  const historico = trabalho.estado.revisoes_orientador || [];
  const rodada = historico.length + 1;

  let backupInfo = null;
  if (criar_backup !== false) {
    backupInfo = criarBackup(trabalho.dir, rodada);
    trabalho.log(`Backup de segurança da versão anterior criado em versoes/${backupInfo.pasta}`);
  }

  trabalho.log(`▶ Iniciando Suíte Completa de Agentes (Forense, Retratações, PRISMA 2020, Humanizador, Qualis A1 e Cover Letter) — Rodada ${rodada}...`);

  // 0. Etapa Forense: Limpeza de Unicode e remoção de artefatos esteganográficos
  trabalho.log('▶ Agente Forense: Varrendo caracteres invisíveis, homóglifos e bidi overrides...');
  const forense = higienizarTextoForense(mdAtual);
  if (forense.estatisticas.total_artefatos > 0) {
    trabalho.log(`✔ Agente Forense: ${forense.estatisticas.total_artefatos} artefatos invisíveis/homóglifos purgados com sucesso.`);
  } else {
    trabalho.log('✔ Agente Forense: Nenhum caractere invisível ou homóglifo anômalo detectado (texto íntegro).');
  }
  const mapaSecoes = desmembrarArtigo(forense.texto);

  // 0.1. Sentinela Bibliográfica e Anti-Retratação
  trabalho.log('▶ Sentinela Bibliográfica: Verificando status de retratação e DOIs na Crossref...');
  const auditBib = await auditarReferenciasERetracoes(trabalho.estado.referencias || []);
  if (auditBib.retratadas.length > 0) {
    trabalho.log(`⚠️ ALERTA GRAVE: ${auditBib.retratadas.length} referência(s) com nota de retratação detectada(s)!`, 'aviso');
  } else {
    trabalho.log(`✔ Sentinela Bibliográfica: 0 retratações detectadas. ${auditBib.validadas_crossref} DOIs validados.`);
  }

  const secoesAlvo = Array.isArray(secoes) && secoes.length > 0
    ? secoes
    : ['introducao', 'metodos', 'resultados', 'discussao', 'fechamento'].filter((s) => {
        if (s === 'introducao') return !!mapaSecoes.introducao;
        if (s === 'metodos') return !!mapaSecoes.metodos;
        if (s === 'resultados') return !!mapaSecoes.resultados;
        if (s === 'discussao') return !!mapaSecoes.discussao;
        if (s === 'fechamento') return !!mapaSecoes.conclusao || !!mapaSecoes.resumo;
        return !!mapaSecoes[s];
      });

  const fontes = trabalho.fontesNumeradas ? trabalho.fontesNumeradas() : [];
  const alteracoes = [];
  const todasMarcasRemovidas = [];

  // 1. Introdução
  if (secoesAlvo.includes('introducao') && mapaSecoes.introducao) {
    trabalho.log('▶ Agentes Especialistas: Humanizando Introdução e purgando marcas de IA...');
    const fnPromptIntro = (extraInstrucao = '') => promptHumanizacaoCompleta({
      secao: 'introducao',
      tituloSecao: 'Introdução',
      textoAtual: mapaSecoes.introducao,
      orientacoes: extraInstrucao ? `${instrucaoFinal}\n\n${extraInstrucao}` : instrucaoFinal,
      fontes,
      tema: trabalho.estado.params?.tema,
      pergunta: trabalho.estado.plano?.pergunta,
    });

    const r = await trabalho.ia({
      papel: 'humanizacao_qualis_a1',
      sistema: SISTEMA_HUMANIZADOR_A1,
      prompt: fnPromptIntro(),
      temperatura: 0.35,
      maxTokens: 5500,
    }, true);

    const dados = r.dados || {};
    if (dados.novo_texto) {
      const textoProposto = dados.novo_texto.replace(/^## (?:1 |1\. )?Introdução\s*/m, '').trim();
      const guardrail = await aplicarGuardrailFidelidade({
        trabalho,
        secao: 'introducao',
        tituloSecao: 'Introdução',
        textoOriginal: mapaSecoes.introducao,
        textoReescrito: textoProposto,
        fontes,
        modo,
        funcaoReexecutarIa: async (discrepancias) => {
          const r2 = await trabalho.ia({
            papel: 'humanizacao_qualis_a1',
            sistema: SISTEMA_HUMANIZADOR_A1,
            prompt: fnPromptIntro(`ATENÇÃO OBRIGATÓRIA (CORREÇÃO DE FIDELIDADE FACTUAL):\nA tentativa anterior introduziu inconsistências que não constam nas fontes:\n${discrepancias}\nReescreva mantendo a cadência humana mas PRESERVANDO EXATAMENTE todas as citações [n] e os valores numéricos/estatísticos do original.`),
            temperatura: 0.2,
            maxTokens: 5500,
          }, true);
          return r2.dados?.novo_texto ? r2.dados.novo_texto.replace(/^## (?:1 |1\. )?Introdução\s*/m, '').trim() : null;
        },
      });

      if (!guardrail.revertido) {
        mapaSecoes.introducao = guardrail.textoFinal;
        trabalho.estado.introducao = mapaSecoes.introducao;
        alteracoes.push({
          secao: 'Introdução',
          resumo_mudancas: dados.resumo_mudancas || 'Introdução reescrita com cadência humana autoral e padrão Qualis A1.',
          marcas_removidas: dados.marcas_removidas || [],
          melhorias_cadencia: dados.melhorias_cadencia || '',
        });
        if (Array.isArray(dados.marcas_removidas)) todasMarcasRemovidas.push(...dados.marcas_removidas);
        trabalho.log(`✔ Introdução humanizada e validada: ${dados.resumo_mudancas || 'Concluída'}`);
      } else {
        alteracoes.push({
          secao: 'Introdução',
          resumo_mudancas: 'Seção original mantida por Guardrail de Segurança (prevenção de inconsistência factual).',
          revertida: true,
        });
      }
    }
  }

  // 2. Discussão
  if (secoesAlvo.includes('discussao') && mapaSecoes.discussao) {
    trabalho.log('▶ Agentes Especialistas: Humanizando Discussão e eliminando marcas-d\'água...');
    const fnPromptDiscussao = (extraInstrucao = '') => promptHumanizacaoCompleta({
      secao: 'discussao',
      tituloSecao: 'Discussão',
      textoAtual: mapaSecoes.discussao,
      orientacoes: extraInstrucao ? `${instrucaoFinal}\n\n${extraInstrucao}` : instrucaoFinal,
      fontes,
      tema: trabalho.estado.params?.tema,
      pergunta: trabalho.estado.plano?.pergunta,
    });

    const r = await trabalho.ia({
      papel: 'humanizacao_qualis_a1',
      sistema: SISTEMA_HUMANIZADOR_A1,
      prompt: fnPromptDiscussao(),
      temperatura: 0.35,
      maxTokens: 9000,
    }, true);

    const dados = r.dados || {};
    if (dados.novo_texto) {
      const textoProposto = dados.novo_texto.replace(/^## (?:4 |4\. )?Discussão\s*/m, '').trim();
      const guardrail = await aplicarGuardrailFidelidade({
        trabalho,
        secao: 'discussao',
        tituloSecao: 'Discussão',
        textoOriginal: mapaSecoes.discussao,
        textoReescrito: textoProposto,
        fontes,
        modo,
        funcaoReexecutarIa: async (discrepancias) => {
          const r2 = await trabalho.ia({
            papel: 'humanizacao_qualis_a1',
            sistema: SISTEMA_HUMANIZADOR_A1,
            prompt: fnPromptDiscussao(`ATENÇÃO OBRIGATÓRIA (CORREÇÃO DE FIDELIDADE FACTUAL):\nA tentativa anterior introduziu inconsistências que não constam nas fontes:\n${discrepancias}\nReescreva mantendo a cadência humana mas PRESERVANDO EXATAMENTE todas as citações [n] e os valores numéricos/estatísticos do original.`),
            temperatura: 0.2,
            maxTokens: 9000,
          }, true);
          return r2.dados?.novo_texto ? r2.dados.novo_texto.replace(/^## (?:4 |4\. )?Discussão\s*/m, '').trim() : null;
        },
      });

      if (!guardrail.revertido) {
        mapaSecoes.discussao = guardrail.textoFinal;
        trabalho.estado.discussao = mapaSecoes.discussao;
        alteracoes.push({
          secao: 'Discussão',
          resumo_mudancas: dados.resumo_mudancas || 'Discussão profundamente refinada, com alta variação rítmica e erradicação de clichês.',
          marcas_removidas: dados.marcas_removidas || [],
          melhorias_cadencia: dados.melhorias_cadencia || '',
        });
        if (Array.isArray(dados.marcas_removidas)) todasMarcasRemovidas.push(...dados.marcas_removidas);
        trabalho.log(`✔ Discussão humanizada e validada: ${dados.resumo_mudancas || 'Concluída'}`);
      } else {
        alteracoes.push({
          secao: 'Discussão',
          resumo_mudancas: 'Seção original mantida por Guardrail de Segurança (prevenção de inconsistência factual).',
          revertida: true,
        });
      }
    }
  }

  // 3. Fechamento (Conclusão, Resumo, Abstract, Título)
  if (secoesAlvo.includes('fechamento') || secoesAlvo.includes('conclusao') || secoesAlvo.includes('resumo')) {
    trabalho.log('▶ Agentes Especialistas: Purgando marcas de IA e humanizando Resumo e Conclusão...');
    const fAtual = trabalho.estado.fechamento || {};
    const r = await trabalho.ia({
      papel: 'humanizacao_qualis_a1',
      sistema: SISTEMA_HUMANIZADOR_A1,
      prompt: promptHumanizacaoFechamento({
        tituloAtual: trabalho.estado.titulo || mapaSecoes.titulo,
        resumoAtual: fAtual.resumo || mapaSecoes.resumo,
        abstractAtual: fAtual.abstract || mapaSecoes.abstract,
        resumenAtual: fAtual.resumen || mapaSecoes.resumen,
        conclusaoAtual: fAtual.conclusao || mapaSecoes.conclusao,
        orientacoes: instrucaoFinal,
        tema: trabalho.estado.params?.tema,
        pergunta: trabalho.estado.plano?.pergunta,
      }),
      temperatura: 0.25,
      maxTokens: 5000,
    }, true);

    const dados = r.dados || {};
    if (dados.alterou_conclusao && dados.conclusao) {
      mapaSecoes.conclusao = dados.conclusao.replace(/^## (?:5 |5\. )?Conclusão\s*/m, '').trim();
      if (trabalho.estado.fechamento) trabalho.estado.fechamento.conclusao = mapaSecoes.conclusao;
      alteracoes.push({
        secao: 'Conclusão',
        resumo_mudancas: dados.resumo_mudancas || 'Conclusão humanizada e purgada de clichês de fechamento.',
        marcas_removidas: dados.marcas_removidas || [],
      });
      if (Array.isArray(dados.marcas_removidas)) todasMarcasRemovidas.push(...dados.marcas_removidas);
    }

    if (dados.alterou_resumo && dados.resumo) {
      if (trabalho.estado.fechamento) {
        trabalho.estado.fechamento.resumo = dados.resumo;
        if (dados.abstract) trabalho.estado.fechamento.abstract = dados.abstract;
        if (dados.resumen) trabalho.estado.fechamento.resumen = dados.resumen;
      }
      const resumoFormatado = typeof dados.resumo === 'string' ? dados.resumo : [
        dados.resumo.objetivo ? `**Objetivo:** ${dados.resumo.objetivo}` : '',
        dados.resumo.metodos ? `**Métodos:** ${dados.resumo.metodos}` : '',
        dados.resumo.resultados ? `**Resultados:** ${dados.resumo.resultados}` : '',
        dados.resumo.conclusao ? `**Conclusão:** ${dados.resumo.conclusao}` : '',
      ].filter(Boolean).join(' ');

      mapaSecoes.cabecalho = mapaSecoes.cabecalho.replace(
        /\*\*RESUMO:\*\*[\s\S]*?(?=\n\n\*\*Palavras-chave:|$)/m,
        `**RESUMO:** ${resumoFormatado}`
      );

      if (dados.abstract) {
        const abstractFormatado = typeof dados.abstract === 'string' ? dados.abstract : [
          dados.abstract.objective ? `**Objective:** ${dados.abstract.objective}` : '',
          dados.abstract.methods ? `**Methods:** ${dados.abstract.methods}` : '',
          dados.abstract.results ? `**Results:** ${dados.abstract.results}` : '',
          dados.abstract.conclusion ? `**Conclusion:** ${dados.abstract.conclusion}` : '',
        ].filter(Boolean).join(' ');

        mapaSecoes.cabecalho = mapaSecoes.cabecalho.replace(
          /\*\*ABSTRACT:\*\*[\s\S]*?(?=\n\n\*\*Keywords:|$)/m,
          `**ABSTRACT:** ${abstractFormatado}`
        );
      }

      alteracoes.push({
        secao: 'Resumo / Abstract',
        resumo_mudancas: 'Resumo estruturado e abstract humanizados e sincronizados.',
      });
      trabalho.log('✔ Resumo estruturado e Conclusão humanizados.');
    }
  }

  // 4. Métodos ou Resultados (se expressamente solicitado em secoesAlvo)
  for (const sec of ['metodos', 'resultados']) {
    if (secoesAlvo.includes(sec) && mapaSecoes[sec]) {
      const nomeSecao = sec === 'metodos' ? 'Métodos' : 'Resultados';
      trabalho.log(`▶ Agentes Especialistas: Refinando ${nomeSecao}...`);
      const fnPromptSec = (extraInstrucao = '') => promptHumanizacaoCompleta({
        secao: sec,
        tituloSecao: nomeSecao,
        textoAtual: mapaSecoes[sec],
        orientacoes: extraInstrucao ? `${instrucaoFinal}\n\n${extraInstrucao}` : instrucaoFinal,
        fontes,
        tema: trabalho.estado.params?.tema,
        pergunta: trabalho.estado.plano?.pergunta,
      });

      const r = await trabalho.ia({
        papel: 'humanizacao_qualis_a1',
        sistema: SISTEMA_HUMANIZADOR_A1,
        prompt: fnPromptSec(),
        temperatura: 0.25,
        maxTokens: 6000,
      }, true);

      const dados = r.dados || {};
      if (dados.novo_texto) {
        const textoProposto = dados.novo_texto.replace(new RegExp(`^## (?:[23] |[23]\\. )?${nomeSecao}\\s*`, 'm'), '').trim();
        const guardrail = await aplicarGuardrailFidelidade({
          trabalho,
          secao: sec,
          tituloSecao: nomeSecao,
          textoOriginal: mapaSecoes[sec],
          textoReescrito: textoProposto,
          fontes,
          funcaoReexecutarIa: async (discrepancias) => {
            const r2 = await trabalho.ia({
              papel: 'humanizacao_qualis_a1',
              sistema: SISTEMA_HUMANIZADOR_A1,
              prompt: fnPromptSec(`ATENÇÃO OBRIGATÓRIA (CORREÇÃO DE FIDELIDADE FACTUAL):\nA tentativa anterior introduziu inconsistências que não constam nas fontes:\n${discrepancias}\nReescreva mantendo a cadência humana mas PRESERVANDO EXATAMENTE todas as citações [n] e os valores numéricos/estatísticos do original.`),
              temperatura: 0.2,
              maxTokens: 6000,
            }, true);
            return r2.dados?.novo_texto ? r2.dados.novo_texto.replace(new RegExp(`^## (?:[23] |[23]\\. )?${nomeSecao}\\s*`, 'm'), '').trim() : null;
          },
        });

        if (!guardrail.revertido) {
          mapaSecoes[sec] = guardrail.textoFinal;
          trabalho.estado[sec] = mapaSecoes[sec];
          alteracoes.push({
            secao: nomeSecao,
            resumo_mudancas: dados.resumo_mudancas || `${nomeSecao} refinados no padrão Qualis A1.`,
            marcas_removidas: dados.marcas_removidas || [],
          });
          if (Array.isArray(dados.marcas_removidas)) todasMarcasRemovidas.push(...dados.marcas_removidas);
          trabalho.log(`✔ ${nomeSecao} refinados e validados: ${dados.resumo_mudancas || 'Concluído'}`);
        } else {
          alteracoes.push({
            secao: nomeSecao,
            resumo_mudancas: `Seção ${nomeSecao} original mantida por Guardrail de Segurança (prevenção de inconsistência factual).`,
            revertida: true,
          });
        }
      }
    }
  }

  // 5. Remontagem e Validação
  let novoMd = remontarArtigo(mapaSecoes);
  const remediacaoEst = autoRemediarEstatistica(novoMd);
  if (remediacaoEst.alterado) {
    novoMd = remediacaoEst.md;
    trabalho.log(`✔ Auto-remediação estatística: ${remediacaoEst.correcoes.length} inconsistência(s) corrigida(s) deterministicamente (ex: p < 0,001 / IC95%).`);
  }
  fs.writeFileSync(arqMd, novoMd, 'utf8');

  // 5.1 Agente 22: Sentinela de Referências & Integridade Vancouver
  trabalho.log('▶ Agente Sentinela de Referências: Validando e blindando numeração sequencial Vancouver (1 a N)...');
  const mapaRefs = desmembrarArtigo(novoMd);
  if (mapaRefs.referencias) {
    const refsAntes = mapaRefs.referencias;
    mapaRefs.referencias = sanitizarBlocoReferencias(mapaRefs.referencias);
    if (refsAntes !== mapaRefs.referencias) {
      novoMd = remontarArtigo(mapaRefs);
      fs.writeFileSync(arqMd, novoMd, 'utf8');
    }
  }

  // Checagem de integridade das citações
  const totalRefs = (trabalho.estado.referencias || []).length;
  if (totalRefs > 0) {
    const cits = citacoesDoTexto(novoMd);
    const invalidas = cits.filter((n) => n < 1 || n > totalRefs);
    if (invalidas.length) {
      trabalho.log(`Aviso de integridade: detectadas citações fora do intervalo esperado (1-${totalRefs}).`, 'aviso');
    } else {
      trabalho.log(`✔ Agente Sentinela de Referências: Todas as citações no corpo conferem com a bibliografia (1 a ${totalRefs}).`);
    }
  }

  // 6. Auditoria Estatística e Biomarcadores
  trabalho.log('▶ Auditoria Estatística: Inspecionando p-valores, intervalos de confiança e dosagens de biomarcadores...');
  const auditEst = auditarEstatisticaEBiomarcadores(novoMd);
  if (auditEst.alertas.length > 0) {
    trabalho.log(`Aviso estatístico: ${auditEst.alertas.length} ponto(s) de atenção detectado(s) em notações estatísticas/biomarcadores.`, 'aviso');
  } else {
    trabalho.log('✔ Auditoria Estatística: P-valores (sem p=0,000), IC95% e dosagens laboratoriais consistentes.');
  }

  // 7. Auditoria de Conformidade Polimórfica (PRISMA 2020 / STROBE)
  trabalho.log('▶ Auditoria de Conformidade: Avaliando aderência às diretrizes internacionais (PRISMA 2020 / STROBE)...');
  const auditPrisma = auditarConformidade(novoMd, mapaSecoes);
  trabalho.log(`✔ Auditoria de Diretriz (${auditPrisma.diretriz}): Score ${auditPrisma.score_percentual}% (${auditPrisma.itens_conformes}/${auditPrisma.total_itens} itens atendidos — ${auditPrisma.status_geral}).`);

  // 7.1 Auditoria de Consistência Interna (Resumo vs Métodos/Resultados)
  const auditConsistencia = auditarConsistenciaResumoVsCorpo({
    resumo: mapaSecoes.resumo || '',
    metodos: mapaSecoes.metodos || '',
    resultados: mapaSecoes.resultados || '',
    discussao: mapaSecoes.discussao || '',
  });
  if (auditConsistencia.inconsistencias.length > 0) {
    trabalho.log(`⚠️ Consistência Interna: ${auditConsistencia.inconsistencias.length} ponto(s) de atenção entre Resumo e Métodos/Resultados (Score: ${auditConsistencia.score}%).`, 'aviso');
  } else {
    trabalho.log('✔ Consistência Interna: Resumo e Abstract 100% alinhados aos números e desfechos do artigo.');
  }

  // 8. Geração de Documentos de Submissão (Cover Letter)
  trabalho.log('▶ Agente Editorial: Redigindo Carta de Apresentação ao Editor-Chefe (Cover Letter)...');
  const coverLetterMd = gerarCoverLetter({
    titulo: trabalho.estado.titulo || mapaSecoes.titulo,
    tema: trabalho.estado.params?.tema,
    tipoRevisao: 'Revisão da Literatura',
    resumoAchados: '',
  });
  fs.writeFileSync(path.join(trabalho.dir, 'cover-letter.md'), coverLetterMd, 'utf8');
  if (!trabalho.estado.arquivos) trabalho.estado.arquivos = {};
  trabalho.estado.arquivos.cover_letter = 'cover-letter.md';

  // 9. Auto-Cura Qualis A1 & Regeneração de Documentos (.docx ABNT higienizado e HTML)
  trabalho.log('▶ Agente Sanador: Calibrando biomarcadores, ancorando Discussão e aplicando conformidade Qualis A1...');
  let novoRaioX = null;
  try {
    const { sanarApontamentosRaioX } = await import('./sanador_raio_x.mjs');
    const resSanacao = await sanarApontamentosRaioX(trabalho, {
      origem: `orientador_rodada_${rodada}`,
      criarBackup: false,
    });
    novoRaioX = resSanacao.raio_x;
    trabalho.log(`✔ Agente Sanador: Manuscrito calibrado e reauditado com sucesso (Score: ${resSanacao.novo_score}%).`);
  } catch (errSanacao) {
    trabalho.log(`Aviso na auto-cura do orientador: ${errSanacao.message}`, 'aviso');
    const exp = await exportarArtigo(trabalho.dir, trabalho.estado.titulo, novoMd, {
      autores: trabalho.estado.params?.autores,
    });
    if (exp.erro_docx) {
      trabalho.log(`Aviso na geração do Word (.docx): ${exp.erro_docx}`, 'aviso');
    } else {
      trabalho.log('✔ Documento Word (.docx) nas normas ABNT gerado com sucesso.');
    }
    try {
      const { executarReauditoriaRaioX } = await import('./sanador_raio_x.mjs');
      novoRaioX = executarReauditoriaRaioX(trabalho);
    } catch (errRx) {
      trabalho.log(`Aviso na reauditoria do Raio-X: ${errRx.message}`, 'aviso');
    }
  }

  if (novoRaioX) {
    trabalho.estado.raio_x_entrada = novoRaioX;
    trabalho.log(`✔ Laudo de Raio-X consolidado: Score ${novoRaioX.score_inicial}% (${novoRaioX.status_inicial}).`);
  }

  // Preserva snapshot imutável da versão resultante final desta rodada
  const pastaVersoesHum = path.join(trabalho.dir, 'versoes');
  fs.mkdirSync(pastaVersoesHum, { recursive: true });
  const nomePastaHumFinal = `rodada-${rodada}-final`;
  const destinoHumFinal = path.join(pastaVersoesHum, nomePastaHumFinal);
  fs.mkdirSync(destinoHumFinal, { recursive: true });
  for (const nome of ['artigo.md', 'artigo.docx', 'artigo.html']) {
    const src = path.join(trabalho.dir, nome);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(destinoHumFinal, nome));
  }

  // 10. Registro no histórico do estado
  const registroRodada = {
    rodada,
    tipo: 'humanizacao_qualis_a1',
    data: new Date().toISOString(),
    instrucoes: instrucaoFinal,
    resumo_parecer: 'Aplicação da Suíte Completa: Forense, Retratações, PRISMA 2020, Humanizador, Qualis A1 e Cover Letter.',
    secoes_alteradas: alteracoes,
    marcas_removidas: todasMarcasRemovidas,
    forense: forense.estatisticas,
    bibliografia: {
      validadas: auditBib.validadas_crossref,
      retratadas: auditBib.retratadas.length,
    },
    prisma: {
      score: auditPrisma.score_percentual,
      conformes: auditPrisma.itens_conformes,
      status: auditPrisma.status_geral,
    },
    estatistica: {
      alertas: auditEst.total_alertas,
      p_valores: auditEst.achados.p_valores_analisados,
    },
    backup: backupInfo ? backupInfo.pasta : null,
    pasta_resultado: nomePastaHumFinal,
    modelos: (trabalho.estado.llm?.modelos || []).slice(-2),
  };

  trabalho.estado.revisoes_orientador = historico;
  trabalho.estado.revisoes_orientador.push(registroRodada);

  // 11. Atualização do Relatório de Verificação Ampliado
  const arqRelatorio = path.join(trabalho.dir, 'relatorio-verificacao.md');
  if (fs.existsSync(arqRelatorio)) {
    let relatorio = fs.readFileSync(arqRelatorio, 'utf8');
    const marcasTxt = todasMarcasRemovidas.length > 0
      ? `\n- **Vícios de linguagem e clichês purgados:** ${todasMarcasRemovidas.slice(0, 20).join(', ')}`
      : '';
    const secaoRelatorio = `\n\n## Suíte Completa de Agentes — Rodada ${rodada} (${new Date().toLocaleDateString('pt-BR')})\n\n### 1. Laudo Forense de Unicode & Sanitização\n- **Artefatos invisíveis e homóglifos purgados:** ${forense.estatisticas.total_artefatos}\n- **Metadados Word:** Sanitizados e estruturados nas normas ABNT / OpenXML.\n\n### 2. Sentinela Bibliográfica e Anti-Retratação\n- **DOIs validados na Crossref:** ${auditBib.validadas_crossref}\n- **Retratações detectadas:** ${auditBib.retratadas.length === 0 ? '0 (Nenhum artigo retratado detectado - Seguro)' : `${auditBib.retratadas.length} artigo(s) retratado(s) identificado(s)`}\n\n### 3. Auditoria de Conformidade PRISMA 2020\n- **Score de Conformidade:** ${auditPrisma.score_percentual}% (${auditPrisma.itens_conformes}/27 itens atendidos — ${auditPrisma.status_geral})\n\n### 4. Auditoria Estatística e Biomarcadores\n- **P-valores auditados:** ${auditEst.achados.p_valores_analisados} (sem notação p=0,000)\n- **Intervalos de Confiança (IC95%):** ${auditEst.achados.intervalos_confianca}\n- **Biomarcadores mapeados:** ${auditEst.achados.biomarcadores_detectados.join(', ') || 'Nenhum discrepante'}\n\n### 5. Trio de Agentes Humanizadores & Qualis A1\n${alteracoes.map((a) => `- **${a.secao}:** ${sanitizarTextoRebuttal(a.resumo_mudancas)}`).join('\n')}${marcasTxt}\n\n### 6. Documentos de Submissão Editorial\n- **Carta ao Editor-Chefe (Cover Letter):** Gerada e salva em \`cover-letter.md\`\n${backupInfo ? `\n*Backup da versão anterior arquivado em: \`versoes/${backupInfo.pasta}\`.*` : ''}\n`;
    relatorio += secaoRelatorio;
    fs.writeFileSync(arqRelatorio, relatorio, 'utf8');
  }

  trabalho.salvar();
  trabalho.emit('estado');
  trabalho.log(`✔ Suíte Completa de Agentes concluída com sucesso (Rodada ${rodada})!`);

  return {
    ok: true,
    rodada,
    resumo_parecer: 'Suíte Completa: Higienização forense, sentinela de retratações, PRISMA 2020, humanização Qualis A1 e Cover Letter concluídos.',
    alteracoes,
    marcas_removidas: todasMarcasRemovidas,
    forense: forense.estatisticas,
    prisma: auditPrisma,
    estatistica: auditEst,
    bibliografia: auditBib,
    backup: backupInfo ? backupInfo.pasta : null,
    backup_info: backupInfo,
    arquivos: trabalho.estado.arquivos,
  };
}
