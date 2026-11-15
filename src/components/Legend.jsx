function gradient(stops) {
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

export default function Legend({ base, dataLayer }) {
  const l = base.legend;
  return (
    <div className="legend">
      <div className="legend-block">
        <div className="legend-title">{l.title}</div>
        {l.type === 'gradient' ? (
          <>
            <div className="bar" style={{ background: gradient(l.stops) }} />
            <div className="bar-labels">
              {l.labels.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </>
        ) : (
          <div className="legend-note">{l.text}</div>
        )}
      </div>

      <div className="legend-block">
        <div className="legend-title">Sites: {dataLayer.label}</div>
        <div className="bar" style={{ background: gradient(dataLayer.stops) }} />
        <div className="bar-labels">
          <span>{dataLayer.lowLabel}</span>
          <span>{dataLayer.highLabel}</span>
        </div>
      </div>
    </div>
  );
}
