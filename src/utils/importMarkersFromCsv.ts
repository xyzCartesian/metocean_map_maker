import Papa from "papaparse";
import type { MarkerCategory } from "../types/MarkerCategory";
import type { MarkerData } from "../types/MarkerData";

export function importMarkersFromCsv(
    file: File,
    onComplete: (markers: MarkerData[]) => void
) {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
        const importedMarkers = results.data
            .map((row: any) => {
            const lat = Number(row.Latitude);
            const lon = Number(row.Longitude);

            if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lon) ||
                lat < -90 ||
                lat > 90 ||
                lon < -180 ||
                lon > 180
            ) {
                return null;
            }

            return {
                id: Date.now() + Math.random(),
                name: row.Name || "Unnamed point",
                label: row.Label || row.Name || "Unnamed point",
                lat,
                lon,
                category: row.Category as MarkerCategory,
            };
            })
            .filter(Boolean) as MarkerData[];

        onComplete(importedMarkers);
        },
    });
}