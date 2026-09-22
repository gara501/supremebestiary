// Run with: node scripts/seed-creatures.mjs
// (from bestiary/backend, with a .env file containing SANITY_PROJECT_ID,
// SANITY_DATASET, and SANITY_WRITE_TOKEN — see .env.example)
//
// Idempotent: every document uses a deterministic _id, so re-running this
// script will NOT create duplicates. It also skips image upload if the
// expected file isn't found, so you can run it once to create the text
// content and again later once images are in place.

import 'dotenv/config'
import {createClient} from '@sanity/client'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGES_DIR = path.join(__dirname, '..', 'images')

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

/**
 * Each entry: the region it belongs to (created once, reused if repeated),
 * and the creature itself. `imageFile` should match a file you place in
 * bestiary/backend/images/ — rename your generated images to match, or
 * edit these filenames to match what you already have.
 */
const REGIONS = {
  mexico: {
    _id: 'region.mexico',
    name: 'México',
    country: 'México',
    centroid: {lat: 19.4326, lng: -99.1332},
    centuriesOfTradition: 5,
    folkloreHistory: 'Deeply rooted urban and rural legend tradition spanning centuries, blending indigenous and colonial-era folklore.',
  },
  venezuelaColombiaLlanos: {
    _id: 'region.llanos',
    name: 'Los Llanos (Venezuela/Colombia)',
    country: 'Venezuela',
    centroid: {lat: 8.0, lng: -66.0},
    centuriesOfTradition: 3,
    folkloreHistory: 'Plains folklore passed down among cattle-herding communities, tied to isolated nighttime travel.',
  },
  brasilAmazonas: {
    _id: 'region.amazonas-brasil',
    name: 'Amazonas, Brasil',
    country: 'Brasil',
    centroid: {lat: -3.4653, lng: -62.2159},
    centuriesOfTradition: 4,
    folkloreHistory: 'Indigenous forest-guardian mythology predating European contact, still widely told among rural communities.',
  },
  paraguayChaco: {
    _id: 'region.chaco-paraguayo',
    name: 'Chaco Paraguayo',
    country: 'Paraguay',
    centroid: {lat: -23.0, lng: -60.0},
    centuriesOfTradition: 3,
    folkloreHistory: 'Guaraní-rooted spirit folklore tied to rural and forested homesteads.',
  },
  espanaGalicia: {
    _id: 'region.galicia',
    name: 'Galicia, España',
    country: 'España',
    centroid: {lat: 42.5751, lng: -8.1339},
    centuriesOfTradition: 6,
    folkloreHistory: 'Celtic-influenced folklore tradition with a long written and oral record.',
  },
  usaWestVirginia: {
    _id: 'region.point-pleasant',
    name: 'Point Pleasant, West Virginia',
    country: 'Estados Unidos',
    centroid: {lat: 38.8459, lng: -82.1351},
    centuriesOfTradition: 0,
    folkloreHistory: 'A modern (1960s) sighting wave, extensively documented in local press rather than long oral tradition.',
  },
  canadaBoreal: {
    _id: 'region.canada-boreal',
    name: 'Bosques boreales, Canadá',
    country: 'Canadá',
    centroid: {lat: 51.0, lng: -85.0},
    centuriesOfTradition: 5,
    folkloreHistory: 'Algonquian-rooted tradition tied to isolation, starvation, and taboo in the northern forest.',
  },
  nepalHimalaya: {
    _id: 'region.himalaya',
    name: 'Himalaya, Nepal',
    country: 'Nepal',
    centroid: {lat: 27.9881, lng: 86.925},
    centuriesOfTradition: 4,
    folkloreHistory: 'Sherpa and mountaineering-era folklore, reinforced by unexplained footprints at high altitude.',
  },
  japonKumamoto: {
    _id: 'region.kumamoto',
    name: 'Prefectura de Kumamoto, Japón',
    country: 'Japón',
    centroid: {lat: 32.7898, lng: 130.7417},
    centuriesOfTradition: 5,
    folkloreHistory: 'One of the oldest documented yokai traditions, tied to rivers and cautionary tales for children.',
  },
  rusiaEuropaEste: {
    _id: 'region.europa-este',
    name: 'Europa del Este / Rusia',
    country: 'Rusia',
    centroid: {lat: 55.7558, lng: 37.6173},
    centuriesOfTradition: 6,
    folkloreHistory: 'Slavic oral tradition with centuries of documented tales and regional variants.',
  },
  chileAtacama: {
    _id: 'region.atacama',
    name: 'Desierto de Atacama, Chile',
    country: 'Chile',
    centroid: {lat: -23.6345, lng: -70.3956},
    centuriesOfTradition: 3,
    folkloreHistory: 'Mining-community folklore tied to the desert night sky and remote camps.',
  },
  colombiaChoco: {
    _id: 'region.choco',
    name: 'Chocó, Colombia',
    country: 'Colombia',
    centroid: {lat: 5.6947, lng: -76.6583},
    centuriesOfTradition: 3,
    folkloreHistory: 'Afro-Colombian Pacific coast tradition tied to jungle paths and river travel.',
  },
  espanaPaisVasco: {
    _id: 'region.pais-vasco',
    name: 'País Vasco, España',
    country: 'España',
    centroid: {lat: 43.0, lng: -2.5},
    centuriesOfTradition: 6,
    folkloreHistory: 'Basque mythology with pre-Christian roots, tied to forest stewardship.',
  },
}

