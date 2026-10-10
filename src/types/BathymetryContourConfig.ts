export type BathymetryContourConfig = {
  /** Multiplier on the shallow (10m) contour density: 1 = every 10m, 2 = every 20m, 5 = every 50m... */
  shallowStep: number;
  /** Multiplier on the deep (100m) contour density: 1 = every 100m, 2 = every 200m, 5 = every 500m... */
  deepStep: number;
  /** Show every contour regardless of step settings. */
  showAllContours: boolean;
  /** Automatically thin contours when zoomed far out. */
  adaptiveZoom: boolean;
  lineColor: string;
  labelColor: string;
  lineWidth: number;
  labelsEnabled: boolean;
  labelFontSize: number;
  labelSpacingPx: number;
};
