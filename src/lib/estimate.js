const R_MARS_KM = 3389.5;
const toRad = (d) => (d * Math.PI) / 180;

export function distanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_MARS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

const KEYS = ['elevation', 'temp', 'ice', 'radiation', 'slope'];

// Inverse-distance-weighted estimate of the sample attributes at any clicked point.
// Clearly an approximation from sparse sample sites — the UI labels it as such.
export function estimateAt(lat, lng, sites) {
  const withDist = sites.map((s) => ({ s, d: distanceKm(lat, lng, s.lat, s.lng) }));
  const nearest = withDist.reduce((a, b) => (a.d < b.d ? a : b));
  if (nearest.d < 1) return { values: pick(nearest.s), nearest: nearest.s, nearestKm: nearest.d };

  let wSum = 0;
  const acc = Object.fromEntries(KEYS.map((k) => [k, 0]));
  for (const { s, d } of withDist) {
    const w = 1 / d ** 2;
    wSum += w;
    for (const k of KEYS) acc[k] += s[k] * w;
  }
  for (const k of KEYS) acc[k] /= wSum;
  return { values: acc, nearest: nearest.s, nearestKm: nearest.d };
}

function pick(s) {
  return Object.fromEntries(KEYS.map((k) => [k, s[k]]));
}
