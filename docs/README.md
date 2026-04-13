# Hungary Elections 1990–2026
## Multi-Agent Research & Visualization Project

### Prerequisites (Windows)
Install these before starting:

| Tool | Download | Check |
|------|----------|-------|
| Python 3.11+ | https://python.org | `python --version` |
| Node.js 18+ | https://nodejs.org | `node --version` |
| Claude Code | `npm install -g @anthropic-ai/claude-code` | `claude --version` |

### Quick Start (Windows)

**Step 1 — Install dependencies**
Open PowerShell in the project folder:
```powershell
.\scripts\setup.ps1
```

**Step 2 — Check everything is ready**
```powershell
.\scripts\check_prereqs.ps1
```

**Step 3 — Open Claude Code**
```powershell
claude
```

**Step 4 — Start the agents**
Copy the contents of `scripts\run_all_prompt.txt` and paste it into Claude Code.
That's it. Claude Code will run all 5 agents sequentially and tell you when done.

---

### What Each Agent Does

| Agent | File | Input | Output |
|-------|------|-------|--------|
| 1 — Collector | `agents/agent1_collector.md` | Internet | `data/raw/*.json` |
| 2 — Database | `agents/agent2_database.md` | `data/raw/` | `data/hungary_elections.db` |
| 3 — Analyzer | `agents/agent3_analyzer.md` | `.db` file | `data/analysis/*.json` |
| 4 — Web App | `agents/agent4_webapp.md` | analysis JSONs | `app/` (Next.js) |
| 5 — Writer | `agents/agent5_writer.md` | analysis JSONs | `article/*.md` |

### The Four Hypotheses

| # | Hypothesis |
|---|-----------|
| H1 | Tisza won via rural constituencies Fidesz gerrymandered for itself in 2011 |
| H2 | Record 78% turnout driven by rural + young voters who were previously passive |
| H3 | Gallagher disproportionality index 2026 ≈ Fidesz 2010–2022 (same weapon, turned) |
| H4 | Pure proportional system would NOT give Tisza a supermajority — reform needed |

### Project Structure
```
hungary-elections/
├── CLAUDE.md                     ← Master project description (Claude Code reads this first)
├── agents/
│   ├── agent1_collector.md       ← Data collection instructions
│   ├── agent2_database.md        ← SQLite database builder
│   ├── agent3_analyzer.md        ← Statistical analysis
│   ├── agent4_webapp.md          ← Next.js web app builder
│   └── agent5_writer.md          ← Article writer (EN + HU)
├── data/
│   ├── raw/                      ← Agent 1 writes here
│   ├── processed/                ← Agent 2 writes here
│   └── analysis/                 ← Agent 3 writes here
├── app/                          ← Agent 4 builds Next.js here
├── article/                      ← Agent 5 writes articles here
├── logs/                         ← Error logs per agent
├── scripts/
│   ├── setup.ps1                 ← Install Python deps (run first)
│   ├── check_prereqs.ps1         ← Verify everything installed
│   └── run_all_prompt.txt        ← Paste this into Claude Code
└── docs/
    ├── README.md                 ← This file
    ├── DEPLOY.md                 ← How to deploy to Vercel
    └── DATA_SOURCES.md           ← All data sources with citations
```

### Deploying the Web App
After Agent 4 completes, open PowerShell in the `app\` folder:
```powershell
npm install -g vercel
vercel login
vercel --prod
```
Vercel is free, global CDN, handles millions of visitors. No server needed.

### Expected Timeline
| Agent | Estimated time |
|-------|---------------|
| Agent 1 (data collection) | 15–30 min |
| Agent 2 (database build) | 5–10 min |
| Agent 3 (analysis) | 10–20 min |
| Agent 4 (web app) | 30–60 min |
| Agent 5 (articles) | 15–25 min |
| **Total** | **~2 hours** |
