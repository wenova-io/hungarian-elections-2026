# Hungarian Elections 1990–2026
## Multi-Agent Research & Visualization Project

### Overview
This is a sequential multi-agent research project. Each agent has a
clearly defined input, task, and output. Run agents in order 1→5.
Never skip an agent. Save all intermediate outputs before proceeding.

### Project Goal
Collect, analyze and visualize Hungarian parliamentary election data
from 1990 to 2026. Test four specific hypotheses about gerrymandering,
rural mobilization and electoral system fairness. Publish findings as
an interactive web app and a Medium-quality English article.

### Hypotheses
H1: Tisza won its supermajority by breaking into rural constituencies
    that Fidesz gerrymandered for itself in 2011 — not only through
    urban dominance.

H2: Record turnout (78%) was driven disproportionately by rural and
    young voters who were previously passive or Fidesz-leaning.

H3: The mandátum/szavazat distortion (Gallagher index) in 2026 is
    statistically comparable to Fidesz 2010–2022. The same weapon
    turned against its creator.

H4: A fairer proportional system would NOT have given Tisza a
    supermajority — and this structural flaw should be reformed
    regardless of who benefits from it.

### Agent Execution Order
1. agents/agent1_collector.md     → data/raw/
2. agents/agent2_database.md      → data/hungary_elections.db
3. agents/agent3_analyzer.md      → data/analysis/
4. agents/agent4_webapp.md        → app/
5. agents/agent5_writer.md        → article/

### Global Rules
- Save ALL intermediate files. Never discard raw data.
- Mark estimated or interpolated data with _estimated suffix or flag column.
- 2026 data may be partial — handle gracefully, note coverage %.
- All monetary/population figures in Hungarian context (HUF, millions).
- All analysis outputs must be valid JSON, readable by the web app.
- Log errors to logs/agent{N}_errors.log, do not silently fail.
- When in doubt about a data point, flag it rather than fabricate it.

### File Naming Convention
data/raw/elections_{year}_raw.json
data/raw/constituencies_{year}_raw.json
data/raw/turnout_{year}_raw.json
data/processed/elections_clean.csv
data/processed/constituencies_clean.csv
data/analysis/hypothesis_{N}_{name}.json
article/hungary-election-2026.md
article/hungary-election-2026-hu.md  (Hungarian version)
