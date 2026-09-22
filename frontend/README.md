# Frontend setup — Apex Bestiary

## Files in this bundle

```
.env.example                              → copy to .env and fill in real values
src/lib/sanity.ts                          → read-only client
src/lib/sanityWriteClient.ts               → write client (server-only, uses token)
src/lib/calculateCredibility.ts            → credibility scoring logic
src/pages/api/calculate-credibility.ts     → POST endpoint that runs the calculation
```

## Setup

1. Copy everything into `bestiary/frontend/` preserving the folder structure
   (so `src/lib/*` and `src/pages/api/*` land in the right place — merge with
   your existing `src/` if it already has files).

2. Install the Sanity client:
   ```bash
   cd bestiary/frontend
   npm install @sanity/client
   ```

3. Copy `.env.example` to `.env` and fill in:
   - `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` — from your Sanity project.
   - `SANITY_WRITE_TOKEN` — create one at manage.sanity.io → your project → API → Tokens,
     with **Editor** permissions (needs write access to patch `credibilityIndex`).

4. Make sure `astro.config.mjs` has a server-capable adapter (API routes need
   one — e.g. `@astrojs/node` or `@astrojs/vercel`), since `POST` endpoints
   don't work on a purely static build. If you're deploying to Vercel/Netlify,
   their adapters handle this automatically.

## How to call it

From anywhere in your frontend (e.g. right after a visitor submits a new
sighting form):

```ts
await fetch('/api/calculate-credibility', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({sightingId: newSighting._id}),
})
```

This fetches the sighting + its creature + region, cross-references nearby
sightings of the same creature, computes the score, and writes it back to
`credibilityIndex` on the document — so your real-time map can just read
that field directly.

## Next step

Build the sighting submission flow (form → creates the `sighting` document
in Sanity → calls this endpoint → map updates live). Want to do that next,
or the map itself first?
