import json
import re

import pytest
from docx import Document

from artigos_v2.pipeline import ETAPAS, Pedido, Pipeline, _problema_humanizacao


def _pipeline(ambiente):
    config, ledger, cliente, fake, pubmed, epmc = ambiente
    return Pipeline(config, ledger, cliente, pubmed=pubmed, europepmc=epmc, log=lambda *_: None)


def test_pipeline_completo_gera_docx_e_registra_custos(ambiente):
    config, ledger, *_ = ambiente
    pipeline = _pipeline(ambiente)
    docx = pipeline.gerar(Pedido(tema="Hipertensão na APS", autores=["Aluno A"], orientador="Prof. B",
                                 periodo=(2016, 2026)))

    assert docx.exists() and docx.suffix == ".docx"
    artigo = ledger.artigos()[0]
    assert artigo["status"] == "concluido" and artigo["docx_path"] == str(docx)
    assert artigo["custo_api_usd"] > 0 and artigo["chamadas"] > 10

    estado = json.loads((docx.parent / "estado.json").read_text(encoding="utf-8"))
    assert estado["concluidas"] == ETAPAS
    p = estado["prisma"]
    assert p["por_base"] == {"PubMed": 40, "Europe PMC": 15}
    assert p["identificados"] - p["duplicatas"] == p["triados"] == 50
    assert p["triados"] - p["excluidos_triagem"] == p["avaliados_elegibilidade"]
    assert p["avaliados_elegibilidade"] - p["excluidos_elegibilidade"] == p["incluidos"]
    assert sum(p["motivos_triagem"].values()) == p["excluidos_triagem"]

    art = estado["artigo"]
    assert len(art["referencias"]) >= 25
    assert art["citacoes_bloqueadas"] == []
    assert len(art["sintese"]) == p["incluidos"]
    # todas as citações do texto viraram números válidos
    for texto in art["secoes"].values():
        assert not re.search(r"\[R\d+", texto)
        for grupo in re.findall(r"\{\{cite:([^}]*)\}\}", texto):
            for n in re.findall(r"\d+", grupo):
                assert 1 <= int(n) <= len(art["referencias"])

    doc = Document(str(docx))
    titulos = [par.text for par in doc.paragraphs if par.style.name.startswith("Heading")]
    assert titulos[:2] == ["RESUMO", "ABSTRACT"]
    assert "1 INTRODUÇÃO" in titulos and "5 CONCLUSÃO" in titulos and titulos[-1] == "REFERÊNCIAS"
    assert len(doc.tables) == 3  # Quadro 1 (estratégias), Figura 1 (PRISMA), Quadro 2 (síntese)
    assert any(run.font.superscript for par in doc.paragraphs for run in par.runs)
    textos = "\n".join(par.text for par in doc.paragraphs)
    assert "Orientador(a): Prof. B" in textos and "Quadro 2 – Síntese" in textos
    assert (docx.parent / "triagem.csv").exists() and (docx.parent / "artigo.md").exists()


def test_falha_no_meio_marca_erro_e_retomar_nao_refaz_etapas(ambiente):
    config, ledger, cliente, fake, *_ = ambiente
    pipeline = _pipeline(ambiente)
    artigo_id = pipeline.iniciar(Pedido(tema="Hipertensão na APS"))
    fake.explodir_em = "Escreva a DISCUSSÃO"
    with pytest.raises(Exception):
        pipeline.executar(artigo_id)
    artigo = ledger.artigo(artigo_id)
    assert artigo["status"] == "erro" and artigo["etapa_atual"] == "discussao"

    antes = len(fake.chamadas)
    fake.explodir_em = None
    docx = pipeline.executar(artigo_id)
    assert docx.exists() and ledger.artigo(artigo_id)["status"] == "concluido"
    refeitas = [c["prompt"] for c in fake.chamadas[antes:]]
    assert not any("Alinhar escopo" in p or "Triagem por TÍTULO" in p for p in refeitas)


def test_busca_refina_consulta_quando_passa_do_maximo(ambiente):
    config, ledger, cliente, fake, pubmed, epmc = ambiente
    pubmed.total = 900
    pipeline = _pipeline(ambiente)
    artigo_id = pipeline.iniciar(Pedido(tema="x", max_registros=300))
    with pytest.raises(ValueError, match="mesmo após 3 refinamentos"):
        pipeline.executar(artigo_id)
    etapas = [c["etapa"] for c in ledger.chamadas(artigo_id)]
    assert etapas.count("busca_refinamento") == 3


def test_filtros_de_data_e_idioma_entram_na_estrategia(ambiente):
    pipeline = _pipeline(ambiente)
    pedido = Pedido(tema="x", periodo=(2016, 2026), idiomas=["en", "pt"])
    assert pipeline._filtros(pedido, "pubmed", "q") == (
        '(q) AND ("2016/01/01"[dp] : "2026/12/31"[dp]) AND (english[la] OR portuguese[la]) '
        'NOT (editorial[pt] OR letter[pt] OR comment[pt])')
    assert pipeline._filtros(pedido, "europepmc", "q") == (
        '(q) AND (PUB_YEAR:[2016 TO 2026]) AND (LANG:"eng" OR LANG:"por") NOT (SRC:"PPR")')


@pytest.mark.parametrize("novo, problema", [
    ("Em 12 estudos com 340 pacientes o efeito apareceu [R1, R2]. Texto reescrito com calma.", None),
    ("Em 12 estudos com 350 pacientes o efeito apareceu [R1, R2]. Texto reescrito com calma.", "números"),
    ("Em 12 estudos com 340 pacientes o efeito apareceu [R1]. Texto reescrito com calma aqui.", "citações"),
    ("Curto.", "encurtado"),
])
def test_humanizacao_nao_pode_mudar_dados(novo, problema):
    original = "Em 12 estudos com 340 pacientes, o efeito foi observado [R1, R2]. Além disso, texto."
    resultado = _problema_humanizacao(original, novo)
    assert (resultado is None) if problema is None else (problema in resultado)


def test_humanizacao_rejeitada_mantem_texto_original(ambiente):
    config, ledger, cliente, fake, *_ = ambiente
    pipeline = _pipeline(ambiente)
    original_responder = fake.responder

    def responder(prompt):
        if "da seção DISCUSSAO" in prompt:
            return prompt.split("Texto:\n", 1)[1].replace("[R", "[R9") + " 999"
        return original_responder(prompt)

    fake.responder = responder
    docx = pipeline.gerar(Pedido(tema="x"))
    estado = json.loads((docx.parent / "estado.json").read_text(encoding="utf-8"))
    assert estado["humanizacao"]["discussao"] == "rejeitada"
    assert estado["humanizacao"]["introducao"] == "aplicada"
    assert estado["secoes"]["discussao"] == estado["secoes_originais"]["discussao"]
