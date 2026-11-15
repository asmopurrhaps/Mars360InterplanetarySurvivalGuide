# NASA / scientific data sources

**Verification status:** no internet was available when this was built. URLs below come from the Developer 2 handoff or are well-known agency home pages; none were re-tested. No scientific rasters are bundled.

| Dataset | Source | Resolution / format | Use in app | Status |
|---|---|---|---|---|
| Jezero CTX DEM mosaic (MRO CTX, MOLA-controlled) | https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic | 20 m/px, GeoTIFF, metres, equirectangular, 17.58-19.29N, 76.99-78.58E | Terrain/slope (run `download_jezero.py`, `prepare_slope.py`) | Download needed |
| Jezero CTX orthomosaic | USGS (direct URL in `datasets/jezero/layer_manifest.json`) | ~5 m/px GeoTIFF | Visual context | Download needed |
| MOLA colorized shaded relief (ASU) | https://mars.asu.edu/data/mola_color/ | 128 ppd (~463 m/px), PNG 30x30 deg tiles, equirectangular | Visual only: colours are NOT elevation | Link only |
| MOLA MEGDR topography | https://pds-geosciences.wustl.edu/missions/mgs/megdr.html | 4-128 ppd, PDS IMG + LBL | Numeric elevation/slope; decode with the label/SIS first | Link only |
| Mars Trek basemaps | https://trek.nasa.gov | tiles used in `src/data/layers.js` | Basemaps | Tile URLs untested |

## Not yet covered by real data
Temperature, radiation maps, water-ice maps and hazard layers: the numbers in `src/data/locations.js` are the original **sample values**. Candidate sources to research next: Mars Odyssey GRS and SHARAD (ice), MSL RAD (radiation, Hassler et al. 2014), THEMIS/TES (temperature), HiRISE (rocks/slopes), all via https://pds.nasa.gov.

## Coordinate convention
Planetocentric latitude, east-positive longitude (-180..180), Leaflet `[lat, lng]` on `L.CRS.EPSG4326`. GeoJSON is `[lng, lat]`. `mars_locations.json` flags each coordinate as `in_handoff` or `recalled` (unverified).
