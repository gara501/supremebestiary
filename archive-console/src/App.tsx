import {Suspense} from 'react'
import {type SanityConfig} from '@sanity/sdk'
import {SanityApp} from '@sanity/sdk-react'
import {ReviewQueue} from './ReviewQueue'
import './App.css'

const sanityConfigs: SanityConfig[] = [{projectId: 'en0s05um', dataset: 'bestiary'}]

function LoadingScreen() {
  return <div className="loading-screen">Opening the restricted archive…</div>
}

function App() {
  return (
    <SanityApp config={sanityConfigs} fallback={<LoadingScreen />}>
      <main className="archive-console">
        <header className="console-header">
          <p className="console-kicker"><span /> ARCHIVE CENTRAL · AUTHORIZED PERSONNEL</p>
          <div className="console-heading">
            <div>
              <h1>Sighting review desk</h1>
              <p>Assess incoming field reports and confirm their archive disposition.</p>
            </div>
            <div className="console-clearance">CLEARANCE 03<br /><span>LIVE RECORDS</span></div>
          </div>
        </header>
        <Suspense fallback={<QueueSkeleton />}>
          <ReviewQueue />
        </Suspense>
      </main>
    </SanityApp>
  )
}

function QueueSkeleton() {
  return <section className="queue-skeleton" aria-label="Loading review queue"><i /><i /><i /></section>
}

export default App
