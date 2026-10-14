async function testSanar() {
  console.log('--- TESTANDO ENDPOINT SANAR-RAIO-X PARA O ARTIGO ATIVO ---');
  const res = await fetch('http://localhost:4777/api/trabalhos/20261001-211657-papel-da-lipoproteina-a-na-sindrome-coro/sanar-raio-x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-painel': '1' },
    body: JSON.stringify({ origem: 'teste-automatizado' })
  });

  const json = await res.json();
  console.log('Status HTTP:', res.status);
  console.log('Resultado:', {
    ok: json.ok,
    mensagem: json.mensagem,
    score_anterior: json.score_anterior,
    novo_score: json.novo_score,
    backup: json.backup,
    total_alteracoes: json.alteracoes?.length
  });

  if (!json.ok) {
    throw new Error('Falha ao sanar raio-x: ' + JSON.stringify(json));
  }
  console.log('Endpoint /sanar-raio-x funcionando com 100% de integridade!');
}

testSanar().catch(err => {
  console.error(err);
  process.exit(1);
});
