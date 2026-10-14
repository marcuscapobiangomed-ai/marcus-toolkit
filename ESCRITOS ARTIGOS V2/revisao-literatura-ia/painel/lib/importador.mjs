import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { JOBS_DIR, PAINEL_DIR } from './config.mjs';
import { exportarArtigo } from './exportar.mjs';
import { desmembrarArtigo } from './orientador.mjs';
import { slug } from './texto.mjs';
import { ETAPAS, PADROES, Trabalho } from './pipeline.mjs';
import { auditarReferenciasERetracoes } from './validacao_bibliografica.mjs';
import { paisDaAfiliacao } from './pais_afiliacao.mjs';
import { classificarBaseOrigem } from './base_origem.mjs';
import { executarReauditoriaRaioX } from './sanador_raio_x.mjs';

const PYTHON_EXEC = fs.existsSync('/Users/user/Documents/Tool-Kit/.venv/bin/python')
  ? '/Users/user/Documents/Tool-Kit/.venv/bin/python'
  : 'python3';

const SCRIPT_EXTRAIR = path.join(PAINEL_DIR, 'scripts', 'extrair_documento.py');

/**
 * Executa o script python extrair_documento.py e retorna a estrutura extraída.
 */
export async function extrairTextoDocumento(caminhoArquivo) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_EXEC, [SCRIPT_EXTRAIR, caminhoArquivo], {
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });

    proc.on('close', (codigo) => {
      if (codigo !== 0) {
        return reject(new Error(`Falha ao extrair documento (${codigo}): ${stderr || stdout || 'Erro desconhecido'}`));
      }
      try {
        const dados = JSON.parse(stdout);
        if (dados.erro) {
          return reject(new Error(dados.erro));
        }
        resolve(dados);
      } catch (e) {
        reject(new Error(`Saída inválida do extrator: ${e.message}\n${stdout.slice(0, 500)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Erro ao iniciar processo python: ${err.message}`));
    });
  });
}

/**
 * Importa um arquivo (.docx ou .pdf), cria o trabalho no painel e
 * opcionalmente aplica correções com base no parecer do orientador e no modelo de escrita.
 */
