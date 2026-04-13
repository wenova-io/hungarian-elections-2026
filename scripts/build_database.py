#!/usr/bin/env python3
"""Agent 2 — Database Builder
Reads data/raw/*.json, builds SQLite DB, computes derived fields, exports CSVs.
"""
import json
import math
import sqlite3
import csv
import os
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROC_DIR = BASE_DIR / "data" / "processed"
DB_PATH = BASE_DIR / "data" / "hungary_elections.db"
LOG_PATH = BASE_DIR / "logs" / "agent2_errors.log"

PROC_DIR.mkdir(parents=True, exist_ok=True)

errors = []

def log_error(msg):
    errors.append(f"{datetime.utcnow().isoformat()}Z {msg}")
    print(f"[ERROR] {msg}")

def log_info(msg):
    print(f"[INFO] {msg}")

# ── Party colors and metadata ──
PARTY_COLORS = {
    'Fidesz-KDNP': '#f97316',
    'Fidesz': '#f97316',
    'Fidesz-MDF': '#f97316',
    'Tisza': '#1a5c9e',
    'Mi Hazánk': '#7c3aed',
    'MSZP': '#e11d48',
    'MSZP-P': '#e11d48',
    'MDF': '#92400e',
    'SZDSZ': '#0891b2',
    'DK': '#b91c1c',
    'Jobbik': '#16a34a',
    'LMP': '#65a30d',
    'FKGP': '#a16207',
    'KDNP': '#ea580c',
    'MIÉP': '#334155',
    'Unity': '#6366f1',
    'EM': '#6366f1',
    'MM': '#8b5cf6',
    'MKKP': '#f59e0b',
    'Centrum-KDNP': '#ea580c',
    'MNOÖ': '#64748b',
}

