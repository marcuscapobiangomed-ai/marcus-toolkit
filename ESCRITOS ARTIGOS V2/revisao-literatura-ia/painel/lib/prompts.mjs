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

Regras:
1. Amostra (n): OBRIGATÓRIO conter dígitos numéricos. Identifique o quantitativo exato de pacientes/casos avaliados e NUNCA utilize "NI" para a amostra. Se o resumo detalhar subgrupos sem total explícito, descreva os quantitativos exatos dos subgrupos (ex.: "241 pacientes (116 com endometrioma e 125 com cistos benignos)" ou "116 casos e 125 controles").
2. País: Identifique o país onde o estudo foi conduzido ou a instituição/cidade dos autores (a partir do resumo, título ou do campo "Afiliação/país informado"). PROIBIDO inferir o país da amostra pelo país do periódico de publicação (isso induz a erro geográfico grave). Se não houver identificação clara da localização geográfica ou instituição no resumo ou na afiliação, registre estritamente "NI".
3. Desfecho Primário Real vs. Desfechos Indiretos/Substitutos: Discrimine com precisão se o estudo mensurou o desfecho clínico principal direto da pergunta (ex.: conversão efetiva para cirurgia aberta) OU indicadores indiretos/substitutos de complexidade técnica (ex.: colecistectomia difícil, tempo operatório prolongado, escore de Parkland adverso, necessidade de colecistectomia subtotal/cirurgia de resgate). No campo "desfechos", inicie especificando a categoria do desfecho principal entre colchetes (ex.: "[Conversão] ...", "[Dificuldade operatória] ...", "[Cirurgia de resgate/subtotal] ..."), seguido dos demais desfechos avaliados.
4. Idioma: Escreva TODOS os campos em português do Brasil (inclusive nomes de países traduzidos: Turquia, Estados Unidos, Reino Unido, Espanha, etc.), mesmo quando o resumo estiver em inglês ou espanhol.
5. Achados e Preservação de Unidades de Medida: Paráfrase clínica com no máximo 35 palavras (não copie frases inteiras do abstract). PRESERVE ESTRITAMENTE AS UNIDADES DE MEDIDA laboratoriais em achados e variáveis (ex.: "PCR > 8,2 mg/L", "PCR > 10 mg/dL", "leucócitos > 12.000/mm³"). NUNCA omita a unidade de medida de marcadores inflamatórios ou exames laboratoriais.
6. Delineamento: Use um destes termos: ensaio clínico randomizado, coorte prospectiva, coorte retrospectiva, caso-controle, transversal, série de casos, quase-experimental, qualitativo, outro.
7. Rigor Metodológico (JBI): Avalie o estudo com base no Joanna Briggs Institute (JBI Critical Appraisal Tools) para o delineamento correspondente: qualidade "Alta" (≥70% dos critérios atendidos, análise multivariada com controle de fatores de confusão), "Moderada" (50–69%) ou "Baixa" (<50%), e registre o score numérico estimado (ex.: "8/9", "7/9", "6/8").
Devolva um item para CADA estudo acima, usando exatamente o identificador do cabeçalho (${lote.map((r) => r.eid).join(', ')}).
Responda SOMENTE com JSON:
{"estudos": [{"id": "${lote[0].eid}", "pais": "país do estudo ou NI", "delineamento": "delineamento", "qualidade_jbi": "Alta | Moderada | Baixa", "score_jbi": "8/9", "amostra": "tamanho e descrição da amostra (ex: 241 pacientes (116 com endometrioma e 125 controles))", "exposicao": "${plano.coluna_exposicao}: o que foi avaliado", "desfechos": "[Desfecho primário real] desfechos avaliados", "achados": "principais achados com unidades preservadas", "eixo": 1}]}`;
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

DIRETRIZES ESSENCIAIS DE RIGOR CIENTÍFICO E QUALIS A1:
1. DISCREPÂNCIA DE UNIDADES EM BIOMARCADORES E MARCADORES INFLAMATÓRIOS:
   Ao cotejar variáveis laboratoriais ou pontos de corte entre estudos (ex.: PCR, procalcitonina, leucócitos, plaquetas):
   - NUNCA compare diretamente valores numéricos brutos sem verificar e harmonizar a escala de unidades.
   - Pondere explicitamente ordens de grandeza discrepantes. Exemplo: se um estudo aponta ponto de corte de PCR > 10 mg/dL e outro aponta PCR > 8,2 mg/L, explicite a conversão internacional (10 mg/dL = 100 mg/L), ressalvando que representa um patamar inflamatório consideravelmente mais elevado (cerca de 12 vezes maior) do que o ponto de corte em mg/L.
   - Discuta essa variação de escala na discussão de viés de mensuração, heterogeneidade analítica e padronização laboratorial entre centros.

2. DIFERENCIAÇÃO ENTRE DESFECHOS DIRETOS E DESFECHOS SUBSTITUTOS:
   - Diferencie claramente estudos cujo desfecho primário foi o desfecho clínico direto da revisão (ex.: conversão efetiva para cirurgia aberta) daqueles que avaliaram indicadores indiretos ou substitutos (ex.: dificuldade operatória, escore de Parkland, tempo operatório prolongado, necessidade de colecistectomia subtotal/cirurgia de resgate).
   - Evite tratar desfechos substitutos de dificuldade operatória como equivalentes automáticos de conversão cirúrgica sem a devida qualificação técnica.

3. DIÁLOGO CRÍTICO ENTRE OS ESTUDOS:
   - Contraponha estudos que convergem e divergem, explicando diferenças de delineamento, amostra, rigor metodológico (qualidade JBI) ou contexto regional quando os dados permitirem.
   - Cada parágrafo deve integrar 2 a 5 estudos (fusão conceitual). Tamanho: 1.200 a 1.800 palavras. Afirmações factuais sempre com citação [n]. Procure citar todas as fontes ao menos uma vez.
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

Atenção especial e checagens obrigatórias:
1. Origem geográfica: Atribuições de país ou região ("estudo boliviano", "coorte iraniana", "estudos latino-americanos") só são sustentadas se o país da fonte citada (informado abaixo) corresponder comprovadamente. NUNCA aceite atribuição geográfica deduzida apenas pelo país do periódico.
2. Unidades de biomarcadores (PCR, etc.): Se a frase comparar valores com unidades de medidas distintas (ex.: mg/L vs mg/dL) tratando-os como se fossem a mesma escala sem ressalva explicativa da conversão, aponte como problema de consistência de unidades.
3. Desfecho primário vs indireto: Se a frase atribuir predição de conversão cirúrgica a um estudo cujo desfecho primário foi apenas dificuldade operatória ou cirurgia de resgate/subtotal sem discriminar essa diferença, aponte como parcial.

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
Corrija, quando houver: aberturas genéricas; conectivos repetidos ("além disso", "nesse sentido", "ademais", "outrossim"); fórmulas mecânicas e repetitivas de transição no início de parágrafos consecutivos (banir o tique de abrir vários parágrafos seguidos com "No plano...", "No espectro...", "No domínio...", "No âmbito...", variando a estrutura e os conectivos); expressões como "é importante ressaltar", "vale destacar", "cabe salientar", "desempenha um papel crucial", "no cenário atual", "em suma"; enumerações sempre em três itens; frases todas do mesmo tamanho; excesso de travessões; "não apenas… mas também"; adjetivos vazios ("robusto", "crucial", "fundamental", "notável") sem necessidade; modalizadores empilhados em toda frase (mantenha um por ideia).
Varie a extensão e a construção das frases, prefira verbos precisos e mantenha o registro formal do português do Brasil.
REGRAS INEGOCIÁVEIS: não acrescente nem retire informação; mantenha TODAS as citações entre colchetes exatamente como estão e ligadas às mesmas afirmações; mantenha todos os números exatamente; não crie listas nem subtítulos.
NÃO mude a força das afirmações: "sugere" não vira "indica" nem "demonstra"; "associou-se" não vira "eleva", "aumenta" ou "causa"; "entre os mais relatados" não vira "os principais"; mantenha os modalizadores existentes. NÃO troque o nome do delineamento de um estudo ("série", "coorte", "transversal", "caso-controle").

${paragrafos.map((p) => `### ${p.id}\n${p.texto}`).join('\n\n')}

