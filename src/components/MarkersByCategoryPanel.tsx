import type { MarkerCategory } from "../types/MarkerCategory"
import type { MarkerData } from "../types/MarkerData"
import type { MarkerStyle } from "../types/MarkerStyle"

type Props = {
    markers: MarkerData[];
    markerCategories: MarkerCategory[];
    markerStyles: Record<MarkerCategory,MarkerStyle>;
    startEditingMarker: (marker: MarkerData) => void;
    deleteMarker: (markerId: number) => void;
    getMarkersForCategory: (category: MarkerCategory) => MarkerData[];
}

function MarkersByCategoryPanel({
    markers,
    markerCategories,
    markerStyles,
    startEditingMarker,
    deleteMarker,
    getMarkersForCategory,
}: Props) {
    return (
        <>
          <p className="marker-count">Total markers: {markers.length}</p>

          {markerCategories.map((category:MarkerCategory) => {
            const categoryMarkers = getMarkersForCategory(category);

            return (
              <div key={category} className="marker-category-group">
                <div className="marker-category-heading">
                  <span
                    className="category-dot"
                    style={{ backgroundColor: markerStyles[category].colour }}
                  />
                  <strong>{category}</strong>
                  <span className="category-count">
                    {categoryMarkers.length}
                  </span>
                </div>

                {categoryMarkers.length === 0 && (
                  <p className="empty-category-text">No markers</p>
                )}

                {categoryMarkers.map((marker) => (
                  <div key={marker.id} className="marker-list-item">
                    <div>
                      <strong>{marker.name}</strong>
                      <br />
                      <span>
                        {marker.lat.toFixed(5)}, {marker.lon.toFixed(5)}
                      </span>
                    </div>

                    <div className="marker-actions">
                      <button
                        className="small-button"
                        onClick={() => startEditingMarker(marker)}
                      >
                        Edit
                      </button>

                      <button
                        className="small-button danger-button"
                        onClick={() => deleteMarker(marker.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </>
    );
}


export default MarkersByCategoryPanel