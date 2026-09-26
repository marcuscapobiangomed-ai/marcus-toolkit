"""Orquestra o fluxo da skill `artigos`, etapa por etapa, com checkpoint.

escopo → busca (real) → triagem → elegibilidade → síntese → contexto → métodos →
resultados → introdução → discussão → conclusão → humanização → resumos →
montagem → checklist → exportação (.docx automático)

Cada etapa salva o estado em dados/artigos/<id>/estado.json; se algo falhar,
`python -m artigos_v2 retomar <id>` continua de onde parou.
"""

from __future__ import annotations

import csv
import json
import math
import re
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Callable

from . import prompts
from .bases import EuropePMC, PubMed, Registro, ResultadoBusca, deduplicar, importar_ris
from .config import Config
from .ledger import Ledger, agora
from .llm import ClienteOmniRoute
from .referencias import FORMATOS, Numerador, chaves_citadas, texto_plano

ETAPAS = [
    "escopo", "busca", "triagem", "elegibilidade", "sintese", "contexto", "metodos", "resultados",
    "introducao", "discussao", "reforco_referencias", "conclusao", "humanizacao", "resumos", "montagem",
    "checklist", "exportacao",
]
SECOES = ["introducao", "metodos", "resultados", "discussao", "conclusao"]
MINIMO_REFERENCIAS = 25
IDIOMAS = {"en": ("english", "eng"), "pt": ("portuguese", "por"), "es": ("spanish", "spa")}


@dataclass
class Pedido:
    tema: str
    revista: str = "Revista Brasileira de Medicina de Família e Comunidade (RBMFC)"
    normas: str = ""
    autores: list[str] = field(default_factory=list)
    orientador: str = ""
    instituicao: str = ""
    artigos_base: list[str] = field(default_factory=list)  # PMIDs fornecidos pelo autor
    periodo: tuple[int, int] = (date.today().year - 10, date.today().year)
    idiomas: list[str] = field(default_factory=lambda: ["en", "pt", "es"])
    bases: list[str] = field(default_factory=lambda: ["pubmed", "europepmc"])
    ris: dict[str, str] = field(default_factory=dict)  # {"LILACS": "caminho.ris"}
    formato_referencias: str = "vancouver"
    formato_citacao: str = "sobrescrito"
    observacoes: str = ""
    min_registros: int = 15
    max_registros: int = 300
    # O que os autores fizeram, nas palavras deles — vira fato nos Métodos e orienta as limitações. Ex.:
    # {"triagem": "dois autores, de forma independente", "divergencias": "consenso com o orientador",
    #  "leitura_integra": "todos os artigos elegíveis foram lidos na íntegra pelos autores",
    #  "extracao": "dois autores, com conferência cruzada", "busca_manual": "referências dos estudos incluídos",
    #  "redacao": "texto escrito e revisado pelos autores"}
    contribuicao_autores: dict[str, str] = field(default_factory=dict)

    @classmethod
    def de_arquivo(cls, caminho: str | Path) -> "Pedido":
        dados = json.loads(Path(caminho).read_text(encoding="utf-8"))
        if "periodo" in dados:
            dados["periodo"] = tuple(dados["periodo"])
        return cls(**dados)


