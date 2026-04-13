# Agent 3 — Statistical Analyzer

## Role
You are a data scientist and political analyst. Read the SQLite
database, run statistical analyses, test all four hypotheses,
and output structured JSON files for the web app.

## Input
- data/hungary_elections.db (must exist)
- data/processed/DATABASE_COMPLETE.json (must confirm ready_for_agent3: true)

## Install Dependencies
```bash
pip install pandas scipy numpy sqlite3 json
```

## Analysis Tasks

### Task 1: Gallagher Index Timeline
File: data/analysis/h3_gallagher_timeline.json

Query:
```sql
SELECT e.year, g.lsq_index, g.winner_vote_pct,
       g.winner_seat_pct, g.winner_distortion,
       p.short_name as winner_party
FROM gallagher_index g
JOIN elections e ON e.id = g.election_id
JOIN parties p ON p.id = g.winner_party_id
ORDER BY e.year;
```

Output format:
```json
{
  "hypothesis": "H3",
  "title": "Gallagher Disproportionality Index 1990-2026",
  "description": "LSq index measures how disproportional seats are vs votes. Higher = more unfair.",
  "data": [
    {
      "year": 1990, "lsq_index": 12.4, "winner": "MDF",
      "winner_vote_pct": 24.7, "winner_seat_pct": 42.7,
      "winner_distortion": 18.0
    }
  ],
  "finding": "The 2026 Gallagher index of X.X is [higher/lower/comparable] to the Fidesz average of Y.Y (2010-2022), [supporting/refuting] H3.",
  "h3_verdict": "SUPPORTED / REFUTED / PARTIAL"
}
```

### Task 2: Seat vs Vote Disparity
File: data/analysis/h3_seat_vote_disparity.json

For each election, calculate how many extra seats the winner got:
```python
extra_seats = (winner_seat_pct - winner_vote_pct) * total_seats / 100
hypothetical_seats_pr = winner_vote_pct * total_seats / 100
```

Also calculate: what would 2026 look like under pure PR?
```json
{
  "2026_actual": {"Tisza": 138, "Fidesz": 54, "MiHazank": 7},
  "2026_proportional": {"Tisza": 106, "Fidesz": 77, "MiHazank": 12, "other": 4},
  "2026_supermajority_threshold": 133,
  "tisza_would_have_supermajority_under_pr": false
}
```

### Task 3: Rural vs Urban Tisza Performance
File: data/analysis/h1_rural_urban_breakdown.json

```sql
SELECT c.type as constituency_type,
       COUNT(*) as total_constituencies,
       SUM(CASE WHEN cr26.winner_party_id = (SELECT id FROM parties WHERE short_name='Tisza')
           THEN 1 ELSE 0 END) as tisza_wins,
       AVG(cr26.winner_vote_pct) as avg_winner_pct,
       AVG(cr26.turnout_pct) as avg_turnout_2026,
       AVG(cr22.turnout_pct) as avg_turnout_2022,
       AVG(cs.fidesz_swing) as avg_fidesz_swing,
       AVG(cs.turnout_change) as avg_turnout_change
FROM constituencies c
LEFT JOIN constituency_results cr26 ON cr26.constituency_id = c.id
  AND cr26.election_id = (SELECT id FROM elections WHERE year=2026)
LEFT JOIN constituency_results cr22 ON cr22.constituency_id = c.id
  AND cr22.election_id = (SELECT id FROM elections WHERE year=2022)
LEFT JOIN constituency_swing cs ON cs.constituency_id = c.id
GROUP BY c.type;
```

Output format:
```json
{
  "hypothesis": "H1",
  "title": "Tisza Performance by Constituency Type",
  "data": [
    {
      "type": "budapest",
      "label": "Budapest (23 districts)",
      "total": 23,
      "tisza_wins": 23,
      "tisza_win_pct": 100.0,
      "avg_tisza_pct": 64.2,
      "avg_turnout_2026": 80.1,
      "avg_turnout_2022": 67.3,
      "turnout_increase": 12.8,
      "avg_fidesz_swing": -18.4
    },
    {
      "type": "rural",
      "label": "Rural (<10k population)",
      "total": 31,
      "tisza_wins": 18,
      "tisza_win_pct": 58.1,
      "avg_tisza_pct": 48.3,
      "avg_turnout_2026": 68.2,
      "avg_turnout_2022": 60.1,
      "turnout_increase": 8.1,
      "avg_fidesz_swing": -11.2
    }
  ],
  "key_finding": "Tisza won X of Y rural constituencies...",
  "h1_verdict": "SUPPORTED / REFUTED / PARTIAL"
}
```

