// Prompts da pipeline. Estilo: modelo "Guia Supremo V3" (paráfrase ativa, modalizadores, funil
// argumentativo) + travas de veracidade: o modelo só pode afirmar o que está nas fontes fornecidas.

export const SISTEMA_REDATOR = `Você é um pesquisador sênior (nível Qualis A1) e revisor metodológico exigente, escrevendo em português formal acadêmico do Brasil.
Regras obrigatórias:
1. Use modalizadores discursivos ("sugere-se", "os achados indicam", "infere-se") e evite tom dogmático.
2. Use voz ativa quando possível e passado para ações metodológicas concluídas.
3. PARÁFRASE ATIVA: nunca copie frases dos resumos, nunca use citação direta entre aspas. Faça fusão conceitual: sintetize, em cada parágrafo, o que 2 a 5 estudos têm em comum ou em contraste, citando todos de forma indireta. Nunca escreva listas lineares do tipo "O autor X disse Y. O autor Z disse W."
4. VERACIDADE: você só pode afirmar fatos que estejam explicitamente nos resumos das fontes numeradas fornecidas. Todo número (percentual, razão de chances, amostra, média) deve aparecer exatamente como está no resumo da fonte citada. Se a informação não estiver nas fontes, não a escreva.
5. Cite no formato Vancouver com colchetes: [3] ou [2,5] ou [4-6], usando somente os números das fontes fornecidas. Nunca invente fontes, autores, anos ou números. Colchetes são exclusivos das citações: intervalos de confiança e demais valores numéricos vão sempre entre parênteses, por exemplo (IC95%: 1,38-7,61).
6. Evite maneirismos típicos de texto de IA: "é importante ressaltar", "vale destacar", "no cenário atual", "desempenha um papel crucial", "em suma", "além disso" repetido, aberturas grandiosas e conclusões genéricas.
7. Não use marcadores, listas ou bullet points no corpo do texto (exceto quando explicitamente pedido).
8. VALORIZAÇÃO DA AUTORIA HUMANA: Trate a autoria e a pesquisa com rigor e respeito metodológico. A pesquisa, a triagem e a síntese são conduzidas criticamente pelos autores. Jamais insira afirmações autodepreciativas ou que minimizem a profundidade da análise dos pesquisadores.`;

export const SISTEMA_BIBLIOTECARIO = `Você é um bibliotecário especialista em buscas sistemáticas em saúde (PubMed/MEDLINE com MeSH, SciELO, LILACS/BVS com DeCS). Responda sempre e somente com JSON válido.`;

export const SISTEMA_AVALIADOR = `Você é um avaliador metodológico rigoroso e cético. Sua tarefa é conferir afirmações contra resumos de artigos. Responda sempre e somente com JSON válido.`;

export function promptPlanejamento({ tema, pergunta, tipoRevisao, anoInicial, refinamento }) {
  return `Planeje a estratégia de busca de uma revisão ${tipoRevisao} da literatura.
Tema: "${tema}"
${pergunta ? `Pergunta de pesquisa sugerida pelo autor: "${pergunta}"` : ''}
Período: de ${anoInicial} até hoje. Idiomas: português, inglês e espanhol. Somente estudos primários.
${refinamento ? `\nATENÇÃO — REFINAMENTO NECESSÁRIO: ${refinamento}\n` : ''}
Regras para as strings:
- "pubmed": string booleana com termos MeSH ([MeSH Terms]) e palavras de título/resumo ([tiab]). NÃO inclua filtros de data, idioma, tipo de publicação ou texto completo (o sistema adiciona). Deve ser específica o bastante para retornar, após filtros, entre 30 e 300 artigos.
- "scielo": string booleana simples (AND, OR, aspas, parênteses), SEM prefixos de campo, com sinônimos em português, inglês e espanhol. SciELO é um índice menor: use NO MÁXIMO 2 blocos conceituais ligados por AND (o procedimento/condição e o desfecho principal) — não acrescente um terceiro bloco de "fatores de risco/preditores".
- "lilacs": mesmas regras da string SciELO (no máximo 2 blocos), com termos DeCS em português, inglês e espanhol.
- Termos com mais de uma palavra devem estar SEMPRE entre aspas duplas (ex.: "colecistectomia laparoscópica").
- Evite strings amplas demais; o tema deve ser o foco central.

Responda SOMENTE com este JSON:
{
  "titulo_provisorio": "título científico provisório em português",
  "pergunta": "pergunta de pesquisa norteadora, em uma frase",
  "pico": {"P": "população", "I": "fenômeno de interesse/exposição/intervenção", "Co": "contexto", "S": "tipos de estudo"},
  "descritores_mesh": ["descritor MeSH exato", "..."],
  "descritores_decs": ["descritor DeCS exato em português", "..."],
  "palavras_chave": ["3 a 6 palavras-chave DeCS em português"],
  "keywords": ["as mesmas em inglês (MeSH)"],
  "pubmed": "string",
  "scielo": "string",
  "lilacs": "string",
  "eixos": ["3 a 5 eixos temáticos para organizar a síntese"],
  "coluna_exposicao": "rótulo curto da coluna da tabela para a exposição/intervenção (ex.: 'Fatores avaliados')",
  "coluna_desfecho": "rótulo curto da coluna da tabela para desfechos (ex.: 'Desfechos')",
  "criterio_inclusao_tema": "critério de inclusão temático específico, em uma frase",
  "criterio_exclusao_tema": "critério de exclusão temático específico, em uma frase"
}`;
}

