# Metocean Map Maker

Vite + React + TypeScript web tool for producing publishable metocean maps (bathymetry + site markers). MapLibre GL for rendering.

## Commands

- Dev: `npm run dev`
- Build: `npm run build` (`tsc -b && vite build`)
- Contour tile server (from the folder containing the mbtiles):
  `docker run --rm -it -p 8080:8080 -v "${PWD}:/data" maptiler/tileserver-gl-light --file /data/gebco-contours.mbtiles`

## Structure

- `src/App.tsx` — main app; all map init, layer management, marker rendering logic (~950 lines)
- `src/components/` — control panels (ExportPanel, ContourControlsPanel, Marker*Panel, HelpPanel)
- `src/utils/mapExport.ts` — PNG/PDF export pipeline
- `src/utils/importMarkersFromCsv.ts` — CSV import (papaparse)
- `src/data/`, `src/types/`, `src/styles/` — marker categories/styles, shared types, panel CSS
- `public/tiles/gebco-colour/` — pre-rendered bathymetry colourmap PNG tiles (z0–10), served by Vite at `/tiles/gebco-colour/{z}/{x}/{y}.png`

## Hard-won facts (do not re-learn)

- **Contour tileset real maxzoom is 7** (verify: `http://localhost:8080/data/gebco-contours.json`). Source must declare `maxzoom: 7` so MapLibre *overzooms* z7 tiles instead of 404ing z8+ requests — wrong maxzoom makes contours vanish when zooming or when the draw-box export zooms in.
- **Current tileset is regional**, bounds `[15, -45, 30, -30]` (tippecanoe `-zg --drop-densest-as-needed`). A global rebuild is planned.
- **Markers are DOM overlays** (`maplibregl.Marker`), not part of the WebGL canvas — so `canvas.toDataURL()` does not capture them. Export re-draws them manually in `drawMarkersOnCanvas` via `map.project()`. Same applies to NavigationControl/ScaleControl (that's why compass + scale bar are hand-drawn into exports).
- **Export capture requires `canvasContextAttributes: { preserveDrawingBuffer: true }`** on the map (nested under canvasContextAttributes, NOT a top-level MapOptions key). Never use html2canvas on the map — it can't read WebGL.
- **Export byte budget**: target ≤ ~3.8 MB (`fitCanvasToByteBudget`, floor = 60% of requested resolution, smoothing off so thin contour lines survive). PDF embeds JPEG q0.85. DPI presets 150/300/600, default 300. `UI_ELEMENT_SCALE = 1.5` sizes the compass/scale bar.
- **Cross marker bug fixed in two places**: `getMarkerDotStyles` in App.tsx (clipPath) and `drawMarkerShape` in mapExport.ts — keep both in sync when changing marker symbols.
- Contour labels default to black (`#000000`); line default `#08306b`.

## Conventions

- Panels are collapsible sections in the left `.control-panel`; ExportPanel is a floating widget top-right (next to zoom controls).
- Contour filters use modulo expressions on `abs(round(depth))`.
- Cursor lat/lon indicator is a DOM div bottom-right — intentionally excluded from exports (exports only capture the map canvas).
