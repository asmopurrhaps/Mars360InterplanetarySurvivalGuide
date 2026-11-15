import { assess } from '../lib/suitability.js';
import { distanceKm } from '../lib/estimate.js';
import { LOCATIONS } from '../data/locations.js';

function getNasaOrbitalPhoto(lat, lng, zoom = 4) {
  const cols = 2 * Math.pow(2, zoom);
  const rows = Math.pow(2, zoom);
  const x = Math.min(cols - 1, Math.max(0, Math.floor(((lng + 180) / 360) * cols)));
  const y = Math.min(rows - 1, Math.max(0, Math.floor(((90 - lat) / 180) * rows)));
  return `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/${zoom}/${y}/${x}.jpg`;
}

const SURFACE_PHOTOS = {
  jezero: 'https://images-assets.nasa.gov/image/PIA24486/PIA24486~orig.jpg',
  gale: 'https://images-assets.nasa.gov/image/PIA19912/PIA19912~orig.jpg',
  elysium: 'https://images-assets.nasa.gov/image/PIA22957/PIA22957~orig.jpg',
  chryse: 'https://images-assets.nasa.gov/image/PIA00393/PIA00393~orig.jpg',
  utopia: 'https://images-assets.nasa.gov/image/PIA00568/PIA00568~orig.jpg',
  meridiani: 'https://images-assets.nasa.gov/image/PIA06918/PIA06918~orig.jpg',
  olympus: 'https://images-assets.nasa.gov/image/PIA02982/PIA02982~orig.jpg',
  valles: 'https://images-assets.nasa.gov/image/PIA00422/PIA00422~orig.jpg',
};

// Detailed mission intel & hazards for sites (auto-generates for any other site/clicked point)
const SITE_INTEL = {
  jezero: {
    mission: 'Mars 2020 Perseverance & Ingenuity',
    geology: 'Noachian lakebed & western river delta deposits (clay/carbonate minerals).',
    hazards: ['Boulder fields along delta scarp', 'Steep crater rim walls'],
  },
  gale: {
    mission: 'Mars Science Laboratory (Curiosity)',
    geology: 'Aeolis Mons (5.5 km layered sulfate/mudstone mountain).',
    hazards: ['Sharp cemented wind-etched rocks (wheel wear)', 'Bagnold dune sand traps'],
  },
  utopia: {
    mission: 'Viking 2 Lander (1976) / Zhurong Rover (2021)',
    geology: 'Vast northern lowland basin underlain by scalloped periglacial water-ice deposits.',
    hazards: ['Seasonal CO₂/H₂O frost accumulation', 'Vesicular basalt boulder fields'],
  },
  olympus: {
    mission: 'Unexplored Surface (Orbital Recon Only)',
    geology: '21.9 km shield volcano; Amazonian basaltic lava flows and summit caldera complex.',
    hazards: ['Near-vacuum summit pressure (<0.7 mbar)', 'Extreme cosmic & solar radiation', '8 km peripheral basal scarp'],
  },
  valles: {
    mission: 'Unexplored Surface (Candidate Airship/Rover Zone)',
    geology: '4,000 km tectonic rift system exposing deep ancient Martian crust.',
    hazards: ['Catastrophic landslide scarps (14°+ slopes)', 'Canyon floor katabatic wind shear'],
  },
  hellas: {
    mission: 'Unexplored Basin',
    geology: '2,300 km impact basin; lowest elevation on Mars (-7.1 km) with thick atmosphere.',
    hazards: ['Major genesis source for global dust storms', 'Low solar incidence in winter'],
  },
  arcadia: {
    mission: 'SpaceX Starship / NASA Candidate Human Site',
    geology: 'Smooth Amazonian volcanic plains with shallow Radar-detected subsurface ice sheets.',
    hazards: ['High-latitude winter darkness', 'Overburden regolith drilling required'],
  },
  elysium: {
    mission: 'InSight Geophysical Lander (2018–2022)',
    geology: 'Flat equatorial volcanic plains ideal for solar power and landing safety.',
    hazards: ['Dust accumulation on solar arrays', 'Tectonic marsquakes (Cerberus Fossae)'],
  },
  meridiani: {
    mission: 'MER-B Opportunity Rover (2004–2018)',
    geology: 'Hematite-rich plains ("blueberries") and evaporite sulfate outcrops.',
    hazards: ['Global dust storm opacity', 'Loose sulfate sand ripples (Purgatory-type traps)'],
  },
  chryse: {
    mission: 'Viking 1 Lander (1976–1982)',
    geology: 'Outflow channel terminus where ancient catastrophic floods emptied into northern plains.',
    hazards: ['Flood-deposited boulder fields', 'Wind-scoured drift dunes'],
  },
};

