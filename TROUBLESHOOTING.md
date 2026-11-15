# Troubleshooting

- **`npm` is blocked in PowerShell:** use `npm.cmd` instead (e.g. `npm.cmd install`).
- **Blank basemap / red banner:** tiles load from NASA Trek. The tile URLs were written from memory by the original author and were never tested. Copy the URL from `src/data/layers.js` and replace `{z}`, `{y}` and `{x}` with numbers (for example `0/0/0`) before opening it in a browser; the raw `{z}/{y}/{x}` address always shows 404. A small Mars image means the layer works; otherwise lower `maxNativeZoom` or switch to the other basemap.
- **`Cannot find module` errors:** delete the `node_modules` folder and run `npm.cmd install` again.
- **`prepare_slope.py` refuses the DEM:** it rejects degree-based CRS on purpose; reproject to a metre-based Mars projection first.
