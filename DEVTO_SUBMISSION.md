---
title: "Apex Bestiary: a living cryptid archive powered by Sanity"
published: false
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16).*

> **Suggested cover image:** a crop of one of the classified creature dossier illustrations, or a screenshot of the map with several glowing signals. Upload it in DEV before publishing.

## What I Built

**Apex Bestiary** is a living archive of cryptid sightings. It treats folklore as field intelligence: each report becomes a signal on a dark, interactive world map, and each signal can open a classified dossier containing the creature’s illustration, threat level, canonical traits, witness testimony, and folklore origin.

I wanted the experience to feel less like browsing a database and more like receiving a strange transmission. The map has animated beacons, a cartographic loading state, a **Random transmission** button that takes the visitor to an unexpected case file, and an opt-in **Field receiver** that creates a subtle ambient signal in the browser. There is no autoplay or external audio asset: the receiver is synthesized only after an intentional click.

The important part is that the weird interface is backed by real structured content. New reports are stored in Sanity and the map subscribes to the archive so it can reflect changes without a page refresh.

## Demo

- **Live map:** [apex-bestiary.vercel.app/map](https://apex-bestiary.vercel.app/map)
- **Sighting report form:** [apex-bestiary.vercel.app](https://apex-bestiary.vercel.app)
- **Source code:** [github.com/gara501/supremebestiary](https://github.com/gara501/supremebestiary)

No login is needed to explore the map. For the quickest tour, open the live map and press **Random transmission**. It flies to a sighting and opens the corresponding creature dossier.

<!-- Add 2–3 screenshots here before publishing: (1) world map with animated signals, (2) an open dossier, (3) the reporting form or Sanity Studio. -->

## Code

The project is an Astro + React frontend and a Sanity Studio, deployed on Vercel.

- **Frontend:** Astro, React, Leaflet, and OpenStreetMap tiles
- **Content layer:** Sanity Content Lake, Sanity Studio, GROQ, image assets, and real-time listeners
- **Deployment:** Vercel

The map resolves the connected content it needs with a GROQ projection: a sighting retrieves its creature and region references, then uses the creature illustration and metadata in the dossier. The map’s real-time listener re-fetches the full projected sighting after an archive event, because live events alone do not resolve those relationships.

## My Build Process

I built this with **Codex** as an AI-native coding partner, but the project was shaped through a series of concrete product and technical decisions rather than a single one-shot prompt.

### 1. Start with the content model, not the map pins

The first decision was to model the archive as relationships, not a flat list of monster locations. I created three document types in Sanity:

```text
Creature ── referenced by ──> Sighting <── references ── Region
```

- A **Creature** has its canonical and regional names, visual archive illustration, physical description, distinctive traits, threat level, and folklore origin.
- A **Region** has a country, a geographic center, folklore history, and an estimate of oral-tradition depth.
- A **Sighting** has an exact geopoint, witness details, a freeform account, observed traits, environmental conditions, corroboration references, a review status, and a computed credibility index.

That structure meant I could make a sighting feel like evidence rather than a marker with a tooltip. When someone opens a signal, the frontend can join the report with the creature’s illustration and cultural context in one dossier.

### 2. Make the map feel like an interface from the archive

The early version worked, but it did not create much tension or curiosity. I iterated on the visual language: dark field notes, phosphor-green credibility signals, amber controls, scanning lines, and animated beacons.

The main interaction changes were deliberately small:

- **Locate signals** frames the active evidence.
- **Random transmission** gives a visitor an immediate story without requiring them to know where to click.
- Selecting a marker flies the map to the case and opens a detailed dossier.
- A selected beacon intensifies, so the connection between map and dossier remains clear.

The dossiers use Sanity image assets directly and show a short "developing archive plate" reveal while an illustration is loading. That turned an otherwise awkward blank image moment into part of the fiction.

### 3. Course-correct a real map failure

One of the useful failures was the base map. I initially used a vector-style provider, but a content filter blocked the tile/style request in testing. The sighting markers still appeared, which made the archive feel broken: data without geography.

Instead of treating that as a cosmetic issue, I changed the map to direct Leaflet + OpenStreetMap raster tiles and added a clear loading and timeout state. The frontend now waits for the base layer’s load event before dismissing the map loader. The result is both more reliable and much easier to explain to a first-time visitor.

### 4. Add sound without making the site noisy

I considered background music, but decided it would work better as an instrument the visitor controls. The **Field receiver** is an optional Web Audio composition: a very low oscillator pair and a small chirp when a dossier is selected. It starts only after a user gesture and can be switched off immediately.

That gave the map atmosphere without shipping a heavy audio asset or surprising visitors with autoplay.

### 5. Ship and verify the complete path

I deployed the frontend to Vercel, configured the Sanity project variables and CORS origin, and verified the live map, tile loading, animated signals, and an opened illustrated dossier in production.

## Sanity Project Details

- **Sanity project ID:** `en0s05um`
- **Dataset:** `bestiary`

The schema definitions are public in [`backend/schemaTypes`](https://github.com/gara501/supremebestiary/tree/main/backend/schemaTypes). They are the core of the project: the frontend is designed around the relationships and editorial context in those documents, rather than using Sanity as a generic key-value store.

## Agent Session

<!-- Optional but recommended: upload a curated Codex session at https://dev.to/agent_sessions/new, make it public, and embed it here. Review it for secrets before publishing. -->

## What I learned

The most interesting part of this project was discovering that structured content can be the engine of a strange interface. A map of cryptids only becomes compelling when each point knows which creature it belongs to, where the tradition comes from, what traits were observed, and how a report relates to the rest of the archive.

Sanity made it possible to build that connection first and then let the interface turn it into a field investigation.

