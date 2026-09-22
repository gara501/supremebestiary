// Run with: node scripts/seed-sightings.mjs
// (from bestiary/backend, same .env as seed-creatures.mjs)
//
// Creates ~2 test sightings per creature. Roughly half are designed to
// CORROBORATE each other (same creature, close in time/space, matching
// traits) so you'll see high, green credibility scores on the map. The
// other half are deliberately weak or inconsistent, so you'll see low,
// red scores — this contrast is what sells the "structured content lets
// you compute this" argument in your demo.
//
// Idempotent: uses deterministic _ids. Credibility is recalculated every
// run (safe to re-run after adding more sightings).

import 'dotenv/config'
import {createClient} from '@sanity/client'

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

// ---------- credibility logic (mirrors src/lib/calculateCredibility.ts) ----------

const WEIGHTS = {
  traitConsistency: 0.3,
  witnessCredibility: 0.2,
  witnessState: 0.1,
  corroboration: 0.25,
  folkloreDensity: 0.15,
}

function distanceKm(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

function traitConsistency(observed, canonical) {
  if (!observed?.length || !canonical?.length) return 0
  const canonicalNorm = canonical.map((t) => t.toLowerCase().trim())
  const matches = observed.filter((t) => canonicalNorm.includes(t.toLowerCase().trim()))
  return matches.length / canonical.length
}

function witnessStateFactor(state) {
  switch (state) {
    case 'sober':
      return 1
    case 'stressed':
      return 0.75
    case 'impaired':
      return 0.35
    default:
      return 0.6
  }
}

function corroborationFactor(current, nearby, maxRadiusKm = 50, maxDays = 365) {
  if (!nearby.length) return 0
  const currentDate = new Date(current.date).getTime()
  let score = 0
  for (const other of nearby) {
    if (other.distanceKm > maxRadiusKm) continue
    const dayDiff = Math.abs(currentDate - new Date(other.date).getTime()) / 86_400_000
    if (dayDiff > maxDays) continue
    const overlap = traitConsistency(current.observedTraits, other.observedTraits)
    const distanceWeight = 1 - other.distanceKm / maxRadiusKm
    const timeWeight = 1 - dayDiff / maxDays
    score += overlap * distanceWeight * timeWeight
  }
  return Math.min(score / Math.max(nearby.length, 1), 1)
}

function folkloreDensityFactor(centuries) {
  return Math.min((centuries ?? 0) / 5, 1)
}

function calculateCredibilityIndex({sighting, creature, region, nearbySightings}) {
  const consistency = traitConsistency(sighting.observedTraits, creature.distinctiveTraits)
  const witnessCredibility = sighting.witness.baseCredibility / 5
  const stateFactor = witnessStateFactor(sighting.witness.witnessState)
  const corroboration = corroborationFactor(sighting, nearbySightings)
  const folkloreDensity = folkloreDensityFactor(region.centuriesOfTradition)

  const raw =
    consistency * WEIGHTS.traitConsistency +
    witnessCredibility * WEIGHTS.witnessCredibility +
    stateFactor * WEIGHTS.witnessState +
    corroboration * WEIGHTS.corroboration +
    folkloreDensity * WEIGHTS.folkloreDensity

  return Math.round(raw * 100)
}

// ---------- test sighting data ----------
// location = {lat, lng} near the creature's region centroid.
// Pairs sharing the same `pairId` are designed to corroborate: close
// location, close date, overlapping observedTraits.

const SIGHTINGS = [
  // --- Chupacabras: strong corroboration pair ---
  {
    _id: 'sighting.chupacabras-1',
    creatureName: 'Chupacabras',
    location: {lat: 19.45, lng: -99.12},
    date: '2026-03-14T22:00:00.000Z',
    timeOfDay: 'night',
    observedTraits: ['glowing red eyes', 'spines along the back', 'gray-green leathery skin'],
    witness: {anonymous: true, baseCredibility: 3, witnessState: 'stressed'},
    freeformDescription: 'Saw it crouched by the fence line, spines visible along its back, eyes reflecting the flashlight.',
    environmentalConditions: {moonPhase: 'full', weather: 'clear', visibility: 'good'},
    pairId: 'chupacabras',
  },
  {
    _id: 'sighting.chupacabras-2',
    creatureName: 'Chupacabras',
    location: {lat: 19.47, lng: -99.1},
    date: '2026-03-16T23:00:00.000Z',
    timeOfDay: 'late_night',
    observedTraits: ['glowing red eyes', 'spines along the back'],
    witness: {anonymous: false, name: 'R. Delgado', occupation: 'rancher', baseCredibility: 4, witnessState: 'sober'},
    freeformDescription: 'Livestock spooked around midnight; found the same spined creature near the water trough, eyes glowing.',
    environmentalConditions: {moonPhase: 'full', weather: 'clear', visibility: 'good'},
    pairId: 'chupacabras',
  },

  // --- Nahual: strong corroboration pair ---
  {
    _id: 'sighting.nahual-1',
    creatureName: 'Nahual',
    location: {lat: 19.4, lng: -99.15},
    date: '2026-05-02T04:00:00.000Z',
    timeOfDay: 'dawn',
    observedTraits: ['glowing yellow eyes', 'mid-transformation blur', 'jaguar-like fur'],
    witness: {anonymous: true, baseCredibility: 3, witnessState: 'stressed'},
    freeformDescription: 'A figure that seemed to shift between human and jaguar shape at the treeline, yellow eyes fixed on me.',
    environmentalConditions: {moonPhase: 'new', weather: 'fog', visibility: 'fair'},
    pairId: 'nahual',
  },
  {
    _id: 'sighting.nahual-2',
    creatureName: 'Nahual',
    location: {lat: 19.42, lng: -99.13},
    date: '2026-05-03T05:00:00.000Z',
    timeOfDay: 'dawn',
    observedTraits: ['glowing yellow eyes', 'jaguar-like fur'],
    witness: {anonymous: false, name: 'anon. farmhand', occupation: 'farmhand', baseCredibility: 3, witnessState: 'sober'},
    freeformDescription: 'Same stretch of road, saw something with a blurred outline and yellow eyes cross in front of the truck.',
    environmentalConditions: {moonPhase: 'new', weather: 'fog', visibility: 'fair'},
    pairId: 'nahual',
  },

  // --- Mothman: strong corroboration pair ---
  {
    _id: 'sighting.mothman-1',
    creatureName: 'Mothman',
    location: {lat: 38.85, lng: -82.13},
    date: '2026-01-10T21:00:00.000Z',
    timeOfDay: 'night',
    observedTraits: ['huge moth-like wings', 'glowing red eyes', 'no visible head'],
    witness: {anonymous: false, name: 'D. Carter', occupation: 'police officer', baseCredibility: 5, witnessState: 'sober'},
    freeformDescription: 'Winged shape following the car along the old TNT road, eyes glowing solid red, no visible head or neck.',
    environmentalConditions: {moonPhase: 'waning', weather: 'clear', visibility: 'good'},
    pairId: 'mothman',
  },
  {
    _id: 'sighting.mothman-2',
    creatureName: 'Mothman',
    location: {lat: 38.84, lng: -82.15},
    date: '2026-01-12T20:30:00.000Z',
    timeOfDay: 'dusk',
    observedTraits: ['huge moth-like wings', 'glowing red eyes'],
    witness: {anonymous: true, baseCredibility: 3, witnessState: 'stressed'},
    freeformDescription: 'Something huge lifted off from the tree line, wings wider than I\u2019ve ever seen on a bird, eyes glowing.',
    environmentalConditions: {moonPhase: 'waning', weather: 'clear', visibility: 'fair'},
    pairId: 'mothman',
  },

  // --- Wendigo: strong corroboration pair ---
  {
    _id: 'sighting.wendigo-1',
    creatureName: 'Wendigo',
    location: {lat: 51.05, lng: -85.05},
    date: '2025-12-20T18:00:00.000Z',
    timeOfDay: 'night',
    observedTraits: ['skeletal emaciated body', 'antlers', 'unnaturally elongated limbs'],
    witness: {anonymous: false, name: 'park ranger (withheld)', occupation: 'park ranger', baseCredibility: 4, witnessState: 'sober'},
    freeformDescription: 'Tracks far too long between strides, then a gaunt antlered shape at the edge of the cabin light.',
    environmentalConditions: {moonPhase: 'new', weather: 'snow', visibility: 'poor'},
    pairId: 'wendigo',
  },
  {
    _id: 'sighting.wendigo-2',
    creatureName: 'Wendigo',
    location: {lat: 51.02, lng: -84.98},
    date: '2025-12-22T19:00:00.000Z',
    timeOfDay: 'night',
    observedTraits: ['skeletal emaciated body', 'antlers'],
    witness: {anonymous: true, baseCredibility: 3, witnessState: 'impaired'},
    freeformDescription: 'Same antlered, starved-looking shape near the frozen creek, gone before I could get a clear look.',
    environmentalConditions: {moonPhase: 'new', weather: 'snow', visibility: 'poor'},
    pairId: 'wendigo',
  },

  // --- Kappa: strong corroboration pair ---
  {
    _id: 'sighting.kappa-1',
    creatureName: 'Kappa',
    location: {lat: 32.79, lng: 130.74},
    date: '2026-07-01T15:00:00.000Z',
    timeOfDay: 'day',
    observedTraits: ['turtle-like shell', 'water-filled head depression', 'webbed hands'],
    witness: {anonymous: false, name: 'local fisherman', occupation: 'fisherman', baseCredibility: 4, witnessState: 'sober'},
    freeformDescription: 'Something surfaced by the riverbank with a shell on its back and a shallow dish of water on its head.',
    environmentalConditions: {moonPhase: 'waxing', weather: 'clear', visibility: 'good'},
    pairId: 'kappa',
  },
  {
    _id: 'sighting.kappa-2',
    creatureName: 'Kappa',
    location: {lat: 32.8, lng: 130.75},
    date: '2026-07-02T14:00:00.000Z',
    timeOfDay: 'day',
    observedTraits: ['turtle-like shell', 'webbed hands'],
    witness: {anonymous: true, baseCredibility: 3, witnessState: 'sober'},
    freeformDescription: 'Kids said something with webbed hands and a shell grabbed at the riverweed and slipped back under.',
    environmentalConditions: {moonPhase: 'waxing', weather: 'clear', visibility: 'good'},
    pairId: 'kappa',
  },

  // --- Baba Yaga: corroboration pair ---
  {
    _id: 'sighting.baba-yaga-1',
    creatureName: 'Baba Yaga',
    location: {lat: 55.76, lng: 37.62},
    date: '2026-02-05T17:00:00.000Z',
    timeOfDay: 'dusk',
    observedTraits: ['hunched elderly figure', 'gnarled branch-like fingers'],
    witness: {anonymous: true, baseCredibility: 2, witnessState: 'stressed'},
    freeformDescription: 'An old woman standing motionless at the treeline, fingers far too long and bent like roots.',
    environmentalConditions: {moonPhase: 'full', weather: 'fog', visibility: 'poor'},
    pairId: 'baba-yaga',
  },
  {
    _id: 'sighting.baba-yaga-2',
    creatureName: 'Baba Yaga',
    location: {lat: 55.77, lng: 37.64},
    date: '2026-02-06T18:00:00.000Z',
    timeOfDay: 'dusk',
    observedTraits: ['hunched elderly figure', 'hut on chicken legs nearby'],
    witness: {anonymous: true, baseCredibility: 2, witnessState: 'stressed'},
    freeformDescription: 'A small hut seemed to shift position between two visits, an old woman watching from the doorway.',
    environmentalConditions: {moonPhase: 'full', weather: 'fog', visibility: 'poor'},
    pairId: 'baba-yaga',
  },

  // --- Yeti: corroboration pair ---
  {
    _id: 'sighting.yeti-1',
    creatureName: 'Yeti',
    location: {lat: 27.99, lng: 86.93},
    date: '2026-04-10T08:00:00.000Z',
    timeOfDay: 'day',
    observedTraits: ['thick white-gray fur', 'massive footprints', 'hunched bipedal posture'],
    witness: {anonymous: false, name: 'expedition guide', occupation: 'mountaineering guide', baseCredibility: 5, witnessState: 'sober'},
    freeformDescription: 'Found a line of oversized footprints in fresh snow, then a hunched fur-covered shape crossing the ridge above camp.',
    environmentalConditions: {moonPhase: 'waning', weather: 'clear', visibility: 'good'},
    pairId: 'yeti',
  },
  {
    _id: 'sighting.yeti-2',
    creatureName: 'Yeti',
    location: {lat: 27.98, lng: 86.95},
    date: '2026-04-11T09:00:00.000Z',
    timeOfDay: 'day',
    observedTraits: ['thick white-gray fur', 'massive footprints'],
    witness: {anonymous: false, name: 'second expedition member', occupation: 'mountaineer', baseCredibility: 4, witnessState: 'sober'},
    freeformDescription: 'Same trail of footprints, much larger than any known animal in the area, no clear view of the source.',
    environmentalConditions: {moonPhase: 'waning', weather: 'clear', visibility: 'good'},
    pairId: 'yeti',
  },

  // --- Alicanto: corroboration pair ---
  {
    _id: 'sighting.alicanto-1',
    creatureName: 'Alicanto',
    location: {lat: -23.63, lng: -70.4},
    date: '2026-06-01T02:00:00.000Z',
    timeOfDay: 'late_night',
    observedTraits: ['metallic shimmering wings', 'glowing eyes'],
    witness: {anonymous: false, name: 'night-shift miner', occupation: 'miner', baseCredibility: 4, witnessState: 'sober'},
    freeformDescription: 'A bird with wings that shimmered like polished metal flew low over the camp, eyes glowing faintly.',
    environmentalConditions: {moonPhase: 'new', weather: 'clear', visibility: 'good'},
    pairId: 'alicanto',
  },
  {
    _id: 'sighting.alicanto-2',
    creatureName: 'Alicanto',
    location: {lat: -23.65, lng: -70.38},
    date: '2026-06-02T01:00:00.000Z',
    timeOfDay: 'late_night',
    observedTraits: ['metallic shimmering wings', 'nocturnal flight'],
    witness: {anonymous: true, baseCredibility: 3, witnessState: 'sober'},
    freeformDescription: 'Something with gleaming wings circled the ridge twice before heading toward the old mine entrance.',
    environmentalConditions: {moonPhase: 'new', weather: 'clear', visibility: 'good'},
    pairId: 'alicanto',
  },

  // --- Weak / inconsistent single reports (deliberately low credibility) ---
  {
    _id: 'sighting.la-llorona-1',
    creatureName: 'La Llorona',
    location: {lat: 19.3, lng: -99.2},
    date: '2025-08-15T23:00:00.000Z',
    timeOfDay: 'night',
    observedTraits: ['heard crying near the canal'],
    witness: {anonymous: true, baseCredibility: 1, witnessState: 'impaired'},
    freeformDescription: 'Heard crying near the canal, didn\u2019t actually see anything, might have been the wind.',
    environmentalConditions: {moonPhase: 'unknown', weather: 'fog', visibility: 'poor'},
  },
  {
    _id: 'sighting.el-silbon-1',
    creatureName: 'El Silbón',
    location: {lat: 7.8, lng: -66.3},
    date: '2025-11-02T22:00:00.000Z',
    timeOfDay: 'night',
    observedTraits: ['distinctive whistling sound'],
    witness: {anonymous: true, baseCredibility: 2, witnessState: 'unspecified'},
    freeformDescription: 'A whistle that seemed to move around us in the dark, never saw a figure.',
    environmentalConditions: {moonPhase: 'waning', weather: 'clear', visibility: 'fair'},
  },
  {
    _id: 'sighting.curupira-1',
    creatureName: 'Curupira',
    location: {lat: -3.5, lng: -62.3},
    date: '2026-02-14T13:00:00.000Z',
    timeOfDay: 'day',
    observedTraits: ['backward-facing feet'],
    witness: {anonymous: false, name: 'logger', occupation: 'logger', baseCredibility: 2, witnessState: 'stressed'},
    freeformDescription: 'Footprints leading the wrong direction confused the whole crew, no visual sighting.',
    environmentalConditions: {moonPhase: 'unknown', weather: 'clear', visibility: 'good'},
  },
  {
    _id: 'sighting.pombero-1',
    creatureName: 'Pombero',
    location: {lat: -22.9, lng: -60.1},
    date: '2026-01-20T20:00:00.000Z',
    timeOfDay: 'dusk',
    observedTraits: ['wide straw hat'],
    witness: {anonymous: true, baseCredibility: 2, witnessState: 'unspecified'},
    freeformDescription: 'A short shape near the chicken coop, gone by the time we got the lantern lit.',
    environmentalConditions: {moonPhase: 'unknown', weather: 'clear', visibility: 'fair'},
  },
  {
    _id: 'sighting.duende-1',
    creatureName: 'Duende',
    location: {lat: 42.6, lng: -8.1},
    date: '2025-09-30T19:00:00.000Z',
    timeOfDay: 'dusk',
    observedTraits: ['pointed ears', 'unsettlingly wide grin'],
    witness: {anonymous: false, name: 'child (per parent report)', occupation: 'n/a', baseCredibility: 1, witnessState: 'unspecified'},
    freeformDescription: 'My daughter says a little man with pointy ears waved at her from the garden wall.',
    environmentalConditions: {moonPhase: 'unknown', weather: 'clear', visibility: 'good'},
  },
  {
    _id: 'sighting.tunda-1',
    creatureName: 'Tunda',
    location: {lat: 5.7, lng: -76.7},
    date: '2026-03-01T14:00:00.000Z',
    timeOfDay: 'day',
    observedTraits: ['shapeshifting appearance'],
    witness: {anonymous: true, baseCredibility: 2, witnessState: 'stressed'},
    freeformDescription: 'Thought I saw my brother ahead on the trail, but something about him felt wrong and he vanished.',
    environmentalConditions: {moonPhase: 'unknown', weather: 'fog', visibility: 'poor'},
  },
  {
    _id: 'sighting.basajaun-1',
    creatureName: 'Basajaun',
    location: {lat: 43.05, lng: -2.45},
    date: '2025-10-10T07:00:00.000Z',
    timeOfDay: 'dawn',
    observedTraits: ['towering height', 'thick brown-gray fur'],
    witness: {anonymous: false, name: 'shepherd', occupation: 'shepherd', baseCredibility: 4, witnessState: 'sober'},
    freeformDescription: 'A huge fur-covered figure stood at the ridge line watching the flock, then withdrew into the trees.',
    environmentalConditions: {moonPhase: 'unknown', weather: 'fog', visibility: 'fair'},
  },
]

// ---------- run ----------

async function getCreatureIndex() {
  const creatures = await client.fetch(
    `*[_type == "creature"]{_id, name, distinctiveTraits, "regionRef": regions[0]._ref, "region": regions[0]->{centuriesOfTradition}}`,
  )
  const byName = new Map()
  for (const c of creatures) byName.set(c.name, c)
  return byName
}

async function seedSightings() {
  const creatureIndex = await getCreatureIndex()

  console.log('Creating sighting documents...\n')
  for (const s of SIGHTINGS) {
    const creature = creatureIndex.get(s.creatureName)
    if (!creature) {
      console.warn(`⚠ Creature "${s.creatureName}" not found, skipping ${s._id}`)
      continue
    }

    const doc = {
      _id: s._id,
      _type: 'sighting',
      creature: {_type: 'reference', _ref: creature._id},
      region: {_type: 'reference', _ref: creature.regionRef},
      location: {_type: 'geopoint', lat: s.location.lat, lng: s.location.lng},
      witness: {
        anonymous: s.witness.anonymous,
        name: s.witness.anonymous ? undefined : s.witness.name,
        occupation: s.witness.occupation,
        baseCredibility: s.witness.baseCredibility,
        witnessState: s.witness.witnessState,
      },
      date: s.date,
      timeOfDay: s.timeOfDay,
      freeformDescription: s.freeformDescription,
      observedTraits: s.observedTraits,
      environmentalConditions: s.environmentalConditions,
      status: 'pending',
    }

    const result = await client.createIfNotExists(doc)
    console.log(`${result ? '✓ created' : '· skipped (exists)'}  ${s._id}`)
  }

  console.log('\nCalculating credibility indexes...\n')
  for (const s of SIGHTINGS) {
    const creature = creatureIndex.get(s.creatureName)
    if (!creature) continue

    const others = await client.fetch(
      `*[_type == "sighting" && creature._ref == $creatureId && _id != $id]{_id, observedTraits, date, location}`,
      {creatureId: creature._id, id: s._id},
    )

    const nearby = others
      .filter((o) => o.location)
      .map((o) => ({
        _id: o._id,
        observedTraits: o.observedTraits ?? [],
        date: o.date,
        distanceKm: distanceKm(s.location, o.location),
      }))

    const credibilityIndex = calculateCredibilityIndex({
      sighting: {observedTraits: s.observedTraits, date: s.date, witness: s.witness},
      creature: {distinctiveTraits: creature.distinctiveTraits ?? []},
      region: {centuriesOfTradition: creature.region?.centuriesOfTradition ?? 0},
      nearbySightings: nearby,
    })

    await client.patch(s._id).set({credibilityIndex}).commit()
    console.log(`  ${s._id} → credibilityIndex: ${credibilityIndex}`)
  }

  console.log('\nDone. Open /map to see the results.')
}

seedSightings().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
