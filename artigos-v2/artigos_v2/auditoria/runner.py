"""Roda as skills separadamente sobre um artigo pronto e gera o relatório.

python -m artigos_v2 auditar caminho/artigo.docx [--offline] [--com-ia]
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from . import skills as S
from .leitor import ler
from .verificacao import Verificador

ICONES = {"ok": "✅", "parcial": "⚠️", "falha": "❌", "nao_verificavel": "❔"}

CRITERIOS_IA = {
    "introducao": ("introducao", "Introdução coerente, que introduz bem o trabalho, com no máximo 3 páginas e o "
                                 "objetivo claro no último parágrafo."),
    "metodos": ("metodos", "Métodos explicam exatamente como a busca foi feita: bases (PubMed obrigatória, mínimo 2), "
                           "descritores, critérios de inclusão/exclusão, período. Método errado zera Métodos e Resultados."),
    "resultados": ("resultados", "Resultados trazem o resultado da busca, quantos artigos ficaram após os critérios "
                                 "(com fluxograma) e breve descrição dos principais pontos, organizados em tabela."),
    "discussao": ("discussao", "Discussão interpreta, compara estudos, nomeia divergências reais, tem ponto de vista do "
                               "autor e contexto realista de APS/SUS, sem simular outro país."),
    "humanizacao": ("discussao", "Estilo humano: ritmo irregular, sem conectivos-clichê, sem travessões em excesso, "
                                 "verbos diretos, cautela ancorada em dados, sem lista disfarçada de prosa."),
}


def auditar(caminho: str | Path, offline: bool = False, ncbi_api_key: str | None = None, cliente=None,
            artigo_id: str | None = None) -> dict:
    artigo = ler(caminho)
    verificador = None if offline else Verificador(ncbi_api_key)
    resultados = []
    for skill in S.SKILLS:
        try:
            resultados.append(skill(artigo, verificador=verificador))
        except Exception as e:  # uma skill com problema não derruba as outras
            resultados.append({"id": skill.__name__, "nome": skill.__name__, "valor": 0, "nota": 0,
                               "itens": [S._item("execução da skill", "falha", 1, f"{type(e).__name__}: {e}")]})

    if cliente is not None:
        for r in resultados:
            if r["id"] in CRITERIOS_IA:
                r["parecer_ia"] = _parecer_ia(cliente, artigo, r["id"], artigo_id)

    rubrica = [r for r in resultados if r["valor"] > 0]
    nota10 = round(sum(r["valor"] * r["nota"] / 100 for r in rubrica), 2)
    relatorio = {
        "arquivo": str(caminho),
        "auditado_em": datetime.now().isoformat(timespec="seconds"),
        "modo": "offline" if offline else "online (PubMed/Europe PMC)",
        "nota_estimada_0a10": nota10,
        "nota_geral": round(100 * nota10 / sum(r["valor"] for r in rubrica), 1) if rubrica else 0,
        "humanizacao": next((r["nota"] for r in resultados if r["id"] == "humanizacao"), None),
        "resumo_estrutura": {
            "secoes": {s: len(p) for s, p in artigo.secoes.items()},
            "tabelas": len(artigo.tabelas),
            "legendas": len(artigo.legendas),
            "referencias": len(artigo.referencias),
            "citacoes": len(artigo.citacoes),
        },
        "skills": resultados,
    }
    autoavaliacao = Path(caminho).with_name("artigo.json")
    if autoavaliacao.exists():
        relatorio["comparacao_sistema"] = _comparar_com_sistema(json.loads(autoavaliacao.read_text("utf-8")), resultados)
    return relatorio


def _parecer_ia(cliente, artigo, skill_id, artigo_id) -> dict:
    secao, criterio = CRITERIOS_IA[skill_id]
    texto = artigo.texto(secao)
    if skill_id == "resultados":
        texto += "\n\nTABELAS:\n" + "\n\n".join(t.texto for t in artigo.tabelas)[:8000]
    if skill_id == "metodos":
        texto += "\n\nTABELAS:\n" + "\n\n".join(t.texto for t in artigo.tabelas if t.secao == "metodos")
    mensagens = [
        {"role": "system", "content": "Você é uma professora rigorosa avaliando revisões de literatura para "
                                      "revistas Qualis A1. Avalie apenas o critério pedido, com evidências do texto."},
        {"role": "user", "content": f"Critério: {criterio}\n\nTexto da seção:\n{texto[:30000]}\n\n"
                                    "Responda SOMENTE com JSON: {\"nota\": 0-10, \"pontos_fortes\": [\"...\"], "
                                    "\"problemas\": [\"...\"], \"correcoes_sugeridas\": [\"...\"]}"},
    ]
    papel = "auditoria" if "auditoria" in cliente.config.escadas else "tecnico"
    try:
        dados, resposta = cliente.completar_json(papel, mensagens, etapa=f"auditoria_{skill_id}", artigo_id=artigo_id)
        return {**dados, "modelo": resposta.modelo_respondeu}
    except Exception as e:
        return {"erro": str(e)}


def _comparar_com_sistema(artigo_json: dict, resultados: list[dict]) -> dict:
    """Confronta o checklist que o próprio pipeline marcou com o que a auditoria externa encontrou."""
    externos = {i["criterio"]: i["status"] for r in resultados for i in r["itens"]}
    mapa = {
        "divergência": "Nomeia pelo menos uma divergência real entre estudos",
        "ponto de vista": "Tem ponto de vista claro do autor",
        "APS/SUS": "Contexto APS/SUS/UBS brasileiro",
        "travessões": "Nenhum parágrafo com 3+ travessões",
        "transição": "Nenhuma transição repetida 3+ vezes",
        "lista disfarçada": "Sem lista disfarçada de prosa (primeiramente... por último)",
        "Objetivo": "Objetivo no último parágrafo da Introdução",
        "mesmo número de frases": "Parágrafos vizinhos com número de frases diferente",
        "Métodos e Resultados secos": "Métodos sem opinião (humanização não vazou)",
    }
    linhas = []
    for item in artigo_json.get("checklist", []):
        alvo = next((v for k, v in mapa.items() if k.lower() in item["item"].lower()), None)
        if alvo and alvo in externos:
            externo_ok = externos[alvo] == "ok"
            linhas.append({"item": item["item"], "sistema_disse_ok": item["ok"], "auditoria_ok": externo_ok,
                           "concorda": item["ok"] == externo_ok})
    concordancia = round(100 * sum(l["concorda"] for l in linhas) / len(linhas), 1) if linhas else None
    return {
        "concordancia_checklist": concordancia,
        "itens": linhas,
        "citacoes_bloqueadas_pelo_sistema": artigo_json.get("citacoes_bloqueadas", []),
        "humanizacao_por_secao": artigo_json.get("humanizacao", {}),
    }


def relatorio_markdown(rel: dict) -> str:
    linhas = [
        f"# Auditoria externa — {Path(rel['arquivo']).name}",
        "",
        f"- Auditado em: {rel['auditado_em']} ({rel['modo']})",
        f"- **Nota estimada pela rubrica: {rel['nota_estimada_0a10']:.2f} / 10** ({rel['nota_geral']}%)",
        f"- Humanização (fora da rubrica): {rel['humanizacao']}%",
        "",
        "| Skill | Valor | Conformidade | Pontos |",
        "|---|---:|---:|---:|",
    ]
    for r in rel["skills"]:
        pontos = f"{r['valor'] * r['nota'] / 100:.2f}" if r["valor"] else "—"
        linhas.append(f"| {r['nome']} | {r['valor'] or '—'} | {r['nota']}% | {pontos} |")
    for r in rel["skills"]:
        linhas += ["", f"## {r['nome']} — {r['nota']}%", ""]
        for i in r["itens"]:
            evidencia = f" — {i['evidencia']}" if i["evidencia"] not in ("", {}, None) else ""
            linhas.append(f"- {ICONES[i['status']]} {i['criterio']}{evidencia}")
        if r.get("parecer_ia"):
            p = r["parecer_ia"]
            if "erro" in p:
                linhas.append(f"- Parecer por IA indisponível: {p['erro']}")
            else:
                linhas.append(f"- **Parecer por IA ({p.get('modelo')}): {p.get('nota')}/10**")
                for rotulo, chave in (("Problemas", "problemas"), ("Correções sugeridas", "correcoes_sugeridas")):
                    for x in p.get(chave, [])[:6]:
                        linhas.append(f"  - {rotulo}: {x}")
        problemas = [v for v in r.get("verificacao", []) if v["status"] != "verificada"]
        if problemas:
            linhas += ["", "Referências a conferir manualmente:", ""]
            linhas += [f"- [{v['n']}] {v['status']}: {v['referencia'][:160]} ({v['fonte']})" for v in problemas]
    comp = rel.get("comparacao_sistema")
    if comp:
        linhas += ["", "## Sistema × auditoria externa", "",
                   f"Concordância do checklist do sistema com a auditoria: {comp['concordancia_checklist']}%", ""]
        linhas += [f"- {'✅' if l['concorda'] else '❌'} {l['item']} (sistema: {'ok' if l['sistema_disse_ok'] else 'falha'}; "
                   f"auditoria: {'ok' if l['auditoria_ok'] else 'falha'})" for l in comp["itens"]]
        if comp["citacoes_bloqueadas_pelo_sistema"]:
            linhas.append(f"- Citações inventadas bloqueadas pelo sistema: {comp['citacoes_bloqueadas_pelo_sistema']}")
    return "\n".join(linhas) + "\n"


def salvar(rel: dict, destino_dir: str | Path) -> tuple[Path, Path]:
    destino = Path(destino_dir)
    destino.mkdir(parents=True, exist_ok=True)
    js = destino / "auditoria.json"
    md = destino / "auditoria.md"
    js.write_text(json.dumps(rel, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
    md.write_text(relatorio_markdown(rel), encoding="utf-8")
    return js, md
