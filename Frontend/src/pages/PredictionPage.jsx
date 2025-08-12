import React, { useState, useContext } from 'react';
import Globe from '../components/globe';
import BackgroundStars from '../components/BackgroundStars';
import { ThemeContext } from '../Content/ThemeContent';
import { useNavigate } from 'react-router-dom';

const PredictionPage = ({setUser}) => {
  const { theme } = useContext(ThemeContext);
  const [longitude, setLongitude] = useState('');
  const [latitude, setLatitude] = useState('');
  const [flyToLocation, setFlyToLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [progressMessages, setProgressMessages] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleGetWeather = async () => {
    setErrorMessage('');
    setIsLoading(true);
    setProgressMessages([]);
    setPrediction(null);

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

    setProgressMessages(['Fetching real-time weather data...']);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/predict_current?lat=${parsedLatitude}&lon=${parsedLongitude}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch prediction');
      }

      const data = await response.json();

      navigate(`/result?lat=${parsedLatitude}&lon=${parsedLongitude}`, {
        state: {
          location: { lat: parsedLatitude, lon: parsedLongitude },
          predictionData: data
        }
      });

    } catch (error) {
      // ✅ Fallback navigation with dummy data if API fails
      navigate(`/result?lat=${parsedLatitude}&lon=${parsedLongitude}`, {
        state: {
          location: { lat: parsedLatitude, lon: parsedLongitude },
          predictionData: { message: 'No live data, offline mode' }
        }
      });
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

          {progressMessages.length > 0 && (
            <div className="progress-box">
              {progressMessages.map((msg, idx) => (
                <div key={idx}>{msg}</div>
              ))}
            </div>
          )}
          {prediction && (
            <div className="prediction-box">
              <strong>{prediction}</strong>
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

        .progress-box {
          background: #f3f3f3;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-top: 1rem;
          font-size: 1rem;
          color: #333;
          max-height: 200px;
          overflow-y: auto;
        }
        .prediction-box {
          background: #e0ffe0;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-top: 1rem;
          font-size: 1.2rem;
          color: #2563eb;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default PredictionPage;
