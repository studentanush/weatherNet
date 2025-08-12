import React, { useRef, useEffect } from "react";
import Globe from "react-globe.gl";

export default function GlobeWithSunlight({ lat, lon }) {
  const globeEl = useRef();

  // Calculate sunlight position from time
  const getSunPosition = () => {
    const now = new Date();
    const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const lng = (minutes / 1440) * 360 - 180; // UTC → longitude
    return { lat: 0, lng }; // Sun is always on equator for simplicity
  };

  // Pulse effect for marker
  const markerSize = (t) => 1 + Math.sin(t / 200) * 0.5;

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.4;
      globeEl.current.pointOfView({ lat: lat, lng: lon, altitude: 2.5 }, 1000);
    }
  }, [lat, lon]);

  // Sun position marker
  const sunPos = getSunPosition();

  return (
    <div style={{ height: "500px", width: "100%" }}>
      <Globe
        ref={globeEl}
globeImageUrl="https://unpkg.com/three-globe/example/img/earth-dark.jpg"
backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"

        pointsData={[
          {
            lat,
            lng: lon,
            size: 1,
            color: "red",
            label: "Your Location",
          },
          {
            lat: sunPos.lat,
            lng: sunPos.lng,
            size: 1.2,
            color: "yellow",
            label: "Sun Position",
          },
        ]}
        pointAltitude="size"
        pointColor="color"
        pointRadius={markerSize(Date.now())}
      />
    </div>
  );
}
