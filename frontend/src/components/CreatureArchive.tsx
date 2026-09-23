import {useEffect, useMemo, useRef, useState} from 'react'
import {sanityClient} from '../lib/sanity'
import './CreatureArchive.css'

interface Creature {
  _id: string
  name: string
  regionalNames?: string[]
  physicalDescription?: string
  distinctiveTraits?: string[]
  folkloreOrigin?: string
  threatLevel?: 'harmless' | 'caution' | 'dangerous' | 'unknown'
  imageUrl?: string
  regions?: {name: string; country?: string}[]
}

interface FieldSighting {
  _id: string
  creatureId: string
  date?: string
  credibilityIndex?: number | null
  status?: string
  observedTraits?: string[]
  freeformDescription?: string
  location?: {lat: number; lng: number}
  region?: {name: string; country?: string} | null
}

const CREATURE_QUERY = `*[_type == "creature"] | order(name asc) {
  _id, name, regionalNames, physicalDescription, distinctiveTraits, folkloreOrigin, threatLevel,
  "imageUrl": archiveIllustration.asset->url,
  "regions": regions[]->{name, country}
}`

const SIGHTINGS_QUERY = `*[_type == "sighting" && defined(creature._ref)] | order(date desc) {
  _id, "creatureId": creature._ref, date, credibilityIndex, status,
  observedTraits, freeformDescription, location,
  "region": region->{name, country}
}`

const THREATS: Record<string, {label: string; className: string; description: string}> = {
  harmless: {label: 'LOW RISK', className: 'low', description: 'No hostile behavior documented'},
  caution: {label: 'CAUTION', className: 'caution', description: 'Approach only with field support'},
  dangerous: {label: 'HIGH THREAT', className: 'high', description: 'Direct contact strongly discouraged'},
  unknown: {label: 'UNCLASSIFIED', className: 'unknown', description: 'Insufficient evidence to assess'},
}

const FILTERS = [
  {value: 'all', label: 'All files'},
  {value: 'dangerous', label: 'High threat'},
  {value: 'caution', label: 'Caution'},
  {value: 'harmless', label: 'Low risk'},
  {value: 'unknown', label: 'Unknown'},
]

function getHashId() {
  try { return decodeURIComponent(window.location.hash.slice(1)) } catch { return '' }
}

