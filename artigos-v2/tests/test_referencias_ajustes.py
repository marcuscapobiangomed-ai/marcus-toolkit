"""Ajustes de referências e bases: C2 (preparar_referencias), C3 (MeSH), C4 (campos novos),
higiene de pontuação dos formatadores e autores do RIS. Tudo offline (HTTP falso)."""

import json
import re
import urllib.parse
import xml.etree.ElementTree as ET

import pytest

from artigos_v2 import bases
from artigos_v2.bases import EuropePMC, PubMed, Registro, importar_ris
from artigos_v2.referencias import abnt, normalizar_paginas, normalizar_url, preparar_referencias, vancouver


@pytest.fixture(autouse=True)
def sem_rede(monkeypatch):
    """Nenhum teste daqui toca a rede: _get falso responde conforme a URL."""
    bases._CACHE_NLM.clear()
    monkeypatch.setattr(PubMed, "_respeitar_limite", lambda self: None)
    chamadas = []

    def falso(url, timeout=60):
        chamadas.append(url)
        raise AssertionError(f"rede não simulada: {url}")

    monkeypatch.setattr(bases, "_get", falso)
    return chamadas


def _servidor(monkeypatch, responder):
    """Troca _get por `responder(caminho, params)` e devolve a lista de chamadas."""
    chamadas = []

    def falso(url, timeout=60):
        caminho, _, consulta = url.partition("?")
        params = dict(urllib.parse.parse_qsl(consulta))
        chamadas.append((caminho.rsplit("/", 1)[-1], params))
        resposta = responder(caminho.rsplit("/", 1)[-1], params)
        if isinstance(resposta, Exception):
            raise resposta
        return resposta if isinstance(resposta, bytes) else json.dumps(resposta).encode()

    monkeypatch.setattr(bases, "_get", falso)
    return chamadas


def _reg(**kw):
    dados = dict(base="LILACS", id_base="L1", titulo="Hipertensão na atenção primária", autores=["Silva AB"],
                 revista="Rev Saude Publica", ano="2021", volume="55", numero="2", paginas="10-20")
    dados.update(kw)
    return Registro(**dados)


# ------------------------------------------------------------------- C4 Registro

def test_de_dict_estado_antigo_sem_campos_novos():
    antigo = {"base": "PubMed", "id_base": "1", "titulo": "T", "autores": ["Silva A"], "revista": "J",
              "ano": "2020", "volume": "", "numero": "", "paginas": "", "doi": "", "pmid": "1", "resumo": "",
              "tipos": [], "idioma": ""}
    r = Registro.de_dict(antigo)
    assert (r.issn, r.url, r.acesso) == ("", "", "")
    assert Registro.de_dict({**r.para_dict(), "campo_futuro": 1}) == r
    assert {"issn", "url", "acesso"} <= set(r.para_dict())


def test_issn_pubmed_prefere_impresso():
    xml = ("<PubmedArticle><MedlineCitation><PMID>9</PMID><Article><Journal>"
           "<ISSN IssnType='Electronic'>1678-4464</ISSN><ISSN IssnType='Print'>0102-311x</ISSN>"
           "<JournalIssue><PubDate><Year>2020</Year></PubDate></JournalIssue></Journal>"
           "<ArticleTitle>T.</ArticleTitle></Article><MedlineJournalInfo><MedlineTA>Cad Saude Publica</MedlineTA>"
           "</MedlineJournalInfo></MedlineCitation></PubmedArticle>")
    assert PubMed._parse(ET.fromstring(xml)).issn == "0102-311X"
    so_eletronico = xml.replace("<ISSN IssnType='Print'>0102-311x</ISSN>", "")
    assert PubMed._parse(ET.fromstring(so_eletronico)).issn == "1678-4464"


def test_issn_europepmc():
    base = {"id": "1", "source": "MED", "title": "T", "journalInfo": {"journal": {"title": "J", "essn": "1678-4464"}}}
    assert EuropePMC._parse(base).issn == "1678-4464"
    base["journalInfo"]["journal"]["issn"] = "0102-311X"
    assert EuropePMC._parse(base).issn == "0102-311X"


