import React from "react";
import type {
  BathymetryContourConfig,
  ContourIntervalMode,
  LabelIntervalMode,
} from "../types/BathymetryContourConfig";

type Props = {
  contourConfig: BathymetryContourConfig;
  setContourConfig: React.Dispatch<React.SetStateAction<BathymetryContourConfig>>;
};

function ContourControlsPanel({ contourConfig, setContourConfig }: Props) {
  return (
    <>
      <label>
        Interval set
        <select
          className="text-input"
          value={contourConfig.intervalMode}
          onChange={(event) =>
            setContourConfig((previous) => ({
              ...previous,
              intervalMode: event.target.value as ContourIntervalMode,
            }))
          }
        >
          <option value="all">All contours</option>
          <option value="10m">10 m</option>
          <option value="100m">100 m</option>
          <option value="custom">Custom</option>
        </select>
      </label>

      {contourConfig.intervalMode === "custom" && (
        <label>
          Custom interval (m)
          <input
            className="text-input"
            type="number"
            min={1}
            value={contourConfig.customInterval}
            onChange={(event) =>
              setContourConfig((previous) => ({
                ...previous,
                customInterval: Number(event.target.value) || 1,
              }))
            }
          />
        </label>
      )}

      <label>
        Contour colour
        <input
          className="colour-input"
          type="color"
          value={contourConfig.lineColor}
          onChange={(event) =>
            setContourConfig((previous) => ({
              ...previous,
              lineColor: event.target.value,
            }))
          }
        />
      </label>

      <label>
        Label colour
        <input
          className="colour-input"
          type="color"
          value={contourConfig.labelColor}
          onChange={(event) =>
            setContourConfig((previous) => ({
              ...previous,
              labelColor: event.target.value,
            }))
          }
        />
      </label>

      <label>
        Labels
        <input
          type="checkbox"
          checked={contourConfig.labelsEnabled}
          onChange={(event) =>
            setContourConfig((previous) => ({
              ...previous,
              labelsEnabled: event.target.checked,
            }))
          }
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
          onChange={(event) =>
            setContourConfig((previous) => ({
              ...previous,
              labelSpacingPx: Number(event.target.value),
            }))
          }
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
          onChange={(event) =>
            setContourConfig((previous) => ({
              ...previous,
              labelFontSize: Number(event.target.value),
            }))
          }
        />
      </label>

      <label>
        Label interval
        <select
          className="text-input"
          value={contourConfig.labelIntervalMode}
          onChange={(event) =>
            setContourConfig((previous) => ({
              ...previous,
              labelIntervalMode: event.target.value as LabelIntervalMode,
            }))
          }
        >
          <option value="all">All visible contours</option>
          <option value="10m">10 m</option>
          <option value="100m">100 m</option>
          <option value="custom">Custom</option>
        </select>
      </label>

      {contourConfig.labelIntervalMode === "custom" && (
        <label>
          Custom label interval (m)
          <input
            className="text-input"
            type="number"
            min={1}
            value={contourConfig.customLabelInterval}
            onChange={(event) =>
              setContourConfig((previous) => ({
                ...previous,
                customLabelInterval: Number(event.target.value) || 1,
              }))
            }
          />
        </label>
      )}
    </>
  );
}

export default ContourControlsPanel;
