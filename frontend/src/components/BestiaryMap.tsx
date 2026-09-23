import {useEffect, useRef, useState} from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {sanityClient} from '../lib/sanity'
import './BestiaryMap.css'

interface EnrichedSighting {
  _id: string
  location: {lat: number; lng: number}
  date: string
  credibilityIndex: number | null
  status: string
  freeformDescription: string
  testimonyAudio?: {
    url?: string
    originalFilename?: string
    mimeType?: string
  } | null
  creature: {
    _id: string
    name: string
    threatLevel: string
    physicalDescription?: string
    distinctiveTraits?: string[]
    folkloreOrigin?: string
    imageUrl?: string
  } | null
  region: {name: string; country?: string; folkloreHistory?: string} | null
}

const SIGHTING_PROJECTION = `{
  _id,
  location,
  date,
  credibilityIndex,
  status,
  freeformDescription,
  "testimonyAudio": testimonyAudio.asset->{url, originalFilename, mimeType},
  "creature": creature->{_id, name, threatLevel, physicalDescription, distinctiveTraits, folkloreOrigin, "imageUrl": archiveIllustration.asset->url},
  "region": region->{name, country, folkloreHistory}
}`

/** Color scale for credibility: low = red, mid = amber, high = phosphor green. */
function colorForCredibility(index: number | null): string {
  if (index === null) return '#a49b7d' // unscored, muted
  if (index < 30) return '#ff4d4d'
  if (index < 60) return '#ffb000'
  return '#4be34b'
}

function radiusForCredibility(index: number | null): number {
  if (index === null) return 6
  return 6 + (index / 100) * 8 // 6px to 14px
}

