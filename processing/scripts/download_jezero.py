#!/usr/bin/env python3
"""Download the real USGS Jezero CTX DEM (~87 MB) and orthomosaic into datasets/jezero/.
Run from the project root:  python processing/scripts/download_jezero.py [--ortho]
URLs come from the Developer 2 handoff and were not re-tested at build time."""
import sys, urllib.request, pathlib, datetime
BASE = "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/"
FILES = ["M20_JezeroCrater_CTXDEM_20m.tif"]
if "--ortho" in sys.argv:
    FILES.append("M20_JezeroCrater_CTXortho_mosaic_5m.tif")
out = pathlib.Path("datasets/jezero"); out.mkdir(parents=True, exist_ok=True)
for name in FILES:
    dest = out / name
    print("Downloading", BASE + name)
    urllib.request.urlretrieve(BASE + name, dest)
    with open(out / "RETRIEVED.txt", "a") as log:
        log.write(f"{name}\t{BASE + name}\t{datetime.date.today()}\n")
    print("Saved", dest)
print("Next: python processing/scripts/prepare_slope.py datasets/jezero/M20_JezeroCrater_CTXDEM_20m.tif datasets/jezero/jezero_slope_degrees.tif")
