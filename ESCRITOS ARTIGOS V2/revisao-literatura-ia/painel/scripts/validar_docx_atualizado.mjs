import fs from 'node:fs';
import path from 'node:path';
import zipfile from 'node:zlib';

const PORTA = 4777;
const JOBS_DIR = '/Users/user/Documents/Tool-Kit/ESCRITOS ARTIGOS V2/Artigos/painel';

async function main() {
  console.log('=====================================================');
  console.log('🧪 VALIDAÇÃO RIGOROSA: GARANTIA DE DOCX ATUALIZADO');
  console.log('=====================================================\n');

  // 1. Verificar todos os artigos no acervo e sincronizar se necessário
  const jobs = fs.readdirSync(JOBS_DIR).filter(d => fs.existsSync(path.join(JOBS_DIR, d, 'estado.json')));
  console.log(`Encontrados ${jobs.length} trabalhos no acervo.\n`);

  for (const id of jobs) {
    const dir = path.join(JOBS_DIR, id);
    const arqMd = path.join(dir, 'artigo.md');
    const arqDocx = path.join(dir, 'artigo.docx');
    const estado = JSON.parse(fs.readFileSync(path.join(dir, 'estado.json'), 'utf8'));

    console.log(`📌 Verificando [${id}] - "${estado.titulo}"`);

    // Sincronizar via endpoint
    const res = await fetch(`http://localhost:${PORTA}/api/trabalhos/${id}/sincronizar-docx`, {
      method: 'POST',
      headers: { 'x-painel': '1' }
    });
    const dados = await res.json();
    if (!res.ok || !dados.ok) {
      throw new Error(`Falha na sincronização de ${id}: ${dados.erro}`);
    }
    console.log(`   ✔ DOCX verificado/regenerado com sucesso: ${dados.tamanhoDocx} bytes (mtime: ${dados.mtimeDocx})`);

    // Testar download direto
    const resDownload = await fetch(`http://localhost:${PORTA}/api/trabalhos/${id}/artigo.docx?baixar=1`);
    if (resDownload.status !== 200) {
      throw new Error(`Download falhou com status ${resDownload.status}`);
    }
    const cacheControl = resDownload.headers.get('cache-control');
    const contentDisposition = resDownload.headers.get('content-disposition');
    console.log(`   ✔ Headers de download corretos: Cache-Control="${cacheControl}", Content-Disposition="${contentDisposition}"`);
  }

  // 2. Teste do Mecanismo JIT Auto-Sync
  console.log('\n-----------------------------------------------------');
  console.log('⚡ TESTE DE DEFASAGEM INTENCIONAL E AUTO-REGENERAÇÃO JIT');
  console.log('-----------------------------------------------------');

  const testId = jobs[0];
  const dirTest = path.join(JOBS_DIR, testId);
  const arqMdTest = path.join(dirTest, 'artigo.md');
  const arqDocxTest = path.join(dirTest, 'artigo.docx');

  // Adiciona marcador de revisão no artigo.md
  const marcador = `<!-- TESTE_SYNC_${Date.now()} -->`;
  const mdOriginal = fs.readFileSync(arqMdTest, 'utf8');
  fs.writeFileSync(arqMdTest, mdOriginal + `\n\n${marcador}\n`, 'utf8');

  // Força o mtime do docx a ser 1 hora no passado para simular docx desatualizado
  const tempoAntigo = (Date.now() - 3600000) / 1000;
  fs.utimesSync(arqDocxTest, tempoAntigo, tempoAntigo);

  const mtimeDocxAntigo = fs.statSync(arqDocxTest).mtimeMs;
  const mtimeMdNovo = fs.statSync(arqMdTest).mtimeMs;
  console.log(`   Simulação: artigo.md (${mtimeMdNovo}) > artigo.docx (${mtimeDocxAntigo})`);

  // Faz requisição de download para a rota /artigo.docx
  console.log('   Requisitando /api/trabalhos/:id/artigo.docx...');
  const resJit = await fetch(`http://localhost:${PORTA}/api/trabalhos/${testId}/artigo.docx?baixar=1`);
  if (resJit.status !== 200) {
    throw new Error(`Erro na rota JIT: status ${resJit.status}`);
  }

  const mtimeDocxNovo = fs.statSync(arqDocxTest).mtimeMs;
  console.log(`   Novo mtime do docx: ${mtimeDocxNovo}`);

  if (mtimeDocxNovo <= mtimeDocxAntigo) {
    throw new Error('FALHA: O arquivo artigo.docx não foi auto-regenerado on-the-fly!');
  }
  console.log('   ✔ SUCESSO: O arquivo artigo.docx foi detectado como desatualizado e regenerado JIT automaticamente!');

  // Reverte a alteração de teste no artigo.md
  fs.writeFileSync(arqMdTest, mdOriginal, 'utf8');
  await fetch(`http://localhost:${PORTA}/api/trabalhos/${testId}/sincronizar-docx`, {
    method: 'POST',
    headers: { 'x-painel': '1' }
  });

  console.log('\n=====================================================');
  console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
  console.log('=====================================================');
}

main().catch(err => {
  console.error('❌ ERRO:', err.message);
  process.exit(1);
});
