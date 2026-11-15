// PROTOTYPE route planner with route telemetry & rationale explanations.
import { estimateAt, distanceKm } from './estimate.js';
import { assess } from './suitability.js';

const STEP = 3;
const LAT0 = -84, LAT1 = 84;
const ROWS = Math.round((LAT1 - LAT0) / STEP) + 1;
const COLS = Math.round(360 / STEP) + 1;
const latOf = (r) => LAT0 + r * STEP;
const lngOf = (c) => -180 + c * STEP;

export const MODES = [
  {
    id: 'shortest',
    label: 'Shortest',
    k: 0,
    mode: 'shortest',
    color: '#9aa7b4',
    dash: '6 6',
    tagline: 'Minimum distance geodesic — ignores terrain & radiation hazards',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    k: 12,
    mode: 'balanced',
    color: '#ffd166',
    dash: null,
    tagline: 'Optimal trade-off between travel time and crew survival margins',
  },
  {
    id: 'safest',
    label: 'Safest',
    k: 45,
    mode: 'safest',
    color: '#5ad1e6',
    dash: null,
    tagline: 'Maximum life-support & shielding — detours into low-elevation, ice-rich plains',
  },
  {
    id: 'science',
    label: 'Science First',
    k: 38,
    mode: 'science',
    color: '#c084fc',
    dash: '8 4',
    tagline: 'Maximizes astrobiology, geological outcrops, and landmark flybys',
  },
];

function calcScienceScore(estValues, lat, lng, sites) {
  const iceFactor = Math.min(1, (estValues.ice ?? 0) / 35);
  const outcropFactor = Math.min(1, (estValues.slope ?? 0) / 12);
  const elevDiversity = Math.min(1, Math.abs(estValues.elevation ?? 0) / 8);

  let landmarkBonus = 0;
  for (const s of sites) {
    const d = distanceKm(lat, lng, s.lat, s.lng);
    if (d < 950) {
      landmarkBonus = Math.max(landmarkBonus, (1 - d / 950) * 0.85);
    }
  }

  return Math.min(1, 0.25 * iceFactor + 0.30 * outcropFactor + 0.15 * elevDiversity + landmarkBonus);
}

let cache = null;
function field(sites) {
  if (cache && cache.sites === sites) return cache.data;
  const rawSuit = new Float32Array(ROWS * COLS);
  const rawSci = new Float32Array(ROWS * COLS);
  const cells = new Array(ROWS * COLS);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const lat = latOf(r), lng = lngOf(c);
      const est = estimateAt(lat, lng, sites).values;
      cells[idx] = est;
      rawSuit[idx] = assess(est).score / 100;
      rawSci[idx] = calcScienceScore(est, lat, lng, sites);
    }
  }

  const normalize = (arr) => {
    let lo = Infinity, hi = -Infinity;
    for (const v of arr) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    return arr.map((v) => (v - lo) / (hi - lo || 1));
  };

  const data = {
    cells,
    rawSuit,
    nSuit: normalize(rawSuit),
    rawSci,
    nSci: normalize(rawSci),
  };
  cache = { sites, data };
  return data;
}

function snap(lat, lng) {
  const r = Math.min(ROWS - 1, Math.max(0, Math.round((lat - LAT0) / STEP)));
  const c = Math.min(COLS - 1, Math.max(0, Math.round((lng + 180) / STEP)));
  return r * COLS + c;
}

function unwrapRoutePoints(pts) {
  if (!pts.length) return pts;
  const out = [[pts[0][0], pts[0][1]]];
  for (let i = 1; i < pts.length; i++) {
    const lat = pts[i][0];
    let lng = pts[i][1];
    const prevLng = out[i - 1][1];
    while (lng - prevLng > 180) lng -= 360;
    while (lng - prevLng < -180) lng += 360;
    out.push([lat, lng]);
  }
  return out;
}

class Heap {
  constructor() { this.a = []; }
  push(item) {
    const a = this.a; a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        let l = 2 * i + 1, r = l + 1, m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

function dijkstra(normField, from, to, k) {
  const dist = new Float64Array(ROWS * COLS).fill(Infinity);
  const prev = new Int32Array(ROWS * COLS).fill(-1);
  const heap = new Heap();
  dist[from] = 0;
  heap.push([0, from]);

  while (heap.size) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;
    if (u === to) break;
    const ur = (u / COLS) | 0, uc = u % COLS;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const r = ur + dr;
        const c = (uc + dc + COLS) % COLS;
        if (r < 0 || r >= ROWS) continue;

        const v = r * COLS + c;
        const km = distanceKm(latOf(ur), lngOf(uc), latOf(r), lngOf(c));
        const quality = (normField[u] + normField[v]) / 2;
        const penalty = 1 + k * (1 - quality) ** 2;
        const nd = d + km * penalty;

        if (nd < dist[v]) {
          dist[v] = nd;
          prev[v] = u;
          heap.push([nd, v]);
        }
      }
    }
  }

  const nodes = [];
  for (let x = to; x !== -1; x = prev[x]) nodes.push(x);
  return nodes.reverse();
}

