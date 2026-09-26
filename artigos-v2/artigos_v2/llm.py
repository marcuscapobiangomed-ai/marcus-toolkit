"""Cliente OmniRoute (API compatível com OpenAI) com escada de fallback.

Cada papel (escrita / tecnico / triagem) tem uma escada ordenada de modelos.
A chamada tenta o degrau 0; se falhar (erro, cota, resposta vazia), repete e
depois desce um degrau. Toda tentativa — sucesso ou falha — vai para o ledger
com o modelo, os tokens e o custo, que é o que o painel mostra.
"""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Callable

from .config import Config
from .ledger import Ledger


class ErroEscada(RuntimeError):
    """Todos os degraus da escada falharam."""


class _ErroHTTP(Exception):
    def __init__(self, status: int | None, mensagem: str):
        super().__init__(mensagem)
        self.status = status


# Status em que vale a pena repetir no mesmo modelo antes de descer a escada.
STATUS_TRANSITORIOS = {408, 409, 425, 429, 500, 502, 503, 504, 529}


@dataclass
class Resposta:
    texto: str
    modelo_solicitado: str
    modelo_respondeu: str
    degrau: int
    tokens_entrada: int
    tokens_saida: int
    custo_real_usd: float | None
    custo_api_usd: float | None


Transporte = Callable[[str, dict, dict, float], dict]


def transporte_http(url: str, cabecalhos: dict, corpo: dict, timeout: float) -> dict:
    requisicao = urllib.request.Request(
        url, data=json.dumps(corpo).encode("utf-8"), headers=cabecalhos, method="POST"
    )
    try:
        with urllib.request.urlopen(requisicao, timeout=timeout) as resposta:
            dados = json.loads(resposta.read().decode("utf-8"))
            # O OmniRoute informa custo e tokens reais em cabeçalhos X-OmniRoute-*.
            dados["_cabecalhos"] = {k.lower(): v for k, v in resposta.headers.items()
                                    if k.lower().startswith("x-omniroute-")}
            return dados
    except urllib.error.HTTPError as e:
        detalhe = e.read().decode("utf-8", "replace")[:500]
        raise _ErroHTTP(e.code, f"HTTP {e.code}: {detalhe}") from e
    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise _ErroHTTP(None, f"falha de conexão: {e}") from e


