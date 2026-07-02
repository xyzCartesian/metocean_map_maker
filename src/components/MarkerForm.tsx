type Props = {
  mode: "add" | "edit";
  markerCategories: MarkerCategory[];
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  lat: number;
  setLat: React.Dispatch<React.SetStateAction<number>>;
  lon: number;
  setLon: React.Dispatch<React.SetStateAction<number>>;
  label: string;
  setLabel: React.Dispatch<React.SetStateAction<string>>;
  category: MarkerCategory;
  setCategory: React.Dispatch<React.SetStateAction<MarkerCategory>>;
  onSubmit: () => void;
  onCancel?: () => void;
};