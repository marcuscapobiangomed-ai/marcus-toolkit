import xml.etree.ElementTree as ET

from artigos_v2.bases import PubMed, Registro, ResultadoBusca, deduplicar, importar_ris
from artigos_v2.referencias import Numerador, abnt, chaves_citadas, renderizar_citacoes, vancouver

XML = """<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>123456</PMID>
<Article><Journal><JournalIssue><Volume>54</Volume><Issue>3</Issue><PubDate><Year>2020</Year></PubDate></JournalIssue>
<ISOAbbreviation>Rev Saude Publica</ISOAbbreviation></Journal>
<ArticleTitle>Hypertension control in <i>primary</i> care.</ArticleTitle>
<Pagination><MedlinePgn>45-50</MedlinePgn></Pagination>
<ELocationID EIdType="doi">10.1590/s1518</ELocationID>
<Abstract><AbstractText Label="OBJECTIVE">To assess.</AbstractText><AbstractText Label="RESULTS">It <b>worked</b>.</AbstractText></Abstract>
<AuthorList><Author><LastName>Silva</LastName><Initials>AB</Initials></Author><Author><CollectiveName>Grupo Brasil</CollectiveName></Author></AuthorList>
<Language>por</Language><PublicationTypeList><PublicationType>Journal Article</PublicationType></PublicationTypeList>
</Article><MedlineJournalInfo><MedlineTA>Rev Saude Publica</MedlineTA></MedlineJournalInfo></MedlineCitation>
</PubmedArticle></PubmedArticleSet>"""


def test_parse_pubmed_xml():
    r = PubMed._parse(ET.fromstring(XML).find("PubmedArticle"))
    assert r.pmid == "123456" and r.doi == "10.1590/s1518" and r.ano == "2020"
    assert r.titulo == "Hypertension control in primary care"
    assert r.autores == ["Silva AB", "Grupo Brasil"]
    assert r.resumo == "OBJECTIVE: To assess. RESULTS: It worked."


def _reg(**kw):
    base = dict(base="PubMed", id_base="1", titulo="Hypertension control in primary care",
                autores=[f"Autor{i} A" for i in range(8)], revista="Rev Saude Publica", ano="2020",
                volume="54", numero="3", paginas="45-50", doi="10.1590/x")
    base.update(kw)
    return Registro(**base)


def test_vancouver_seis_autores_et_al():
    ref = vancouver(_reg())
    assert ref.startswith("Autor0 A, Autor1 A, Autor2 A, Autor3 A, Autor4 A, Autor5 A, et al.")
    assert "Rev Saude Publica. 2020;54(3):45-50. doi:10.1590/x" in ref


def test_abnt():
    ref = abnt(_reg(autores=["Silva AB", "Souza C"]))
    assert ref.startswith("SILVA, A. B.; SOUZA, C.") and "v. 54, n. 3, p. 45-50, 2020." in ref


def test_numerador_bloqueia_citacao_inventada_e_compacta():
    n = Numerador({"R1", "R2", "R3", "R5"})
    texto = n.resolver("A [R3, R1] e B [R2, R99] e C [R1-R3, R5].")
    assert n.ordem == ["R3", "R1", "R2", "R5"]
    assert n.bloqueadas == ["R99"]
    assert texto == "A {{cite:1,2}} e B {{cite:3}} e C {{cite:1-4}}."
    assert renderizar_citacoes("x {{cite:1-3}}.", "sobrescrito") == [("x", False), ("1-3", True), (".", False)]


def test_chaves_citadas():
    assert chaves_citadas("a [R1, R4] b [R2–R3]") == ["R1", "R4", "R2", "R3"]


def test_ris_e_deduplicacao(tmp_path):
    ris = tmp_path / "lilacs.ris"
    ris.write_text("TY  - JOUR\nAU  - Silva, Ana Beatriz\nTI  - Hipertensão na APS\nJO  - Rev Saude Publica\n"
                   "PY  - 2021\nVL  - 55\nSP  - 1\nEP  - 9\nDO  - https://doi.org/10.1590/X\nER  - \n"
                   "TY  - JOUR\nAU  - Lima, Carlos\nTI  - Outro estudo\nPY  - 2020\nER  - \n", encoding="utf-8")
    registros = importar_ris(ris, "LILACS")
    assert len(registros) == 2 and registros[0].autores == ["Silva AB"] and registros[0].doi == "10.1590/X"
    pub = ResultadoBusca("PubMed", "q", 1, [_reg(doi="10.1590/x", titulo="Outro título")], "hoje")
    lil = ResultadoBusca("LILACS", "q", 2, registros, "hoje")
    unicos, duplicatas = deduplicar([pub, lil])
    assert duplicatas == 1 and len(unicos) == 2
