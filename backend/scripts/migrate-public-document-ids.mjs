import {config} from 'dotenv'
import {createClient} from '@sanity/client'
import {randomUUID} from 'node:crypto'
import {mkdirSync, writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

config({path: fileURLToPath(new URL('../.env', import.meta.url))})
const client = createClient({projectId: process.env.SANITY_PROJECT_ID, dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_WRITE_TOKEN, apiVersion: '2025-02-19', useCdn: false, perspective: 'raw'})
if (!process.env.SANITY_WRITE_TOKEN) throw new Error('SANITY_WRITE_TOKEN is required')
const documents = await client.fetch('*[!(_type in ["sanity.imageAsset", "sanity.fileAsset"])]')
const prefixes = {creature: 'creature.', region: 'region.', sighting: 'sighting.source-'}
const targets = documents.filter(doc => prefixes[doc._type] && doc._id.startsWith(prefixes[doc._type]))
const ids = new Map(targets.map(doc => [doc._id, randomUUID()]))
const drafts = documents.filter(doc => doc._id.startsWith('drafts.') && ids.has(doc._id.slice(7)))
for (const doc of drafts) ids.set(doc._id, `drafts.${ids.get(doc._id.slice(7))}`)
targets.push(...drafts)
for (const doc of targets) {
  const source = doc.importSourceId ?? doc._id.replace(/^drafts\./, '')
  if (documents.some(other => !ids.has(other._id) && other.importSourceId === source)) {
    throw new Error(`Duplicate import source: ${source}`)
  }
}
function remap(value) {
  if (Array.isArray(value)) return value.map(remap)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) =>
    [key, key === '_ref' && ids.has(item) ? ids.get(item) : remap(item)]))
  return value
}
const patches = documents.filter(doc => !ids.has(doc._id)).map(doc => {
  const fields = Object.fromEntries(Object.entries(doc).filter(([key, value]) =>
    !key.startsWith('_') && JSON.stringify(value) !== JSON.stringify(remap(value)))
    .map(([key, value]) => [key, remap(value)]))
  return {doc, fields}
}).filter(({fields}) => Object.keys(fields).length)
// Paired drafts keep their unpublished content and follow their published document ID.
// Other drafts and releases require manual review before modifying references.
if (patches.some(({doc}) => doc._id.includes('.'))) throw new Error('A draft or system document references a target; review manually')
console.log(JSON.stringify({mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
  migrate: targets.reduce((counts, doc) => ({...counts, [doc._type]: (counts[doc._type] ?? 0) + 1}), {}),
  otherDocumentsToRelink: patches.length}, null, 2))
if (targets.length && process.argv.includes('--apply')) {
  const backupDir = fileURLToPath(new URL('../.local-backups/', import.meta.url))
  mkdirSync(backupDir, {recursive: true})
  const backupPath = `${backupDir}/public-document-ids-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  writeFileSync(backupPath, JSON.stringify({projectId: client.config().projectId, dataset: client.config().dataset,
    createdAt: new Date().toISOString(), idMap: Object.fromEntries(ids), documents}, null, 2), {flag: 'wx'})
  console.log(`Backup: ${backupPath}`)
  const tx = client.transaction()
  for (const doc of targets) {
    const {_rev, _createdAt, _updatedAt, ...content} = remap(doc)
    tx.create({...content, _id: ids.get(doc._id), importSourceId: doc.importSourceId ?? doc._id.replace(/^drafts\./, '')})
  }
  for (const {doc, fields} of patches) tx.patch(doc._id, patch => patch.ifRevisionId(doc._rev).set(fields))
  for (const doc of targets) {
    tx.patch(doc._id, patch => patch.ifRevisionId(doc._rev).set({importSourceId: doc.importSourceId ?? doc._id}))
    tx.delete(doc._id)
  }
  const result = await tx.commit({visibility: 'sync'})
  console.log(`Committed atomic migration: ${result.transactionId}`)
}
