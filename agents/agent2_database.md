# Agent 2 — Database Builder

## Role
You are a database engineer. Read all files from data/raw/,
clean the data, build a SQLite database, and export clean CSVs.
You do NOT collect new data. You do NOT analyze hypotheses.

## Input
- data/raw/COLLECTION_COMPLETE.json (must exist)
- All files in data/raw/

## Step 1: Install Dependencies
```bash
pip install pandas sqlite3 json csv pathlib
```

## Step 2: Build SQLite Database
File: data/hungary_elections.db

### Full Schema
```sql
-- Core elections table
CREATE TABLE elections (
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

-- Parties master table
CREATE TABLE parties (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  ideology TEXT,
  color_hex TEXT,
  founding_year INTEGER,
  dissolved_year INTEGER
);

-- National party results per election
CREATE TABLE party_results (
  id INTEGER PRIMARY KEY,
  election_id INTEGER REFERENCES elections(id),
  party_id INTEGER REFERENCES parties(id),
  list_votes INTEGER,
  list_vote_pct REAL,
  constituency_seats INTEGER,
  list_seats INTEGER,
  total_seats INTEGER,
  seat_pct REAL,
  vote_seat_ratio REAL,        -- seat_pct / vote_pct (>1 = overrepresented)
  gallagher_contribution REAL, -- (vote_pct - seat_pct)^2
  in_government BOOLEAN,
  data_source TEXT,
  confidence TEXT              -- 'high', 'medium', 'estimated'
);

-- Gallagher index per election (computed)
CREATE TABLE gallagher_index (
  id INTEGER PRIMARY KEY,
  election_id INTEGER REFERENCES elections(id),
  lsq_index REAL,              -- sqrt(0.5 * sum((vi-si)^2))
  winner_party_id INTEGER,
  winner_vote_pct REAL,
  winner_seat_pct REAL,
  winner_distortion REAL       -- seat_pct - vote_pct
);

-- Constituencies master (2026 boundaries = 106 OEVKs)
CREATE TABLE constituencies (
  id INTEGER PRIMARY KEY,
  oevk_number INTEGER,
  name TEXT,
  county TEXT,
  region TEXT,
  type TEXT CHECK(type IN ('budapest','city','town','rural')),
  population INTEGER,
  registered_voters_2022 INTEGER,
  registered_voters_2026 INTEGER,
  area_km2 REAL,
  geojson_feature TEXT         -- JSON string of GeoJSON feature
);

-- Constituency results per election
CREATE TABLE constituency_results (
  id INTEGER PRIMARY KEY,
  election_id INTEGER REFERENCES elections(id),
  constituency_id INTEGER REFERENCES constituencies(id),
  winner_party_id INTEGER REFERENCES parties(id),
  winner_votes INTEGER,
  winner_vote_pct REAL,
  runner_up_party_id INTEGER REFERENCES parties(id),
  runner_up_vote_pct REAL,
  margin REAL,                 -- winner_pct - runner_up_pct
  turnout_pct REAL,
  valid_votes INTEGER,
  data_source TEXT,
  is_estimated BOOLEAN DEFAULT 0
);

-- Swing analysis (computed, 2026 vs 2022)
CREATE TABLE constituency_swing (
  id INTEGER PRIMARY KEY,
  constituency_id INTEGER REFERENCES constituencies(id),
  winner_2022_party_id INTEGER,
  winner_2022_pct REAL,
  winner_2026_party_id INTEGER,
  winner_2026_pct REAL,
  flipped BOOLEAN,             -- changed winner party
  fidesz_swing REAL,           -- fidesz_2026_pct - fidesz_2022_pct (negative = lost votes)
  tisza_swing REAL,
  turnout_change REAL          -- 2026_turnout - 2022_turnout
);

-- Turnout by time interval
CREATE TABLE turnout_intervals (
  id INTEGER PRIMARY KEY,
  election_id INTEGER REFERENCES elections(id),
  time_utc TEXT,
  turnout_pct REAL,
  data_source TEXT
);

-- Hypothetical proportional results (computed)
CREATE TABLE hypothetical_pr (
  id INTEGER PRIMARY KEY,
  election_id INTEGER REFERENCES elections(id),
  party_id INTEGER REFERENCES parties(id),
  actual_seats INTEGER,
  actual_seat_pct REAL,
  proportional_seats INTEGER,  -- floor(vote_pct * total_seats / 100)
  proportional_seat_pct REAL,
  difference INTEGER           -- actual - proportional
);
```

