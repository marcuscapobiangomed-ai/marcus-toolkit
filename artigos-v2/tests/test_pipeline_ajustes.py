"""Ajustes do pipeline: PRISMA 2020 verificado, MeSH validado, siglas, números no padrão brasileiro,
declaração de IA e preparação das referências."""

import json
import re

import pytest

from artigos_v2 import prompts, referencias
from artigos_v2.pipeline import (DECLARACAO_IA_BREVE, PMID_PRISMA_2020, SECOES, Pedido, Pipeline, _numeros,
                                 _problema_humanizacao, declaracao_ia, definir_siglas)


def _pipeline(ambiente):
    config, ledger, cliente, fake, pubmed, epmc = ambiente
    return Pipeline(config, ledger, cliente, pubmed=pubmed, europepmc=epmc, log=lambda *_: None)


def _espiar_prompts(fake) -> list[str]:
    vistos = []
    responder = fake.responder
    fake.responder = lambda p: (vistos.append(p), responder(p))[1]
    return vistos


def _estado(docx) -> dict:
    return json.loads((docx.parent / "estado.json").read_text(encoding="utf-8"))


# ------------------------------------------------ PRISMA 2020 como referência verificada

def test_prisma2020_registrado_citado_nos_metodos_e_numerado_em_ordem(ambiente):
    config, ledger, cliente, fake, *_ = ambiente
    vistos = _espiar_prompts(fake)
    docx = _pipeline(ambiente).gerar(Pedido(tema="x"))
    estado = _estado(docx)

    chave = estado["prisma2020"]
    assert estado["registros"][chave]["pmid"] == PMID_PRISMA_2020
    assert chave not in estado["contexto"]  # introdução e discussão não recebem a declaração
    metodos = next(p for p in vistos if "seção MÉTODOS" in p)
    assert "PRISMA 2020" in metodos and f"[{chave}]" in metodos
    assert not any(f"[{chave}]" in p for p in vistos if "Escreva a INTRODUÇÃO" in p or "Escreva a DISCUSSÃO" in p)

    art = estado["artigo"]
    numero = int(re.fullmatch(r"\{\{cite:(\d+)\}\}", art["prisma_citacao"]).group(1))
    assert art["referencias_chaves"][numero - 1] == chave
    assert "PRISMA 2020 statement" in art["referencias"][numero - 1]
    assert art["prisma_citacao"] in art["secoes"]["metodos"]

    # primeira aparição na ordem do documento: 1, 2, 3... sem saltos
    ordem = ([art["secoes"][s] for s in ("introducao", "metodos", "resultados")] + [art["prisma_citacao"]]
             + [s["citacao"] for s in art["sintese"]] + [art["secoes"][s] for s in ("discussao", "conclusao")])
    vistos_n = []
    for trecho in ordem:
        for grupo in re.findall(r"\{\{cite:([^}]*)\}\}", trecho):
            for parte in grupo.split(","):
                a, _, b = parte.partition("-")
                for n in range(int(a), int(b or a) + 1):
                    if n not in vistos_n:
                        vistos_n.append(n)
    assert vistos_n == list(range(1, len(art["referencias"]) + 1))


def test_prisma2020_indisponivel_gera_aviso_e_segue(ambiente):
    config, ledger, cliente, fake, pubmed, _ = ambiente
    pubmed.falhar_detalhes = {PMID_PRISMA_2020}
    vistos = _espiar_prompts(fake)
    docx = _pipeline(ambiente).gerar(Pedido(tema="x"))
    estado = _estado(docx)
    assert estado["prisma2020"] == "" and estado["artigo"]["prisma_citacao"] == ""
    assert "Sem citações." in next(p for p in vistos if "seção MÉTODOS" in p)
    avisos = [e["mensagem"] for e in ledger.eventos(docx.parent.name) if e["nivel"] == "aviso"]
    assert any("PRISMA 2020" in m for m in avisos)


# ------------------------------------------------ MeSH validado antes da busca

