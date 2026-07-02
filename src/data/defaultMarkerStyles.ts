import type { MarkerStyle } from "../types/MarkerStyle";
import type { MarkerCategory } from "../types/MarkerCategory";

export const defaultMarkerStyles:
Record<MarkerCategory, MarkerStyle> = {
    "Offshore structure": {
    colour: "#d7191c",
    size: 18,
    },
    "Measured wind": {
        colour: "#2c7bb6",
        size: 16,
    },
    "Measured wave": {
        colour: "#00a6ca",
        size: 16,
    },
    "Measured current": {
        colour: "#00ccbc",
        size: 16,
    },
    "Measured combination": {
        colour: "#90eb9d",
        size: 16,
    },
    "Model wind": {
        colour: "#fdae61",
        size: 14,
    },
    "Model wave": {
        colour: "#f46d43",
        size: 14,
    },
    "Model current": {
        colour: "#abdda4",
        size: 14,
    },
    "Model combination": {
        colour: "#ffffbf",
        size: 14,
    },
}