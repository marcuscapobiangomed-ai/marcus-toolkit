"""
Motor Travel Hacker: Implementação fiel e contextualizada dos 5 Prompts Estratégicos.
Gera prompts perfeitamente parametrizados e diagnósticos táticos imediatos.
"""

from typing import Dict, Any
from routes_catalog import ORIGINS, DESTINATIONS, SEASONALITY_GUIDE

def get_destination_info(dest_code: str) -> Dict[str, Any]:
    for d in DESTINATIONS:
        if d["code"].upper() == dest_code.upper():
            return d
    return {
        "code": dest_code,
        "name": dest_code,
        "country": "Internacional / Nacional",
        "region": "geral",
        "airlines": ["Principais Cias Aéreas"],
        "benchmarks": {"opportunity": 2500, "fair": 4000, "expensive": 6000},
        "alternative_airports": [],
        "travel_hack": "Compare datas durante a semana (terça/quarta) para obter tarifas até 35% mais baixas."
    }

def get_origin_info(origin_code: str) -> Dict[str, Any]:
    return ORIGINS.get(origin_code.upper(), {
        "code": origin_code,
        "name": origin_code,
        "city": origin_code,
        "airports": [origin_code]
    })


def generate_prompt_1_ofertas_ocultas(origin: str, dest: str, dep_date: str, ret_date: str) -> Dict[str, Any]:
    orig_info = get_origin_info(origin)
    dest_info = get_destination_info(dest)
    
    prompt_pt = (
        f'Você é um travel hacker expert. Encontre 5 ofertas de voos ida e volta de '
        f'[{orig_info["name"]} ({orig_info["code"]})] para [{dest_info["name"]} ({dest_info["code"]})], '
        f'saindo entre [{dep_date}] e [{ret_date}]. '
        f'Priorize tarifas mais baratas, companhias confiáveis e táticas de tarifas escondidas '
        f'(incluindo conexões inteligentes, open-jaw e tarifas de hubs alternativos). '
        f'Liste: companhia, rota, datas, conexões e preço estimado.'
    )

    prompt_en = (
        f'You are a travel hacker. Find me 5 international round-trip flight deals from '
        f'[{orig_info["name"]} ({orig_info["code"]})] to [{dest_info["name"]} ({dest_info["code"]})], '
        f'departing between [{dep_date}] and returning between [{ret_date}]. '
        f'Prioritize the cheapest possible fares, reputable airlines, minimal layovers, '
        f'reasonable total travel time, and hidden-fare tactics. '
        f'List airline(s), route, dates, layovers, total hours, and price.'
    )

    taticas_sugeridas = [
        f"Verifique tarifas 'Open-Jaw' (chegar por {dest_info['name']} e voltar por outra cidade próxima, ex: {', '.join(dest_info['alternative_airports']) if dest_info['alternative_airports'] else 'cidade vizinha'}).",
        f"Considere split-ticketing: emita a perna longa de {orig_info['code']} para um mega hub e a conexão regional em low-cost separada.",
        f"Dica de rota: {dest_info.get('travel_hack', '')}"
    ]

    return {
        "id": 1,
        "title": "PROMPT #1: OFERTAS OCULTAS",
        "subtitle": "Travel Hacker Expert: tarifas escondidas, rotas alternativas e melhores ofertas",
        "prompt_pt": prompt_pt,
        "prompt_en": prompt_en,
        "suggested_tactics": taticas_sugeridas
    }