function formatSightingDate(value?: string) {
  if (!value) return 'Date unrecorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unrecorded' : new Intl.DateTimeFormat('en', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(date)
}

function normalizeTrait(value: string) {
  return value.trim().toLocaleLowerCase()
}

export default function CreatureArchive() {
  const [creatures, setCreatures] = useState<Creature[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [sightings, setSightings] = useState<FieldSighting[]>([])
  const [sightingsStatus, setSightingsStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [selectedSightingId, setSelectedSightingId] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [musicOn, setMusicOn] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setStatus('loading')
      setSightingsStatus('loading')
      const [creatureResult, sightingResult] = await Promise.allSettled([
        sanityClient.fetch<Creature[]>(CREATURE_QUERY),
        sanityClient.fetch<FieldSighting[]>(SIGHTINGS_QUERY),
      ])
      if (!active) return
      if (creatureResult.status === 'fulfilled') {
        setCreatures(creatureResult.value)
        setSelectedId(creatureResult.value.find((creature) => creature._id === getHashId())?._id ?? creatureResult.value[0]?._id ?? '')
        setStatus('ready')
      } else {
        console.error('Unable to load the entity archive:', creatureResult.reason)
        setStatus('error')
      }
      if (sightingResult.status === 'fulfilled') {
        setSightings(sightingResult.value)
        setSightingsStatus('ready')
      } else {
        console.error('Unable to load field reports:', sightingResult.reason)
        setSightingsStatus('error')
      }
    }
    load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    let requestVersion = 0
    const subscription = sanityClient.listen('*[_type == "sighting"]', {}, {tag: 'bestiary-archive-live'}).subscribe({
      next: async () => {
        const version = ++requestVersion
        try {
          const latest = await sanityClient.fetch<FieldSighting[]>(SIGHTINGS_QUERY)
          if (active && version === requestVersion) {
            setSightings(latest)
            setSightingsStatus('ready')
          }
        } catch (error) {
          console.error('Unable to refresh field reports:', error)
        }
      },
      error: (error) => console.error('Live field report feed error:', error),
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      const id = getHashId()
      if (creatures.some((creature) => creature._id === id)) setSelectedId(id)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [creatures])

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [])

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return creatures.filter((creature) => {
      const matchesFilter = filter === 'all' || (creature.threatLevel ?? 'unknown') === filter
      const matchesQuery = !term || [creature.name, ...(creature.regionalNames ?? []), ...(creature.regions?.map((region) => region.name) ?? [])]
        .some((value) => value.toLocaleLowerCase().includes(term))
      return matchesFilter && matchesQuery
    })
  }, [creatures, filter, query])

  const selected = creatures.find((creature) => creature._id === selectedId) ?? creatures[0]
  const threat = THREATS[selected?.threatLevel ?? 'unknown'] ?? THREATS.unknown
  const selectedIndex = creatures.findIndex((creature) => creature._id === selected?._id)
  const creatureSightings = useMemo(() => sightings.filter((sighting) => sighting.creatureId === selected?._id), [sightings, selected?._id])
  const selectedSighting = creatureSightings.find((sighting) => sighting._id === selectedSightingId) ?? creatureSightings[0]
  const canonicalTraits = selected?.distinctiveTraits ?? []
  const observedTraits = selectedSighting?.observedTraits ?? []
  const observedSet = new Set(observedTraits.map(normalizeTrait))
  const canonicalSet = new Set(canonicalTraits.map(normalizeTrait))
  const matchedCount = canonicalTraits.filter((trait) => observedSet.has(normalizeTrait(trait))).length
  const unlistedObservations = observedTraits.filter((trait) => !canonicalSet.has(normalizeTrait(trait)))

  useEffect(() => {
    if (visible.length && !visible.some((creature) => creature._id === selectedId)) {
      const id = visible[0]._id
      setSelectedId(id)
      history.replaceState(null, '', `#${encodeURIComponent(id)}`)
    }
  }, [visible, selectedId])

  function chooseCreature(id: string) {
    setSelectedId(id)
    history.replaceState(null, '', `#${encodeURIComponent(id)}`)
    document.querySelector('.archive__profile')?.scrollTo({top: 0, behavior: 'smooth'})
  }

  function stepCreature(direction: number) {
    if (!creatures.length) return
    chooseCreature(creatures[(selectedIndex + direction + creatures.length) % creatures.length]._id)
  }

  async function toggleMusic() {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
      setMusicOn(false)
      return
    }
    try {
      audio.volume = 0.35
      await audio.play()
      setMusicOn(true)
    } catch {
      setMusicOn(false)
    }
  }

  return (
    <main className="archive">
      <div className="archive__grain" aria-hidden="true" />
      <header className="archive__header">
        <a className="archive__brand" href="/map" aria-label="Apex Bestiary map">
          <span className="archive__brand-mark" aria-hidden="true">✦</span>
          <span>APEX <strong>BESTIARY</strong><small>ARCHIVE CENTRAL / FIELD DIVISION</small></span>
        </a>
        <nav className="archive__top-nav" aria-label="Main navigation">
          <a href="/map">↖ &nbsp; Field map</a>
          <span aria-current="page">Entity archive</span>
          <a href="/report">Report a sighting &nbsp; ↗</a>
        </nav>
        <div className="archive__header-code">AB—00 / CLASSIFIED</div>
      </header>

      <section className="archive__intro" aria-label="Archive introduction">
        <div className="archive__intro-copy">
          <p className="archive__eyebrow"><span className="archive__live-dot" /> THE LIVING ARCHIVE <span className="archive__eyebrow-rule" /> VOL. 01</p>
          <h1>The <em>unknown</em><br />has a name.</h1>
          <p className="archive__lede">Every legend leaves a trace. Explore the classified profiles of the entities reported across our world.</p>
        </div>
        <div className="archive__intro-aside" aria-hidden="true"><span>◉</span><p>RESTRICTED<br />FIELD DOCUMENTS</p><b>001—{String(creatures.length).padStart(3, '0')}</b></div>
      </section>

      <div className="archive__workbench">
        <aside className="archive__index" aria-label="Entity index">
          <div className="archive__index-heading"><div><span>01 / INDEX</span><h2>Case files</h2></div><span className="archive__count">{String(visible.length).padStart(2, '0')} / {String(creatures.length).padStart(2, '0')}</span></div>
          <label className="archive__search"><span aria-hidden="true">⌕</span><input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the archive..." aria-label="Search entities" /><kbd>Ctrl K</kbd></label>
          <div className="archive__filters" role="group" aria-label="Filter by threat level">
            {FILTERS.map((item) => <button key={item.value} type="button" className={filter === item.value ? 'is-active' : ''} onClick={() => setFilter(item.value)} aria-pressed={filter === item.value}>{item.label}</button>)}
          </div>
          <div className="archive__list">
            {status === 'loading' && <p className="archive__message">Decrypting case files…</p>}
            {status === 'error' && <div className="archive__message">Archive connection lost.<button type="button" onClick={() => window.location.reload()}>Retry connection ↗</button></div>}
            {status === 'ready' && visible.length === 0 && <p className="archive__message">No records match that search.</p>}
            {visible.map((creature) => <button className={`archive__list-item ${selected?._id === creature._id ? 'is-selected' : ''}`} key={creature._id} type="button" onClick={() => chooseCreature(creature._id)} aria-current={selected?._id === creature._id ? 'true' : undefined} aria-label={`Open ${creature.name} profile`}>
              <span className="archive__list-image">{creature.imageUrl ? <img src={`${creature.imageUrl}?w=160&h=160&fit=crop&auto=format`} alt="" loading="lazy" /> : '✦'}</span>
              <span className="archive__list-copy"><strong>{creature.name}</strong><small>{creature.regions?.[0]?.name ?? 'Origin unconfirmed'}</small></span>
              <span className={`archive__list-level archive__list-level--${THREATS[creature.threatLevel ?? 'unknown']?.className ?? 'unknown'}`} title={THREATS[creature.threatLevel ?? 'unknown']?.label} />
              <span className="archive__list-arrow" aria-hidden="true">↗</span>
            </button>)}
          </div>
          <div className="archive__index-footer"><span>✳</span> Intelligence gathered from the field. Records remain subject to review.</div>
        </aside>

        <article className="archive__profile" aria-live="polite">
          {selected ? <>
            <div className="archive__profile-top"><span>02 / ENTITY PROFILE</span><span>FILE {String(selectedIndex + 1).padStart(3, '0')} — {String(creatures.length).padStart(3, '0')}</span></div>
            <div className="archive__hero">
              <div className="archive__art">
                <span className="archive__art-grid" aria-hidden="true" />
                <span className="archive__art-cross archive__art-cross--one" aria-hidden="true">+</span><span className="archive__art-cross archive__art-cross--two" aria-hidden="true">+</span>
                {selected.imageUrl ? <img key={selected.imageUrl} src={`${selected.imageUrl}?w=1200&auto=format`} alt={`Archive illustration of ${selected.name}`} /> : <span className="archive__art-empty" aria-hidden="true">✦</span>}
                <span className="archive__art-caption">FIG. {String(selectedIndex + 1).padStart(2, '0')} — ARCHIVE PLATE / SUBJECT IDENTIFICATION</span>
              </div>
              <div className="archive__hero-copy">
                <span className={`archive__threat archive__threat--${threat.className}`}><i /> {threat.label}</span>
                <p className="archive__hero-kicker">SUBJECT / {String(selectedIndex + 1).padStart(3, '0')}</p>
                <h2>{selected.name}</h2>
                <p className="archive__hero-description">{selected.physicalDescription ?? 'Physical description has not yet been verified by the archive.'}</p>
                <div className="archive__hero-meta"><span>REGION OF ORIGIN</span><strong>{selected.regions?.map((region) => region.name).join(' / ') || 'Unconfirmed'}</strong></div>
                <div className="archive__hero-meta"><span>THREAT ASSESSMENT</span><strong>{threat.description}</strong></div>
                {selected.regionalNames?.length ? <div className="archive__hero-meta"><span>ALSO KNOWN AS</span><strong>{selected.regionalNames.join(' / ')}</strong></div> : null}
              </div>
            </div>
            <div className="archive__details">
              <section className="archive__detail-block"><span className="archive__section-number">01 /</span><div><h3>Identifying marks</h3><p>Canonical traits recorded in the archive</p><ul className="archive__traits">{selected.distinctiveTraits?.length ? selected.distinctiveTraits.map((trait, index) => <li key={trait}><span>{String(index + 1).padStart(2, '0')}</span>{trait}</li>) : <li><span>—</span>Awaiting field confirmation</li>}</ul></div></section>
              <section className="archive__detail-block"><span className="archive__section-number">02 /</span><div><h3>Origin & folklore</h3><p>Accounts preserved across generations</p><blockquote>{selected.folkloreOrigin ?? 'No origin account has been filed for this entity.'}</blockquote><div className="archive__classification"><span>ARCHIVE CLASSIFICATION</span><strong>{threat.label}</strong></div></div></section>
            </div>
            <section className="archive__investigation" aria-labelledby="investigation-title">
              <div className="archive__investigation-heading">
                <div><span className="archive__section-number">03 / FIELD INTELLIGENCE</span><h3 id="investigation-title">A trail of sightings</h3><p>Filed encounters associated with this entity, newest first.</p></div>
                <span className="archive__report-count">{String(creatureSightings.length).padStart(2, '0')} REPORT{creatureSightings.length === 1 ? '' : 'S'}</span>
              </div>
              {sightingsStatus === 'loading' && <p className="archive__reports-message">Recovering field reports…</p>}
              {sightingsStatus === 'error' && <p className="archive__reports-message">Field reports are temporarily unavailable. The entity profile remains accessible.</p>}
              {sightingsStatus === 'ready' && creatureSightings.length === 0 && <div className="archive__reports-empty"><span aria-hidden="true">◎</span><p>No sightings have been filed for this entity yet.</p><a href="/report">Submit a field report ↗</a></div>}
              {selectedSighting && <div className="archive__evidence-grid">
                <div className="archive__timeline" aria-label={`Sightings of ${selected.name}`}>
                  {creatureSightings.map((sighting, index) => <button key={sighting._id} type="button" className={`archive__timeline-item ${selectedSighting._id === sighting._id ? 'is-active' : ''}`} onClick={() => setSelectedSightingId(sighting._id)} aria-pressed={selectedSighting._id === sighting._id}>
                    <span className="archive__timeline-node" aria-hidden="true" />
                    <span className="archive__timeline-copy"><span className="archive__timeline-date">{formatSightingDate(sighting.date)} <small>REPORT {String(creatureSightings.length - index).padStart(2, '0')}</small></span><strong>{sighting.region?.name ?? 'Location unconfirmed'}</strong><span className="archive__timeline-excerpt">{sighting.freeformDescription || 'No witness account available.'}</span></span>
                    <span className="archive__timeline-chevron" aria-hidden="true">↗</span>
                  </button>)}
                </div>
                <div className="archive__evidence">
                  <div className="archive__evidence-top"><span>SELECTED FIELD REPORT</span><span className={`archive__filing-status archive__filing-status--${selectedSighting.status ?? 'pending'}`}>{selectedSighting.status === 'verified' ? 'VERIFIED' : selectedSighting.status === 'dismissed' ? 'DISMISSED' : 'UNDER REVIEW'}</span></div>
                  <div className="archive__evidence-meta"><div><span>RECORDED</span><strong>{formatSightingDate(selectedSighting.date)}</strong></div><div><span>REGION</span><strong>{selectedSighting.region?.name ?? 'Unconfirmed'}</strong></div><div><span>CREDIBILITY INDEX</span><strong className="archive__credibility">{selectedSighting.credibilityIndex == null ? 'PENDING' : `${Math.round(selectedSighting.credibilityIndex)} / 100`}</strong></div></div>
                  <blockquote className="archive__witness-account">“{selectedSighting.freeformDescription ?? 'No witness account available.'}”</blockquote>
                  <div className="archive__comparison"><div className="archive__comparison-heading"><span>04 / TRAIT COMPARISON</span><strong>{matchedCount} <small>/ {canonicalTraits.length}</small></strong></div><p>Canonical signs recorded in this report</p>
                    <ul>{canonicalTraits.length ? canonicalTraits.map((trait) => <li key={trait} className={observedSet.has(normalizeTrait(trait)) ? 'is-matched' : ''}><span aria-hidden="true">{observedSet.has(normalizeTrait(trait)) ? '✓' : '—'}</span>{trait}<small>{observedSet.has(normalizeTrait(trait)) ? 'OBSERVED' : 'NOT REPORTED'}</small></li>) : <li>No canonical signs have been filed.</li>}</ul>
                    {unlistedObservations.length > 0 && <div className="archive__unlisted"><span>ADDITIONAL OBSERVATIONS</span><p>{unlistedObservations.join(' · ')}</p></div>}
                    <p className="archive__comparison-note">Trait comparison uses reported observations. The credibility index also includes witness, corroboration and regional context.</p>
                  </div>
                  {selectedSighting.location && <a className="archive__map-link" href={`/map?sighting=${encodeURIComponent(selectedSighting._id)}`}><span>Locate this signal on the field map</span><span aria-hidden="true">↗</span></a>}
                </div>
              </div>}
            </section>
            <div className="archive__profile-bottom"><span>END OF FILE — {selected.name.toUpperCase()}</span><div><button type="button" onClick={() => stepCreature(-1)} aria-label="Previous entity">←</button><button type="button" onClick={() => stepCreature(1)} aria-label="Next entity">→</button></div></div>
          </> : <div className="archive__empty"><span>✦</span><h2>{status === 'loading' ? 'Opening the archive…' : 'No case files available'}</h2><p>{status === 'error' ? 'Please check the archive connection and try again.' : 'The next field report may reveal what is hidden.'}</p></div>}
        </article>
      </div>

      <footer className="archive__footer"><span>APEX BESTIARY © ARCHIVE CENTRAL</span><div className="archive__audio"><audio ref={audioRef} src="/audio/abyss.mp3" loop preload="none" onEnded={() => setMusicOn(false)} /><button type="button" onClick={toggleMusic} aria-pressed={musicOn} aria-label={musicOn ? 'Pause background music' : 'Play background music'}><span aria-hidden="true">{musicOn ? 'Ⅱ' : '♫'}</span> AMBIENCE {musicOn ? 'ON' : 'OFF'}</button><span className="archive__music-credit">Music track: Abyss by Tetuano · Source: <a href="https://freetouse.com/music" target="_blank" rel="noopener noreferrer">freetouse.com/music</a> · No Copyright Music (Free Download)</span></div></footer>
    </main>
  )
}
