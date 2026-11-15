#!/usr/bin/env python3
"""Checks that JSON/GeoJSON files parse and that coordinates are inside valid ranges."""
import json, pathlib, sys
root = pathlib.Path(__file__).resolve().parents[2]
bad = 0
for f in [*root.glob("src/data/*.json"), *root.glob("src/data/*.geojson"), *root.glob("datasets/**/*.json"), *root.glob("datasets/**/*.geojson")]:
    try:
        json.loads(f.read_text())
        print("OK  ", f.relative_to(root))
    except Exception as e:
        bad += 1; print("FAIL", f.relative_to(root), e)
for s in json.loads((root / "src/data/mars_locations.json").read_text())["sites"]:
    r = s["reference_point"]
    if r and not (-90 <= r["lat"] <= 90 and -180 <= r["lng"] <= 180):
        bad += 1; print("FAIL bad coordinates for", s["id"])
sys.exit(1 if bad else 0)
