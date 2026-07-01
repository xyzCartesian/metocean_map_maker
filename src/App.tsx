import "./App.css";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Papa from "papaparse";
import {
  ChevronDown,
  ChevronRight,
} from "lucide-react"

type MarkerCategory =
  | "Offshore structure"
  | "Measured wind"
  | "Measured wave"
  | "Measured current"
  | "Measured combination"
  | "Model wind"
  | "Model wave"
  | "Model current"
  | "Model combination";

type MarkerData = {
  id: number;
  name: string;
  label: string;
  lat: number;
  lon: number;
  category: MarkerCategory;
};

type MarkerStyle = {
  colour: string;
  size: number;
};

const markerCategories: MarkerCategory[] = [
  "Offshore structure",
  "Measured wind",
  "Measured wave",
  "Measured current",
  "Measured combination",
  "Model wind",
  "Model wave",
  "Model current",
  "Model combination",
];

const defaultMarkerStyles: Record<MarkerCategory, MarkerStyle> = {
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
};

function App() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerObjectsRef = useRef<maplibregl.Marker[]>([]);

  const addingPointRef = useRef(false);
  const selectedCategoryRef = useRef<MarkerCategory>("Offshore structure");
  const pointNameRef = useRef("New point");
  const pointLabelRef = useRef("New point");
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);

  const [addingPoint, setAddingPoint] = useState(false);
  const [markers, setMarkers] = useState<MarkerData[]>([]);

  const [pointName, setPointName] = useState("New point");
  const [pointLat, setPointLat] = useState("");
  const [pointLon, setPointLon] = useState("");

  const [pointLabel] = useState("New point");

  const [showMarkerLabels, setShowMarkerLabels] = useState(true);
  const [labelFontSize, setLabelFontSize] = useState(12);

  const [markerStyles, setMarkerStyles] = 
    useState<Record<MarkerCategory, MarkerStyle>>(defaultMarkerStyles);

  const [selectedCategory, setSelectedCategory] =
    useState<MarkerCategory>("Offshore structure");

  const [visibleCategories, setVisibleCategories] =
    useState<Record<MarkerCategory, boolean>>({
      "Offshore structure": true,
      "Measured wind": true,
      "Measured wave": true,
      "Measured current": true,
      "Measured combination": true,
      "Model wind": true,
      "Model wave": true,
      "Model current": true,
      "Model combination": true,
    });

  const [editingMarkerId, setEditingMarkerId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editLat, setEditLat] = useState("");
  const [editLon, setEditLon] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editCategory, setEditCategory] =
    useState<MarkerCategory>("Offshore structure");

  const [panelSections, setPanelSections] = useState({
    mapLayers: true,
    markerVisibility: true,
    pointDetails: true,
    importCsv: false,
    markersByCategory: false,
    markerLabels: false,
    markerStyles: false,
  });

  useEffect(() => {
    addingPointRef.current = addingPoint;
  }, [addingPoint]);

  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
  }, [selectedCategory]);

  useEffect(() => {
    pointNameRef.current = pointName;
  }, [pointName]);

  useEffect(() => {
    pointLabelRef.current = pointLabel;
  }, [pointLabel]);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: "map",
      style: "https://demotiles.maplibre.org/style.json",
      center: [0, 0],
      zoom: 2,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 150,
        unit: "metric",
      }),
      "bottom-left"
    );

    map.on("click", (event) => {
      if (!addingPointRef.current) return;

      const newMarker: MarkerData = {
        id: Date.now(),
        name: pointNameRef.current || "New point",
        label: pointLabelRef.current || pointNameRef.current || "New point",
        lon: event.lngLat.lng,
        lat: event.lngLat.lat,
        category: selectedCategoryRef.current,
      };

      setMarkers((previousMarkers) => [...previousMarkers, newMarker]);
      setAddingPoint(false);
    });

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    markerObjectsRef.current.forEach((marker) => marker.remove());
    markerObjectsRef.current = [];

    if (!mapRef.current) return;

    const visibleMarkers = markers.filter(
      (markerData) => visibleCategories[markerData.category]
    );

    visibleMarkers.forEach((markerData) => {
      const markerStyle = markerStyles[markerData.category];

      const markerElement = document.createElement("div");
      markerElement.className = "metocean-marker-wrapper";

      const markerDot = document.createElement("div");
      markerDot.className = "metocean-marker-dot";
      markerDot.style.backgroundColor = markerStyle.colour;
      markerDot.style.width = `${markerStyle.size}px`;
      markerDot.style.height = `${markerStyle.size}px`;

      markerElement.appendChild(markerDot);

      if (showMarkerLabels) {
        const markerLabel = document.createElement("div");
        markerLabel.className = "metocean-marker-label";
        markerLabel.textContent = markerData.label || markerData.name;
        markerLabel.style.fontSize = `${labelFontSize}px`;

        markerElement.appendChild(markerLabel);
      }

     
      const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: "center",
      })
        .setLngLat([markerData.lon, markerData.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <strong>${markerData.name}</strong><br/>
            Label: ${markerData.label}<br/>
            Category: ${markerData.category}<br/>
            Lat: ${markerData.lat.toFixed(5)}<br/>
            Lon: ${markerData.lon.toFixed(5)}
          `)
        )
        .addTo(mapRef.current!);

      markerObjectsRef.current.push(marker);
    });
  }, [markers, visibleCategories, showMarkerLabels, labelFontSize, markerStyles]);


  function addPointFromCoordinates() {
    const lat = Number(pointLat);
    const lon = Number(pointLon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      alert("Please enter valid numeric latitude and longitude values.");
      return;
    }

    if (lat < -90 || lat > 90) {
      alert("Latitude must be between -90 and 90 degrees.");
      return;
    }

    if (lon < -180 || lon > 180) {
      alert("Longitude must be between -180 and 180 degrees.");
      return;
    }

    const newMarker: MarkerData = {
      id: Date.now(),
      name: pointName || "New point",
      label: pointLabel || pointName || "New point",
      lat,
      lon,
      category: selectedCategory,
    };

    setMarkers((previousMarkers) => [...previousMarkers, newMarker]);

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lon, lat],
        zoom: Math.max(mapRef.current.getZoom(), 5),
      });
    }

    setPointLat("");
    setPointLon("");
  }

  function toggleCategory(category: MarkerCategory) {
    setVisibleCategories((previous) => ({
      ...previous,
      [category]: !previous[category],
    }));
  }

  function startEditingMarker(marker: MarkerData) {
    setEditingMarkerId(marker.id);
    setEditName(marker.name);
    setEditLat(String(marker.lat));
    setEditLon(String(marker.lon));
    setEditLabel(marker.label);
    setEditCategory(marker.category);
  }

  function cancelEditingMarker() {
    setEditingMarkerId(null);
    setEditName("");
    setEditLat("");
    setEditLon("");
    setEditLabel(""); 
    setEditCategory("Offshore structure");
  }

  function saveEditedMarker() {
    if (editingMarkerId === null) return;

    const lat = Number(editLat);
    const lon = Number(editLon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      alert("Please enter valid numeric latitude and longitude values.");
      return;
    }

    if (lat < -90 || lat > 90) {
      alert("Latitude must be between -90 and 90 degrees.");
      return;
    }

    if (lon < -180 || lon > 180) {
      alert("Longitude must be between -180 and 180 degrees.");
      return;
    }

    setMarkers((previousMarkers) =>
      previousMarkers.map((marker) =>
        marker.id === editingMarkerId
          ? {
              ...marker,
              name: editName || "Unnamed point",
              lat,
              lon,
              category: editCategory,
              label: editLabel || editName || "Unnamed point",
            }
          : marker
      )
    );

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lon, lat],
        zoom: Math.max(mapRef.current.getZoom(), 5),
      });
    }

    cancelEditingMarker();
  }

  function deleteMarker(markerId: number) {
    setMarkers((previousMarkers) =>
      previousMarkers.filter((marker) => marker.id !== markerId)
    );

    if (editingMarkerId === markerId) {
      cancelEditingMarker();
    }
  }

  function handleCsvImport(
    event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,

      complete: (results: { data: any[]; }) => {

        const importedMarkers: MarkerData[] = 
          results.data.map((row: any) => {
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
              return null; // Skip invalid rows
            }

            return {
              id: Date.now() + Math.random(), // Unique ID
              name: row.Name || "Unnamed point",
              label: row.Label || row.Name || "Unnamed point",
              lat,
              lon,
              category: row.Category as MarkerCategory,
            };
          })
          .filter(Boolean) as MarkerData[]; // Filter out nulls
        
          setMarkers(prev => [
            ...prev,
            ...importedMarkers
          ]);

          const bounds = 
            new maplibregl.LngLatBounds();

          importedMarkers.forEach((marker) => {
            bounds.extend([
            marker.lon,
            marker.lat
            ])
          });

          if (
            importedMarkers.length === 1 && 
            mapRef.current
          ) {
            mapRef.current.flyTo({
              center: [
                importedMarkers[0].lon,
                importedMarkers[0].lat
              ],
              zoom:8
            });
          }
          else if (
            importedMarkers.length > 1 && 
            mapRef.current
          ) {
            const bounds = 
              new maplibregl.LngLatBounds();

            importedMarkers.forEach((marker) => {
              bounds.extend([
                marker.lon,
                marker.lat
              ])
            })
          }

          mapRef.current?.fitBounds(
            bounds,
            {
              padding: 50
            }
        );
        },
    });
  }
  

  function clearMarkers() {
    setMarkers([]);
    cancelEditingMarker();
  }

  function getMarkersForCategory(category: MarkerCategory) {
    return markers.filter((marker) => marker.category === category);
  }

  function toggleSection(
    section: keyof typeof panelSections
  ) {
    setPanelSections((previous) => ({
      ...previous,
      [section]: !previous[section],
    }));
  }
  

  return (
    <>
      <div id="map" />

      <div className="control-panel">
        <h2>Metocean Map Maker</h2>

        <div
          className="section-header"
          onClick={() => toggleSection("mapLayers")}
        >
          {panelSections.mapLayers
            ? <ChevronDown size={16} />
            : <ChevronRight size={16} />
          }
          Map layers
        </div>

        {panelSections.mapLayers && (
          <>
        <label>
          <input type="checkbox" defaultChecked />
          Basemap
        </label>

        <label>
          <input type="checkbox" />
          Bathymetry
        </label>

        <label>
          <input type="checkbox" />
          Topography
        </label>
        </>
        )}

        <div
          className="section-header"
          onClick={() => toggleSection("markerVisibility")}
        >
          {panelSections["markerVisibility"]
            ? <ChevronDown size={16} />
            : <ChevronRight size={16} />
          }
          Marker visibility
        </div>

        {panelSections["markerVisibility"] && (
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
        )}

        <div
          className="section-header"
          onClick={() => toggleSection("pointDetails")}
        >
          {panelSections["pointDetails"]
            ? <ChevronDown size={16} />
            : <ChevronRight size={16} />
          }
          Point details
        </div>

        {panelSections["pointDetails"] && (
          <>
          <label>
            Name
            <input
              className="text-input"
              value={pointName}
              onChange={(event) => setPointName(event.target.value)}
              placeholder="e.g. Bonga buoy"
            />
          </label>

          <label>
            Map label 
            <input
              className="text-input"
              value={editLabel}
              onChange={(event) => setEditLabel(event.target.value)}
            /> 
          </label>

          <label>
            Category
            <select
              className="text-input"
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value as MarkerCategory)
              }
            >
              {markerCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          </>
        )}

        <h3>Add by map click</h3>

        <button
          className={
            addingPoint ? "primary-button active-button" : "primary-button"
          }
          onClick={() => setAddingPoint(true)}
        >
          Click map to add point
        </button>

        {addingPoint && (
          <p className="instruction-text">
            Click a location on the map to place the marker.
          </p>
        )}

        <h3>Add by WGS84 coordinates</h3>

        <label>
          Latitude
          <input
            className="text-input"
            value={pointLat}
            onChange={(event) => setPointLat(event.target.value)}
            placeholder="e.g. 4.321"
          />
        </label>

        <label>
          Longitude
          <input
            className="text-input"
            value={pointLon}
            onChange={(event) => setPointLon(event.target.value)}
            placeholder="e.g. 6.210"
          />
        </label>

        <button className="primary-button" onClick={addPointFromCoordinates}>
          Add coordinate point
        </button>

        {editingMarkerId !== null && (
          <>
            <h3>Edit selected marker</h3>

            <label>
              Name
              <input
                className="text-input"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </label>

            <label>
              Category
              <select
                className="text-input"
                value={editCategory}
                onChange={(event) =>
                  setEditCategory(event.target.value as MarkerCategory)
                }
              >
                {markerCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>

            <label>
              Latitude
              <input
                className="text-input"
                value={editLat}
                onChange={(event) => setEditLat(event.target.value)}
              />
            </label>

            <label>
              Longitude
              <input
                className="text-input"
                value={editLon}
                onChange={(event) => setEditLon(event.target.value)}
              />
            </label>

            <button className="primary-button" onClick={saveEditedMarker}>
              Save changes
            </button>

            <button className="secondary-button" onClick={cancelEditingMarker}>
              Cancel edit
            </button>
          </>
        )}

        <h3>Import CSV</h3>
          
        <input
          type="file"
          accept=".csv"
          onChange={handleCsvImport}  
        />
       
        <button className="secondary-button" onClick={clearMarkers}>
          Clear all markers
        </button>

        <h3>Markers by category</h3>

        <div
          className="section-header"
          onClick={() => toggleSection("markersByCategory")}
        >
          {panelSections["markersByCategory"]
            ? <ChevronDown size={16} />
            : <ChevronRight size={16} />
          }
          Markers by category
        </div>  

        {panelSections["markersByCategory"] && (
          <>
          <p className="marker-count">Total markers: {markers.length}</p>

          {markerCategories.map((category) => {
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
        )}  

        <div
          className="section-header"
          onClick={() => toggleSection("markerLabels") }
        >
          {panelSections["markersByCategory"]
            ? <ChevronDown size={16} />
            : <ChevronRight size={16} />
          }
          Marker labels
        </div> 

        {panelSections["markerLabels"] && (
          <>
          <label>
            <input
              type="checkbox"
              checked={showMarkerLabels}
              onChange={(event) => setShowMarkerLabels(event.target.checked)}
            />
            Show labels
          </label>

          <label>
            Label font size: {labelFontSize}px
            <input
              className="range-input"
              type="range"
              min="8"
              max="24"
              value={labelFontSize}
              onChange={(event) => setLabelFontSize(Number(event.target.value))}
            />    
          </label>
          </>
        )}

        <div
          className="section-header"
          onClick={() => toggleSection("markerStyles") }
        >
          {panelSections["markersByCategory"]
            ? <ChevronDown size={16} />
            : <ChevronRight size={16} />
          }
          Marker styles
        </div> 

        {panelSections["markerStyles"] && (
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
        )}
        </div>

      
      <div className={helpPanelOpen ? "help-panel open" : "help-panel collapsed"}>

        <button
          className="help-panel-toggle"
          onClick={() => setHelpPanelOpen(!helpPanelOpen)}
        >
          {helpPanelOpen ? "×" : "? Help"}
        </button>

        {helpPanelOpen && (
          <div className="help-panel-content">

            <h3>Help & Examples</h3>

            <p className="help-text">
              CSV files must contain the following columns:
            </p>

            <code>
              Name,Label,Latitude,Longitude,Category
            </code>

            <p className="help-text">
              Latitude and longitude should be in WGS84 decimal degrees.
            </p>

            <p className="help-text">
              Label is optional. If not provided, the Name will be used as the label.
            </p>

            <hr />

            <h4>Example Files</h4>

            <div className="example-links">
              <a
                href="/examples/Example_Measured_Data.csv"
                download
              >
                Measured Data CSV
              </a>
            </div>

          </div>
        )}

      </div>
    </>
  );
}

function getMarkerColour(category: MarkerCategory) {
  switch (category) {
    case "Offshore structure":
      return "#d7191c";

    case "Measured wind":
      return "#2c7bb6";

    case "Measured wave":
      return "#00a6ca";

    case "Measured current":
      return "#00ccbc";

    case "Measured combination":
      return "#90eb9d";

    case "Model wind":
      return "#fdae61";

    case "Model wave":
      return "#f46d43";

    case "Model current":
      return "#abdda4";

    case "Model combination":
      return "#ffffbf";

    default:
      return "#333333";
  }
}

export default App;