export function promptTriagem({ plano, lote }) {
  const itens = lote.map((r) => `### ${r.cid}
Título: ${r.titulo}
Ano: ${r.ano} | Base: ${r.base} | Tipo informado pela base: ${(r.tipos || []).join(', ') || 'não informado'}
Resumo: ${(r.resumo || '').slice(0, 1100)}`).join('\n\n');
  return `Faça a triagem por título e resumo para a revisão cuja pergunta é: "${plano.pergunta}"
Critérios de INCLUSÃO: estudos primários (observacionais ou de intervenção) sobre o tema; ${plano.criterio_inclusao_tema}
Critérios de EXCLUSÃO: revisões (narrativas, integrativas, sistemáticas, metanálises), editoriais, cartas, comentários, diretrizes, resumos de congresso, relatos de caso isolados, estudos fora do tema ou sem dados de desfecho; ${plano.criterio_exclusao_tema}

Registros:
${itens}

Para CADA registro acima (todos os ids ${lote[0].cid} a ${lote[lote.length - 1].cid}), decida. Motivos de exclusão permitidos: "fora_do_tema", "nao_primario", "populacao_inadequada", "resumo_congresso", "relato_de_caso", "sem_desfecho".
Responda SOMENTE com JSON:
{"decisoes": [{"id": "C1", "incluir": true, "motivo": "", "delineamento": "ensaio clínico randomizado | coorte prospectiva | coorte retrospectiva | caso-controle | transversal | série de casos | quase-experimental | qualitativo | outro", "relevancia": 1}]}
"relevancia" vai de 1 (tangencial) a 5 (responde diretamente à pergunta). Para excluídos, preencha "motivo".`;
}

export function promptSegundaOpiniao({ plano, lote }) {
  const itens = lote.map((r) => `### ${r.cid} (excluído antes por: ${r.motivo_anterior})
Título: ${r.titulo}
Ano: ${r.ano} | Base: ${r.base}
Resumo: ${(r.resumo || '').slice(0, 1500)}`).join('\n\n');
  return `Você é o SEGUNDO avaliador de uma triagem. Os registros abaixo, de bases latino-americanas (SciELO/LILACS), foram EXCLUÍDOS pelo primeiro avaliador. Reavalie cada um de forma independente, com atenção a resumos em espanhol ou português, que costumam ser descritos com outras palavras.
Pergunta da revisão: "${plano.pergunta}"
Inclua se o estudo for primário e trouxer dados sobre a pergunta (por exemplo, taxa ou fatores associados ao desfecho principal), mesmo que esse não seja o único foco do estudo. Mantenha a exclusão se for revisão, relato de caso, editorial ou realmente fora do tema.

${itens}

Responda SOMENTE com JSON:
{"decisoes": [{"id": "C1", "incluir": true, "motivo": "", "delineamento": "", "relevancia": 1, "justificativa": "até 20 palavras"}]}`;
}