def test_ris_issn_url_e_doi_no_ur(tmp_path):
    ris = tmp_path / "scielo.ris"
    ris.write_text("TY  - JOUR\nAU  - Lima, Carlos\nTI  - A\nSN  - 0102-311X; 1678-4464\n"
                   "UR  - https://doi.org/10.1590/abc\nUR  - https://www.scielo.br/j/csp/a/xyz\nER  - \n"
                   "TY  - JOUR\nTI  - B\nSN  - 1809-5909 (Print)\nUR  - http://www.scielo.br/j/x\nER  - \n",
                   encoding="utf-8")
    a, b = importar_ris(ris, "SciELO")
    assert (a.issn, a.doi, a.url) == ("0102-311X", "10.1590/abc", "https://www.scielo.br/j/csp/a/xyz")
    assert (b.issn, b.doi, b.url) == ("1809-5909", "", "http://www.scielo.br/j/x")


# ----------------------------------------------------------------- autores RIS

@pytest.mark.parametrize("nome, esperado", [
    ("Silva, Maria de Fátima", "Silva MF"),
    ("Altamirano, E", "Altamirano E"),
    ("Altamirano, E.", "Altamirano E"),
    ("Souza, José Eduardo", "Souza JE"),
    ("Oliveira-Silva, Ana", "Oliveira-Silva A"),
    ("Costa, Ana dos Santos e Silva", "Costa ASS"),
    ("Lima, J. E.", "Lima JE"),
    ("Silva, MF", "Silva MF"),
    ("SILVA, ANA BEATRIZ", "SILVA AB"),
    ("Grupo de Estudos em APS", "Grupo de Estudos em APS"),
])
def test_autores_ris(tmp_path, nome, esperado):
    ris = tmp_path / "a.ris"
    ris.write_text(f"TY  - JOUR\nAU  - {nome}\nTI  - T\nER  - \n", encoding="utf-8")
    assert importar_ris(ris, "LILACS")[0].autores == [esperado]


# ------------------------------------------------------------- normalizações

@pytest.mark.parametrize("bruto, esperado", [
    ("pp. 45-50", "45-50"), ("p. p. 45", "45"), ("P. 12", "12"), ("pages 3-9", "3-9"),
    ("e20230045", "e20230045"), ("e20230045-e20230045", "e20230045"), ("113384", "113384"),
    ("45–50", "45-50"), ("S0102-311X2020000305001", ""), ("", ""),
])
def test_normalizar_paginas(bruto, esperado):
    assert normalizar_paginas(bruto) == esperado


def test_normalizar_url():
    assert normalizar_url("https://www.scielo.br//j/csp//a/x.") == "https://www.scielo.br/j/csp/a/x"
    assert normalizar_url(" http://a.org/b ") == "http://a.org/b"


# -------------------------------------------------------- higiene dos formatos

PROIBIDOS = ["..", ".?", "?.", "!.", ".!", ", .", ",.", ",,", ";;", " .", " ,", " ;", "p. p.", ";.", ":."]

DIFICEIS = [
    _reg(titulo="Is primary care effective?", revista="Rev. Saude Publica."),
    _reg(titulo="What works!", autores=["Silva A.", "Souza B."], doi="10.1590/x."),
    _reg(titulo="Title with final period.. ", paginas="pp. 45-50", revista="J. Bras. Nefrol.", doi="doi:10.1/a"),
    _reg(titulo="  Espaços   demais .", autores=[f"Autor{i} A" for i in range(9)], paginas="p. p. e20230045"),
    _reg(titulo="Sem revista", revista="", volume="", numero="", paginas="", ano="2020",
         url="https://www.scielo.br//j/x//a/1", acesso="26 set 2026"),
    _reg(titulo="Só URL sem acesso", doi="", url="http://www.scielo.br/x", paginas="", numero=""),
    _reg(titulo="Coletivo", autores=["Grupo Brasil de Hipertensão."], volume="", numero="3", paginas="1-9"),
    _reg(titulo="[Hypertension in Brazil].", pmid="123", doi=""),
    _reg(titulo="Por quê?.", autores=[], revista="Cad Saude Publica", volume="", numero="", paginas="",
         doi="https://doi.org/10.1590/0102-311X00056020"),
    _reg(titulo="Título, com vírgula,", autores=["Silva AB,"], revista="Rev Bras Enferm;", paginas="10-"),
]


