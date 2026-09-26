"""Configuração: variáveis de ambiente + escada de modelos (config/escada.json)."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ARQUIVO_ESCADA_PADRAO = RAIZ / "config" / "escada.json"

PAPEIS = ("escrita", "tecnico", "triagem")


@dataclass(frozen=True)
class Modelo:
    id: str
    nome: str
    provedor: str
    entrada_usd_mtok: float | None = None
    saida_usd_mtok: float | None = None
    # True quando o OmniRoute serve esse modelo por assinatura/cota gratuita:
    # o gasto real é zero, mas o painel ainda mostra o custo equivalente de API.
    gratuito_no_omniroute: bool = False
    contexto: int | None = None

    def custo_api_usd(self, tokens_entrada: int, tokens_saida: int) -> float | None:
        if self.entrada_usd_mtok is None or self.saida_usd_mtok is None:
            return None
        return (tokens_entrada * self.entrada_usd_mtok + tokens_saida * self.saida_usd_mtok) / 1_000_000

    def custo_real_usd(self, tokens_entrada: int, tokens_saida: int) -> float | None:
        if self.gratuito_no_omniroute:
            return 0.0
        return self.custo_api_usd(tokens_entrada, tokens_saida)


@dataclass
class Config:
    base_url: str
    api_key: str | None
    escadas: dict[str, list[str]]
    modelos: dict[str, Modelo]
    cotacao_usd_brl: float
    dir_dados: Path
    timeout_s: float = 300.0
    tentativas_por_degrau: int = 2
    ncbi_api_key: str | None = None
    ncbi_email: str | None = None
    extras: dict = field(default_factory=dict)

    def modelo(self, modelo_id: str) -> Modelo:
        # Modelo fora da tabela de preços ainda pode ser usado; o custo fica "desconhecido".
        return self.modelos.get(modelo_id) or Modelo(id=modelo_id, nome=modelo_id, provedor="?")

    def escada(self, papel: str) -> list[str]:
        if papel not in self.escadas or not self.escadas[papel]:
            raise ValueError(f"Escada '{papel}' não configurada em escada.json")
        return self.escadas[papel]


def carregar_config(arquivo_escada: str | Path | None = None) -> Config:
    caminho = Path(arquivo_escada or os.environ.get("ARTIGOS_ESCADA") or ARQUIVO_ESCADA_PADRAO)
    dados = json.loads(caminho.read_text(encoding="utf-8"))

    modelos = {}
    for m in dados.get("modelos", []):
        modelo = Modelo(
            id=m["id"],
            nome=m.get("nome", m["id"]),
            provedor=m.get("provedor", "?"),
            entrada_usd_mtok=m.get("entrada_usd_mtok"),
            saida_usd_mtok=m.get("saida_usd_mtok"),
            gratuito_no_omniroute=bool(m.get("gratuito_no_omniroute", False)),
            contexto=m.get("contexto"),
        )
        modelos[modelo.id] = modelo

    escadas = {papel: list(ids) for papel, ids in dados.get("escadas", {}).items()}
    for papel in PAPEIS:
        if papel not in escadas:
            raise ValueError(f"escada.json sem a escada obrigatória '{papel}'")

    return Config(
        base_url=os.environ.get("OMNIROUTE_BASE_URL", dados.get("base_url", "http://localhost:20128/v1")).rstrip("/"),
        api_key=os.environ.get("OMNIROUTE_API_KEY") or None,
        escadas=escadas,
        modelos=modelos,
        cotacao_usd_brl=float(os.environ.get("COTACAO_USD_BRL", dados.get("cotacao_usd_brl", 5.4))),
        dir_dados=Path(os.environ.get("ARTIGOS_DADOS", RAIZ / "dados")),
        timeout_s=float(os.environ.get("OMNIROUTE_TIMEOUT_S", dados.get("timeout_s", 300))),
        tentativas_por_degrau=int(dados.get("tentativas_por_degrau", 2)),
        ncbi_api_key=os.environ.get("NCBI_API_KEY") or None,
        ncbi_email=os.environ.get("NCBI_EMAIL") or None,
        extras=dados.get("extras", {}),
    )
