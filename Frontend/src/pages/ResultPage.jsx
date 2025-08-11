import React, { useContext } from 'react';
import { ThemeContext } from '../Content/ThemeContent';
import { useLocation } from 'react-router-dom';
import Globe from '../components/globe';
import BackgroundStars from '../components/BackgroundStars';
import { FaSun, FaWind, FaCloud, FaTemperatureHigh } from 'react-icons/fa';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const ResultPage = () => {
  const { theme } = useContext(ThemeContext);
  const { state } = useLocation();

  if (!state || !state.weatherData || !state.location) {
    return <div style={{ padding: '2rem' }}>No prediction data found.</div>;
  }

  const { weatherData, location } = state;
  const current = weatherData.current_weather;
  const hourly = weatherData.hourly || {};
  const daily = weatherData.daily || {};

  const chartData = (hourly.time || []).slice(0, 12).map((t, i) => ({
    time: new Date(t).getHours() + ':00',
    radiation: hourly.direct_radiation?.[i],
    temperature: hourly.temperature_2m?.[i],
  }));

  const forecastData = (daily.time || []).map((date, idx) => ({
    date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    temp: daily.temperature_2m_max?.[idx],
    cloudcover: daily.cloudcover?.[idx],
    radiation: daily.shortwave_radiation_sum?.[idx],
  }));

  const mlPredictions = [
    { label: 'Predicted Solar Output', value: '5.2 kWh/m²' },
    { label: 'Expected Temp Peak', value: '32°C' },
    { label: 'Cloud Probability', value: `${hourly.cloudcover?.[0] ?? 'N/A'}%` },
  ];

  return (
    <div
      style={{
        backgroundColor: theme === 'dark' ? '#000000' : '#f4f6ff',
        color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        padding: '2rem',
        position: 'relative',
        transition: 'all 0.5s ease-in-out',
      }}
    >
      {/* ⭐️ Background Stars */}
      {theme === 'light' ? (
        <BackgroundStars count={60} color="rgba(255, 179, 0, 0.4)" />
      ) : (
        <BackgroundStars count={60} color="rgba(255, 255, 255, 0.3)" />
      )}

      <style>{`
        .section-title {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          font-weight: 600;
          font-family: Trebuchet MS, sans-serif;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .card {
          font-family: Trebuchet MS, sans-serif;
          background: ${theme === 'dark' ? '#000000' : '#ffffff'};
          border: 2px solid orange;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .card:hover {
          transform: scale(1.02);
          box-shadow: 0 0 30px rgba(255, 165, 0, 0.4);
          border-color: darkorange;
        }
        .card.no-hover-scale:hover {
          transform: none;
          box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
          border-color: orange;
        }
        .forecast-day {
          text-align: center;
          padding: 0.75rem;
          background: ${theme === 'dark' ? '#334155' : '#e2e8f0'};
          border-radius: 12px;
        }
        .forecast-grid {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          margin-top: 1rem;
        }
        .forecast-card {
          background: ${theme === 'dark' ? '#1e293b' : '#f3f4f6'};
          padding: 1rem;
          border-radius: 0.75rem;
          min-width: 120px;
          text-align: center;
        }
        .dashboard-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
        }
        .chart-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        .globe-container {
          width: 100%;
          height: 200px;
          max-width: 100%;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .globe-container canvas {
          max-width: 100%;
          height: auto;
        }
      `}</style>

      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>Solar & Weather Dashboard</h1>
        <p>
          Location: {location.lat}, {location.lon} | Time:{' '}
          {new Date(current.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </header>

      <div className="dashboard-layout">
        <div>
          <div className="grid">
            <div className="card"><FaTemperatureHigh size={28} /><h3>Current Temperature</h3><p>{current.temperature}°C</p></div>
            <div className="card"><FaWind size={28} /><h3>Wind Speed</h3><p>{current.windspeed} km/h</p></div>
            <div className="card"><FaCloud size={28} /><h3>Cloud Cover</h3><p>{hourly.cloudcover?.[0] ?? 'N/A'}%</p></div>
            <div className="card"><FaSun size={28} /><h3>Diffuse Radiation</h3><p>{hourly.diffuse_radiation?.[0] ?? 'N/A'} W/m²</p></div>
            <div className="card"><FaSun size={28} /><h3>Direct Normal Irradiance</h3><p>{hourly.direct_normal_irradiance?.[0] ?? 'N/A'} W/m²</p></div>
            <div className="card"><FaSun size={28} /><h3>Total Solar Irradiance</h3><p>{hourly.shortwave_radiation_instant?.[0] ?? 'N/A'} W/m²</p></div>
          </div>

          <h2 className="section-title" style={{ marginTop: '3rem' }}>Charts</h2>
          <div className="chart-grid">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" /><YAxis /><Tooltip /><Line type="monotone" dataKey="radiation" stroke="#f59e0b" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" /><YAxis /><Tooltip /><Line type="monotone" dataKey="temperature" stroke="#3b82f6" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          </div>

          <h2 className="section-title" style={{ marginTop: '3rem' }}>ML Predictions</h2>
          <div className="grid">
            {mlPredictions.map((pred, index) => (
              <div key={index} className="card">
                <h4>{pred.label}</h4>
                <p>{pred.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card no-hover-scale" style={{ height: '100%', minHeight: '300px' }}>
          <h2 className="section-title">Location Overview</h2>
          <div className="globe-container">
            <Globe flyToCoordinates={{ latitude: location.lat, longitude: location.lon }} />
          </div>
          <h2 className="section-title" style={{ marginTop: '2rem' }}>7-Day Forecast</h2>
          <div className="forecast-grid">
            {forecastData?.map((day, index) => (
              <div key={index} className="forecast-card">
                <p><strong>{day.date}</strong></p>
                <p>🌞 {day.temp}°C</p>
                <p>☁️ {day.cloudcover}%</p>
                <p>🔆 {day.radiation} W/m²</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
