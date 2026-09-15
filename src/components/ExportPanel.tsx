import { useEffect, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { Download, AlertCircle, Crop } from 'lucide-react';
import {
  exportMapAsPNG,
  exportMapAsPDF,
  EXPORT_DPI_PRESETS,
  DEFAULT_EXPORT_DPI,
  type LngLatBoundsBox,
  type MapExportOptions,
} from '../utils/mapExport';
import type { MarkerData } from '../types/MarkerData';
import type { MarkerStyle } from '../types/MarkerStyle';
import type { MarkerCategory } from '../types/MarkerCategory';
import '../styles/ExportPanel.css';

interface ExportPanelProps {
  mapRef: React.RefObject<maplibregl.Map | null>;
  mapReady: boolean;
  markers: MarkerData[];
  markerStyles: Record<MarkerCategory, MarkerStyle>;
  visibleCategories: Record<MarkerCategory, boolean>;
  showMarkerLabels: boolean;
  labelFontSize: number;
  mapTitle?: string;
}

export default function ExportPanel({
  mapRef,
  mapReady,
  markers,
  markerStyles,
  visibleCategories,
  showMarkerLabels,
  labelFontSize,
  mapTitle = 'Metocean Map',
}: ExportPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const [extentMode, setExtentMode] = useState<'current' | 'custom'>('current');
  const [minLat, setMinLat] = useState('');
  const [maxLat, setMaxLat] = useState('');
  const [minLng, setMinLng] = useState('');
  const [maxLng, setMaxLng] = useState('');
  const [dpi, setDpi] = useState(DEFAULT_EXPORT_DPI);
  const [isDrawingBox, setIsDrawingBox] = useState(false);
  const isDrawingBoxRef = useRef(false);

  // Close the dropdown when clicking outside of it (but not while drawing a box on the map).
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isDrawingBoxRef.current) return;
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function prefillFromCurrentView() {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    setMinLat(bounds.getSouth().toFixed(4));
    setMaxLat(bounds.getNorth().toFixed(4));
    setMinLng(bounds.getWest().toFixed(4));
    setMaxLng(bounds.getEast().toFixed(4));
  }

  function handleExtentModeChange(mode: 'current' | 'custom') {
    setExtentMode(mode);
    if (mode === 'custom' && !minLat && !maxLat && !minLng && !maxLng) {
      prefillFromCurrentView();
    }
  }

  function startDrawingBox() {
    const map = mapRef.current;
    if (!map || isDrawingBoxRef.current) return;

    const container = map.getContainer();
    let startPoint: { x: number; y: number } | null = null;
    let overlay: HTMLDivElement | null = null;

    isDrawingBoxRef.current = true;
    setIsDrawingBox(true);
    map.dragPan.disable();
    map.boxZoom.disable();
    map.getCanvas().style.cursor = 'crosshair';

    function getRelativePoint(event: MouseEvent) {
      const rect = container.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function updateOverlay(p1: { x: number; y: number }, p2: { x: number; y: number }) {
      if (!overlay) return;
      overlay.style.left = `${Math.min(p1.x, p2.x)}px`;
      overlay.style.top = `${Math.min(p1.y, p2.y)}px`;
      overlay.style.width = `${Math.abs(p2.x - p1.x)}px`;
      overlay.style.height = `${Math.abs(p2.y - p1.y)}px`;
    }

    function handleMouseMove(event: MouseEvent) {
      if (!startPoint) return;
      updateOverlay(startPoint, getRelativePoint(event));
    }

    function cleanup() {
      map!.dragPan.enable();
      map!.boxZoom.enable();
      map!.getCanvas().style.cursor = '';
      overlay?.remove();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      isDrawingBoxRef.current = false;
      setIsDrawingBox(false);
    }

    function handleMouseUp(event: MouseEvent) {
      if (startPoint) {
        const endPoint = getRelativePoint(event);
        const minPixelDragDistance = 6;

        if (
          Math.abs(endPoint.x - startPoint.x) >= minPixelDragDistance &&
          Math.abs(endPoint.y - startPoint.y) >= minPixelDragDistance
        ) {
          const sw = map!.unproject([
            Math.min(startPoint.x, endPoint.x),
            Math.max(startPoint.y, endPoint.y),
          ]);
          const ne = map!.unproject([
            Math.max(startPoint.x, endPoint.x),
            Math.min(startPoint.y, endPoint.y),
          ]);

          setMinLat(sw.lat.toFixed(4));
          setMaxLat(ne.lat.toFixed(4));
          setMinLng(sw.lng.toFixed(4));
          setMaxLng(ne.lng.toFixed(4));
          setExtentMode('custom');
        }
      }

      cleanup();
    }

    function handleMouseDown(event: MouseEvent) {
      startPoint = getRelativePoint(event);
      overlay = document.createElement('div');
      overlay.className = 'export-draw-box-overlay';
      container.appendChild(overlay);
      updateOverlay(startPoint, startPoint);

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousedown', handleMouseDown);
    }

    container.addEventListener('mousedown', handleMouseDown);
  }

  function getExportBounds(): LngLatBoundsBox | null {
    if (extentMode === 'current') return null;

    const parsedMinLat = Number(minLat);
    const parsedMaxLat = Number(maxLat);
    const parsedMinLng = Number(minLng);
    const parsedMaxLng = Number(maxLng);

    if (
      !Number.isFinite(parsedMinLat) ||
      !Number.isFinite(parsedMaxLat) ||
      !Number.isFinite(parsedMinLng) ||
      !Number.isFinite(parsedMaxLng)
    ) {
      throw new Error('Please enter valid numeric latitude/longitude bounds.');
    }

    if (parsedMinLat >= parsedMaxLat) {
      throw new Error('Minimum latitude must be less than maximum latitude.');
    }

    if (parsedMinLng >= parsedMaxLng) {
      throw new Error('Minimum longitude must be less than maximum longitude.');
    }

    return {
      minLat: parsedMinLat,
      maxLat: parsedMaxLat,
      minLng: parsedMinLng,
      maxLng: parsedMaxLng,
    };
  }

  async function runExport(exportFn: (map: maplibregl.Map, options: MapExportOptions) => Promise<void>) {
    const map = mapRef.current;
    if (!map) return;

    setIsExporting(true);
    setExportStatus({ type: null, message: '' });

    try {
      const bounds = getExportBounds();
      const options: MapExportOptions = {
        bounds,
        dpi,
        markers,
        markerStyles,
        visibleCategories,
        showMarkerLabels,
        labelFontSize,
      };
      await exportFn(map, options);
      setExportStatus({ type: 'success', message: 'Export completed successfully!' });
    } catch (error) {
      setExportStatus({
        type: 'error',
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsExporting(false);
    }
  }

  const datedFilename = (extension: string) =>
    `${mapTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${extension}`;

  const handleExportPNG = () =>
    runExport((map, options) => exportMapAsPNG(map, datedFilename('png'), options));

  const handleExportPDF = () =>
    runExport((map, options) => exportMapAsPDF(map, datedFilename('pdf'), mapTitle, options));

  return (
    <div className="export-widget" ref={containerRef}>
      <button
        type="button"
        className="export-toggle-button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={!mapReady}
        title="Export map"
      >
        <Download size={18} />
      </button>

      {isOpen && (
        <div className="export-dropdown">
          <h3>Export map</h3>

          <div className="export-extent-mode">
            <label>
              <input
                type="radio"
                name="extent-mode"
                checked={extentMode === 'current'}
                onChange={() => handleExtentModeChange('current')}
              />
              Current view
            </label>
            <label>
              <input
                type="radio"
                name="extent-mode"
                checked={extentMode === 'custom'}
                onChange={() => handleExtentModeChange('custom')}
              />
              Custom extent
            </label>
          </div>

          {extentMode === 'custom' && (
            <div className="export-extent-inputs">
              <label>
                Min latitude
                <input
                  className="text-input"
                  type="number"
                  value={minLat}
                  onChange={(event) => setMinLat(event.target.value)}
                />
              </label>
              <label>
                Max latitude
                <input
                  className="text-input"
                  type="number"
                  value={maxLat}
                  onChange={(event) => setMaxLat(event.target.value)}
                />
              </label>
              <label>
                Min longitude
                <input
                  className="text-input"
                  type="number"
                  value={minLng}
                  onChange={(event) => setMinLng(event.target.value)}
                />
              </label>
              <label>
                Max longitude
                <input
                  className="text-input"
                  type="number"
                  value={maxLng}
                  onChange={(event) => setMaxLng(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="secondary-button export-use-current-button"
                onClick={prefillFromCurrentView}
              >
                Use current view
              </button>
              <button
                type="button"
                className="secondary-button export-use-current-button"
                onClick={startDrawingBox}
                disabled={isDrawingBox}
              >
                <Crop size={14} />
                {isDrawingBox ? 'Drawing…' : 'Draw box on map'}
              </button>
            </div>
          )}

          {isDrawingBox && (
            <p className="instruction-text">
              Click and drag on the map to select the export area.
            </p>
          )}

          <label className="export-dpi-select">
            Resolution (DPI)
            <select
              className="text-input"
              value={dpi}
              onChange={(event) => setDpi(Number(event.target.value))}
            >
              {EXPORT_DPI_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset} dpi{preset === DEFAULT_EXPORT_DPI ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="export-buttons">
            <button
              className="export-button png-export"
              onClick={handleExportPNG}
              disabled={isExporting}
              title="Export map as PNG image"
            >
              <Download size={16} />
              PNG Image
            </button>

            <button
              className="export-button pdf-export"
              onClick={handleExportPDF}
              disabled={isExporting}
              title="Export map as PDF document"
            >
              <Download size={16} />
              PDF Document
            </button>
          </div>

          {isExporting && (
            <div className="export-status loading">
              <div className="spinner"></div>
              <span>Exporting...</span>
            </div>
          )}

          {exportStatus.type && (
            <div className={`export-status ${exportStatus.type}`}>
              <AlertCircle size={16} />
              <span>{exportStatus.message}</span>
            </div>
          )}

          <p className="export-info">
            💡 PNG: Raster image (best for sharing)
            <br />
            📄 PDF: Document format (best for printing)
          </p>
        </div>
      )}
    </div>
  );
}

