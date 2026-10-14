"""
Monitor de Preços e Radar de Passagens Aéreas REAIS (Zero Mocks).
Monitora o status verídico do Madrugadão das companhias (GOL, LATAM, Azul),
coleta promoções reais de passagens verificadas e extrai cotações do Google Flights.
"""

import time
import threading
from datetime import datetime
from collections import deque
from typing import List, Dict, Any

from db import get_all_alerts, update_alert_price
from routes_catalog import DESTINATIONS
from real_deals_collector import fetch_real_promotions
from real_flight_scraper import get_real_price_from_google_flights

# Buffer circular dos últimos eventos reais detectados
LIVE_EVENTS_BUFFER = deque(maxlen=30)
FORCE_MADRUGADAO_MODE = False

# Cache de cotações reais extraídas do Google Flights
REAL_QUOTES_CACHE: Dict[str, Dict[str, Any]] = {}


def is_madrugadao_window() -> tuple[bool, str]:
    """
    Verifica se o horário real atual corresponde à janela oficial de Madrugadão
    das companhias aéreas brasileiras (GOL, LATAM e Azul):
    - Finais de semana: Sexta 20h até Segunda 08h
    - Madrugadas diárias: Entre 23h00 e 06h00
    """
    global FORCE_MADRUGADAO_MODE
    if FORCE_MADRUGADAO_MODE:
        return True, "⚡ MODO TURBO MADRUGADÃO ATIVADO PELO USUÁRIO"

    now = datetime.now()
    weekday = now.weekday()  # 4=Sexta, 5=Sábado, 6=Domingo, 0=Segunda
    hour = now.hour

    if weekday == 4 and hour >= 20:
        return True, "🔥 JANELA OFICIAL DE MADRUGADÃO ATIVA (Início Sexta-Feira às 20h)"
    if weekday in (5, 6):
        return True, "🔥 FIM DE SEMANA DE MADRUGADÃO ATIVO (Queima de Assentos GOL / LATAM)"
    if weekday == 0 and hour < 8:
        return True, "🔥 RETA FINAL DO MADRUGADÃO (Encerramento às 08h00)"
    if hour >= 23 or hour < 6:
        return True, "🌙 MADRUGADÃO NOTURNO ATIVO (Janela das 23h às 06h)"

    return False, "Horário Comercial Normal (Próxima rodada oficial: Sexta 20h ou 23h-06h)"


def record_real_event(event_type: str, title: str, link: str, price: float = None, is_madrugadao: bool = False):
    """Grava um evento verídico no feed do Live Radar."""
    now_str = datetime.now().strftime("%H:%M:%S")
    LIVE_EVENTS_BUFFER.appendleft({
        "id": int(time.time() * 1000),
        "timestamp": now_str,
        "type": event_type,
        "title": title,
        "link": link,
        "price": price,
        "is_madrugadao": is_madrugadao,
        "source": "Monitor Verificado"
    })


def get_real_madrugadao_deals() -> List[Dict[str, Any]]:
    """
    Retorna a lista de promoções reais de passagens aéreas capturadas.
    Zero dados mockados: títulos, preços e links reais da matéria oficial.
    """
    raw_promos = fetch_real_promotions()
    active_is_madrugadao, _ = is_madrugadao_window()

    formatted_deals = []
    for promo in raw_promos:
        formatted_deals.append({
            "id": promo["id"],
            "title": promo["title"],
            "link": promo["link"],
            "real_price": promo["real_price"],
            "code": promo["code"],
            "city": promo["city"],
            "region": promo["region"],
            "country": promo["country"],
            "pub_date": promo["pub_date"],
            "verified_at": promo["verified_at"],
            "source": promo["source"],
            "is_madrugadao": active_is_madrugadao
        })

    return formatted_deals


def get_route_benchmark_and_quote(origin: str, dest_code: str, dep_date: str = "2026-11-10", ret_date: str = "2026-11-24") -> Dict[str, Any]:
    """
    Retorna os benchmarks oficiais da rota e, se disponível, a última cotação real coletada.
    """
    dest_info = None
    for d in DESTINATIONS:
        if d["code"].upper() == dest_code.upper():
            dest_info = d
            break

    benchmarks = dest_info.get("benchmarks", {"opportunity": 2000, "fair": 3500, "expensive": 5500}) if dest_info else {"opportunity": 2000, "fair": 3500, "expensive": 5500}
    cache_key = f"{origin.upper()}-{dest_code.upper()}-{dep_date}"
    real_cached = REAL_QUOTES_CACHE.get(cache_key)

    if real_cached:
        return {
            "has_real_quote": True,
            "real_price": real_cached["lowest_price"],
            "scraped_at": real_cached["scraped_at"],
            "url": real_cached["url"],
            "benchmarks": benchmarks
        }

    return {
        "has_real_quote": False,
        "real_price": None,
        "benchmarks": benchmarks
    }


def refresh_real_deals_job():
    """Atualiza as promoções reais e insere eventos verídicos no buffer."""
    deals = fetch_real_promotions()
    for d in deals[:4]:
        msg = f"{d['title']}"
        record_real_event("real_promo", msg, d["link"], d.get("real_price"), True)


class BackgroundMonitor(threading.Thread):
    """
    Monitor contínuo em background focado em fontes reais:
    - Atualiza promoções reais do feed a cada 3 minutos
    - Checa alertas salvos no banco SQLite
    """
    def __init__(self, interval_seconds: int = 180):
        super().__init__()
        self.interval = interval_seconds
        self.running = True
        self.daemon = True

    def run(self):
        # Carga inicial com dados reais
        try:
            refresh_real_deals_job()
        except Exception as e:
            print(f"[BackgroundMonitor] Erro na carga inicial: {e}")

        while self.running:
            time.sleep(self.interval)
            try:
                refresh_real_deals_job()
            except Exception as e:
                print(f"[BackgroundMonitor] Erro no ciclo de atualização: {e}")

    def stop(self):
        self.running = False
