# Developer 2 — NASA Data & Map Layers
## Interplanetary Survival Guide | 2D Mars Map MVP

This handoff provides the selected scientific data sources, metadata, integration notes, and a clear preparation plan.

## Recommended MVP layers

### Layer A — Mars basemap / terrain context
- Product: MOLA Shaded Relief / Colorized Elevation
- Provider: Arizona State University (ASU), Mars Global Data Sets
- Mission/instrument source: NASA Mars Global Surveyor (MGS), Mars Orbiter Laser Altimeter (MOLA)
- Resolution: 128 pixels per degree (ppd), approximately 463.1 metres per pixel
- Projection: Simple cylindrical (equirectangular); longitude -180° to +180°, latitude +90° to -90°
- Coverage: 88°N to 88°S
- Layout: 30° × 30° tiles
- Display: PNG tiles; suitable as a visual layer after georeferencing/tiling for the map.
- Data page: https://mars.asu.edu/data/mola_color/
- Tile directory: https://mars.asu.edu/data/mola_color/large/
- Note: This is a shaded-relief image colorized by elevation. It is excellent for visualization, but do not treat the RGB colour values as numeric elevation measurements.

### Layer B — Numeric elevation (recommended scientific layer)
- Product: MOLA Mission Experiment Gridded Data Record (MEGDR), topography product
- Provider: NASA Planetary Data System (PDS) Geosciences Node
- Instrument: MOLA aboard Mars Global Surveyor
- Measurement: Gridded topography derived from laser-altimeter observations
- Available resolutions: 4, 16, 32, 64, and 128 pixels per degree
- Units: topography values are stored in the MEGDR binary image; consult the accompanying PDS label / product SIS for exact scaling and interpretation before conversion.
- Primary data page: https://pds-geosciences.wustl.edu/missions/mgs/megdr.html
- Dataset profile: https://pds.nasa.gov/ds-view/pds/viewProfile.jsp?dsid=MGS-M-MOLA-5-MEGDR-L3-V1.0
- Product documentation: https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/document/egdrsis.pdf
- Important: MEGDR IMG files are binary rasters with PDS labels, not ordinary PNG/JPEG images. Use the label/SIS to decode dimensions, byte order, projection, and scale. Do not load the raw IMG as a normal image.

## What to download first
1. For a quick visual map: download one or more PNG tiles from the ASU tile directory. The file names encode latitude band and longitude tile, e.g. `mola_color_N00_000.png`.
2. For numeric analysis: obtain a lower-resolution MOLA MEGDR topography product (16 or 32 ppd is a practical starting point), including its matching `.LBL` label.
3. For a 36-hour MVP, start with the visual MOLA layer and add numeric slope only if the raster has been decoded and reprojected correctly.

## Coordinate and map integration notes
- ASU MOLA colourized product uses simple cylindrical/equirectangular coordinates.
- Longitude coverage is -180° to +180°; latitude coverage is 88°N to 88°S.
- Leaflet's default CRS is Earth Web Mercator (EPSG:3857). Do not assume the Mars raster can be overlaid correctly using default Earth tiles.
- Developer 1 should confirm the map CRS and coordinate convention before integration. For a global Mars raster, a simple custom CRS / equirectangular setup may be more appropriate than default Leaflet Web Mercator.
- Keep the image's geographic bounds and tile naming/indexing consistent. Do not stretch one 30° tile over the whole planet.
- If the team uses a local image overlay, convert/reproject the source to the agreed map CRS first.

## Suggested layer legend
- MOLA colourized elevation: use the source image's native colour ramp and label it “MOLA elevation (colourized; visual interpretation)”.
- Numeric MOLA topography: show a continuous elevation legend only after decoding the PDS product and confirming the units/scaling from the label/SIS.
- Slope layer: derive from numeric elevation raster after reprojection; show degrees (°). Do not infer slope from the colourized PNG.

## Slope layer status
A scientifically valid slope layer has NOT been generated in this pack. It must be calculated from the numeric MOLA topography raster after decoding and reprojection. A simple workflow is:
1. Decode MEGDR IMG using its PDS label/SIS.
2. Convert to a georeferenced raster (e.g. GeoTIFF) while preserving Mars geographic coordinates.
3. Calculate slope using GIS software (QGIS / GDAL) with planetary radius and map scale handled correctly.
4. Export a lightweight raster/tileset for the map.
5. Document algorithm, units, resolution, nodata treatment, and projection.

## Limitations and honest interpretation
- MOLA is a historical orbital laser-altimetry dataset; it provides topography, not current surface weather or real-time hazards.
- Low elevation or low slope alone does not prove a site is safe for landing or human survival.
- The colorized shaded-relief PNG is a visualization product; it is not a substitute for numeric elevation values.
- Do not claim water is present or accessible from this dataset.
- Any survival score must be described as a prototype and must mark unavailable measurements as unknown.

## Team handoff
Give Developer 1:
- ASU MOLA tile source and product metadata above.
- A sample tile downloaded from the ASU directory (choose the tile covering the team's demo region).
- The numeric MEGDR source and matching label if doing quantitative elevation/slope.
- The agreed coordinate system, map bounds, file format, and legend.

## Sources
- ASU Mars Global Data Sets: https://mars.asu.edu/data/
- ASU MOLA Colorized Elevation product metadata: https://mars.asu.edu/data/mola_color/
- NASA PDS Geosciences Node MOLA MEGDR: https://pds-geosciences.wustl.edu/missions/mgs/megdr.html
- NASA PDS MOLA dataset profile: https://pds.nasa.gov/ds-view/pds/viewProfile.jsp?dsid=MGS-M-MOLA-5-MEGDR-L3-V1.0
- MOLA MEGDR product SIS: https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/document/egdrsis.pdf
