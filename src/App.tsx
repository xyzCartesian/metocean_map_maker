import "./App.css";
import { useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";


function App() {

  useEffect(() => {

    const map = new maplibregl.Map({
      container: "map",
      style: "https://demotiles.maplibre.org/style.json",
      center: [0, 0],
      zoom: 2,
    });

    map.addControl(
      new maplibregl.NavigationControl(),
      "top-right"
    );

    map.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 150,
        unit: "metric",
      }),
      "bottom-left"
    );

    return () => map.remove();

  }, []);

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
          <input type="checkbox" />
          Structures
        </label>

        <label>
          <input type="checkbox" />
          Measurements
        </label>

        <label>
          <input type="checkbox" />
          Models
        </label>
      </div>
    </>
  );
}

export default App;