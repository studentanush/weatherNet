// src/pages/AboutPage.jsx
import React, { useContext } from 'react';
import BackgroundStars from '../components/BackgroundStars';
import { ThemeContext } from '../Content/ThemeContent';

const AboutPage = () => {
  const { theme } = useContext(ThemeContext);

  const styles = {
    page: {
      position: 'relative',
      background:
        theme === 'light'
          ? 'linear-gradient(to bottom, #fff8dc, #ffffff)'
          : '#000000',
      color: theme === 'light' ? '#1a202c' : '#f1f5f9',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      overflow: 'hidden',
    },
    container: {
      maxWidth: '900px',
      margin: '0 auto',
      lineHeight: 1.8,
      position: 'relative',
      zIndex: 1,
    },
    heading: {
      fontSize: '2rem',
      fontWeight: 'bold',
      marginBottom: '1rem',
      textAlign: 'center',
    },
    section: {
      marginBottom: '2rem',
    },
    list: {
      paddingLeft: '1.5rem',
    },
  };

  return (
    <div style={styles.page}>
      <BackgroundStars />

      <div style={styles.container}>
        <h1 style={styles.heading}>About WeatherNet</h1>

        <div style={styles.section}>
          <h2>🌞 Project Overview</h2>
          <p>
            WeatherNet is a solar energy prediction platform that uses real-time
            weather data and machine learning models to forecast solar
            irradiance and provide accurate energy estimates for any global
            location. With interactive 3D globe visualizations, detailed
            dashboards, and a 7-day forecast, it empowers researchers, engineers,
            and energy analysts.
          </p>
        </div>

        <div style={styles.section}>
          <h2>⚙️ Tech Stack</h2>
          <ul style={styles.list}>
            <li>React.js – Frontend framework</li>
            <li>Open-Meteo API – Weather & Solar Irradiance data</li>
            <li>Three.js + React-Globe – 3D interactive globe</li>
            <li>Recharts – Data visualization for charts</li>
            <li>Python – ML model (solar prediction)</li>
            <li>Node.js/Express – Backend (optional)</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2>🌐 Features</h2>
          <ul style={styles.list}>
            <li>Real-time weather & solar irradiance metrics</li>
            <li>7-day solar forecast and weather dashboard</li>
            <li>3D interactive globe with "fly-to" animations</li>
            <li>Responsive design and dark/light mode support</li>
            <li>ML-based solar energy prediction model</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2>👩‍💻 Team</h2>
          <p>
            Built by a passionate team of engineers, data scientists, and
            developers with the goal of making renewable energy insights more
            accessible and visual.
          </p>
        </div>

        <div style={styles.section}>
          <h2>📫 Contact</h2>
          <p>
            For questions, feedback, or collaborations, reach out at{' '}
            <strong>weatherNet.team@gmail.com</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
