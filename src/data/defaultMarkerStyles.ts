import type { MarkerStyle } from "../types/MarkerStyle";
import type { MarkerCategory } from "../types/MarkerCategory";

export const defaultMarkerStyles:
Record<MarkerCategory, MarkerStyle> = {
    "Offshore structure": {
        colour: "#d7191c",
        size: 18,
        symbol: "circle",
    },
    "Measured wind": {
        colour: "#2c7bb6",
        size: 16,
        symbol: "cross",
    },
    "Measured wave": {
        colour: "#00a6ca",
        size: 16,
        symbol: "triangle",
    },
    "Measured current": {
        colour: "#00ccbc",
        size: 16,
        symbol: "square",
    },
    "Measured combination": {
        colour: "#90eb9d",
        size: 16,
        symbol: "diamond",
    },
    "Model wind": {
        colour: "#fdae61",
        size: 14,
        symbol: "cross",
    },
    "Model wave": {
        colour: "#f46d43",
        size: 14,
        symbol: "triangle",
    },
    "Model current": {
        colour: "#abdda4",
        size: 14,
        symbol: "square",
    },
    "Model combination": {
        colour: "#ffffbf",
        size: 14,
        symbol: "diamond",
    },
}