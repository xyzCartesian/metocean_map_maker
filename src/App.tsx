import "./App.css";
import { useEffect, useRef, useState } from "react";
import maplibregl, { type FilterSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { importMarkersFromCsv } from "./utils/importMarkersFromCsv";
import {
  ChevronDown,
  ChevronRight,
} from "lucide-react"

import type { MarkerCategory } from "./types/MarkerCategory";
import type { MarkerData } from "./types/MarkerData";
import type { MarkerStyle } from "./types/MarkerStyle";
import type {
  BathymetryContourConfig,
} from "./types/BathymetryContourConfig";

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
import ContourControlsPanel from "./components/ContourControlsPanel";

const BATHYMETRY_COLOUR_SOURCE_ID = "bathymetry-colour-source";
const BATHYMETRY_COLOUR_LAYER_ID = "bathymetry-colour-layer";
const BATHYMETRY_CONTOUR_SOURCE_ID = "bathymetry-contour-source";
const BATHYMETRY_CONTOUR_LAYER_ID = "bathymetry-contour-layer";
const BATHYMETRY_CONTOUR_LABEL_LAYER_ID = "bathymetry-contour-label-layer";

function getActiveContourInterval(config: BathymetryContourConfig): number | null {
  if (config.intervalMode === "all") return null;
  if (config.intervalMode === "10m") return 10;
  if (config.intervalMode === "100m") return 100;
  return Math.max(1, Math.round(config.customInterval));
}

function getContourFilter(
  config: BathymetryContourConfig
): FilterSpecification | undefined {
  const interval = getActiveContourInterval(config);

  if (!interval) {
    return undefined;
  }

  return [
    "==",
    ["%", ["abs", ["round", ["get", "depth"]]], interval],
    0,
  ] as unknown as FilterSpecification;
}

function getActiveLabelInterval(config: BathymetryContourConfig): number | null {
  if (config.labelIntervalMode === "all") return null;
  if (config.labelIntervalMode === "10m") return 10;
  if (config.labelIntervalMode === "100m") return 100;
  return Math.max(1, Math.round(config.customLabelInterval));
}

function getLabelFilter(
  config: BathymetryContourConfig
): FilterSpecification | undefined {
  const interval = getActiveLabelInterval(config);

  if (!interval) {
    return undefined;
  }

  return [
    "==",
    ["%", ["abs", ["round", ["get", "depth"]]], interval],
    0,
  ] as unknown as FilterSpecification;
}

function App() {
  const [mapReady, setMapReady] = useState(false);
  const currentBasemapRef = useRef<"openstreetmap" | "topographic" | "satellite" | null>(null);

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
    contourProperties: false,
  });

  const [basemap, setBasemap] = useState<"openstreetmap" | "topographic" | "satellite">("openstreetmap");
  const [bathymetryMode, setBathymetryMode] = useState<"none" | "colourmap" | "contours" | "colourmap+contours">("none");
  const [topographyMode, setTopographyMode] = useState<"none" | "visible">("none");

  const [contourConfig, setContourConfig] = useState<BathymetryContourConfig>({
    intervalMode: "all",
    customInterval: 50,
    lineColor: "#08306b",
    labelColor: "#d5d8dd",
    lineWidth: 1,
    labelsEnabled: true,
    labelFontSize: 11,
    labelSpacingPx: 100,
    customLabelInterval: 100,
    labelIntervalMode: "all",
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
      style: {
        version: 8,
        sources: {},
        layers: [],
      },
      center: [0, 0],
      zoom: 2,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 150, unit: "metric" }),
      "bottom-right"
    );

    const onLoad = () => setMapReady(true);
    map.on("load", onLoad);

    map.on("click", (event) => {
      if (!addingPointRef.current) return;

      const newMarker: MarkerData = {
        id: Date.now(),
        name: pointNameRef.current || "New point",
        label: getMarkerLabel(pointNameRef.current, pointLabelRef.current),
        lon: event.lngLat.lng,
        lat: event.lngLat.lat,
        category: selectedCategoryRef.current,
      };

      setMarkers((previousMarkers) => [...previousMarkers, newMarker]);
      setAddingPoint(false);
      setPointLabel("");
    });

    return () => {
      map.off("load", onLoad);
      map.remove();
      mapRef.current = null;
      setMapReady(false);
      currentBasemapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    if (mapRef.current.getLayer("basemap-layer")) {
      mapRef.current.removeLayer("basemap-layer");
    }

    if (mapRef.current.getSource("basemap-source")) {
      mapRef.current.removeSource("basemap-source");
    }

    const tiles =
      basemap === "satellite"
        ? [
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ]
        : basemap === "topographic"
        ? [
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
          ]
        : [
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
          ];

    mapRef.current.addSource("basemap-source", {
      type: "raster",
      tiles,
      tileSize: 256,
      attribution: "Tiles © Esri",
    });

    mapRef.current.addLayer({
      id: "basemap-layer",
      type: "raster",
      source: "basemap-source",
      layout: { visibility: "visible" },
    });
  }, [basemap, mapReady]);

  useEffect(() => {
    markerObjectsRef.current.forEach((marker) => marker.remove());
    markerObjectsRef.current = [];

    const map = mapRef.current;

    if (!map) return;

    const visibleMarkers = markers.filter(
      (markerData) => visibleCategories[markerData.category]
    );

    visibleMarkers.forEach((markerData) => {
      const markerStyle = markerStyles[markerData.category];

      const markerElement = document.createElement("div");
      markerElement.className = "metocean-marker-wrapper";

      const markerDot = document.createElement("div");
      markerDot.className = "metocean-marker-dot";
      Object.assign(markerDot.style, getMarkerDotStyles(markerStyle));

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
        .addTo(map);

      markerObjectsRef.current.push(marker);
    });
  }, [markers, visibleCategories, showMarkerLabels, labelFontSize, markerStyles]);

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    removeBathymetryLayers();

    if (bathymetryMode === "none") {
      return;
    }

    if (bathymetryMode === "colourmap" || bathymetryMode === "colourmap+contours") {
      addBathymetryColourmap();
    }

    if (bathymetryMode === "contours" || bathymetryMode === "colourmap+contours") {
      mapRef.current.addSource(BATHYMETRY_CONTOUR_SOURCE_ID, {
        type: "vector",
        tiles: ["http://localhost:8080/data/gebco-contours/{z}/{x}/{y}.pbf"],
        attribution: "Contours © GEBCO",
      });

      const contourFilter = getContourFilter(contourConfig);
      const labelFilter = getLabelFilter(contourConfig);

      mapRef.current.addLayer({
        id: BATHYMETRY_CONTOUR_LAYER_ID,
        type: "line",
        source: BATHYMETRY_CONTOUR_SOURCE_ID,
        "source-layer": "contours",
        ...(contourFilter ? { filter: contourFilter } : {}),
        paint: {
          "line-color": contourConfig.lineColor,
          "line-width": contourConfig.lineWidth,
          "line-opacity": 0.8,
        },
      });

      if (contourConfig.labelsEnabled) {
        mapRef.current.addLayer({
          id: BATHYMETRY_CONTOUR_LABEL_LAYER_ID,
          type: "symbol",
          source: BATHYMETRY_CONTOUR_SOURCE_ID,
          "source-layer": "contours",
          ...(labelFilter ? { filter: labelFilter } : {}),
          layout: {
            "symbol-placement": "line",
            "symbol-spacing": contourConfig.labelSpacingPx,
            "text-field": ["concat", ["to-string", ["get", "depth"]], " m"],
            "text-size": contourConfig.labelFontSize,
            "text-allow-overlap": false,
            "text-ignore-placement": false,
          },
          paint: {
            "text-color": contourConfig.labelColor,
          },
        });
      }
    }
  }, [bathymetryMode, contourConfig, mapReady]);

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

  function getMarkerDotStyles(markerStyle: MarkerStyle) {
    const size = markerStyle.size

    const baseStyles = {
      backgroundColor: markerStyle.colour,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
    };

    switch (markerStyle.symbol) {
      case "square":
        return { ...baseStyles, borderRadius: "0%" };

        case "triangle":
          return {
            ...baseStyles,
            backgroundColour: "transparent",
            width: 0,
            height: 0,
            borderLeft: `${size / 2}px solid transparent`,
            borderRight: `${size / 2}px solid transparent`,
            borderBottom: `${size}px solid ${markerStyle.colour}`,
            borderRadius: "0%",
          }

        case "diamond":
          return {
            ...baseStyles,
            borderRadius: "0%",
            transform: "rotate(45deg)",
          };

        case "star":
          return {
            ...baseStyles,
            backgroundColor: markerStyle.colour,
            clipPath:
              "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
          };

        case "cross":
          return {
            ...baseStyles,
            borderRadius: "0%",
            transform: "rotate(45deg)",
          };

        default:
          return baseStyles;
    }
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
  
function removeBathymetryLayers() {
  if (!mapRef.current) return;

  if (mapRef.current.getLayer(BATHYMETRY_CONTOUR_LABEL_LAYER_ID)) {
    mapRef.current.removeLayer(BATHYMETRY_CONTOUR_LABEL_LAYER_ID);
  }

  if (mapRef.current.getLayer(BATHYMETRY_CONTOUR_LAYER_ID)) {
    mapRef.current.removeLayer(BATHYMETRY_CONTOUR_LAYER_ID);
  }

  if (mapRef.current.getLayer(BATHYMETRY_COLOUR_LAYER_ID)) {
    mapRef.current.removeLayer(BATHYMETRY_COLOUR_LAYER_ID);
  }

  if (mapRef.current.getSource(BATHYMETRY_CONTOUR_SOURCE_ID)) {
    mapRef.current.removeSource(BATHYMETRY_CONTOUR_SOURCE_ID);
  }

  if (mapRef.current.getSource(BATHYMETRY_COLOUR_SOURCE_ID)) {
    mapRef.current.removeSource(BATHYMETRY_COLOUR_SOURCE_ID);
  }
}

function addBathymetryColourmap() {
  if (!mapRef.current) return;

  mapRef.current.addSource(BATHYMETRY_COLOUR_SOURCE_ID, {
    type: "raster",
    tiles: ["/tiles/gebco-colour/{z}/{x}/{y}.png"],
    tileSize: 256,
    minzoom: 0,
    maxzoom: 10,
    bounds: [15, -45, 30, -30],
    attribution: "Bathymetry © GEBCO",
  });

  mapRef.current.addLayer({
    id: BATHYMETRY_COLOUR_LAYER_ID,
    type: "raster",
    source: BATHYMETRY_COLOUR_SOURCE_ID,
    paint: {
      "raster-opacity": 0.6,
    },
  });
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

        <label>
          Basemap
          <select
            className="text-input"
            value={basemap}
            onChange={(event) =>
              setBasemap(event.target.value as "openstreetmap" | "topographic" | "satellite")
            }
          >
            <option value="openstreetmap">OpenStreetMap</option>
            <option value="topographic">Topographic</option>
            <option value="satellite">Satellite</option>
          </select>
        </label>

        <label>
        Bathymetry
          <select
            className="text-input"
            value={bathymetryMode}
            onChange={(event) =>
              setBathymetryMode(
                event.target.value as
                  | "none"
                  | "colourmap"
                  | "contours"
                  | "colourmap+contours"
              )
            }
          >
            <option value="none">None</option>
            <option value="colourmap">Colourmap</option>
            <option value="contours">Contours</option>
            <option value="colourmap+contours">Colourmap + contours</option>
          </select>
      </label>

        <label>
          Topography
          <select
            className="text-input"
            value={topographyMode}
            onChange={(event) =>
              setTopographyMode(event.target.value as "none" | "visible")
            }
          >
            <option value="none">None</option>
            <option value="visible">Visible</option>
          </select>
        </label>

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
          {panelSections["markerLabels"]
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
          {panelSections["markerStyles"]
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
        <h3>Contour controls</h3> 
        <div
          className="section-header"
          onClick={() => toggleSection("contourProperties") }
        >
          {panelSections["contourProperties"]
            ? <ChevronDown size={16} />
            : <ChevronRight size={16} />
          }
          Contour properties
        </div> 

        {panelSections["contourProperties"] && (
          <ContourControlsPanel
            contourConfig={contourConfig}
            setContourConfig={setContourConfig}
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