import { BASE_LAYERS, DATA_LAYERS } from '../data/layers.js';

export default function LayerControls({ baseId, onBase, dataId, onData }) {
  return (
    <aside className="panel controls">
      <h2>Map layers</h2>

      <fieldset>
        <legend>Basemap</legend>
        {BASE_LAYERS.map((b) => (
          <label key={b.id} className="radio">
            <input type="radio" name="base" checked={baseId === b.id} onChange={() => onBase(b.id)} />
            <span>{b.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Site markers colored by</legend>
        {DATA_LAYERS.map((d) => (
          <label key={d.id} className="radio">
            <input type="radio" name="data" checked={dataId === d.id} onChange={() => onData(d.id)} />
            <span>{d.label}</span>
          </label>
        ))}
      </fieldset>

      <p className="hint">
        Click a marker to inspect a site, or click anywhere on the map for an estimate at that point.
      </p>
    </aside>
  );
}
