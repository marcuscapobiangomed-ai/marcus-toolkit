"""Registro (SQLite) de artigos e de cada chamada de IA: modelo usado, tokens e custo.

É a fonte de dados do painel. O pipeline escreve; o painel só lê.
"""

from __future__ import annotations

import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

ESQUEMA = """
CREATE TABLE IF NOT EXISTS artigos (
    id TEXT PRIMARY KEY,
    tema TEXT NOT NULL,
    revista TEXT,
    status TEXT NOT NULL,           -- em_andamento | concluido | erro
    etapa_atual TEXT,
    criado_em TEXT NOT NULL,
    finalizado_em TEXT,
    docx_path TEXT,
    erro TEXT
);
CREATE TABLE IF NOT EXISTS chamadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artigo_id TEXT,
    etapa TEXT NOT NULL,
    papel TEXT NOT NULL,            -- escrita | tecnico | triagem | auditoria
    degrau INTEGER NOT NULL,        -- posição do modelo na escada (0 = primeira escolha)
    modelo_solicitado TEXT NOT NULL,
    modelo_respondeu TEXT,
    sucesso INTEGER NOT NULL,
    erro TEXT,
    tokens_entrada INTEGER DEFAULT 0,
    tokens_saida INTEGER DEFAULT 0,
    tokens_estimados INTEGER DEFAULT 0,
    custo_real_usd REAL,
    custo_api_usd REAL,
    latencia_ms INTEGER,
    criado_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chamadas_artigo ON chamadas(artigo_id);
CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artigo_id TEXT,
    nivel TEXT NOT NULL,            -- info | aviso | erro
    mensagem TEXT NOT NULL,
    criado_em TEXT NOT NULL
);
"""


def agora() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Ledger:
    def __init__(self, caminho: str | Path):
        self.caminho = Path(caminho)
        self.caminho.parent.mkdir(parents=True, exist_ok=True)
        with self._conexao() as c:
            c.execute("PRAGMA journal_mode=WAL")
            c.executescript(ESQUEMA)

    @contextmanager
    def _conexao(self):
        conexao = sqlite3.connect(self.caminho, timeout=30)
        conexao.row_factory = sqlite3.Row
        try:
            yield conexao
            conexao.commit()
        finally:
            conexao.close()

    # --- artigos -----------------------------------------------------------

    def novo_artigo(self, tema: str, revista: str | None) -> str:
        artigo_id = datetime.now().strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:6]
        with self._conexao() as c:
            c.execute(
                "INSERT INTO artigos (id, tema, revista, status, criado_em) VALUES (?, ?, ?, 'em_andamento', ?)",
                (artigo_id, tema, revista, agora()),
            )
        return artigo_id

    def atualizar_artigo(self, artigo_id: str, **campos) -> None:
        if not campos:
            return
        colunas = ", ".join(f"{k} = ?" for k in campos)
        with self._conexao() as c:
            c.execute(f"UPDATE artigos SET {colunas} WHERE id = ?", (*campos.values(), artigo_id))

    def artigo(self, artigo_id: str) -> dict | None:
        with self._conexao() as c:
            linha = c.execute("SELECT * FROM artigos WHERE id = ?", (artigo_id,)).fetchone()
        return dict(linha) if linha else None

    def artigos(self) -> list[dict]:
        with self._conexao() as c:
            linhas = c.execute(
                """
                SELECT a.*,
                       COALESCE(SUM(ch.custo_real_usd), 0) AS custo_real_usd,
                       COALESCE(SUM(ch.custo_api_usd), 0) AS custo_api_usd,
                       COALESCE(SUM(ch.tokens_entrada), 0) AS tokens_entrada,
                       COALESCE(SUM(ch.tokens_saida), 0) AS tokens_saida,
                       COUNT(ch.id) AS chamadas,
                       COALESCE(SUM(CASE WHEN ch.sucesso = 0 THEN 1 ELSE 0 END), 0) AS falhas
                FROM artigos a LEFT JOIN chamadas ch ON ch.artigo_id = a.id
                GROUP BY a.id ORDER BY a.criado_em DESC
                """
            ).fetchall()
        return [dict(l) for l in linhas]

    # --- chamadas ----------------------------------------------------------

    def registrar_chamada(self, **dados) -> None:
        dados.setdefault("criado_em", agora())
        colunas = ", ".join(dados)
        marcadores = ", ".join("?" for _ in dados)
        with self._conexao() as c:
            c.execute(f"INSERT INTO chamadas ({colunas}) VALUES ({marcadores})", tuple(dados.values()))

    def chamadas(self, artigo_id: str | None = None, limite: int = 500) -> list[dict]:
        with self._conexao() as c:
            if artigo_id:
                linhas = c.execute(
                    "SELECT * FROM chamadas WHERE artigo_id = ? ORDER BY id", (artigo_id,)
                ).fetchall()
            else:
                linhas = c.execute("SELECT * FROM chamadas ORDER BY id DESC LIMIT ?", (limite,)).fetchall()
        return [dict(l) for l in linhas]

    def agregado(self, por: str, artigo_id: str | None = None) -> list[dict]:
        if por not in ("modelo_respondeu", "modelo_solicitado", "etapa", "papel"):
            raise ValueError(por)
        filtro, params = ("WHERE artigo_id = ?", (artigo_id,)) if artigo_id else ("", ())
        coluna = "COALESCE(modelo_respondeu, modelo_solicitado)" if por == "modelo_respondeu" else por
        with self._conexao() as c:
            linhas = c.execute(
                f"""
                SELECT {coluna} AS chave,
                       SUM(CASE WHEN sucesso = 1 THEN 1 ELSE 0 END) AS chamadas_ok,
                       SUM(CASE WHEN sucesso = 0 THEN 1 ELSE 0 END) AS falhas,
                       COALESCE(SUM(tokens_entrada), 0) AS tokens_entrada,
                       COALESCE(SUM(tokens_saida), 0) AS tokens_saida,
                       COALESCE(SUM(custo_real_usd), 0) AS custo_real_usd,
                       COALESCE(SUM(custo_api_usd), 0) AS custo_api_usd,
                       SUM(CASE WHEN custo_api_usd IS NULL AND sucesso = 1 THEN 1 ELSE 0 END) AS sem_preco
                FROM chamadas {filtro}
                GROUP BY chave ORDER BY custo_api_usd DESC
                """,
                params,
            ).fetchall()
        return [dict(l) for l in linhas]

    # --- eventos -----------------------------------------------------------

    def evento(self, artigo_id: str | None, mensagem: str, nivel: str = "info") -> None:
        with self._conexao() as c:
            c.execute(
                "INSERT INTO eventos (artigo_id, nivel, mensagem, criado_em) VALUES (?, ?, ?, ?)",
                (artigo_id, nivel, mensagem, agora()),
            )

    def eventos(self, artigo_id: str, limite: int = 200) -> list[dict]:
        with self._conexao() as c:
            linhas = c.execute(
                "SELECT * FROM eventos WHERE artigo_id = ? ORDER BY id DESC LIMIT ?", (artigo_id, limite)
            ).fetchall()
        return [dict(l) for l in linhas]
