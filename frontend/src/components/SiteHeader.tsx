import './SiteHeader.css'

type Section = 'map' | 'bestiary' | 'report'

export default function SiteHeader({active, overlay = false}: {active: Section; overlay?: boolean}) {
  return (
    <header className={`site-header ${overlay ? 'site-header--overlay' : ''}`}>
      <a className="site-header__brand" href="/map" aria-label="Apex Bestiary — field map">
        <span className="site-header__sigil" aria-hidden="true">✦</span>
        <span className="site-header__brand-copy">APEX <strong>BESTIARY</strong><small>ARCHIVE CENTRAL · FIELD DIVISION</small></span>
      </a>
      <nav className="site-header__nav" aria-label="Main navigation">
        <a href="/map" aria-current={active === 'map' ? 'page' : undefined}><span>01</span> Field map</a>
        <a href="/bestiary" aria-current={active === 'bestiary' ? 'page' : undefined}><span>02</span> Entity archive</a>
        <a href="/report" aria-current={active === 'report' ? 'page' : undefined}><span>03</span> File a report</a>
      </nav>
      <span className="site-header__classification">AB—00 <i /> CLASSIFIED</span>
    </header>
  )
}
