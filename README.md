# War Room — Real-Time OSINT Conflict Dashboard

A real-time, interactive global map that aggregates open-source intelligence (OSINT) data to visualize active conflicts, military events, and geopolitical incidents worldwide.

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

## Overview

War Room scrapes and normalizes data from multiple OSINT sources, processes it through a geospatial pipeline, and displays it on an interactive map with live updates. Think of a military command center — but public, open-source, and powered by AI-generated summaries.

### Key Features

- **Live conflict map** — Events plotted by type (attacks, explosions, naval movements, protests) with real-time WebSocket updates
- **Multi-source aggregation** — ACLED, GDELT, defense RSS feeds, and more, deduplicated and normalized
- **AI-powered summaries** — LLM-generated briefs for event clusters ("12 drone attacks in Kursk region in the last 24h, targeting energy infrastructure")
- **Timeline slider** — Scrub through time to see how conflicts evolve
- **Geospatial queries** — PostGIS-backed spatial filtering by region, radius, and bounding box
- **Filterable feeds** — Filter by conflict type, region, date range, and source

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   Scrapers   │────▶│   FastAPI    │────▶│  Next.js + Map   │
│   (Python)   │     │  + WebSocket │     │  (Deck.gl/Mapbox) │
└──────┬───────┘     └──────┬───────┘     └──────────────────┘
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
| Scrapers | Python, asyncio, httpx, BeautifulSoup |
| Database | PostgreSQL + PostGIS |
| Backend | FastAPI, WebSockets, SQLAlchemy |
| AI Summaries | Claude API |
| Frontend | Next.js, TypeScript, Deck.gl / Mapbox GL |
| Deployment | Fly.io (backend), Vercel (frontend) |

## Data Sources

| Source | Type | Update Frequency |
|--------|------|-----------------|
| [ACLED](https://acleddata.com/) | Conflict events (battles, explosions, protests) | Daily |
| [GDELT](https://www.gdeltproject.org/) | Global media events with geolocation | ~15 min |
| Defense RSS feeds | Military news and reports | Hourly |
| ADS-B Exchange | Military aviation tracking | Real-time |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ with PostGIS extension
- API keys: ACLED, Mapbox, Claude API

### Installation

```bash
# Clone the repo
git clone https://github.com/ZabaHD4K/warroom.git
cd warroom

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env  # Fill in your API keys

# Frontend
cd ../frontend
npm install
cp .env.example .env.local  # Fill in your API keys

# Database
createdb warroom
psql warroom -c "CREATE EXTENSION postgis;"

# Run
cd ../backend && uvicorn app.main:app --reload
cd ../frontend && npm run dev
```

## Project Structure

```
warroom/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── api/               # REST + WebSocket endpoints
│   │   ├── scrapers/          # OSINT data scrapers
│   │   ├── models/            # SQLAlchemy models
│   │   ├── services/          # Business logic + LLM summaries
│   │   └── core/              # Config, database, dependencies
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js app router
│   │   ├── components/        # Map, Timeline, EventFeed, Filters
│   │   ├── hooks/             # WebSocket, data fetching
│   │   └── lib/               # API client, types, utils
│   ├── package.json
│   └── .env.example
└── README.md
```

## Roadmap

- [x] Project setup and architecture design
- [ ] ACLED scraper + data normalization pipeline
- [ ] PostgreSQL + PostGIS schema and geospatial queries
- [ ] FastAPI REST endpoints for events
- [ ] Basic map with event markers (Deck.gl)
- [ ] WebSocket live updates
- [ ] Event deduplication across sources
- [ ] GDELT integration
- [ ] Timeline slider
- [ ] LLM-powered cluster summaries (Claude API)
- [ ] Region-based filtering and heatmaps
- [ ] Defense RSS feed scrapers
- [ ] Military aviation tracking layer

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
