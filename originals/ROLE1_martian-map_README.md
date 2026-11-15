# Martian Map — Role 1: Frontend & 2D Map

Interactive 2D Mars map for the Interplanetary Survival Guide (React + Vite + Leaflet).

## Run it

```bash
npm install
npm run dev      # open the printed localhost URL
npm run build    # production build into dist/
```

Needs Node 18+ and an internet connection (basemap tiles load from NASA Trek).

## What's in it

- **2D map** with pan, zoom, hover tooltips, click-to-select.
- **Basemap switcher**: MOLA colorized elevation, Viking color imagery.
- **Marker layers**: color the sample sites by suitability, temperature, water ice, or radiation.
- **Legend** for the active basemap and marker layer.
- **Info panel**: coordinates, 0–100 suitability score, and a per-factor breakdown. Clicking empty terrain gives an *estimate* interpolated from nearby sample sites.
- Everything quantitative is **sample data**, labeled as such in the UI.

## Projection / coordinates

Mars is shown in a plain equirectangular projection. Leaflet's `L.CRS.EPSG4326` is used because it maps
lat/lng linearly, which matches NASA Trek's Mars "EQ" tiles (zoom 0 = 2×1 tiles of 256 px, rows from the top).
Longitudes are -180..180 (east positive), latitudes are planetocentric. Map bounds are locked to the globe.

## Where to plug in real data (for teammates)

| File | What to change |
| --- | --- |
| `src/data/locations.js` | Replace sample sites with real ones. Keep field names: `elevation` (km), `temp` (°C), `ice` (% mass), `radiation` (mSv/day), `slope` (°). |
| `src/data/layers.js` | Add basemaps (tile URL + legend) or marker layers. |
| `src/lib/suitability.js` | Tune factor weights/thresholds in `FACTORS`. This is a simple heuristic, not a scientific model. |
| `src/lib/estimate.js` | Inverse-distance interpolation for clicked points; replace with raster lookups once you have gridded data. |

## Project structure

```
src/
  App.jsx                  state: base layer, marker layer, selection
  components/
    MapView.jsx            Leaflet map (plain Leaflet inside React effects)
    LayerControls.jsx      layer switchers
    Legend.jsx             legend for basemap + markers
    InfoPanel.jsx          selected-location panel + score breakdown
  data/                    sample sites and layer definitions
  lib/                     suitability scoring, interpolation, color ramps
```

## Known caveats

- Tile URLs and max zoom levels for the NASA Trek layers were written from memory of their public WMTS pattern and not tested from the build sandbox. If a layer is blank, open the URL in `src/data/layers.js` in a browser and adjust `maxNativeZoom` or swap the layer. The app shows a banner if tiles repeatedly fail.
- NASA Trek tiles are for non-commercial/educational use; keep the attribution visible.