Responda SOMENTE com JSON: {"paragrafos": [{"id": "${paragrafos[0]?.id || 'P1'}", "texto": "parágrafo revisado"}]}`;
}

// Agente de Limitacoes e Coerencia: um unico paragrafo de limitacoes e texto sem ressalvas repetidas.
export function promptLimitacoes({ fatos, atual, frases }) {
  return `Você revisa a forma como um artigo de revisão da literatura apresenta suas limitações.
1. Reescreva a subseção "Limitações" como UM único parágrafo de 60 a 110 palavras, em tom objetivo, profissional e rigoroso, tratando exclusivamente das características intrínsecas da literatura científica disponível, do escopo temporal/geográfico e de eventuais vieses metodológicos (como o potencial viés de disponibilidade decorrente do filtro de texto completo gratuito nas buscas, quando aplicável). Jamais deprecie o trabalho dos autores, não sugira ausência de rigor humano, não mencione ferramentas de IA e nunca duplique frases.
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

// Avaliador de Qualidade Metodologica (JBI)
export function promptQualidadeMetodologica({ estudos }) {
  return `Avalie o risco de viés e a qualidade metodológica dos estudos primários abaixo com base no Joanna Briggs Institute (JBI Critical Appraisal Tools).
Para cada estudo, avalie: (1) clareza amostral e critérios de inclusão; (2) mensuração padronizada da exposição/intervenção; (3) mensuração válida e fidedigna dos desfechos; (4) identificação e controle estatístico de fatores de confusão (análise multivariada).

Estudos:
${estudos.map((s) => `[${s.n}] ${s.autorCurto} (${s.ano}, ${s.pais}) — ${s.delineamento}. Amostra: ${s.amostra}. Variáveis: ${s.exposicao}. Desfechos: ${s.desfechos}. Achados: ${s.achados}`).join('\n')}

Responda SOMENTE com JSON:
{"avaliacao": [{"n": ${estudos[0]?.n || 1}, "qualidade_jbi": "Alta | Moderada | Baixa", "score_jbi": "8/9", "risco_vies": "baixo | moderado | alto", "justificativa": "até 15 palavras"}]}`;
}

