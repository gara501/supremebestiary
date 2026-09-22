import {useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent} from 'react'
import {sanityClient} from '../lib/sanity'
import LocationPickerMap, {type Coordinates} from './LocationPickerMap'
import './SightingForm.css'

interface OptionItem {
  _id: string
  name: string
}

interface SubmitResult {
  sightingId: string
  credibilityIndex: number
}

type WitnessState = 'sober' | 'stressed' | 'impaired' | 'unspecified'
type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night' | 'late_night'
type MoonPhase = 'new' | 'waxing' | 'full' | 'waning' | 'unknown'
type Weather = 'clear' | 'fog' | 'storm' | 'light_rain' | 'snow'
type Visibility = 'good' | 'fair' | 'poor'

const TIME_OF_DAY_OPTIONS: {value: TimeOfDay; label: string}[] = [
  {value: 'dawn', label: 'Dawn'},
  {value: 'day', label: 'Day'},
  {value: 'dusk', label: 'Dusk'},
  {value: 'night', label: 'Night'},
  {value: 'late_night', label: 'Late night / small hours'},
]

const WITNESS_STATE_OPTIONS: {value: WitnessState; label: string}[] = [
  {value: 'sober', label: 'Sober / in control'},
  {value: 'stressed', label: 'Under stress or intense fear'},
  {value: 'impaired', label: 'Alcohol or other substance use reported'},
  {value: 'unspecified', label: 'Not specified'},
]

const MOON_PHASE_OPTIONS: {value: MoonPhase; label: string}[] = [
  {value: 'new', label: 'New moon'},
  {value: 'waxing', label: 'Waxing'},
  {value: 'full', label: 'Full moon'},
  {value: 'waning', label: 'Waning'},
  {value: 'unknown', label: 'Unknown'},
]

const WEATHER_OPTIONS: {value: Weather; label: string}[] = [
  {value: 'clear', label: 'Clear'},
  {value: 'fog', label: 'Fog'},
  {value: 'storm', label: 'Storm'},
  {value: 'light_rain', label: 'Light rain'},
  {value: 'snow', label: 'Snowing'},
]

const VISIBILITY_OPTIONS: {value: Visibility; label: string}[] = [
  {value: 'good', label: 'Good'},
  {value: 'fair', label: 'Fair'},
  {value: 'poor', label: 'Poor'},
]

