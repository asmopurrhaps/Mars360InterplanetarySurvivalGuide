import { useCallback, useMemo, useState } from 'react';
import MapView from './components/MapView.jsx';
import LayerControls from './components/LayerControls.jsx';
import Legend from './components/Legend.jsx';
import InfoPanel from './components/InfoPanel.jsx';
import RoutePanel from './components/RoutePanel.jsx';
import { LOCATIONS } from './data/locations.js';
import { BASE_LAYERS, DATA_LAYERS } from './data/layers.js';
import { estimateAt } from './lib/estimate.js';

function SiteSearch({ onPick }) {
  const [q, setQ] = useState('');
  const hits = q.trim() ? LOCATIONS.filter((l) => l.name.toLowerCase().includes(q.trim().toLowerCase())) : [];
  return (
    <div className="search">
      <input
        value={q}
        placeholder="Search a site (e.g. Gale, Jezero)…"
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) { onPick(hits[0].id); setQ(''); } }}
      />
      {hits.length > 0 && (
        <ul className="hits">
          {hits.slice(0, 6).map((h) => (
            <li key={h.id} onClick={() => { onPick(h.id); setQ(''); }}>{h.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function App() {
  const [baseId, setBaseId] = useState(BASE_LAYERS[0].id);
  const [dataId, setDataId] = useState('suitability');
  const [routes, setRoutes] = useState(null);
  const [selected, setSelected] = useState(null); // {type:'site', id} | {type:'point', lat, lng}

  const base = BASE_LAYERS.find((b) => b.id === baseId);
  const dataLayer = DATA_LAYERS.find((d) => d.id === dataId);

  const onSelectSite = useCallback((id) => setSelected({ type: 'site', id }), []);
  const onPickPoint = useCallback((lat, lng) => setSelected({ type: 'point', lat, lng }), []);

  const info = useMemo(() => {
    if (!selected) return null;
    if (selected.type === 'site') {
      const s = LOCATIONS.find((l) => l.id === selected.id);
      return { title: s.name, lat: s.lat, lng: s.lng, values: s, note: s.note, estimate: null };
    }
    const est = estimateAt(selected.lat, selected.lng, LOCATIONS);
    return {
      title: 'Selected point',
      lat: selected.lat,
      lng: selected.lng,
      values: est.values,
      note: null,
      estimate: est,
    };
  }, [selected]);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="eyebrow">NASA Space Apps 2026</div>
          <h1>MARS 360</h1>
          <span className="sub">Martian Map / Interplanetary Survival Guide</span>
        </div>
        <SiteSearch onPick={onSelectSite} />
        <div className="status">
          <span className="dot" /> SYSTEM ONLINE
          <span className="stat">SITES <b>{LOCATIONS.length}</b></span>
          <span className="chip">Sample data</span>
        </div>
      </header>

      <main className="layout">
        <div className="left-col">
  <LayerControls baseId={baseId} onBase={setBaseId} dataId={dataId} onData={setDataId} />
  <RoutePanel routes={routes} onRoutes={setRoutes} />
</div>
        <section className="map-col">
          <MapView
            baseId={baseId}
            dataLayer={dataLayer}
            locations={LOCATIONS}
            selected={selected}
            routes={routes}
            onSelectSite={onSelectSite}
            onPickPoint={onPickPoint}
          />
          <Legend base={base} dataLayer={dataLayer} />
        </section>
        <InfoPanel info={info} siteId={selected?.type === 'site' ? selected.id : null} />
      </main>
    </div>
  );
}