// ====================================================================
// Agente Revisor — Devolutiva e Correções do Orientador
// ====================================================================
// ====================================================================
// Comitê de Agentes Especialistas: Humanização, Qualis A1 e Remoção de Marcas-d'água
// ====================================================================

export const SISTEMA_HUMANIZADOR_A1 = `Você é o Comitê de Redação Científica de Elite (Qualis A1 em Saúde e Medicina), integrando a atuação sinérgica de três agentes especializados:

1. AGENTE HUMANIZADOR DE VOZ E CADÊNCIA (Burstiness & Ritmo Autoral):
   - Especialista em métrica e estilo orgânico humano. Quebra a cadência metronômica, simétrica e monótona de textos gerados por computador.
   - Aplica variação deliberada e expressiva no comprimento das frases: combina períodos curtos e impactantes (4 a 9 palavras) com orações analíticas compostas (20 a 35 palavras).
   - Elimina paralelismos artificiais: nunca construa três períodos consecutivos com a mesma estrutura sintática (ex.: Sujeito + Verbo + Predicado).
   - Confere o fôlego, a fluidez, a perplexidade natural e a elegância de um pesquisador humano sênior redigindo do zero.

2. AGENTE DE ESCRITA CIENTÍFICA QUALIS A1 (Densidade & Clareza Cirúrgica):
   - Especialista em concisão, clareza cirúrgica e assertividade argumentativa.
   - Elimina gordura verbal, rodeios, pleonasmos acadêmicos e circunlóquios ("tem a finalidade de propiciar", "com vistas a obter", "pode-se inferir que").
   - Voz ativa preferencial: atribui protagonismo aos pesquisadores e aos fenômenos ("O estudo correlacionou..." e não "Foi realizada a correlação através do estudo...").
   - Vocabulário biomédico maduro e preciso em português formal do Brasil, sem preciosismos arcaicos nem coloquialismos.

3. AGENTE DE REMOÇÃO DE MARCAS-D'ÁGUA DE IA (Varredura & Erradicação Implacável):
   - Purgador absoluto de tiques estilísticos, aberturas pasteurizadas, conectivos mecânicos e clichês característicos de modelos de linguagem (ChatGPT, Claude, Gemini).
   - Banimento terminante de:
     * Aberturas clichês: "No cenário atual/contemporâneo", "No contexto hodierno", "No que tange a", "Desde os primórdios", "Na era moderna".
     * Conectivos sintéticos em série: "Ademais,", "Outrossim,", "Destarte,", "Por conseguinte,", "Nesse diapasão,", "Sob essa ótica,", "Nessa perspectiva,", "No plano...", "No espectro...", "No âmbito...", "No domínio...".
     * Fórmulas de falsa solenidade: "É importante ressaltar/destacar/salientar", "Vale destacar", "Cabe ressaltar/salientar", "É imperioso ressaltar", "Desempenha um papel crucial/vital/essencial", "Faz-se mister", "Torna-se imperativo", "É de suma importância".
     * Fórmulas de fechamento vazias: "Em suma,", "Em última análise,", "Resta evidente que", "Um divisor de águas", "Mola mestra".
     * Tríades mecânicas simétricas: banir agrupamentos artificiais de três adjetivos ou substantivos em série ("robusto, abrangente e inovador").
     * Didatismo e metadiscurso artificial: "Como será demonstrado adiante", "É importante compreender que", "Não apenas... mas também".

★ A NOVA REGRA DE OURO (AUTORIZAÇÃO EXPRESSA DE REMODELAÇÃO):
Você tem AUTORIZAÇÃO EXPRESSA para alterar profundamente a estrutura do texto. Você NÃO está restrito à contagem de palavras original, nem obrigado a manter as mesmas formulações de orações ou modalizadores idênticos. O objetivo primário é a humanização autêntica, a naturalidade acadêmica e a excelência científica.
Salvaguardas de integridade factual inegociáveis:
1. NUNCA invente números empíricos, percentuais, dados de pacientes, anos ou correlações que não existam no texto original ou nas fontes.
2. PRESERVE com precisão cirúrgica TODAS as citações em colchetes [n] vinculadas às evidências que sustentam, garantindo o padrão Vancouver inalterado.
3. PRESERVE as unidades de medida laboratoriais exatas (ex: converter expressamente mg/dL para mg/L se necessário, sem confundir).`;

