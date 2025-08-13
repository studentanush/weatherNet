import React, { useContext } from 'react';
import BackgroundStars from '../components/BackgroundStars';
import { ThemeContext } from '../Content/ThemeContent';

// Correct imports for images
import image1 from '../assets/image1.png';
import avgHourly from '../assets/image2.png';
import last7Days from '../assets/image.png';

const AboutPage = () => {
  const { theme } = useContext(ThemeContext);
  const isLight = theme === 'light';

  const styles = {
    page: {
      position: 'relative',
      background: isLight
        ? 'linear-gradient(to bottom, #f9fafb, #ffffff)'
        : '#000000', // pure black in dark mode
      color: isLight ? '#1a202c' : '#ffffff', // white text in dark mode
      minHeight: '100vh',
      padding: '6rem 2rem 2rem', // top padding avoids navbar overlap
      fontFamily: "'Trebuchet MS', sans-serif",
      overflow: 'hidden',
    },
    container: {
      maxWidth: '1100px',
      margin: '0 auto',
      lineHeight: 1.8,
      position: 'relative',
      zIndex: 1,
    },
    heading: {
      fontSize: '3rem', // Larger font size for main heading
      fontWeight: 'bold',
      marginBottom: '2rem',
      textAlign: 'center',
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    },
    subHeading: {
      fontSize: '1.75rem', // New style for h2 headings
      fontWeight: 'bold',
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    },
    card: {
      background: isLight ? '#fff9f2' : '#1e293b',
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '2rem',
      boxShadow: isLight
        ? '0 4px 12px rgba(0,0,0,0.08)'
        : '0 4px 12px rgba(0,0,0,0.4)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    cardHover: {
      transform: 'translateY(-4px)',
      boxShadow: isLight
        ? '0 8px 20px rgba(0,0,0,0.15)'
        : '0 8px 20px rgba(0,0,0,0.5)',
    },
    list: {
      paddingLeft: '1.5rem',
      listStyleType: 'disc', // Added bullets to the list
    },
    image: {
      maxWidth: '100%',
      borderRadius: '12px',
      marginTop: '1rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
    codeBlock: {
      overflowX: 'auto',
      background: isLight ? '#fdfdfd' : '#0f172a',
      padding: '1rem',
      borderRadius: '8px',
      fontFamily: 'monospace',
    },
  };

  const Card = ({ children }) => {
    const [hover, setHover] = React.useState(false);
    return (
      <div
        style={{
          ...styles.card,
          ...(hover ? styles.cardHover : {}),
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {children}
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <BackgroundStars />

      <div style={styles.container}>
        <h1 style={styles.heading}>🌞 Weather-Net (Solar Energy Prediction)</h1>

        {/* Project Overview */}
        <Card>
          <h2 style={styles.subHeading}>📜 Project Overview</h2>
          <p>
            Weather-Net is a deep learning platform that forecasts hourly solar
            energy output (W/m²) using weather data from NASA's POWER API and
            Weatherbit API. It provides real-time predictions via a FastAPI
            server, responding in just <strong>35 ms</strong> for any geographic
            coordinate.
          </p>
        </Card>

        {/* Features */}
        <Card>
          <h2 style={styles.subHeading}>📦 Features</h2>
          <ul style={styles.list}>
            <li>Predict next hour’s solar irradiance (ALLSKY_SFC_SW_DWN)</li>
            <li>Uses past 24 hours of hourly weather data</li>
            <li>Real-time FastAPI endpoints for predictions & recent data</li>
            <li>
              Spike-aware hybrid CNN-LSTM-Attention model for better accuracy
            </li>
            <li>Integrates multiple meteorological variables</li>
          </ul>
        </Card>

        {/* Model Architecture */}
        <Card>
          <h2 style={styles.subHeading}>🧠 Model Architecture</h2>
          <ul style={styles.list}>
            <li>Input: 24 hourly sequences of 14 weather features</li>
            <li>
              Multi-scale CNN for trend + spike detection, Bi-LSTM for temporal
              learning
            </li>
            <li>Multihead Attention for context</li>
            <li>Global mean/max pooling for robust prediction</li>
            <li>Output: Next hour solar energy prediction (W/m²)</li>
          </ul>
        </Card>

        {/* Images */}
        <Card>
          <h2 style={styles.subHeading}>📷 Model Visualizations</h2>
          <p>Performance evaluation and sample predictions:</p>
          <img style={styles.image} src={image1} alt="Actual vs Predicted" />
          <img style={styles.image} src={avgHourly} alt="Average Hourly Solar" />
          <img style={styles.image} src={last7Days} alt="Live Data Comparison" />
        </Card>

        {/* Metrics */}
        <Card>
          <h2 style={styles.subHeading}>🚇 Metrics</h2>
          <ul style={styles.list}>
            <li>RMSE = 118.64</li>
            <li>MAE = 97.60</li>
            <li>R² Score = 0.9136</li>
          </ul>
        </Card>

        {/* Project Structure */}
        <Card>
          <h2 style={styles.subHeading}>📁 Project Structure</h2>
          <pre style={styles.codeBlock}>
{`weather_net/
├── final/
│   └── dataset.py
├── models_code/
│   ├── model_5.py
│   ├── model_3.py
├── scalers/
├── models/
├── training_codes/
├── final_fetch.py
├── main.py
├── pred.py
└── test_prediction_plot.py`}
          </pre>
        </Card>

        {/* Running API */}
        <Card>
          <h2 style={styles.subHeading}>🚀 Running the API</h2>
          <ol>
            <li>Install dependencies: <code>pip install -r requirements.txt</code></li>
            <li>Start server: <code>uvicorn main:app --reload</code></li>
            <li>
              Test in browser:{' '}
              <a
                href="http://127.0.0.1:8000/docs"
                target="_blank"
                rel="noreferrer"
              >
                http://127.0.0.1:8000/docs
              </a>
            </li>
          </ol>
        </Card>

        {/* Data Source */}
        <Card>
          <h2 style={styles.subHeading}>🛰️ Data Source</h2>
          <p>NASA POWER API, Weatherbit API — using the following features:</p>
          <ul style={styles.list}>
            <li><strong>ALLSKY_SFC_SW_DIFF:</strong> Diffuse shortwave irradiance reaching the Earth's surface under all-sky conditions. Measures scattered sunlight important for cloudy conditions.</li>
            <li><strong>ALLSKY_SFC_SW_DNI:</strong> Direct normal irradiance under all-sky conditions. Represents sunlight coming directly from the sun, critical for concentrated solar power.</li>
            <li><strong>TOA_SW_DWN:</strong> Top-of-atmosphere shortwave downward irradiance, representing maximum possible solar energy before atmospheric effects.</li>
            <li><strong>RH2M:</strong> Relative humidity at 2 meters above ground level, influencing cloud formation and radiation absorption.</li>
            <li><strong>QV2M:</strong> Specific humidity at 2 meters, indicating water vapor content in the air.</li>
            <li><strong>PS:</strong> Surface atmospheric pressure, useful for modeling air density and radiation scattering.</li>
            <li><strong>WS2M:</strong> Wind speed at 2 meters, affecting cooling effects on panels and local weather patterns.</li>
            <li><strong>CLOUD_AMT:</strong> Fraction of sky covered by clouds, directly impacting received solar energy.</li>
            <li><strong>Temperature:</strong> Includes T2M, T2M_MAX, T2M_MIN — measures ambient conditions affecting panel efficiency.</li>
            <li><strong>Cyclic time features:</strong> Hour of day and day of year to capture solar cycle patterns.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default AboutPage;