### Task 4: Flipped Constituencies Analysis
File: data/analysis/h1_flipped_constituencies.json

Find all constituencies that changed winner from 2022 to 2026:
```sql
SELECT c.name, c.county, c.type,
       p22.short_name as winner_2022,
       cr22.winner_vote_pct as pct_2022,
       p26.short_name as winner_2026,
       cr26.winner_vote_pct as pct_2026,
       cs.margin as margin_2026,
       cs.fidesz_swing,
       cs.turnout_change
FROM constituency_swing cs
JOIN constituencies c ON c.id = cs.constituency_id
JOIN parties p22 ON p22.id = cs.winner_2022_party_id
JOIN parties p26 ON p26.id = cs.winner_2026_party_id
WHERE cs.flipped = 1
ORDER BY cs.fidesz_swing ASC;
```

Output format:
```json
{
  "hypothesis": "H1 + H2",
  "title": "Constituencies that flipped from Fidesz to Tisza",
  "total_flipped": 67,
  "rural_flipped": 18,
  "city_flipped": 24,
  "budapest_flipped": 0,
  "constituencies": [
    {
      "name": "Balassagyarmat", "county": "Nógrád", "type": "town",
      "winner_2022": "Fidesz-KDNP", "margin_2022": 24.3,
      "winner_2026": "Tisza", "margin_2026": 1.2,
      "fidesz_swing": -23.1, "turnout_change": 12.4,
      "is_gerrymandered_rural": true
    }
  ]
}
```

### Task 5: Turnout Analysis
File: data/analysis/h2_turnout_analysis.json

```json
{
  "hypothesis": "H2",
  "title": "Turnout Change 2022 vs 2026",
  "national": {
    "2022": 70.5, "2026": 78.0, "change": 7.5
  },
  "by_type": {
    "budapest": {"2022": 67.0, "2026": 80.5, "change": 13.5},
    "city":     {"2022": 63.0, "2026": 78.8, "change": 15.8},
    "town":     {"2022": 60.0, "2026": 74.0, "change": 14.0},
    "rural":    {"2022": 58.0, "2026": 68.0, "change": 10.0}
  },
  "intraday_2026": [
    {"time": "09:00", "pct": 16.89, "vs_2022_same_time": 4.12}
  ],
  "key_finding": "Urban turnout increase (+13.5pp in Budapest) was larger than rural (+10pp), but rural mobilization was significant in absolute terms and in previously safe Fidesz seats.",
  "h2_verdict": "PARTIAL — urban surge larger but rural mobilization decisive in swing constituencies"
}
```

### Task 6: Gerrymandering Effectiveness Analysis
File: data/analysis/h3_gerrymandering_effectiveness.json

Measure how well the 2011 Fidesz gerrymander worked over time:
```python
# For each election 2014-2026, calculate:
# "bonus seats" = actual_fidesz_seats - proportional_fidesz_seats
# "efficiency ratio" = fidesz_seat_pct / fidesz_vote_pct
```

```json
{
  "hypothesis": "H3",
  "title": "Gerrymandering Effectiveness Over Time",
  "data": [
    {"year": 2014, "fidesz_vote_pct": 44.9, "fidesz_seat_pct": 66.8,
     "bonus_seats": 44, "efficiency_ratio": 1.49, "system_intact": true},
    {"year": 2022, "fidesz_vote_pct": 54.1, "fidesz_seat_pct": 68.0,
     "bonus_seats": 28, "efficiency_ratio": 1.26, "system_intact": true},
    {"year": 2026, "tisza_vote_pct": 53.2, "tisza_seat_pct": 69.3,
     "bonus_seats": 32, "efficiency_ratio": 1.30, "system_intact": true,
     "note": "Same system, now benefits Tisza"}
  ],
  "conclusion": "The gerrymander gave Fidesz an average of X bonus seats per election. In 2026 the same mechanism gave Tisza Y bonus seats — more than enough for a supermajority."
}
```