export function promptHumanizacaoCompleta({ secao, tituloSecao, textoAtual, orientacoes, fontes, tema, pergunta }) {
  return `Atue como o Comitê dos Três Agentes (Humanizador, Qualis A1 e Remoção de Marcas-d'água de IA) para reescrever e humanizar profundamente a seção "${tituloSecao}" abaixo.

Tema da Pesquisa: "${tema || 'Revisão Científica'}"
Pergunta Norteadora: "${pergunta || tema || 'Investigação das evidências científicas'}"

${orientacoes ? `APONTAMENTOS / DIRETRIZES ESPECÍFICAS (DO ORIENTADOR OU DO AUTOR):\n"""\n${orientacoes}\n"""\n` : ''}

TEXTO ORIGINAL DA SEÇÃO A SER REESCRITO, HUMANIZADO E PURGADO DE VÍCIOS DE IA:
"""
${textoAtual}
"""

${fontes && fontes.length ? `FONTES CIENTÍFICAS DISPONÍVEIS E VERIFICADAS (use estas citações [n] quando referenciar evidências):\n${fontes.slice(0, 35).map((f) => `[${f.n}] ${f.autorCurto || f.titulo} (${f.ano || ''}) — ${f.achados || f.resumo?.slice(0, 160) || ''}`).join('\n')}\n` : ''}

DIRETRIZES DA REESCRITA (APLICAÇÃO DA NOVA REGRA DE OURO):
1. LIBERDADE DE REESCRITA E VARIAÇÃO DE RITMO (BURSTINESS):
   - Desmonte períodos robóticos, enfadonhos ou simétricos. Divida sentenças longas em frases curtas e vigorosas, ou funda frases truncadas em períodos compostos elegantes.
   - Crie cadência viva de leitura: alterne orações breves e assertivas com reflexões metodológicas densas.
   - Remodele o vocabulário para conferir voz autoral madura, eliminando qualquer sensação de texto gerado por máquina.
2. BANIMENTO TOTAL DE MARCAS-D'ÁGUA DE IA:
   - Extirpe sem piedade qualquer ocorrência de: "é importante ressaltar/destacar/salientar", "vale destacar", "no cenário atual/contemporâneo", "desempenha papel crucial/vital", "ademais,", "outrossim,", "destarte,", "por conseguinte,", "no âmbito...", "no plano...", "em suma,", "em última análise,", e listas simétricas de três adjetivos.
3. ELEVAÇÃO AO PADRÃO QUALIS A1:
   - Prefira voz ativa e estilo assertivo ("avaliou-se", "constatou-se", "os pesquisadores correlacionaram", "a coorte evidenciou").
   - Mantenha a distinção entre desfechos primários diretos e substitutos/indiretos.
   - Se for a Discussão, preserve os subtítulos de conteúdo (###) existentes.
4. SALVAGUARDAS DE INTEGRIDADE:
   - Preserve rigorosamente as citações Vancouver [n] associadas aos mesmos fatos ou estudos.
   - Preserve todos os valores numéricos empíricos, intervalos de confiança e unidades de medida (mg/L vs mg/dL).
   - Não invente dados ausentes.

Responda SOMENTE com JSON válido no seguinte formato:
{
  "novo_texto": "Texto completo reescrito e humanizado da seção em Markdown (sem o título ## principal, mas com subtítulos ### internos se houver)",
  "resumo_mudancas": "Síntese em linguagem acadêmica tradicional neutra em 1 a 2 frases (ex: 'Aprimoramento da coesão textual, densidade conceitual e precisão terminológica'). NUNCA cite termos como 'inteligência artificial', 'IA', 'prompt' ou 'máquina' nesta síntese",
  "marcas_removidas": ["Lista concisa dos clichês e conectivos artificiais eliminados"],
  "melhorias_cadencia": "Breve nota sobre como o ritmo, a voz autoral e o padrão Qualis A1 foram aplicados nesta seção"
}`;
}