export function promptExtracao({ plano, lote }) {
  const itens = lote.map((r) => `### ${r.eid}
Título: ${r.titulo}
Ano: ${r.ano} | Periódico: ${r.periodico} | Afiliação/país informado: ${r.afiliacao || 'não informado'}
Resumo: ${r.resumo}`).join('\n\n');
  return `Extraia dados dos estudos abaixo para a tabela de caracterização de uma revisão sobre: "${plano.pergunta}".
Eixos temáticos disponíveis: ${plano.eixos.map((e, i) => `(${i + 1}) ${e}`).join('; ')}.

${itens}

Regras: use SOMENTE o que está no título/resumo/afiliação. Se algo não estiver informado, escreva "NI". Escreva TODOS os campos em português do Brasil (inclusive nomes de países), mesmo quando o resumo estiver em inglês ou espanhol. Números devem ser copiados exatamente como aparecem no resumo. "achados" deve ser uma paráfrase (não copie frases), com no máximo 35 palavras. Para "delineamento" use um destes termos: ensaio clínico randomizado, coorte prospectiva, coorte retrospectiva, caso-controle, transversal, série de casos, quase-experimental, qualitativo, outro. Devolva um item para CADA estudo acima, usando exatamente o identificador do cabeçalho (${lote.map((r) => r.eid).join(', ')}).
Responda SOMENTE com JSON:
{"estudos": [{"id": "${lote[0].eid}", "pais": "país onde o estudo foi realizado ou NI", "delineamento": "delineamento", "amostra": "tamanho e descrição curta da amostra ou NI", "exposicao": "${plano.coluna_exposicao}: o que foi avaliado", "desfechos": "${plano.coluna_desfecho}", "achados": "principais achados", "eixo": 1}]}`;
}

function blocoFontes(fontes) {
  return fontes.map((f) => `[${f.n}] ${f.autorCurto} (${f.ano}, ${f.pais || 'país NI'}) — ${f.delineamento || ''}. Título: ${f.titulo}
Resumo: ${f.resumo}`).join('\n\n');
}

export function promptIntroducao({ plano, fontes, tipoRevisao }) {
  return `Escreva a INTRODUÇÃO de um artigo de revisão ${tipoRevisao} da literatura.
Tema: "${plano.titulo_provisorio}"
Pergunta norteadora: "${plano.pergunta}"

Fontes verificadas disponíveis (use somente estas; cite pelo número):
${blocoFontes(fontes)}

Estrutura obrigatória, em 4 blocos lógicos (funil argumentativo), em 5 a 7 parágrafos corridos:
1. CONTEXTUALIZAÇÃO do problema clínico-cirúrgico.
2. ESTADO DA ARTE E PROBLEMÁTICA, sintetizando o que as fontes mostram.
3. LACUNA: por que consolidar essas evidências é necessário (achados dispersos, divergências entre estudos, diferenças regionais, incluindo a produção latino-americana).
4. OBJETIVO no ÚLTIMO parágrafo, iniciando exatamente com "Diante do exposto, o objetivo deste estudo foi" e descrevendo o objetivo da revisão ${tipoRevisao}.
Tamanho: entre 600 e 800 palavras. Sem títulos, sem listas. Afirmações factuais sempre com citação [n].
Responda apenas com o texto da introdução em Markdown (parágrafos separados por linha em branco).`;
}

export function promptDiscussao({ plano, fontes, sinteseResultados, limitacoesFatos }) {
  return `Escreva a DISCUSSÃO de um artigo de revisão da literatura sobre: "${plano.pergunta}"

Resumo factual dos resultados desta revisão:
${sinteseResultados}

Fontes incluídas e verificadas (use somente estas; cite pelo número):
${blocoFontes(fontes)}

Fatos sobre as limitações desta revisão (use-os, sem inventar outros procedimentos):
${limitacoesFatos}

Estrutura obrigatória, com estes quatro subtítulos Markdown (###). As limitações aparecem SOMENTE na subseção "Limitações", em um único parágrafo conciso (até 90 palavras), objetivo, profissional e rigoroso, tratando exclusivamente dos limites intrínsecos da evidência disponível (delineamentos observacionais, centros únicos, recorte temporal) sem autocrítica excessiva, sem depreciação do trabalho dos autores e sem duplicações de frases; não repita ressalvas de limitação nas demais subseções:
### Interpretação dos principais achados
### Diálogo crítico entre os estudos
### Limitações
### Implicações para a prática e para a pesquisa
Em "Diálogo crítico", contraponha estudos que convergem e divergem, explicando diferenças de delineamento, amostra ou contexto (inclusive entre estudos latino-americanos e de outras regiões) quando os resumos permitirem.
Cada parágrafo deve integrar 2 a 5 estudos (fusão conceitual). Tamanho: 1.200 a 1.800 palavras. Afirmações factuais sempre com citação [n]. Procure citar todas as fontes ao menos uma vez.
Responda apenas com o texto da discussão em Markdown.`;
}

