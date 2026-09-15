import type maplibregl from 'maplibre-gl';
import jsPDF from 'jspdf';
import type { MarkerData } from '../types/MarkerData';
import type { MarkerStyle } from '../types/MarkerStyle';
import type { MarkerCategory } from '../types/MarkerCategory';

export type LngLatBoundsBox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type MapExportOptions = {
  bounds?: LngLatBoundsBox | null;
  /** Output resolution in DPI, relative to a 96 DPI (CSS pixel) baseline. Defaults to 300. */
  dpi?: number;
  markers?: MarkerData[];
  markerStyles?: Record<MarkerCategory, MarkerStyle>;
  visibleCategories?: Record<MarkerCategory, boolean>;
  showMarkerLabels?: boolean;
  labelFontSize?: number;
};

export const EXPORT_DPI_PRESETS = [150, 300, 600] as const;
export const DEFAULT_EXPORT_DPI = 300;

const CSS_BASELINE_DPI = 96;
const MAX_OUTPUT_DIMENSION = 8000; // avoid hitting browser canvas size limits
const TARGET_EXPORT_BYTES = 3.8 * 1024 * 1024; // keep downloads comfortably under ~4 MB
const BYTE_BUDGET_MAX_ATTEMPTS = 5;
const BYTE_BUDGET_MIN_SCALE = 0.6; // never shrink below 60% of the requested resolution

type MapViewState = {
  center: maplibregl.LngLat;
  zoom: number;
  bearing: number;
  pitch: number;
};

function captureViewState(map: maplibregl.Map): MapViewState {
  return {
    center: map.getCenter(),
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

function restoreViewState(map: maplibregl.Map, state: MapViewState): void {
  map.jumpTo({
    center: state.center,
    zoom: state.zoom,
    bearing: state.bearing,
    pitch: state.pitch,
  });
}

function waitForIdle(map: maplibregl.Map): Promise<void> {
  return new Promise((resolve) => {
    map.once('idle', () => resolve());
  });
}

/**
 * Moves the map to the requested bounds (if provided) and waits for all
 * tiles/layers to finish rendering before invoking the capture callback.
 * The original view is always restored afterwards.
 */
async function withExportBounds<T>(
  map: maplibregl.Map,
  bounds: LngLatBoundsBox | null | undefined,
  captureFn: () => T | Promise<T>
): Promise<T> {
  const originalState = captureViewState(map);

  if (bounds) {
    const idlePromise = waitForIdle(map);
    map.fitBounds(
      [
        [bounds.minLng, bounds.minLat],
        [bounds.maxLng, bounds.maxLat],
      ],
      { animate: false, padding: 0 }
    );
    await idlePromise;
  } else {
    await waitForIdle(map);
  }

  try {
    return await captureFn();
  } finally {
    restoreViewState(map, originalState);
  }
}

/** Reads the currently rendered map canvas (basemap + bathymetry + contours) as a PNG data URL. */
function captureMapCanvasDataUrl(map: maplibregl.Map): string {
  map.triggerRepaint();
  return map.getCanvas().toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas encoding failed.'))),
      mimeType,
      quality
    );
  });
}

function scaleCanvas(canvas: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  const resized = document.createElement('canvas');
  resized.width = width;
  resized.height = height;
  const ctx = resized.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context for export.');
  // Avoid smoothing so thin contour lines don't get blurred away when downscaling.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, width, height);
  return resized;
}

/**
 * Re-encodes (and, if needed, progressively downscales) a canvas until its
 * encoded size fits within maxBytes. Never shrinks below
 * BYTE_BUDGET_MIN_SCALE of the canvas's original resolution, so thin
 * contour lines and labels remain legible even when the budget is tight.
 */
