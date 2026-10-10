import React from "react";
import type { BathymetryContourConfig } from "../types/BathymetryContourConfig";

type Props = {
  contourConfig: BathymetryContourConfig;
  setContourConfig: React.Dispatch<React.SetStateAction<BathymetryContourConfig>>;
};

const STEP_LABELS: Record<number, string> = {
  1: "all",
  2: "2x",
  5: "5x",
  10: "10x",
  20: "20x",
  50: "50x",
  100: "100x",
};

function stepLabel(step: number, base: number) {
  const interval = base * step;
  return interval >= 1000 ? `${interval / 1000} km` : `${interval} m`;
}

function ContourControlsPanel({ contourConfig, setContourConfig }: Props) {
  const set = (patch: Partial<BathymetryContourConfig>) =>
    setContourConfig((previous) => ({ ...previous, ...patch }));

  return (
    <>
      <label className="contour-checkbox">
        <input
          type="checkbox"
          checked={contourConfig.showAllContours}
          onChange={(event) => set({ showAllContours: event.target.checked })}
        />
        Show all contours
      </label>

      <label className="contour-checkbox">
        <input
          type="checkbox"
          checked={contourConfig.adaptiveZoom}
          disabled={contourConfig.showAllContours}
          onChange={(event) => set({ adaptiveZoom: event.target.checked })}
        />
        Thin contours when zoomed out
      </label>

      {!contourConfig.showAllContours && (
        <>
          <label>
            Shallow contours (0–100 m): every {stepLabel(contourConfig.shallowStep, 10)}
            <input
              className="range-input"
              type="range"
              min="1"
              max="10"
              step="1"
              list="shallow-steps"
              value={Math.min(contourConfig.shallowStep, 10)}
              onChange={(event) => set({ shallowStep: Number(event.target.value) })}
            />
            <datalist id="shallow-steps">
              {[1, 2, 5, 10].map((v) => (
                <option key={v} value={v} label={STEP_LABELS[v]} />
              ))}
            </datalist>
          </label>

          <label>
            Deep contours (&gt;100 m): every {stepLabel(contourConfig.deepStep, 100)}
            <input
              className="range-input"
              type="range"
              min="1"
              max="50"
              step="1"
              list="deep-steps"
              value={Math.min(contourConfig.deepStep, 50)}
              onChange={(event) => set({ deepStep: Number(event.target.value) })}
            />
            <datalist id="deep-steps">
              {[1, 2, 5, 10, 20, 50].map((v) => (
                <option key={v} value={v} label={STEP_LABELS[v]} />
              ))}
            </datalist>
          </label>
        </>
      )}

      {contourConfig.adaptiveZoom && !contourConfig.showAllContours && (
        <p className="instruction-text">
          Adaptive zoom active: sliders set the maximum density at close zoom;
          contours thin automatically as you zoom out.
        </p>
      )}

      <label>
        Contour colour
        <input
          className="colour-input"
          type="color"
          value={contourConfig.lineColor}
          onChange={(event) => set({ lineColor: event.target.value })}
        />
      </label>

      <label>
        Label colour
        <input
          className="colour-input"
          type="color"
          value={contourConfig.labelColor}
          onChange={(event) => set({ labelColor: event.target.value })}
        />
      </label>

      <label>
        Line width: {contourConfig.lineWidth}px
        <input
          className="range-input"
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={contourConfig.lineWidth}
          onChange={(event) => set({ lineWidth: Number(event.target.value) })}
        />
      </label>

      <label className="contour-checkbox">
        <input
          type="checkbox"
          checked={contourConfig.labelsEnabled}
          onChange={(event) => set({ labelsEnabled: event.target.checked })}
        />
        Show contour labels
      </label>

      <label>
        Label spacing: {contourConfig.labelSpacingPx}px
        <input
          className="range-input"
          type="range"
          min="10"
          max="300"
          step="10"
          value={contourConfig.labelSpacingPx}
          onChange={(event) => set({ labelSpacingPx: Number(event.target.value) })}
        />
      </label>

      <label>
        Label font size: {contourConfig.labelFontSize}px
        <input
          className="range-input"
          type="range"
          min="8"
          max="30"
          value={contourConfig.labelFontSize}
          onChange={(event) => set({ labelFontSize: Number(event.target.value) })}
        />
      </label>
    </>
  );
}

export default ContourControlsPanel;

