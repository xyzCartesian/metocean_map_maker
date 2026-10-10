---
name: gebco-bathymetry-pipeline
description: 'Rebuild GEBCO bathymetry tiles (colourmap rasters + depth contours) from source GeoTIFFs into hosting-ready PMTiles/static tiles. Use when: new GEBCO grid data released, reprocessing bathymetry, fixing contour depth attribute loss, changing maxzoom, or regenerating tiles from gebco geotiff/gpkg/mbtiles.'
argument-hint: '[path-to-gebco-work-folder]'
---

# GEBCO Bathymetry Tile Pipeline

Produces the two tile assets the app consumes:
1. **Contours** — vector PMTiles at `public/tiles/gebco-contours.pmtiles` (z0–9, layer `contours`, `depth` attribute)
2. **Colourmap** — static PNG tiles at `public/tiles/gebco-colour/{z}/{x}/{y}.png` (z0–10)

## When to use

- GEBCO releases an updated grid (annually-ish)
- Contours render wrong (missing depths, missing deep contours, vanishing at low zoom)
- Changing contour intervals (10m shallow / 100m deep currently) or maxzoom

## Prerequisites

- **OSGeo4W** at `C:\OSGeo4W\bin` (provides `gdal_calc.py`, `gdal_contour`, `ogr2ogr`, `ogrinfo` — GDAL 3.13+ verified)
- **Docker** with image `indigoag/tippecanoe:latest` (`docker pull indigoag/tippecanoe:latest`)
- **go-pmtiles** via Docker image `protomaps/go-pmtiles:latest` (for verification) — no separate binary needed since tippecanoe writes `.pmtiles` natively
- Working folder, conventionally `..\gebco-work\` next to the app repo

## The pipeline (steps)

### 1. Merge GEBCO GeoTIFF tiles into a VRT

GEBCO downloads as 8 regional tiles. Build a virtual raster:

```powershell
cd <gebco-work>
& "C:\OSGeo4W\bin\gdalbuildvrt.exe" gebco_global.vrt gebco_2026_*.tif
```

### 2. Mask into deep / shallow rasters

Contouring the full 11km range in one pass is slow; split it:

```powershell
python "C:\OSGeo4W\bin\gdal_calc.py" -A gebco_global.vrt --outfile=gebco_deep.tif --calc="where((A>=-11000)*(A<=-100),A,nan)" --NoDataValue=nan --type=Float32
python "C:\OSGeo4W\bin\gdal_calc.py" -A gebco_global.vrt --outfile=gebco_shallow.tif --calc="where((A>=-100)*(A<=0),A,nan)" --NoDataValue=nan --type=Float32
```

### 3. Contour each raster

```powershell
& "C:\OSGeo4W\bin\gdal_contour.exe" -i 100 -a depth gebco_deep.tif contours_deep_100m.gpkg
& "C:\OSGeo4W\bin\gdal_contour.exe" -i 10 -a depth gebco_shallow.tif contours_shallow_10m.gpkg
```

### 4. Filter to exact ranges

```powershell
& "C:\OSGeo4W\bin\ogr2ogr.exe" -where "depth >= -11000 AND depth <= -100" contours_deep_filtered.gpkg contours_deep_100m.gpkg
& "C:\OSGeo4W\bin\ogr2ogr.exe" -where "depth >= -90 AND depth <= -10" contours_shallow_filtered.gpkg contours_shallow_10m.gpkg
```

> Both outputs contain a layer literally named `contour`. Verify with `ogrinfo contours_deep_filtered.gpkg` before proceeding.

### 5. Merge into ONE GPKG layer — the step that bit us

**Do not** merge with the original `-update -append ... -nln contours_deep_filtered` pattern — it creates two layers and silently drops the deep contours downstream (depth ends up -90..-10 only). Instead:

```powershell
& "C:\OSGeo4W\bin\ogr2ogr.exe" -f GPKG contours_merged.gpkg contours_deep_filtered.gpkg contour -nln contours
& "C:\OSGeo4W\bin\ogr2ogr.exe" -update -append contours_merged.gpkg contours_shallow_filtered.gpkg contour -nln contours
```

**Verify — this is the critical checkpoint:**

```powershell
& "C:\OSGeo4W\bin\ogrinfo.exe" contours_merged.gpkg -sql "SELECT MIN(depth), MAX(depth), COUNT(*) FROM contours"
```

Expected: `MIN ≈ -10900`, `MAX = -10`, `COUNT ≈ 7.9M`. If MIN is -90, the deep contours didn't make it — stop and redo step 5.

### 6. Convert to FlatGeobuf

FlatGeobuf does **not** support `-update -append` ("Cannot rename files") and chokes on `-sql ... CAST` with "WriteArrowBatch() failed". Convert the merged GPKG layer directly, no SQL:

```powershell
& "C:\OSGeo4W\bin\ogr2ogr.exe" -f FlatGeobuf contours_clean.fgb contours_merged.gpkg contours
```

### 7. Tile with tippecanoe → PMTiles

```powershell
docker run --rm -v "${PWD}:/data" indigoag/tippecanoe:latest tippecanoe -o /data/gebco-contours.pmtiles -l contours -Z0 -z9 --drop-smallest-as-needed --simplify-only-low-zooms --no-tile-size-limit /data/contours_clean.fgb --force
```

**Flag rationale (learned the hard way):**
- `-Z0 -z9` — z9 keeps native-quality contours through site-work zooms (z9–11); higher zooms balloon size ~4^n
- `--drop-smallest-as-needed` — drops short contour fragments; **do NOT use `--drop-densest-as-needed`** — it discarded >1M features at z0/z1, making mid-ocean contours vanish at low zoom
- `--no-tile-size-limit` — prevents tile-dropping errors on dense tiles
- `-o *.pmtiles` — tippecanoe ≥2.x writes PMTiles natively; no mbtiles middleman

Expect ~30–60 min for a global dataset. Expected output: ~400–500 MB.

### 8. Verify the archive

```powershell
docker run --rm -v "${PWD}:/data" --entrypoint /go-pmtiles protomaps/go-pmtiles:latest show --metadata /data/gebco-contours.pmtiles
```

Check: `max zoom: 9`, `vector_layers[0].fields.depth: Number`, tilestats `depth` attribute `min ≈ -10900`, `max = -10`. Also check `strategies` — ideally no large `dropped_as_needed` counts at z0/z1.

### 9. Deploy into the app

```powershell
Copy-Item gebco-contours.pmtiles "..\metocean-map-maker\public\tiles\gebco-contours.pmtiles"
```

The app loads it via MapLibre's pmtiles protocol (`url: "pmtiles:///tiles/gebco-contours.pmtiles"`).

### 10. Keep App.tsx in sync

`maxzoom` on the contour source in `src/App.tsx` **must equal the archive's real maxzoom** (currently 9). Too high → tiles 404 → layer vanishes when zooming/exporting. Verify any archive's true maxzoom with the `show` command in step 8.

## Colourmap (raster) pipeline

Produces `public/tiles/gebco-colour/{z}/{x}/{y}.png`. Currently: global z0–7 + regional z8–10 detail, ~338 MB.

### C1. Global virtual mosaic

```powershell
& "C:\OSGeo4W\bin\gdalbuildvrt.exe" -resolution highest -r bilinear gebco_global.vrt gebco_2026_*.tif
```

### C2. Mask land to nodata — required, or land renders opaque white

GEBCO land cells hold real positive elevations, and `gdaldem color-relief` clamps them to the ramp's top entry (white). `-alpha`/`-dstalpha` alone only mask pixels *outside* the grid. Mask elevation > 0 to nodata first:

```powershell
python "C:\OSGeo4W\bin\gdal_calc.py" -A gebco_global.vrt --outfile=gebco_ocean_only.tif --calc="where(A<=0,A,nan)" --NoDataValue=nan --type=Float32 --co COMPRESS=DEFLATE --co TILED=YES
```

### C3. Colour ramp needs an nv entry

Append a nodata line to `gebco_colorramp.txt` so nodata → transparent RGBA (the file must keep its elevation entries sorted; `nv` goes last):

```
0      225 245 255
nv     0   0   0   0
```

### C4. Colour relief with alpha

```powershell
& "C:\OSGeo4W\bin\gdaldem.exe" color-relief gebco_ocean_only.tif gebco_colorramp.txt gebco_colour_4326.tif -alpha -co COMPRESS=DEFLATE -co TILED=YES
```

Verify alpha before tiling: `gdalinfo gebco_colour_4326.tif -stats` → Band 4 should have `STATISTICS_MINIMUM=0` (if it's 255 everywhere, the mask didn't take).

### C5. Reproject to Web Mercator

```powershell
& "C:\OSGeo4W\bin\gdalwarp.exe" -t_srs EPSG:3857 -r bilinear -dstalpha gebco_colour_4326.tif gebco_colour_3857.tif -co COMPRESS=DEFLATE -co TILED=YES
```

### C6. Slice XYZ tiles (keep RGBA!)

```powershell
python "C:\OSGeo4W\apps\Python312\Scripts\gdal2tiles.py" --xyz -z 0-7 -w none --resampling bilinear gebco_colour_3857.tif tiles\gebco-colour
```

Spot-check a coastal tile with an image viewer — land should be transparent, not white. If PNGs come out RGB-only (no alpha), add `-b 1 -b 2 -b 3 -b 4`... actually gdal2tiles preserves alpha automatically when the source has an alpha band; RGB-only output means the alpha band was lost upstream.

### C7. Deploy into the app

```powershell
Copy-Item tiles\gebco-colour\* "..\metocean-map-maker\public\tiles\gebco-colour\" -Recurse -Force
```

The colourmap source in `src/App.tsx` (`addBathymetryColourmap`) must have **no `bounds`** — a hardcoded regional bound will clip global tiles.

## Known pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Contours vanish past z7–z9 | App `maxzoom` > archive maxzoom | Sync App.tsx with `pmtiles show` output |
| Only shallow contours / labels wrong | Bad merge in step 5 (two layers) | Redo merge exactly as written; verify MIN(depth) |
| Mid-ocean contours missing at low zoom | `--drop-densest-as-needed` | Rebuild with `--drop-smallest-as-needed` |
| FlatGeobuf "Cannot rename files" | Tried `-update -append` on FGB | Merge in GPKG first, convert once |
| "WriteArrowBatch() failed" | `-sql` with CAST into FGB | Skip SQL; convert layer directly |
| Colourmap shows white over land | Land has real +ve elevations; ramp clamps them to white; `-alpha` only masks outside-grid nodata | gdal_calc `where(A<=0,A,nan)` first (step C2), plus `nv 0 0 0 0` in the ramp (step C3) |
| Colourmap only covers a small region | Hardcoded `bounds` on the raster source in App.tsx | Remove `bounds` from `addBathymetryColourmap` |

## Reference

- App-side contour config: `src/App.tsx` (source def + `getContourFilter`/`getLabelFilter` modulo filters on `abs(round(depth))`)
- Project conventions: `.github/copilot-instructions.md`
