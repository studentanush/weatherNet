// src/pages/ResultPage.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Assuming your backend sends this data via location.state
  const { location: loc, predictionData } = location.state || {};
const lat = loc?.lat;
const lon = loc?.lon;
  const goToImpact = () => {
    navigate("/predict/impact", {
      state: { lat, lon, predictionData },
    });
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Prediction Results</h1>

      {(!lat || !lon || !predictionData) && (
        <p style={{ color: "red" }}>
          Missing prediction data. Please go back and run prediction again.
        </p>
      )}

      {lat && lon && predictionData && (
        <>
          <div
            style={{
              background: "#f9f9f9",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
            }}
          >
            <h2>Model Output</h2>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(predictionData, null, 2)}
            </pre>
          </div>

          <button
            onClick={goToImpact}
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            View Environmental Impact
          </button>
        </>
      )}
    </div>
  );
}