async function fitCanvasToByteBudget(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number | undefined,
  maxBytes: number
): Promise<{ canvas: HTMLCanvasElement; blob: Blob }> {
  const minWidth = Math.round(canvas.width * BYTE_BUDGET_MIN_SCALE);
  const minHeight = Math.round(canvas.height * BYTE_BUDGET_MIN_SCALE);

  let currentCanvas = canvas;
  let blob = await canvasToBlob(currentCanvas, mimeType, quality);

  for (let attempt = 0; attempt < BYTE_BUDGET_MAX_ATTEMPTS && blob.size > maxBytes; attempt++) {
    const reductionRatio = Math.sqrt(maxBytes / blob.size) * 0.95;
    const nextWidth = Math.max(minWidth, Math.round(currentCanvas.width * reductionRatio));
    const nextHeight = Math.max(minHeight, Math.round(currentCanvas.height * reductionRatio));

    if (nextWidth >= currentCanvas.width && nextHeight >= currentCanvas.height) break;

    currentCanvas = scaleCanvas(currentCanvas, nextWidth, nextHeight);
    blob = await canvasToBlob(currentCanvas, mimeType, quality);
  }

  return { canvas: currentCanvas, blob };
}

/** Computes the output canvas size for a given DPI, capped to a sane maximum. */
function computeOutputSize(map: maplibregl.Map, dpi: number) {
  const container = map.getContainer();
  let scaleFactor = dpi / CSS_BASELINE_DPI;

  const rawWidth = container.clientWidth * scaleFactor;
  const rawHeight = container.clientHeight * scaleFactor;
  const largestDimension = Math.max(rawWidth, rawHeight);

  if (largestDimension > MAX_OUTPUT_DIMENSION) {
    scaleFactor *= MAX_OUTPUT_DIMENSION / largestDimension;
  }

  return {
    width: Math.round(container.clientWidth * scaleFactor),
    height: Math.round(container.clientHeight * scaleFactor),
    scaleFactor,
  };
}

const NICE_SCALE_STEPS_METERS = [
  1, 2, 5, 10, 20, 50, 100, 200, 500,
  1000, 2000, 5000, 10000, 20000, 50000,
  100000, 200000, 500000, 1000000, 2000000, 5000000, 10000000,
];

function haversineDistanceMeters(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number }
): number {
  const earthRadius = 6371008.8;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * sinDLng * sinDLng;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

const UI_ELEMENT_SCALE = 1.5; // compass + scale bar are drawn 1.5x the original baseline size

/** Picks a "nice" round-number scale bar length that fits within maxWidthCss pixels. */
function computeScaleBar(map: maplibregl.Map, maxWidthCss: number) {
  const container = map.getContainer();
  const y = container.clientHeight / 2;
  const centerX = container.clientWidth / 2;
  const left = map.unproject([centerX - maxWidthCss / 2, y]);
  const right = map.unproject([centerX + maxWidthCss / 2, y]);
  const maxMeters = haversineDistanceMeters(left, right);

  let niceMeters = NICE_SCALE_STEPS_METERS[0];
  for (const step of NICE_SCALE_STEPS_METERS) {
    if (step <= maxMeters) niceMeters = step;
    else break;
  }

  const widthCss = maxWidthCss * (niceMeters / maxMeters);
  const label = niceMeters >= 1000 ? `${niceMeters / 1000} km` : `${niceMeters} m`;

  return { widthCss, label };
}

/** Draws a simple north arrow, rotated to match the map's current bearing. */
function drawCompass(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  bearingDeg: number
): void {
  const halfLength = size / 2;
  const arrowWidth = size * 0.32;

  ctx.save();
  ctx.translate(centerX, centerY);

  // Soft halo so the arrow stays legible over any basemap colour.
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();

  ctx.rotate((-bearingDeg * Math.PI) / 180);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1, size * 0.07);
  ctx.beginPath();
  ctx.moveTo(0, halfLength * 0.5);
  ctx.lineTo(0, -halfLength * 0.35);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -halfLength);
  ctx.lineTo(arrowWidth / 2, -halfLength * 0.35);
  ctx.lineTo(-arrowWidth / 2, -halfLength * 0.35);
  ctx.closePath();
  ctx.fillStyle = '#d63031';
  ctx.fill();
  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.stroke();

  ctx.fillStyle = '#000000';
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('N', 0, -halfLength - size * 0.08);

  ctx.restore();
}

