# Apex Bestiary

> A living archive of cryptid sightings, mapped as classified field intelligence.

**[Live field map](https://apex-bestiary.vercel.app/map)** · **[Entity archive](https://apex-bestiary.vercel.app/bestiary)** · **[File a report](https://apex-bestiary.vercel.app/report)** · **[Source code](https://github.com/gara501/supremebestiary)**

Apex Bestiary turns folklore into an interactive investigation. Sightings are structured Sanity documents that appear on a live world map and connect to illustrated entity profiles. The project was built for the [Sanity Challenge — Path Two: Vibe-code Something Strange](https://dev.to/challenges/sanity-2026-09-16).

This README describes the current repository. The hosted demo can lag until the latest changes are deployed.

## Explore the archive

- **Field map (`/map`):** inspect animated sighting signals, open a dossier with the witness account and creature profile, jump to a random transmission, or use the optional synthesized Field receiver.
- **Entity archive (`/bestiary`):** search and filter creature profiles; read descriptions, canonical traits, folklore origins, regions, and threat assessments; and turn on optional background music.
- **Sighting timeline:** select an archived report, compare its observed traits with the entity's canonical traits, and locate its signal on the field map.
- **Connection board:** follow explicit `corroboratedBy` references or review possible matches on a map. A possible match requires the same creature, at least one shared observed trait, and reports within **100 km** and **365 days**. These leads are labeled separately from archived links; they are not verified corroboration.
- **Field report (`/report`, also available at `/`):** pick a location, describe an encounter, add observed traits and environmental conditions, and optionally attach an audio testimony of up to 8 MB. New reports enter the archive with a pending review status and a computed credibility index.

The shared navigation and larger type scale carry the same visual language across the map, archive, and report form. Interface labels and curated archive descriptions are in English; creature and place names retain their proper names.

## Content model and live updates

```text
Creature ── referenced by ──> Sighting <── references ── Region
                                   │
                                   └── corroboratedBy[] ──> Sighting
```

| Document | Key fields |
| --- | --- |
| `creature` | Names, illustration, physical description, distinctive traits, folklore origin, and threat level. |
| `region` | Country, map centroid, folklore history, and depth of oral tradition. |
| `sighting` | Geopoint, witness account, optional testimony audio, observed traits, conditions, review status, credibility index, and references to corroborating reports. |

The Astro frontend uses GROQ projections to resolve creature and region references. Sanity listeners refresh the map and archive when sightings change. The server-side reporting route creates a sighting, calculates its credibility index, and writes that score back to Sanity. The connection board reads explicit references and computes its separate possible-match leads in the browser.

**Sanity project ID:** `en0s05um` · **Dataset:** `bestiary`

## Audio

The map's **Field receiver** is synthesized with Web Audio and starts only after a click. The entity archive has a separate, optional music control with no autoplay.

Music track: **Abyss by Tetuano**. Source: [freetouse.com/music](https://freetouse.com/music). No Copyright Music (Free Download).

## Stack

- [Astro](https://astro.build/) and React for the frontend
- [Sanity Content Lake and Studio](https://www.sanity.io/) for structured content and editing
- [Leaflet](https://leafletjs.com/) and [OpenStreetMap](https://www.openstreetmap.org/) for the field map, report location picker, and connection board
- [Vercel](https://vercel.com/) for deployment and server-side reporting routes

## Local development

Use Node.js **22.12 or newer**.

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:4321`. To run the Sanity Studio separately:

```bash
cd backend
npm install
npm run dev
```

The read-only frontend client and the Studio default to project `en0s05um` and dataset `bestiary`. To submit reports locally, create `frontend/.env` with:

```dotenv
PUBLIC_SANITY_PROJECT_ID=en0s05um
PUBLIC_SANITY_DATASET=bestiary
SANITY_WRITE_TOKEN=your_server_side_write_token
```

The write token is used only by server-side API routes. Keep it private and never give it a `PUBLIC_` prefix. To use your own Sanity project, update the project ID and dataset in `frontend/src/lib/sanity.ts`, `backend/sanity.config.ts`, and `backend/sanity.cli.ts`, then set the matching values in `frontend/.env`. Add your frontend origin to the project's Sanity CORS settings.

The backend seed and maintenance scripts use `backend/.env` with `SANITY_PROJECT_ID`, `SANITY_DATASET`, and `SANITY_WRITE_TOKEN`. The archive-label migration is in `backend/scripts/translate-archive-labels.mjs`; it previews changes by default and applies them only with `--apply`.

## Project structure

```text
frontend/src/components/   Map, entity archive, connection board, shared header, and report form
frontend/src/pages/        Public routes and server-side report APIs
frontend/src/lib/          Sanity clients and credibility scoring
frontend/public/audio/     Optional archive music
backend/schemaTypes/       Creature, region, and sighting schemas
backend/scripts/           Seed and archive maintenance scripts
```

## Build

```bash
cd frontend
npm run build
```

For a quick tour, start on the field map and use **Random transmission**, then open the linked entity profile to inspect its timeline and connection board.