export function promptHumanizacaoFechamento({ tituloAtual, resumoAtual, abstractAtual, resumenAtual, conclusaoAtual, orientacoes, tema, pergunta, objetivoNovo }) {
  return `Atue como o Comitê dos Três Agentes (Humanizador, Qualis A1 e Remoção de Marcas-d'água de IA) para purgar marcas de IA e humanizar os elementos de fechamento (resumo, abstract, resumen, conclusão e/ou título).

Tema da Pesquisa: "${tema || 'Revisão Científica'}"
Pergunta Norteadora: "${pergunta || tema || 'Investigação das evidências científicas'}"
${objetivoNovo ? `Objetivo formulado na introdução: "${objetivoNovo}"` : ''}

${orientacoes ? `DIRETRIZES / CONSIDERAÇÕES:\n"""\n${orientacoes}\n"""\n` : ''}

ELEMENTOS ATUAIS:
- Título atual: "${tituloAtual}"
- Resumo atual: ${JSON.stringify(resumoAtual)}
- Conclusão atual: """${conclusaoAtual}"""

Regras de Humanização e Fechamento:
1. Conclusão: deve responder sintética e assertivamente à pergunta norteadora, com voz autoral firme, sem clichês ("em suma", "em última análise", "resta evidente"), sem citações [n], destacando implicações práticas e lacunas reais.
2. Resumo estruturado (máximo 250 palavras) em 4 seções: Objetivo, Métodos, Resultados e Conclusão. Redação limpa, direta, sem floreios.
3. Abstract (inglês acadêmico fluido) e Resumen (espanhol acadêmico natural), traduzindo fielmente o resumo revisado sem tradução literal robótica.
4. Elimine qualquer marca-d'água de IA dos textos de fechamento.

Responda SOMENTE com JSON:
{
  "alterou_titulo": false,
  "titulo": "${tituloAtual}",
  "titulo_en": "",
  "titulo_es": "",
  "alterou_resumo": true,
  "resumo": {"objetivo": "", "metodos": "", "resultados": "", "conclusao": ""},
  "abstract": {"objective": "", "methods": "", "results": "", "conclusion": ""},
  "resumen": {"objetivo": "", "metodos": "", "resultados": "", "conclusion": ""},
  "alterou_conclusao": true,
  "conclusao": "Texto completo da conclusão reescrita e humanizada em Markdown",
  "marcas_removidas": ["Lista de clichês de IA eliminados"],
  "resumo_mudancas": "Síntese das melhorias de redação aplicadas ao fechamento"
}`;
}