function formatCoords(lat, lng) {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;
}

function scoreColor(score) {
  if (score >= 70) return '#4fd18b';
  if (score >= 50) return '#ffd166';
  if (score >= 30) return '#ff7a3d';
  return '#ef4444';
}

// Compute realistic Martian surface atmospheric pressure (mbar) from MOLA elevation (km)
// Mars datum (0 km) average is ~6.1 mbar; scale height H ≈ 11.1 km
function calcPressureMbar(elevationKm) {
  return (6.1 * Math.exp(-elevationKm / 11.1)).toFixed(1);
}

// Compute dynamic hazards if a site isn't in SITE_INTEL or user clicked an unexplored point
function getDynamicHazards(v) {
  const list = [];
  if (v.elevation > 4) list.push('Critically thin atmosphere — aerodynamic parachutes ineffective');
  if (v.temp < -75) list.push('Extreme cryogenic thermal stress on batteries & joints');
  if (v.slope >= 8) list.push(`High landing slope (${v.slope.toFixed(0)}°) — tip-over & rockfall risk`);
  if (v.radiation >= 0.7) list.push('Elevated galactic cosmic ray (GCR) surface dose');
  if (v.ice < 5) list.push('Water-poor regolith — water must be imported or deep-drilled');
  if (list.length === 0) list.push('Standard Martian dust deposition & diurnal thermal cycling');
  return list;
}

