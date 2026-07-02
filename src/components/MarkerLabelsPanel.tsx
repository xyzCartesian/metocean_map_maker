type Props = {
  showMarkerLabels: boolean;
  setShowMarkerLabels: React.Dispatch<React.SetStateAction<boolean>>;
  labelFontSize: number;
  setLabelFontSize: React.Dispatch<React.SetStateAction<number>>;
};

function MarkerLabelsPanel({
    showMarkerLabels,
    setShowMarkerLabels,
    labelFontSize,
    setLabelFontSize,
}: Props) {
    return (
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
    );
}

export default MarkerLabelsPanel