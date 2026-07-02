import type { MarkerCategory } from "../types/MarkerCategory"
import type { MarkerStyle } from "../types/MarkerStyle";

type Props = {
    markerCategories: MarkerCategory[];
    visibleCategories: Record<MarkerCategory, boolean>;
    markerStyles: Record<MarkerCategory,MarkerStyle>;
    toggleCategory: (category: MarkerCategory) => void;
};

function MarkerVisibilityPanel({
    markerCategories,
    visibleCategories,
    markerStyles,
    toggleCategory,
}: Props) {
    return (
      <>
        {markerCategories.map((category) => (
        <label key={category} className="category-toggle">
            <input
            type="checkbox"
            checked={visibleCategories[category]}
            onChange={() => toggleCategory(category)}
            />
            <span
            className="category-dot"
            style={{ backgroundColor: markerStyles[category].colour }}
            />
            {category}
        </label>
        ))}
    </>
    );
}

export default MarkerVisibilityPanel