// Build human-readable engineering & scientific reasons for why this route was selected
function buildRouteExplanation(modeObj, stats, shortestKm) {
  const extraKm = Math.max(0, Math.round(stats.km - shortestKm));
  const extraPct = shortestKm > 0 ? Math.round((extraKm / shortestKm) * 100) : 0;
  const wpText = stats.landmarks.length > 0
    ? stats.landmarks.join(', ')
    : 'unexplored inter-crater plains';

  if (modeObj.id === 'shortest') {
    return {
      headline: 'Direct Geodesic Transit (Minimum Energy & Time)',
      summary: `Follows the most direct great-circle corridor (${Math.round(stats.km).toLocaleString()} km), minimizing rover drive sols and consumable power draw.`,
      bullets: [
        `Saves time (~${stats.estSols} sols at 15 km/sol) by taking zero detours.`,
        `Passes near: ${wpText}.`,
        `Trade-off: Exposes crew to raw terrain hazards (min suitability drops to ${Math.round(stats.min)}/100) and${stats.avgRad.toFixed(2)} mSv/day average radiation.`,
      ],
    };
  }

  if (modeObj.id === 'balanced') {
    return {
      headline: 'Optimal Risk-vs-Distance Corridor',
      summary: `Adds ${extraKm.toLocaleString()} km (+${extraPct}%) over the shortest path to skirt extreme slopes and high-altitude radiation zones while keeping transit time low.`,
      bullets: [
        `Maintains ${Math.round(stats.mean)}/100 mean survival suitability across${stats.estSols} drive sols.`,
        `Avoids severe elevation spikes (mean elevation ${stats.avgElev.toFixed(1)} km) for steadier atmospheric shielding.`,
        `Waypoints & relay proximity: ${wpText}.`,
      ],
    };
  }

  if (modeObj.id === 'safest') {
    return {
      headline: 'Maximum Crew Survival & ISRU Water Corridor',
      summary: `Detours +${extraKm.toLocaleString()} km (+${extraPct}%) into low-elevation basins and ice-rich plains to maximize atmospheric radiation shielding and emergency water access.`,
      bullets: [
        `Highest survival rating (${Math.round(stats.mean)}/100 avg, ${Math.round(stats.min)}/100 floor) with${stats.avgIce.toFixed(0)}% average subsurface water-ice along the track.`,
        `Stays at lower average elevation (${stats.avgElev.toFixed(1)} km) and gentler slopes (${stats.avgSlope.toFixed(1)}°) to prevent rover rollovers and reduce GCR dose (${stats.avgRad.toFixed(2)} mSv/day).`,
        `Safe haven corridor near: ${wpText}.`,
      ],
    };
  }

  // Science First
  return {
    headline: 'High-Value Astrobiology & Geological Discovery Traverse',
    summary: `Redirects the expedition (+${extraKm.toLocaleString()} km / +${extraPct}%) through geologically diverse outcrops, volatile ice sheets, and major Martian landmarks.`,
    bullets: [
      `Science Yield Score: ${Math.round(stats.sciScore)}/100 — targets ${stats.avgSlope.toFixed(1)}° exposed bedrock scarps and${stats.avgIce.toFixed(0)}% water-ice deposits for core drilling.`,
      `Intentional scientific flybys near: ${wpText}.`,
      `Balances discovery with a ${Math.round(stats.mean)}/100 average survival rating over ~${stats.estSols} expedition sols.`,
    ],
  };
}

export function planRoutes(a, b, sites) {
  const { cells, rawSuit, nSuit, rawSci, nSci } = field(sites);
  const from = snap(a.lat, a.lng), to = snap(b.lat, b.lng);

  const rawResults = MODES.map((m) => {
    const activeField = m.mode === 'science' ? nSci : nSuit;
    const nodes = dijkstra(activeField, from, to, m.k);
    const rawPts = [
      [a.lat, a.lng],
      ...nodes.map((i) => [latOf((i / COLS) | 0), lngOf(i % COLS)]),
      [b.lat, b.lng],
    ];

    let km = 0;
    for (let i = 1; i < rawPts.length; i++) {
      km += distanceKm(rawPts[i - 1][0], rawPts[i - 1][1], rawPts[i][0], rawPts[i][1]);
    }

    const pts = unwrapRoutePoints(rawPts);
    const len = nodes.length || 1;
    const suitVals = nodes.map((i) => rawSuit[i] * 100);
    const sciVals = nodes.map((i) => rawSci[i] * 100);

    let sumIce = 0, sumTemp = 0, sumRad = 0, sumElev = 0, sumSlope = 0;
    nodes.forEach((i) => {
      const c = cells[i];
      sumIce += c.ice;
      sumTemp += c.temp;
      sumRad += c.radiation;
      sumElev += c.elevation;
      sumSlope += c.slope;
    });

    // Identify intermediate sites within 650 km of the path
    const passed = [];
    for (const s of sites) {
      if (s.id === a.id || s.id === b.id) continue;
      for (let idx = 0; idx < rawPts.length; idx += 2) {
        if (distanceKm(rawPts[idx][0], rawPts[idx][1], s.lat, s.lng) < 650) {
          passed.push(s.name);
          break;
        }
      }
    }

    return {
      ...m,
      fromName: a.name,
      toName: b.name,
      points: pts,
      km,
      mean: suitVals.reduce((x, y) => x + y, 0) / len,
      min: suitVals.length ? Math.min(...suitVals) : 0,
      sciScore: sciVals.reduce((x, y) => x + y, 0) / len,
      avgIce: sumIce / len,
      avgTemp: sumTemp / len,
      avgRad: sumRad / len,
      avgElev: sumElev / len,
      avgSlope: sumSlope / len,
      estSols: Math.max(1, Math.round(km / 15)), // Pressurized rover @ ~15 km/sol
      landmarks: passed.slice(0, 3),
    };
  });

  const shortestKm = rawResults[0]?.km || 1;
  return rawResults.map((r) => ({
    ...r,
    explanation: buildRouteExplanation(r, r, shortestKm),
  }));
}