import { useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

function App() {

  useEffect(() => {

    const map = new maplibregl.Map({
      container: "map",
      style: "https://demotiles.maplibre.org/style.json",
      center: [0, 0],
      zoom: 2
    });

    // add zoom controls
    map.addControl(
      new maplibregl.NavigationControl(),
      "top-right"
    );

    // add scale control
    map.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 150,
        unit: "metric"
      })
    );

    return () => map.remove();

  }, []);

  return (
    <div
      id="map"
      style={{
        width: "100vw",
        height: "100vh"
      }}
    />
  );
}

export default App;