class Pipeline:
    def __init__(self, config: Config, ledger: Ledger, cliente: ClienteOmniRoute,
                 pubmed: PubMed | None = None, europepmc: EuropePMC | None = None,
                 log: Callable[[str], None] = print):
        self.config = config
        self.ledger = ledger
        self.cliente = cliente
        self.pubmed = pubmed or PubMed(config.ncbi_api_key, config.ncbi_email)
        self.europepmc = europepmc or EuropePMC()
        self.log = log

    # ------------------------------------------------------------------ estado

    def pasta(self, artigo_id: str) -> Path:
        return self.config.dir_dados / "artigos" / artigo_id

    def _carregar(self, artigo_id: str) -> dict:
        return json.loads((self.pasta(artigo_id) / "estado.json").read_text(encoding="utf-8"))

    def _salvar(self, artigo_id: str, estado: dict) -> None:
        caminho = self.pasta(artigo_id) / "estado.json"
        temporario = caminho.with_suffix(".tmp")
        temporario.write_text(json.dumps(estado, ensure_ascii=False, indent=1), encoding="utf-8")
        temporario.replace(caminho)

    def iniciar(self, pedido: Pedido) -> str:
        artigo_id = self.ledger.novo_artigo(pedido.tema, pedido.revista)
        self.pasta(artigo_id).mkdir(parents=True, exist_ok=True)
        self._salvar(artigo_id, {"id": artigo_id, "pedido": asdict(pedido), "concluidas": [], "registros": {}})
        self.ledger.evento(artigo_id, f"Artigo criado: {pedido.tema}")
        return artigo_id

    def gerar(self, pedido: Pedido) -> Path:
        return self.executar(self.iniciar(pedido))

    def executar(self, artigo_id: str) -> Path:
        estado = self._carregar(artigo_id)
        self.ledger.atualizar_artigo(artigo_id, status="em_andamento", erro=None)
        try:
            for etapa in ETAPAS:
                if etapa in estado["concluidas"]:
                    continue
                self.ledger.atualizar_artigo(artigo_id, etapa_atual=etapa)
                self.log(f"[{artigo_id}] etapa: {etapa}")
                getattr(self, f"_etapa_{etapa}")(artigo_id, estado)
                estado["concluidas"].append(etapa)
                self._salvar(artigo_id, estado)
        except Exception as e:
            self._salvar(artigo_id, estado)
            self.ledger.atualizar_artigo(artigo_id, status="erro", erro=f"{type(e).__name__}: {e}"[:1000])
            self.ledger.evento(artigo_id, f"Falha na etapa {self.ledger.artigo(artigo_id)['etapa_atual']}: {e}",
                               "erro")
            raise
        self.ledger.atualizar_artigo(artigo_id, status="concluido", etapa_atual="concluido", finalizado_em=agora())
        return Path(estado["docx"])

    # ------------------------------------------------------------ utilidades

    def _pedido(self, estado) -> Pedido:
        dados = dict(estado["pedido"])
        dados["periodo"] = tuple(dados["periodo"])
        return Pedido(**dados)

    def _reg(self, estado, chave) -> Registro:
        return Registro.de_dict(estado["registros"][chave])

    def _para_prompt(self, estado, chaves) -> list[dict]:
        return [{"chave": c, **{k: estado["registros"][c][k] for k in ("titulo", "ano", "resumo", "tipos", "autores", "revista")}}
                for c in chaves]

    def _filtros(self, pedido: Pedido, base: str, consulta: str) -> str:
        ini, fim = pedido.periodo
        idiomas = [IDIOMAS[i] for i in pedido.idiomas if i in IDIOMAS]
        if base == "pubmed":
            filtro_idioma = " OR ".join(f"{p}[la]" for p, _ in idiomas)
            return (f'({consulta}) AND ("{ini}/01/01"[dp] : "{fim}/12/31"[dp])'
                    + (f" AND ({filtro_idioma})" if filtro_idioma else "")
                    + " NOT (editorial[pt] OR letter[pt] OR comment[pt])")
        filtro_idioma = " OR ".join(f'LANG:"{c}"' for _, c in idiomas)
        return (f"({consulta}) AND (PUB_YEAR:[{ini} TO {fim}])"
                + (f" AND ({filtro_idioma})" if filtro_idioma else "") + ' NOT (SRC:"PPR")')

    def _chaveador(self, estado):
        """Atribui chaves R1..Rn estáveis, reaproveitando a chave de um registro já visto."""
        por_dedup = {Registro.de_dict(r).chave_dedup: c for c, r in estado["registros"].items()}

        def chave_para(registro: Registro) -> str:
            if registro.chave_dedup in por_dedup:
                return por_dedup[registro.chave_dedup]
            chave = f"R{len(estado['registros']) + 1}"
            estado["registros"][chave] = registro.para_dict()
            por_dedup[registro.chave_dedup] = chave
            return chave

        return chave_para

    # ------------------------------------------------------------------ etapas

    def _etapa_escopo(self, artigo_id, estado):
        p = self._pedido(estado)
        protocolo, _ = self.cliente.completar_json(
            "tecnico", prompts.escopo(p.tema, p.revista, p.normas, p.artigos_base, p.periodo, p.observacoes),
            etapa="escopo", artigo_id=artigo_id)
        for campo in ("pergunta", "objetivo", "consultas", "criterios_inclusao", "criterios_exclusao"):
            if not protocolo.get(campo):
                raise ValueError(f"Protocolo sem '{campo}'")
        estado["protocolo"] = protocolo

    def _etapa_busca(self, artigo_id, estado):
        p = self._pedido(estado)
        consultas = {b: estado["protocolo"]["consultas"].get(b, "") for b in p.bases}
        buscadores = {"pubmed": self.pubmed, "europepmc": self.europepmc}
        importados = {nome: importar_ris(caminho, nome) for nome, caminho in p.ris.items()}
        n_importados = sum(len(v) for v in importados.values())

        for rodada in range(4):
            contagens = {b: buscadores[b].contar(self._filtros(p, b, q))[0] for b, q in consultas.items()}
            total = sum(contagens.values()) + n_importados
            self.ledger.evento(artigo_id, f"Busca rodada {rodada + 1}: {contagens} (+{n_importados} RIS)")
            if p.min_registros <= total <= p.max_registros or (total > 0 and total < p.min_registros and rodada == 3):
                break
            if rodada == 3:
                raise ValueError(f"Consultas retornam {total} registros (faixa {p.min_registros}–{p.max_registros}) "
                                 "mesmo após 3 refinamentos. Ajuste o tema ou max_registros no pedido.")
            novo, _ = self.cliente.completar_json(
                "tecnico", prompts.refinar_consultas(consultas, contagens, (p.min_registros, p.max_registros),
                                                     estado["protocolo"]),
                etapa="busca_refinamento", artigo_id=artigo_id)
            consultas = {b: novo.get("consultas", {}).get(b) or consultas[b] for b in consultas}

        data_busca = datetime.now().strftime("%d/%m/%Y")
        resultados: list[ResultadoBusca] = []
        for base, consulta in consultas.items():
            final = self._filtros(p, base, consulta)
            total = buscadores[base].contar(final)[0]
            resultado = buscadores[base].buscar(final, limite=total, data_busca=data_busca)
            if len(resultado.registros) != resultado.total:
                self.ledger.evento(artigo_id, f"{resultado.base}: total {resultado.total}, "
                                              f"recuperados {len(resultado.registros)}", "aviso")
            resultados.append(resultado)
        for nome, registros in importados.items():
            resultados.append(ResultadoBusca(nome, f"exportação RIS do portal ({p.ris[nome]})",
                                             len(registros), registros, data_busca))

        if len(resultados) < 2 or not any(r.base == "PubMed" for r in resultados):
            self.ledger.evento(artigo_id, "A rubrica exige PubMed e no mínimo 2 bases: revise 'bases'/'ris' no pedido",
                               "aviso")
        unicos, duplicatas = deduplicar(resultados)
        chave_para = self._chaveador(estado)
        estado["triados"] = [chave_para(r) for r in unicos]
        estado["busca"] = {
            "data": data_busca,
            "estrategias": [{"base": r.base, "estrategia": r.consulta, "registros": len(r.registros),
                             "traducao": r.traducao} for r in resultados],
            "duplicatas": duplicatas,
        }

    def _decidir(self, artigo_id, estado, chaves, fase, lote) -> dict:
        decisoes = {}
        for i in range(0, len(chaves), lote):
            grupo = chaves[i:i + lote]
            resposta, _ = self.cliente.completar_json(
                "triagem", prompts.triagem(estado["protocolo"], self._para_prompt(estado, grupo), fase),
                etapa=fase, artigo_id=artigo_id)
            por_chave = {d.get("chave"): d for d in resposta if isinstance(d, dict)} if isinstance(resposta, list) else {}
            for chave in grupo:
                d = por_chave.get(chave)
                if not d or d.get("decisao") not in ("incluir", "excluir"):
                    # Sem decisão válida: mantém o registro (conservador) e avisa.
                    self.ledger.evento(artigo_id, f"{fase}: sem decisão para {chave}; mantido", "aviso")
                    d = {"decisao": "incluir"}
                decisoes[chave] = {"decisao": d["decisao"], "criterio": d.get("criterio") or "E0"}
        return decisoes

    def _rotulo_criterio(self, estado, codigo: str) -> str:
        criterios = estado["protocolo"]["criterios_exclusao"]
        m = re.match(r"E(\d+)", str(codigo))
        n = int(m.group(1)) if m else 0
        if n == 0 or n > len(criterios):
            return "Informação insuficiente para confirmar os critérios"
        return criterios[n - 1]

    def _etapa_triagem(self, artigo_id, estado):
        estado["decisoes_triagem"] = self._decidir(artigo_id, estado, estado["triados"], "triagem", 15)

    def _etapa_elegibilidade(self, artigo_id, estado):
        elegiveis = [c for c in estado["triados"] if estado["decisoes_triagem"][c]["decisao"] == "incluir"]
        estado["elegiveis"] = elegiveis
        estado["decisoes_elegibilidade"] = self._decidir(artigo_id, estado, elegiveis, "elegibilidade", 8)
        estado["incluidos"] = [c for c in elegiveis if estado["decisoes_elegibilidade"][c]["decisao"] == "incluir"]
        if not estado["incluidos"]:
            raise ValueError("Nenhum estudo incluído após a elegibilidade — revise tema/critérios.")
        estado["prisma"] = self._prisma(estado)
        self._salvar_triagem_csv(artigo_id, estado)

    def _motivo(self, estado, decisao: dict) -> str:
        """Motivo escrito pelos autores (revisão da triagem) ou o critério de exclusão do protocolo."""
        return decisao.get("motivo") or self._rotulo_criterio(estado, decisao.get("criterio", "E0"))

    def _prisma(self, estado) -> dict:
        busca = estado["busca"]
        motivos = lambda decisoes: dict(Counter(
            self._motivo(estado, d) for d in decisoes.values() if d["decisao"] == "excluir"))
        identificados = sum(e["registros"] for e in busca["estrategias"])
        excl_triagem = sum(1 for d in estado["decisoes_triagem"].values() if d["decisao"] == "excluir")
        excl_eleg = sum(1 for d in estado["decisoes_elegibilidade"].values() if d["decisao"] == "excluir")
        prisma = {
            "por_base": {e["base"]: e["registros"] for e in busca["estrategias"]},
            "identificados": identificados,
            "duplicatas": busca["duplicatas"],
            "triados": len(estado["triados"]),
            "excluidos_triagem": excl_triagem,
            "motivos_triagem": motivos(estado["decisoes_triagem"]),
            "avaliados_elegibilidade": len(estado["elegiveis"]),
            "excluidos_elegibilidade": excl_eleg,
            "motivos_elegibilidade": motivos(estado["decisoes_elegibilidade"]),
            "incluidos": len(estado["incluidos"]),
        }
        # Os números fecham por construção; se não fecharem, é bug — melhor parar do que exportar errado.
        assert prisma["identificados"] - prisma["duplicatas"] == prisma["triados"], prisma
        assert prisma["triados"] - excl_triagem == prisma["avaliados_elegibilidade"], prisma
        assert prisma["avaliados_elegibilidade"] - excl_eleg == prisma["incluidos"], prisma
        return prisma

    def _salvar_triagem_csv(self, artigo_id, estado):
        """Planilha de decisões para os autores conferirem a seleção."""
        with open(self.pasta(artigo_id) / "triagem.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f, delimiter=";")
            w.writerow(["chave", "base", "pmid", "doi", "ano", "titulo", "triagem", "motivo_triagem",
                        "elegibilidade", "motivo_elegibilidade"])
            for chave in estado["triados"]:
                r = estado["registros"][chave]
                dt = estado["decisoes_triagem"][chave]
                de = estado["decisoes_elegibilidade"].get(chave)
                w.writerow([chave, r["base"], r["pmid"], r["doi"], r["ano"], r["titulo"], dt["decisao"],
                            self._motivo(estado, dt) if dt["decisao"] == "excluir" else "",
                            de["decisao"] if de else "",
                            self._motivo(estado, de) if de and de["decisao"] == "excluir" else ""])

    def revisar_selecao(self, artigo_id: str, caminho_csv: str | Path) -> dict:
        """Importa o triagem.csv revisado pelos autores: as decisões deles passam a valer.

        Recalcula o PRISMA e invalida as etapas a partir do quadro-síntese, que são refeitas no `retomar`.
        """
        estado = self._carregar(artigo_id)
        if "decisoes_triagem" not in estado:
            raise ValueError("A triagem ainda não foi feita para este artigo.")
        bruto = Path(caminho_csv).read_bytes()
        try:
            texto = bruto.decode("utf-8-sig")
        except UnicodeDecodeError:  # Excel no Windows salva em cp1252
            texto = bruto.decode("cp1252")
        delimitador = ";" if texto.splitlines()[0].count(";") >= texto.splitlines()[0].count(",") else ","
        linhas = {l["chave"].strip(): l for l in csv.DictReader(texto.splitlines(), delimiter=delimitador)
                  if l.get("chave")}

        def decisao(valor: str, campo: str, chave: str) -> str:
            v = (valor or "").strip().lower()
            if v in ("incluir", "incluido", "incluído", "sim", "i"):
                return "incluir"
            if v in ("excluir", "excluido", "excluído", "nao", "não", "e"):
                return "excluir"
            raise ValueError(f"{chave}: valor '{valor}' em {campo} (use incluir ou excluir)")

        faltando = [c for c in estado["triados"] if c not in linhas]
        if faltando:
            raise ValueError(f"A planilha não tem {len(faltando)} registro(s) triados: {faltando[:10]}")

        mudancas, triagem, elegibilidade = [], {}, {}
        for chave in estado["triados"]:
            linha = linhas[chave]
            dt = decisao(linha.get("triagem"), "triagem", chave)
            triagem[chave] = {"decisao": dt, "motivo": (linha.get("motivo_triagem") or "").strip() or None,
                              "criterio": estado["decisoes_triagem"][chave].get("criterio", "E0")}
            if dt == "incluir":
                if not (linha.get("elegibilidade") or "").strip():
                    raise ValueError(f"{chave} foi incluído na triagem: preencha a coluna 'elegibilidade'")
                de = decisao(linha["elegibilidade"], "elegibilidade", chave)
                anterior = estado.get("decisoes_elegibilidade", {}).get(chave, {})
                elegibilidade[chave] = {"decisao": de, "criterio": anterior.get("criterio", "E0"),
                                        "motivo": (linha.get("motivo_elegibilidade") or "").strip() or None}
            antes = (estado["decisoes_triagem"][chave]["decisao"],
                     estado.get("decisoes_elegibilidade", {}).get(chave, {}).get("decisao"))
            depois = (dt, elegibilidade.get(chave, {}).get("decisao"))
            if antes != depois:
                mudancas.append(chave)

        estado["decisoes_triagem"] = triagem
        estado["decisoes_elegibilidade"] = elegibilidade
        estado["elegiveis"] = [c for c in estado["triados"] if triagem[c]["decisao"] == "incluir"]
        estado["incluidos"] = [c for c in estado["elegiveis"] if elegibilidade[c]["decisao"] == "incluir"]
        if not estado["incluidos"]:
            raise ValueError("Nenhum estudo incluído após a revisão dos autores.")
        estado["selecao_revisada_pelos_autores"] = True
        estado["prisma"] = self._prisma(estado)
        indice = ETAPAS.index("sintese")
        estado["concluidas"] = [e for e in estado["concluidas"] if ETAPAS.index(e) < indice]
        for chave in ("sintese", "secoes", "secoes_originais", "humanizacao", "resumos", "artigo", "checklist", "docx"):
            estado.pop(chave, None)
        self._salvar(artigo_id, estado)
        self._salvar_triagem_csv(artigo_id, estado)
        self.ledger.atualizar_artigo(artigo_id, status="em_andamento", etapa_atual="sintese", docx_path=None)
        self.ledger.evento(artigo_id, f"Seleção revisada pelos autores: {len(mudancas)} decisão(ões) alterada(s); "
                                      f"{len(estado['incluidos'])} estudos incluídos")
        return {"alteradas": mudancas, "prisma": estado["prisma"]}

    def _etapa_sintese(self, artigo_id, estado):
        linhas = {}
        incluidos = estado["incluidos"]
        for i in range(0, len(incluidos), 8):
            grupo = incluidos[i:i + 8]
            resposta, _ = self.cliente.completar_json(
                "tecnico", prompts.sintese(estado["protocolo"], self._para_prompt(estado, grupo)),
                etapa="sintese", artigo_id=artigo_id)
            for item in resposta if isinstance(resposta, list) else []:
                if isinstance(item, dict) and item.get("chave") in grupo:
                    linhas[item["chave"]] = item
        estado["sintese"] = []
        for chave in incluidos:
            r = self._reg(estado, chave)
            item = linhas.get(chave, {})
            primeiro = r.autores[0].rsplit(" ", 1)[0] if r.autores else "Autoria institucional"
            estado["sintese"].append({
                "chave": chave,
                "autor_ano": f"{primeiro}{' et al.' if len(r.autores) > 1 else ''}, {r.ano}",
                "titulo": r.titulo,
                "desenho": item.get("desenho") or "não informado no resumo",
                "populacao": item.get("populacao") or "não informado no resumo",
                "achados": item.get("achados") or "não informado no resumo",
            })

    def _etapa_contexto(self, artigo_id, estado):
        p = self._pedido(estado)
        chave_para = self._chaveador(estado)
        contexto = []
        if p.artigos_base:
            for r in self.pubmed.detalhes(p.artigos_base):
                contexto.append(chave_para(r))
        for consulta in estado["protocolo"].get("consultas_contexto", [])[:4]:
            try:
                _, ids, _ = self.pubmed.buscar_ids(self._filtros(p, "pubmed", consulta), limite=12)
            except Exception as e:
                self.ledger.evento(artigo_id, f"Consulta de contexto falhou: {e}", "aviso")
                continue
            for r in self.pubmed.detalhes(ids):
                if r.resumo:
                    contexto.append(chave_para(r))
        estado["contexto"] = [c for c in dict.fromkeys(contexto) if c not in estado["incluidos"]]
        self.ledger.evento(artigo_id, f"{len(estado['contexto'])} referências de contexto verificadas no PubMed")

    def _fatos_metodos(self, estado) -> dict:
        p = self._pedido(estado)
        protocolo = estado["protocolo"]
        return {
            "tipo_estudo": "revisão de literatura",
            "pergunta": protocolo["pergunta"],
            "data_da_busca": estado["busca"]["data"],
            "bases": [e["base"] for e in estado["busca"]["estrategias"]],
            "descritores_decs": protocolo.get("descritores_decs", []),
            "descritores_mesh": protocolo.get("descritores_mesh", []),
            "periodo": f"{p.periodo[0]} a {p.periodo[1]}",
            "idiomas": [IDIOMAS[i][0] for i in p.idiomas if i in IDIOMAS],
            "filtros_automaticos": "período de publicação e idioma aplicados na própria estratégia; excluídos "
                                   "editoriais, cartas e comentários (PubMed) e preprints (Europe PMC)",
            "criterios_inclusao": protocolo["criterios_inclusao"],
            "criterios_exclusao": protocolo["criterios_exclusao"],
            "selecao": "remoção de duplicatas entre bases (DOI, PMID e título); triagem por título e resumo; "
                       + ("avaliação de elegibilidade pela leitura na íntegra"
                          if self._processo_autores(estado).get("leitura_integra")
                          else "avaliação de elegibilidade pela leitura do resumo completo"),
            "extracao": "quadro-síntese com autor/ano, desenho do estudo, população e principais achados",
            "conduzido_pelos_autores": self._processo_autores(estado),
        }

    def _processo_autores(self, estado) -> dict:
        processo = {k: v for k, v in self._pedido(estado).contribuicao_autores.items() if v}
        if estado.get("selecao_revisada_pelos_autores"):
            processo.setdefault("revisao_da_selecao", "todas as decisões de triagem e elegibilidade foram revisadas "
                                                      "pelos autores")
        return processo

    def _etapa_metodos(self, artigo_id, estado):
        r = self.cliente.completar("tecnico", prompts.metodos(self._fatos_metodos(estado)),
                                   etapa="metodos", artigo_id=artigo_id, temperatura=0.4)
        estado.setdefault("secoes", {})["metodos"] = r.texto.strip()

    def _etapa_resultados(self, artigo_id, estado):
        incluidos = [{k: s[k] for k in ("chave", "autor_ano", "desenho", "populacao", "achados")}
                     for s in estado["sintese"]]
        r = self.cliente.completar("tecnico", prompts.resultados(estado["prisma"], incluidos),
                                   etapa="resultados", artigo_id=artigo_id, temperatura=0.4)
        estado["secoes"]["resultados"] = r.texto.strip()

    def _faltantes(self, estado) -> int:
        return max(0, MINIMO_REFERENCIAS + 2 - len(estado["incluidos"]))

    def _etapa_introducao(self, artigo_id, estado):
        contexto = self._para_prompt(estado, estado["contexto"])
        minimo = min(len(contexto), max(8, math.ceil(self._faltantes(estado) * 0.6)))
        r = self.cliente.completar("escrita", prompts.introducao(estado["protocolo"], contexto, minimo),
                                   etapa="introducao", artigo_id=artigo_id)
        estado["secoes"]["introducao"] = r.texto.strip()

    def _etapa_discussao(self, artigo_id, estado):
        contexto = self._para_prompt(estado, estado["contexto"])
        minimo = min(len(contexto) + len(estado["incluidos"]),
                     max(10, math.ceil(self._faltantes(estado) * 0.6) + len(estado["incluidos"]) // 2))
        sintese = [{k: s[k] for k in ("chave", "autor_ano", "desenho", "populacao", "achados")} for s in estado["sintese"]]
        r = self.cliente.completar("escrita", prompts.discussao(estado["protocolo"], sintese, contexto, minimo,
                                                                self._processo_autores(estado)),
                                   etapa="discussao", artigo_id=artigo_id)
        estado["secoes"]["discussao"] = r.texto.strip()

    def _citadas(self, estado) -> set[str]:
        validas = set(estado["registros"])
        citadas = {c for s in estado["secoes"].values() for c in chaves_citadas(s) if c in validas}
        return citadas | set(estado["incluidos"])  # incluídos sempre entram pelo quadro-síntese

    def _etapa_reforco_referencias(self, artigo_id, estado):
        citadas = self._citadas(estado)
        if len(citadas) >= MINIMO_REFERENCIAS:
            return
        disponiveis = [c for c in estado["contexto"] if c not in citadas]
        faltam = MINIMO_REFERENCIAS - len(citadas)
        if not disponiveis:
            self.ledger.evento(artigo_id, f"Só {len(citadas)} referências e nenhuma de contexto sobrando", "aviso")
            return
        pedido = (f"A discussão abaixo precisa citar pelo menos mais {faltam + 2} referências distintas desta lista, "
                  "apenas onde forem pertinentes ao argumento (sem forçar). Reescreva a discussão integrando-as, "
                  "mantendo todo o conteúdo e todas as citações existentes. Devolva só o texto.\n\n"
                  f"Referências disponíveis:\n{prompts._refs(self._para_prompt(estado, disponiveis))}\n\n"
                  f"Discussão:\n{estado['secoes']['discussao']}")
        r = self.cliente.completar("escrita", [{"role": "system", "content": prompts.SISTEMA},
                                               {"role": "user", "content": pedido}],
                                   etapa="reforco_referencias", artigo_id=artigo_id)
        if set(chaves_citadas(estado["secoes"]["discussao"])) <= set(chaves_citadas(r.texto)):
            estado["secoes"]["discussao"] = r.texto.strip()
        else:
            self.ledger.evento(artigo_id, "Reforço de referências descartado: removia citações existentes", "aviso")

    def _etapa_conclusao(self, artigo_id, estado):
        r = self.cliente.completar("escrita", prompts.conclusao(estado["protocolo"], estado["secoes"]["discussao"]),
                                   etapa="conclusao", artigo_id=artigo_id)
        estado["secoes"]["conclusao"] = re.sub(r"\[\s*R\d+[^\]]*\]", "", r.texto).strip()

    def _etapa_humanizacao(self, artigo_id, estado):
        estado.setdefault("secoes_originais", dict(estado["secoes"]))
        estado.setdefault("humanizacao", {})
        for secao in SECOES:
            if secao in estado["humanizacao"]:
                continue
            original = estado["secoes_originais"][secao]
            melhor = None
            for _ in range(2):
                r = self.cliente.completar("escrita", prompts.humanizar(secao, original),
                                           etapa=f"humanizacao_{secao}", artigo_id=artigo_id, temperatura=0.9)
                resultado = mesclar_humanizacao(original, r.texto)
                if melhor is None or resultado[1] > melhor[1]:
                    melhor = resultado
                if resultado[1] == resultado[2]:
                    break
                self.ledger.evento(artigo_id, f"Humanização de {secao}: {resultado[2] - resultado[1]} parágrafo(s) "
                                              f"mudariam o conteúdo ({'; '.join(resultado[3][:3])}); refazendo", "aviso")
            final, aceitos, total, problemas = melhor
            if problemas and aceitos < total:
                self.ledger.evento(artigo_id, f"Humanização de {secao}: {total - aceitos} parágrafo(s) mantidos como "
                                              "estavam para preservar o sentido", "aviso")
            estado["secoes"][secao] = final
            estado["humanizacao"][secao] = "aplicada" if aceitos == total else "parcial" if aceitos else "rejeitada"
            self._salvar(artigo_id, estado)

    def _etapa_resumos(self, artigo_id, estado):
        texto = {s: texto_plano(re.sub(r"\[\s*R\d+[^\]]*\]", "", estado["secoes"][s])) for s in SECOES}
        dados, _ = self.cliente.completar_json(
            "escrita", prompts.resumos(estado["protocolo"].get("titulo_provisorio", ""), texto),
            etapa="resumos", artigo_id=artigo_id, temperatura=0.5)
        estado["resumos"] = dados

    def _etapa_montagem(self, artigo_id, estado):
        p = self._pedido(estado)
        numerador = Numerador(set(estado["registros"]))
        secoes = {}
        for secao in ("introducao", "metodos", "resultados"):
            secoes[secao] = numerador.resolver(estado["secoes"][secao])
        sintese = []
        for linha in estado["sintese"]:  # quadro-síntese vem logo após Resultados
            sintese.append({**linha, "citacao": numerador.resolver(f"[{linha['chave']}]")})
        for secao in ("discussao", "conclusao"):
            secoes[secao] = numerador.resolver(estado["secoes"][secao])

        formatar = FORMATOS.get(p.formato_referencias, FORMATOS["vancouver"])
        referencias = [formatar(self._reg(estado, chave)) for chave in numerador.ordem]
        if numerador.bloqueadas:
            self.ledger.evento(artigo_id, f"Citações inexistentes bloqueadas: {sorted(set(numerador.bloqueadas))}",
                               "aviso")
        if len(referencias) < MINIMO_REFERENCIAS:
            self.ledger.evento(artigo_id, f"Artigo com {len(referencias)} referências (mínimo {MINIMO_REFERENCIAS})",
                               "aviso")
        resumos = estado.get("resumos", {})
        estado["artigo"] = {
            "id": artigo_id,
            "titulo": resumos.get("titulo") or estado["protocolo"].get("titulo_provisorio", p.tema),
            "title": resumos.get("title", ""),
            "autores": p.autores, "orientador": p.orientador, "instituicao": p.instituicao,
            "revista": p.revista, "formato_citacao": p.formato_citacao, "formato_referencias": p.formato_referencias,
            "resumo": resumos.get("resumo", ""), "palavras_chave": resumos.get("palavras_chave", []),
            "abstract": resumos.get("abstract", ""), "keywords": resumos.get("keywords", []),
            "secoes": secoes,
            "estrategias": estado["busca"]["estrategias"], "data_busca": estado["busca"]["data"],
            "prisma": estado["prisma"],
            "sintese": sintese,
            "referencias": referencias,
            "referencias_chaves": numerador.ordem,
            "citacoes_bloqueadas": sorted(set(numerador.bloqueadas)),
            "humanizacao": estado.get("humanizacao", {}),
        }

    def _etapa_checklist(self, artigo_id, estado):
        artigo = estado["artigo"]
        texto = "\n\n".join(f"{nome.upper()}\n{texto_plano(artigo['secoes'][nome])}" for nome in SECOES)
        try:
            itens, _ = self.cliente.completar_json("tecnico", prompts.checklist(texto), etapa="checklist",
                                                   artigo_id=artigo_id)
            estado["checklist"] = [
                {"item": prompts.CHECKLIST[int(i["item"]) - 1], "ok": bool(i.get("ok")),
                 "observacao": i.get("observacao", "")}
                for i in itens if isinstance(i, dict) and str(i.get("item", "")).isdigit()
                and 1 <= int(i["item"]) <= len(prompts.CHECKLIST)
            ]
        except Exception as e:  # checklist não bloqueia a entrega do .docx
            self.ledger.evento(artigo_id, f"Checklist não executado: {e}", "aviso")
            estado["checklist"] = []
        artigo["checklist"] = estado["checklist"]

    def _etapa_exportacao(self, artigo_id, estado):
        from .docx_export import exportar_docx, exportar_markdown

        pasta = self.pasta(artigo_id)
        (pasta / "artigo.json").write_text(json.dumps(estado["artigo"], ensure_ascii=False, indent=1), encoding="utf-8")
        exportar_markdown(estado["artigo"], pasta / "artigo.md")
        docx = exportar_docx(estado["artigo"], pasta / "artigo.docx")
        estado["docx"] = str(docx)
        self.ledger.atualizar_artigo(artigo_id, docx_path=str(docx))
        self.ledger.evento(artigo_id, f"DOCX exportado: {docx}")


def _numeros(texto: str) -> set[str]:
    sem_citacoes = re.sub(r"\[\s*R\d+[^\]]*\]", " ", texto)
    return {n.replace(",", ".") for n in re.findall(r"(?<![\w])\d+(?:[.,]\d+)?", sem_citacoes)}


# Força das afirmações. Só formas verbais/expressões específicas: "resultados" (substantivo) não conta como
# "resulta em", e "causa de óbito" só pesa se a reescrita acrescentar uma ocorrência nova.
MODALIZADORES = [
    "sugere", "sugerem", "sugeriu", "sugeriram", "sugerindo", "pode", "podem", "poderia", "poderiam",
    "possivelmente", "provavelmente", "parece", "parecem", "aparentemente", "associou-se", "associaram-se",
    "associado", "associada", "associados", "associadas", "associação", "associações", "tendência", "indício",
    "indícios", "hipótese",
]
AFIRMACOES_FORTES = [
    "demonstra", "demonstram", "demonstrou", "demonstraram", "comprova", "comprovam", "comprovou", "comprovaram",
    "prova", "provam", "provou", "causa", "causam", "causou", "causaram", "eleva", "elevam", "elevou", "elevaram",
    "determina", "determinam", "determinou", "garante", "garantem", "aumenta o risco", "aumentam o risco",
    "reduz o risco", "reduzem o risco", "é responsável", "são responsáveis", "leva a", "levam a", "resulta em",
    "resultam em", "indica", "indicam", "indicou", "confirma", "confirmam", "confirmou", "corrobora", "corroboram",
    "corroborou", "evidencia", "evidenciam", "evidenciou", "mostra", "mostram", "mostrou", "mostraram",
    "estabelece", "estabelecem", "inequivocamente", "claramente", "certamente", "sem dúvida",
]
DESENHOS = {
    "ensaio clínico": r"ensaios? cl[ií]nicos?", "randomizado": r"randomizad[oa]s?", "coorte": r"coortes?",
    "caso-controle": r"casos?[- ]controles?", "transversal": r"transversa(?:l|is)",
    "série de casos": r"s[ée]ries? de casos?", "relato de caso": r"relatos? de casos?",
    "revisão sistemática": r"revis(?:ão|ões) sistem[aá]ticas?", "metanálise": r"meta-?an[aá]lises?",
    "ecológico": r"ecol[oó]gic[oa]s?", "qualitativo": r"qualitativ[oa]s?", "longitudinal": r"longitudina(?:l|is)",
    "prospectivo": r"prospectiv[oa]s?", "retrospectivo": r"retrospectiv[oa]s?",
}


def _ocorrencias(texto: str, termos: list[str]) -> int:
    minusculo = texto.lower()
    return sum(len(re.findall(rf"(?<![\wà-ÿ-]){re.escape(t)}(?![\wà-ÿ-])", minusculo)) for t in termos)


def _desenhos(texto: str) -> set[str]:
    return {nome for nome, rx in DESENHOS.items() if re.search(rx, texto, re.I)}


def _problema_forca(original: str, novo: str) -> str | None:
    mod_o, mod_n = _ocorrencias(original, MODALIZADORES), _ocorrencias(novo, MODALIZADORES)
    if mod_n < mod_o:
        return f"modalizador removido ({mod_o}→{mod_n}): afirmação ficou mais forte"
    if mod_n > mod_o:
        return f"modalizador acrescentado ({mod_o}→{mod_n}): afirmação ficou mais fraca"
    forte_o, forte_n = _ocorrencias(original, AFIRMACOES_FORTES), _ocorrencias(novo, AFIRMACOES_FORTES)
    if forte_n > forte_o:
        return f"verbo de certeza/causalidade acrescentado ({forte_o}→{forte_n})"
    des_o, des_n = _desenhos(original), _desenhos(novo)
    if des_o != des_n:
        return f"desenho de estudo alterado ({sorted(des_o)}→{sorted(des_n)})"
    return None


def _problema_humanizacao(original: str, novo: str) -> str | None:
    """A humanização só pode mudar a forma: mesmas citações, números, força das afirmações e desenhos."""
    if len(novo.strip()) < 0.6 * len(original.strip()):
        return "texto encurtado demais"
    cit_o, cit_n = set(chaves_citadas(original)), set(chaves_citadas(novo))
    if cit_o != cit_n:
        return f"citações alteradas (faltando {sorted(cit_o - cit_n)}, novas {sorted(cit_n - cit_o)})"
    num_o, num_n = _numeros(original), _numeros(novo)
    if num_o != num_n:
        return f"números alterados (faltando {sorted(num_o - num_n)[:5]}, novos {sorted(num_n - num_o)[:5]})"
    return _problema_forca(original, novo)


def _paragrafos(texto: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n\s*\n", texto.strip()) if p.strip()]


def mesclar_humanizacao(original: str, novo: str) -> tuple[str, int, int, list[str]]:
    """Aceita a reescrita parágrafo a parágrafo; o que mudar o conteúdo volta ao texto original.

    Devolve (texto final, parágrafos aceitos, total de parágrafos, problemas encontrados).
    """
    orig, nov = _paragrafos(original), _paragrafos(novo)
    if len(orig) != len(nov):  # a reescrita juntou/separou parágrafos: avalia a seção inteira
        problema = _problema_humanizacao(original, novo)
        return (original.strip(), 0, len(orig), [problema]) if problema else (novo.strip(), len(orig), len(orig), [])
    saida, aceitos, problemas = [], 0, []
    for o, n in zip(orig, nov):
        problema = _problema_humanizacao(o, n)
        if problema:
            saida.append(o)
            problemas.append(problema)
        else:
            saida.append(n)
            aceitos += 1
    return "\n\n".join(saida), aceitos, len(orig), problemas
