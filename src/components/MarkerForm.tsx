import type { Dispatch, SetStateAction } from "react";
import type { MarkerCategory } from "../types/MarkerCategory";

type Props = {
  mode?: "add" | "edit";
  markerCategories: MarkerCategory[];
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  label: string;
  setLabel: Dispatch<SetStateAction<string>>;
  category: MarkerCategory;
  setCategory: Dispatch<SetStateAction<MarkerCategory>>;
  lat?: string;
  setLat?: Dispatch<SetStateAction<string>>;
  lon?: string;
  setLon?: Dispatch<SetStateAction<string>>;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  showCoordinates?: boolean;
};

function MarkerForm({
  mode = "add",
  markerCategories,
  name,
  setName,
  label,
  setLabel,
  category,
  setCategory,
  lat,
  setLat,
  lon,
  setLon,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
  showCoordinates = false,
}: Props) {
  const submitButtonLabel =
    submitLabel ?? (mode === "edit" ? "Save changes" : "Add coordinate point");

  return (
    <>
      <label>
        Name
        <input
          className="text-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Bonga buoy"
        />
      </label>

      <label>
        Map label
        <input
          className="text-input"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </label>

      <label>
        Category
        <select
          className="text-input"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as MarkerCategory)
          }
        >
          {markerCategories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      {showCoordinates && setLat && setLon && lat !== undefined && lon !== undefined && (
        <>
          <label>
            Latitude
            <input
              className="text-input"
              value={lat}
              onChange={(event) => setLat(event.target.value)}
              placeholder="e.g. 4.321"
            />
          </label>

          <label>
            Longitude
            <input
              className="text-input"
              value={lon}
              onChange={(event) => setLon(event.target.value)}
              placeholder="e.g. 6.210"
            />
          </label>
        </>
      )}

      {onSubmit && (
        <button className="primary-button" onClick={onSubmit}>
          {submitButtonLabel}
        </button>
      )}

      {onCancel && (
        <button className="secondary-button" onClick={onCancel}>
          {cancelLabel ?? "Cancel"}
        </button>
      )}
    </>
  );
}

export default MarkerForm;