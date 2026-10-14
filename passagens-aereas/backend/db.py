"""
Banco de dados SQLite para o Sistema de Passagens Aéreas.
Gerencia alertas de preço, histórico de cotações e configurações de monitoramento.
"""
import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DB_PATH = os.path.join(DB_DIR, "passagens.db")


def get_db_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Tabela de alertas monitorados
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            origin_code TEXT NOT NULL,
            origin_name TEXT NOT NULL,
            dest_code TEXT NOT NULL,
            dest_name TEXT NOT NULL,
            region TEXT NOT NULL,
            departure_date TEXT NOT NULL,
            return_date TEXT,
            target_price REAL NOT NULL,
            current_price REAL,
            lowest_price_seen REAL,
            currency TEXT DEFAULT 'BRL',
            trip_type TEXT DEFAULT 'roundtrip',
            active INTEGER DEFAULT 1,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_checked TIMESTAMP
        )
    """)

    # Tabela de histórico de preços
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_id INTEGER,
            route_key TEXT NOT NULL,
            origin TEXT NOT NULL,
            destination TEXT NOT NULL,
            departure_date TEXT NOT NULL,
            return_date TEXT,
            price REAL NOT NULL,
            airline TEXT,
            source TEXT DEFAULT 'tracker',
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
        )
    """)

    # Tabela de buscas recentes
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS search_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            origin_code TEXT NOT NULL,
            dest_code TEXT NOT NULL,
            departure_date TEXT NOT NULL,
            return_date TEXT,
            searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


def add_alert(origin_code: str, origin_name: str, dest_code: str, dest_name: str,
              region: str, departure_date: str, return_date: str, target_price: float,
              current_price: float = None, notes: str = "") -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO alerts (
            origin_code, origin_name, dest_code, dest_name, region,
            departure_date, return_date, target_price, current_price,
            lowest_price_seen, notes, last_checked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    """, (
        origin_code, origin_name, dest_code, dest_name, region,
        departure_date, return_date, target_price, current_price,
        current_price or target_price, notes
    ))
    alert_id = cursor.lastrowid
    
    # Se já tem preço atual, grava no histórico
    if current_price:
        route_key = f"{origin_code}-{dest_code}"
        cursor.execute("""
            INSERT INTO price_history (alert_id, route_key, origin, destination, departure_date, return_date, price)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (alert_id, route_key, origin_code, dest_code, departure_date, return_date, current_price))

    conn.commit()
    conn.close()
    return alert_id


def get_all_alerts(active_only: bool = False) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if active_only:
        cursor.execute("SELECT * FROM alerts WHERE active = 1 ORDER BY created_at DESC")
    else:
        cursor.execute("SELECT * FROM alerts ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_alert(alert_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def update_alert_price(alert_id: int, new_price: float, airline: str = "Cia Aérea") -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return

    lowest = row["lowest_price_seen"]
    if lowest is None or new_price < lowest:
        lowest = new_price

    cursor.execute("""
        UPDATE alerts 
        SET current_price = ?, lowest_price_seen = ?, last_checked = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (new_price, lowest, alert_id))

    route_key = f"{row['origin_code']}-{row['dest_code']}"
    cursor.execute("""
        INSERT INTO price_history (alert_id, route_key, origin, destination, departure_date, return_date, price, airline)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (alert_id, route_key, row['origin_code'], row['dest_code'], row['departure_date'], row['return_date'], new_price, airline))

    conn.commit()
    conn.close()


def get_price_history_for_route(origin: str, dest: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM price_history 
        WHERE origin = ? AND destination = ?
        ORDER BY recorded_at DESC LIMIT 50
    """, (origin, dest))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# Inicializa o banco de dados se não existir
init_db()