@pytest.mark.parametrize("formatar", [vancouver, abnt])
@pytest.mark.parametrize("registro", DIFICEIS)
def test_sem_pontuacao_duplicada(formatar, registro):
    ref = formatar(registro)
    # o identificador (DOI/URL) é literal; o resto não pode ter pontuação dobrada
    corpo = re.split(r" (?:doi:|DOI: |Disponível em: |PMID: )", ref)[0]
    for ruim in PROIBIDOS:
        assert ruim not in corpo, (ruim, ref)
    assert not ref.endswith("..") and "doi:doi" not in ref.lower()


def test_vancouver_titulo_interrogacao_e_revista_sem_ponto():
    ref = vancouver(_reg(titulo="Is primary care effective?", revista="Rev. Saude Publica.", doi="10.1/x."))
    assert "Is primary care effective? Rev Saude Publica. 2021;55(2):10-20. doi:10.1/x" == ref.split("Silva AB. ")[1]


def test_vancouver_url_quando_sem_doi_e_pmid():
    com = vancouver(_reg(url="https://www.scielo.br//j/a", acesso="26 set 2026"))
    assert com.endswith("2021;55(2):10-20. Disponível em: https://www.scielo.br/j/a [citado em 26 set 2026].")
    sem = vancouver(_reg(url="https://www.scielo.br/j/a"))
    assert sem.endswith("Disponível em: https://www.scielo.br/j/a.") and "citado" not in sem
    assert "Disponível" not in vancouver(_reg(url="https://x.org/a", pmid="99"))


def test_vancouver_et_al_e_elocator():
    ref = vancouver(_reg(autores=[f"A{i} B." for i in range(8)], paginas="pp. e20230045", numero=""))
    assert ref.startswith("A0 B, A1 B, A2 B, A3 B, A4 B, A5 B, et al. ") and "2021;55:e20230045." in ref


def test_abnt_url_acesso_e_elocator():
    ref = abnt(_reg(autores=["Silva AB", "Grupo Brasil"], paginas="e20230045", url="http://a.org//b",
                    acesso="26 set. 2026"))
    assert ref.startswith("SILVA, A. B.; GRUPO BRASIL. Hipertensão na atenção primária. Rev Saude Publica, v. 55,")
    assert "n. 2, e20230045, 2021. Disponível em: http://a.org/b. Acesso em: 26 set. 2026." in ref
    assert abnt(_reg(doi="10.1/x", url="http://a.org/b")).endswith("2021. DOI: https://doi.org/10.1/x.")


# ------------------------------------------------------------- C2 preparação

class PubMedFalso:
    def __init__(self, canonicos=(), abreviaturas=None, falhar=False):
        self.canonicos = {c.pmid: c for c in canonicos}
        self.abreviaturas = abreviaturas or {}
        self.falhar = falhar
        self.pedidos_detalhes, self.pedidos_issn = [], []

    def detalhes(self, pmids):
        self.pedidos_detalhes.append(list(pmids))
        if self.falhar:
            raise RuntimeError("Falha ao acessar efetch")
        return [self.canonicos[p] for p in pmids if p in self.canonicos]

    def abreviatura_nlm(self, issn):
        self.pedidos_issn.append(issn)
        if self.falhar:
            raise RuntimeError("Falha ao acessar esearch")
        return self.abreviaturas.get(issn, "")


def test_preparar_usa_pubmed_canonico_mantendo_base():
    canonico = _reg(base="PubMed", id_base="777", pmid="777", titulo="Canonical title",
                    revista="Cad Saude Publica", doi="10.1590/ABC", issn="0102-311X", resumo="")
    original = _reg(base="Europe PMC", id_base="MED:777", pmid="777", titulo="titulo europeu",
                    revista="Cadernos de saude publica", doi="10.1590/abc", resumo="resumo original")
    pm = PubMedFalso([canonico])
    [novo] = preparar_referencias([original], pm)
    assert (novo.base, novo.id_base, novo.titulo, novo.revista) == ("Europe PMC", "MED:777", "Canonical title",
                                                                    "Cad Saude Publica")
    assert novo.resumo == "resumo original" and novo is not original
    assert original.titulo == "titulo europeu"  # entrada intacta
    assert pm.pedidos_detalhes == [["777"]] and pm.pedidos_issn == []


