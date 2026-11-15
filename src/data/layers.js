// Mars is drawn in a plain equirectangular projection (lat/lng ↔ x/y linearly).
// Leaflet's built-in L.CRS.EPSG4326 does exactly this, and NASA Trek's Mars "EQ" tile
// sets use the same scheme (zoom 0 = 2×1 tiles, each 256 px, rows counted from the top).
//
// If a tile layer shows blank tiles, open its URL in a browser to check it, or lower
// maxNativeZoom. The app also shows a banner when many tiles fail to load.

export const BASE_LAYERS = [
  {
    id: 'mola-color',
    label: 'Elevation (MOLA colorized)',
    url: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    maxNativeZoom: 6,
    attribution: 'NASA/JPL/MOLA via NASA Trek',
    legend: {
      title: 'Elevation (MOLA)',
      type: 'gradient',
      stops: ['#3b4cc0', '#4fa3d9', '#86c47a', '#e8d86a', '#d9873a', '#a63a2b', '#ffffff'],
      labels: ['−8 km', '0 km', '+21 km'],
    },
  },
  {
    id: 'viking-color',
    label: 'Surface imagery (Viking color)',
    url: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    maxNativeZoom: 7,
    attribution: 'USGS/NASA Viking MDIM 2.1 via NASA Trek',
    legend: {
      title: 'Viking color mosaic',
      type: 'note',
      text: 'Natural-ish color imagery. No quantitative scale.',
    },
  },
];

// Sample-data overlays: each colors the site markers by one attribute.
// `domain` is [min, max] mapped across `stops`; `invert` flips "good" vs "bad" only for labels.
export const DATA_LAYERS = [
  {
    id: 'suitability',
    label: 'Survival suitability (sample)',
    unit: '/100',
    domain: [0, 100],
    stops: ['#b2182b', '#ef8a62', '#fddb7a', '#a6d96a', '#1a9850'],
    lowLabel: 'Poor',
    highLabel: 'Good',
  },
  {
    id: 'temp',
    label: 'Mean temperature (sample)',
    unit: '°C',
    domain: [-110, -45],
    stops: ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c'],
    lowLabel: '−110 °C',
    highLabel: '−45 °C',
  },
  {
    id: 'ice',
    label: 'Water ice (sample)',
    unit: '% mass',
    domain: [0, 70],
    stops: ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'],
    lowLabel: '0 %',
    highLabel: '70 %',
  },
  {
    id: 'radiation',
    label: 'Radiation dose (sample)',
    unit: 'mSv/day',
    domain: [0.55, 0.8],
    stops: ['#1a9850', '#a6d96a', '#fee08b', '#f46d43', '#a50026'],
    lowLabel: '0.55',
    highLabel: '0.80',
  },
];
