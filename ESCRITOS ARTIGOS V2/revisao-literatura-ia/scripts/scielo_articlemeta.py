#!/usr/bin/env python3
"""Cliente minimo (so biblioteca padrao) para a API oficial ArticleMeta/CitedBy da SciELO.

Nao faz busca por palavra-chave (a API nao suporta isso) -- serve so para CONFIRMAR
um registro que ja foi encontrado via navegador em search.scielo.org, usando o PID,
o ISSN do periodico ou o DOI. Endpoints confirmados sem necessidade de chave em
2026-09-25 (ver ../references/fontes-e-apis.md).

Uso:
    python3 scielo_articlemeta.py artigo <PID>
    python3 scielo_articlemeta.py periodico <ISSN>
    python3 scielo_articlemeta.py citacoes-por-pid <PID>
    python3 scielo_articlemeta.py citacoes-por-doi <DOI>
"""

import json
import sys
import urllib.parse
import urllib.request

ARTICLEMETA_BASE = "https://articlemeta.scielo.org/api/v1"
CITEDBY_BASE = "https://citedby.scielo.org/api/v1"
TIMEOUT_SECONDS = 15


def _get_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": "revisao-literatura-ia/1.0"})
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return json.loads(response.read().decode("utf-8"))


def artigo(pid, formato="json"):
    query = urllib.parse.urlencode({"code": pid, "format": formato})
    return _get_json(f"{ARTICLEMETA_BASE}/article/?{query}")


def periodico(issn):
    query = urllib.parse.urlencode({"issn": issn})
    return _get_json(f"{ARTICLEMETA_BASE}/journal/?{query}")


def citacoes_por_pid(pid):
    query = urllib.parse.urlencode({"q": pid})
    return _get_json(f"{CITEDBY_BASE}/pid/?{query}")


def citacoes_por_doi(doi):
    query = urllib.parse.urlencode({"q": doi})
    return _get_json(f"{CITEDBY_BASE}/doi/?{query}")


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 1

    comando, valor = argv[1], argv[2]
    acoes = {
        "artigo": lambda: artigo(valor),
        "periodico": lambda: periodico(valor),
        "citacoes-por-pid": lambda: citacoes_por_pid(valor),
        "citacoes-por-doi": lambda: citacoes_por_doi(valor),
    }

    if comando not in acoes:
        print(f"Comando desconhecido: {comando}\n")
        print(__doc__)
        return 1

    try:
        resultado = acoes[comando]()
    except urllib.error.HTTPError as erro:
        print(f"Erro HTTP {erro.code} ao consultar a API da SciELO: {erro.reason}", file=sys.stderr)
        return 1
    except urllib.error.URLError as erro:
        print(f"Nao foi possivel conectar a API da SciELO: {erro.reason}", file=sys.stderr)
        return 1

    print(json.dumps(resultado, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
