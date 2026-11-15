import data from '../data/mars_locations.json';

const BADGE = { in_handoff: 'From handoff', recalled: 'Unverified: check source' };

// Role 3 science notes for the four featured sites (shown only when one is selected).
export default function SiteBrief({ siteId }) {
  const site = data.sites.find((s) => s.id === siteId);
  if (!site) return null;
  const ref = site.reference_point;
  return (
    <div className="brief">
      <h3>Site brief</h3>
      <p>{site.summary}</p>
      {ref && (
        <p className="hint">
          {ref.label}: {ref.lat.toFixed(4)}°, {ref.lng.toFixed(4)}° <em>({BADGE[ref.status]})</em>
        </p>
      )}
      <h4>Hazards</h4>
      <ul>{site.hazards.map((h) => <li key={h}>{h}</li>)}</ul>
      <p className="hint">{site.data}</p>
      {site.links.map((u) => (
        <div key={u}><a href={u} target="_blank" rel="noreferrer">{u}</a></div>
      ))}
    </div>
  );
}

export function EnvironmentNotes() {
  return (
    <div className="brief">
      <h3>Mars survival basics</h3>
      <ul>
        {data.environment.map((e) => (
          <li key={e.topic}><strong>{e.topic}:</strong> {e.text} <em>({BADGE[e.status]})</em></li>
        ))}
      </ul>
    </div>
  );
}