PARTY_IDEOLOGY = {
    'MDF': 'centre-right',
    'SZDSZ': 'liberal',
    'FKGP': 'agrarian',
    'MSZP': 'social democrat',
    'MSZP-P': 'social democrat',
    'Fidesz': 'liberal (early), right-wing (later)',
    'Fidesz-KDNP': 'right-wing / national conservative',
    'Fidesz-MDF': 'right-wing',
    'KDNP': 'christian democrat',
    'MIÉP': 'far-right',
    'Jobbik': 'far-right (early), centrist (later)',
    'LMP': 'green',
    'DK': 'social liberal',
    'Unity': 'broad opposition alliance',
    'EM': 'broad opposition alliance',
    'Mi Hazánk': 'far-right',
    'Tisza': 'centrist / anti-corruption',
    'MM': 'liberal',
    'MKKP': 'satirical',
    'Centrum-KDNP': 'christian democrat',
    'MNOÖ': 'German minority',
}

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def create_tables(conn):
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS elections (
        id INTEGER PRIMARY KEY,
        year INTEGER NOT NULL UNIQUE,
        date TEXT,
        total_registered INTEGER,
        total_turnout_pct REAL,
        total_valid_votes INTEGER,
        total_seats INTEGER,
        electoral_system TEXT,
        notes TEXT
    );

    CREATE TABLE IF NOT EXISTS parties (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        short_name TEXT UNIQUE,
        ideology TEXT,
        color_hex TEXT,
        founding_year INTEGER,
        dissolved_year INTEGER
    );

    CREATE TABLE IF NOT EXISTS party_results (
        id INTEGER PRIMARY KEY,
        election_id INTEGER REFERENCES elections(id),
        party_id INTEGER REFERENCES parties(id),
        list_votes INTEGER,
        list_vote_pct REAL,
        constituency_seats INTEGER,
        list_seats INTEGER,
        total_seats INTEGER,
        seat_pct REAL,
        vote_seat_ratio REAL,
        gallagher_contribution REAL,
        in_government BOOLEAN,
        data_source TEXT,
        confidence TEXT
    );

    CREATE TABLE IF NOT EXISTS gallagher_index (
        id INTEGER PRIMARY KEY,
        election_id INTEGER REFERENCES elections(id),
        lsq_index REAL,
        winner_party_id INTEGER,
        winner_vote_pct REAL,
        winner_seat_pct REAL,
        winner_distortion REAL
    );

    CREATE TABLE IF NOT EXISTS constituencies (
        id INTEGER PRIMARY KEY,
        oevk_number INTEGER,
        name TEXT,
        county TEXT,
        region TEXT,
        type TEXT CHECK(type IN ('budapest','city','town','rural','suburban')),
        population INTEGER,
        registered_voters_2022 INTEGER,
        registered_voters_2026 INTEGER,
        area_km2 REAL,
        geojson_feature TEXT
    );

    CREATE TABLE IF NOT EXISTS constituency_results (
        id INTEGER PRIMARY KEY,
        election_id INTEGER REFERENCES elections(id),
        constituency_id INTEGER REFERENCES constituencies(id),
        winner_party_id INTEGER REFERENCES parties(id),
        winner_votes INTEGER,
        winner_vote_pct REAL,
        runner_up_party_id INTEGER REFERENCES parties(id),
        runner_up_vote_pct REAL,
        margin REAL,
        turnout_pct REAL,
        valid_votes INTEGER,
        data_source TEXT,
        is_estimated BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS constituency_swing (
        id INTEGER PRIMARY KEY,
        constituency_id INTEGER REFERENCES constituencies(id),
        winner_2022_party_id INTEGER,
        winner_2022_pct REAL,
        winner_2026_party_id INTEGER,
        winner_2026_pct REAL,
        flipped BOOLEAN,
        fidesz_swing REAL,
        tisza_swing REAL,
        turnout_change REAL
    );

    CREATE TABLE IF NOT EXISTS turnout_intervals (
        id INTEGER PRIMARY KEY,
        election_id INTEGER REFERENCES elections(id),
        time_utc TEXT,
        turnout_pct REAL,
        data_source TEXT
    );

    CREATE TABLE IF NOT EXISTS hypothetical_pr (
        id INTEGER PRIMARY KEY,
        election_id INTEGER REFERENCES elections(id),
        party_id INTEGER REFERENCES parties(id),
        actual_seats INTEGER,
        actual_seat_pct REAL,
        proportional_seats INTEGER,
        proportional_seat_pct REAL,
        difference INTEGER
    );
    """)

def insert_parties(conn, master):
    """Extract unique parties across all elections and insert them."""
    seen = {}
    for election in master['elections']:
        for p in election['parties']:
            sn = p['short_name']
            if sn not in seen:
                seen[sn] = p['name']

    for sn, name in seen.items():
        conn.execute(
            "INSERT OR IGNORE INTO parties (name, short_name, ideology, color_hex) VALUES (?,?,?,?)",
            (name, sn, PARTY_IDEOLOGY.get(sn), PARTY_COLORS.get(sn, '#6b7280'))
        )
    conn.commit()
    log_info(f"Inserted {len(seen)} parties")

def get_party_id(conn, short_name):
    row = conn.execute("SELECT id FROM parties WHERE short_name=?", (short_name,)).fetchone()
    return row[0] if row else None

def get_election_id(conn, year):
    row = conn.execute("SELECT id FROM elections WHERE year=?", (year,)).fetchone()
    return row[0] if row else None

def insert_elections(conn, master):
    for e in master['elections']:
        conn.execute(
            "INSERT OR REPLACE INTO elections (year, date, total_registered, total_turnout_pct, total_valid_votes, total_seats, electoral_system, notes) VALUES (?,?,?,?,?,?,?,?)",
            (e['year'], e['date'], e.get('total_registered'), e['total_turnout_pct'],
             e.get('total_valid_votes'), e['total_seats'], e.get('system_notes', ''), e.get('_note'))
        )
    conn.commit()
    log_info(f"Inserted {len(master['elections'])} elections")

def insert_party_results(conn, master):
    count = 0
    for e in master['elections']:
        eid = get_election_id(conn, e['year'])
        for p in e['parties']:
            pid = get_party_id(conn, p['short_name'])
            if not pid:
                log_error(f"Party not found: {p['short_name']}")
                continue

            votes = p.get('votes') or p.get('list_votes')
            vote_pct = p.get('vote_pct') or p.get('list_vote_pct', 0)
            seat_pct = p.get('seat_pct', 0)
            vsr = (seat_pct / vote_pct) if vote_pct > 0 else None
            gc = (vote_pct - seat_pct) ** 2

            conn.execute(
                """INSERT INTO party_results
                (election_id, party_id, list_votes, list_vote_pct, constituency_seats, list_seats,
                 total_seats, seat_pct, vote_seat_ratio, gallagher_contribution, in_government,
                 data_source, confidence)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (eid, pid, votes, vote_pct,
                 p.get('constituency_seats'), p.get('list_seats'),
                 p.get('total_seats', 0), seat_pct, vsr, gc,
                 p.get('in_government', False),
                 p.get('data_source', 'wikipedia'), p.get('confidence', 'high'))
            )
            count += 1
    conn.commit()
    log_info(f"Inserted {count} party results")