def test_preparar_ignora_canonico_com_doi_divergente():
    canonico = _reg(base="PubMed", pmid="5", titulo="Outro artigo", doi="10.1/outro")
    original = _reg(base="Europe PMC", pmid="5", doi="10.1/meu", revista="Rev. Saude Publica")
    [novo] = preparar_referencias([original], PubMedFalso([canonico]))
    assert novo.titulo == original.titulo and novo.revista == "Rev Saude Publica"


def test_preparar_issn_no_catalogo_nlm_e_fallback_sem_pontos():
    registros = [_reg(revista="Cadernos de Saúde Pública", issn="0102311x"),
                 _reg(revista="Saúde debate.", issn="0103-1104"),
                 _reg(revista="J.  Bras. Nefrol.")]
    pm = PubMedFalso(abreviaturas={"0102311x": "Cad Saude Publica"})
    a, b, c = preparar_referencias(registros, pm)
    assert (a.revista, a.issn) == ("Cad Saude Publica", "0102-311X")
    assert b.revista == "Saúde debate"
    assert c.revista == "J Bras Nefrol"
    assert pm.pedidos_detalhes == []  # nenhum registro de outra base tinha PMID


def test_preparar_paginas_url_doi():
    [r] = preparar_referencias([_reg(paginas="p. p. e2023-e2023", url="https://doi.org/10.1590/x", doi="",
                                     pmid="")], PubMedFalso())
    assert (r.paginas, r.doi, r.url) == ("e2023", "10.1590/x", "")
    [r] = preparar_referencias([_reg(url="https://www.scielo.br//j/a//b", doi="doi: 10.1/y.")], PubMedFalso())
    assert (r.url, r.doi) == ("https://www.scielo.br/j/a/b", "10.1/y")


def test_preparar_nunca_levanta_e_para_de_consultar_sem_rede():
    registros = [_reg(base="Europe PMC", pmid="1", revista="Rev. X"), _reg(issn="0102-311X"), _reg(issn="0034-8910")]
    pm = PubMedFalso(falhar=True)
    saida = preparar_referencias(registros, pm)
    assert [r.titulo for r in saida] == [r.titulo for r in registros]
    assert saida[0].revista == "Rev X"
    assert pm.pedidos_issn == []  # a falha do efetch desliga as consultas seguintes

    class Quebrado:
        def detalhes(self, pmids):
            return [None]  # resposta inesperada

    assert len(preparar_referencias(registros, Quebrado())) == 3


def test_preparar_registros_pubmed_nao_consultam_rede():
    pm = PubMedFalso()
    [r] = preparar_referencias([_reg(base="PubMed", pmid="10", issn="0102-311X", revista="Cad Saude Publica")], pm)
    assert r.revista == "Cad Saude Publica" and pm.pedidos_detalhes == [] and pm.pedidos_issn == []


def test_abreviatura_nlm_http_e_cache(monkeypatch):
    def responder(caminho, params):
        assert params["db"] == "nlmcatalog"
        if caminho == "esearch.fcgi":
            assert params["term"] == '"0102-311X"[ISSN]'
            return {"esearchresult": {"idlist": ["1", "8901573"]}}
        return {"result": {"1": {"medlineta": "", "currentindexingstatus": "N"},
                           "8901573": {"medlineta": "Cad Saude Publica", "currentindexingstatus": "Y"}}}

    chamadas = _servidor(monkeypatch, responder)
    pm = PubMed()
    assert pm.abreviatura_nlm("0102-311x") == "Cad Saude Publica"
    assert pm.abreviatura_nlm("0102311X") == "Cad Saude Publica"
    assert len(chamadas) == 2  # a segunda veio do cache
    assert pm.abreviatura_nlm("sem issn") == ""


# ------------------------------------------------------------------ C3 MeSH

VALIDOS = {"hypertension": ["Hypertension", "Blood Pressure, High"],
           "primary health care": ["Primary Health Care", "Care, Primary Health"],
           "heart attack": ["Myocardial Infarction", "Heart Attack"],
           "diabetes mellitus, type 2": ["Diabetes Mellitus, Type 2"]}