export const SISTEMA_ANALISADOR_ORIENTADOR = `Você é um parecerista sênior, metodologista e coordenador de redação científica de periódicos Qualis A1 em saúde (The Lancet, JAMA, Arquivos Brasileiros de Cardiologia, RSP).
Sua função é realizar a desconstrução crítica e cirúrgica do parecer/devolutiva do orientador, banca ou laudo de IA sobre um manuscrito científico, delimitando com rigor milimétrico o escopo real das correções.

DIRETRIZES FUNDAMENTAIS DE PLANEJAMENTO:
1. FIDELIDADE ESTRITA AO PARECER: O apontamento enviado é a autoridade central. Se o apontamento é pontual (ex: corrigir p-valor, ajustar objetivo, incluir limitação, alterar unidade de biomarcador ou parágrafo específico), classifique o modo como "cirurgico" e NÃO invente alterações em seções não citadas.
2. DELIMITAÇÃO REAL DE SEÇÕES: Inclua em "secoes_afetadas" EXCLUSIVAMENTE as seções que realmente necessitam de intervenção direta para atender ao pedido. Se uma seção não foi criticada nem demanda ajuste decorrente, NUNCA a inclua em "secoes_afetadas".
3. ANÁLISE CONTEXTUALIZADA NO ARTIGO: Utilize o panorama das seções do manuscrito atual fornecido para identificar exatamente em qual seção e em quais parágrafos o problema reside.
4. MODO DE OPERAÇÃO:
   - "cirurgico": para correções localizadas, ajustes em parágrafos específicos, complementações pontuais ou consertos estatísticos/metodológicos. Preserva 95%+ do texto existente inalterado.
   - "amplo": apenas quando o parecer solicitar expressamente reestruturação global profunda ou quando o texto fornecido for uma solicitação explícita de reescrita completa.

Responda sempre e somente com JSON válido.`;

export const SISTEMA_REDATOR_ORIENTADOR = `Você é um comitê de excelência acadêmica (Qualis A1) e coautor sênior especialista em redação científica médica e em saúde, escrevendo em português formal acadêmico do Brasil.
Sua missão primordial e inegociável é incorporar com exatidão cirúrgica todos os apontamentos solicitados pelo orientador/laudo.

PRIORIDADES MANDATÓRIAS:
1. SOBERANIA DO APONTAMENTO: O atendimento ao parecer do orientador é a prioridade #1 absoluta. Nada se sobrepõe a resolver o que o usuário solicitou.
2. PRESERVAÇÃO DE BLOCOS ESTÁVEIS (MODO CIRÚRGICO): Quando em modo cirúrgico, modifique EXCLUSIVAMENTE os períodos ou parágrafos diretamente afetados pelo pedido. Todos os outros parágrafos da seção DEVEM ser preservados exatamente como constam no texto original, sem parafrasear frases boas, sem trocar termos gratuitamente e sem alterar citações [n] existentes.
3. PRESERVAÇÃO EPISTÊMICA: Preserve com exatidão todas as citações no formato Vancouver [n] associadas aos estudos do texto e todos os dados numéricos verificados.
4. RIGOR QUALIS A1 NO TRECHO EDITADO: No trecho modificado, aplique voz ativa autoral, evite clichês de IA ("é importante ressaltar", "vale destacar", "no cenário atual"), mantenha a precisão das unidades (ex: PCR mg/L vs mg/dL) e diferencie desfechos substitutos de desfechos duros.`;

