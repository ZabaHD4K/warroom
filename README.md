# War Room — Real-Time OSINT Conflict Dashboard

A real-time, interactive global map that aggregates open-source intelligence (OSINT) data to visualize active conflicts, military events, and geopolitical incidents worldwide.

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

> **⚠️ This project is under active development.** Features may be incomplete, APIs may change, and bugs are expected. Contributions and feedback are welcome.

## Overview

War Room scrapes and normalizes data from multiple OSINT sources, processes it through a geospatial pipeline, and displays it on an interactive map with live updates. Think of a military command center — but public, open-source, and powered by AI-generated summaries.

### Key Features

- **Live conflict map** — Events plotted by type (attacks, explosions, protests) with real-time WebSocket updates
- **Multi-source aggregation** — ACLED, GDELT, RSS feeds, deduplicated and normalized
- **AI-powered summaries** — LLM-generated situation briefings for event clusters
- **Geospatial queries** — PostGIS-backed spatial filtering by bounding box
- **Filterable feeds** — Filter by conflict type, country, date range, and source
- **Dark theme UI** — Military-style dashboard with color-coded event markers

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────────┐
│   Scrapers   │────▶│   Express   │────▶│    Next.js + Map     │
│ (TypeScript) │     │ + WebSocket │     │ (Deck.gl + MapLibre) │
└──────┬───────┘     └──────┬──────┘     └──────────────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌─────────────┐
│  PostgreSQL   │     │  Claude API  │
│   + PostGIS   │     │  (Summaries) │
└──────────────┘     └─────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express, TypeScript, WebSocket (ws), node-cron |
| Database | PostgreSQL + PostGIS (Docker) |
| Scrapers | TypeScript, native fetch, adm-zip |
| AI Summaries | Claude API (@anthropic-ai/sdk) |
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Map | MapLibre GL + Deck.gl (ScatterplotLayer) |

## Data Sources

| Source | Type | Update Frequency |
|--------|------|-----------------|
| [ACLED](https://acleddata.com/) | Conflict events (battles, explosions, protests) | Every 6h |
| [GDELT](https://www.gdeltproject.org/) | Global media events with geolocation (CSV) | Every 15 min |
| RSS (BBC, NYT, Al Jazeera) | Military/conflict news | Every 1h |

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL + PostGIS)
- Optional: ACLED API key, Anthropic API key

### Installation

```bash
# Clone
git clone https://github.com/ZabaHD4K/warroom.git
cd warroom

# Start database
docker compose up -d

# Backend
cd backend
cp .env.example .env    # Edit with your API keys (optional)
npm install
npm run dev             # Runs on http://localhost:3001

# Frontend (new terminal)
cd frontend
npm install
npm run dev             # Runs on http://localhost:3000
```

GDELT and RSS scrapers work without any API keys. ACLED requires a free API key from [acleddata.com](https://acleddata.com/register/).

## Project Structure

```
warroom/
├── backend/
│   ├── src/
│   │   ├── index.ts           # Express app + scheduler
│   │   ├── config.ts          # Environment config
│   │   ├── db/                # PostgreSQL pool + schema init
│   │   ├── routes/            # REST endpoints (events, summaries)
│   │   ├── scrapers/          # ACLED, GDELT, RSS scrapers
│   │   ├── services/          # Event CRUD, broadcast, LLM summaries
│   │   └── models/            # TypeScript types
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js app router (page + layout)
│   │   ├── components/        # ConflictMap, Filters, EventPanel, etc.
│   │   ├── hooks/             # useEvents, useStats
│   │   └── lib/               # API client, types, colors
│   └── package.json
├── docker-compose.yml         # PostGIS database
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events?bbox=&event_type=&country=&source=&date_from=&date_to=` | Query events with filters |
| GET | `/api/events/stats` | Global counters (total, 24h, by type/source) |
| GET | `/api/events/:id` | Single event detail |
| POST | `/api/summaries/generate` | Generate AI situation briefing |
| WS | `/ws/events` | Real-time event updates |
| GET | `/health` | Health check |

## Roadmap

- [x] Express backend with TypeScript
- [x] PostgreSQL + PostGIS schema with geospatial indexes
- [x] ACLED scraper with pagination and retry
- [x] GDELT CSV scraper (15-min conflict event dumps)
- [x] RSS scraper with conflict keyword filtering
- [x] REST API with bbox, country, type, date filters
- [x] WebSocket live updates
- [x] Next.js frontend with dark theme
- [x] Deck.gl scatterplot map with color-coded events
- [x] Filter panel + event detail panel
- [x] Stats bar with live counters
- [x] Claude API situation briefings
- [ ] Timeline slider
- [ ] Heatmap layer
- [ ] Cross-source event deduplication
- [ ] Military aviation tracking (ADS-B)
- [ ] Deployment (Fly.io + Vercel)

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