def compute_gallagher(conn, master):
    for e in master['elections']:
        eid = get_election_id(conn, e['year'])
        results = []
        for p in e['parties']:
            vote_pct = p.get('vote_pct') or p.get('list_vote_pct', 0)
            seat_pct = p.get('seat_pct', 0)
            results.append({'vote_pct': vote_pct, 'seat_pct': seat_pct,
                           'short_name': p['short_name'], 'total_seats': p.get('total_seats', 0)})

        sum_sq = sum((r['vote_pct'] - r['seat_pct'])**2 for r in results)
        lsq = math.sqrt(0.5 * sum_sq)

        # Find winner (most seats)
        winner = max(results, key=lambda x: x['total_seats'])
        wpid = get_party_id(conn, winner['short_name'])

        conn.execute(
            "INSERT INTO gallagher_index (election_id, lsq_index, winner_party_id, winner_vote_pct, winner_seat_pct, winner_distortion) VALUES (?,?,?,?,?,?)",
            (eid, round(lsq, 2), wpid, winner['vote_pct'], winner['seat_pct'],
             round(winner['seat_pct'] - winner['vote_pct'], 2))
        )
    conn.commit()
    log_info(f"Computed Gallagher index for {len(master['elections'])} elections")

def insert_constituencies(conn):
    geodata = load_json(RAW_DIR / "constituencies_geodata.json")
    count = 0
    for county_group in geodata['districts_by_county']:
        county = county_group['county']
        ctype = county_group['type']
        for d in county_group['districts']:
            conn.execute(
                "INSERT OR REPLACE INTO constituencies (oevk_number, name, county, type) VALUES (?,?,?,?)",
                (d['oevk_id'], d['name'], county, ctype)
            )
            count += 1
    conn.commit()
    log_info(f"Inserted {count} constituencies")

def insert_turnout_intervals(conn):
    turnout_data = load_json(RAW_DIR / "turnout_history_raw.json")

    # 2026 timeseries
    eid_2026 = get_election_id(conn, 2026)
    if eid_2026:
        ts = turnout_data.get('turnout_2026_timeseries', {})
        for time_str, pct in ts.items():
            if time_str.startswith('_'):
                continue
            conn.execute(
                "INSERT INTO turnout_intervals (election_id, time_utc, turnout_pct, data_source) VALUES (?,?,?,?)",
                (eid_2026, time_str, pct, 'NVI')
            )

    # 2022 timeseries
    eid_2022 = get_election_id(conn, 2022)
    if eid_2022:
        ts = turnout_data.get('turnout_2022_timeseries', {})
        for time_str, pct in ts.items():
            if time_str.startswith('_'):
                continue
            conn.execute(
                "INSERT INTO turnout_intervals (election_id, time_utc, turnout_pct, data_source) VALUES (?,?,?,?)",
                (eid_2022, time_str, pct, 'NVI')
            )

    # 2018 timeseries
    eid_2018 = get_election_id(conn, 2018)
    if eid_2018:
        ts = turnout_data.get('turnout_2018_timeseries', {})
        for time_str, pct in ts.items():
            if time_str.startswith('_'):
                continue
            conn.execute(
                "INSERT INTO turnout_intervals (election_id, time_utc, turnout_pct, data_source) VALUES (?,?,?,?)",
                (eid_2018, time_str, pct, 'NVI')
            )

    conn.commit()
    log_info("Inserted turnout intervals")

def compute_hypothetical_pr(conn, master):
    """For each election, compute what a pure proportional system would give."""
    count = 0
    for e in master['elections']:
        eid = get_election_id(conn, e['year'])
        total_seats = e['total_seats']
        parties = e['parties']

        # Filter parties above threshold and compute proportional seats
        total_vote_pct = sum(p.get('vote_pct') or p.get('list_vote_pct', 0) for p in parties)

        for p in parties:
            pid = get_party_id(conn, p['short_name'])
            vote_pct = p.get('vote_pct') or p.get('list_vote_pct', 0)
            actual_seats = p.get('total_seats', 0)
            actual_seat_pct = p.get('seat_pct', 0)

            # Proportional seats = (vote_pct / total_valid_vote_pct) * total_seats
            prop_seats = round((vote_pct / total_vote_pct) * total_seats) if total_vote_pct > 0 else 0
            prop_seat_pct = round((prop_seats / total_seats) * 100, 2) if total_seats > 0 else 0

            conn.execute(
                """INSERT INTO hypothetical_pr
                (election_id, party_id, actual_seats, actual_seat_pct,
                 proportional_seats, proportional_seat_pct, difference)
                VALUES (?,?,?,?,?,?,?)""",
                (eid, pid, actual_seats, actual_seat_pct,
                 prop_seats, prop_seat_pct, actual_seats - prop_seats)
            )
            count += 1
    conn.commit()
    log_info(f"Computed {count} hypothetical PR entries")

def export_csv(conn, table_name, filepath):
    cursor = conn.execute(f"SELECT * FROM {table_name}")
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()

    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        writer.writerows(rows)
    log_info(f"Exported {table_name} -> {filepath} ({len(rows)} rows)")
    return len(rows)

