// src/components/Navbar.jsx
import React, { useContext, useEffect,useState } from 'react';
import { FiSun, FiMoon } from "react-icons/fi";
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../Content/ThemeContent';
//import GoogleSignInButton from '../button/GoogleSignInButton';
import { FcGoogle } from "react-icons/fc";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import axios from "axios";
import { auth, provider, signInWithPopup } from "../firebase";
//import {Google}


const Navbar = ({user,setUser}) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  
  const auth = getAuth();

  useEffect(() => {
    // This will run once when the component mounts
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    
    return () => unsubscribe();
  }, [auth]);
  //const navigate = useNavigate();
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const { data } = await axios.post("http://localhost:5000/api/auth/google", {
        name: user.displayName,
        email: user.email,
        googleId: user.uid,
        photoURL: user.photoURL
      });

      setUser(data.user);
      localStorage.setItem("userId", data.user._id);
    } catch (err) {
      console.error("Google login failed:", err);
    }
  };
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.style.setProperty('--bg-color', '#ffffff');
      root.style.setProperty('--text-color', '#1a202c');
    } else {
      root.style.setProperty('--bg-color', '#0d1117');
      root.style.setProperty('--text-color', '#f1f5f9');
    }
  }, [theme]);

  return (
    <>
      <nav className="navbar-container">
        <div className="navbar-content">

          {/* Logo/Brand */}
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 25, delay: 0.3 }}
            className="navbar-logo-wrapper"
          >
            <span className="navbar-icon">☀️</span>
            <span className="navbar-title">WeatherNet</span>
          </motion.div>

          {/* Navigation and Theme Toggle */}
          <div className="navbar-menu">
            <div className="navbar-links">
              {["/", "/predict", "/about"].map((path, i) => (
                <motion.div
                  key={path}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.5 + i * 0.2 }}
                >
                  <Link to={path} className="nav-link">
                    {path === "/" ? "Home" : path.substring(1).charAt(0).toUpperCase() + path.slice(2)}
                    <span className="nav-link-underline"></span>
                  </Link>
                </motion.div>
              ))}
            </div>

            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title="Toggle light/dark mode"
            >
              {theme === 'light' ? <FiMoon size={24} /> : <FiSun size={24} />}
            </button>
            {user ? (
              <div
                className="user-avatar"
                
              >
                {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </div>
            ) : (
              <button className="my-button" onClick={handleGoogleLogin}>
                <FcGoogle size={20} />
                Sign in
              </button>
            )}



          </div>
        </div>
      </nav>

      {/* Inline CSS */}
      <style>{`
       
        .navbar-container {
  position: fixed;
  top: 0;
  left: 0;
  height: 80px;
  width: 100%;
  background-color: var(--bg-color, #ffffff);
  color: var(--text-color, #1a202c);
  z-index: 1000;
  box-shadow: var(--shadow-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

        .navbar-content {
          width: 100%;
          max-width: 1200px;
          padding: 0 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: 'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif;

        }

        .navbar-logo-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--text-color, #1a202c);
        }

        .navbar-icon {
          font-size: 2.5rem;
        }

        .navbar-title {
          font-size: 2rem;
          font-family: 'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif;

        }

        .navbar-menu {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .navbar-links {
          display: flex;
          gap: 1.5rem;
        }

        .nav-link {
          text-decoration: none;
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-color, #1a202c);
          position: relative;
          transition: color 0.3s ease;
        }

        .nav-link:hover {
          color: orange;
        }

        .nav-link-underline {
          content: "";
          position: absolute;
          width: 100%;
          height: 2px;
          bottom: -4px;
          left: 0;
          background-color: orange;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }

        .nav-link:hover .nav-link-underline {
          transform: scaleX(1);
        }

        .theme-toggle-btn {
          background: none;
          border: none;
          color: var(--text-color, #1a202c);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: background-color 0.2s ease;
        }

        .theme-toggle-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
          .my-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px; /* space between icon and text */
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background-color: #ffffff;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
}

.my-button:hover {
  background-color: #f0f0f0;
}
  .user-avatar {
  width: 40px;               /* same as w-10 */
  height: 40px;              /* same as h-10 */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;        /* same as rounded-full */
  color: white;              /* same as text-white */
  font-weight: bold;         /* same as font-bold */
  font-size: 16px;
  background-color: #3b82f6;
}
      `}</style>
    </>
  );
};

export default Navbar;