def generate_prompt_2_alertas_inteligentes(origin: str, dest: str, dep_date: str, ret_date: str) -> Dict[str, Any]:
    orig_info = get_origin_info(origin)
    dest_info = get_destination_info(dest)
    benchmarks = dest_info.get("benchmarks", {"opportunity": 2000, "fair": 3500, "expensive": 5500})

    prompt_pt = (
        f'Monte um plano para rastrear mudanças de preços em voos de [{orig_info["name"]}] para [{dest_info["name"]}]. '
        f'Use ferramentas gratuitas (Google Flights, Skyscanner, Kayak). '
        f'Inclua estratégias para aproveitar promoções relâmpago e quedas repentinas '
        f'para a janela de [{dep_date}] até [{ret_date}]. '
        f'Forneça guia passo a passo com faixas de preço de gatilho para compra imediata.'
    )

    plano_acao = [
        f"Gatilho de Compra Imediata (BUG FARE / Oportunidade Única): Abaixo de R$ {benchmarks['opportunity']:.2f}. Se bater este valor, compre sem hesitar.",
        f"Faixa de Preço Justo / Bom Negócio: Entre R$ {benchmarks['opportunity']:.2f} e R$ {benchmarks['fair']:.2f}.",
        f"Zona Vermelha (Caro): Acima de R$ {benchmarks['expensive']:.2f}. Não compre, ative alertas e aguarde oscilação.",
        "Configure o rastreador do Google Flights para 'Qualquer data' e 'Datas específicas' simultaneamente.",
        "Monitore o Skyscanner com a opção 'Receber alertas de preço' ligada para notificações push no celular."
    ]

    return {
        "id": 2,
        "title": "PROMPT #2: ALERTAS INTELIGENTES",
        "subtitle": "Plano prático de monitoramento com gatilhos automáticos de compra",
        "prompt_pt": prompt_pt,
        "action_plan": plano_acao,
        "thresholds": benchmarks
    }


def generate_prompt_3_datas_estrategicas(origin: str, dest: str, dep_date: str, ret_date: str) -> Dict[str, Any]:
    orig_info = get_origin_info(origin)
    dest_info = get_destination_info(dest)
    region = dest_info.get("region", "geral")
    seasonality = SEASONALITY_GUIDE.get(region, {})

    prompt_pt = (
        f'Atue como analista de passagens. Mostre combinações de datas mais baratas para voos de '
        f'[{orig_info["name"]}] para [{dest_info["name"]}] entre [{dep_date}] e [{ret_date}]. '
        f'Foque em voos durante a semana e opções flexíveis (±3 dias). '
        f'Destaque quais combinações oferecem maior economia percentual.'
    )

    analise_datas = {
        "dias_mais_baratos": seasonality.get("cheapest_days", "Terças e Quartas"),
        "dias_mais_caros": seasonality.get("expensive_days", "Sextas e Domingos"),
        "antecedencia_ideal": seasonality.get("best_booking_advance", "45 a 90 dias antes"),
        "dica_sazonal": seasonality.get("tips", "Evite embarques na sexta à noite ou retorno no domingo à tarde.")
    }

    return {
        "id": 3,
        "title": "PROMPT #3: DATAS ESTRATÉGICAS",
        "subtitle": "Bypass de datas caras através de flexibilidade calculada",
        "prompt_pt": prompt_pt,
        "data_analysis": analise_datas
    }


def generate_prompt_4_insider_secrets(origin: str, dest: str) -> Dict[str, Any]:
    orig_info = get_origin_info(origin)
    dest_info = get_destination_info(dest)

    prompt_pt = (
        f'Você é ex-funcionário de companhia aérea. Compartilhe 3 truques pouco conhecidos que reduzem '
        f'passagens de [{orig_info["name"]}] para [{dest_info["name"]}]. '
        f'Táticas específicas que realmente funcionem para esta rota e companhias que operam nela.'
    )

    truques = [
        {
            "titulo": "Regra do Stopover Gratuito",
            "detalhes": f"Se a rota for internacional operada por TAP, Iberia, Copa ou Avianca, você pode passar até 10 dias na cidade de conexão (Lisboa, Porto, Madri, Panamá ou Bogotá) pagando o preço de um único bilhete."
        },
        {
            "titulo": "Pesquisa em Moeda Local e VPN",
            "detalhes": f"Para voos internos na América do Sul ou Europa, pesquise no site local da companhia aérea alterando o país para a moeda de origem. Frequentemente elimina o IOF e spreads abusivos de conversão BRL."
        },
        {
            "titulo": "Tabela Fixa de Parceiros de Milhas",
            "detalhes": f"Verifique programas como Iberia Plus (para voar LATAM/Iberia), Smiles (voos KLM/Air France/American) e Lifemiles (voos United/Avianca). Voos em alta temporada podem custar até 60% menos emitidos em milhas em tabela por distância."
        }
    ]

    return {
        "id": 4,
        "title": "PROMPT #4: INSIDER SECRETS",
        "subtitle": "Truques de ex-funcionário: stopover, milhas e emissões parceiras",
        "prompt_pt": prompt_pt,
        "secrets": truques
    }


