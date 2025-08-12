// src/pages/ResultPage.jsx
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from '../Content/ThemeContent';
import { useLocation, useSearchParams } from 'react-router-dom';
import Globe from '../components/globe';
import BackgroundStars from '../components/BackgroundStars';
import { FaSun, FaWind, FaCloud, FaTemperatureHigh, FaBolt } from 'react-icons/fa';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import Chat from "../components/chatFeature"
// CLIENT / BACKEND settings
const API_BASE = "http://127.0.0.1:8000"; // optional backend for prediction
import { buildWeatherStateClient } from '../components/weather';
import ImpactPage from './ImpactPage';

const StatCard = ({ icon, title, value, hint }) => (
  <div className="bg-white/80 dark:bg-slate-900 border border-orange-400 rounded-2xl p-5 flex flex-col items-start gap-2 shadow-md">
    <div className="flex items-center gap-3">
      <div className="text-orange-500 text-2xl">{icon}</div>
      <div>
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</div>
        <div className="text-xl font-semibold text-slate-900 dark:text-white">{value}</div>
      </div>
    </div>
    {hint && <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">{hint}</div>}
  </div>
);

const MiniLoader = () => <div className="animate-pulse bg-gray-200 dark:bg-slate-700 h-6 w-24 rounded" />;

export default function ResultPage() {
  const { theme } = useContext(ThemeContext);
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  let data = 0;
  const locationLat = state?.location?.lat ?? parseFloat(searchParams.get('lat')) ?? null;
  const locationLon = state?.location?.lon ?? parseFloat(searchParams.get('lon')) ?? null;

  // local states
  const [loading, setLoading] = useState(false);            // prediction loading
  const [loadingWeather, setLoadingWeather] = useState(false); // building weather state
  const [prediction, setPrediction] = useState(null);       // backend prediction (optional)
  const [last7hoursData, setLast7hoursData] = useState([]); // array for chart
  const [rawDebug, setRawDebug] = useState({ predict: null, last7: null, weatherState: null });
  const [error, setError] = useState('');
  const [weatherStateLocal, setWeatherStateLocal] = useState(state?.weatherData ?? null); // main weatherData

  // Panel sizing inputs (new)
  const [panelArea, setPanelArea] = useState(10);     // m^2 default
  const [efficiency, setEfficiency] = useState(18);   // % default
  const [predictedEnergyKwh, setPredictedEnergyKwh] = useState(null); // computed kWh for 1 hour

  // chart data derived from last7hoursData
  const chart7h = useMemo(() => {
    if (!last7hoursData?.length) return [];
    return last7hoursData.map((r) => {
      const tsStr = r.timestamp_ist || r.timestamp || r.time || r.timestamp_utc;
      const dt = tsStr ? new Date(tsStr.replace(' ', 'T')) : new Date();
      // Add 5 hours 30 minutes offset for IST
      dt.setMinutes(dt.getMinutes() + 330);
      const label = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { time: label, ghi: Number(r.ghi_wm2 ?? r.ALLSKY_SFC_SW_DWN ?? 0) };
    });
  }, [last7hoursData]);


  // build weatherState client-side if not provided via navigation state
  useEffect(() => {
    let cancelled = false;
    async function buildWeather() {
      if (weatherStateLocal || locationLat == null || locationLon == null) return;
      setError('');
      setLoadingWeather(true);
      try {
        // fetch 7 days (168 hours) by default — change if you want fewer
        const ws = await buildWeatherStateClient(locationLat, locationLon, 168);
        if (cancelled) return;
        setWeatherStateLocal(ws);
        setRawDebug((s) => ({ ...s, weatherState: { status: 'ok', sampleCount: ws.hourly?.time?.length ?? 0 } }));
      } catch (err) {
        console.error('buildWeatherStateClient error:', err);
        if (!cancelled) setError(err.message || 'Failed to build weather state (client)');
        setRawDebug((s) => ({ ...s, weatherState: { status: 'error', message: err.message } }));
      } finally {
        if (!cancelled) setLoadingWeather(false);
      }
    }
    buildWeather();
    return () => { cancelled = true; };
  }, [locationLat, locationLon, weatherStateLocal]);

  // populate last7hoursData from weatherStateLocal.hourly (no backend)
  useEffect(() => {
    if (!weatherStateLocal?.hourly) return;
    const hourly = weatherStateLocal.hourly;
    const n = hourly.time?.length ?? 0;
    const start = Math.max(0, n - 7);
    const arr = [];
    for (let i = start; i < n; i++) {
      arr.push({
        timestamp_ist: hourly.time[i],
        ghi_wm2: hourly.ALLSKY_SFC_SW_DWN?.[i] ?? hourly.ghi?.[i] ?? hourly.GHI?.[i] ?? 0
      });
    }
    setLast7hoursData(arr);
    setRawDebug((s) => ({ ...s, last7: { from: 'weatherState', count: arr.length } }));
  }, [weatherStateLocal]);

  // attempt backend prediction AFTER weatherState is available.
  // This call is optional — if you don't have backend, it will fail gracefully.
  useEffect(() => {
    if (!weatherStateLocal || locationLat == null || locationLon == null) return;
    let cancelled = false;
    async function callPredict() {
      setLoading(true);
      setPrediction(null);
      try {
        const url = `${API_BASE}/predict_current?lat=${locationLat}&lon=${locationLon}`;
        const res = await fetch(url);
        const json = await res.json().catch(() => ({ rawText: 'invalid json' }));
        setRawDebug((s) => ({ ...s, predict: { status: res.status, body: json } }));
        if (!res.ok) {
          // backend not present or returned an error — don't treat as fatal
          console.warn('predict_current returned non-ok', res.status, json);
          return;
        }
        if (!cancelled) setPrediction(json);
      } catch (err) {
        console.warn('predict_current call failed (optional):', err);
        setRawDebug((s) => ({ ...s, predict: { status: 'error', message: err.message } }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    callPredict();
    return () => { cancelled = true; };
  }, [weatherStateLocal, locationLat, locationLon]);

  // compute personalized predicted energy (kWh) when prediction/panel inputs change
  useEffect(() => {
    // extract irradiance in W/m^2 from prediction if present
    const irr = Number(prediction?.predicted_next_hour_wm2 ?? prediction?.prediction ?? prediction?.prediction_wm2 ?? NaN);
    if (!isFinite(irr)) {
      setPredictedEnergyKwh(null);
      return;
    }
    const area = Number(panelArea) || 0;
    const eff = (Number(efficiency) || 0) / 100.0;
    // energy for one hour: (W/m^2 * area m^2) -> Wh ; divide by 1000 to get kWh
    const energyKwh = (irr * area * eff) / 1000.0;
    setPredictedEnergyKwh(Number((energyKwh).toFixed(3)));
  }, [prediction, panelArea, efficiency]);

  const prettyPred = (p) => {
    if (!p) return '—';
    const n = Number(p.predicted_next_hour_wm2 ?? p.prediction ?? p.prediction_wm2 ?? NaN);
    return Number.isFinite(n) ? `${n.toFixed(1)} W/m²` : '—';
  };

  // for header: prefer predicted timestamp, then weatherState current time, otherwise local IST now
  const displayTime = (prediction?.timestamp_predicted_ist)
    || (weatherStateLocal?.current_weather?.time)
    || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  return (
    <div className={`pt-[80px] min-h-screen ${theme === 'dark' ? 'bg-black text-slate-100' : 'bg-slate-50 text-slate-900'} relative`}>
      {theme === 'light' ? <BackgroundStars count={40} color="rgba(255,179,0,0.18)" /> : <BackgroundStars count={40} color="rgba(255,255,255,0.06)" />}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold">Solar & Weather Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Location: {locationLat ?? '—'}, {locationLon ?? '—'} • IST: {displayTime}</p>
          </div>
          <div>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold">Refresh</button>
          </div>
        </div>

        {/* error */}
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={<FaBolt />} title="ML Next Hour" value={loading ? <MiniLoader /> : prettyPred(prediction)} hint="Model prediction for next hour (IST)" />
              <StatCard icon={<FaSun />} title="Last 7h Avg" value={loadingWeather ? <MiniLoader /> : `${data = (last7hoursData.reduce((s, r) => s + Number(r.ghi_wm2 || 0), 0) / Math.max(last7hoursData.length, 1)).toFixed(1)} W/m²`} hint="Measured GHI average" />
              <StatCard icon={<FaTemperatureHigh />} title="Now (local)" value={weatherStateLocal?.current_weather?.temperature ?? state?.weatherData?.current_weather?.temperature ?? '—'} hint="Current temp" />
            </div>

            <div className="bg-white/90 dark:bg-slate-800 border border-orange-300 rounded-2xl p-4 shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Last 7 Hours — Measured GHI</h3>
                <div className="text-sm text-slate-500">{loadingWeather ? 'Loading…' : `${last7hoursData.length} points`}</div>
              </div>

              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart7h}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1f2937' : '#e6e6e6'} />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 'auto']} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="ghi" name="Measured GHI" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    <ReferenceLine y={0} stroke="#999" strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* --- NEW: Panel sizing card --- */}
            <div className="bg-white/90 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow flex flex-col gap-4">
              <h3 className="text-lg font-semibold">Personalize with your panel</h3>
              <p className="text-sm text-slate-500">Enter your panel area and efficiency to get a personalized predicted energy (next hour).</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex flex-col">
                  <span className="text-xs text-slate-600 mb-1">Panel area (m²)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={panelArea}
                    onChange={(e) => setPanelArea(Number(e.target.value))}
                    className="p-2 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-xs text-slate-600 mb-1">Efficiency (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={efficiency}
                    onChange={(e) => setEfficiency(Number(e.target.value))}
                    className="p-2 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </label>

                <div className="flex flex-col justify-end">
                  <div className="text-sm text-slate-600 mb-1">Predicted energy (next hour)</div>
                  <div className="text-lg font-semibold">
                    {predictedEnergyKwh == null ? '—' : `${predictedEnergyKwh} kWh`}
                    <div className="text-xs text-slate-500">Computed from model irradiance × area × efficiency</div>
                  </div>
                </div>
              </div>
            </div>

            <ImpactPage
              lat={locationLat}
              lon={locationLon}
              predictionData={prediction}
              area={Number(panelArea)}
              efficiency={Number(efficiency)}
              predictedEnergy={predictedEnergyKwh}
              avg_7={data}
            />
            <div className="mt-6">
<div className="mt-6">
        <Chat
          lat={locationLat}
          lon={locationLon}
          predictionData={prediction}
          area={Number(panelArea)}
          efficiency={Number(efficiency)}
          avg_7={data}
          time={displayTime}
        />
      </div>
</div>
          </div>

          <aside className="space-y-6">
            <div className="bg-white/95 dark:bg-slate-800 border border-orange-300 rounded-2xl p-4 shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Location Overview</h3>
                <div className="text-sm text-slate-500">IST</div>
              </div>
              <div className="h-56 rounded-lg overflow-hidden mb-3 bg-slate-100 dark:bg-slate-900">
                <Globe flyToCoordinates={locationLat != null && locationLon != null ? { latitude: locationLat, longitude: locationLon } : null} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-slate-600 dark:text-slate-300">Latitude</div>
                <div className="font-semibold">{locationLat ?? '—'}</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">Longitude</div>
                <div className="font-semibold">{locationLon ?? '—'}</div>
              </div>
            </div>

            <div className="bg-white/95 dark:bg-slate-800 border border-orange-300 rounded-2xl p-4 shadow">
              <h3 className="text-lg font-semibold mb-3">Quick History (last 7)</h3>
              {(weatherStateLocal ?? state?.weatherData)?.daily ? (
                <div className="flex gap-2 overflow-x-auto">
                  {(weatherStateLocal ?? state?.weatherData)
                    .daily.time.slice(0, 7)
                    .reverse()
                    .map((t, i) => (
                      <div
                        key={i}
                        className="min-w-[110px] p-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-center"
                      >
                        <div className="text-sm text-slate-500">
                          {new Date(t).toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="font-semibold mt-1">
                          {(weatherStateLocal ?? state?.weatherData).daily.temperature_2m_max?.slice(0, 7).reverse()[i] ?? '—'}°C
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {(weatherStateLocal ?? state?.weatherData).daily.shortwave_radiation_sum?.slice(0, 7).reverse()[i] ?? '—'} W/m²
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">No forecast available in state.</div>
              )}

            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