def _mesh_falso(monkeypatch):
    ids = {termo: f"68{i:06d}" for i, termo in enumerate(VALIDOS)}

    def responder(caminho, params):
        assert params["db"] == "mesh"
        if caminho == "esearch.fcgi":
            termo = re.fullmatch(r'"(.+)"\[MH\]', params["term"]).group(1)
            return {"esearchresult": {"idlist": [ids[termo]] if termo in ids else []}}
        return {"result": {i: {"ds_meshterms": VALIDOS[t]} for t, i in ids.items() if i in params["id"].split(",")}}

    return _servidor(monkeypatch, responder)


def test_mesh_troca_inexistente_por_tiab(monkeypatch):
    _mesh_falso(monkeypatch)
    consulta = ('(Hypertension[MeSH Terms] OR hypertension[tiab]) AND ("Primary Health Care"[MeSH Terms] '
                'OR "primary care"[tiab]) AND "Predictive Factors"[MeSH Terms]')
    corrigida, invalidos = PubMed().validar_descritores_mesh(consulta)
    assert invalidos == ["Predictive Factors"]
    assert corrigida == consulta.replace('"Predictive Factors"[MeSH Terms]', '"Predictive Factors"[tiab]')


@pytest.mark.parametrize("trecho, esperado", [
    ('"Predictive Factors"[mh]', '"Predictive Factors"[tiab]'),
    ('Predictive Factors[MeSH]', '"Predictive Factors"[tiab]'),
    ('"predictive factors"[MAJR]', '"predictive factors"[tiab]'),
    ('"Predictive Factors"[MeSH Major Topic]', '"Predictive Factors"[tiab]'),
    ('"Predictive Factors" [mesh terms:noexp]', '"Predictive Factors"[tiab]'),
    ('"Predictive Factors/therapy"[mh]', '"Predictive Factors"[tiab]'),
    ('hypertension[MESH TERMS]', 'hypertension[MESH TERMS]'),
    ('"Hypertension/therapy"[majr:noexp]', '"Hypertension/therapy"[majr:noexp]'),
    ('"Diabetes Mellitus, Type 2"[mh]', '"Diabetes Mellitus, Type 2"[mh]'),
    ('"heart attack"[Mesh]', '"Myocardial Infarction"[Mesh]'),
    ('predictive factors[tiab]', 'predictive factors[tiab]'),
])
def test_mesh_variantes_de_etiqueta(monkeypatch, trecho, esperado):
    _mesh_falso(monkeypatch)
    corrigida, invalidos = PubMed().validar_descritores_mesh(f"Brazil[tiab] AND {trecho} AND adult")
    assert corrigida == f"Brazil[tiab] AND {esperado} AND adult"
    assert bool(invalidos) == ("predictive" in trecho.lower() and "[tiab]" not in trecho)


def test_mesh_sem_aspas_nao_engole_operadores(monkeypatch):
    _mesh_falso(monkeypatch)
    corrigida, invalidos = PubMed().validar_descritores_mesh(
        "brazil AND predictive factors[mh] OR (primary health care[mh] and hypertension)")
    assert corrigida == 'brazil AND "predictive factors"[tiab] OR (primary health care[mh] and hypertension)'
    assert invalidos == ["predictive factors"]


def test_mesh_cache_e_termos_repetidos(monkeypatch):
    chamadas = _mesh_falso(monkeypatch)
    pm = PubMed()
    consulta = '"Predictive Factors"[mh] OR "predictive factors"[MeSH Terms] OR Hypertension[mh]'
    corrigida, invalidos = pm.validar_descritores_mesh(consulta)
    assert invalidos == ["Predictive Factors"] and corrigida.count("[tiab]") == 2
    total = len(chamadas)
    assert pm.validar_descritores_mesh(consulta) == (corrigida, invalidos)
    assert len(chamadas) == total  # tudo do cache


def test_mesh_sem_rede_devolve_consulta_intacta(monkeypatch):
    _servidor(monkeypatch, lambda caminho, params: RuntimeError("Falha ao acessar esearch"))
    consulta = '"Predictive Factors"[MeSH Terms] AND Hypertension[mh]'
    assert PubMed().validar_descritores_mesh(consulta) == (consulta, [])
    assert PubMed().validar_descritores_mesh("hypertension AND brazil") == ("hypertension AND brazil", [])
