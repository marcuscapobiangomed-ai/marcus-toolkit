import fs from 'node:fs';
import path from 'node:path';

const DOCX_PATH = '/Users/user/Documents/Tool-Kit/ESCRITOS ARTIGOS V2/Artigos/painel/20260929-145554-lipoproteina-a-como-fator-cardiovascular/artigo.docx';

async function testarImportacaoAPI() {
  console.log('1. Lendo arquivo .docx de teste...');
  const buffer = fs.readFileSync(DOCX_PATH);
  const base64 = buffer.toString('base64');
  console.log(`- Arquivo lido: ${buffer.length} bytes (Base64: ${base64.length} chars)`);

  console.log('\n2. Enviando POST para http://localhost:4777/api/trabalhos/importar (com aplicar_revisao = false)...');
  const payload = {
    nome_arquivo: 'manuscrito_pesquisa_cardiologia.docx',
    conteudo_base64: base64,
    tema: 'Papel da Lipoproteína(a) na Síndrome Coronariana Aguda: Revisão Sistemática',
    orientacoes: 'Ajustar clareza da pergunta PICO e assegurar métricas PRISMA 2020.',
    aplicar_revisao: false, // Ingestão imediata para teste de pipeline de importação
  };

  const res = await fetch('http://localhost:4777/api/trabalhos/importar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-painel': '1',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro na API (${res.status}): ${errText}`);
  }

  const dados = await res.json();
  console.log('✔ Resposta recebida da API:');
  console.log(`- ID do Trabalho criado: ${dados.id}`);
  console.log(`- Título: ${dados.titulo}`);
  console.log(`- Seções identificadas: ${(dados.secoes || []).join(', ')}`);
  console.log(`- Total de referências extraídas: ${dados.total_referencias}`);

  const idCriado = dados.id;

  console.log('\n3. Verificando arquivos gerados na pasta do trabalho...');
  const dirTrabalho = path.join('/Users/user/Documents/Tool-Kit/ESCRITOS ARTIGOS V2/Artigos/painel', idCriado);
  const arquivosEsperados = [
    'estado.json',
    'artigo.md',
    'artigo.docx',
    'artigo.html',
    'relatorio-verificacao.md',
    'arquivo_original.docx',
  ];

  for (const arq of arquivosEsperados) {
    const caminho = path.join(dirTrabalho, arq);
    if (fs.existsSync(caminho)) {
      const stats = fs.statSync(caminho);
      console.log(`✔ Arquivo [${arq}] gerado com sucesso (${stats.size} bytes).`);
    } else {
      console.error(`✖ Arquivo [${arq}] NÃO encontrado!`);
    }
  }

  console.log('\n4. Testando download dos arquivos via rotas HTTP...');
  const resDocx = await fetch(`http://localhost:4777/api/trabalhos/${idCriado}/arquivos/artigo.docx?baixar=1`);
  console.log(`- Download DOCX status: ${resDocx.status} (${resDocx.headers.get('content-type')})`);

  const resHtml = await fetch(`http://localhost:4777/api/trabalhos/${idCriado}/arquivos/artigo.html`);
  console.log(`- Download HTML status: ${resHtml.status}`);

  const resRelat = await fetch(`http://localhost:4777/api/trabalhos/${idCriado}/arquivos/relatorio-verificacao.md`);
  console.log(`- Relatório verificação status: ${resRelat.status}`);

  if (resDocx.ok && resHtml.ok && resRelat.ok) {
    console.log('\n✔ TODAS AS ROTAS HTTP E ARQUIVOS DO TRABALHO IMPORTADO ESTÃO 100% OPERACIONAIS!');
  } else {
    console.error('\n✖ Falha na entrega de arquivos via HTTP.');
  }

  return idCriado;
}

testarImportacaoAPI().catch((err) => {
  console.error('Erro no teste de importação:', err);
  process.exit(1);
});