export function promptResumoConclusao({ plano, fatos, introducao, discussao, tipoRevisao }) {
  return `Com base no artigo abaixo, escreva título (em português, inglês e espanhol), resumo estruturado (em português, inglês e espanhol) e conclusão.

Fatos metodológicos exatos (use estes números sem alterar):
${fatos}

Introdução:
${introducao.slice(0, 6000)}

Discussão:
${discussao.slice(0, 9000)}

Regras: resumo com no máximo 250 palavras, estruturado em Objetivo, Métodos, Resultados e Conclusão; não use citações [n] no resumo nem na conclusão; não mencione limitações no resumo nem na conclusão (elas ficam só na Discussão); a conclusão (1 a 2 parágrafos) responde à pergunta "${plano.pergunta}" sem extrapolar os achados; o tipo de estudo é "revisão ${tipoRevisao} da literatura".
Responda SOMENTE com JSON:
{"titulo": "título final em português",
 "titulo_en": "title in English",
 "titulo_es": "título en español",
 "resumo": {"objetivo": "", "metodos": "", "resultados": "", "conclusao": ""},
 "abstract": {"objective": "", "methods": "", "results": "", "conclusion": ""},
 "resumen": {"objetivo": "", "metodos": "", "resultados": "", "conclusion": ""},
 "palabras_clave": ["término 1", "término 2", "término 3"],
 "conclusao": "texto em Markdown"}`;
}

export function promptAuditoria({ fontes, frases }) {
  return `Confira, uma a uma, se cada frase abaixo é SUSTENTADA pelos resumos das fontes que ela cita entre colchetes.
Seja cético: se a frase afirma algo que não está no resumo citado (número diferente, conclusão mais forte, relação causal não demonstrada, população ou procedimento diferente), ela NÃO é sustentada. Afirmações genéricas de contexto compatíveis com o resumo citado são sustentadas.
Atenção especial a atribuições de país ou região ("estudo boliviano", "coorte iraniana", "estudos latino-americanos"): só são sustentadas se o país da fonte citada (informado abaixo) corresponder.

FONTES (resumos):
${fontes.map((f) => `[${f.n}] ${f.titulo} (país: ${f.pais || 'NI'}${f.afiliacao ? `; afiliação: ${f.afiliacao}` : ''}). Resumo: ${f.resumo}`).join('\n\n')}

FRASES A CONFERIR:
${frases.map((f) => `F${f.i}: ${f.frase}`).join('\n')}

Responda SOMENTE com JSON, listando apenas as frases com problema:
{"problemas": [{"frase": "F3", "veredito": "nao_sustentada | parcial", "explicacao": "o que a fonte realmente diz", "correcao": "frase reescrita fiel às fontes, mantendo as citações [n], ou REMOVER"}]}
Se todas forem sustentadas, responda {"problemas": []}.`;
}

export function promptRefinarString({ base, sintaxe, string, problema, tema }) {
  return `A estratégia de busca abaixo, para a base ${base}, sobre o tema "${tema}", apresentou um problema: ${problema}
Estratégia atual: ${string}
Sintaxe permitida: ${sintaxe}
Reescreva a estratégia para corrigir o problema, mantendo o foco no tema.
Responda SOMENTE com JSON: {"string": "nova estratégia"}`;
}

