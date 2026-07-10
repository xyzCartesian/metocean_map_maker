export type ContourIntervalMode = "all" | "10m" | "100m" | "custom";

export type LabelIntervalMode = "all" | "10m" | "100m" | "custom";

export type BathymetryContourConfig = {
  intervalMode: ContourIntervalMode;
  customInterval: number;
  lineColor: string;
  labelColor: string;
  lineWidth: number;
  labelsEnabled: boolean;
  labelFontSize: number;
  labelSpacingPx: number;
  customLabelInterval: number;
  labelIntervalMode: LabelIntervalMode;
};
