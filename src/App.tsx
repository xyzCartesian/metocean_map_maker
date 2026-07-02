import "./App.css";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { importMarkersFromCsv } from "./utils/importMarkersFromCsv";
import {
  ChevronDown,
  ChevronRight,
} from "lucide-react"

import type { MarkerCategory } from "./types/MarkerCategory";
import type { MarkerData } from "./types/MarkerData";
import type { MarkerStyle } from "./types/MarkerStyle";

import { markerCategories } 
from "./data/markerCategories";

import { defaultMarkerStyles } 
from "./data/defaultMarkerStyles";

import HelpPanel from "./components/HelpPanel";

import MarkerStylesPanel from "./components/MarkerStylesPanel";

import MarkerLabelsPanel from "./components/MarkerLabelsPanel";

import MarkersByCategoryPanel from "./components/MarkersByCategoryPanel";
import MarkerVisibilityPanel from "./components/MarkerVisibilityPanel";

import MarkerForm from "./components/MarkerForm";

function App() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerObjectsRef = useRef<maplibregl.Marker[]>([]);

  const addingPointRef = useRef(false);
  const selectedCategoryRef = useRef<MarkerCategory>("Offshore structure");
  const pointNameRef = useRef("New point");
  const pointLabelRef = useRef("New point");

  const [addingPoint, setAddingPoint] = useState(false);
  const [markers, setMarkers] = useState<MarkerData[]>([]);

  const [pointName, setPointName] = useState("New point");
  const [pointLat, setPointLat] = useState("");
  const [pointLon, setPointLon] = useState("");

  const [pointLabel, setPointLabel] = useState("");

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
        label: getMarkerLabel(
          pointNameRef.current,
          pointLabelRef.current
        ),
        lon: event.lngLat.lng,
        lat: event.lngLat.lat,
        category: selectedCategoryRef.current,
      };

      setMarkers((previousMarkers) => [...previousMarkers, newMarker]);
      setAddingPoint(false);
      setPointLabel("");
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
      label: getMarkerLabel(pointName, pointLabel),
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
    setPointLabel("");
  }

  function getMarkerLabel(name: string, label: string) {
    return label.trim() ? label : name || "New point";
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
              label: getMarkerLabel(editName || "Unnamed point", editLabel),
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

  function handleCsvImport(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];
  if (!file) return;

  importMarkersFromCsv(file, (importedMarkers) => {
    setMarkers((previous) => [...previous, ...importedMarkers]);

    if (importedMarkers.length === 0) return;

    if (mapRef.current) {
      if (importedMarkers.length === 1) {
        mapRef.current.flyTo({
          center: [importedMarkers[0].lon, importedMarkers[0].lat],
          zoom: 8,
        });
      } else {
        const bounds = new maplibregl.LngLatBounds();

        importedMarkers.forEach((marker) => {
          bounds.extend([marker.lon, marker.lat]);
        });

        mapRef.current.fitBounds(bounds, { padding: 500 });
      }
      }
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
          <MarkerVisibilityPanel
            markerCategories={markerCategories}
            visibleCategories={visibleCategories}
            markerStyles={markerStyles}
            toggleCategory={toggleCategory}
          />
        )}

        <h3>Add point</h3>

        <MarkerForm
          mode="add"
          markerCategories={markerCategories}
          name={pointName}
          setName={setPointName}
          label={pointLabel}
          setLabel={setPointLabel}
          category={selectedCategory}
          setCategory={setSelectedCategory}
          lat={pointLat}
          setLat={setPointLat}
          lon={pointLon}
          setLon={setPointLon}
          showCoordinates
        />

        <div className="add-point-actions">
          <button className="primary-button" onClick={addPointFromCoordinates}>
            Add point from coordinates
          </button>

          <button
            className={
              addingPoint ? "primary-button active-button" : "primary-button"
            }
            onClick={() => setAddingPoint(true)}
          >
            Add point by clicking map
          </button>
        </div>

        {addingPoint && (
          <p className="instruction-text">
            Click a location on the map to place the marker.
          </p>
        )}

        {editingMarkerId !== null && (
         <MarkerForm
          mode="edit"
          markerCategories={markerCategories}
          name={editName}
          setName={setEditName}
          label={editLabel}
          setLabel={setEditLabel}
          category={editCategory}
          setCategory={setEditCategory}
          lat={editLat}
          setLat={setEditLat}
          lon={editLon}
          setLon={setEditLon}
          onSubmit={saveEditedMarker}
          onCancel={cancelEditingMarker}
          submitLabel="Save changes"
          cancelLabel="Cancel edit"
          showCoordinates
        />
        )}

        <h3>Import CSV</h3>
          
        <input
          type="file"
          accept=".csv"
          onChange={handleCsvImport}  
        />
               
               
       <h3>Point controls</h3>      
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
        <MarkersByCategoryPanel
          markers={markers}
          markerCategories={markerCategories}
          markerStyles={markerStyles}
          startEditingMarker={startEditingMarker}
          deleteMarker={deleteMarker}
          getMarkersForCategory={getMarkersForCategory}
        />
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
        <MarkerLabelsPanel
          showMarkerLabels={showMarkerLabels}
          setShowMarkerLabels={setShowMarkerLabels}
          labelFontSize={labelFontSize}
          setLabelFontSize={setLabelFontSize}
        />
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
        <MarkerStylesPanel
          markerCategories={markerCategories}
          markerStyles={markerStyles}
          setMarkerStyles={setMarkerStyles}
        />
        )}

        <h3>Clear points</h3>

        <button className="secondary-button" onClick={clearMarkers}>
          Clear all markers
        </button>
        </div>


      <HelpPanel />
    </>
  );
}

export default App;