def test_descritor_mesh_inexistente_vira_texto_livre_e_sai_dos_metodos(ambiente):
    config, ledger, cliente, fake, pubmed, _ = ambiente
    pubmed.mesh_invalidos = ["Primary Health Care"]
    pipeline = _pipeline(ambiente)
    docx = pipeline.gerar(Pedido(tema="x"))
    estado = _estado(docx)

    assert estado["busca"]["mesh_invalidos"] == ["Primary Health Care"]
    assert all("Primary Health Care\"[MeSH Terms]" not in c for c in pubmed.consultas_contadas)
    estrategia = next(e["estrategia"] for e in estado["busca"]["estrategias"] if e["base"] == "PubMed")
    assert '"Primary Health Care"[tiab]' in estrategia and "Hypertension[MeSH Terms]" in estrategia
    fatos = pipeline._fatos_metodos(estado)
    assert fatos["descritores_mesh"] == ["Hypertension"]
    assert fatos["termos_em_texto_livre"] == ["Primary Health Care"]
    avisos = [e["mensagem"] for e in ledger.eventos(docx.parent.name) if e["nivel"] == "aviso"]
    assert any("Primary Health Care" in m and "MeSH" in m for m in avisos)


def test_mesh_valido_nao_muda_nada(ambiente):
    pipeline = _pipeline(ambiente)
    estado = _estado(pipeline.gerar(Pedido(tema="x")))
    assert estado["busca"]["mesh_invalidos"] == []
    fatos = pipeline._fatos_metodos(estado)
    assert fatos["descritores_mesh"] == ["Hypertension", "Primary Health Care"]
    assert "termos_em_texto_livre" not in fatos


# ------------------------------------------------ siglas por extenso na primeira ocorrência

def test_sigla_definida_so_na_primeira_ocorrencia_em_ordem_de_documento():
    textos, siglas = definir_siglas(["O cuidado nas UBS da APS [R1].", "A APS e as UBS {{cite:2}}."])
    assert textos == ["O cuidado nas Unidades Básicas de Saúde (UBS) da Atenção Primária à Saúde (APS) [R1].",
                      "A APS e as UBS {{cite:2}}."]
    assert sorted(siglas) == ["APS", "UBS"]


def test_sigla_ja_definida_e_idempotente():
    texto = ["A Atenção Primária à Saúde (APS) coordena o cuidado. A APS e o SUS."]
    uma_vez, siglas = definir_siglas(texto)
    assert uma_vez == ["A Atenção Primária à Saúde (APS) coordena o cuidado. A APS e o Sistema Único de Saúde (SUS)."]
    assert siglas == ["SUS"]
    assert definir_siglas(uma_vez) == (uma_vez, [])


def test_sigla_nunca_dentro_de_marcador_e_contexto_estatistico():
    textos, siglas = definir_siglas(["Busca com AND e OR [R3]. Chance maior (OR 2,3; IC 95% 1,1-4,5) {{cite:1,2}}."])
    assert textos == ["Busca com AND e OR [R3]. Chance maior (odds ratio (OR) 2,3; intervalo de confiança (IC) 95% "
                      "1,1-4,5) {{cite:1,2}}."]
    assert "[R3]" in textos[0] and "{{cite:1,2}}" in textos[0]


def test_sigla_em_inicio_de_frase_e_redundancia_posterior():
    textos, _ = definir_siglas(["HAS é frequente.", "A hipertensão arterial sistêmica (HAS) segue comum."])
    assert textos == ["Hipertensão arterial sistêmica (HAS) é frequente.", "A HAS segue comum."]


def test_montagem_define_siglas_no_corpo_e_no_resumo_separadamente(ambiente):
    config, ledger, *_ = ambiente
    docx = _pipeline(ambiente).gerar(Pedido(tema="x"))
    art = _estado(docx)["artigo"]
    corpo = "\n".join(art["secoes"][s] for s in SECOES)
    assert corpo.count("Unidades Básicas de Saúde (UBS)") == 1
    assert corpo.index("Unidades Básicas de Saúde (UBS)") < corpo.index(" UBS ")
    assert "Atenção Primária à Saúde (APS)" in art["resumo"]  # o resumo define as siglas por conta própria
    assert any("Siglas definidas" in e["mensagem"] for e in ledger.eventos(docx.parent.name))


def test_prompts_pedem_siglas_numeros_e_acentos():
    assert "colédoco, não coledoco" in prompts.SISTEMA
    protocolo = {"pergunta": "p", "objetivo": "o"}
    for mensagens in (prompts.introducao(protocolo, [], 1), prompts.metodos({}), prompts.resultados({}, []),
                      prompts.discussao(protocolo, [], [], 1), prompts.conclusao(protocolo, "d")):
        assert "forma por extenso seguida da sigla" in mensagens[1]["content"]
    for mensagens in (prompts.resultados({}, []), prompts.sintese(protocolo, []), prompts.discussao(protocolo, [], [], 1)):
        conteudo = mensagens[1]["content"]
        assert "vírgula decimal" in conteudo and "p < 0,001" in conteudo and "IC 95%" in conteudo


