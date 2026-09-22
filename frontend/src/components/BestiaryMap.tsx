import {useEffect, useRef, useState} from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@maplibre/maplibre-gl-leaflet' // side-effect import: adds L.maplibreGL(...)
import {sanityClient} from '../lib/sanity'
import './BestiaryMap.css'

interface EnrichedSighting {
  _id: string
  location: {lat: number; lng: number}
  date: string
  credibilityIndex: number | null
  status: string
  freeformDescription: string
  creature: {name: string; threatLevel: string} | null
  region: {name: string} | null
}

const SIGHTING_PROJECTION = `{
  _id,
  location,
  date,
  credibilityIndex,
  status,
  freeformDescription,
  "creature": creature->{name, threatLevel},
  "region": region->{name}
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

export default function BestiaryMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const coordinateReadoutRef = useRef<HTMLSpanElement>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'live'>('connecting')
  const [sightingCount, setSightingCount] = useState(0)
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [10, -20], // roughly centered between the Americas, Europe and Africa
      zoom: 2,
      zoomControl: true,
    })

    // OpenFreeMap: free vector tiles, no API key, no usage limits.
    // (L.maplibreGL comes from the '@maplibre/maplibre-gl-leaflet' side-effect import above.)
    ;(L as any)
      .maplibreGL({
        style: 'https://tiles.openfreemap.org/styles/dark',
        attribution: '&copy; OpenStreetMap contributors &copy; OpenFreeMap',
      })
      .addTo(map)

    mapRef.current = map

    // Update the readout outside React so cursor movement never causes a component rerender.
    map.on('mousemove', (event: L.LeafletMouseEvent) => {
      if (coordinateReadoutRef.current) {
        coordinateReadoutRef.current.textContent = `${event.latlng.lat.toFixed(3)}° / ${event.latlng.lng.toFixed(3)}°`
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    function upsertMarker(sighting: EnrichedSighting) {
      const map = mapRef.current
      if (!map || !sighting.location) return

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
        markersRef.current.set(sighting._id, marker)
      }
    }

    function removeMarker(id: string) {
      const marker = markersRef.current.get(id)
      if (marker) {
        marker.remove()
        markersRef.current.delete(id)
      }
    }

    async function loadInitialSightings() {
      try {
        const sightings: EnrichedSighting[] = await sanityClient.fetch(
          `*[_type == "sighting" && defined(location)] ${SIGHTING_PROJECTION}`,
        )
        if (!isMounted) return
        console.log(`[BestiaryMap] loaded ${sightings.length} sightings`, sightings)
        sightings.forEach(upsertMarker)
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

  function scanForSignals() {
    const map = mapRef.current
    const markers = [...markersRef.current.values()]
    if (!map || markers.length === 0) return

    setIsScanning(true)
    const bounds = L.featureGroup(markers).getBounds()
    map.flyToBounds(bounds, {padding: [88, 88], maxZoom: 7, duration: 1.6})
    window.setTimeout(() => setIsScanning(false), 1800)
  }

  return (
    <div className="bestiary-map-wrap">
      <div className="bestiary-map__atmosphere" aria-hidden="true" />
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
    </div>
  )
}
