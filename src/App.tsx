import "./App.css";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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
  lat: number;
  lon: number;
  category: MarkerCategory;
};

function App() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerObjectsRef = useRef<maplibregl.Marker[]>([]);

  const addingPointRef = useRef(false);
  const selectedCategoryRef = useRef<MarkerCategory>("Offshore structure");
  const pointNameRef = useRef("New point");

  const [addingPoint, setAddingPoint] = useState(false);

  const [markers, setMarkers] = useState<MarkerData[]>([]);

  const [pointName, setPointName] = useState("New point");
  const [pointLat, setPointLat] = useState("");
  const [pointLon, setPointLon] = useState("");

  const [selectedCategory, setSelectedCategory] =
    useState<MarkerCategory>("Offshore structure");

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

    markers.forEach((markerData) => {
      const colour = getMarkerColour(markerData.category);

      const markerElement = document.createElement("div");
      markerElement.className = "metocean-marker";
      markerElement.style.backgroundColor = colour;

      const marker = new maplibregl.Marker({
        element: markerElement,
      })
        .setLngLat([markerData.lon, markerData.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <strong>${markerData.name}</strong><br/>
            Category: ${markerData.category}<br/>
            Lat: ${markerData.lat.toFixed(5)}<br/>
            Lon: ${markerData.lon.toFixed(5)}
          `)
        )
        .addTo(mapRef.current!);

      markerObjectsRef.current.push(marker);
    });
  }, [markers]);

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

  function clearMarkers() {
    setMarkers([]);
  }

  return (
    <>
      <div id="map" />

      <div className="control-panel">
        <h2>Metocean Map Maker</h2>

        <h3>Layers</h3>

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

        <label>
          <input type="checkbox" defaultChecked />
          Structures
        </label>

        <label>
          <input type="checkbox" defaultChecked />
          Measurements
        </label>

        <label>
          <input type="checkbox" defaultChecked />
          Models
        </label>

        <h3>Point details</h3>

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
          Category
          <select
            className="text-input"
            value={selectedCategory}
            onChange={(event) =>
              setSelectedCategory(event.target.value as MarkerCategory)
            }
          >
            <option>Offshore structure</option>
            <option>Measured wind</option>
            <option>Measured wave</option>
            <option>Measured current</option>
            <option>Measured combination</option>
            <option>Model wind</option>
            <option>Model wave</option>
            <option>Model current</option>
            <option>Model combination</option>
          </select>
        </label>

        <h3>Add by map click</h3>

        <button
          className={addingPoint ? "primary-button active-button" : "primary-button"}
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

        <h3>Current session</h3>

        <p className="marker-count">
          Markers: {markers.length}
        </p>

        <button className="secondary-button" onClick={clearMarkers}>
          Clear markers
        </button>
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