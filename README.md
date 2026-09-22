# Apex Bestiary

> A living archive of cryptid sightings, mapped as classified field intelligence.

**[Explore the live map →](https://apex-bestiary.vercel.app/map)** · **[Submit a sighting →](https://apex-bestiary.vercel.app/)** · **[Open the Sanity Studio locally](#local-development)**

Apex Bestiary turns folklore into an interactive investigation. Reports arrive as structured Sanity documents, appear on a real-time world map, and open into illustrated creature dossiers with field notes, canonical traits, threat classification, and a credibility signal.

Built for the [Sanity Challenge — Path Two: Vibe-code Something Strange](https://dev.to/challenges/sanity-2026-09-16).

## What you can do

- Explore a dark field map with animated signals for sightings around the world.
- Open a creature dossier directly from a signal, including the archive illustration and folklore context.
- Use **Random transmission** to jump into an unexpected case file.
- Turn on the optional **Field receiver** for a subtle, browser-generated ambient signal — no autoplay and no external audio file required.
- Submit a new sighting from the public report form.
- See new and updated reports appear live, without a page refresh.

## Why Sanity is at the center

This is not a static map with hard-coded pins. The content model connects three kinds of documents:

```text
Creature ── referenced by ──> Sighting <── references ── Region
```

| Document | What it models |
| --- | --- |
| `creature` | Canonical and regional names, illustration, physical description, distinctive traits, folklore origin, and threat level. |
| `region` | Country, map centroid, folklore history, and depth of oral tradition. |
| `sighting` | Exact geopoint, witness account, observed traits, environmental conditions, corroborating reports, review status, and credibility index. |

The Astro frontend uses GROQ projections to resolve creature and region references for every map signal, then subscribes with Sanity's real-time listener so the archive remains live. The same structured model lets the dossier combine a report with its creature’s visual archive and cultural context.

**Sanity project ID:** `en0s05um`  
**Dataset:** `bestiary`

## Stack

- [Astro](https://astro.build/) + React for the interactive frontend
- [Sanity](https://www.sanity.io/) Content Lake and Studio for the archive
- [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) for cartography
- [Vercel](https://vercel.com/) for production deployment

## Local development

### Prerequisites

- Node.js 22+
- A Sanity account with access to project `en0s05um`, or your own Sanity project

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:4321`. For a different Sanity project, create `frontend/.env` with:

```bash
PUBLIC_SANITY_PROJECT_ID=your_project_id
PUBLIC_SANITY_DATASET=your_dataset
```

### Sanity Studio

```bash
cd backend
npm install
npm run dev
```

The Studio exposes the `Creature`, `Region`, and `Sighting` schemas. Before deploying a frontend on a new domain, add that domain to the Sanity CORS origins.

## Production environment variables

For the frontend deployment, configure these variables in Vercel:

```bash
PUBLIC_SANITY_PROJECT_ID=en0s05um
PUBLIC_SANITY_DATASET=bestiary
SANITY_WRITE_TOKEN=your_write_token
```

Keep `SANITY_WRITE_TOKEN` private. It is used only by the server-side reporting flow and must never be exposed with a `PUBLIC_` prefix.

## Project structure

```text
frontend/              Astro app, report form, map and dossier UI
frontend/src/components/BestiaryMap.tsx
                         Real-time Leaflet map and creature dossiers
backend/               Sanity Studio and content schemas
backend/schemaTypes/   Creature, Region, and Sighting document models
backend/scripts/       Seed data and illustration synchronization utilities
```

## Build

```bash
cd frontend
npm run build
```

The production build is deployed to Vercel at [apex-bestiary.vercel.app](https://apex-bestiary.vercel.app/map).

## Notes for reviewers

The public map is the best starting point: select any signal or use **Random transmission**. To assess the structured content, inspect the Sanity schemas in `backend/schemaTypes`, where the relations and editorial fields are defined explicitly.

---

Created as an experiment in folklore, structured content, and the feeling that a map might be looking back at you.