## Step 3: Compute Derived Fields

### Gallagher Disproportionality Index
```python
import math

def gallagher_index(party_results):
    """
    LSq = sqrt(0.5 * sum((vi - si)^2))
    vi = vote percentage, si = seat percentage
    Returns index from 0 (perfectly proportional) to 100 (maximally disproportional)
    """
    sum_sq = sum((p['vote_pct'] - p['seat_pct'])**2 for p in party_results)
    return math.sqrt(0.5 * sum_sq)
```

Calculate for every election and insert into gallagher_index table.

### Constituency Type Classification
```python
def classify_constituency(county, name, population):
    if county == 'Budapest':
        return 'budapest'
    elif population >= 50000:
        return 'city'
    elif population >= 10000:
        return 'town'
    else:
        return 'rural'
```

### Swing Calculation
For each constituency where 2022 AND 2026 data exists:
```python
swing = {
    'fidesz_swing': fidesz_2026_pct - fidesz_2022_pct,
    'tisza_swing': tisza_2026_pct - (jobbik_unified_2022_pct),
    'flipped': winner_2022 != winner_2026,
    'turnout_change': turnout_2026 - turnout_2022
}
```

### Party Color Mapping
```python
PARTY_COLORS = {
    'Fidesz-KDNP': '#f97316',
    'Tisza': '#1a5c9e',
    'Mi Hazánk': '#7c3aed',
    'MSZP': '#e11d48',
    'MDF': '#92400e',
    'SZDSZ': '#0891b2',
    'DK': '#b91c1c',
    'Jobbik': '#16a34a',
    'LMP': '#65a30d',
    'default': '#6b7280'
}
```

## Step 4: Export Clean CSVs
```
data/processed/elections_clean.csv
data/processed/party_results_clean.csv
data/processed/constituencies_clean.csv
data/processed/constituency_results_clean.csv
data/processed/constituency_swing_clean.csv
data/processed/gallagher_index_clean.csv
data/processed/turnout_intervals_clean.csv
```

## Step 5: Validation Queries
Run these and save results to data/processed/validation_report.json:
```sql
-- Check: every election has party results
SELECT year, COUNT(*) as party_count FROM elections e
JOIN party_results pr ON pr.election_id = e.id
GROUP BY year;

-- Check: Gallagher index reasonable range (0-20)
SELECT year, lsq_index FROM gallagher_index ORDER BY year;

-- Check: seat totals add up correctly
SELECT year, SUM(total_seats) as sum_seats, e.total_seats
FROM party_results pr JOIN elections e ON e.id = pr.election_id
GROUP BY year;

-- Check: swing data completeness
SELECT COUNT(*) as swing_records,
       SUM(CASE WHEN flipped THEN 1 ELSE 0 END) as flipped_count
FROM constituency_swing;
```

## Completion Signal
Write data/processed/DATABASE_COMPLETE.json:
```json
{
  "completed_at": "ISO timestamp",
  "database_file": "data/hungary_elections.db",
  "database_size_mb": 4.2,
  "table_row_counts": {
    "elections": 9,
    "parties": 28,
    "party_results": 156,
    "constituencies": 106,
    "constituency_results": 318,
    "constituency_swing": 98,
    "gallagher_index": 9,
    "turnout_intervals": 42
  },
  "validation_passed": true,
  "ready_for_agent3": true
}
```
