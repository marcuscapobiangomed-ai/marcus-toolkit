"""Integração entre as frentes: o .docx novo (milhar, declaração de IA, Markdown escapado) lido pela auditoria,
e o artigo completo do pipeline passando nas checagens novas."""

import json

from docx import Document
from test_docx_ajustes import ESTRATEGIA, _artigo

from artigos_v2.auditoria.leitor import ler
from artigos_v2.auditoria.runner import auditar
from artigos_v2.auditoria.skills import _n_reportado, _numeros_prisma
from artigos_v2.docx_export import exportar_docx, exportar_markdown
from artigos_v2.pipeline import Pedido, Pipeline


def _item(rel, skill, trecho):
    s = next(s for s in rel["skills"] if s["id"] == skill)
    return next(i for i in s["itens"] if trecho in i["criterio"])


def test_auditoria_le_contagens_com_separador_de_milhar(tmp_path):
    docx = exportar_docx(_artigo(), tmp_path / "artigo.docx")
    artigo = ler(docx)
    assert _n_reportado(artigo, r"pub\s?med") == 1054
    n = _numeros_prisma(artigo)
    assert (n["identificados"], n["duplicatas"], n["triados"], n["incluidos"]) == (35979, 979, 35000, 2)
    assert _item(auditar(docx, offline=True), "resultados", "fecham entre as etapas")["status"] == "ok"


def test_declaracao_de_ia_fica_fora_da_conclusao(tmp_path):
    docx = exportar_docx(_artigo(declaracao_ia="Ferramentas de IA apoiaram a busca."), tmp_path / "artigo.docx")
    artigo = ler(docx)
    assert artigo.secoes["declaracao"] == ["Ferramentas de IA apoiaram a busca."]
    assert "Ferramentas de IA" not in artigo.texto("conclusao") and "Ferramentas de IA" not in artigo.corpo


def test_markdown_exportado_volta_literal_na_auditoria(tmp_path):
    md = exportar_markdown(_artigo(), tmp_path / "artigo.md")
    estrategias = [linha for t in ler(md).tabelas for linha in t.linhas if linha and linha[0] == "PubMed"]
    assert estrategias and ESTRATEGIA in estrategias[0]


def test_artigo_do_pipeline_passa_nas_checagens_novas(ambiente):
    config, ledger, cliente, fake, pubmed, epmc = ambiente
    pipeline = Pipeline(config, ledger, cliente, pubmed=pubmed, europepmc=epmc, log=lambda *_: None)
    docx = pipeline.gerar(Pedido(tema="Hipertensão na APS", contribuicao_autores={
        "triagem": "dois autores, de forma independente"}))
    estado = json.loads((docx.parent / "estado.json").read_text(encoding="utf-8"))
    artigo = estado["artigo"]

    # PRISMA 2020 veio do PubMed (fake), está nas referências e na fonte da figura com o número certo
    n = int(artigo["prisma_citacao"].removeprefix("{{cite:").removesuffix("}}"))
    assert "PRISMA 2020" in artigo["referencias"][n - 1]
    textos = "\n".join(p.text for p in Document(str(docx)).paragraphs)
    assert "adaptado de Page et al." in textos

    rel = auditar(docx, offline=True)
    assert _item(rel, "resultados", "Modelo PRISMA 2020 citado")["status"] == "ok"
    assert _item(rel, "introducao", "Siglas definidas")["status"] == "ok", _item(rel, "introducao", "Siglas")
    assert _item(rel, "resultados", "Números no padrão brasileiro")["status"] == "ok"
    assert _item(rel, "resultados", "fecham entre as etapas")["status"] == "ok"
    assert _item(rel, "referencias", "Toda citação no texto tem referência")["status"] == "ok"
    assert _item(rel, "referencias", "Toda referência é citada")["status"] == "ok"
    assert _item(rel, "referencias", "Sem pontuação duplicada")["status"] == "ok"
    assert "declaracao" not in ler(docx).secoes  # padrão: nenhuma menção a IA


def test_suplemento_do_pubmed_formatado_e_auditado():
    from artigos_v2.auditoria.skills import _fasciculo_malformado
    from artigos_v2.bases import Registro
    from artigos_v2.referencias import abnt, normalizar_volume_numero, vancouver

    # PubMed devolve Volume "21Suppl 02" e Issue "Suppl 02" (PMID 30726353)
    assert normalizar_volume_numero("21Suppl 02", "Suppl 02") == ("21", "Suppl 2")
    assert normalizar_volume_numero("21 Suppl 1", "") == ("21", "Suppl 1")
    assert normalizar_volume_numero("54", "3") == ("54", "3")
    r = Registro(base="PubMed", id_base="30726353", titulo="Cardiometabolic diseases", autores=["Ferreira SRG"],
                 revista="Rev Bras Epidemiol", ano="2019", volume="21Suppl 02", numero="Suppl 02",
                 paginas="e180008", doi="10.1590/1980-549720180008.supl.2")
    assert "2019;21(Suppl 2):e180008." in vancouver(r)
    assert "v. 21, n. Suppl 2" in abnt(r)
    assert _fasciculo_malformado("Rev. 2019;21Suppl 02(Suppl 02):e180008.") == "21Suppl 02(Suppl 02)"
    assert _fasciculo_malformado(vancouver(r)) == ""


def test_crossref_completa_e_locator_sem_ir_a_rede():
    from artigos_v2.bases import Registro
    from artigos_v2.referencias import preparar_referencias

    class PubMedComCrossref:
        chamadas = []

        def localizador_crossref(self, doi):
            self.chamadas.append(doi)
            return {"10.1/a": "e180008", "10.1/b": ""}[doi]

    base = dict(base="Europe PMC", id_base="x", titulo="T", autores=["A B"], revista="Rev", ano="2020", volume="1")
    com_pagina = Registro(**base, doi="10.1/c", paginas="10-20")
    sem_pagina = Registro(**base, doi="10.1/a")
    sem_nada = Registro(**base, doi="10.1/b")
    fake = PubMedComCrossref()
    saida = preparar_referencias([com_pagina, sem_pagina, sem_nada], pubmed=fake)
    assert [r.paginas for r in saida] == ["10-20", "e180008", ""]
    assert fake.chamadas == ["10.1/a", "10.1/b"]  # quem já tem página não consulta
