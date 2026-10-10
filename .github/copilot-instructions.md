# Metocean Map Maker

Vite + React + TypeScript web tool for producing publishable metocean maps (bathymetry + site markers). MapLibre GL for rendering.

## Commands

- Dev: `npm run dev`
- Build: `npm run build` (`tsc -b && vite build`)
- No tile server needed: contours are a static PMTiles file served by Vite from `public/tiles/`, loaded via MapLibre's pmtiles protocol.

## Structure

- `src/App.tsx` — main app; all map init, layer management, marker rendering logic (~950 lines)
- `src/components/` — control panels (ExportPanel, ContourControlsPanel, Marker*Panel, HelpPanel)
- `src/utils/mapExport.ts` — PNG/PDF export pipeline
- `src/utils/importMarkersFromCsv.ts` — CSV import (papaparse)
- `src/data/`, `src/types/`, `src/styles/` — marker categories/styles, shared types, panel CSS
- `public/tiles/gebco-contours.pmtiles` — global contour PMTiles (z0–9, ~2.6 GB), loaded via `pmtiles:///tiles/gebco-contours.pmtiles`
- `public/tiles/gebco-colour/` — bathymetry colourmap PNG tiles: global z0–7 + regional z8–10 detail (~338 MB), served by Vite at `/tiles/gebco-colour/{z}/{x}/{y}.png`
- Both tile assets are **gitignored** (`*.pmtiles`, `*.mbtiles`, `public/tiles/gebco-colour/`) and untracked — host on static storage (R2/S3), never in git. Rebuild via the `/gebco-bathymetry-pipeline` skill in `.github/skills/`.

## Hard-won facts (do not re-learn)

- **Contour archive: global z0–9 PMTiles** (`gebco-contours-v2.pmtiles`, 2.6 GB, 7.88M features, depth -10900 to -10). App.tsx declares `maxzoom: 9` — must match the archive's real maxzoom or the layer 404s and vanishes at high zoom. Verify any archive via `docker run --rm -v <dir>:/data protomaps/go-pmtiles:latest show /data/<file>.pmtiles`.
- **Contour depth values are NEGATIVE** (below sea level). Filters must use `abs(round(depth))` before modulo — plain `%` on negatives matches nothing (that bug killed contour labels + interval filtering). Contours exist at 10m intervals (0 to -100m) and 100m intervals (-100 to -10900m); `buildContourFilter(shallowStep, deepStep)` handles the two zones.
- **Contour controls model**: `shallowStep`/`deepStep` multipliers + `showAllContours` + `adaptiveZoom` (zoom-banded thinning: z<3 → 1000m/2000m up to full density past z7). See `getAdaptiveSteps` in App.tsx.
- **Markers are DOM overlays** (`maplibregl.Marker`), not part of the WebGL canvas — so `canvas.toDataURL()` does not capture them. Export re-draws them manually in `drawMarkersOnCanvas` via `map.project()`. Same applies to NavigationControl/ScaleControl (that's why compass + scale bar are hand-drawn into exports).
- **Export capture requires `canvasContextAttributes: { preserveDrawingBuffer: true }`** on the map (nested under canvasContextAttributes, NOT a top-level MapOptions key). Never use html2canvas on the map — it can't read WebGL.
- **Export byte budget**: target ≤ ~3.8 MB (`fitCanvasToByteBudget`, floor = 60% of requested resolution, smoothing off so thin contour lines survive). PDF embeds JPEG q0.85. DPI presets 150/300/600, default 300. `UI_ELEMENT_SCALE = 1.5` sizes the compass/scale bar.
- **Cross marker bug fixed in two places**: `getMarkerDotStyles` in App.tsx (clipPath) and `drawMarkerShape` in mapExport.ts — keep both in sync when changing marker symbols.
- Contour labels default to black (`#000000`); line default `#08306b`.

## Conventions

- Panels are a left icon rail (`control-panel-rail` + `control-panel-content`); ExportPanel is a floating widget top-right (next to zoom controls).
- Contour filters use modulo expressions on `abs(round(depth))` — see `buildContourFilter` in App.tsx.
- Cursor lat/lon indicator is a DOM div bottom-right — intentionally excluded from exports (exports only capture the map canvas).
