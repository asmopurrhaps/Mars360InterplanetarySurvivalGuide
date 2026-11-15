# Setup guide (Windows + VS Code)

1. Unzip `MARS-360-COMPLETE.zip` (right-click > Extract All).
2. Open VS Code > File > Open Folder > choose the extracted `MARS-360-COMPLETE` folder.
3. Open a terminal: Terminal > New Terminal (PowerShell).
4. Install: `npm.cmd install` (use `npm.cmd` if plain `npm` is blocked by the execution policy).
5. Run: `npm.cmd run dev`, then open the printed `http://localhost:5173` address.
6. Check: the Mars basemap appears (needs internet), markers are clickable, the yellow dashed box near 18N, 77E is the Jezero study area, and clicking Jezero/Gale/Arcadia/Elysium shows a "Site brief".

Optional real data (needs Python 3): `pip install -r requirements.txt`, then `python processing/scripts/download_jezero.py`.
