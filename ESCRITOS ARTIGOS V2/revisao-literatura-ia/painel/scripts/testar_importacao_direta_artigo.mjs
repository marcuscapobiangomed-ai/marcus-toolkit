import fs from 'node:fs';
import path from 'node:path';
import { importarArtigo } from '../lib/importador.mjs';

const ARQUIVO = '/Users/user/Documents/Tool-Kit/Artigo Monitoria PE.docx';

async function testar() {
  console.log('--- TESTE DIRETO DE IMPORTAÇÃO COM LOGS PASSO A PASSO ---');
  const buffer = fs.readFileSync(ARQUIVO);
  console.log(`Lendo arquivo: ${ARQUIVO} (${buffer.length} bytes)`);

  const t0 = Date.now();
  try {
    const res = await importarArtigo({
      nomeArquivo: path.basename(ARQUIVO),
      buffer,
      tema: '',
      autores: 'Equipe de Saúde Coletiva / APS SUS',
      orientacoes: '',
      aplicarRevisao: false, // apenas Ingerir, Auditar e Raio-X
      declaracaoIa: 'breve',
      progressoCb: (msg) => {
        const segs = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[+${segs}s] ${msg}`);
      }
    });

    const tempoTotal = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n✔ Importação concluída em ${tempoTotal}s!`);
    console.log('ID do Trabalho:', res.id);
    console.log('Título:', res.titulo);
    console.log('Confiança da Extração:', res.confianca_extracao, '%');
    console.log('Alertas:', res.alertas_extracao);
    console.log('Diretriz Raio-X:', res.raio_x?.diretriz);
    console.log('Score Inicial Raio-X:', res.raio_x?.score_inicial, '%');
  } catch (err) {
    console.error('❌ ERRO NA IMPORTAÇÃO:', err);
  }
}

testar();