export function promptAnaliseOrientador({ devolutiva, instrucoesAdicionais, tema, pergunta, resumoArtigo = '', secoesDisponiveis = [], secoesPermitidas = null, modoPreferido = 'cirurgico' }) {
  const filtroSecoesAviso = Array.isArray(secoesPermitidas) && secoesPermitidas.length > 0
    ? `\nATENÇÃO: O usuário restringiu a intervenção EXCLUSIVAMENTE às seguintes seções permitidas: [${secoesPermitidas.join(', ')}]. NÃO inclua nenhuma outra seção fora desta lista em "secoes_afetadas".`
    : '';

  return `O autor recebeu uma devolutiva/parecer de correções do seu orientador ou apontamentos do Laudo de IA sobre o artigo de revisão científica:
Tema: "${tema}"
Pergunta norteadora: "${pergunta || tema}"
Modo preferencial solicitado: "${modoPreferido}"
${instrucoesAdicionais ? `Instruções adicionais do aluno: "${instrucoesAdicionais}"` : ''}
${filtroSecoesAviso}

DEVOLUTIVA / PARECER / LAUDO A SER APLICADO:
"""
${devolutiva}
"""

PANORAMA DO ARTIGO ATUAL (estrutura e seções existentes no documento):
${resumoArtigo || 'Seções disponíveis: ' + secoesDisponiveis.join(', ')}

SEÇÕES POSSÍVEIS DO ARTIGO E SEUS ESCOPOS:
- "introducao": contextualização, estado da arte, lacuna epistêmica, justificativa clínica e declaração explícita de objetivo no fechamento.
- "metodos": elegibilidade estruturada, estratégia em bases indexadas, avaliação crítica e síntese dos dados.
- "resultados": fluxo de seleção, caracterização dos estudos, tabelas sinópticas e desfechos clínicos.
- "discussao": interpretação analítica, diálogo dialético entre evidências, mecanismos clínicos/farmacológicos, limitações e implicações.
- "conclusao": resposta objetiva à pergunta norteadora, sem citações [n], equilibrada e ancorada nos achados.
- "resumo": resumo estruturado (objetivo, métodos, resultados, conclusão) e abstract em inglês/espanhol.
- "titulo": título em português, inglês e espanhol.

Analise profundamente o parecer e determine com rigor:
1. O modo adequado: "cirurgico" (ajustes pontuais, alterando apenas parágrafos necessários) ou "amplo" (reestruturação global da seção).
2. Quais seções DEVEM ser alteradas para cumprir a devolutiva. Se uma seção não precisa de alteração, NÃO a inclua em "secoes_afetadas".
3. Para cada seção afetada, determine a ação específica e se a alteração incide em parágrafo pontual ou se requer reestruturação.

Responda SOMENTE com JSON:
{
  "modo": "cirurgico",
  "resumo_parecer": "Síntese dos principais pontos solicitados em 1 a 3 frases densas e objetivas",
  "secoes_afetadas": ["discussao"],
  "orientacoes": [
    {
      "secao": "discussao",
      "apontamento_orientador": "O que foi solicitado exatamente para esta seção",
      "acao_recomendada": "Ação cirúrgica precisa no trecho ou parágrafo relevante",
      "tipo_intervencao": "pontual_paragrafo",
      "mecanismos_clinicos": "Mecanismos ou unidades específicas a ajustar (se aplicável)",
      "confronto_evidencias": "Estudos ou dados a correlacionar no trecho (se aplicável)"
    }
  ],
  "recomendacoes_integridade": "Avisos sobre fontes, termos ou números a preservar rigorosamente"
}`;
}

