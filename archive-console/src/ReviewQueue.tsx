import {Suspense} from 'react'
import {type DocumentHandle, useDocumentProjection, useDocuments, useEditDocument} from '@sanity/sdk-react'

type SightingPreview = {
  status?: string
  date?: string
  timeOfDay?: string
  freeformDescription?: string
  credibilityIndex?: number
  observedTraits?: string[]
  creature?: {name?: string}
  region?: {name?: string; country?: string}
  witness?: {anonymous?: boolean; occupation?: string; witnessState?: string}
  environmentalConditions?: {moonPhase?: string; weather?: string; visibility?: string}
}

export function ReviewQueue() {
  const {data: sightings, hasMore, isPending, loadMore} = useDocuments({
    documentType: 'sighting',
    batchSize: 30,
    orderings: [{field: '_createdAt', direction: 'desc'}],
  })

  return (
    <section className="review-queue" aria-labelledby="queue-title">
      <div className="queue-label"><h2 id="queue-title">Pending field reports</h2><span>REAL-TIME SYNC ACTIVE</span></div>
      <div className="review-list">
        {sightings.map((handle) => (
          <Suspense key={handle.documentId} fallback={<article className="review-card review-card--loading" />}>
            <ReviewCard handle={handle} />
          </Suspense>
        ))}
      </div>
      {hasMore && <button className="load-more" onClick={loadMore} disabled={isPending}>{isPending ? 'Loading records…' : 'Load older records'}</button>}
    </section>
  )
}

function ReviewCard({handle}: {handle: DocumentHandle}) {
  const {data} = useDocumentProjection<SightingPreview>({
    ...handle,
    projection: `{
      status, date, timeOfDay, freeformDescription, credibilityIndex, observedTraits,
      "creature": creature->{name},
      "region": region->{name, country},
      witness, environmentalConditions
    }`,
  })
  const setStatus = useEditDocument<string>({...handle, liveEdit: true, path: 'status'})

  if (!data || data.status !== 'pending') return null

  const date = data.date ? new Date(data.date).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'}) : 'Undated'
  const credibility = typeof data.credibilityIndex === 'number' ? `${data.credibilityIndex} / 100` : 'Awaiting score'
  const location = [data.region?.name, data.region?.country].filter(Boolean).join(', ') || 'Region unclassified'

  return (
    <article className="review-card">
      <div className="card-stamp">PENDING REVIEW</div>
      <div className="card-main">
        <p className="card-index">CASE // {handle.documentId.slice(-6).toUpperCase()}</p>
        <h3>{data.creature?.name || 'Unclassified entity'}</h3>
        <p className="card-place">{location} · {date} · {data.timeOfDay || 'Time unknown'}</p>
        <blockquote>{data.freeformDescription || 'No witness account supplied.'}</blockquote>
        {data.observedTraits?.length ? <div className="trait-list">{data.observedTraits.map((trait) => <span key={trait}>{trait}</span>)}</div> : null}
      </div>
      <aside className="card-evidence">
        <div><span>Credibility</span><strong>{credibility}</strong></div>
        <div><span>Witness</span><strong>{data.witness?.anonymous ? 'Anonymous' : 'Identified'}</strong><small>{data.witness?.occupation || 'No role recorded'} · {data.witness?.witnessState || 'state unknown'}</small></div>
        <div><span>Conditions</span><small>{data.environmentalConditions?.moonPhase || 'moon unknown'} · {data.environmentalConditions?.weather || 'weather unknown'} · {data.environmentalConditions?.visibility || 'visibility unknown'}</small></div>
        <div className="review-actions">
          <button className="verify" onClick={() => setStatus('verified')}>Verify</button>
          <button className="dismiss" onClick={() => setStatus('dismissed')}>Dismiss</button>
        </div>
      </aside>
    </article>
  )
}