export function promptCorrecao({ itens }) {
  const blocos = itens.map((t, i) => `### Item ${i + 1}
Frase: "${t.frase}"
Problema: ${t.problema}
Fontes citadas:
${t.fontes.map((f) => `[${f.n}] ${f.titulo}. Resumo: ${f.resumo}`).join('\n') || '(nenhuma)'}`).join('\n\n');
  return `Reescreva cada frase abaixo para corrigir o problema indicado, mantendo o sentido acadêmico, a paráfrase ativa e as citações [n] válidas. Use apenas informações dos resumos citados. Se não for possível corrigir com fidelidade, responda "REMOVER".

${blocos}

Responda SOMENTE com JSON: {"correcoes": [{"item": 1, "nova_frase": "..." }]}`;
}

export const SISTEMA_EDITOR = `Você é editor de periódico científico brasileiro da área da saúde, especialista em redação acadêmica em português. Responda sempre e somente com JSON válido.`;

// Agente de Estilo Academico: remove padroes tipicos de texto gerado por IA sem alterar fatos.
export function promptEstilo({ paragrafos }) {
  return `Revise o estilo dos parágrafos abaixo, de um artigo de revisão da literatura, para que soem como texto escrito por um pesquisador experiente, com voz autoral própria.
Corrija, quando houver: aberturas genéricas; conectivos repetidos ("além disso", "nesse sentido", "ademais", "outrossim"); expressões como "é importante ressaltar", "vale destacar", "cabe salientar", "desempenha um papel crucial", "no cenário atual", "em suma"; enumerações sempre em três itens; frases todas do mesmo tamanho; excesso de travessões; "não apenas… mas também"; adjetivos vazios ("robusto", "crucial", "fundamental", "notável") sem necessidade; modalizadores empilhados em toda frase (mantenha um por ideia).
Varie a extensão e a construção das frases, prefira verbos precisos e mantenha o registro formal do português do Brasil.
REGRAS INEGOCIÁVEIS: não acrescente nem retire informação; mantenha TODAS as citações entre colchetes exatamente como estão e ligadas às mesmas afirmações; mantenha todos os números exatamente; não crie listas nem subtítulos.
NÃO mude a força das afirmações: "sugere" não vira "indica" nem "demonstra"; "associou-se" não vira "eleva", "aumenta" ou "causa"; "entre os mais relatados" não vira "os principais"; mantenha os modalizadores existentes. NÃO troque o nome do delineamento de um estudo ("série", "coorte", "transversal", "caso-controle").

${paragrafos.map((p) => `### ${p.id}\n${p.texto}`).join('\n\n')}

Responda SOMENTE com JSON: {"paragrafos": [{"id": "${paragrafos[0]?.id || 'P1'}", "texto": "parágrafo revisado"}]}`;
}

// Agente de Limitacoes e Coerencia: um unico paragrafo de limitacoes e texto sem ressalvas repetidas.
export function promptLimitacoes({ fatos, atual, frases }) {
  return `Você revisa a forma como um artigo de revisão da literatura apresenta suas limitações.
1. Reescreva a subseção "Limitações" como UM único parágrafo de 60 a 90 palavras, em tom objetivo, profissional e rigoroso, tratando exclusivamente das características intrínsecas da literatura científica disponível e do escopo temporal/geográfico. Jamais deprecie o trabalho dos autores, não sugira ausência de rigor humano, não mencione ferramentas e nunca duplique frases.
Fatos:
${fatos}
Parágrafo atual:
${atual}

2. As frases abaixo estão FORA da subseção de limitações e trazem ressalvas. Para cada uma, decida:
- "manter": a ressalva é um achado científico necessário (por exemplo, divergência entre estudos);
- "reescrever": a frase tem conteúdo útil, mas a ressalva é redundante — reescreva sem a ressalva, mantendo citações [n] e números exatamente;
- "remover": a frase é só uma ressalva repetida, sem conteúdo novo.
Nunca transforme associação em causalidade nem exagere a força dos achados.

${frases.map((f) => `${f.id} (${f.secao}): ${f.texto}`).join('\n')}

Responda SOMENTE com JSON: {"limitacoes": "novo parágrafo", "frases": [{"id": "${frases[0]?.id || 'F1'}", "acao": "manter | reescrever | remover", "texto": "frase reescrita, se for o caso"}]}`;
}