/** Draws a metric scale bar with tick marks and a distance label. */
function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  bottomY: number,
  widthPx: number,
  label: string,
  scaleFactor: number
): void {
  const barHeight = 5 * UI_ELEMENT_SCALE * scaleFactor;
  const tickHeight = 5 * UI_ELEMENT_SCALE * scaleFactor;
  const y = bottomY - barHeight;

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(
    x - 8 * UI_ELEMENT_SCALE * scaleFactor,
    y - 18 * UI_ELEMENT_SCALE * scaleFactor,
    widthPx + 16 * UI_ELEMENT_SCALE * scaleFactor,
    barHeight + 26 * UI_ELEMENT_SCALE * scaleFactor
  );

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1, 2 * UI_ELEMENT_SCALE * scaleFactor);
  ctx.strokeRect(x, y, widthPx, barHeight);

  ctx.beginPath();
  ctx.moveTo(x, y - tickHeight);
  ctx.lineTo(x, y + barHeight + tickHeight);
  ctx.moveTo(x + widthPx, y - tickHeight);
  ctx.lineTo(x + widthPx, y + barHeight + tickHeight);
  ctx.stroke();

  ctx.fillStyle = '#000000';
  ctx.font = `${12 * UI_ELEMENT_SCALE * scaleFactor}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + widthPx / 2, y - 8 * UI_ELEMENT_SCALE * scaleFactor);
  ctx.restore();
}

/**
 * Captures the live map (basemap + bathymetry colourmap + contours) at the
 * requested DPI and bakes in a compass + scale bar. Assumes the map has
 * already been positioned at the desired export view/bounds.
 */
async function renderBaseMapCanvas(
  map: maplibregl.Map,
  dpi: number
): Promise<{ canvas: HTMLCanvasElement; scaleFactor: number }> {
  const rawDataUrl = captureMapCanvasDataUrl(map);
  const rawImage = await loadImage(rawDataUrl);

  const { width, height, scaleFactor } = computeOutputSize(map, dpi);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context for export.');

  ctx.drawImage(rawImage, 0, 0, width, height);

  const compassSize = 44 * UI_ELEMENT_SCALE * scaleFactor;
  const margin = 16 * UI_ELEMENT_SCALE * scaleFactor;
  drawCompass(
    ctx,
    width - compassSize / 2 - margin,
    height - compassSize / 2 - margin,
    compassSize,
    map.getBearing()
  );

  const scaleBar = computeScaleBar(map, 120 * UI_ELEMENT_SCALE);
  drawScaleBar(
    ctx,
    margin,
    height - margin,
    scaleBar.widthCss * scaleFactor,
    scaleBar.label,
    scaleFactor
  );

  return { canvas, scaleFactor };
}

function drawMarkerShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  style: MarkerStyle,
  scaleFactor: number
): void {
  const size = style.size * scaleFactor;

  ctx.save();
  ctx.fillStyle = style.colour;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1, scaleFactor);

  switch (style.symbol) {
    case 'square':
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
      ctx.strokeRect(x - size / 2, y - size / 2, size, size);
      break;
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(x, y - size / 2);
      ctx.lineTo(x + size / 2, y + size / 2);
      ctx.lineTo(x - size / 2, y + size / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'diamond':
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.strokeRect(-size / 2, -size / 2, size, size);
      break;
    case 'star': {
      const spikes = 5;
      const outerRadius = size / 2;
      const innerRadius = size / 4;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / spikes) * i - Math.PI / 2;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'cross':
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-size / 2, -size / 6, size, size / 3);
      ctx.fillRect(-size / 6, -size / 2, size / 3, size);
      break;
    default:
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
  }

  ctx.restore();
}

function drawMarkerLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  fontSizePx: number,
  scaleFactor: number
): void {
  ctx.save();
  ctx.font = `${fontSizePx * scaleFactor}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 3 * scaleFactor;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#000000';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function getVisibleMarkersInView(
  map: maplibregl.Map,
  markers: MarkerData[],
  visibleCategories: Record<MarkerCategory, boolean>
): MarkerData[] {
  const mapBounds = map.getBounds();
  return markers.filter(
    (marker) =>
      visibleCategories[marker.category] &&
      marker.lon >= mapBounds.getWest() &&
      marker.lon <= mapBounds.getEast() &&
      marker.lat >= mapBounds.getSouth() &&
      marker.lat <= mapBounds.getNorth()
  );
}