def generate_prompt_5_aeroportos_alternativos(origin: str, dest: str) -> Dict[str, Any]:
    orig_info = get_origin_info(origin)
    dest_info = get_destination_info(dest)

    prompt_pt = (
        f'Liste aeroportos alternativos baratos próximos a [{orig_info["name"]}] e [{dest_info["name"]}]. '
        f'Compare tarifas, tempo extra e custos de transporte terrestre. '
        f'Vale a pena financeiramente fazer esse desvio?'
    )

    alternativas_origem = []
    if "SP" in orig_info.get("state", "") or origin in ["SAO", "GRU", "CGH", "VCP"]:
        alternativas_origem.append({
            "aeroporto": "Viracopos (VCP - Campinas)",
            "economia_esperada": "R$ 250 a R$ 600 na passagem",
            "custo_transporte": "R$ 0,00 (Ônibus gratuito Azul de SP) ou R$ 45",
            "tempo_adicional": "~1h20",
            "veredito": "ALTAMENTE VANTAJOSO se voar de Azul ou se a economia superar R$ 250."
        })
    elif "RJ" in orig_info.get("state", "") or origin in ["RIO", "GIG", "SDU"]:
        alternativas_origem.append({
            "aeroporto": "Galeão (GIG) vs Santos Dumont (SDU)",
            "economia_esperada": "GIG costuma ter tarifas 15-30% mais baratas em voos longos",
            "custo_transporte": "Diferença de R$ 40 a R$ 70 no Uber",
            "tempo_adicional": "25 a 45 min",
            "veredito": "Compensa voar pelo Galeão para economia acima de R$ 150 por passageiro."
        })

    alternativas_destino = []
    for alt in dest_info.get("alternative_airports", []):
        alt_dest = get_destination_info(alt)
        alternativas_destino.append({
            "codigo": alt,
            "nome": alt_dest.get("name", alt),
            "pais": alt_dest.get("country", "")
        })

    return {
        "id": 5,
        "title": "PROMPT #5: AEROPORTOS ALTERNATIVOS",
        "subtitle": "Análise de Trade-off: Passagem + Translado Terrestre vs Tempo",
        "prompt_pt": prompt_pt,
        "origin_alternatives": alternativas_origem,
        "destination_alternatives": alternativas_destino
    }


def get_all_hacker_prompts(origin: str, dest: str, dep_date: str, ret_date: str) -> Dict[str, Any]:
    """Retorna os 5 pacotes de prompts com inteligência incorporada."""
    return {
        "p1_ofertas_ocultas": generate_prompt_1_ofertas_ocultas(origin, dest, dep_date, ret_date),
        "p2_alertas_inteligentes": generate_prompt_2_alertas_inteligentes(origin, dest, dep_date, ret_date),
        "p3_datas_estrategicas": generate_prompt_3_datas_estrategicas(origin, dest, dep_date, ret_date),
        "p4_insider_secrets": generate_prompt_4_insider_secrets(origin, dest),
        "p5_aeroportos_alternativos": generate_prompt_5_aeroportos_alternativos(origin, dest)
    }
