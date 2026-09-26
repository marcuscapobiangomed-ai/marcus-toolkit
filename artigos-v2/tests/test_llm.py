import pytest

from artigos_v2.llm import ErroEscada, extrair_json


def test_escada_desce_um_degrau_quando_o_primeiro_modelo_falha(ambiente):
    config, ledger, cliente, fake, *_ = ambiente
    fake.falhas["anthropic/claude-opus-5-5"] = 2  # esgota as 2 tentativas do degrau 0
    r = cliente.completar("escrita", [{"role": "user", "content": "Escreva a CONCLUSÃO"}], etapa="conclusao")

    assert r.modelo_respondeu == "anthropic/claude-opus-5"
    assert r.degrau == 1
    chamadas = ledger.chamadas()
    assert [c["sucesso"] for c in reversed(chamadas)] == [0, 0, 1]
    ok = chamadas[0]
    assert ok["degrau"] == 1 and ok["custo_api_usd"] > 0
    assert ok["custo_api_usd"] == pytest.approx((ok["tokens_entrada"] * 5 + ok["tokens_saida"] * 25) / 1e6)


def test_erro_permanente_nao_repete_no_mesmo_modelo(ambiente):
    _, ledger, cliente, fake, *_ = ambiente
    fake.permanentes.add("anthropic/claude-sonnet-5")
    cliente.completar("tecnico", [{"role": "user", "content": "x"}], etapa="teste")
    falhas = [c for c in ledger.chamadas() if not c["sucesso"]]
    assert len(falhas) == 1 and "404" in falhas[0]["erro"]


def test_escada_esgotada_levanta_erro(ambiente):
    _, _, cliente, fake, *_ = ambiente
    fake.explodir_em = "boom"
    with pytest.raises(ErroEscada):
        cliente.completar("triagem", [{"role": "user", "content": "boom"}], etapa="teste")


def test_modelo_gratuito_tem_gasto_real_zero_mas_custo_api(ambiente):
    _, ledger, cliente, *_ = ambiente
    cliente.completar("triagem", [{"role": "user", "content": "x" * 4000}], etapa="triagem")
    c = ledger.chamadas()[0]
    assert c["custo_real_usd"] == 0 and c["custo_api_usd"] > 0


def test_usa_custo_informado_pelo_omniroute_e_desliga_compressao(ambiente):
    _, ledger, cliente, fake, *_ = ambiente
    fake.cabecalhos_omni = {"x-omniroute-response-cost": "0.0123"}
    cliente.completar("escrita", [{"role": "user", "content": "x"}], etapa="t")
    assert ledger.chamadas()[0]["custo_real_usd"] == pytest.approx(0.0123)
    assert fake.chamadas[0]["cabecalhos"]["x-omniroute-compression"] == "off"


@pytest.mark.parametrize("texto", [
    '{"a": 1}', '```json\n{"a": 1}\n```', 'Claro! Aqui está:\n{"a": 1}\nAbraço', '[{"a": 1}]',
])
def test_extrair_json(texto):
    assert extrair_json(texto) in ({"a": 1}, [{"a": 1}])


def test_extrair_json_invalido():
    with pytest.raises(ValueError):
        extrair_json("sem json aqui")