export function promptRevisaoSecao({ secao, tituloSecao, textoAtual, orientacao, fontes = [], tema, pergunta, modo = 'cirurgico', contextoArtigo = null }) {
  const contextoBloco = contextoArtigo ? `
CONTEXTO INTEGRAL DO ARTIGO (use para manter perfeita coerência IMRaD):
${contextoArtigo.introducao ? `--- INTRODUÇÃO / OBJETIVO ---\n${contextoArtigo.introducao.slice(0, 1500)}\n` : ''}
${contextoArtigo.metodos ? `--- MÉTODOS RESUMIDOS ---\n${contextoArtigo.metodos.slice(0, 1200)}\n` : ''}
${contextoArtigo.resultados ? `--- ACHADOS DOS RESULTADOS ---\n${contextoArtigo.resultados.slice(0, 2200)}\n` : ''}
` : '';

  const diretrizesModo = modo === 'cirurgico' ? `
DIRETRIZES DO MODO CIRÚRGICO ESTRETO (PRESERVAÇÃO DO MANUSCRITO):
1. ATENDIMENTO CIRÚRGICO: Localize o trecho, parágrafo ou frase exata que demanda o ajuste solicitado pelo orientador/laudo e aplique a correção solicitada com rigor acadêmico.
2. PRESERVAÇÃO TOTAL DOS PARÁGRAFOS NÃO AFETADOS: Mantenha todos os outros parágrafos da seção EXATAMENTE COMO ESTÃO no texto original. NÃO reformule, NÃO resuma e NÃO reescreva frases que já estavam boas e que não foram criticadas.
3. INTEGRIDADE DAS CITAÇÕES [n]: Preserve 100% das citações em formato Vancouver [n] presentes no texto original. Nunca suprima citações do manuscrito original fora do trecho explicitamente alterado.
4. FIDELIDADE NUMÉRICA: Mantenha intactos todos os valores amostrais, p-valores e intervalos de confiança pré-existentes, alterando apenas dados que tenham sido expressamente apontados como incorretos.
` : `
DIRETRIZES DO MODO DE REESCRITA AMPLA:
1. Incorpore integralmente os apontamentos do orientador, garantindo profundidade analítica superior.
2. Se for a Discussão: CONFRONTE os estudos entre si, explique mecanismos biológicos, pondere desfechos duros vs substitutos e mantenha parágrafo transparente de limitações.
3. Mantenha os subtítulos temáticos (###) para organização lógica.
4. Mantenha todas as citações no formato Vancouver [n] alinhadas às fontes numeradas.
`;

  return `Reescreva a seção "${tituloSecao}" de um artigo científico de alto impacto aplicando as correções da devolutiva no MODO: ${modo.toUpperCase()}.

Tema da pesquisa: "${tema}"
Pergunta norteadora: "${pergunta}"

ORIENTAÇÕES ESPECÍFICAS DO ORIENTADOR / PARECERISTA:
"""
${orientacao}
"""
${contextoBloco}
TEXTO ATUAL DA SEÇÃO (base soberana do manuscrito):
"""
${textoAtual}
"""

FONTES CIENTÍFICAS DISPONÍVEIS E VERIFICADAS (use estas citações [n] quando referenciar evidências):
${fontes.slice(0, 40).map((f) => {
  const achadosRicos = f.achados || f.resumo?.slice(0, 450) || '';
  return `[${f.n}] ${f.autorCurto || f.titulo} (${f.ano || ''}) — ${achadosRicos}`;
}).join('\n')}

${diretrizesModo}

Devolva o texto da seção completa em Markdown (com subtítulos internos ### se existirem), garantindo que no modo cirúrgico os parágrafos não solicitados permaneçam idênticos ao original.

Responda SOMENTE com JSON:
{
  "novo_texto": "Texto da seção em Markdown com as correções incorporadas",
  "resumo_mudancas": "Síntese acadêmica neutra das intervenções realizadas (ex: 'Ajustada a notação da PCR no terceiro parágrafo da discussão conforme apontado pelo orientador, preservando integralmente o corpo do manuscrito'). NUNCA mencione IA, prompt ou máquina.",
  "detalhes": [
    {
      "pedido_orientador": "O que foi pedido",
      "como_foi_atendido": "O que foi modificado cirurgicamente ou aprofundado"
    }
  ]
}`;
}

export function promptRevisaoFechamento({ tituloAtual, resumoAtual, abstractAtual, resumenAtual, conclusaoAtual, orientacao, tema, pergunta, objetivoNovo }) {
  return `Ajuste os elementos de fechamento (título, resumo estruturado, abstract, resumen e/ou conclusão) conforme a devolutiva do orientador.

Tema: "${tema}"
Pergunta: "${pergunta}"
${objetivoNovo ? `Novo objetivo definido na introdução: "${objetivoNovo}"` : ''}

ORIENTAÇÃO DO ORIENTADOR / PONTOS A CONSIDERAR:
"""
${orientacao}
"""

ELEMENTOS ATUAIS:
- Título atual: "${tituloAtual}"
- Resumo atual: ${JSON.stringify(resumoAtual)}
- Conclusão atual: """${conclusaoAtual}"""

Regras:
1. Resumo estruturado com no máximo 250 palavras (Objetivo, Métodos, Resultados, Conclusão).
2. Não use citações [n] no resumo nem na conclusão.
3. Se o orientador não pediu alteração no título, mantenha "alterou_titulo": false e os mesmos títulos.
4. Se o orientador não pediu alteração na conclusão, mantenha "alterou_conclusao": false e a mesma conclusão.
5. Traduza fielmente para o Abstract (inglês) e Resumen (espanhol) se o resumo ou conclusão mudar.

Responda SOMENTE com JSON:
{
  "alterou_titulo": false,
  "titulo": "${tituloAtual}",
  "titulo_en": "",
  "titulo_es": "",
  "alterou_resumo": true,
  "resumo": {"objetivo": "", "metodos": "", "resultados": "", "conclusao": ""},
  "abstract": {"objective": "", "methods": "", "results": "", "conclusion": ""},
  "resumen": {"objetivo": "", "metodos": "", "resultados": "", "conclusion": ""},
  "alterou_conclusao": true,
  "conclusao": "Texto da conclusão em Markdown",
  "resumo_mudancas": "Síntese das mudanças em título, resumo ou conclusão"
}`;
}

