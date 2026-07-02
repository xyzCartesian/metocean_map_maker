import React from "react";
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


function MarkerStylesPanel({ markerCategories, markerStyles, setMarkerStyles }: Props) {
    return (
        <>
        {markerCategories.map((category) => (
            <div key={category} className="marker-style-row">
                <div className = "marker-style-heading">
                <span
                    className="category-dot"
                    style = {{ backgroundColor: markerStyles[category].colour }}
                />
                <strong>{category}</strong>
                </div>
                <label>
                Colour
                <input
                    className="colour-input"
                    type="color"
                    value={markerStyles[category].colour}
                    onChange={(event) => 
                    setMarkerStyles((previous) => ({
                        ...previous,
                        [category]: { ...previous[category], colour: event.target.value },
                    }))
                    }
                />
                </label>

                <label>
                Size: {markerStyles[category].size}px
                <input
                    className="range-input"
                    type="range"
                    min="8"
                    max="36"
                    value={markerStyles[category].size}
                    onChange={(event) => 
                    setMarkerStyles((previous) => ({
                        ...previous,
                        [category]: { ...previous[category], size: Number(event.target.value) },
                    }))
                    }
                />
                </label>
            </div>
            ))}
        </>
    );
}

export default MarkerStylesPanel