export async function importarArtigo({
  nomeArquivo,
  buffer,
  caminhoArquivo = null,
  tema = '',
  autores = '',
  orientacoes = '',
  aplicarRevisao = true,
  declaracaoIa = 'breve',
  progressoCb = null,
}) {
  const log = (msg) => {
    if (typeof progressoCb === 'function') progressoCb(msg);
  };

  const ext = path.extname(nomeArquivo || caminhoArquivo || '').toLowerCase();
  if (!['.docx', '.pdf'].includes(ext)) {
    throw new Error(`Formato de arquivo não suportado: "${ext}". Envie um arquivo .docx ou .pdf.`);
  }

  // Cria pasta temporária se foi enviado por buffer
  let arquivoParaExtrair = caminhoArquivo;
  let arquivoTempCriado = null;
  if (!arquivoParaExtrair && buffer) {
    const dirTemp = path.join(JOBS_DIR, '_temp');
    fs.mkdirSync(dirTemp, { recursive: true });
    arquivoTempCriado = path.join(dirTemp, `upload-${Date.now()}-${slug(nomeArquivo, 20)}${ext}`);
    fs.writeFileSync(arquivoTempCriado, buffer);
    arquivoParaExtrair = arquivoTempCriado;
  }

  if (!fs.existsSync(arquivoParaExtrair)) {
    throw new Error(`Arquivo não encontrado para extração: ${arquivoParaExtrair}`);
  }

  try {
    log(`▶ Extraindo conteúdo e estrutura do arquivo "${nomeArquivo || path.basename(arquivoParaExtrair)}"...`);
    const extraido = await extrairTextoDocumento(arquivoParaExtrair);

    // Regra Editorial Mandatória: O título principal do manuscrito científico DEVE ser o título real
    // extraído com precisão do arquivo original (.docx ou .pdf). O campo 'tema' informado pelo usuário
    // atua como rótulo/categoria do projeto no painel, mas JAMAIS substitui o título científico do artigo.
    const ehRotuloRascunho = (t) => !t || /^(?:akyla|esther|draft|rascunho|modelo|teste|v\d+)/i.test(t.trim()) || t.trim().length < 10;
    
    let tituloCientifico = 'Artigo Científico Importado';
    if (!ehRotuloRascunho(extraido.titulo) && extraido.titulo !== 'Artigo Científico Importado') {
      tituloCientifico = extraido.titulo.trim();
    } else if (!ehRotuloRascunho(tema)) {
      tituloCientifico = tema.trim();
    } else if (extraido.titulo && extraido.titulo !== 'Artigo Científico Importado') {
      tituloCientifico = extraido.titulo.trim();
    }

    const tituloFinal = tituloCientifico;
    const agora = new Date();
    const carimbo = agora.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    const id = `${carimbo}-${slug(tituloFinal, 40)}`;
    const dirTrabalho = path.join(JOBS_DIR, id);

    fs.mkdirSync(dirTrabalho, { recursive: true });
    fs.mkdirSync(path.join(dirTrabalho, 'evidencias'), { recursive: true });

    // Copia o arquivo original para dentro da pasta do trabalho
    const nomeOriginalSalvo = `arquivo_original${ext}`;
    const caminhoOriginalDestino = path.join(dirTrabalho, nomeOriginalSalvo);
    fs.copyFileSync(arquivoParaExtrair, caminhoOriginalDestino);

    // Salva o artigo.md inicial, assegurando que o cabeçalho H1 contenha o título científico real
    let mdExtraido = extraido.markdown;
    if (tituloFinal && tituloFinal !== 'Artigo Científico Importado') {
      const linhasMd = mdExtraido.split('\n');
      if (linhasMd.length > 0) {
        if (/^#\s+(?:akyla|esther|draft|rascunho|modelo|teste|v\d+)/i.test(linhasMd[0]) || !linhasMd[0].startsWith('# ')) {
          linhasMd[0] = `# ${tituloFinal}`;
          mdExtraido = linhasMd.join('\n');
        }
      }
    }
    const caminhoMd = path.join(dirTrabalho, 'artigo.md');
    fs.writeFileSync(caminhoMd, mdExtraido, 'utf8');

    // Desmembra para popular o estado com as seções identificadas
    const mapaSecoes = desmembrarArtigo(mdExtraido);

    log('▶ Diagramando versão em Word (.docx) nas normas ABNT e gerando versão HTML...');
    const exp = await exportarArtigo(dirTrabalho, tituloFinal, mdExtraido, { autores });

    log(`▶ Hidratando e auditando ${extraido.referencias?.length || 0} referências nas bases oficiais (Crossref & PubMed)...`);
    const auditBib = await auditarReferenciasERetracoes(extraido.referencias || [], { progressoCb: log });
    const referenciasHidratadas = auditBib.referencias_hidratadas || [];

    // Preenche registros.json e lista de aprovados para que o trabalho importado tenha abstracts científicos reais
    const mapaRegistros = {};
    const uidsAprovados = [];

    // Base atribuída SOMENTE com evidência verificável (ver lib/base_origem.mjs).

    referenciasHidratadas.forEach((ref, i) => {
      const uid = `ref-imp-${i + 1}`;
      const { base: baseOrigem, evidencia: evidenciaBase } = classificarBaseOrigem(ref);
      uidsAprovados.push(uid);
      mapaRegistros[uid] = {
        uid,
        n: i + 1,
        titulo: ref.titulo,
        ano: ref.ano,
        autores: ref.autores || [],
        periodico: ref.periodico,
        doi: ref.doi,
        pmid: ref.pmid,
        url: ref.url || (ref.doi ? `https://doi.org/${ref.doi}` : ''),
        resumo: ref.resumo,
        tem_abstract_real: ref.tem_abstract_real,
        retratado: ref.retratado,
        afiliacao: ref.afiliacao || '',
        pais: paisDaAfiliacao(ref.afiliacao || '') || (ref.pais && ref.pais !== 'NI' ? ref.pais : 'Não informado'),
        pais_evidencia: ref.afiliacao ? 'afiliação' : '',
        base_origem: baseOrigem,
        base_evidencia: evidenciaBase,
        origem_verificada: baseOrigem !== 'nao_verificada',
      };
    });

    fs.writeFileSync(path.join(dirTrabalho, 'registros.json'), JSON.stringify(mapaRegistros, null, 2), 'utf8');

    // Monta estado inicial do trabalho importado
    const confiancaExtracao = extraido.confianca_extracao ?? 100;
    const alertasExtracao = extraido.alertas_extracao || [];
    const statusConfiancaExt = confiancaExtracao >= 80
      ? '🟢 Alta Fidelidade'
      : (confiancaExtracao >= 60 ? '🟡 Fidelidade Moderada' : '🔴 Atenção: Inspeção Prévia Recomendada');

    const estadoInicial = {
      id,
      criado_em: agora.toISOString(),
      origem: 'importado',
      arquivo_importado: nomeArquivo || path.basename(arquivoParaExtrair),
      status: 'concluido',
      params: {
        ...PADROES,
        tema: tema || tituloFinal,
        autores: autores || PADROES.autores,
        tipo_revisao: 'importado',
        declaracao_ia: declaracaoIa,
        pergunta: `Quais as principais evidências analisadas em: ${tituloFinal}?`,
      },
      titulo: tituloFinal,
      plano: {
        pergunta: `Quais as principais evidências analisadas em: ${tituloFinal}?`,
        titulo_provisorio: tituloFinal,
      },
      etapas: Object.fromEntries(ETAPAS.map(([k, agente, tituloEtapa]) => [
        k,
        { agente, titulo: tituloEtapa, status: extraido.secoes_detectadas.includes(k) ? 'concluido' : 'pendente' },
      ])),
      introducao: mapaSecoes.introducao || '',
      metodos: mapaSecoes.metodos || '',
      resultados: mapaSecoes.resultados || '',
      discussao: mapaSecoes.discussao || '',
      fechamento: {
        titulo: tituloFinal,
        resumo: mapaSecoes.resumo || '',
        abstract: mapaSecoes.abstract || '',
        resumen: mapaSecoes.resumen || '',
        conclusao: mapaSecoes.conclusao || '',
      },
      referencias: referenciasHidratadas,
      aprovados: uidsAprovados,
      revisoes_orientador: [],
      extracao: {
        confianca: confiancaExtracao,
        palavras: extraido.palavras_total || 0,
        secoes: extraido.secoes_detectadas || [],
        alertas: alertasExtracao,
      },
      tabelas_count: extraido.tabelas_count || 0,
      arquivos: {
        md: 'artigo.md',
        html: 'artigo.html',
        docx: exp.docx ? 'artigo.docx' : null,
        raio_x: 'raio-x.md',
        traffic_light: 'traffic_light.svg',
        summary_plot: 'summary_plot.svg',
        graphical_abstract: 'graphical_abstract.svg',
        original: nomeOriginalSalvo,
      },
      log: [
        { t: agora.toISOString(), msg: `Artigo importado com sucesso a partir de "${nomeArquivo || path.basename(arquivoParaExtrair)}".` },
        { t: agora.toISOString(), msg: `Confiança da extração estrutural: ${confiancaExtracao}% (${statusConfiancaExt}). Seções: ${extraido.secoes_detectadas.join(', ') || 'nenhuma'}.` },
      ],
      llm: {
        chamadas: 0,
        modelos: [],
        tokens_entrada: 0,
        tokens_saida: 0,
        tokens_total: 0,
        custo_usd: 0,
      },
    };

    fs.writeFileSync(path.join(dirTrabalho, 'estado.json'), JSON.stringify(estadoInicial, null, 2), 'utf8');

    // Executa a Suíte Completa e Canônica de Agentes Especialistas (Raio-X Qualis A1)
    log('▶ Executando Suíte Completa de Agentes Especialistas e Laudo de Raio-X Qualis A1...');
    const trabalho = Trabalho.carregar(id);
    const raioX = executarReauditoriaRaioX(trabalho);

    // Cria relatório de verificação inicial com auditoria bibliográfica completa
    const relatorioInicial = `# Relatório de Importação e Verificação do Artigo\n\n- **Documento original:** \`${nomeArquivo || path.basename(arquivoParaExtrair)}\`\n- **Data de importação:** ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR')}\n- **Título:** ${tituloFinal}\n- **Confiança da Extração Estrutural:** ${confiancaExtracao}% (${statusConfiancaExt})\n- **Delineamento e Diretriz:** ${raioX.delineamento} (${raioX.diretriz})\n- **Score Inicial de Conformidade:** ${raioX.score_inicial}% (${raioX.status_inicial})\n- **Seções detectadas:** ${extraido.secoes_detectadas.join(', ')}\n- **Total de referências identificadas:** ${referenciasHidratadas.length}\n- **DOIs oficiais validados:** ${auditBib.com_doi}\n- **Resumos científicos oficiais recuperados:** ${auditBib.com_abstract_real}\n- **Retratações detectadas:** ${auditBib.retratadas.length === 0 ? '0 (Nenhuma retratação - Seguro)' : `${auditBib.retratadas.length} artigo(s) com nota de retratação`}\n- **Tabelas extraídas:** ${extraido.tabelas_count || 0}\n\nO laudo de diagnóstico de entrada completo está arquivado em \`raio-x.md\`.\nO artigo foi estruturado no padrão ABNT e diagramado para Word (.docx).\n`;
    fs.writeFileSync(path.join(dirTrabalho, 'relatorio-verificacao.md'), relatorioInicial, 'utf8');

    log(`✔ Artigo importado, hidratado e estruturado com sucesso (ID: ${id})`);

    let resultadoRevisao = null;
    const temOrientacoes = Boolean(orientacoes && String(orientacoes).trim().length > 0);
    if (aplicarRevisao) {
      const trabalho = Trabalho.carregar(id);
      if (temOrientacoes) {
        log('▶ Aplicando apontamentos do orientador com precisão cirúrgica no manuscrito importado...');
        resultadoRevisao = await trabalho.aplicarDevolutiva({
          devolutiva: String(orientacoes).trim(),
          instrucoes_adicionais: 'Atender com rigor cirúrgico aos apontamentos do orientador, preservando integralmente os trechos estáveis e a voz do manuscrito original.',
          criar_backup: true,
          modo: 'cirurgico',
        });
        log(`✔ Correções cirúrgicas aplicadas com sucesso! Rodada ${resultadoRevisao.rodada} salva.`);
      } else {
        log('▶ Iniciando processamento com Trio de Agentes: Humanização, Qualis A1 e Remoção de Marcas-d\'água de IA...');
        resultadoRevisao = await trabalho.aplicarHumanizacao({
          orientacoes: '',
          instrucoes: 'Aplicação de padrão acadêmico Qualis A1: erradicação de marcas-d\'água e clichês de IA com preservação de dados empíricos.',
          criar_backup: true,
          modo: 'cirurgico',
        });
        log(`✔ Humanização e padrão Qualis A1 concluídos! Rodada ${resultadoRevisao.rodada} salva com sucesso.`);
      }
    }

    return {
      ok: true,
      id,
      titulo: tituloFinal,
      secoes: extraido.secoes_detectadas,
      total_referencias: referenciasHidratadas.length,
      confianca_extracao: confiancaExtracao,
      alertas_extracao: alertasExtracao,
      bibliografia: {
        validadas: auditBib.com_doi,
        com_abstract: auditBib.com_abstract_real,
        retratadas: auditBib.retratadas.length,
      },
      raio_x: raioX,
      revisao: resultadoRevisao,
    };
  } finally {
    if (arquivoTempCriado && fs.existsSync(arquivoTempCriado)) {
      try { fs.unlinkSync(arquivoTempCriado); } catch {}
    }
  }
}
