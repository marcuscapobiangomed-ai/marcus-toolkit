"""
Servidor Flask e API REST para o Sistema Soberano de Passagens Aéreas.
100% Realista: Conexão direta com 7 buscadores oficiais, feed verídico de promoções,
coleta com Playwright no Google Flights e persistência SQLite. Zero dados mockados.
"""

import os
from flask import Flask, jsonify, request, send_from_directory
from db import (
    init_db, add_alert, get_all_alerts, delete_alert,
    get_price_history_for_route
)
from routes_catalog import (
    ORIGINS, REGIONS, DESTINATIONS, SEASONALITY_GUIDE,
    ALTERNATIVE_AIRPORTS_MATRIX
)
from deep_links import generate_all_deep_links
from travel_hacker_engine import get_all_hacker_prompts, get_destination_info, get_origin_info
import flight_monitor
from flight_monitor import (
    BackgroundMonitor, is_madrugadao_window, get_real_madrugadao_deals,
    LIVE_EVENTS_BUFFER, REAL_QUOTES_CACHE, record_real_event,
    get_route_benchmark_and_quote
)
from real_flight_scraper import get_real_price_from_google_flights

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")

# Inicia monitor em background para fontes reais
monitor_thread = BackgroundMonitor(interval_seconds=180)
monitor_thread.start()


@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND_DIR, path)


@app.route("/api/origins", methods=["GET"])
def get_origins():
    return jsonify({"status": "success", "origins": ORIGINS})


@app.route("/api/regions", methods=["GET"])
def get_regions():
    return jsonify({"status": "success", "regions": REGIONS})


@app.route("/api/destinations", methods=["GET"])
def get_destinations():
    region = request.args.get("region")
    if region and region != "todos":
        filtered = [d for d in DESTINATIONS if d["region"] == region]
    else:
        filtered = DESTINATIONS
    return jsonify({"status": "success", "total": len(filtered), "destinations": filtered})


@app.route("/api/seasonality", methods=["GET"])
def get_seasonality():
    region = request.args.get("region")
    if region and region in SEASONALITY_GUIDE:
        return jsonify({"status": "success", "region": region, "data": SEASONALITY_GUIDE[region]})
    return jsonify({"status": "success", "seasonality": SEASONALITY_GUIDE})


@app.route("/api/alternatives", methods=["GET"])
def get_alternatives():
    return jsonify({"status": "success", "matrix": ALTERNATIVE_AIRPORTS_MATRIX})


@app.route("/api/search", methods=["POST"])
def search_route():
    data = request.get_json() or {}
    origin = data.get("origin", "RIO").upper()
    dest = data.get("dest", "LIS").upper()
    dep_date = data.get("departure_date", "2026-11-10")
    ret_date = data.get("return_date", "2026-11-24")
    trip_type = data.get("trip_type", "roundtrip")

    dest_info = get_destination_info(dest)
    orig_info = get_origin_info(origin)
    region = dest_info.get("region", "europa")

    # Links diretos para os 7 motores de busca reais
    links = generate_all_deep_links(
        origin=origin,
        dest=dest,
        dep_date=dep_date,
        ret_date=ret_date if trip_type == "roundtrip" else None,
        region=REGIONS.get(region, {}).get("name", region),
        trip_type=trip_type
    )

    # Prompts de Travel Hacking
    prompts = get_all_hacker_prompts(origin, dest, dep_date, ret_date)

    # Benchmark real da rota
    route_data = get_route_benchmark_and_quote(origin, dest, dep_date, ret_date)
    benchmarks = route_data["benchmarks"]

    return jsonify({
        "status": "success",
        "origin": orig_info,
        "destination": dest_info,
        "dates": {"departure": dep_date, "return": ret_date, "type": trip_type},
        "links": links,
        "hacker_prompts": prompts,
        "benchmarks": benchmarks,
        "has_real_quote": route_data["has_real_quote"],
        "real_price": route_data.get("real_price"),
        "seasonality": SEASONALITY_GUIDE.get(region, {})
    })


@app.route("/api/live-quote", methods=["POST"])
def live_quote():
    """Executa extração real no Google Flights usando Playwright sem mocks."""
    data = request.get_json() or {}
    origin = data.get("origin", "RIO").upper()
    dest = data.get("dest", "LIS").upper()
    dep_date = data.get("departure_date", "2026-11-10")
    ret_date = data.get("return_date", "2026-11-24")

    result = get_real_price_from_google_flights(origin, dest, dep_date, ret_date)
    if result and result.get("lowest_price"):
        cache_key = f"{origin}-{dest}-{dep_date}"
        REAL_QUOTES_CACHE[cache_key] = result
        record_real_event(
            "live_quote",
            f"Cotação real extraída: {origin} -> {dest} por R$ {result['lowest_price']:,.2f} no Google Flights",
            result.get("url", ""),
            result.get("lowest_price")
        )
        return jsonify({"status": "success", "data": result})

    return jsonify({"status": "error", "message": "Cotação temporariamente indisponível."}), 502


