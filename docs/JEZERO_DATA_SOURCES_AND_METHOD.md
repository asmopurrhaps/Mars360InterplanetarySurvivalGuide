# Developer 2 data handoff — Jezero Crater

## What is included
- `jezero_demo_region.geojson`: study-area bounding polygon and Perseverance historic landing reference point.
- `layer_manifest.json`: machine-readable dataset metadata and official download links.
- `prepare_slope.py`: script to derive a slope GeoTIFF from the downloaded USGS DEM.
- `DEVELOPER1_HANDOFF.txt`: concise integration instructions.
- `DATA_SOURCES_AND_METHOD.md`: sources, metadata, limitations and recommended workflow.

## Primary real scientific dataset (recommended)
**USGS Mars 2020 Science Investigation CTX DEM Mosaic**
- Direct GeoTIFF: https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif
- USGS metadata: https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic
- Instrument: Context Camera (CTX) on Mars Reconnaissance Orbiter
- Resolution: 20 m/pixel
- Dimensions: 5,067 rows × 4,456 columns
- Vertical units: metres
- Projection: Equirectangular
- Latitude type: planetocentric
- Longitude: positive east, -180 to +180
- Vertical control: MOLA
- Extent: 17.58°N–19.29°N, 76.99°E–78.58°E

The USGS metadata describes this as a CTX stereo DEM mosaic covering Jezero crater, including the Mars 2020 CTX terrain-relative-navigation DEM and additional stereo DEMs. The full product is approximately 87 MB.

## Visual companion layer
**USGS Mars 2020 Science Investigation CTX orthomosaic**
- Direct GeoTIFF: https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXortho_mosaic_5m.tif
- Resolution: approximately 5 m/pixel (as named in the product)
- Use for image context; it is not an elevation measurement.

## Region GeoJSON
The included GeoJSON uses GeoJSON coordinate order `[longitude, latitude]` in degrees. The study-area rectangle follows the USGS product extent. The point at 18.4446°N, 77.4509°E is Perseverance's landing reference location as reported in Bell et al. (2023); it is not a live rover location.

## Generate slope from the DEM
Install dependencies:
`pip install rasterio numpy`

Run:
`python prepare_slope.py M20_JezeroCrater_CTXDEM_20m.tif jezero_slope_degrees.tif`

The script calculates slope in degrees from the DEM's georeferenced pixel dimensions and writes a single-band Float32 GeoTIFF. Check the source DEM's CRS and affine transform before using it in production. If the raster is not projected in metre units or the pixels are not approximately square, reproject to a suitable local Mars equirectangular coordinate system first. The supplied script refuses geographic-degree pixel sizes rather than silently producing incorrect slope.

## Leaflet integration warning
Leaflet's default CRS is Earth Web Mercator (EPSG:3857). This Mars product is equirectangular with planetocentric latitude and positive-east longitude. Developer 1 must use a Mars-compatible CRS/map setup or preprocess/reproject the raster and vectors to the team's agreed map CRS. Do not place this layer directly on standard Earth web tiles.

## Suggested UI layers
1. CTX orthomosaic — base visual layer.
2. CTX DEM — elevation overlay (metres).
3. Derived slope — slope overlay (degrees), only after processing.
4. GeoJSON boundary + Perseverance landing reference marker.

## Safety / interpretation
This dataset describes terrain, not atmospheric conditions, radiation, dust storms, temperature extremes, subsurface ice accessibility, or life-support resources. Low slope is only one terrain screening factor. Do not label any point "safe for survival" from this DEM alone. Show unknown data as unknown.

## References
- USGS Astropedia DEM metadata: https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic
- USGS direct DEM GeoTIFF: https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif
- USGS direct orthomosaic GeoTIFF: https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXortho_mosaic_5m.tif
- NASA/JPL landing site overview: https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/mission/landing_site/
- Bell et al. (2023), NASA NTRS: https://ntrs.nasa.gov/api/citations/20230016428/downloads/Bell%20et%20al%202022sciadv.pdf
