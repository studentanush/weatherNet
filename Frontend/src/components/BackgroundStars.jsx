import React, { useEffect, useRef, useContext } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThemeContext } from '../Content/ThemeContent';

gsap.registerPlugin(ScrollTrigger);

const BackgroundStars = () => {
  const starRefs = useRef([]);
  const { theme } = useContext(ThemeContext);

  // 🌠 Scroll-based parallax using GSAP
  useEffect(() => {
    starRefs.current.forEach((star, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      const speed = 0.2 + Math.random() * 0.5;

      gsap.to(star, {
        x: direction * (100 + index * 10),
        y: direction * -50 - index * 5,
        rotation: direction * 360,
        ease: 'none',
        scrollTrigger: {
          trigger: star,
          start: 'top bottom',
          end: 'bottom top',
          scrub: speed,
        },
      });
    });
  }, []);

  const addToRefs = (el) => {
    if (el && !starRefs.current.includes(el)) {
      starRefs.current.push(el);
    }
  };

  // 🌟 Inject keyframes for twinkle and pulse
  const styles = `
    @keyframes twinkle {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.8; }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 4px rgba(255,255,255,0.3); }
      50% { transform: scale(1.4); box-shadow: 0 0 10px rgba(255,255,255,0.7); }
    }
  `;

  return (
    <>
      <style>{styles}</style>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        {[...Array(25)].map((_, i) => {
          const size = 6 + Math.random() * 12;
          const top = `${Math.random() * 100}%`;
          const left = `${Math.random() * 100}%`;
          const opacity = 0.3 + Math.random() * 0.5;

          const color =
            theme === 'dark'
              ? `hsl(${200 + Math.random() * 80}, 100%, 88%)`
              : `hsl(${30 + Math.random() * 30}, 100%, 70%)`;

          const delay = `${Math.random() * 5}s`;

          return (
            <div
              key={i}
              ref={addToRefs}
              style={{
                position: 'absolute',
                width: `${size}px`,
                height: `${size}px`,
                top,
                left,
                opacity,
                background: color,
                borderRadius: '50%',
                pointerEvents: 'none',
                animation: `twinkle 3s infinite ease-in-out ${delay}, pulse 4s infinite ease-in-out ${delay}`,
              }}
            />
          );
        })}
      </div>
    </>
  );
};

export default BackgroundStars;