@app.route("/api/live-radar", methods=["GET"])
def get_live_radar():
    """Retorna dados 100% reais: janela de madrugadão, matérias de promoções reais e eventos."""
    is_active, status_text = is_madrugadao_window()
    real_deals = get_real_madrugadao_deals()

    return jsonify({
        "status": "success",
        "madrugadao_active": is_active,
        "madrugadao_status_text": status_text,
        "force_madrugadao_mode": flight_monitor.FORCE_MADRUGADAO_MODE,
        "recent_events": list(LIVE_EVENTS_BUFFER),
        "real_deals": real_deals
    })


@app.route("/api/live-radar/toggle-madrugadao", methods=["POST"])
def toggle_madrugadao():
    """Alterna manualmente o modo turbo de Madrugadão."""
    flight_monitor.FORCE_MADRUGADAO_MODE = not flight_monitor.FORCE_MADRUGADAO_MODE
    is_active, status_text = is_madrugadao_window()
    return jsonify({
        "status": "success",
        "force_madrugadao_mode": flight_monitor.FORCE_MADRUGADAO_MODE,
        "madrugadao_active": is_active,
        "message": f"Modo Madrugadão: {'ATIVADO (Turbo)' if flight_monitor.FORCE_MADRUGADAO_MODE else 'AUTOMÁTICO (Baseado no Relógio Oficial)'}"
    })


@app.route("/api/hacker-prompts", methods=["POST"])
def hacker_prompts():
    data = request.get_json() or {}
    origin = data.get("origin", "RIO")
    dest = data.get("dest", "LIS")
    dep_date = data.get("departure_date", "2026-11-10")
    ret_date = data.get("return_date", "2026-11-24")

    prompts = get_all_hacker_prompts(origin, dest, dep_date, ret_date)
    return jsonify({"status": "success", "prompts": prompts})


@app.route("/api/alerts", methods=["GET"])
def list_alerts():
    alerts = get_all_alerts(active_only=False)
    return jsonify({"status": "success", "total": len(alerts), "alerts": alerts})


@app.route("/api/alerts", methods=["POST"])
def create_alert():
    data = request.get_json() or {}
    origin_code = data.get("origin_code", "RIO")
    dest_code = data.get("dest_code", "LIS")
    dep_date = data.get("departure_date")
    ret_date = data.get("return_date")
    target_price = float(data.get("target_price", 3500))
    notes = data.get("notes", "")

    dest_info = get_destination_info(dest_code)
    orig_info = get_origin_info(origin_code)
    region = dest_info.get("region", "europa")

    alert_id = add_alert(
        origin_code=orig_info["code"],
        origin_name=orig_info["name"],
        dest_code=dest_info["code"],
        dest_name=dest_info["name"],
        region=region,
        departure_date=dep_date,
        return_date=ret_date,
        target_price=target_price,
        current_price=target_price,
        notes=notes
    )

    return jsonify({
        "status": "success",
        "message": f"Alerta #{alert_id} criado com sucesso!",
        "alert_id": alert_id
    })


@app.route("/api/alerts/<int:alert_id>", methods=["DELETE"])
def remove_alert(alert_id):
    success = delete_alert(alert_id)
    if success:
        return jsonify({"status": "success", "message": f"Alerta #{alert_id} removido."})
    return jsonify({"status": "error", "message": "Alerta não encontrado."}), 404


@app.route("/api/alerts/check", methods=["POST"])
def trigger_alert_check():
    alerts = get_all_alerts(active_only=True)
    checked = []
    for a in alerts:
        # Extrai cotação real se solicitada
        res = get_real_price_from_google_flights(a["origin_code"], a["dest_code"], a["departure_date"], a["return_date"])
        if res and res.get("lowest_price"):
            p = res["lowest_price"]
            from db import update_alert_price
            update_alert_price(a["id"], p, "Google Flights")
            checked.append({"alert_id": a["id"], "price": p, "triggered": p <= a["target_price"]})

    return jsonify({"status": "success", "checked": checked})


@app.route("/api/history/<origin>/<dest>", methods=["GET"])
def route_history(origin, dest):
    history = get_price_history_for_route(origin.upper(), dest.upper())
    return jsonify({"status": "success", "route": f"{origin}->{dest}", "history": history})


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5055))
    print(f"🚀 Servidor de Passagens Aéreas ativo em http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
