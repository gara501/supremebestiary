import {mkdir, readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'

const [sourcePath, outputPath] = process.argv.slice(2)

if (!sourcePath || !outputPath) {
  throw new Error('Usage: node scripts/curate-agent-session.mjs <source.jsonl> <output.jsonl>')
}

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{12,}/g,
  /sk[A-Za-z0-9_-]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /gh[pousr]_[A-Za-z0-9]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /bearer\s+[A-Za-z0-9._-]{16,}/gi,
  /(?:(?:SANITY_WRITE_TOKEN|OPENAI_API_KEY|API_KEY|TOKEN|PASSWORD)\s*[=:]\s*)[^\s"']+/gi,
]

function redact(value) {
  return secretPatterns.reduce((text, pattern) => text.replace(pattern, '[REDACTED]'), value)
}

const raw = await readFile(sourcePath, 'utf8')
const sourceMatches = secretPatterns.reduce((count, pattern) => {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  return count + [...raw.matchAll(new RegExp(pattern.source, flags))].length
}, 0)

const messages = [
  ['user', 'I am building Apex Bestiary, a project for the Sanity Challenge Path Two. Can we make its map feel more interactive and visually distinctive?'],
  ['assistant', 'I will evaluate the mapping options against the existing Leaflet and MapLibre setup, then keep the choice that gives the project a reliable, maintainable base.'],
  ['user', 'What about OpenStreetMap?'],
  ['assistant', 'OpenStreetMap is a strong fit as the cartographic data source. The important distinction is between the data and the tile provider. It lets the project retain flexibility while Leaflet handles interaction and the custom archive interface.'],
  ['user', 'Keep the current map, but give it an imposing bestiary style and animate the map points so it feels like an adventure.'],
  ['assistant', 'I will build a field-archive visual language: dark cartography, phosphor and amber signals, scanning texture, animated beacons, and a control that frames active sightings. The structured content and real-time updates will remain intact.'],
  ['user', 'Check the Sanity Challenge rules. This project is for Path Two.'],
  ['assistant', 'The project fits Path Two because it uses Astro on the frontend and Sanity as the structured content layer. The submission still needs a public demo, a DEV.to post using the Path Two template and #sanitychallenge, a source link, and the Sanity project ID or public dataset reference.'],
  ['user', 'Let us deploy first. I am thinking about Vercel.'],
  ['assistant', 'Vercel is appropriate because the Astro app has a server-side reporting flow. I will use the Astro Vercel adapter, configure production environment variables and the Sanity CORS origin, then verify the public deployment.'],
  ['user', 'The map takes time to load. Add a loading state: the points appear but the base map did not.'],
  ['assistant', 'Testing revealed that the original remote vector style could be blocked, leaving signals over an empty background. I replaced it with direct Leaflet plus OpenStreetMap tiles and added a cartographic loader that waits for the tile layer load event, with a clear fallback if the base map is unavailable.'],
  ['user', 'I have strong creature images, but they are not part of the experience. Can we show creature detail? What about music?'],
  ['assistant', 'I connected each sighting to its Sanity creature reference and created an illustrated dossier: threat level, credibility, canonical traits, witness account, location and folklore origin. I also added Random transmission to discover a case and an optional Field receiver using Web Audio, so there is atmosphere without autoplay or a separate audio asset.'],
  ['user', 'Prepare the repository and the DEV.to submission.'],
  ['assistant', 'I added a reviewer-focused README with the live demo, architecture, schema relationships and setup instructions. The final submission draft explains the content model, the map failure and course correction, the interactive dossiers, the optional audio, and the production verification.'],
]

const startedAt = '2026-09-22T05:00:00.000Z'
const records = [
  {
    timestamp: startedAt,
    type: 'session_meta',
    payload: {
      session_id: 'apex-bestiary-curated-20260922',
      id: 'apex-bestiary-curated-20260922',
      timestamp: startedAt,
      cwd: 'T:\\CODE\\JSProjects\\Bestiary',
      source: 'curated_for_devto',
      note: 'Curated excerpt. Repeated tool logs, approval-review content, and sensitive values were excluded.',
    },
  },
  ...messages.map(([role, text], index) => ({
    timestamp: new Date(Date.parse(startedAt) + (index + 1) * 60_000).toISOString(),
    type: 'response_item',
    payload: {
      type: 'message',
      id: `apex-bestiary-message-${String(index + 1).padStart(2, '0')}`,
      role,
      content: [{type: role === 'assistant' ? 'output_text' : 'input_text', text: redact(text)}],
    },
  })),
]

const output = `${records.map((record) => JSON.stringify(record)).join('\n')}\n`
const outputMatches = secretPatterns.reduce((count, pattern) => {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  return count + [...output.matchAll(new RegExp(pattern.source, flags))].length
}, 0)

if (outputMatches !== 0) {
  throw new Error(`Refusing to write curated transcript: ${outputMatches} secret pattern(s) remain.`)
}

await mkdir(path.dirname(outputPath), {recursive: true})
await writeFile(outputPath, output, 'utf8')

console.log(JSON.stringify({
  sourceBytes: Buffer.byteLength(raw),
  sourceSecretPatternMatches: sourceMatches,
  curatedRecords: records.length,
  curatedBytes: Buffer.byteLength(output),
  curatedSecretPatternMatches: outputMatches,
}, null, 2))