def run_validation(conn):
    results = {}

    # Check party counts per election
    cursor = conn.execute("""
        SELECT e.year, COUNT(*) as party_count FROM elections e
        JOIN party_results pr ON pr.election_id = e.id
        GROUP BY e.year ORDER BY e.year
    """)
    results['party_counts'] = {str(r[0]): r[1] for r in cursor.fetchall()}

    # Check Gallagher indices
    cursor = conn.execute("SELECT e.year, g.lsq_index FROM gallagher_index g JOIN elections e ON e.id = g.election_id ORDER BY e.year")
    results['gallagher_indices'] = {str(r[0]): r[1] for r in cursor.fetchall()}

    # Check seat totals
    cursor = conn.execute("""
        SELECT e.year, SUM(pr.total_seats) as sum_seats, e.total_seats
        FROM party_results pr JOIN elections e ON e.id = pr.election_id
        GROUP BY e.year ORDER BY e.year
    """)
    seat_check = {}
    all_match = True
    for r in cursor.fetchall():
        matches = r[1] == r[2] if r[1] and r[2] else False
        seat_check[str(r[0])] = {"sum": r[1], "expected": r[2], "matches": matches}
        if not matches:
            all_match = False
    results['seat_totals'] = seat_check

    # Table row counts
    counts = {}
    for table in ['elections', 'parties', 'party_results', 'constituencies',
                   'constituency_results', 'constituency_swing', 'gallagher_index',
                   'turnout_intervals', 'hypothetical_pr']:
        cursor = conn.execute(f"SELECT COUNT(*) FROM {table}")
        counts[table] = cursor.fetchone()[0]
    results['row_counts'] = counts

    results['validation_passed'] = len(results['party_counts']) == 10 and all(
        v >= 1.0 for v in results['gallagher_indices'].values()
    )

    return results

def main():
    log_info("=== Agent 2: Database Builder ===")

    # Check prerequisite
    complete_file = RAW_DIR / "COLLECTION_COMPLETE.json"
    if not complete_file.exists():
        log_error("COLLECTION_COMPLETE.json not found! Agent 1 must complete first.")
        return

    # Load master data
    master = load_json(RAW_DIR / "elections_master_raw.json")
    log_info(f"Loaded master data: {len(master['elections'])} elections")

    # Remove old DB if exists
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    # Build database
    create_tables(conn)
    insert_elections(conn, master)
    insert_parties(conn, master)
    insert_party_results(conn, master)
    compute_gallagher(conn, master)
    insert_constituencies(conn)
    insert_turnout_intervals(conn)
    compute_hypothetical_pr(conn, master)

    # Export CSVs
    row_counts = {}
    csv_exports = {
        'elections': PROC_DIR / 'elections_clean.csv',
        'party_results': PROC_DIR / 'party_results_clean.csv',
        'parties': PROC_DIR / 'parties_clean.csv',
        'constituencies': PROC_DIR / 'constituencies_clean.csv',
        'gallagher_index': PROC_DIR / 'gallagher_index_clean.csv',
        'turnout_intervals': PROC_DIR / 'turnout_intervals_clean.csv',
        'hypothetical_pr': PROC_DIR / 'hypothetical_pr_clean.csv',
    }
    for table, path in csv_exports.items():
        row_counts[table] = export_csv(conn, table, path)

    # Validation
    validation = run_validation(conn)
    with open(PROC_DIR / 'validation_report.json', 'w', encoding='utf-8') as f:
        json.dump(validation, f, indent=2, ensure_ascii=False)
    log_info(f"Validation: {'PASSED' if validation['validation_passed'] else 'ISSUES FOUND'}")

    # DB size
    db_size_mb = round(DB_PATH.stat().st_size / (1024 * 1024), 2)

    # Write completion signal
    completion = {
        "completed_at": datetime.utcnow().isoformat() + "Z",
        "database_file": "data/hungary_elections.db",
        "database_size_mb": db_size_mb,
        "table_row_counts": validation['row_counts'],
        "gallagher_indices": validation['gallagher_indices'],
        "validation_passed": validation['validation_passed'],
        "ready_for_agent3": True
    }
    with open(PROC_DIR / 'DATABASE_COMPLETE.json', 'w', encoding='utf-8') as f:
        json.dump(completion, f, indent=2, ensure_ascii=False)

    # Write error log
    with open(LOG_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(errors) if errors else 'No errors.')

    conn.close()
    log_info(f"Database built: {DB_PATH} ({db_size_mb} MB)")
    log_info(f"Row counts: {validation['row_counts']}")
    log_info("Agent 2 complete.")

if __name__ == '__main__':
    main()