/** Draws markers onto a raster canvas already positioned/sized for export. */
function drawMarkersOnCanvas(
  ctx: CanvasRenderingContext2D,
  map: maplibregl.Map,
  markers: MarkerData[],
  markerStyles: Record<MarkerCategory, MarkerStyle>,
  visibleCategories: Record<MarkerCategory, boolean>,
  scaleFactor: number,
  showMarkerLabels: boolean,
  labelFontSize: number
): void {
  const visibleMarkers = getVisibleMarkersInView(map, markers, visibleCategories);

  visibleMarkers.forEach((marker) => {
    const style = markerStyles[marker.category];
    const point = map.project([marker.lon, marker.lat]);
    const x = point.x * scaleFactor;
    const y = point.y * scaleFactor;

    drawMarkerShape(ctx, x, y, style, scaleFactor);

    if (showMarkerLabels) {
      drawMarkerLabel(
        ctx,
        x,
        y - (style.size / 2) * scaleFactor - 4 * scaleFactor,
        marker.label || marker.name,
        labelFontSize,
        scaleFactor
      );
    }
  });
}

/**
 * Export the current (or specified) map extent as a PNG image, including
 * basemap, bathymetry layers, markers, compass and scale bar.
 */
export async function exportMapAsPNG(
  map: maplibregl.Map,
  filename: string = 'metocean-map.png',
  options: MapExportOptions = {}
): Promise<void> {
  const {
    bounds = null,
    dpi = DEFAULT_EXPORT_DPI,
    markers = [],
    markerStyles = {} as Record<MarkerCategory, MarkerStyle>,
    visibleCategories = {} as Record<MarkerCategory, boolean>,
    showMarkerLabels = true,
    labelFontSize = 12,
  } = options;

  const blob = await withExportBounds(map, bounds, async () => {
    const { canvas, scaleFactor } = await renderBaseMapCanvas(map, dpi);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context for export.');

    drawMarkersOnCanvas(
      ctx,
      map,
      markers,
      markerStyles,
      visibleCategories,
      scaleFactor,
      showMarkerLabels,
      labelFontSize
    );

    const fitted = await fitCanvasToByteBudget(
      canvas,
      'image/png',
      undefined,
      TARGET_EXPORT_BYTES
    );
    return fitted.blob;
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export the current (or specified) map extent as a PDF document, including
 * basemap, bathymetry layers, markers, compass and scale bar.
 */
export async function exportMapAsPDF(
  map: maplibregl.Map,
  filename: string = 'metocean-map.pdf',
  title: string = 'Metocean Map',
  options: MapExportOptions = {}
): Promise<void> {
  const {
    bounds = null,
    dpi = DEFAULT_EXPORT_DPI,
    markers = [],
    markerStyles = {} as Record<MarkerCategory, MarkerStyle>,
    visibleCategories = {} as Record<MarkerCategory, boolean>,
    showMarkerLabels = true,
    labelFontSize = 12,
  } = options;

  const { dataUrl, canvasWidth, canvasHeight } = await withExportBounds(map, bounds, async () => {
    const { canvas, scaleFactor } = await renderBaseMapCanvas(map, dpi);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context for export.');

    drawMarkersOnCanvas(
      ctx,
      map,
      markers,
      markerStyles,
      visibleCategories,
      scaleFactor,
      showMarkerLabels,
      labelFontSize
    );

    const fitted = await fitCanvasToByteBudget(
      canvas,
      'image/jpeg',
      0.85,
      TARGET_EXPORT_BYTES
    );

    return {
      dataUrl: fitted.canvas.toDataURL('image/jpeg', 0.85),
      canvasWidth: fitted.canvas.width,
      canvasHeight: fitted.canvas.height,
    };
  });

  const imgWidth = 280; // mm, landscape A4 usable width
  const imgHeight = (canvasHeight * imgWidth) / canvasWidth;

  const pdf = new jsPDF({
    orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();

  pdf.setFontSize(16);
  pdf.text(title, pageWidth / 2, 12, { align: 'center' });
  pdf.addImage(dataUrl, 'JPEG', (pageWidth - imgWidth) / 2, 20, imgWidth, imgHeight);

  pdf.setProperties({
    title,
    subject: 'Metocean Map Export',
    author: 'Metocean Map Maker',
    keywords: 'bathymetry, metocean, map',
    creator: 'Metocean Map Maker',
  });

  pdf.save(filename);
}

