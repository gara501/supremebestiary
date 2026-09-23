// Run from backend: node scripts/translate-archive-labels.mjs [--apply]
// Preview by default. Only updates labels that still match the original seed values.
import 'dotenv/config'
import {createClient} from '@sanity/client'

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const translations = {
  'region-mexico': {name: ['México', 'Mexico'], country: ['México', 'Mexico']},
  'region-amazonas-brasil': {name: ['Amazonas, Brasil', 'Amazonas, Brazil'], country: ['Brasil', 'Brazil']},
  'region-chaco-paraguayo': {name: ['Chaco Paraguayo', 'Paraguayan Chaco']},
  'region-galicia': {name: ['Galicia, España', 'Galicia, Spain'], country: ['España', 'Spain']},
  'region-point-pleasant': {country: ['Estados Unidos', 'United States']},
  'region-canada-boreal': {name: ['Bosques boreales, Canadá', 'Boreal Forests, Canada'], country: ['Canadá', 'Canada']},
  'region-kumamoto': {name: ['Prefectura de Kumamoto, Japón', 'Kumamoto Prefecture, Japan'], country: ['Japón', 'Japan']},
  'region-europa-este': {name: ['Europa del Este / Rusia', 'Eastern Europe / Russia'], country: ['Rusia', 'Russia']},
  'region-atacama': {name: ['Desierto de Atacama, Chile', 'Atacama Desert, Chile']},
  'region-pais-vasco': {name: ['País Vasco, España', 'Basque Country, Spain'], country: ['España', 'Spain']},
  'caa5df4f-d7e4-45a0-b4e8-c03de1381efd': {name: ['Mexico,Yucatan peninsula', 'Yucatán Peninsula, Mexico']},
}

const creatureTranslations = {
  '34fc6a53-812b-4cd5-b4a0-7309c85545b3': {
    regionalNames: [
      ['Nahualli ', 'Way ', 'Brujo transmutador'],
      ['Nahualli', 'Way', 'Shapeshifting sorcerer'],
    ],
  },
}

const apply = process.argv.includes('--apply')
const regions = await client.fetch('*[_type == "region"]{_id, _rev, name, country}')

for (const region of regions) {
  const translation = translations[region._id]
  if (!translation) continue
  const change = Object.fromEntries(
    Object.entries(translation)
      .filter(([field, [before]]) => region[field] === before)
      .map(([field, [, after]]) => [field, after]),
  )
  if (!Object.keys(change).length) continue
  console.log(`${region._id}: ${JSON.stringify(change)}`)
  if (apply) await client.patch(region._id).ifRevisionId(region._rev).set(change).commit()
}

const creatures = await client.fetch('*[_type == "creature"]{_id, _rev, regionalNames}')
for (const creature of creatures) {
  const translation = creatureTranslations[creature._id]
  if (!translation) continue
  const [before, after] = translation.regionalNames
  if (JSON.stringify(creature.regionalNames) !== JSON.stringify(before)) continue
  console.log(`${creature._id}: ${JSON.stringify({regionalNames: after})}`)
  if (apply) await client.patch(creature._id).ifRevisionId(creature._rev).set({regionalNames: after}).commit()
}

if (!apply) console.log('Preview only. Pass --apply to update these labels.')
