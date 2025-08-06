import React, { useState, useContext } from 'react';
import Globe from '../components/globe';
import BackgroundStars from '../components/BackgroundStars';
import { ThemeContext } from '../Content/ThemeContent';
import { useNavigate } from 'react-router-dom';

const PredictionPage = () => {
  const { theme } = useContext(ThemeContext);
  const [longitude, setLongitude] = useState('');
  const [latitude, setLatitude] = useState('');
  const [flyToLocation, setFlyToLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleGetWeather = async () => {
    setErrorMessage('');
    setIsLoading(true);

    const parsedLongitude = parseFloat(longitude);
    const parsedLatitude = parseFloat(latitude);

    if (isNaN(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
      setErrorMessage('Please enter a valid longitude between -180 and 180.');
      setIsLoading(false);
      return;
    }

    if (isNaN(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
      setErrorMessage('Please enter a valid latitude between -90 and 90.');
      setIsLoading(false);
      return;
    }

    try {
      const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${parsedLatitude}&longitude=${parsedLongitude}&hourly=temperature_2m,direct_radiation,cloudcover&current_weather=true`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Failed to fetch weather data.');

      const data = await response.json();
      navigate('/result', {
        state: {
          weatherData: data,
          location: { lat: parsedLatitude, lon: parsedLongitude },
        },
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlyTo = () => {
    setErrorMessage('');
    setWeatherData(null);

    const parsedLongitude = parseFloat(longitude);
    const parsedLatitude = parseFloat(latitude);

    if (isNaN(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
      setErrorMessage('Please enter a valid longitude between -180 and 180.');
      return;
    }
    if (isNaN(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
      setErrorMessage('Please enter a valid latitude between -90 and 90.');
      return;
    }

    setFlyToLocation({
      longitude: parsedLongitude,
      latitude: parsedLatitude,
      name: `Lon: ${parsedLongitude.toFixed(2)}, Lat: ${parsedLatitude.toFixed(2)}`
    });
  };

  const handleClearPrediction = () => {
    setLongitude('');
    setLatitude('');
    setFlyToLocation(null);
    setWeatherData(null);
    setErrorMessage('');
  };

  return (
    <div
      className="prediction-page"
      style={{
        backgroundColor: theme === 'dark' ? '#000' : '#f4f6ff',
        color: theme === 'dark' ? '#fff' : '#000',
        position: 'relative',
        transition: 'all 0.5s ease-in-out'
      }}
    >
      {theme === 'light' ? (
        <BackgroundStars count={60} color="rgba(255, 179, 0, 0.4)" />
      ) : (
        <BackgroundStars count={60} color="rgba(255, 255, 255, 0.3)" />
      )}

      <div className="globe-container">
        <div className="globe-box">
          <Globe flyToCoordinates={flyToLocation} />
        </div>
      </div>

      <div className="sidebar">
        <div className="form-wrapper">
          <h2 className="title">Enter Location</h2>

          {errorMessage && (
            <div className="error-box">
              <strong>Error:</strong> <span>{errorMessage}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="longitude">Longitude (-180 to 180)</label>
            <input
              type="number"
              id="longitude"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="e.g., -74.0060"
              min="-180"
              max="180"
              step="any"
            />
          </div>

          <div className="form-group">
            <label htmlFor="latitude">Latitude (-90 to 90)</label>
            <input
              type="number"
              id="latitude"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="e.g., 40.7128"
              min="-90"
              max="90"
              step="any"
            />
          </div>

          <div className="button-group">
            <button onClick={handleGetWeather} disabled={isLoading} className={isLoading ? 'disabled' : ''}>
              {isLoading ? 'Loading...' : 'Get Solar Energy'}
            </button>
            <button onClick={handleFlyTo}>Fly to Globe</button>
          </div>

          {weatherData && weatherData.current_weather && (
            <div className="weather-box">
              <h3>Current Weather</h3>
              <h1>{weatherData.current_weather.temperature}°C</h1>
              <p>Wind Speed: {weatherData.current_weather.windspeed} km/h</p>
              <p>Wind Direction: {weatherData.current_weather.winddirection}°</p>
              <p>Time: {weatherData.current_weather.time}</p>

              <div className="weather-grid">
                <div><strong>Cloud Cover:</strong> {weatherData.hourly.cloudcover[0]}%</div>
                <div><strong>Direct Radiation:</strong> {weatherData.hourly.direct_radiation[0]} W/m²</div>
                <div><strong>Temperature (Hourly):</strong> {weatherData.hourly.temperature_2m[0]}°C</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .prediction-page {
          font-family: 'Trebuchet MS', sans-serif;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          padding-top: 80px;
          overflow: hidden;
        }

        @media (min-width: 768px) {
          .prediction-page {
            flex-direction: row;
          }
        }

        .globe-container, .sidebar {
          flex: 1;
          padding: 1rem;
          box-sizing: border-box;
        }

        .globe-box {
          width: 100%;
          height: 100%;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }

        .form-wrapper {
          max-width: 400px;
          margin: 0 auto;
          padding-top: 2rem;
        }

        .title {
          padding-top: 30px;
          font-size: 1.8rem;
          font-weight: bold;
          margin-bottom: 1rem;
          text-align: center;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        input {
          width: 100%;
          padding: 0.5rem;
          border-radius: 0.5rem;
          border: 1px solid #ccc;
          font-size: 1rem;
          color: inherit;
          background-color: transparent;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        button {
          flex: 1;
          padding: 0.75rem;
          background-color: #2563eb;
          color: white;
          font-weight: bold;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }

        button:hover {
          background-color: #1d4ed8;
        }

        button.disabled {
          background-color: #999;
          cursor: not-allowed;
        }

        .error-box {
          background-color: #fdecea;
          color: #b91c1c;
          padding: 0.75rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }

        .weather-box {
          background-color: #f1f5f9;
          padding: 1.5rem;
          border-radius: 1rem;
          margin-top: 2rem;
          text-align: center;
        }

        .weather-grid {
          margin-top: 1rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};

export default PredictionPage;
