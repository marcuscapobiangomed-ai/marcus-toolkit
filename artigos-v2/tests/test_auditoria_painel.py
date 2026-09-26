import json
import threading
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

import pytest

from artigos_v2.auditoria.leitor import identificar_secao, ler
from artigos_v2.auditoria.runner import auditar, relatorio_markdown, salvar
from artigos_v2.auditoria.verificacao import Verificador, extrair_titulo, similaridade
from artigos_v2.painel.server import criar_handler
from artigos_v2.pipeline import Pedido, Pipeline


@pytest.fixture
def artigo_gerado(ambiente):
    config, ledger, cliente, fake, pubmed, epmc = ambiente
    pipeline = Pipeline(config, ledger, cliente, pubmed=pubmed, europepmc=epmc, log=lambda *_: None)
    docx = pipeline.gerar(Pedido(tema="Hipertensão na APS", autores=["Aluno"], orientador="Prof. X"))
    return ambiente, docx


def _item(rel, skill, trecho):
    s = next(s for s in rel["skills"] if s["id"] == skill)
    return next(i for i in s["itens"] if trecho in i["criterio"])


def test_auditoria_offline_do_docx_gerado(artigo_gerado):
    (_, _, cliente, *_), docx = artigo_gerado
    artigo = ler(docx)
    assert {"resumo", "abstract", "introducao", "metodos", "resultados", "discussao", "conclusao"} <= artigo.secoes.keys()
    assert len(artigo.referencias) >= 25 and artigo.citacoes

    rel = auditar(docx, offline=True)
    assert _item(rel, "metodos", "PubMed entre as bases")["status"] == "ok"
    assert _item(rel, "metodos", "duas bases")["status"] == "ok"
    assert _item(rel, "resultados", "fecham entre as etapas")["status"] == "ok"
    assert _item(rel, "resultados", "uma linha por estudo")["status"] == "ok"
    assert _item(rel, "referencias", "No mínimo 25")["status"] == "ok"
    assert _item(rel, "referencias", "Toda citação no texto")["status"] == "ok"
    assert _item(rel, "introducao", "Objetivo no último parágrafo")["status"] == "ok"
    assert _item(rel, "discussao", "divergência")["status"] == "ok"
    assert 0 < rel["nota_estimada_0a10"] <= 10
    # compara com o checklist que o próprio sistema marcou
    assert rel["comparacao_sistema"]["concordancia_checklist"] is not None

    js, md = salvar(rel, docx.parent)
    assert "Nota estimada pela rubrica" in md.read_text(encoding="utf-8")


def test_auditoria_com_parecer_por_ia_registra_custo(artigo_gerado):
    (config, ledger, cliente, *_), docx = artigo_gerado
    rel = auditar(docx, offline=True, cliente=cliente, artigo_id="auditoria-teste")
    parecer = next(s for s in rel["skills"] if s["id"] == "metodos")["parecer_ia"]
    assert parecer["nota"] == 8 and parecer["modelo"] == "openai/gpt-6-sol"
    assert any(c["etapa"] == "auditoria_metodos" for c in ledger.chamadas("auditoria-teste"))


def test_auditoria_pega_artigo_ruim(tmp_path):
    ruim = tmp_path / "ruim.md"
    ruim.write_text(
        "# Um artigo\n\n## Introdução\n\nAlém disso, é importante ressaltar que a hipertensão permeia tudo. "
        "O objetivo é revisar.\n\nAlém disso, outro parágrafo. Além disso, mais um.\n\n"
        "## Metodologia\n\nForam buscados artigos no Google Acadêmico.\n\n"
        "## Resultados\n\nObserva-se que os estudos mostram. Observa-se que há dados. Nota-se que sim. "
        "Verifica-se que não.\n\n## Discussão\n\nPrimeiramente, os estudos concordam. Em segundo lugar, "
        "também concordam — todos — sem exceção — sempre.\n\n## Conclusão\n\nFim.\n\n## Referências\n\n"
        "1. Silva AB. Um estudo inventado. Rev Inventada. 2020;1(1):1-2.\n", encoding="utf-8")
    rel = auditar(ruim, offline=True)
    assert _item(rel, "metodos", "PubMed entre as bases")["status"] == "falha"
    assert _item(rel, "metodos", "duas bases")["status"] == "falha"
    assert _item(rel, "resultados", "Fluxograma")["status"] == "falha"
    assert _item(rel, "referencias", "No mínimo 25")["status"] == "falha"
    assert _item(rel, "humanizacao", "transição repetida")["status"] == "falha"
    assert _item(rel, "humanizacao", "lista disfarçada")["status"] == "falha"
    assert rel["nota_estimada_0a10"] < 4
    assert "❌" in relatorio_markdown(rel)


