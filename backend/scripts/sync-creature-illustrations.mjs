// Run from backend: node scripts/sync-creature-illustrations.mjs
// Uploads local archive art only when a creature does not already have an illustration.
import 'dotenv/config'
import {createClient} from '@sanity/client'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const imagesDir = path.join(__dirname, '..', 'images')

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const illustrations = {
  Alicanto: 'alicanto.png',
  'Baba Yaga': 'baba-yaga.png',
  Basajaun: 'basajaun.png',
  Chupacabras: 'chupacabra.png',
  Curupira: 'curupira.png',
  Duende: 'duende.png',
  'El Silbón': 'el-silbon.png',
  Kappa: 'kappa.png',
  'La Llorona': 'la-llorona.png',
  Mothman: 'mothman.png',
  Nahual: 'nahual.png',
  Pombero: 'pombero.png',
  Tunda: 'tunda.png',
  Wendigo: 'wendigo.png',
  Yeti: 'yeti.png',
}

for (const [name, filename] of Object.entries(illustrations)) {
  const creature = await client.fetch(
    `*[_type == "creature" && name == $name][0]{_id, archiveIllustration}`,
    {name},
  )
  if (!creature) {
    console.warn(`Skipping ${name}: creature document not found`)
    continue
  }
  if (creature.archiveIllustration?.asset?._ref) {
    console.log(`Keeping existing illustration: ${name}`)
    continue
  }

  const imagePath = path.join(imagesDir, filename)
  const asset = await client.assets.upload('image', fs.createReadStream(imagePath), {filename})
  await client.patch(creature._id).set({
    archiveIllustration: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}},
  }).commit()
  console.log(`Linked illustration: ${name}`)
}
