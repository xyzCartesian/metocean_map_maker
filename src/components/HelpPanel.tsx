import { useState } from "react";

function HelpPanel() {
    
    const [helpPanelOpen, setHelpPanelOpen] =
        useState(false);

    return (
        <>
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



    )
}

export default HelpPanel


