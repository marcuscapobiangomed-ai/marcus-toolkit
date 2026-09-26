import json
import sys
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from artigos_v2.config import carregar_config  # noqa: E402
from artigos_v2.ledger import Ledger  # noqa: E402
from artigos_v2.llm import ClienteOmniRoute  # noqa: E402
from fakes import FakeEuropePMC, FakeOmniRoute, FakePubMed  # noqa: E402


@pytest.fixture
def escada_teste(tmp_path):
    dados = {
        "base_url": "http://omniroute.teste/v1",
        "cotacao_usd_brl": 5.0,
        "tentativas_por_degrau": 2,
        "escadas": {
            "escrita": ["anthropic/claude-opus-5-5", "anthropic/claude-opus-5"],
            "tecnico": ["anthropic/claude-sonnet-5", "glm/glm-5.3"],
            "triagem": ["gemini/gemini-3.8-flash", "glm/glm-5.3-flash"],
            "auditoria": ["openai/gpt-6-sol"],
        },
        "modelos": [
            {"id": "anthropic/claude-opus-5-5", "nome": "Claude Opus 5.5", "provedor": "Anthropic",
             "entrada_usd_mtok": 4, "saida_usd_mtok": 20},
            {"id": "anthropic/claude-opus-5", "nome": "Claude Opus 5", "provedor": "Anthropic",
             "entrada_usd_mtok": 5, "saida_usd_mtok": 25},
            {"id": "anthropic/claude-sonnet-5", "nome": "Claude Sonnet 5", "provedor": "Anthropic",
             "entrada_usd_mtok": 2, "saida_usd_mtok": 10},
            {"id": "glm/glm-5.3", "nome": "GLM-5.3", "provedor": "Z.ai", "entrada_usd_mtok": 1.4, "saida_usd_mtok": 4.4},
            {"id": "gemini/gemini-3.8-flash", "nome": "Gemini 3.8 Flash", "provedor": "Google",
             "entrada_usd_mtok": 0.75, "saida_usd_mtok": 3.75, "gratuito_no_omniroute": True},
            {"id": "openai/gpt-6-sol", "nome": "GPT-6 Sol", "provedor": "OpenAI", "entrada_usd_mtok": 2, "saida_usd_mtok": 10},
        ],
    }
    caminho = tmp_path / "escada.json"
    caminho.write_text(json.dumps(dados), encoding="utf-8")
    return caminho


@pytest.fixture
def ambiente(tmp_path, escada_teste, monkeypatch):
    monkeypatch.setenv("ARTIGOS_DADOS", str(tmp_path / "dados"))
    monkeypatch.delenv("OMNIROUTE_BASE_URL", raising=False)
    config = carregar_config(escada_teste)
    ledger = Ledger(config.dir_dados / "artigos.db")
    fake = FakeOmniRoute()
    cliente = ClienteOmniRoute(config, ledger, transporte=fake, espera_base_s=0)
    return config, ledger, cliente, fake, FakePubMed(), FakeEuropePMC()