### Task 7: Reform Simulation
File: data/analysis/h4_reform_simulation.json

Simulate three alternative electoral systems for 2026:
```json
{
  "hypothesis": "H4",
  "title": "What If? Alternative Electoral Systems in 2026",
  "actual_2026": {
    "Tisza": {"votes_pct": 53.2, "seats": 138, "seats_pct": 69.3},
    "Fidesz": {"votes_pct": 38.5, "seats": 54, "seats_pct": 27.1},
    "MiHazank": {"votes_pct": 6.1, "seats": 7, "seats_pct": 3.5}
  },
  "scenarios": [
    {
      "name": "Pure Proportional Representation",
      "description": "All 199 seats allocated by list vote percentage",
      "results": {
        "Tisza": {"seats": 106, "seats_pct": 53.3, "has_supermajority": false},
        "Fidesz": {"seats": 77, "seats_pct": 38.7},
        "MiHazank": {"seats": 12, "seats_pct": 6.0}
      },
      "tisza_governs": true,
      "tisza_supermajority": false,
      "coalition_needed": false
    },
    {
      "name": "German-style Mixed Member PR",
      "description": "106 FPTP seats + 93 compensatory list seats",
      "results": {
        "Tisza": {"seats": 118, "seats_pct": 59.3, "has_supermajority": false},
        "Fidesz": {"seats": 68, "seats_pct": 34.2},
        "MiHazank": {"seats": 13, "seats_pct": 6.5}
      },
      "tisza_governs": true,
      "tisza_supermajority": false
    },
    {
      "name": "Current System + 60% Supermajority Threshold",
      "description": "Keep current system but require 60% of seats for constitutional change",
      "results": {
        "Tisza": {"seats": 138, "has_supermajority": false,
                  "note": "138/199 = 69.3%, below new 60% threshold... wait, 69>60, still yes"},
        "note": "Threshold would need to be ~70% to prevent Tisza supermajority"
      }
    }
  ],
  "h4_verdict": "STRONGLY SUPPORTED — under any proportional system, Tisza governs but cannot unilaterally amend the constitution",
  "reform_recommendation": "Adopt German-style compensatory seats to prevent future supermajorities from ~50% vote shares"
}
```

### Task 8: Summary Statistics
File: data/analysis/summary_statistics.json

```json
{
  "generated_at": "ISO timestamp",
  "headline_numbers": {
    "tisza_vote_pct_2026": 53.2,
    "tisza_seat_pct_2026": 69.3,
    "distortion_pp": 16.1,
    "fidesz_constituencies_won": 11,
    "tisza_constituencies_won": 95,
    "flipped_constituencies": 67,
    "rural_flipped": 18,
    "turnout_2026": 78.0,
    "turnout_2022": 70.5,
    "turnout_record_since": 1990,
    "gallagher_index_2026": 14.2,
    "gallagher_index_avg_fidesz_2010_2022": 13.8
  },
  "hypothesis_verdicts": {
    "H1_rural_mobilization": "SUPPORTED",
    "H2_turnout_driven_by_rural_young": "PARTIAL",
    "H3_same_weapon_turned": "SUPPORTED",
    "H4_reform_needed": "STRONGLY SUPPORTED"
  }
}
```

## Completion Signal
Write data/analysis/ANALYSIS_COMPLETE.json:
```json
{
  "completed_at": "ISO timestamp",
  "files_created": [
    "h1_rural_urban_breakdown.json",
    "h1_flipped_constituencies.json",
    "h2_turnout_analysis.json",
    "h3_gallagher_timeline.json",
    "h3_seat_vote_disparity.json",
    "h3_gerrymandering_effectiveness.json",
    "h4_reform_simulation.json",
    "summary_statistics.json"
  ],
  "hypothesis_verdicts": {},
  "ready_for_agent4": true
}
```
