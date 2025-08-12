// src/components/ImpactSection.jsx
import React, { useEffect, useState, useContext } from "react";
import { ThemeContext } from "../Content/ThemeContent";

/*
  NOTE: storing API keys client-side is not secure. For demo / quick testing this works,
  but for production move the key server-side.
*/
const GEMINI_API_KEY = "AIzaSyBPFCiU_NC1Wr5YAVW_-sAIjR-tvxkQePc";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Simple count-up hook (lightweight)
function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(target ?? 0);
  useEffect(() => {
    if (target == null) return;
    const start = Number(value) || 0;
    const end = Number(target);
    const diff = end - start;
    if (diff === 0) {
      setValue(end);
      return;
    }
    const steps = Math.max(8, Math.round(duration / 16));
    let currentStep = 0;
    const id = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      setValue(Math.round((start + diff * ease) * 10) / 10);
      if (currentStep >= steps) {
        clearInterval(id);
        setValue(end);
      }
    }, duration / steps);
    return () => clearInterval(id);
  }, [target]); // eslint-disable-line
  return value;
}

/*
  Props:
    lat, lon - numbers
    predictionData - object that may contain predicted_next_hour_wm2 or prediction_wm2 etc.
    area - panel area in m^2 (number)
    efficiency - panel efficiency in percent (number)
    predictedEnergy - optional; kWh predicted for the next hour (preferred)
    avg_7 - average irradiance across last 7 hours (W/m²)
*/
export default function ImpactPage({
  lat,
  lon,
  predictionData,
  area = 10,
  efficiency = 18,
  predictedEnergy = null,
  avg_7 = null
}) {
  const { theme } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [impact, setImpact] = useState(null);
  const [error, setError] = useState("");

  // battery capacity for EV (user asked for 2 kWh)
  const EV_BATTERY_KWH = 2.0;

  const computeEnergyFromIrradiance = (irr_wm2, area_m2, eff_percent) => {
    if (!isFinite(irr_wm2) || area_m2 <= 0 || eff_percent <= 0) return null;
    const eff = eff_percent / 100.0;
    // energy in kWh for one hour
    const kwh = (irr_wm2 * area_m2 * eff) / 1000.0;
    return Number(kwh.toFixed(4));
  };

  const extractIrradiance = (pd) => {
    if (!pd) return NaN;
    const v =
      pd.predicted_next_hour_wm2 ??
      pd.prediction ??
      pd.prediction_wm2 ??
      pd.predicted ??
      pd.predicted_wm2 ??
      NaN;
    return Number(v);
  };

  // Build the strict JSON prompt — includes area/efficiency/predictedEnergy if available
  const buildPrompt = ({ predictionData, latVal, lonVal, areaVal, effVal, predictedEnergyVal, avg7 }) => {
    const energyNote = predictedEnergyVal != null
      ? `Using provided personalized energy (kWh): ${predictedEnergyVal}`
      : `No personalized energy provided; convert irradiance (W/m²) to kWh using area and efficiency.`;

    return `
You are an assistant that MUST output EXACTLY one JSON object and nothing else.

Inputs:
- prediction (hourly ML): ${JSON.stringify(predictionData)}
- location: latitude ${latVal}, longitude ${lonVal}
- user panel area (m²): ${areaVal}
- user panel efficiency (%): ${effVal}
- user area 7-hour average irradiance (W/m²): ${avg7}
- note: ${energyNote}

Produce a JSON object with these exact keys:
{
  "co2SavedKg": number,                    // kg CO2 avoided (1 decimal)
  "lightBulbsPowered": integer,            // equivalent 60W bulbs powered for one day
  "householdAppliancesPowered": integer,   // # of 3.5 kWh appliance-days
  "confidence": number,                    // 0.0-1.0 (1 decimal)
  "description": string,                   // short friendly message <= 40 chars
  "suggestion": string,                    // Give a clear, friendly, and slightly longer recommendation (20–40 words) for how the user can improve solar performance or utilize energy better based on the predicted energy and recent solar output data. Avoid generic text — make it location & data relevant.
  "calculation_explanation": string        // one-sentence explanation
}

Rules:
- Return JSON ONLY. No extra text.
- Convert irradiance -> kWh for user area & efficiency if predictedEnergy not provided:
    energy_kWh = (irradiance_Wm2 * area_m2 * efficiency_decimal) / 1000  (per 1 hour)
- Use 0.7 kg CO2 per 1 kWh for CO2 conversion.
- 60W bulb for 24h uses 1.44 kWh/day.
- Typical household appliance-day ~ 3.5 kWh/day.
- Round co2SavedKg to 1 decimal, confidence to 1 decimal, integers for counts.
- Provide a short motivational description (<=40 chars).

Example (exact formatting):
{
  "co2SavedKg": 12.3,
  "lightBulbsPowered": 8,
  "householdAppliancesPowered": 3,
  "confidence": 0.8,
  "description": "You powered a cleaner tomorrow",
  "suggestion": "Based on the recent 7-hour solar output, adding 2 m² more to your panel area could let you power an extra appliance daily or charge a small EV battery without tapping into the grid."
  "calculation_explanation": "Converted predicted energy to CO2 using 0.7 kgCO2/kWh and appliance/bulb energy assumptions."
}
`;
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchImpact() {
      setLoading(true);
      setError("");
      setImpact(null);

      // compute a fallback predictedEnergy (kWh for 1 hour) if none provided
      let predEnergy = predictedEnergy;
      if (predEnergy == null) {
        const irr = extractIrradiance(predictionData);
        if (isFinite(irr)) {
          predEnergy = computeEnergyFromIrradiance(irr, area, efficiency);
        } else {
          predEnergy = null;
        }
      }

      // compute average energy per hour from avg_7 if provided
      const avgEnergyPerHourFrom7 = (avg_7 != null && isFinite(avg_7))
        ? computeEnergyFromIrradiance(avg_7, area, efficiency)
        : null;

      // If no API key, show sample and exit
      if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith("<PASTE")) {
        const fallbackEnergy = predEnergy ?? avgEnergyPerHourFrom7 ?? 0;
        setImpact({
          co2SavedKg: fallbackEnergy ? Number((fallbackEnergy * 0.7).toFixed(1)) : 18.5,
          lightBulbsPowered: fallbackEnergy ? Math.max(0, Math.round(fallbackEnergy / 1.44)) : 75,
          householdAppliancesPowered: fallbackEnergy ? Math.max(0, Math.round(fallbackEnergy / 3.5)) : 3,
          confidence: 0.8,
          description: "Your panels help the planet",
          suggestion: "Consider increasing panel area or orientation for more output.",
          calculation_explanation: fallbackEnergy
            ? `Used personalized energy ${fallbackEnergy} kWh and 0.7 kgCO2/kWh conversion.`
            : "Fallback sample values used."
        });
        setLoading(false);
        setError("No Gemini key provided — showing sample impact.");
        return;
      }

      const prompt = buildPrompt({
        predictionData,
        latVal: lat ?? "unknown",
        lonVal: lon ?? "unknown",
        areaVal: area,
        effVal: efficiency,
        predictedEnergyVal: predEnergy,
        avg7: avg_7 ?? "unknown"
      });

      try {
        const res = await fetch(GEMINI_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Gemini API ${res.status}: ${txt.slice(0, 300)}`);
        }

        const body = await res.json();
        const text = body?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        // Try strict JSON parse
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch (err) {
          // fallback: try to extract JSON substring
          const m = text.match(/\{[\s\S]*\}/m);
          if (m) {
            try { parsed = JSON.parse(m[0]); } catch (e) { parsed = null; }
          }
        }

        // Fallback regex extraction if needed
        if (!parsed) {
          const co2 = (text.match(/([\d,.]+)\s*kg/i) || [])[1];
          const bulbs = (text.match(/([\d,.]+)\s*bulbs?/i) || [])[1];
          const apps = (text.match(/([\d,.]+)\s*appliances?/i) || [])[1];
          const conf = (text.match(/confidence[:\s]*([\d.]+)/i) || [])[1];
          const suggestion = (text.match(/suggestion[:\s]*["']?([^"\n]{5,120})["']?/i) || [])[1];
          parsed = {
            co2SavedKg: co2 ? parseFloat(co2.replace(",", "")) : (predEnergy ? Number((predEnergy * 0.7).toFixed(1)) : 18.5),
            lightBulbsPowered: bulbs ? Math.round(parseFloat(bulbs)) : (predEnergy ? Math.round(predEnergy / 1.44) : 75),
            householdAppliancesPowered: apps ? Math.round(parseFloat(apps)) : (predEnergy ? Math.round(predEnergy / 3.5) : 3),
            confidence: conf ? Math.round(parseFloat(conf) * 10) / 10 : 0.75,
            description: "Clean energy (you win!)",
            suggestion: suggestion || "Try adding 1–2 m² of panels for extra output.",
            calculation_explanation: predEnergy ? `Used personalized ${predEnergy} kWh with standard conversions.` : "Fallback estimate."
          };
        }

        if (!cancelled) setImpact(parsed);
      } catch (err) {
        console.error("Impact fetch error:", err);
        if (!cancelled) {
          // fallback sample
          const fallbackPredEnergy = predEnergy ?? avgEnergyPerHourFrom7 ?? 0;
          setImpact({
            co2SavedKg: fallbackPredEnergy ? Number((fallbackPredEnergy * 0.7).toFixed(1)) : 18.5,
            lightBulbsPowered: fallbackPredEnergy ? Math.max(0, Math.round(fallbackPredEnergy / 1.44)) : 75,
            householdAppliancesPowered: fallbackPredEnergy ? Math.max(0, Math.round(fallbackPredEnergy / 3.5)) : 3,
            confidence: 0.72,
            description: "Estimated (offline fallback)",
            suggestion: "Check panel tilt and shading for improvements.",
            calculation_explanation: "Fallback used due to API error."
          });
          setError("Failed to fetch live impact — showing fallback estimates.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchImpact();
    return () => { cancelled = true; };
  }, [lat, lon, predictionData, area, efficiency, predictedEnergy, avg_7]);

  // counts
  const co2Count = useCountUp(impact?.co2SavedKg ?? 0);
  const bulbsCount = useCountUp(impact?.lightBulbsPowered ?? 0);
  const appsCount = useCountUp(impact?.householdAppliancesPowered ?? 0);

  // compute EV charge time using avg_7 (preferred) then predictedEnergy
  const effectiveHourlyKwh = (() => {
    // 1) If predictedEnergy (kWh per hour) provided — prefer it
    if (predictedEnergy != null && isFinite(predictedEnergy) && predictedEnergy > 0) return predictedEnergy;
    // 2) If avg_7 available -> compute energy per hour from avg_7
    if (avg_7 != null && isFinite(avg_7)) {
      const v = computeEnergyFromIrradiance(avg_7, area, efficiency); // kWh per hour
      if (v != null && v > 0) return v;
    }
    // 3) fallback: try extracting from predictionData
    const irr = extractIrradiance(predictionData);
    if (isFinite(irr)) {
      const v = computeEnergyFromIrradiance(irr, area, efficiency);
      if (v != null && v > 0) return v;
    }
    return null;
  })();

  const evChargeHours = effectiveHourlyKwh && effectiveHourlyKwh > 0 ? EV_BATTERY_KWH / effectiveHourlyKwh : null;

  const formatHours = (hours) => {
    if (hours == null || !isFinite(hours)) return "Insufficient power";
    const totalMinutes = Math.ceil(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m} min`;
    return `${h}h ${m}m`;
  };

  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold mb-3">🌍 Environmental Impact</h2>

      {error && <div className="mb-2 text-sm text-red-600">{error}</div>}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className={`flex-1 p-4 rounded-lg shadow transition-transform hover:scale-[1.02] ${theme === "light" ? "bg-white" : "bg-slate-800 text-slate-100"}`}>
          <div className="text-sm text-gray-500">CO₂ saved</div>
          <div className="text-3xl font-bold mt-2">
            {loading ? <span className="inline-block animate-pulse">—</span> : <>{co2Count} <span className="text-base font-normal">kg</span></>}
          </div>
          <div className="text-xs text-gray-400 mt-2">{impact?.calculation_explanation}</div>
        </div>

        <div className={`flex-1 p-4 rounded-lg shadow transition-transform hover:scale-[1.02] ${theme === "light" ? "bg-white" : "bg-slate-800 text-slate-100"}`}>
          <div className="text-sm text-gray-500">Equivalent light bulbs/day</div>
          <div className="text-3xl font-bold mt-2">
            {loading ? <span className="inline-block animate-pulse">—</span> : <>{Math.round(bulbsCount)} <span className="text-base font-normal">bulbs</span></>}
          </div>
          <div className="text-xs text-gray-400 mt-2">Assumes 60W bulbs · 24h</div>
        </div>

        <div className={`flex-1 p-4 rounded-lg shadow transition-transform hover:scale-[1.02] ${theme === "light" ? "bg-white" : "bg-slate-800 text-slate-100"}`}>
          <div className="text-sm text-gray-500">Household appliance-days</div>
          <div className="text-3xl font-bold mt-2">
            {loading ? <span className="inline-block animate-pulse">—</span> : <>{Math.round(appsCount)} <span className="text-base font-normal">/day</span></>}
          </div>
          <div className="text-xs text-gray-400 mt-2">Typical appliance ≈ 3.5 kWh/day</div>
        </div>
      </div>

      {/* EV charging card */}
      <div className={`mt-4 p-4 rounded-lg shadow ${theme === "light" ? "bg-white" : "bg-slate-800 text-slate-100"}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">EV charging estimate</div>
            <div className="text-lg font-semibold mt-1">Battery: {EV_BATTERY_KWH} kWh</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Est. time to full</div>
            <div className="text-2xl font-bold">{formatHours(evChargeHours)}</div>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          Based on {effectiveHourlyKwh ? `${effectiveHourlyKwh.toFixed(3)} kWh/hr` : "no usable hourly energy data"} (area: {area} m² · eff: {efficiency}%).
        </div>
      </div>

      <div className={`mt-4 p-3 rounded-md ${theme === "light" ? "bg-yellow-50" : "bg-slate-900"} text-sm`}>
        <div className="font-semibold">{loading ? "Calculating impact…" : impact?.description}</div>
        {impact?.suggestion && <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{impact.suggestion}</div>}
        <div className="text-xs text-gray-500 mt-1">{impact?.confidence != null ? `Confidence: ${(impact.confidence * 100).toFixed(0)}%` : ""}</div>
        <div className="text-xs text-gray-400 mt-1">Panel: {area} m² · Efficiency: {efficiency}% · Pred energy: {predictedEnergy ?? "calculated from model"} kWh</div>
        {avg_7 != null && <div className="text-xs text-gray-400 mt-1">7-hour average irradiance: {avg_7} W/m²</div>}
      </div>
    </section>
  );
}
