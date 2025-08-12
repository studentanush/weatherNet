import React, { useEffect, useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ThemeContext } from '../Content/ThemeContent';

function ImpactCard({ title, value, unit, icon, description, theme }) {
  return (
    <div
      style={{
        backgroundColor: theme === "light" ? "white" : "#2c2c2c",
        borderRadius: "12px",
        boxShadow:
          theme === "light"
            ? "0 4px 10px rgba(0,0,0,0.1)"
            : "0 4px 15px rgba(255,255,255,0.1)",
        padding: "1.5rem",
        flex: "1",
        margin: "0.5rem",
        minWidth: "200px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        color: theme === "light" ? "#222" : "#eee",
        transition: "all 0.3s ease",
      }}
    >
      <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{icon}</div>
      <h3 style={{ margin: "0.3rem 0" }}>{title}</h3>
      <p
        style={{
          fontSize: "2rem",
          fontWeight: "600",
          margin: "0.2rem 0",
        }}
      >
        {value} {unit}
      </p>
      {description && (
        <p style={{ fontSize: "0.9rem", color: theme === "light" ? "#555" : "#bbb" }}>
          {description}
        </p>
      )}
    </div>
  );
}

export default function ImpactPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useContext(ThemeContext);

  // Fallback data if no props provided via route state
  const sampleLat = 37.7749;
  const sampleLon = -122.4194;
  const samplePrediction = {
    predicted_energy_kWh: 25.6,
    confidence: 0.92,
    date: "2025-08-11",
  };

  const lat = location.state?.lat || sampleLat;
  const lon = location.state?.lon || sampleLon;
  const predictionData = location.state?.predictionData || samplePrediction;

  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchImpact() {
      setLoading(true);
      setErrorMsg("");
      setImpactData(null);

      const sampleImpactData = {
        co2SavedKg: 18.5,
        lightBulbsPowered: 75,
        householdAppliancesPowered: 3,
        description: `This prediction is based on solar energy production at the given location:\nLatitude ${lat}, Longitude ${lon}.`,
      };

      try {
        // Prepare prompt for the Gemini API
        const prompt = `
Given the solar prediction: ${JSON.stringify(predictionData)},
location: latitude ${lat}, longitude ${lon},
estimate the potential environmental impact in terms of:
- CO₂ saved in kg
- Equivalent number of light bulbs powered for a day (60W bulbs)
- Number of common household appliances powered for a day
Provide numbers only, and a short explanation.
`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateText?key=AIzaSyAhh3AV0HWEB_RjvhfGIUZXsVBfdq5gGHo`, // <-- Replace here
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: { text: prompt },
            }),
          }
        );

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();

        // Gemini response text path might vary, adjust if needed
        const llmText = data?.candidates?.[0]?.message?.content;

        if (!llmText || llmText.trim() === "") {
          setImpactData(sampleImpactData);
          setErrorMsg("No data returned from API, showing sample values.");
        } else {
          // Basic parsing of response text (adjust to your API output format)
          const co2Match = llmText.match(/CO₂ saved[:\s]*([\d.]+)/i);
          const bulbsMatch = llmText.match(/light bulbs powered[:\s]*([\d.]+)/i);
          const appliancesMatch = llmText.match(/household appliances powered[:\s]*([\d.]+)/i);

          setImpactData({
            co2SavedKg: co2Match ? parseFloat(co2Match[1]) : sampleImpactData.co2SavedKg,
            lightBulbsPowered: bulbsMatch ? parseInt(bulbsMatch[1]) : sampleImpactData.lightBulbsPowered,
            householdAppliancesPowered: appliancesMatch
              ? parseInt(appliancesMatch[1])
              : sampleImpactData.householdAppliancesPowered,
            description: llmText,
          });
        }
      } catch (error) {
        if (!isMounted) return;

        setErrorMsg(`Failed to fetch impact data: ${error.message}. Showing sample values.`);
        setImpactData(sampleImpactData);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchImpact();

    return () => {
      isMounted = false;
    };
  }, [lat, lon, predictionData]);

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "900px",
        margin: "auto",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: theme === "light" ? "#fdfdfd" : "#121212",
        color: theme === "light" ? "#222" : "#ddd",
        minHeight: "100vh",
        transition: "all 0.3s ease",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1>Environmental Impact</h1>
        <button
          onClick={toggleTheme}
          style={{
            cursor: "pointer",
            padding: "0.5rem 1rem",
            borderRadius: "5px",
            border: "none",
            backgroundColor: theme === "light" ? "#333" : "#eee",
            color: theme === "light" ? "#eee" : "#333",
            transition: "all 0.3s ease",
            fontWeight: "600",
            userSelect: "none",
          }}
          aria-label="Toggle light/dark mode"
          title="Toggle light/dark mode"
        >
          {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
        </button>
      </header>

      {errorMsg && (
        <p
          style={{
            color: "red",
            whiteSpace: "pre-wrap",
            marginBottom: "1rem",
            textAlign: "center",
          }}
        >
          {errorMsg}
        </p>
      )}

      {loading && <p style={{ textAlign: "center" }}>Calculating environmental impact...</p>}

      {!loading && impactData && (
        <>
          <section
            style={{
              display: "flex",
              justifyContent: "space-around",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <ImpactCard
              title="CO₂ Saved"
              value={impactData.co2SavedKg}
              unit="kg"
              icon="🌿"
              description="Kilograms of CO₂ emissions avoided"
              theme={theme}
            />
            <ImpactCard
              title="Light Bulbs Powered"
              value={impactData.lightBulbsPowered}
              unit="bulbs/day"
              icon="💡"
              description="Equivalent 60W bulbs powered for one day"
              theme={theme}
            />
            <ImpactCard
              title="Household Appliances Powered"
              value={impactData.householdAppliancesPowered}
              unit="appliances/day"
              icon="🏠"
              description="Number of common appliances powered for one day"
              theme={theme}
            />
          </section>

          <section
            style={{
              marginTop: "2rem",
              padding: "1rem",
              backgroundColor: theme === "light" ? "#f9f9f9" : "#222",
              borderRadius: "10px",
              color: theme === "light" ? "#444" : "#ccc",
              fontSize: "0.95rem",
              lineHeight: "1.4",
              whiteSpace: "pre-wrap",
              transition: "all 0.3s ease",
            }}
          >
            {impactData.description}
          </section>
        </>
      )}

      <button
        style={{
          marginTop: "2rem",
          backgroundColor: "#2563eb",
          color: "white",
          padding: "0.75rem 1.5rem",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "1rem",
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
          transition: "background-color 0.3s ease",
        }}
        onClick={() => navigate(-1)}
      >
        Back
      </button>
    </div>
  );
}
