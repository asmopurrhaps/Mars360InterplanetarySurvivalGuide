// Simple, explainable survival-suitability score (0–100).
// This is a teaching heuristic for the MVP, not a scientific model.
// Each factor is normalized to 0–1 (1 = best), then combined with weights.

const clamp01 = (x) => Math.min(1, Math.max(0, x));

export const FACTORS = [
  { key: 'water',     label: 'Water access',    weight: 0.30, score: (s) => clamp01(s.ice / 40),            detail: (s) => `${s.ice.toFixed(0)} % ice` },
  { key: 'temp',      label: 'Temperature',     weight: 0.20, score: (s) => clamp01((s.temp + 100) / 55),   detail: (s) => `${s.temp.toFixed(0)} °C` },
  { key: 'radiation', label: 'Radiation',       weight: 0.15, score: (s) => clamp01(1 - (s.radiation - 0.55) / 0.25), detail: (s) => `${s.radiation.toFixed(2)} mSv/day` },
  { key: 'elevation', label: 'Atmosphere (low elevation)', weight: 0.15, score: (s) => clamp01(1 - (s.elevation + 6) / 12), detail: (s) => `${s.elevation.toFixed(1)} km` },
  { key: 'terrain',   label: 'Landing terrain', weight: 0.20, score: (s) => clamp01(1 - s.slope / 15),      detail: (s) => `${s.slope.toFixed(0)}° slope` },
];

export function assess(site) {
  const breakdown = FACTORS.map((f) => ({
    key: f.key,
    label: f.label,
    weight: f.weight,
    score: f.score(site),
    detail: f.detail(site),
  }));
  const total = breakdown.reduce((sum, b) => sum + b.score * b.weight, 0);
  const score = Math.round(total * 100);
  return { score, breakdown, rating: ratingFor(score) };
}

export function ratingFor(score) {
  if (score >= 70) return 'Favourable';
  if (score >= 50) return 'Marginal';
  if (score >= 30) return 'Challenging';
  return 'Hostile';
}
