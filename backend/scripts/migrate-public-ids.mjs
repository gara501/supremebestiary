import {createClient} from '@sanity/client'

const PROJECT_ID = process.env.SANITY_PROJECT_ID ?? 'en0s05um'
const DATASET = process.env.SANITY_DATASET ?? 'bestiary'
const TOKEN = process.env.SANITY_WRITE_TOKEN
const APPLY = process.argv.includes('--apply')
const TYPES = ['creature', 'region', 'sighting']
const BATCH_SIZE = 20
const CREATE_ORDER = ['region', 'creature', 'sighting']
const DELETE_ORDER = [...CREATE_ORDER].reverse()

if (!TOKEN) {
  throw new Error('SANITY_WRITE_TOKEN is required. The token is never written to output.')
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2026-09-21',
  token: TOKEN,
  useCdn: false,
  perspective: 'raw',
})

function publicId(id) {
  return id.replaceAll('.', '-')
}

function withoutSystemFields(document) {
  const {_id, _rev, _createdAt, _updatedAt, ...content} = document
  return content
}

function rewriteReferences(value, idMap) {
  if (Array.isArray(value)) return value.map((item) => rewriteReferences(item, idMap))
  if (!value || typeof value !== 'object') return value

  const rewritten = {}
  for (const [key, child] of Object.entries(value)) {
    rewritten[key] = key === '_ref' && typeof child === 'string' && idMap.has(child)
      ? idMap.get(child)
      : rewriteReferences(child, idMap)
  }
  return rewritten
}

function containsMigratedReference(value, idMap) {
  if (Array.isArray(value)) return value.some((item) => containsMigratedReference(item, idMap))
  if (!value || typeof value !== 'object') return false
  if (typeof value._ref === 'string' && idMap.has(value._ref)) return true
  return Object.values(value).some((child) => containsMigratedReference(child, idMap))
}

function chunks(items, size) {
  return Array.from({length: Math.ceil(items.length / size)}, (_, index) => items.slice(index * size, (index + 1) * size))
}

const documents = await client.fetch(`*[_type in $types]`, {types: TYPES})
const privateDocuments = documents.filter((document) => document._id.includes('.'))
const idMap = new Map(privateDocuments.map((document) => [document._id, publicId(document._id)]))

const duplicateTargets = new Map()
for (const targetId of idMap.values()) {
  duplicateTargets.set(targetId, (duplicateTargets.get(targetId) ?? 0) + 1)
}
const collisions = [...duplicateTargets].filter(([, count]) => count > 1).map(([id]) => id)
const existingTargets = documents.filter((document) => idMap.has(document._id) === false && [...idMap.values()].includes(document._id))
const externalReferences = documents
  .filter((document) => !idMap.has(document._id))
  .filter((document) => containsMigratedReference(withoutSystemFields(document), idMap))

const summary = {
  mode: APPLY ? 'apply' : 'dry-run',
  projectId: PROJECT_ID,
  dataset: DATASET,
  documentsByType: Object.fromEntries(TYPES.map((type) => [type, documents.filter((document) => document._type === type).length])),
  privateDocumentsToMigrate: privateDocuments.length,
  sampleMappings: privateDocuments.slice(0, 5).map((document) => ({from: document._id, to: idMap.get(document._id)})),
  collisions,
  existingTargetIds: existingTargets.map((document) => document._id),
  externalReferenceIds: externalReferences.map((document) => document._id),
}

console.log(JSON.stringify(summary, null, 2))

if (collisions.length || existingTargets.length || externalReferences.length) {
  throw new Error('Migration stopped before writing: ID collisions or external references require manual review.')
}

if (!APPLY) {
  console.log('\nDry run complete. Re-run with --apply to create public-ID copies and delete the private-ID originals.')
  process.exit(0)
}

const clones = privateDocuments.map((document) => ({
  _id: idMap.get(document._id),
  ...rewriteReferences(withoutSystemFields(document), idMap),
}))

for (const type of CREATE_ORDER) {
  for (const batch of chunks(clones.filter((document) => document._type === type), BATCH_SIZE)) {
    let transaction = client.transaction()
    for (const document of batch) transaction = transaction.create(document)
    await transaction.commit({visibility: 'sync'})
  }
}

for (const type of DELETE_ORDER) {
  for (const batch of chunks(privateDocuments.filter((document) => document._type === type), BATCH_SIZE)) {
    let transaction = client.transaction()
    for (const document of batch) transaction = transaction.delete(document._id)
    await transaction.commit({visibility: 'sync'})
  }
}

const verification = await client.fetch(
  `{
    "remainingPrivate": count(*[_type in $types && _id match "*.*"]),
    "migratedPublic": count(*[_id in $newIds])
  }`,
  {types: TYPES, newIds: clones.map((document) => document._id)},
)

console.log(JSON.stringify({completed: true, ...verification}, null, 2))

if (verification.remainingPrivate !== 0 || verification.migratedPublic !== clones.length) {
  throw new Error('Migration completed but verification did not match the expected document counts.')
}