export default function InfoPanel({ info, siteId }) {
  // Default to the first site if nothing is clicked yet so the right column is never empty
  const activeInfo = info || {
    title: LOCATIONS[0].name,
    lat: LOCATIONS[0].lat,
    lng: LOCATIONS[0].lng,
    values: LOCATIONS[0],
    note: LOCATIONS[0].note,
    estimate: null,
  };
  const activeSiteId = info ? siteId : LOCATIONS[0].id;

  const { score, breakdown, rating } = assess(activeInfo.values);
  const color = scoreColor(score);
  const v = activeInfo.values;

  // Derived planetary telemetry for bottom-right Dossier Panel
  const pressureMbar = calcPressureMbar(v.elevation);
  const solarEfficiency = Math.max(15, Math.round(Math.cos((activeInfo.lat * Math.PI) / 180) * 100));
  const isruRating = v.ice >= 25 ? 'HIGH (Shallow Ice)' : v.ice >= 8 ? 'MODERATE (Regolith)' : 'LOW (Import Req.)';

  const intel = (activeSiteId && SITE_INTEL[activeSiteId]) || {
    mission: activeInfo.estimate ? 'Unexplored Sector (IDW Estimate)' : v.status || 'Orbital Reconnaissance Only',
    geology: activeInfo.note || 'Interpolated Martian regolith & cratered highland/lowland terrain.',
    hazards: getDynamicHazards(v),
  };

  // Find the 2 closest neighboring sites on Mars for relay / resupply distance
  const nearestSites = LOCATIONS
    .filter((s) => s.id !== activeSiteId)
    .map((s) => ({
      ...s,
      km: Math.round(distanceKm(activeInfo.lat, activeInfo.lng, s.lat, s.lng)),
    }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 2);

  const orbitalPhoto = getNasaOrbitalPhoto(activeInfo.lat, activeInfo.lng, 4);
  const primaryPhoto = (activeSiteId && SURFACE_PHOTOS[activeSiteId]) || v.image || orbitalPhoto;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, overflowY: 'auto' }}>
      {/* TOP-RIGHT PANEL: Site Suitability Score & Factor Breakdown */}
      <aside className="panel" style={{ flex: 'none' }}>
        <h2>{activeInfo.title}</h2>
        <div className="coords">{formatCoords(activeInfo.lat, activeInfo.lng)}</div>
        {activeInfo.note && <p className="note">{activeInfo.note}</p>}
        {activeInfo.estimate && (
          <p className="hint" style={{ marginTop: 6 }}>
            Interpolated from sample sites (nearest: <b>{activeInfo.estimate.nearest.name}</b>,{' '}
            {Math.round(activeInfo.estimate.nearestKm)} km away).
          </p>
        )}

        <div className="score-card" style={{ borderColor: color }}>
          <div className="score-num" style={{ color }}>
            {score}
            <small>/100</small>
          </div>
          <div>
            <div className="score-label" style={{ color }}>{rating}</div>
            <div className="score-sub">Survival suitability</div>
          </div>
        </div>

        <h3>Why this score</h3>
        <ul className="factors">
          {breakdown.map((b) => (
            <li key={b.key}>
              <div className="factor-row">
                <span>{b.label}</span>
                <span className="factor-detail">{b.detail}</span>
              </div>
              <div className="track">
                <div
                  className="fill"
                  style={{
                    width: `${Math.round(b.score * 100)}%`,
                    background: scoreColor(Math.round(b.score * 100)),
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* BOTTOM-RIGHT PANEL: Mission Dossier, Recon Feed, Telemetry & Hazards */}
      <aside className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h2>Site Dossier & Telemetry</h2>

        {/* Visual Recon Thumbnail + Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: '10px', alignItems: 'center', background: '#121821', border: '1px solid #26313d', padding: '6px' }}>
          <div style={{ position: 'relative', width: '92px', height: '68px', overflow: 'hidden', border: '1px solid rgba(90,209,230,0.4)' }}>
            <img
              src={primaryPhoto}
              alt={activeInfo.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'contrast(1.12)' }}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = orbitalPhoto; }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '9px', color: '#5ad1e6', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              MISSION STATUS
            </div>
            <div style={{ fontSize: '11px', color: '#fff', fontWeight: 700, marginTop: '2px', lineHeight: 1.25 }}>
              {intel.mission}
            </div>
            <div style={{ fontSize: '10px', color: '#7f8c99', marginTop: '4px', lineHeight: 1.3 }}>
              {intel.geology}
            </div>
          </div>
        </div>

        {/* Environmental & ISRU Telemetry Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', textAlign: 'center' }}>
          <div style={{ background: '#121821', border: '1px solid #26313d', padding: '6px 4px' }}>
            <div style={{ fontSize: '9px', color: '#7f8c99', letterSpacing: '0.08em' }}>AIR PRESSURE</div>
            <div style={{ fontSize: '12px', color: '#5ad1e6', fontWeight: 700, marginTop: '2px' }}>{pressureMbar} mbar</div>
          </div>
          <div style={{ background: '#121821', border: '1px solid #26313d', padding: '6px 4px' }}>
            <div style={{ fontSize: '9px', color: '#7f8c99', letterSpacing: '0.08em' }}>SOLAR FLUX</div>
            <div style={{ fontSize: '12px', color: '#ffd166', fontWeight: 700, marginTop: '2px' }}>{solarEfficiency}% Peak</div>
          </div>
          <div style={{ background: '#121821', border: '1px solid #26313d', padding: '6px 4px' }}>
            <div style={{ fontSize: '9px', color: '#7f8c99', letterSpacing: '0.08em' }}>ISRU WATER</div>
            <div style={{ fontSize: '11px', color: '#4fd18b', fontWeight: 700, marginTop: '2px' }}>{isruRating.split(' ')[0]}</div>
          </div>
        </div>

        {/* Surface Hazards */}
        <div>
          <h3 style={{ margin: '4px 0 6px' }}>Surface Hazards & Risks</h3>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#cbd5e1', display: 'grid', gap: '4px', lineHeight: 1.35 }}>
            {intel.hazards.map((h, i) => (
              <li key={i} style={{ color: '#ff7a3d' }}>
                <span style={{ color: '#e8eef4' }}>{h}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Nearest Outpost Relay Distances */}
        <div>
          <h3 style={{ margin: '4px 0 6px' }}>Nearest Relay Outposts</h3>
          <div style={{ display: 'grid', gap: '4px', fontSize: '11px' }}>
            {nearestSites.map((n) => (
              <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#121821', borderLeft: '2px solid #5ad1e6' }}>
                <span>{n.name}</span>
                <span style={{ color: '#5ad1e6', fontVariantNumeric: 'tabular-nums' }}>{n.km.toLocaleString()} km</span>
              </div>
            ))}
          </div>
        </div>

        <div className="badge-sample" style={{ marginTop: 'auto' }}>
          Sample data — illustrative values, not measurements.
        </div>
      </aside>
    </div>
  );
}