const CREATURES = [
  {
    _id: 'creature.la-llorona',
    name: 'La Llorona',
    regionKey: 'mexico',
    distinctiveTraits: ['long flowing white dress', 'wailing cry', 'face hidden by hair', 'unnaturally long arms'],
    physicalDescription: 'An elongated female figure wrapped in translucent white fabric, face obscured, arms extended unnaturally.',
    threatLevel: 'caution',
    folkloreOrigin: 'A grieving spirit said to wander near water, searching for children she lost.',
    imageFile: 'la-llorona.png',
  },
  {
    _id: 'creature.el-silbon',
    name: 'El Silbón',
    regionKey: 'venezuelaColombiaLlanos',
    distinctiveTraits: ['extremely tall thin figure', 'wide-brimmed hat', 'carries a sack of bones', 'distinctive whistling'],
    physicalDescription: 'A gaunt, unnaturally tall humanoid whose whistle is said to grow fainter the closer he actually is.',
    threatLevel: 'dangerous',
    folkloreOrigin: 'A cautionary plains legend punishing a son who defied his father.',
    imageFile: 'el-silbon.png',
  },
  {
    _id: 'creature.curupira',
    name: 'Curupira',
    regionKey: 'brasilAmazonas',
    regionalNames: ['Caipora'],
    distinctiveTraits: ['backward-facing feet', 'fiery red hair', 'bark-like skin'],
    physicalDescription: 'A child-sized forest spirit whose reversed footprints mislead hunters and loggers.',
    threatLevel: 'caution',
    folkloreOrigin: 'A forest guardian punishing those who harm the jungle.',
    imageFile: 'curupira.png',
  },
  {
    _id: 'creature.pombero',
    name: 'Pombero',
    regionKey: 'paraguayChaco',
    distinctiveTraits: ['short stocky hairy body', 'wide straw hat', 'unusually long fingers'],
    physicalDescription: 'A short, hirsute humanoid rarely seen fully, usually only at the edge of firelight.',
    threatLevel: 'caution',
    folkloreOrigin: 'A trickster spirit of the night, both feared and appeased with offerings.',
    imageFile: 'pombero.png',
  },
  {
    _id: 'creature.duende',
    name: 'Duende',
    regionKey: 'espanaGalicia',
    distinctiveTraits: ['pointed ears', 'bark-like wrinkled skin', 'unsettlingly wide grin'],
    physicalDescription: 'A diminutive humanoid known for mischief rather than malice.',
    threatLevel: 'harmless',
    folkloreOrigin: 'A household or forest trickster spirit found across Iberian and Latin American folklore.',
    imageFile: 'duende.png',
  },
  {
    _id: 'creature.mothman',
    name: 'Mothman',
    regionKey: 'usaWestVirginia',
    distinctiveTraits: ['huge moth-like wings', 'glowing red eyes', 'no visible head'],
    physicalDescription: 'A winged humanoid figure with glowing eyes, reported before the Silver Bridge collapse of 1967.',
    threatLevel: 'unknown',
    folkloreOrigin: 'A modern American cryptid, closely tied to a specific documented sighting wave.',
    imageFile: 'mothman.png',
  },
  {
    _id: 'creature.wendigo',
    name: 'Wendigo',
    regionKey: 'canadaBoreal',
    regionalNames: ['Windigo'],
    distinctiveTraits: ['skeletal emaciated body', 'antlers', 'unnaturally elongated limbs'],
    physicalDescription: 'A gaunt, antlered figure associated with starvation, winter, and taboo.',
    threatLevel: 'dangerous',
    folkloreOrigin: 'An Algonquian-rooted spirit representing famine and the consequences of cannibalism.',
    imageFile: 'wendigo.png',
  },
  {
    _id: 'creature.yeti',
    name: 'Yeti',
    regionKey: 'nepalHimalaya',
    regionalNames: ['Abominable Snowman'],
    distinctiveTraits: ['thick white-gray fur', 'massive footprints', 'hunched bipedal posture'],
    physicalDescription: 'A large, fur-covered bipedal creature associated with high-altitude sightings and footprints.',
    threatLevel: 'unknown',
    folkloreOrigin: 'A Himalayan legend reinforced by early 20th-century mountaineering expeditions.',
    imageFile: 'yeti.png',
  },
  {
    _id: 'creature.kappa',
    name: 'Kappa',
    regionKey: 'japonKumamoto',
    distinctiveTraits: ['turtle-like shell', 'water-filled head depression', 'webbed hands'],
    physicalDescription: 'An amphibious humanoid tied to rivers, said to be dangerous if its head-water spills.',
    threatLevel: 'caution',
    folkloreOrigin: 'One of Japan\u2019s oldest yokai, used historically as a cautionary tale for children near water.',
    imageFile: 'kappa.png',
  },
  {
    _id: 'creature.baba-yaga',
    name: 'Baba Yaga',
    regionKey: 'rusiaEuropaEste',
    distinctiveTraits: ['hunched elderly figure', 'hut on chicken legs nearby', 'gnarled branch-like fingers'],
    physicalDescription: 'An ambiguous witch-like figure, sometimes helpful, sometimes monstrous, living in a mobile hut.',
    threatLevel: 'dangerous',
    folkloreOrigin: 'A central figure of Slavic folklore with centuries of documented tale variants.',
    imageFile: 'baba-yaga.png',
  },
  {
    _id: 'creature.alicanto',
    name: 'Alicanto',
    regionKey: 'chileAtacama',
    distinctiveTraits: ['metallic shimmering wings', 'glowing eyes', 'nocturnal flight'],
    physicalDescription: 'A nocturnal bird said to feed on precious metals, its wings shimmering gold or silver.',
    threatLevel: 'harmless',
    folkloreOrigin: 'A Chilean mining-community legend, said to lead the greedy off cliffs and the honest to fortune.',
    imageFile: 'alicanto.png',
  },
  {
    _id: 'creature.tunda',
    name: 'Tunda',
    regionKey: 'colombiaChoco',
    distinctiveTraits: ['backward feet', 'shapeshifting appearance', 'distorted double-image blur'],
    physicalDescription: 'A shapeshifting figure that lures victims by imitating loved ones, disorienting them in the jungle.',
    threatLevel: 'dangerous',
    folkloreOrigin: 'Afro-Colombian Pacific coast legend warning against wandering alone in the forest.',
    imageFile: 'tunda.png',
  },
  {
    _id: 'creature.basajaun',
    name: 'Basajaun',
    regionKey: 'espanaPaisVasco',
    distinctiveTraits: ['towering height', 'thick brown-gray fur', 'calm protective demeanor'],
    physicalDescription: 'A giant, fur-covered guardian of the forest, said to protect shepherds\u2019 flocks from harm.',
    threatLevel: 'harmless',
    folkloreOrigin: 'A Basque mythological figure with pre-Christian roots, tied to forest stewardship.',
    imageFile: 'basajaun.png',
  },
]

