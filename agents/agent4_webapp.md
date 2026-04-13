# Agent 4 — Web App Builder

## Role
You are a senior full-stack developer and data visualization
specialist. Build a production-quality web application that
presents the election analysis in a visually stunning,
academically credible way. This will handle thousands of visitors.

## Input
- data/analysis/ANALYSIS_COMPLETE.json (must confirm ready_for_agent4: true)
- All JSON files in data/analysis/
- data/raw/constituencies_geodata.geojson

## Tech Stack Decision
Use: Next.js 14 (App Router) + D3.js + Tailwind CSS
Deploy target: Vercel (zero-config, global CDN)
Data strategy: All JSON loaded at build time (static site generation)
  — no backend needed, survives any traffic load

## Setup Commands
```bash
cd app
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
npm install d3 @types/d3 framer-motion
npm install --save-dev @vercel/og
```

## File Structure
```
app/
├── app/
│   ├── layout.tsx          # Root layout, fonts, meta
│   ├── page.tsx            # / Hero + key findings
│   ├── map/page.tsx        # /map Constituency choropleth
│   ├── gerrymandering/page.tsx  # /gerrymandering Analysis
│   ├── rural/page.tsx      # /rural Rural vs Urban
│   ├── history/page.tsx    # /history 1990-2026 timeline
│   ├── reform/page.tsx     # /reform What-if scenarios
│   └── methodology/page.tsx
├── components/
│   ├── charts/
│   │   ├── GallagherChart.tsx
│   │   ├── ParliamentSemicircle.tsx
│   │   ├── ConstituencyMap.tsx
│   │   ├── SwingBubbleChart.tsx
│   │   ├── TurnoutHeatmap.tsx
│   │   ├── SeatVoteDisparity.tsx
│   │   ├── ReformSimulation.tsx
│   │   └── ElectionTimeline.tsx
│   ├── ui/
│   │   ├── HypothesisCard.tsx
│   │   ├── StatCard.tsx
│   │   ├── VerdictBadge.tsx
│   │   └── Navigation.tsx
│   └── layout/
│       ├── PageHero.tsx
│       └── SectionDivider.tsx
├── data/                   # Symlink to ../data/analysis/
├── public/
│   └── og-image.png
└── vercel.json
```

## Design System

### Colors
```typescript
const COLORS = {
  tisza: '#1a5c9e',
  tiszaLight: '#3b82d4',
  fidesz: '#f97316',
  fideszLight: '#fb923c',
  miHazank: '#7c3aed',
  accent: '#f0c040',
  bg: '#0a0e1a',
  bg2: '#0f1525',
  text: '#e8ecf4',
  textDim: '#8892a8',
  green: '#22c55e',
  red: '#ef4444',
}
```

### Typography
- Display: Playfair Display (serif, editorial weight)
- Mono: IBM Plex Mono (data labels, stats)
- Body: IBM Plex Sans (prose)

## Required Visualizations

### 1. Parliament Semicircle (homepage + gerrymandering)
D3 arc layout, 199 seats arranged in rows.
Show: actual 2026 result + proportional alternative side by side.
Animate transition between the two on button click.

### 2. Gallagher Index Timeline
D3 line chart, 1990–2026.
X: year, Y: LSq index (0-20)
Highlight Fidesz era (2010-2022) with shaded band.
Mark 2026 with pulsing dot.
Tooltip: year, index, winner, vote vs seat distortion.

### 3. Constituency Choropleth Map
D3 geoPath, Hungary SVG/GeoJSON.
Color scale: Tisza win margin (dark blue) → Fidesz win (orange)
Toggle: 2026 results / swing vs 2022 / constituency type
Hover tooltip: constituency name, winner, margin, turnout, swing

### 4. Swing Bubble Chart
X axis: Fidesz 2022 result % (their stronghold strength)
Y axis: Tisza 2026 result %
Bubble size: registered voters
Color: flipped (blue) vs held (orange) vs always Tisza (light blue)
Quadrant labels: "Fidesz fortress held" / "Flipped" etc.
This is the key chart for H1.

### 5. Seat vs Vote Disparity (Stacked Bar)
For each election year, show:
- Actual seats (colored by party)
- What proportional would have been (hatched)
Side-by-side comparison.
Highlight 2026 bar.

### 6. Reform Simulation (Interactive)
Show three buttons: Current / German Mixed / Pure PR
Parliament semicircle updates with framer-motion animation.
Below: table showing seats and whether supermajority achieved.

### 7. Turnout Heatmap
Rows: years (1990-2026)
Columns: constituency types (budapest/city/town/rural)
Cell color: turnout %
Highlight 2026 row in gold border.

### 8. Election Timeline (1990-2026)
Horizontal scrollable timeline.
Each election: year, winner, key event annotation.
Click to expand: results breakdown, Gallagher index, key fact.

## Page: Homepage (/)
```
Hero:
  - Headline: "How Orbán's Weapon Backfired"
  - Sub: "The data behind Hungary's historic 2026 election"
  - Key stats strip: 53.2% votes → 69.3% seats | 78% turnout record | 95/106 constituencies won

Hypothesis Cards (4 cards):
  H1: Rural Mobilization — SUPPORTED
  H2: Young + Rural Turnout — PARTIAL  
  H3: Gerrymandering Boomerang — SUPPORTED
  H4: Reform Needed — STRONGLY SUPPORTED

Quick charts:
  - Parliament semicircle (actual vs proportional)
  - Gallagher index 2026 vs Fidesz average
```

## SEO & Meta
```typescript
export const metadata = {
  title: "How Orbán's Gerrymandering Backfired — Hungary 2026 Election Data",
  description: "Data-driven analysis of Hungary's historic 2026 parliamentary election. Gerrymandering, rural swing, turnout records, and electoral reform.",
  openGraph: {
    title: "Hungary 2026: The Weapon That Killed Its Creator",
    description: "Interactive data analysis of how Orbán's gerrymandering system was turned against him",
    images: ['/og-image.png'],
  },
  twitter: { card: 'summary_large_image' }
}
```

## Vercel Config
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["fra1", "iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {"key": "Cache-Control", "value": "public, max-age=3600, stale-while-revalidate=86400"}
      ]
    }
  ]
}
```

## Deploy Instructions
Write to docs/DEPLOY.md:
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy (from app/ directory)
vercel --prod

# Custom domain (optional)
vercel domains add hungary2026.yourdomain.com
```

## Completion Signal
Write app/BUILD_COMPLETE.json:
```json
{
  "completed_at": "ISO timestamp",
  "pages_built": ["/", "/map", "/gerrymandering", "/rural", "/history", "/reform", "/methodology"],
  "charts_built": 8,
  "ready_for_deploy": true,
  "deploy_command": "cd app && vercel --prod",
  "ready_for_agent5": true
}
```