# ------------------------------------------------ números no padrão brasileiro (trava da humanização)

@pytest.mark.parametrize("a, b", [("1.054 pacientes", "1054 pacientes"), ("0,5", "0.5"), ("p < 0,001", "p < 0.001"),
                                  ("1.054,5", "1054.5"), ("10.000", "10000")])
def test_numeros_mesma_grandeza_em_grafias_diferentes(a, b):
    assert _numeros(a) == _numeros(b)


@pytest.mark.parametrize("a, b", [("1.054", "1.045"), ("1.054", "1,054"), ("0,5", "0,6"), ("0.125", "125"),
                                  ("340", "350"), ("OR 2,3", "OR 2,8")])
def test_numeros_valor_alterado_continua_detectado(a, b):
    assert _numeros(a) != _numeros(b)


def test_humanizacao_aceita_troca_de_grafia_e_bloqueia_troca_de_valor():
    original = "Foram incluídos 1054 participantes, com prevalência de 0.5 [R1]. Texto de apoio aqui."
    assert _problema_humanizacao(original, "Participaram 1.054 pessoas, com prevalência de 0,5 [R1]. Texto aqui.") is None
    assert "números" in _problema_humanizacao(original, "Participaram 1.045 pessoas, prevalência de 0,5 [R1]. Texto.")


# ------------------------------------------------ declaração de IA (contrato C1)

@pytest.mark.parametrize("valor, esperado", [("nenhuma", ""), ("", ""), ("breve", DECLARACAO_IA_BREVE),
                                              ("Usamos IA só para revisar a gramática.",
                                               "Usamos IA só para revisar a gramática.")])
def test_declaracao_ia(valor, esperado):
    assert declaracao_ia(valor) == esperado


def test_declaracao_ia_no_artigo(ambiente):
    pipeline = _pipeline(ambiente)
    padrao = _estado(pipeline.gerar(Pedido(tema="x")))["artigo"]
    assert padrao["declaracao_ia"] == ""
    assert not re.search(r"intelig[eê]ncia artificial|\bIA\b", json.dumps(padrao, ensure_ascii=False))
    breve = _estado(pipeline.gerar(Pedido(tema="x", declaracao_ia="breve")))["artigo"]
    assert breve["declaracao_ia"] == DECLARACAO_IA_BREVE and "os autores conduziram a análise" in breve["declaracao_ia"]


def test_pedido_antigo_sem_declaracao_carrega(ambiente):
    pipeline = _pipeline(ambiente)
    dados = {"pedido": {"tema": "x", "periodo": [2016, 2026]}}
    assert pipeline._pedido(dados).declaracao_ia == "nenhuma"


# ------------------------------------------------ preparação das referências (contrato C2)

def test_preparar_referencias_chamado_na_ordem_de_citacao(ambiente, monkeypatch):
    chamadas = []

    def preparar(registros, pubmed=None):
        chamadas.append(([r.titulo for r in registros], pubmed))
        return [type(r)(**{**r.para_dict(), "revista": "Revista Preparada"}) for r in registros]

    monkeypatch.setattr(referencias, "preparar_referencias", preparar, raising=False)
    config, ledger, cliente, fake, pubmed, _ = ambiente
    art = _estado(_pipeline(ambiente).gerar(Pedido(tema="x")))["artigo"]
    (titulos, recebido), = chamadas
    assert recebido is pubmed and len(titulos) == len(art["referencias"])
    assert all("Revista Preparada" in r for r in art["referencias"])
    numero = int(re.search(r"\d+", art["prisma_citacao"]).group())
    assert "PRISMA 2020" in titulos[numero - 1]


def test_preparar_referencias_com_falha_mantem_originais(ambiente, monkeypatch):
    def preparar(registros, pubmed=None):
        raise RuntimeError("rede fora")

    monkeypatch.setattr(referencias, "preparar_referencias", preparar, raising=False)
    config, ledger, *_ = ambiente
    docx = _pipeline(ambiente).gerar(Pedido(tema="x"))
    assert "Rev Saude Publica" in _estado(docx)["artigo"]["referencias"][0]
    assert any("Preparação das referências falhou" in e["mensagem"] for e in ledger.eventos(docx.parent.name))
