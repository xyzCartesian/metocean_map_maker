import type { MarkerCategory } from "./MarkerCategory";

export type MarkerData = {
    id: number;
    name: string;
    label: string;
    lat: number;
    lon: number;
    category: MarkerCategory;
};