async function ensureRegion(regionKey) {
  const region = REGIONS[regionKey]
  const doc = {
    _id: region._id,
    _type: 'region',
    name: region.name,
    country: region.country,
    centroid: {_type: 'geopoint', lat: region.centroid.lat, lng: region.centroid.lng},
    centuriesOfTradition: region.centuriesOfTradition,
    folkloreHistory: region.folkloreHistory,
  }
  await client.createIfNotExists(doc)
  return region._id
}

async function uploadImageIfPresent(imageFile) {
  const filePath = path.join(IMAGES_DIR, imageFile)
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠ Image not found, skipping illustration: ${filePath}`)
    return null
  }
  const asset = await client.assets.upload('image', fs.createReadStream(filePath), {
    filename: imageFile,
  })
  return asset._id
}

async function seed() {
  console.log(`Seeding into project ${process.env.SANITY_PROJECT_ID}, dataset ${process.env.SANITY_DATASET}\n`)

  for (const creature of CREATURES) {
    console.log(`→ ${creature.name}`)
    const regionId = await ensureRegion(creature.regionKey)
    const assetId = await uploadImageIfPresent(creature.imageFile)

    const doc = {
      _id: creature._id,
      _type: 'creature',
      name: creature.name,
      regionalNames: creature.regionalNames ?? [],
      regions: [{_type: 'reference', _ref: regionId, _key: regionId}],
      physicalDescription: creature.physicalDescription,
      distinctiveTraits: creature.distinctiveTraits,
      threatLevel: creature.threatLevel,
      folkloreOrigin: creature.folkloreOrigin,
      ...(assetId
        ? {archiveIllustration: {_type: 'image', asset: {_type: 'reference', _ref: assetId}}}
        : {}),
    }

    const result = await client.createIfNotExists(doc)
    console.log(result ? '  ✓ created' : '  · already existed, skipped')
  }

  console.log('\nDone.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
