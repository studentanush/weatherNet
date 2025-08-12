import React, { useContext,useState } from 'react';
import { ThemeContext } from './Content/ThemeContent';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PredictionPage from './pages/PredictionPage';
import ResultPage from './pages/ResultPage';
import AboutPage from './pages/AboutPage';
import ImpactPage from './pages/ImpactPage';
import Navbar from './components/Navbar';
import BackgroundStars from './components/BackgroundStars';
//import GoogleLogin from './pages/GoogleLogin';
import India_map from './pages/maps'
import 'leaflet/dist/leaflet.css';

const App = () => {
  const { theme } = useContext(ThemeContext);
  const [user, setUser] = useState(null);
  return (
    <>
      {/* 🌌 Fixed background stars, behind everything */}
      <BackgroundStars
        count={60}
        color={theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(255,193,7,0.25)'}
      />

      {/* 🌐 Main UI sits above */}
      <div style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden', zIndex: 1 }}>
        <Navbar user = {user} setUser={setUser}  />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/predict" element={<PredictionPage user={user} setUser={setUser} />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/impact" element={<ImpactPage />} /> {/* Correct route path */}
          <Route path="/maps" element={<India_map/>} /> {/* Correct route path */}
        </Routes>
      </div>
    </>
  );
};

export default App;
