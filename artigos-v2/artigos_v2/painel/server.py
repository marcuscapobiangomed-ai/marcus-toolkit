"""Painel local: gasto de IA, modelo usado em cada etapa e download do .docx.

python -m artigos_v2 painel  →  http://127.0.0.1:8765
"""

from __future__ import annotations

import json
import re
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from ..config import Config
from ..ledger import Ledger

INDEX = Path(__file__).with_name("index.html")


def _modelos_por_artigo(ledger: Ledger, artigo_id: str) -> list[dict]:
    return [m for m in ledger.agregado("modelo_respondeu", artigo_id) if m["chamadas_ok"]]


def resumo(ledger: Ledger, config: Config) -> dict:
    artigos = ledger.artigos()
    chamadas = ledger.chamadas(limite=100000)
    ok = [c for c in chamadas if c["sucesso"]]
    real = sum(c["custo_real_usd"] or 0 for c in ok)
    api = sum(c["custo_api_usd"] or 0 for c in ok)
    concluidos = [a for a in artigos if a["status"] == "concluido"]
    return {
        "cotacao_usd_brl": config.cotacao_usd_brl,
        "gasto_real_usd": real,
        "custo_api_usd": api,
        "artigos": len(artigos),
        "concluidos": len(concluidos),
        "em_andamento": sum(1 for a in artigos if a["status"] == "em_andamento"),
        "com_erro": sum(1 for a in artigos if a["status"] == "erro"),
        "custo_medio_real_usd": (sum(a["custo_real_usd"] for a in concluidos) / len(concluidos)) if concluidos else None,
        "custo_medio_api_usd": (sum(a["custo_api_usd"] for a in concluidos) / len(concluidos)) if concluidos else None,
        "tokens_entrada": sum(c["tokens_entrada"] or 0 for c in ok),
        "tokens_saida": sum(c["tokens_saida"] or 0 for c in ok),
        "chamadas": len(ok),
        "falhas": len(chamadas) - len(ok),
        "chamadas_fallback": sum(1 for c in ok if c["degrau"] > 0),
        "sem_preco": sorted({c["modelo_respondeu"] or c["modelo_solicitado"] for c in ok if c["custo_api_usd"] is None}),
    }


def criar_handler(ledger: Ledger, config: Config):
    raiz_dados = config.dir_dados.resolve()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):  # silencioso
            pass

        def _json(self, dados, status=HTTPStatus.OK):
            corpo = json.dumps(dados, ensure_ascii=False, default=str).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(corpo)))
            self.end_headers()
            self.wfile.write(corpo)

        def do_GET(self):
            url = urlparse(self.path)
            consulta = parse_qs(url.query)
            artigo_id = (consulta.get("artigo") or [None])[0]
            caminho = url.path

            if caminho in ("/", "/index.html"):
                corpo = INDEX.read_bytes()
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(corpo)))
                self.end_headers()
                self.wfile.write(corpo)
            elif caminho == "/api/resumo":
                self._json(resumo(ledger, config))
            elif caminho == "/api/artigos":
                artigos = ledger.artigos()
                for a in artigos:
                    a["modelos"] = [{"modelo": m["chave"], "nome": config.modelo(m["chave"]).nome,
                                     "chamadas": m["chamadas_ok"]} for m in _modelos_por_artigo(ledger, a["id"])]
                    a["tem_docx"] = bool(a.get("docx_path")) and Path(a["docx_path"]).exists()
                self._json(artigos)
            elif caminho == "/api/modelos":
                self._json([{**m, "nome": config.modelo(m["chave"]).nome}
                            for m in ledger.agregado("modelo_respondeu", artigo_id)])
            elif caminho == "/api/etapas":
                self._json(ledger.agregado("etapa", artigo_id))
            elif caminho == "/api/escada":
                self._json({
                    papel: [{"id": m, "nome": config.modelo(m).nome, "provedor": config.modelo(m).provedor,
                             "entrada_usd_mtok": config.modelo(m).entrada_usd_mtok,
                             "saida_usd_mtok": config.modelo(m).saida_usd_mtok,
                             "gratuito": config.modelo(m).gratuito_no_omniroute} for m in ids]
                    for papel, ids in config.escadas.items()})
            elif m := re.fullmatch(r"/api/artigos/([\w\-]+)", caminho):
                artigo = ledger.artigo(m.group(1))
                if not artigo:
                    return self._json({"erro": "artigo não encontrado"}, HTTPStatus.NOT_FOUND)
                auditoria = raiz_dados / "artigos" / artigo["id"] / "auditoria.json"
                self._json({
                    "artigo": artigo,
                    "chamadas": ledger.chamadas(artigo["id"]),
                    "eventos": ledger.eventos(artigo["id"]),
                    "auditoria": json.loads(auditoria.read_text(encoding="utf-8")) if auditoria.exists() else None,
                })
            elif m := re.fullmatch(r"/download/([\w\-]+)\.docx", caminho):
                artigo = ledger.artigo(m.group(1))
                arquivo = Path(artigo["docx_path"]).resolve() if artigo and artigo.get("docx_path") else None
                if not arquivo or not arquivo.exists() or raiz_dados not in arquivo.parents:
                    return self._json({"erro": "docx indisponível"}, HTTPStatus.NOT_FOUND)
                corpo = arquivo.read_bytes()
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type",
                                 "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                self.send_header("Content-Disposition", f'attachment; filename="artigo-{artigo["id"]}.docx"')
                self.send_header("Content-Length", str(len(corpo)))
                self.end_headers()
                self.wfile.write(corpo)
            else:
                self._json({"erro": "rota inexistente"}, HTTPStatus.NOT_FOUND)

    return Handler


def servir(ledger: Ledger, config: Config, host: str = "127.0.0.1", porta: int = 8765) -> None:
    servidor = ThreadingHTTPServer((host, porta), criar_handler(ledger, config))
    print(f"Painel em http://{host}:{porta}  (Ctrl+C para sair)")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        servidor.server_close()