export default function SightingForm() {
  const [creatures, setCreatures] = useState<OptionItem[]>([])
  const [regions, setRegions] = useState<OptionItem[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  const [creatureId, setCreatureId] = useState('')
  const [regionId, setRegionId] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [witnessName, setWitnessName] = useState('')
  const [occupation, setOccupation] = useState('')
  const [baseCredibility, setBaseCredibility] = useState(3)
  const [witnessState, setWitnessState] = useState<WitnessState>('unspecified')
  const [date, setDate] = useState('')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('night')
  const [freeformDescription, setFreeformDescription] = useState('')
  const [observedTraits, setObservedTraits] = useState<string[]>([])
  const [traitDraft, setTraitDraft] = useState('')
  const [moonPhase, setMoonPhase] = useState<MoonPhase>('unknown')
  const [weather, setWeather] = useState<Weather>('clear')
  const [visibility, setVisibility] = useState<Visibility>('good')
  const [testimonyAudio, setTestimonyAudio] = useState<File | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const redirectTimerRef = useRef<number | null>(null)

  const selectedCoordinates = (() => {
    const parsedLat = Number.parseFloat(lat)
    const parsedLng = Number.parseFloat(lng)
    return Number.isFinite(parsedLat) && Number.isFinite(parsedLng) ? {lat: parsedLat, lng: parsedLng} : null
  })()

  const updateCoordinates = useCallback((coordinates: Coordinates) => {
    setLat(String(coordinates.lat))
    setLng(String(coordinates.lng))
  }, [])

  useEffect(() => () => {
    if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current)
  }, [])

  useEffect(() => {
    async function loadOptions() {
      try {
        const [creatureList, regionList]: [OptionItem[], OptionItem[]] = await Promise.all([
          sanityClient.fetch(`*[_type == "creature"]{_id, name} | order(name asc)`),
          sanityClient.fetch(`*[_type == "region"]{_id, name} | order(name asc)`),
        ])
        setCreatures(creatureList)
        setRegions(regionList)
      } catch (err) {
        console.error('Failed to load creatures/regions:', err)
        setError('Could not load the creature and region archive. Check your Sanity connection.')
      } finally {
        setLoadingOptions(false)
      }
    }
    loadOptions()
  }, [])

  function addTrait() {
    const trimmed = traitDraft.trim()
    if (trimmed && !observedTraits.includes(trimmed)) {
      setObservedTraits([...observedTraits, trimmed])
    }
    setTraitDraft('')
  }

  function removeTrait(trait: string) {
    setObservedTraits(observedTraits.filter((t) => t !== trait))
  }

  function handleTraitKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTrait()
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!creatureId || !regionId || !lat || !lng || !date || !freeformDescription) {
      setError('Fill in the creature, region, location, date, and account before filing the report.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        creatureId,
        regionId,
        location: {lat: parseFloat(lat), lng: parseFloat(lng)},
        witness: {
          anonymous,
          name: anonymous ? undefined : witnessName,
          occupation,
          baseCredibility,
          witnessState,
        },
        date: new Date(date).toISOString(),
        timeOfDay,
        freeformDescription,
        observedTraits,
        environmentalConditions: {moonPhase, weather, visibility},
      }
      const formData = new FormData()
      formData.set('payload', JSON.stringify(payload))
      if (testimonyAudio) formData.set('testimonyAudio', testimonyAudio)

      const response = await fetch('/api/submit-sighting', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error ?? 'Unknown error filing the report')
      }

      setResult(data as SubmitResult)
      setFreeformDescription('')
      setObservedTraits([])
      setTestimonyAudio(null)
      redirectTimerRef.current = window.setTimeout(() => {
        window.location.assign(`/map?report=${encodeURIComponent(data.sightingId)}&signal=received`)
      }, 1350)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong filing this report.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="dossier" onSubmit={handleSubmit}>
      <div className="dossier__redacted-bar" />
      <h2 className="dossier__title">Field Report — New Sighting</h2>
      <p className="dossier__subtitle">
        File everything you observed as precisely as possible. Vague reports lower the credibility score;
        specific, consistent detail raises it.
      </p>

      <div className="dossier__field">
        <label className="dossier__label" htmlFor="creature">
          Creature
        </label>
        <select
          id="creature"
          className="dossier__select"
          value={creatureId}
          onChange={(e) => setCreatureId(e.target.value)}
          disabled={loadingOptions}
        >
          <option value="">{loadingOptions ? 'Loading archive…' : 'Select a creature'}</option>
          {creatures.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="dossier__field">
        <label className="dossier__label" htmlFor="region">
          Region
        </label>
        <select
          id="region"
          className="dossier__select"
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
          disabled={loadingOptions}
        >
          <option value="">{loadingOptions ? 'Loading archive…' : 'Select a region'}</option>
          {regions.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="dossier__field">
        <label className="dossier__label">Exact location</label>
        <LocationPickerMap value={selectedCoordinates} onChange={updateCoordinates} />
        <div className="dossier__row">
          <input
            className="dossier__input"
            type="number"
            step="any"
            placeholder="Latitude"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
          <input
            className="dossier__input"
            type="number"
            step="any"
            placeholder="Longitude"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </div>
        <p className="dossier__hint">Click the field map or enter GPS coordinates manually. This pin becomes the live archive signal.</p>
      </div>

      <div className="dossier__row">
        <div className="dossier__field">
          <label className="dossier__label" htmlFor="date">
            Date
          </label>
          <input
            id="date"
            className="dossier__input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="dossier__field">
          <label className="dossier__label" htmlFor="timeOfDay">
            Time of day
          </label>
          <select
            id="timeOfDay"
            className="dossier__select"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
          >
            {TIME_OF_DAY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="dossier__field">
        <label className="dossier__label" htmlFor="description">
          Witness account
        </label>
        <textarea
          id="description"
          className="dossier__textarea"
          placeholder="Describe exactly what happened, in your own words…"
          value={freeformDescription}
          onChange={(e) => setFreeformDescription(e.target.value)}
        />
      </div>

      <div className="dossier__field">
        <label className="dossier__label" htmlFor="testimonyAudio">
          Witness recording <span className="dossier__optional">optional</span>
        </label>
        <label className={`dossier__audio-upload ${testimonyAudio ? 'dossier__audio-upload--selected' : ''}`} htmlFor="testimonyAudio">
          <span className="dossier__audio-upload-sigil" aria-hidden="true">◉</span>
          <span>
            <strong>{testimonyAudio ? testimonyAudio.name : 'Attach a field recording'}</strong>
            <small>{testimonyAudio ? `${Math.ceil(testimonyAudio.size / 1024)} KB · ready for archive` : 'MP3, WAV, OGG, M4A, or WebM · up to 8 MB'}</small>
          </span>
          {testimonyAudio && <em>Replace</em>}
        </label>
        <input
          id="testimonyAudio"
          className="dossier__audio-input"
          type="file"
          accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm,.mp3,.wav,.ogg,.m4a,.webm"
          onChange={(event) => setTestimonyAudio(event.target.files?.[0] ?? null)}
        />
        <p className="dossier__hint">A short spoken account gives this exact signal a playable testimony in the map dossier.</p>
      </div>

      <div className="dossier__field">
        <label className="dossier__label">Traits observed</label>
        <div className="dossier__traits">
          {observedTraits.map((trait) => (
            <span className="dossier__trait-chip" key={trait}>
              {trait}
              <button type="button" onClick={() => removeTrait(trait)} aria-label={`Remove ${trait}`}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="dossier__trait-input-row">
          <input
            className="dossier__input"
            type="text"
            placeholder="e.g. glowing red eyes"
            value={traitDraft}
            onChange={(e) => setTraitDraft(e.target.value)}
            onKeyDown={handleTraitKeyDown}
          />
          <button type="button" className="dossier__add-btn" onClick={addTrait}>
            Add
          </button>
        </div>
        <p className="dossier__hint">Match the creature's canonical traits exactly to raise consistency.</p>
      </div>

      <div className="dossier__field">
        <label className="dossier__label">Environmental conditions</label>
        <div className="dossier__row">
          <select
            className="dossier__select"
            value={moonPhase}
            onChange={(e) => setMoonPhase(e.target.value as MoonPhase)}
          >
            {MOON_PHASE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select className="dossier__select" value={weather} onChange={(e) => setWeather(e.target.value as Weather)}>
            {WEATHER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{marginTop: '0.7rem'}}>
          <select
            className="dossier__select"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Visibility: {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="dossier__field">
        <label className="dossier__label">Witness</label>
        <div className="dossier__checkbox-row" style={{marginBottom: '0.8rem'}}>
          <input
            id="anonymous"
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
          />
          <label htmlFor="anonymous" style={{fontSize: '0.85rem'}}>
            File anonymously
          </label>
        </div>

        {!anonymous && (
          <input
            className="dossier__input"
            type="text"
            placeholder="Witness name"
            value={witnessName}
            onChange={(e) => setWitnessName(e.target.value)}
            style={{marginBottom: '0.7rem'}}
          />
        )}

        <input
          className="dossier__input"
          type="text"
          placeholder="Occupation / role (e.g. park ranger)"
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
          style={{marginBottom: '0.9rem'}}
        />

        <label className="dossier__hint">Witness state at the time</label>
        <select
          className="dossier__select"
          value={witnessState}
          onChange={(e) => setWitnessState(e.target.value as WitnessState)}
          style={{marginTop: '0.4rem', marginBottom: '0.9rem'}}
        >
          {WITNESS_STATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className="dossier__hint">Base credibility (editorial judgment)</label>
        <div className="dossier__slider-row" style={{marginTop: '0.4rem'}}>
          <input
            type="range"
            min="1"
            max="5"
            value={baseCredibility}
            onChange={(e) => setBaseCredibility(parseInt(e.target.value, 10))}
          />
          <span className="dossier__slider-value">{baseCredibility}</span>
        </div>
      </div>

      <button type="submit" className="dossier__submit" disabled={submitting || loadingOptions}>
        {submitting ? 'Filing report…' : 'File report'}
      </button>

      {result && (
        <div className="dossier__status dossier__status--received" role="status">
          <span className="dossier__status-sigil" aria-hidden="true">⌁</span>
          <div>
            <strong>Transmission received.</strong> Case signal is being placed on the live map — credibility index:{' '}
            <strong>{result.credibilityIndex}</strong> / 100.
          </div>
        </div>
      )}
      {error && <div className="dossier__status dossier__status--error">{error}</div>}
    </form>
  )
}