@pytest.mark.parametrize("texto, esperado", [
    ("1 INTRODUÇÃO", "introducao"), ("2. Material e Métodos", "metodos"), ("Metodologia", "metodos"),
    ("RESULTADOS E DISCUSSÃO", "resultados_discussao"), ("Considerações finais", "conclusao"),
    ("Referências bibliográficas", "referencias"), ("A introdução do tema é longa demais para ser título", None),
])
def test_identificar_secao(texto, esperado):
    assert identificar_secao(texto) == esperado


@pytest.mark.parametrize("ref, titulo", [
    ("1. Silva AB, Souza CD, et al. Hypertension control in primary care. Rev Saude Publica. 2020;54:1-9.",
     "Hypertension control in primary care"),
    ("Martín-Carro B, Smith J. Chocolate and cardiometabolic risk. Nutrients. 2026;18(18):3023.",
     "Chocolate and cardiometabolic risk"),
    ("SILVA, A. B.; SOUZA, C. D. Hipertensão na atenção primária. Revista X, v. 1, p. 2, 2020.",
     "Hipertensão na atenção primária"),
    ("4. Villela PB, Klein CH, de Oliveira GMM. Socioeconomic factors and mortality in Brazil. Rev Port Cardiol. 2019.",
     "Socioeconomic factors and mortality in Brazil"),
    ("Santos AFD, Rocha HAD, Lima ÂMLD, et al. Contribution of community health workers. Cad Saude Publica. 2020.",
     "Contribution of community health workers"),
])
def test_extrair_titulo(ref, titulo):
    assert similaridade(extrair_titulo(ref), titulo) == 1.0


class _VerificadorFalso(Verificador):
    """PubMed simulado: o DOI 10.1590/certo aponta para o título certo; 10.1590/errado para outro artigo."""

    def _esearch(self, termo, retmax=3):
        return (1, ["111"]) if "10.1590/certo" in termo else (1, ["222"]) if "10.1590/errado" in termo else (0, [])

    def _titulos_pubmed(self, ids):
        titulos = {"111": "Hypertension control in primary care", "222": "Dengue outbreaks in Asia"}
        return {i: titulos[i] for i in ids if i in titulos}

    def _get_json(self, url):
        return {"resultList": {"result": []}}


@pytest.mark.parametrize("ref, status", [
    ("1. de Souza AB, Lima ÂM. Hypertension control in primary care. Rev X. 2020;1:1. doi:10.1590/certo", "verificada"),
    ("2. Silva AB. Hypertension control in primary care. Rev X. 2020;1:1. doi:10.1590/errado", "divergente"),
    ("3. Silva AB. Um estudo que não existe em lugar nenhum. Rev X. 2020;1:1.", "nao_encontrada"),
])
def test_verificar_referencia(ref, status):
    assert _VerificadorFalso().verificar_referencia(ref)["status"] == status


def test_painel_api_e_download(artigo_gerado):
    (config, ledger, *_), docx = artigo_gerado
    servidor = ThreadingHTTPServer(("127.0.0.1", 0), criar_handler(ledger, config))
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{servidor.server_address[1]}"
    try:
        pegar = lambda caminho: urllib.request.urlopen(base + caminho, timeout=10)
        resumo = json.load(pegar("/api/resumo"))
        assert resumo["concluidos"] == 1 and resumo["custo_api_usd"] > 0
        assert resumo["gasto_real_usd"] < resumo["custo_api_usd"]  # triagem no modelo gratuito
        artigos = json.load(pegar("/api/artigos"))
        assert artigos[0]["tem_docx"] and artigos[0]["modelos"]
        modelos = {m["chave"] for m in json.load(pegar("/api/modelos"))}
        assert {"anthropic/claude-opus-5-5", "anthropic/claude-sonnet-5", "gemini/gemini-3.8-flash"} <= modelos
        etapas = {e["chave"] for e in json.load(pegar(f"/api/etapas?artigo={artigos[0]['id']}"))}
        assert {"escopo", "triagem", "discussao", "humanizacao_discussao"} <= etapas
        detalhe = json.load(pegar(f"/api/artigos/{artigos[0]['id']}"))
        assert detalhe["chamadas"] and detalhe["eventos"]
        escada = json.load(pegar("/api/escada"))
        assert escada["escrita"][0]["id"] == "anthropic/claude-opus-5-5"
        corpo = pegar(f"/download/{artigos[0]['id']}.docx").read()
        assert corpo[:2] == b"PK" and len(corpo) == docx.stat().st_size
        assert b"Painel" in pegar("/").read()
        with pytest.raises(urllib.error.HTTPError):
            pegar("/download/..%2F..%2Fetc%2Fpasswd.docx")
    finally:
        servidor.shutdown()
