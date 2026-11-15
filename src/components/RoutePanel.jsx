import { useEffect, useState } from 'react';
import { LOCATIONS } from '../data/locations.js';
import { planRoutes } from '../lib/route.js';

export default function RoutePanel({ routes, onRoutes }) {
  const [fromId, setFromId] = useState(LOCATIONS[0].id);
  const [toId, setToId] = useState(LOCATIONS[5]?.id || LOCATIONS[1].id);
  const [activeRouteId, setActiveRouteId] = useState('safest');

  const selectRoute = (id) => {
    setActiveRouteId(id);
    window.dispatchEvent(new CustomEvent('mars-select-route', { detail: id }));
  };

  // Listen when the user clicks a route polyline directly on the map!
  useEffect(() => {
    const onMapRouteClick = (e) => {
      if (e.detail) setActiveRouteId(e.detail);
    };
    window.addEventListener('mars-select-route', onMapRouteClick);
    return () => window.removeEventListener('mars-select-route', onMapRouteClick);
  }, []);

  const handlePlan = () => {
    const a = LOCATIONS.find((l) => l.id === fromId);
    const b = LOCATIONS.find((l) => l.id === toId);
    if (!a || !b || a.id === b.id) return;
    const computed = planRoutes(a, b, LOCATIONS);
    onRoutes(computed);
    selectRoute('safest'); // Highlight Safest by default when routes are generated
  };

  const activeRoute = routes?.find((r) => r.id === activeRouteId) || routes?.[0] || null;

  return (
    <aside className="panel">
      <h2>Route planner</h2>

      <label className="field">
        <span>From</span>
        <select value={fromId} onChange={(e) => setFromId(e.target.value)}>
          {LOCATIONS.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>To</span>
        <select value={toId} onChange={(e) => setToId(e.target.value)}>
          {LOCATIONS.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </label>

      <button type="button" className="btn" onClick={handlePlan}>
        Plan routes
      </button>

      {routes && (
        <>
          <div style={{ fontSize: '10px', color: '#5ad1e6', marginTop: '10px', letterSpacing: '0.08em' }}>
            CLICK A ROUTE ROW OR MAP LINE TO INSPECT:
          </div>
          <table className="route-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Mode</th>
                <th>km</th>
                <th>avg</th>
                <th>min</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => {
                const isSelected = r.id === activeRoute?.id;
                return (
                  <tr
                    key={r.id}
                    onClick={() => selectRoute(r.id)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(90, 209, 230, 0.14)' : 'transparent',
                      outline: isSelected ? `1px solid ${r.color}` : 'none',
                      fontWeight: isSelected ? 700 : 400,
                      color: isSelected ? '#ffffff' : 'inherit',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '5px 4px' }}>
                      <span
                        className="swatch"
                        style={{
                          background: r.color,
                          height: isSelected ? '5px' : '3px',
                          boxShadow: isSelected ? `0 0 8px ${r.color}` : 'none',
                        }}
                      />
                      {r.label}
                    </td>
                    <td style={{ padding: '5px 4px' }}>{Math.round(r.km).toLocaleString()}</td>
                    <td style={{ padding: '5px 4px' }}>{Math.round(r.mean)}</td>
                    <td style={{ padding: '5px 4px' }}>{Math.round(r.min)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Interactive Route Rationale & Telemetry Box */}
          {activeRoute && activeRoute.explanation && (
            <div
              style={{
                marginTop: '10px',
                padding: '9px 10px',
                background: '#121821',
                border: `1px solid ${activeRoute.color}`,
                boxShadow: `0 0 12px rgba(0,0,0,0.6)`,
                fontSize: '11px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: activeRoute.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                WHY {activeRoute.label.toUpperCase()}: {activeRoute.explanation.headline}
              </div>
              <p style={{ margin: '5px 0 7px', color: '#e8eef4', lineHeight: 1.4, fontSize: '11px' }}>
                {activeRoute.explanation.summary}
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '4px',
                  textAlign: 'center',
                  marginBottom: '7px',
                  padding: '4px 0',
                  borderTop: '1px solid #26313d',
                  borderBottom: '1px solid #26313d',
                  fontSize: '10px',
                }}
              >
                <div>
                  <div style={{ color: '#7f8c99', fontSize: '9px' }}>DRIVE TIME</div>
                  <div style={{ color: '#fff', fontWeight: 700 }}>~{activeRoute.estSols} Sols</div>
                </div>
                <div>
                  <div style={{ color: '#7f8c99', fontSize: '9px' }}>AVG ICE</div>
                  <div style={{ color: '#5ad1e6', fontWeight: 700 }}>{activeRoute.avgIce.toFixed(0)}% mass</div>
                </div>
                <div>
                  <div style={{ color: '#7f8c99', fontSize: '9px' }}>RAD DOSE</div>
                  <div style={{ color: '#ffd166', fontWeight: 700 }}>{activeRoute.avgRad.toFixed(2)} mSv</div>
                </div>
              </div>

              <ul style={{ margin: 0, paddingLeft: '15px', color: '#cbd5e1', display: 'grid', gap: '4px', lineHeight: 1.35, fontSize: '10.5px' }}>
                {activeRoute.explanation.bullets.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="badge-sample">
        Prototype: scores come from the sample data. Not a real safety or survival prediction.
      </div>
    </aside>
  );
}