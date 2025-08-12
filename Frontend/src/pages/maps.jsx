// src/pages/IndiaGridMap.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import chroma from "chroma-js";



const API_PREDICT_ENDPOINT = "http://127.0.0.1:8000/predict"; // POST -> { coords: [{lat,lon},...] } => { predictions: [...] }

const INDIA_BOUNDS = {
  // approximate bounding box for India
  latMin: 6.0,
  latMax: 36.0,
  lonMin: 68.0,
  lonMax: 98.0
};

const GRID_STEP = 6; // degrees resolution as requested

// chunk size for batch requests — adjust if backend is slow
const CHUNK_SIZE = 60;

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// color mapping using chroma
const getColorScale = (minV, maxV) =>
  chroma.scale(["#313695", "#440154", "#3b528b", "#21908d", "#5dc863", "#fde725"]).domain([minV, maxV]);

export default function IndiaGridMap() {
  const [gridPoints, setGridPoints] = useState([]); // {lat,lon}
  const [results, setResults] = useState([]); // items with predicted value
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [minMax, setMinMax] = useState([0, 1]);
  const [error, setError] = useState(null);

  const controllerRef = useRef(null);

  // generate grid points once
  useEffect(() => {
    const pts = [];
    for (let lat = INDIA_BOUNDS.latMin; lat <= INDIA_BOUNDS.latMax + 1e-6; lat += GRID_STEP) {
      for (let lon = INDIA_BOUNDS.lonMin; lon <= INDIA_BOUNDS.lonMax + 1e-6; lon += GRID_STEP) {
        pts.push({ lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) });
      }
    }
    setGridPoints(pts);
  }, []);

  // helper to call backend in chunks and update progress
  const fetchAllPredictions = async () => {
    if (!gridPoints || gridPoints.length === 0) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setProgress({ done: 0, total: gridPoints.length });

    // split into chunks
    const chunks = chunkArray(gridPoints, CHUNK_SIZE);

    // abort controller for cancel
    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = new AbortController();
    const signal = controllerRef.current.signal;

    const allPreds = [];

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(chunk);
        // POST request expects { coords: [...] }
        const resp = await fetch(API_PREDICT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coords: chunk }),
          signal
        });

        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`Server returned ${resp.status}: ${txt}`);
        }

        const json = await resp.json();

        // expected: { predictions: [...] } where predictions items include predicted_next_hour_wm2 OR error
        const preds = json.predictions ?? json.predictions ?? json; // flexible fallback
        // map values for consistency (latitude, longitude, predicted_next_hour_wm2)
        const normalized = (preds || []).map((p) => {
          const val =
            p.predicted_next_hour_wm2 ??
            p.prediction_wm2 ??
            p.prediction ??
            p.predicted ??
            (typeof p === "number" ? p : null);
          return {
            lat: p.latitude ?? p.lat,
            lon: p.longitude ?? p.lon,
            value: val !== undefined && val !== null ? Number(val) : null,
            raw: p
          };
        });

        allPreds.push(...normalized);
        setProgress((prev) => ({ done: Math.min(prev.total, prev.done + chunk.length), total: prev.total || gridPoints.length }));

        // small delay to be gentle on API (optional)
        await new Promise((r) => setTimeout(r, 150)); // 150ms between chunks
      }

      // set results
      setResults(allPreds);

      // compute color domain
      const vals = allPreds.map((p) => p.value).filter((v) => Number.isFinite(v));
      if (vals.length > 0) {
        const minV = Math.min(...vals);
        const maxV = Math.max(...vals);
        setMinMax([minV, maxV]);
      } else {
        setMinMax([0, 1]);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Request aborted");
      } else {
        console.error(err);
        setError(err.message || "Fetching error");
      }
    } finally {
      setLoading(false);
      setProgress((p) => ({ ...p, done: p.total }));
    }
  };

  // set total for progress after grid generated
  useEffect(() => {
    if (gridPoints.length) setProgress({ done: 0, total: gridPoints.length });
  }, [gridPoints]);

  // color scale memoized
  const colorScale = useMemo(() => getColorScale(minMax[0], minMax[1]), [minMax]);

  // convenience: compute marker size from value
  const markerRadius = (v) => {
    if (!Number.isFinite(v)) return 3;
    // scale radius between 4 and 14
    const [minV, maxV] = minMax;
    if (maxV === minV) return 8;
    const t = Math.max(0, Math.min(1, (v - minV) / (maxV - minV)));
    return 4 + t * 12;
  };

  return (
    <div className="min-h-screen pt-[85px] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">India — Next-hour Solar Map (1.5°)</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Grid resolution: <strong>{GRID_STEP}°</strong> (~{Math.round(GRID_STEP * 111)} km step). Click markers for details.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => fetchAllPredictions()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded shadow"
              disabled={loading || gridPoints.length === 0}
            >
              {loading ? "Loading..." : "Load Next-hour Map"}
            </button>
            <button
              onClick={() => {
                setResults([]);
                setMinMax([0, 1]);
                setError(null);
                if (controllerRef.current) controllerRef.current.abort();
              }}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded"
            >
              Clear
            </button>
          </div>
        </header>

        <div className="flex gap-4 flex-col lg:flex-row">
          <div className="flex-1 rounded overflow-hidden shadow">
            <MapContainer
              center={[22.5, 83.0]}
              zoom={5}
              minZoom={4}
              style={{ height: "72vh", width: "100%" }}
              className="rounded"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />

              {/* draw grid points */}
              {results.map((r, idx) => {
                const val = r.value;
                const color = Number.isFinite(val) ? colorScale(val).hex() : "#999999";
                const radius = markerRadius(val);
                return (
                  <CircleMarker
                    key={`${r.lat}-${r.lon}-${idx}`}
                    center={[r.lat, r.lon]}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 1 }}
                    radius={radius}
                  >
                    <Tooltip direction="top" offset={[0, -radius]} opacity={0.95}>
                      <div className="text-sm">
                        <div><strong>Lat:</strong> {r.lat.toFixed(3)}</div>
                        <div><strong>Lon:</strong> {r.lon.toFixed(3)}</div>
                        <div><strong>Pred:</strong> {Number.isFinite(val) ? `${val.toFixed(1)} W/m²` : "N/A"}</div>
                        <pre className="text-xs mt-1">{JSON.stringify(r.raw, null, 2)}</pre>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          <aside className="w-full lg:w-96 space-y-4">
            <div className="p-4 bg-white dark:bg-slate-800 rounded shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">Progress</div>
                  <div className="text-lg font-semibold">{progress.done}/{progress.total} points</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Markers:</div>
                  <div className="text-sm">{results.length}</div>
                </div>
              </div>

              <div className="mt-3 bg-slate-100 dark:bg-slate-700 rounded h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>

              {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded shadow">
              <div className="text-sm text-slate-500">Legend (predicted W/m²)</div>
              <Legend min={minMax[0]} max={minMax[1]} colorScale={colorScale} />
              <div className="mt-3 text-xs text-slate-500">Circle size scales with predicted irradiance.</div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded shadow">
              <div className="text-sm text-slate-500">Tips</div>
              <ul className="text-sm mt-2 space-y-1 list-disc list-inside text-slate-600 dark:text-slate-300">
                <li>Click a marker to see the exact lat/lon and returned raw JSON.</li>
                <li>Adjust backend chunk size (CHUNK_SIZE) or delay if you hit rate limits.</li>
                <li>To produce a smooth heatmap, interpolate results or use a rasterization step on the backend.</li>
              </ul>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded shadow text-sm">
              <div className="font-medium">Grid</div>
              <div className="mt-1">Step: {GRID_STEP}° | Points: {gridPoints.length}</div>
              <div className="mt-2 text-xs text-slate-500">Bounding box: lat {INDIA_BOUNDS.latMin}–{INDIA_BOUNDS.latMax}, lon {INDIA_BOUNDS.lonMin}–{INDIA_BOUNDS.lonMax}</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* Legend component: draws a small gradient & numeric ticks */
function Legend({ min = 0, max = 1, colorScale }) {
  const stops = 5;
  const ticks = [];
  for (let i = 0; i <= stops; i++) {
    const t = i / stops;
    ticks.push({ color: colorScale(min + (max - min) * t).hex(), value: (min + (max - min) * t).toFixed(0) });
  }

  return (
    <div className="mt-2">
      <div className="h-4 rounded overflow-hidden" style={{ background: `linear-gradient(90deg, ${ticks.map((s) => s.color).join(", ")})` }} />
      <div className="flex justify-between text-xs text-slate-500 mt-2">
        <span>{min.toFixed(0)}</span>
        <span>{((min + max) / 2).toFixed(0)}</span>
        <span>{max.toFixed(0)}</span>
      </div>
    </div>
  );
}
