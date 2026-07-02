import type { Marker } from "maplibre-gl";
import type { MarkerCategory } from "../types/MarkerCategory";
import type { MarkerStyle } from "../types/MarkerStyle";

type Props = {

    markerCategories: MarkerCategory[];

    markerStyles:
    Record<MarkerCategory, MarkerStyle>;

    setMarkerStyles:
    React.Dispatch<
        React.SetStateAction<
            Record<MarkerCategory, MarkerStyle>
        >
    >;
};


function MarkerStylesPanel() {
    return (
        <>
        Marker Styles Panel
        </>
    );
}

export default MarkerStylesPanel