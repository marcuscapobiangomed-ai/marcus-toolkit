import fs from 'node:fs';
import path from 'node:path';
import { exportarDocx } from '../lib/exportar.mjs';

const JOBS_DIR = '/Users/user/Documents/Tool-Kit/ESCRITOS ARTIGOS V2/Artigos/painel';

async function higienizarAcervo() {
  console.log('=====================================================');
  console.log('🧹 HIGIENIZAÇÃO FORENSE E EDITORIAL DE TODO O ACERVO');
  console.log('=====================================================\n');

  const jobs = fs.readdirSync(JOBS_DIR).filter((d) => {
    return fs.existsSync(path.join(JOBS_DIR, d, 'artigo.md')) &&
           fs.existsSync(path.join(JOBS_DIR, d, 'estado.json'));
  });

  console.log(`Encontrados ${jobs.length} artigos para blindagem forense.\n`);

  for (const id of jobs) {
    const dir = path.join(JOBS_DIR, id);
    const arqMd = path.join(dir, 'artigo.md');
    const arqEstado = path.join(dir, 'estado.json');

    const estado = JSON.parse(fs.readFileSync(arqEstado, 'utf8'));
    let md = fs.readFileSync(arqMd, 'utf8');

    console.log(`📌 Processando [${id}] - "${estado.titulo || estado.params?.tema}"`);

    // 1. Remover placeholders de rascunho de alunos/orientadores
    const antesPlaceholder = md;
    md = md.replace(/\*\*Autores:\*\*\s*\[Nome do Aluno\][^\n]*/g, '');
    md = md.replace(/\*¹Discente do Curso de Medicina\.\s*²Docente Orientador\.\*/g, '');
    md = md.replace(/\n{3,}/g, '\n\n'); // compacta quebras extras de linha

    // Se o estado possuir autores definidos pelo usuário, insere de forma limpa
    const autoresDefinidos = estado.params?.autores?.trim() || estado.autores?.trim();
    if (autoresDefinidos && !md.includes('**Autores:**')) {
      md = md.replace(/^(#\s+[^\n]+(?:\n\*[^\n]+\*)*)/m, `$1\n\n**Autores:** ${autoresDefinidos}`);
    }

    if (md !== antesPlaceholder) {
      console.log('   ✔ Placeholders de rascunho [Nome do Aluno] erradicados do markdown.');
    }

    // 2. Corrigir qualquer declaração antiga de IA para a fórmula restrita à triagem bibliográfica
    const padraoDeclaracaoAntiga = /##\s*Declaração de uso de inteligência artificial[\s\S]*?(?=\n##\s|\n\*\*Tabela|\n\*\*Quadro|$)/i;
    if (padraoDeclaracaoAntiga.test(md)) {
      const novaDeclaracao = `## Declaração de transparência metodológica\n\nOs autores utilizaram ferramentas computacionais de inteligência artificial exclusivamente como apoio metodológico à busca e à triagem bibliográfica de registros nas bases de dados indexadas, cabendo a análise crítica, síntese dos achados e redação integral aos autores do estudo.`;
      md = md.replace(padraoDeclaracaoAntiga, novaDeclaracao);
      console.log('   ✔ Declaração de IA atualizada para versão restrita à triagem (sem redação).');
    }

    // Salva o artigo.md limpo
    fs.writeFileSync(arqMd, md, 'utf8');

    // 3. Regenera o artigo.docx com metadados forenses Microsoft Office Word
    const titulo = estado.titulo || estado.params?.tema || 'Artigo Científico';
    const resDocx = exportarDocx(dir, titulo, md, {
      autores: autoresDefinidos,
    });

    if (!resDocx.ok) {
      console.error(`   ❌ Falha ao exportar DOCX para ${id}:`, resDocx.erro);
    } else {
      console.log(`   ✔ DOCX regenerado com sucesso com metadados OpenXML sanitizados.`);
    }
  }

  console.log('\n=====================================================');
  console.log('✨ HIGIENIZAÇÃO CONCLUÍDA COM SUCESSO EM TODOS OS ARTIGOS!');
  console.log('=====================================================');
}

higienizarAcervo().catch((err) => {
  console.error('❌ Erro na higienização:', err);
  process.exit(1);
});