function buildMarkerIcon(sighting: EnrichedSighting, sequence = 0): L.DivIcon {
  const color = colorForCredibility(sighting.credibilityIndex)
  const radius = radiusForCredibility(sighting.credibilityIndex)
  const size = radius * 2

  return L.divIcon({
    className: '', // avoid Leaflet's default icon styles
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <span class="sighting-marker" style="--signal:${color};--size:${size}px;--delay:${-(sequence % 7) * 0.37}s;width:${size}px;height:${size}px;">
        <span class="sighting-marker__halo"></span>
        <span class="sighting-marker__ring sighting-marker__ring--outer"></span>
        <span class="sighting-marker__ring sighting-marker__ring--inner"></span>
        <span class="sighting-marker__pulse"></span>
        <span class="sighting-marker__core"></span>
        <span class="sighting-marker__glint"></span>
      </span>
    `,
  })
}

function popupHtml(sighting: EnrichedSighting): string {
  const creatureName = sighting.creature?.name ?? 'Unclassified creature'
  const regionName = sighting.region?.name ?? 'Unknown region'
  const dateFmt = sighting.date ? new Date(sighting.date).toLocaleDateString() : 'Unknown date'
  const index = sighting.credibilityIndex ?? 'not yet scored'
  const account = sighting.freeformDescription?.slice(0, 220) ?? ''

  return `
    <div>
      <p class="sighting-popup__title">${escapeHtml(creatureName)}</p>
      <p class="sighting-popup__row">${escapeHtml(regionName)} · ${dateFmt}</p>
      <p class="sighting-popup__row">Status: ${escapeHtml(sighting.status)}</p>
      <p class="sighting-popup__row sighting-popup__index">Credibility index: ${index}</p>
      <div class="sighting-popup__account">${escapeHtml(account)}${sighting.freeformDescription?.length > 220 ? '…' : ''}</div>
    </div>
  `
}

function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str ?? ''
  return div.innerHTML
}

function formatDate(value: string): string {
  return value ? new Date(value).toLocaleDateString(undefined, {year: 'numeric', month: 'long', day: 'numeric'}) : 'Unknown date'
}

function threatLabel(level?: string): string {
  return ({harmless: 'Harmless', caution: 'Caution advised', dangerous: 'High threat', unknown: 'Unclassified'}[level ?? 'unknown'] ?? 'Unclassified')
}

type Receiver = {context: AudioContext; nodes: AudioNode[]}

export default function BestiaryMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const sightingsRef = useRef<Map<string, EnrichedSighting>>(new Map())
  const coordinateReadoutRef = useRef<HTMLSpanElement>(null)
  const receiverRef = useRef<Receiver | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'live'>('connecting')
  const [sightingCount, setSightingCount] = useState(0)
  const [isScanning, setIsScanning] = useState(false)
  const [mapLoadState, setMapLoadState] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [selectedSighting, setSelectedSighting] = useState<EnrichedSighting | null>(null)
  const [receivedSightingId, setReceivedSightingId] = useState<string | null>(null)
  const [illustrationLoading, setIllustrationLoading] = useState(false)
  const [receiverOn, setReceiverOn] = useState(false)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [10, -20], // roughly centered between the Americas, Europe and Africa
      zoom: 2,
      zoomControl: true,
    })

    // Direct OSM tiles are deliberately used instead of the remote vector-style service.
    // The latter can be blocked by content filters, leaving signals over an empty canvas.
    const baseLayer = L
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        maxZoom: 19,
        crossOrigin: true,
        updateWhenIdle: true,
      })
      .addTo(map)

    baseLayer.once('load', () => setMapLoadState('ready'))
    const loadTimeout = window.setTimeout(() => {
      setMapLoadState((state) => (state === 'loading' ? 'unavailable' : state))
    }, 9000)

    mapRef.current = map

    // Update the readout outside React so cursor movement never causes a component rerender.
    map.on('mousemove', (event: L.LeafletMouseEvent) => {
      if (coordinateReadoutRef.current) {
        coordinateReadoutRef.current.textContent = `${event.latlng.lat.toFixed(3)}° / ${event.latlng.lng.toFixed(3)}°`
      }
    })

    return () => {
      window.clearTimeout(loadTimeout)
      receiverRef.current?.context.close()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const signal = marker.getElement()?.querySelector('.sighting-marker')
      signal?.classList.toggle('sighting-marker--selected', id === selectedSighting?._id)
      signal?.classList.toggle('sighting-marker--received', id === receivedSightingId)
    })
  }, [selectedSighting, receivedSightingId])

  useEffect(() => {
    let isMounted = true

    function upsertMarker(sighting: EnrichedSighting) {
      const map = mapRef.current
      if (!map || !sighting.location) return
      sightingsRef.current.set(sighting._id, sighting)

      const existing = markersRef.current.get(sighting._id)
      if (existing) {
        existing.setIcon(buildMarkerIcon(sighting, markersRef.current.size))
        existing.setLatLng([sighting.location.lat, sighting.location.lng])
        existing.setPopupContent(popupHtml(sighting))
      } else {
        const marker = L.marker([sighting.location.lat, sighting.location.lng], {
          icon: buildMarkerIcon(sighting, markersRef.current.size),
        })
          .addTo(map)
          .bindPopup(popupHtml(sighting))
        marker.on('click', () => focusSighting(sighting))
        markersRef.current.set(sighting._id, marker)
      }
    }

    function removeMarker(id: string) {
      const marker = markersRef.current.get(id)
      if (marker) {
        marker.remove()
        markersRef.current.delete(id)
        sightingsRef.current.delete(id)
      }
    }

    async function loadInitialSightings() {
      try {
        const reportId = new URLSearchParams(window.location.search).get('report')
        const filedReportPromise: Promise<EnrichedSighting | null> = reportId
          ? sanityClient.fetch(`*[_id == $id][0] ${SIGHTING_PROJECTION}`, {id: reportId})
          : Promise.resolve(null)
        const [sightings, filedReport] = await Promise.all([
          sanityClient.fetch<EnrichedSighting[]>(`*[_type == "sighting" && defined(location)] ${SIGHTING_PROJECTION}`),
          filedReportPromise,
        ])
        if (!isMounted) return
        console.log(`[BestiaryMap] loaded ${sightings.length} sightings`, sightings)
        sightings.forEach(upsertMarker)
        if (filedReport?.location) {
          upsertMarker(filedReport)
          setReceivedSightingId(filedReport._id)
          window.setTimeout(() => focusSighting(filedReport), 180)
        }
        setSightingCount(sightings.length)
        setConnectionStatus('live')
      } catch (err) {
        console.error('[BestiaryMap] failed to load initial sightings:', err)
      }
    }

    loadInitialSightings()

    // listen() ignores projections/joins — it only tells us *something* changed.
    // On every event we re-fetch that one document, fully projected, and upsert it.
    const subscription = sanityClient.listen('*[_type == "sighting"]', {}, {tag: 'bestiary-map-live'}).subscribe({
      next: async (update) => {
        if (!isMounted) return
        setConnectionStatus('live')

        if (update.transition === 'disappear') {
          removeMarker(update.documentId)
          setSightingCount(markersRef.current.size)
          return
        }

        const fresh: EnrichedSighting | null = await sanityClient.fetch(
          `*[_id == $id][0] ${SIGHTING_PROJECTION}`,
          {id: update.documentId},
        )
        if (fresh?.location) {
          upsertMarker(fresh)
          setSightingCount(markersRef.current.size)
        }
      },
      error: (err) => {
        console.error('Live sighting feed error:', err)
      },
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  function chirp() {
    const receiver = receiverRef.current
    if (!receiver) return
    const oscillator = receiver.context.createOscillator()
    const gain = receiver.context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(420, receiver.context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(740, receiver.context.currentTime + 0.16)
    gain.gain.setValueAtTime(0.0001, receiver.context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.035, receiver.context.currentTime + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, receiver.context.currentTime + 0.23)
    oscillator.connect(gain).connect(receiver.context.destination)
    oscillator.start()
    oscillator.stop(receiver.context.currentTime + 0.25)
  }

  function focusSighting(sighting: EnrichedSighting) {
    setIllustrationLoading(Boolean(sighting.creature?.imageUrl))
    setSelectedSighting(sighting)
    mapRef.current?.flyTo([sighting.location.lat, sighting.location.lng], Math.max(mapRef.current.getZoom(), 4), {duration: 1.25})
    chirp()
  }

  function scanForSignals() {
    const map = mapRef.current
    const markers = [...markersRef.current.values()]
    if (!map || markers.length === 0) return

    setIsScanning(true)
    const bounds = L.featureGroup(markers).getBounds()
    map.flyToBounds(bounds, {padding: [88, 88], maxZoom: 7, duration: 1.6})
    window.setTimeout(() => setIsScanning(false), 1800)
  }

  function discoverRandomSignal() {
    const sightings = [...sightingsRef.current.values()]
    if (sightings.length === 0) return
    focusSighting(sightings[Math.floor(Math.random() * sightings.length)])
  }

  function toggleReceiver() {
    if (receiverRef.current) {
      receiverRef.current.context.close()
      receiverRef.current = null
      setReceiverOn(false)
      return
    }

    const context = new AudioContext()
    const master = context.createGain()
    master.gain.value = 0.018
    master.connect(context.destination)
    const low = context.createOscillator()
    const high = context.createOscillator()
    const wobble = context.createOscillator()
    const wobbleGain = context.createGain()
    low.type = 'sine'; low.frequency.value = 58
    high.type = 'triangle'; high.frequency.value = 174
    wobble.frequency.value = 0.08; wobbleGain.gain.value = 18
    wobble.connect(wobbleGain).connect(high.frequency)
    low.connect(master); high.connect(master)
    low.start(); high.start(); wobble.start()
    receiverRef.current = {context, nodes: [low, high, wobble, master]}
    setReceiverOn(true)
    chirp()
  }

  return (
    <div className="bestiary-map-wrap">
      <div className="bestiary-map__atmosphere" aria-hidden="true" />
      {mapLoadState !== 'ready' && (
        <div className="bestiary-map__loader" role="status" aria-live="polite">
          <div className="bestiary-map__loader-ring" aria-hidden="true"><span>✦</span></div>
          <p className="bestiary-map__loader-kicker">Archive Cartography Division</p>
          <p className="bestiary-map__loader-title">
            {mapLoadState === 'loading' ? 'Tuning the field map' : 'Base map signal unavailable'}
          </p>
          <p className="bestiary-map__loader-copy">
            {mapLoadState === 'loading'
              ? 'Recovering contour lines, old roads, and unverified territories…'
              : 'The sighting archive is still active. Check your connection, then reload the map.'}
          </p>
        </div>
      )}
      <div className="bestiary-map__header">
        <p className="bestiary-map__eyebrow">Field Division · Restricted Cartography</p>
        <h1 className="bestiary-map__title">Apex Bestiary</h1>
        <div className="bestiary-map__subline">
          <span className={`bestiary-map__status ${connectionStatus === 'connecting' ? 'bestiary-map__status--connecting' : ''}`}>
            <i /> {connectionStatus === 'connecting' ? 'Establishing uplink' : `Archive live · ${sightingCount} signals`}
          </span>
          <span className="bestiary-map__sector">Sector: Global</span>
        </div>
      </div>
      <div ref={mapContainerRef} className="bestiary-map__canvas" />

      <aside className="bestiary-map__legend" aria-label="Sighting signal legend">
        <p className="bestiary-map__panel-label">Signal strength</p>
        <div><span className="legend-dot legend-dot--high" /> Corroborated</div>
        <div><span className="legend-dot legend-dot--mid" /> Under review</div>
        <div><span className="legend-dot legend-dot--low" /> Unverified</div>
      </aside>

      <div className="bestiary-map__instrument">
        <div className="bestiary-map__compass" aria-hidden="true"><span>N</span><b>✦</b></div>
        <p><span>Cursor position</span><strong ref={coordinateReadoutRef}>— / —</strong></p>
      </div>

      <button className={`bestiary-map__scan ${isScanning ? 'bestiary-map__scan--active' : ''}`} type="button" onClick={scanForSignals}>
        <span className="bestiary-map__scan-icon">⌁</span>
        {isScanning ? 'Triangulating…' : 'Locate signals'}
      </button>
      <div className="bestiary-map__explore-controls">
        <a className="bestiary-map__archive-link" href="/bestiary">
          <span aria-hidden="true">✦</span> Open the bestiary <span aria-hidden="true">↗</span>
        </a>
        <a className="bestiary-map__report-link" href="/report">
          <span aria-hidden="true">✎</span> Report an encounter
        </a>
        <button type="button" className="bestiary-map__explore" onClick={discoverRandomSignal}>
          <span>✦</span> Random transmission
        </button>
        <button type="button" className={`bestiary-map__receiver ${receiverOn ? 'bestiary-map__receiver--on' : ''}`} onClick={toggleReceiver} aria-pressed={receiverOn}>
          <span aria-hidden="true">⌁</span> Field receiver: {receiverOn ? 'on' : 'off'}
        </button>
      </div>

      {selectedSighting && (
        <aside className="creature-dossier" aria-label={`Dossier for ${selectedSighting.creature?.name ?? 'unclassified creature'}`}>
          <button type="button" className="creature-dossier__close" onClick={() => setSelectedSighting(null)} aria-label="Close dossier">×</button>
          <div className="creature-dossier__image-wrap">
            {illustrationLoading && (
              <div className="creature-dossier__revelation" role="status" aria-live="polite">
                <span className="creature-dossier__revelation-sigil">✦</span>
                <span>Developing archive plate</span>
              </div>
            )}
            {selectedSighting.creature?.imageUrl ? (
              <img
                src={selectedSighting.creature.imageUrl}
                alt={`Archive illustration of ${selectedSighting.creature.name}`}
                className={`creature-dossier__image ${illustrationLoading ? 'creature-dossier__image--loading' : ''}`}
                onLoad={() => setIllustrationLoading(false)}
                onError={() => setIllustrationLoading(false)}
              />
            ) : (
              <div className="creature-dossier__missing-image">?</div>
            )}
            <span className="creature-dossier__stamp">Case file open</span>
          </div>
          <div className="creature-dossier__body">
            <p className="creature-dossier__eyebrow">{selectedSighting.region?.country ?? 'Global archive'} · {formatDate(selectedSighting.date)}</p>
            <h2>{selectedSighting.creature?.name ?? 'Unclassified creature'}</h2>
            <div className="creature-dossier__badges">
              <span>{threatLabel(selectedSighting.creature?.threatLevel)}</span>
              <span>Credibility {selectedSighting.credibilityIndex ?? '—'}%</span>
            </div>
            <p className="creature-dossier__location">Signal registered near <strong>{selectedSighting.region?.name ?? 'unknown region'}</strong></p>
            {selectedSighting.creature?.physicalDescription && <p className="creature-dossier__description">{selectedSighting.creature.physicalDescription}</p>}
            {selectedSighting.creature?.distinctiveTraits?.length ? (
              <div className="creature-dossier__traits">
                <p>Canonical signs</p>
                {selectedSighting.creature.distinctiveTraits.slice(0, 5).map((trait) => <span key={trait}>{trait}</span>)}
              </div>
            ) : null}
            <blockquote>“{selectedSighting.freeformDescription}”</blockquote>
            {selectedSighting.testimonyAudio?.url && (
              <section className="creature-dossier__testimony" aria-label="Witness audio testimony">
                <p><span aria-hidden="true">◉</span> Recovered witness recording</p>
                <audio controls preload="metadata">
                  <source src={selectedSighting.testimonyAudio.url} type={selectedSighting.testimonyAudio.mimeType} />
                  Your browser does not support audio playback.
                </audio>
                {selectedSighting.testimonyAudio.originalFilename && <small>{selectedSighting.testimonyAudio.originalFilename}</small>}
              </section>
            )}
            {selectedSighting.creature?.folkloreOrigin && <p className="creature-dossier__origin">Archive note: {selectedSighting.creature.folkloreOrigin}</p>}
            {selectedSighting.creature?._id && <a className="creature-dossier__archive-link" href={`/bestiary#${encodeURIComponent(selectedSighting.creature._id)}`}>Explore complete entity profile <span aria-hidden="true">↗</span></a>}
          </div>
        </aside>
      )}
      {receivedSightingId && selectedSighting?._id === receivedSightingId && (
        <div className="bestiary-map__arrival" role="status">
          <span className="bestiary-map__arrival-sigil" aria-hidden="true">⌁</span>
          <p><strong>New transmission decoded</strong><span>This signal is awaiting archive review.</span></p>
          <button type="button" onClick={() => setReceivedSightingId(null)} aria-label="Dismiss new transmission notice">×</button>
        </div>
      )}
    </div>
  )
}
