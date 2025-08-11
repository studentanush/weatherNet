import React, { useEffect, useRef, useContext } from 'react';
import { motion } from 'framer-motion';
import Spline from '@splinetool/react-spline';
import Lottie from 'lottie-react';
import animationData from '../assets/solar.json';
import HappySunGif from '../assets/happySun.gif';
import { FaReact, FaNodeJs, FaPython, FaGithub, FaGlobe } from 'react-icons/fa';
import { SiTailwindcss, SiMongodb } from 'react-icons/si';
import { MdEmail } from 'react-icons/md';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/all';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../Content/ThemeContent';

const HomePage = () => {
  const titleRef = useRef(null);
  const sectionRef = useRef(null);
  const introRef = useRef(null);
  const starRef = useRef([]);
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    gsap.fromTo(
      titleRef.current,
      { y: 100, opacity: 0 },
      {
        y: -5,
        opacity: 1,
        duration: 0.8,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 40%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    gsap.fromTo(
      introRef.current,
      { y: 100, opacity: 0, filter: 'blur(15px)' },
      {
        y: -10,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 1.5,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 40%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    starRef.current.forEach((star, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      const speed = 0.5 + Math.random() * 0.5;
      gsap.to(star, {
        x: `${direction * (100 + index * 20)}`,
        y: `${direction * -50 - index * 10}`,
        rotation: direction * 360,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: speed,
        },
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.vars.trigger === sectionRef.current) {
          trigger.kill();
        }
      });
    };
  }, []);

  const addToStars = (el) => {
    if (el && !starRef.current.includes(el)) {
      starRef.current.push(el);
    }
  };

  // Theme colors
  const isDark = theme === 'dark';
  const textColor = isDark ? '#f8fafc' : '#1e293b';
  const subTextColor = isDark ? '#cbd5e1' : '#475569';
  const bgGradientHero = isDark
    ? '#000000'
    : 'linear-gradient(to bottom, #ffffff, #fff8dc, #ffd700)';
  const bgFlatSection = isDark ? '#000000' : '#fdf6e3';

  return (
    <div style={{ fontFamily: `'Trebuchet MS', sans-serif`, backgroundColor: isDark ? '#0f172a' : '#fff' }}>
      {/* Hero Section */}
      <section
        style={{
          minHeight: '100vh',
          background: bgGradientHero,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '2rem 4rem',
          position: 'relative',
          overflow: 'hidden',
          color: textColor,
        }}
      >
        <div style={{ zIndex: 10, maxWidth: '600px' }}>
          <motion.h1
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 40, damping: 25, delay: 1 }}
            style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              lineHeight: 1.3,
            }}
          >
            Predict Solar Energy<br />using AI Results
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 40, damping: 25, delay: 1.4 }}
            style={{
              fontSize: '1.2rem',
              fontStyle: 'italic',
              color: subTextColor,
              marginBottom: '2rem',
            }}
          >
            Enter your weather data and get instant solar power prediction.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ delay: 1.6 }}
            onClick={() => navigate('/predict')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f59e0b',
              border: 'none',
              borderRadius: '999px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
            }}
          >
            Start Predicting
          </motion.button>
        </div>

        <div style={{ position: 'absolute', right: '5%', top: '20%', zIndex: 0, width: '750px', height: '480px' }}>
          <Spline scene="https://prod.spline.design/N5cUmWtoDFggcTja/scene.splinecode" />
        </div>
      </section>

      {/* How It Works Section */}
      <section
        ref={sectionRef}
        style={{
          minHeight: '100vh',
          background: bgFlatSection,
          position: 'relative',
          padding: '4rem 2rem',
          color: textColor,
          overflow: 'hidden',
        }}
      >
        {/* Floating Stars - Only Here */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
          {[...Array(35)].map((_, i) => (
            <div
              ref={addToStars}
              key={`star-${i}`}
              style={{
                position: 'absolute',
                borderRadius: '999px',
                width: `${6 + (i % 3) * 3}px`,
                height: `${6 + (i % 3) * 3}px`,
                background: isDark ? '#ffffff80' : '#fbbf24aa',
                opacity: 0.2 + Math.random() * 0.4,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '4rem', zIndex: 10, position: 'relative' }}>
          <h1 ref={titleRef} style={{ fontSize: '2.5rem', fontWeight: 'bold', opacity: 0 }}>
            <img src={HappySunGif} alt="Happy Sun" style={{ width: '60px', height: '60px', verticalAlign: 'middle' }} /> SolarPredict
          </h1>
        </div>

        <div
          ref={introRef}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-around',
            alignItems: 'center',
            gap: '2rem',
            zIndex: 10,
            position: 'relative',
          }}
        >
          <div style={{ flex: 1, minWidth: '300px', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>About Project</h2>
            <p style={{ fontSize: '1.2rem', lineHeight: 1.6, color: subTextColor }}>
              SolarPredict is a lightweight tool that helps individuals and communities forecast solar energy output
              using real-time weather data and smart AI. Our mission is to make solar planning easier, efficient, and
              eco-friendly.
            </p>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '2rem' }}>⚙️ Built With</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
              {[{ Icon: FaReact, label: 'React', color: '#61DAFB' },
              { Icon: SiTailwindcss, label: 'Tailwind', color: '#38BDF8' },
              { Icon: FaNodeJs, label: 'Node.js', color: '#3C873A' },
              { Icon: FaPython, label: 'Python', color: '#FFD43B' },
              { Icon: SiMongodb, label: 'MongoDB', color: '#4DB33D' }].map(({ Icon, label, color }) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <Icon style={{ color, fontSize: '1.5rem' }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '300px', maxWidth: '600px' }}>
            <Lottie animationData={animationData} loop={true} />
          </div>
        </div>

        <div
          style={{
            marginTop: '3rem',
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            fontSize: '1.1rem',
            color: subTextColor,
            fontWeight: 500,
            zIndex: 10,
            position: 'relative',
          }}
        >
          <a href="https://github.com/yourusername" target="_blank" rel="noopener noreferrer">
            <FaGithub style={{ marginRight: '0.5rem' }} /> GitHub
          </a>
          <a href="mailto:your@email.com">
            <MdEmail style={{ marginRight: '0.5rem' }} /> Contact
          </a>
          <a href="https://yourwebsite.com" target="_blank" rel="noopener noreferrer">
            <FaGlobe style={{ marginRight: '0.5rem' }} /> Website
          </a>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