def _estimar_tokens(texto: str) -> int:
    return max(1, len(texto) // 4)


def _numero(valor, tipo):
    try:
        return tipo(str(valor).strip().lstrip("$")) if valor not in (None, "") else None
    except ValueError:
        return None


class ClienteOmniRoute:
    def __init__(self, config: Config, ledger: Ledger, transporte: Transporte | None = None,
                 espera_base_s: float = 2.0):
        self.config = config
        self.ledger = ledger
        self.transporte = transporte or transporte_http
        self.espera_base_s = espera_base_s

    def completar(self, papel: str, mensagens: list[dict], *, etapa: str, artigo_id: str | None = None,
                  temperatura: float = 0.7, max_tokens: int | None = None) -> Resposta:
        erros = []
        for degrau, modelo_id in enumerate(self.config.escada(papel)):
            for tentativa in range(self.config.tentativas_por_degrau):
                try:
                    return self._chamar(papel, degrau, modelo_id, mensagens, etapa, artigo_id,
                                        temperatura, max_tokens)
                except _ErroHTTP as e:
                    erros.append(f"{modelo_id}: {e}")
                    transitorio = e.status is None or e.status in STATUS_TRANSITORIOS
                    if not transitorio:
                        break  # erro permanente (modelo inexistente, 400, 401...): desce a escada
                    if tentativa + 1 < self.config.tentativas_por_degrau:
                        time.sleep(self.espera_base_s * (2 ** tentativa))
        raise ErroEscada(f"Escada '{papel}' esgotada na etapa '{etapa}': " + " | ".join(erros[-6:]))

    def completar_json(self, papel: str, mensagens: list[dict], *, etapa: str, artigo_id: str | None = None,
                       temperatura: float = 0.2, max_tokens: int | None = None):
        """Pede JSON e valida. Uma resposta inválida conta como nova chamada (e custo)."""
        historico = list(mensagens)
        ultimo_erro = None
        for _ in range(2):
            resposta = self.completar(papel, historico, etapa=etapa, artigo_id=artigo_id,
                                      temperatura=temperatura, max_tokens=max_tokens)
            try:
                return extrair_json(resposta.texto), resposta
            except ValueError as e:
                ultimo_erro = e
                historico = historico + [
                    {"role": "assistant", "content": resposta.texto},
                    {"role": "user", "content": "A resposta anterior não era JSON válido. "
                                                "Responda de novo SOMENTE com o JSON pedido, sem comentários."},
                ]
        raise ErroEscada(f"Etapa '{etapa}': modelo não devolveu JSON válido ({ultimo_erro})")

    def _chamar(self, papel, degrau, modelo_id, mensagens, etapa, artigo_id, temperatura, max_tokens) -> Resposta:
        # O OmniRoute comprime prompts/saídas por padrão (Caveman/"terse prose"), o que degrada texto longo.
        cabecalhos = {"Content-Type": "application/json", "x-omniroute-compression": "off"}
        if self.config.api_key:
            cabecalhos["Authorization"] = f"Bearer {self.config.api_key}"
        corpo = {"model": modelo_id, "messages": mensagens, "temperature": temperatura, "stream": False}
        if max_tokens:
            corpo["max_tokens"] = max_tokens

        inicio = time.monotonic()
        registro = dict(artigo_id=artigo_id, etapa=etapa, papel=papel, degrau=degrau, modelo_solicitado=modelo_id)
        try:
            dados = self.transporte(f"{self.config.base_url}/chat/completions", cabecalhos, corpo,
                                    self.config.timeout_s)
            texto = ((dados.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
            if isinstance(texto, list):  # alguns provedores devolvem partes
                texto = "".join(p.get("text", "") for p in texto if isinstance(p, dict))
            if not texto.strip():
                raise _ErroHTTP(None, "resposta vazia")
        except _ErroHTTP as e:
            self.ledger.registrar_chamada(**registro, sucesso=0, erro=str(e)[:500],
                                          latencia_ms=int((time.monotonic() - inicio) * 1000))
            raise

        uso = dados.get("usage") or {}
        cabecalhos_omni = dados.get("_cabecalhos") or {}
        tokens_entrada = uso.get("prompt_tokens", _numero(cabecalhos_omni.get("x-omniroute-tokens-in"), int))
        tokens_saida = uso.get("completion_tokens", _numero(cabecalhos_omni.get("x-omniroute-tokens-out"), int))
        estimados = tokens_entrada is None or tokens_saida is None
        if estimados:
            tokens_entrada = _estimar_tokens(" ".join(str(m.get("content", "")) for m in mensagens))
            tokens_saida = _estimar_tokens(texto)

        modelo_respondeu = dados.get("model") or modelo_id
        modelo = self.config.modelo(modelo_id)
        if modelo_respondeu not in (modelo_id, modelo.id) and modelo_respondeu in self.config.modelos:
            modelo = self.config.modelos[modelo_respondeu]  # combo do OmniRoute respondeu com outro modelo
        custo_api = modelo.custo_api_usd(tokens_entrada, tokens_saida)
        custo_informado = _numero(cabecalhos_omni.get("x-omniroute-response-cost"), float)
        custo_real = custo_informado if custo_informado is not None else modelo.custo_real_usd(tokens_entrada,
                                                                                               tokens_saida)

        self.ledger.registrar_chamada(
            **registro, modelo_respondeu=modelo_respondeu, sucesso=1,
            tokens_entrada=tokens_entrada, tokens_saida=tokens_saida, tokens_estimados=int(estimados),
            custo_real_usd=custo_real, custo_api_usd=custo_api,
            latencia_ms=int((time.monotonic() - inicio) * 1000),
        )
        return Resposta(texto=texto, modelo_solicitado=modelo_id, modelo_respondeu=modelo_respondeu,
                        degrau=degrau, tokens_entrada=tokens_entrada, tokens_saida=tokens_saida,
                        custo_real_usd=custo_real, custo_api_usd=custo_api)

    def listar_modelos(self) -> list[str]:
        """GET /models do OmniRoute — usado por `python -m artigos_v2 modelos`."""
        cabecalhos = {}
        if self.config.api_key:
            cabecalhos["Authorization"] = f"Bearer {self.config.api_key}"
        requisicao = urllib.request.Request(f"{self.config.base_url}/models", headers=cabecalhos)
        with urllib.request.urlopen(requisicao, timeout=30) as resposta:
            dados = json.loads(resposta.read().decode("utf-8"))
        return sorted(m.get("id", "") for m in dados.get("data", []))


def extrair_json(texto: str):
    """Extrai o primeiro objeto/lista JSON de uma resposta (tolera ```json ... ``` e texto em volta)."""
    bloco = re.search(r"```(?:json)?\s*(.*?)```", texto, re.S)
    candidato = bloco.group(1) if bloco else texto
    candidato = candidato.strip()
    try:
        return json.loads(candidato)
    except json.JSONDecodeError:
        pass
    inicios = [i for i in (candidato.find("{"), candidato.find("[")) if i >= 0]
    if not inicios:
        raise ValueError("nenhum JSON encontrado")
    inicio = min(inicios)
    fim = max(candidato.rfind("}"), candidato.rfind("]"))
    if fim <= inicio:
        raise ValueError("JSON incompleto")
    try:
        return json.loads(candidato[inicio:fim + 1])
    except json.JSONDecodeError as e:
        raise ValueError(str(e)) from e
