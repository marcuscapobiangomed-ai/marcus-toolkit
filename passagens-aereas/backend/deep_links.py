"""
Gerador de Deep Links determinísticos de alta fidelidade para passagens aéreas.
Gera links diretos para 7 principais motores e comparadores de voos:
1. Google Flights (Oficial em BRL)
2. Skyscanner (Com aeroportos próximos ativados)
3. Kayak (Ordenado pelo melhor voo)
4. Momondo (Especialista em OTAs alternativas)
5. Decolar (Maior agência da América Latina com parcelamento sem juros)
6. Kiwi.com (Especialista em conexões ocultas e Travel Hacking)
7. Passagens Promo (Consolidadora nacional com desconto no PIX)
+ Google Flights Explore (Mapa de tarifas do continente/região)
"""
import urllib.parse
from datetime import datetime, date

def format_skyscanner_date(date_str: str) -> str:
    """Converte 'YYYY-MM-DD' para o formato do Skyscanner 'YYMMDD'."""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%y%m%d")
    except Exception:
        clean = date_str.replace("-", "")
        return clean[2:] if len(clean) == 8 else clean


def generate_google_flights_url(origin: str, dest: str, dep_date: str, ret_date: str = None, trip_type: str = "roundtrip") -> str:
    """Gera link direto para o Google Flights com parâmetros em Português e Real (BRL)."""
    if trip_type == "roundtrip" and ret_date:
        query = f"voos de {origin} para {dest} de {dep_date} a {ret_date}"
    else:
        query = f"voos de {origin} para {dest} em {dep_date}"

    encoded_query = urllib.parse.quote(query)
    return f"https://www.google.com/travel/flights?q={encoded_query}&curr=BRL&hl=pt-BR"


def generate_google_flights_explore_url(origin: str, region_or_dest: str = "Europa") -> str:
    """Gera link do Google Flights Explore (Mapa de Tarifas Flexíveis)."""
    query = f"Voos de {origin} para {region_or_dest}"
    encoded = urllib.parse.quote(query)
    return f"https://www.google.com/travel/explore?q={encoded}&curr=BRL&hl=pt-BR"


def generate_skyscanner_url(origin: str, dest: str, dep_date: str, ret_date: str = None, trip_type: str = "roundtrip") -> str:
    """Gera deep link para o Skyscanner Brasil com aeroportos próximos ativados."""
    orig_clean = origin.lower()
    dest_clean = dest.lower()
    dep_formatted = format_skyscanner_date(dep_date)

    if trip_type == "roundtrip" and ret_date:
        ret_formatted = format_skyscanner_date(ret_date)
        url = (
            f"https://www.skyscanner.com.br/transporte/voos/{orig_clean}/{dest_clean}/"
            f"{dep_formatted}/{ret_formatted}/?adultsv2=1&cabinclass=economy&childrenv2="
            f"&inboundalts=true&outboundalts=true&preferdirects=false&ref=home&rtn=1"
        )
    else:
        url = (
            f"https://www.skyscanner.com.br/transporte/voos/{orig_clean}/{dest_clean}/"
            f"{dep_formatted}/?adultsv2=1&cabinclass=economy&childrenv2="
            f"&inboundalts=true&outboundalts=true&preferdirects=false&ref=home&rtn=0"
        )
    return url


def generate_kayak_url(origin: str, dest: str, dep_date: str, ret_date: str = None, trip_type: str = "roundtrip") -> str:
    """Gera deep link para o Kayak Brasil com ordenação pelo melhor custo-benefício."""
    if trip_type == "roundtrip" and ret_date:
        return f"https://www.kayak.com.br/flights/{origin}-{dest}/{dep_date}/{ret_date}?sort=bestflight_a"
    return f"https://www.kayak.com.br/flights/{origin}-{dest}/{dep_date}?sort=bestflight_a"


def generate_momondo_url(origin: str, dest: str, dep_date: str, ret_date: str = None, trip_type: str = "roundtrip") -> str:
    """Gera deep link para o Momondo (ótimo para desvendar tarifas de OTAs internacionais)."""
    if trip_type == "roundtrip" and ret_date:
        return f"https://www.momondo.com.br/flight-search/{origin}-{dest}/{dep_date}/{ret_date}?sort=bestflight_a"
    return f"https://www.momondo.com.br/flight-search/{origin}-{dest}/{dep_date}?sort=bestflight_a"


def generate_decolar_url(origin: str, dest: str, dep_date: str, ret_date: str = None, trip_type: str = "roundtrip") -> str:
    """Gera deep link para a Decolar (parcelamento em até 10-12x sem juros em reais)."""
    if trip_type == "roundtrip" and ret_date:
        return f"https://www.decolar.com/shop/flights/results/roundtrip/{origin}/{dest}/{dep_date}/{ret_date}/1/0/0/NA/NA/NA/NA/NA?from=SB&di=1-0"
    return f"https://www.decolar.com/shop/flights/results/oneway/{origin}/{dest}/{dep_date}/1/0/0/NA/NA/NA/NA/NA?from=SB&di=1-0"


def generate_kiwi_url(origin: str, dest: str, dep_date: str, ret_date: str = None, trip_type: str = "roundtrip") -> str:
    """Gera deep link para o Kiwi.com (rei das conexões ocultas, tarifas hacker e virtual interlining)."""
    orig_clean = origin.lower()
    dest_clean = dest.lower()
    if trip_type == "roundtrip" and ret_date:
        return f"https://www.kiwi.com/br/search/results/{orig_clean}/{dest_clean}/{dep_date}/{ret_date}?sortBy=price"
    return f"https://www.kiwi.com/br/search/results/{orig_clean}/{dest_clean}/{dep_date}/no-return?sortBy=price"


def generate_passagenspromo_url(origin: str, dest: str, dep_date: str, ret_date: str = None, trip_type: str = "roundtrip") -> str:
    """Gera deep link para Passagens Promo (consolidadora nacional com descontos no PIX)."""
    if trip_type == "roundtrip" and ret_date:
        return f"https://www.passagenspromo.com.br/passagens-aereas/busca?origem={origin}&destino={dest}&ida={dep_date}&volta={ret_date}&adultos=1&criancas=0&bebes=0"
    return f"https://www.passagenspromo.com.br/passagens-aereas/busca?origem={origin}&destino={dest}&ida={dep_date}&adultos=1&criancas=0&bebes=0"


def generate_all_deep_links(origin: str, dest: str, dep_date: str, ret_date: str = None, region: str = "Europa", trip_type: str = "roundtrip") -> dict:
    """
    Retorna o pacote completo com os 7 principais buscadores e o mapa flexível.
    """
    return {
        "google_flights": generate_google_flights_url(origin, dest, dep_date, ret_date, trip_type),
        "skyscanner": generate_skyscanner_url(origin, dest, dep_date, ret_date, trip_type),
        "kayak": generate_kayak_url(origin, dest, dep_date, ret_date, trip_type),
        "momondo": generate_momondo_url(origin, dest, dep_date, ret_date, trip_type),
        "decolar": generate_decolar_url(origin, dest, dep_date, ret_date, trip_type),
        "kiwi": generate_kiwi_url(origin, dest, dep_date, ret_date, trip_type),
        "passagens_promo": generate_passagenspromo_url(origin, dest, dep_date, ret_date, trip_type),
        "google_explore": generate_google_flights_explore_url(origin, region)
    }
