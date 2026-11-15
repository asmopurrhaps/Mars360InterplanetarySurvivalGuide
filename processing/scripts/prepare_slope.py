#!/usr/bin/env python3
"""
Derive a slope raster (degrees) from a georeferenced Jezero CTX DEM.
Usage: python prepare_slope.py input_dem.tif output_slope.tif

Requires: pip install rasterio numpy
The script expects horizontal pixel dimensions in metres. If the DEM uses
angular coordinates (degrees), reproject it first to a suitable local Mars
equirectangular CRS with metre units. Verify the output against GIS software
before scientific interpretation.
"""
import sys
import numpy as np
import rasterio

if len(sys.argv) != 3:
    raise SystemExit("Usage: python prepare_slope.py input_dem.tif output_slope.tif")

src_path, dst_path = sys.argv[1], sys.argv[2]

with rasterio.open(src_path) as src:
    if src.count < 1:
        raise SystemExit("Input raster has no bands.")
    transform = src.transform
    xres = abs(transform.a)
    yres = abs(transform.e)
    crs_text = str(src.crs).lower() if src.crs else ""
    if not src.crs:
        raise SystemExit("Input DEM has no CRS. Inspect its PDS/USGS metadata and georeference it first.")
    # A geographic CRS commonly has degree units. Do not treat degrees as metres.
    if "4326" in crs_text or "longlat" in crs_text or "degree" in crs_text:
        raise SystemExit("Input appears to use angular coordinates. Reproject to a Mars equirectangular CRS in metres first.")
    if xres <= 0 or yres <= 0:
        raise SystemExit("Invalid pixel resolution in affine transform.")
    data = src.read(1, masked=True).astype("float64")
    arr = np.asarray(data.filled(np.nan), dtype="float64")
    # np.gradient returns dz/dy, dz/dx. Pixel sizes are metres.
    dz_dy, dz_dx = np.gradient(arr, yres, xres)
    slope = np.degrees(np.arctan(np.sqrt(dz_dx**2 + dz_dy**2)))
    invalid = ~np.isfinite(arr)
    slope[invalid] = -9999.0
    profile = src.profile.copy()
    profile.update(dtype="float32", count=1, nodata=-9999.0, compress="deflate")
    with rasterio.open(dst_path, "w", **profile) as dst:
        dst.write(slope.astype("float32"), 1)
        dst.set_band_description(1, "Slope in degrees derived from CTX DEM")
        dst.update_tags(1, units="degrees", method="Horn-like finite difference using numpy.gradient",
                        source_dem=src_path, caution="Verify CRS units and pixel geometry before interpretation.")
print(f"Wrote {dst_path}")
