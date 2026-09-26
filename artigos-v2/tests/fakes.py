"""OmniRoute e bases falsas para testar o pipeline sem rede e sem gastar IA."""

from __future__ import annotations

import hashlib
import json
import re

from artigos_v2.bases import Registro, ResultadoBusca
from artigos_v2.llm import _ErroHTTP


def _sorteio(chave: str, n: int = 10) -> int:
    return int(hashlib.md5(chave.encode()).hexdigest(), 16) % n


class FakeOmniRoute:
    """Responde conforme a etapa detectada no prompt. Permite simular falhas por modelo/etapa."""

    def __init__(self):
        self.falhas: dict[str, int] = {}          # modelo -> nº de falhas 503 restantes
        self.permanentes: set[str] = set()         # modelos que devolvem 404
        self.explodir_em: str | None = None        # trecho do prompt que faz todos os modelos falharem
        self.cabecalhos_omni: dict = {}
        self.chamadas: list[dict] = []

    def __call__(self, url, cabecalhos, corpo, timeout):
        modelo = corpo["model"]
        prompt = corpo["messages"][-1]["content"]
        self.chamadas.append({"modelo": modelo, "cabecalhos": cabecalhos, "prompt": prompt[:200]})
        if self.explodir_em and self.explodir_em in prompt:
            raise _ErroHTTP(503, "HTTP 503: sobrecarregado")
        if modelo in self.permanentes:
            raise _ErroHTTP(404, "HTTP 404: model not found")
        if self.falhas.get(modelo, 0) > 0:
            self.falhas[modelo] -= 1
            raise _ErroHTTP(503, "HTTP 503: indisponível")
        texto = self.responder(prompt)
        dados = {"model": modelo, "choices": [{"message": {"content": texto}}],
                 "usage": {"prompt_tokens": len(prompt) // 4, "completion_tokens": len(texto) // 4}}
        if self.cabecalhos_omni:
            dados["_cabecalhos"] = dict(self.cabecalhos_omni)
        return dados

    # ------------------------------------------------------------------ respostas

    def responder(self, prompt: str) -> str:
        if "Revisão de ESTILO" in prompt:
            return prompt.split("Texto:\n", 1)[1].replace("Um grupo de estudos", "Parte dos estudos")
        if "Etapa 1 — Alinhar escopo" in prompt:
            return "```json\n" + json.dumps({
                "titulo_provisorio": "Hipertensão arterial na Atenção Primária à Saúde: revisão de literatura",
                "pergunta": "Quais estratégias da APS melhoram o controle da hipertensão arterial em adultos no Brasil?",
                "objetivo": "Analisar as estratégias da APS associadas ao controle da hipertensão arterial em adultos.",
                "descritores_decs": ["Hipertensão", "Atenção Primária à Saúde"],
                "descritores_mesh": ["Hypertension", "Primary Health Care"],
                "consultas": {
                    "pubmed": "(Hypertension[MeSH Terms] OR hypertension[tiab]) AND (\"Primary Health Care\"[MeSH Terms] OR \"primary care\"[tiab]) AND Brazil[tiab]",
                    "europepmc": "TITLE_ABS:\"hypertension\" AND TITLE_ABS:\"primary health care\" AND TITLE_ABS:\"Brazil\"",
                },
                "criterios_inclusao": ["Estudos com adultos hipertensos acompanhados na APS", "Estudos empíricos ou revisões"],
                "criterios_exclusao": ["Fora do tema", "Populações exclusivamente hospitalares", "Editoriais ou opiniões"],
                "consultas_contexto": ["hypertension prevalence Brazil", "primary health care Brazil family health strategy",
                                       "hypertension guidelines"],
            }, ensure_ascii=False) + "\n```"
        if "As consultas abaixo retornaram" in prompt:
            return json.dumps({"consultas": {"pubmed": "hypertension AND primary care AND Brazil AND adult",
                                             "europepmc": "hypertension AND \"primary care\" AND Brazil AND adult"}})
        if "Triagem por TÍTULO" in prompt or "Avaliação de ELEGIBILIDADE" in prompt:
            limite = 7 if "Triagem" in prompt else 8
            chaves = re.findall(r"^(R\d+) \|", prompt, re.M)
            return json.dumps([
                {"chave": c, "decisao": "incluir" if _sorteio(c) < limite else "excluir",
                 "criterio": f"E{1 + _sorteio(c, 3)}"} for c in chaves])
        if "quadro-síntese da revisão" in prompt:
            chaves = re.findall(r"^(R\d+) \|", prompt, re.M)
            return json.dumps([{"chave": c, "desenho": "Estudo transversal", "populacao": "Adultos hipertensos em UBS",
                                "achados": "Acompanhamento por equipe multiprofissional associou-se a melhor controle pressórico."}
                               for c in chaves], ensure_ascii=False)
        if "seção MÉTODOS" in prompt:
            data = re.search(r'"data_da_busca": "([^"]+)"', prompt).group(1)
            chave = re.search(r"modelo PRISMA 2020.*?\[(R\d+)\]", prompt, re.S)
            prisma = f" O relato da seleção seguiu o modelo PRISMA 2020 [{chave.group(1)}]." if chave else ""
            return (f"Trata-se de uma revisão de literatura. A busca foi feita em {data} no PubMed e no Europe PMC, "
                    "com descritores DeCS e MeSH combinados por operadores booleanos AND e OR (Quadro 1).\n\n"
                    "Os critérios de inclusão foram estudos com adultos hipertensos na APS publicados de 2016 a 2026. "
                    "Os critérios de exclusão foram estudos fora do tema, hospitalares ou editoriais.\n\n"
                    "Após a remoção de duplicatas, fez-se a triagem por título e resumo e a avaliação de elegibilidade. "
                    "Os dados foram extraídos para um quadro-síntese." + prisma)
        if "seção RESULTADOS" in prompt:
            fatos = json.loads(re.search(r"sem arredondar\): (\{.*?\})\nEstudos", prompt, re.S).group(1))
            chaves = re.findall(r'"chave": "(R\d+)"', prompt)
            grupos = [chaves[i:i + 3] for i in range(0, len(chaves), 3)]
            corpo = "\n\n".join(
                "Um grupo de estudos tratou do acompanhamento longitudinal na UBS. " +
                "Os achados apontam melhor adesão ao tratamento " + "[" + ", ".join(g) + "]." for g in grupos)
            return (f"A busca identificou {fatos['identificados']} registros; após remover {fatos['duplicatas']} "
                    f"duplicatas, {fatos['triados']} foram triados e {fatos['incluidos']} estudos foram incluídos "
                    "(Figura 1).\n\n" + corpo + "\n\nO Quadro 2 resume os estudos.")
        if "precisa citar pelo menos mais" in prompt:
            disponiveis = re.findall(r"^\[(R\d+)\]", prompt, re.M)
            discussao = prompt.split("Discussão:\n", 1)[1]
            return discussao + "\n\nOutros trabalhos reforçam esse ponto [" + ", ".join(disponiveis) + "]."
        if "Escreva a INTRODUÇÃO" in prompt:
            chaves = re.findall(r"^\[(R\d+)\]", prompt, re.M)
            paragrafos = [f"A hipertensão é comum no Brasil e sobrecarrega as UBS [{', '.join(chaves[i:i + 2])}]."
                          " Uma frase longa o bastante para variar o ritmo do texto e mostrar a irregularidade que se"
                          " espera de um autor humano escrevendo sobre o tema. Curta aqui."
                          for i in range(0, min(len(chaves), 12), 2)]
            return "\n\n".join(paragrafos + ["O objetivo desta revisão é analisar as estratégias da APS no controle "
                                             "da hipertensão arterial em adultos."])
        if "Escreva a DISCUSSÃO" in prompt:
            chaves = list(dict.fromkeys(re.findall(r'"chave": "(R\d+)"', prompt) + re.findall(r"^\[(R\d+)\]", prompt, re.M)))
            return ("Os achados divergem entre os estudos [" + ", ".join(chaves[:2]) + "]. A nosso ver, o cenário do "
                    "SUS explica parte disso.\n\nOutro ponto aparece em vários trabalhos [" + ", ".join(chaves[2:12])
                    + "].\n\nEsta revisão tem limitações: só resumos foram avaliados na elegibilidade.")
        if "Escreva a CONCLUSÃO" in prompt:
            return "A APS tem papel central no controle da hipertensão. Estratégias multiprofissionais funcionam melhor."
        if "produza título, resumo estruturado e abstract" in prompt:
            return json.dumps({"titulo": "Hipertensão arterial na APS brasileira: revisão de literatura",
                               "title": "Hypertension in Brazilian primary care: a literature review",
                               "resumo": "Objetivo: analisar estratégias. Métodos: revisão. Resultados: estudos. Conclusão: APS.",
                               "palavras_chave": ["Hipertensão", "Atenção Primária à Saúde"],
                               "abstract": "Objective: to analyze. Methods: review. Results: studies. Conclusion: PHC.",
                               "keywords": ["Hypertension", "Primary Health Care"]}, ensure_ascii=False)
        if "conferência final do artigo" in prompt:
            return json.dumps([{"item": i, "ok": True, "observacao": "ok"} for i in range(1, 11)])
        if prompt.startswith("Critério:"):
            return json.dumps({"nota": 8, "pontos_fortes": ["claro"], "problemas": ["pouca divergência"],
                               "correcoes_sugeridas": ["comparar mais estudos"]}, ensure_ascii=False)
        return "resposta genérica"


def _registro(base: str, i: int, com_doi: bool = True) -> Registro:
    return Registro(base=base, id_base=str(1000 + i), pmid=str(30000000 + i) if base == "PubMed" else "",
                    titulo=f"Estudo {i} sobre controle da hipertensão na atenção primária",
                    autores=["Silva AB", "Souza CD", "Lima EF"], revista="Rev Saude Publica", ano="2021",
                    volume="55", numero="2", paginas=f"{i}-{i + 9}", doi=f"10.1590/fake.{i}" if com_doi else "",
                    resumo=f"Estudo {i}: adultos hipertensos acompanhados em UBS.", tipos=["Journal Article"],
                    idioma="por")


PMID_PRISMA_2020 = "33782057"


def _registro_prisma() -> Registro:
    """Metadados da declaração PRISMA 2020 como o PubMed devolve (dado de teste, não usado em produção)."""
    return Registro(base="PubMed", id_base=PMID_PRISMA_2020, pmid=PMID_PRISMA_2020,
                    titulo="The PRISMA 2020 statement: an updated guideline for reporting systematic reviews",
                    autores=["Page MJ", "McKenzie JE", "Bossuyt PM", "Boutron I", "Hoffmann TC", "Mulrow CD",
                             "Shamseer L"],
                    revista="BMJ", ano="2021", volume="372", paginas="n71", doi="10.1136/bmj.n71",
                    resumo="The PRISMA 2020 statement replaces the 2009 statement.", tipos=["Journal Article"],
                    idioma="eng")


class FakePubMed:
    def __init__(self, total: int = 40, mesh_invalidos: list[str] | None = None):
        self.total = total
        self.mesh_invalidos = list(mesh_invalidos or [])  # descritores que "não existem" no MeSH
        self.consultas_contadas: list[str] = []
        self.falhar_detalhes: set[str] = set()             # PMIDs cujo efetch falha (simula rede)

    def contar(self, consulta):
        self.consultas_contadas.append(consulta)
        return self.total, ""

    def validar_descritores_mesh(self, consulta):
        invalidos = []
        for termo in self.mesh_invalidos:
            padrao = rf'"?{re.escape(termo)}"?\[(?:MeSH Terms|MeSH|mh)\]'
            if re.search(padrao, consulta, re.I):
                consulta = re.sub(padrao, f'"{termo}"[tiab]', consulta, flags=re.I)
                invalidos.append(termo)
        return consulta, invalidos

    def buscar(self, consulta, limite, data_busca):
        registros = [_registro("PubMed", i) for i in range(min(self.total, limite))]
        return ResultadoBusca("PubMed", consulta, self.total, registros, data_busca, "traducao")

    def buscar_ids(self, consulta, limite, ordenar="relevance"):
        base = 500 + _sorteio(consulta, 50) * 20
        return 100, [str(base + i) for i in range(limite)], ""

    def detalhes(self, ids):
        if self.falhar_detalhes & set(ids):
            raise RuntimeError("Falha ao acessar efetch (simulada)")
        # PMID 3000000i é o registro i da busca: o efetch devolve o mesmo artigo (mesmo PMID e DOI)
        return [_registro_prisma() if i == PMID_PRISMA_2020 else
                _registro("PubMed", int(i) - 30000000 if int(i) >= 30000000 else int(i)) for i in ids]


class FakeEuropePMC:
    def __init__(self, total: int = 15):
        self.total = total

    def contar(self, consulta):
        return self.total, ""

    def buscar(self, consulta, limite, data_busca):
        # 5 duplicatas do PubMed (mesmo DOI) + registros próprios
        registros = [_registro("Europe PMC", i) for i in range(5)]
        registros += [_registro("Europe PMC", 200 + i) for i in range(min(self.total, limite) - 5)]
        return ResultadoBusca("Europe PMC", consulta, self.total, registros, data_busca)
