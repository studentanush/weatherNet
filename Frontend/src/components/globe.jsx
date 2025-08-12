import React, { useRef, useEffect } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';


Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5NjY0Y2UyZS02YWZiLTQ1OWYtYjI0MS00NWM5NThjZGE5YjAiLCJpZCI6MzMxMjQ4LCJpYXQiOjE3NTUwMDY5NDV9.VD95vT3swlxKO4ANUezvhLHR7W9lr7bQkvCWvmeidgs'; // Replace this with your real token

const Globe = ({ flyToCoordinates }) => {
  const cesiumContainerRef = useRef(null);
  const viewerRef = useRef(null);
  const rotationHandlerRef = useRef(null); // Used to store the rotation event handler

  // 🚀 Start rotation
  const startRotation = () => {
    const viewer = viewerRef.current;
    if (viewer && !rotationHandlerRef.current) {
      rotationHandlerRef.current = viewer.scene.postRender.addEventListener(() => {
        if (viewerRef.current) {
          const spinRate = 0.005;
          viewerRef.current.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -spinRate);
        }
      });
    }
  };

  // 🛑 Stop rotation
  const stopRotation = () => {
    if (rotationHandlerRef.current) {
      rotationHandlerRef.current(); // Remove listener
      rotationHandlerRef.current = null;
    }
  };

  // 🧱 Initialize Cesium viewer
  useEffect(() => {
    if (!viewerRef.current) {
      const viewer = new Cesium.Viewer(cesiumContainerRef.current, {
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
      });
      

      viewerRef.current = viewer;
      viewer.camera.flyHome(0); // Instantly move to home
      startRotation(); // Start rotating
    }

    return () => {
      if (viewerRef.current) {
        stopRotation();
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // 📍 Respond to location changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || flyToCoordinates === undefined) return;

    const isValidCoords =
      flyToCoordinates &&
      typeof flyToCoordinates.longitude === 'number' &&
      !isNaN(flyToCoordinates.longitude) &&
      typeof flyToCoordinates.latitude === 'number' &&
      !isNaN(flyToCoordinates.latitude);

    if (!isValidCoords) {
      // 🌍 Fly home and restart rotation
      viewer.entities.removeAll();
      viewer.camera.flyHome({
        duration: 2,
        complete: () => {
          if (viewerRef.current) startRotation();
        },
      });
      return;
    }

    // 🧭 Valid coordinates — fly to them
    stopRotation();
    viewer.entities.removeAll();

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        flyToCoordinates.longitude,
        flyToCoordinates.latitude,
        500000 // Altitude
      ),
      duration: 2,
      complete: () => {
        if (viewerRef.current) {
          viewerRef.current.entities.add({
            position: Cesium.Cartesian3.fromDegrees(
              flyToCoordinates.longitude,
              flyToCoordinates.latitude
            ),
            point: {
              pixelSize: 10,
              color: Cesium.Color.RED,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
            },
            label: {
              text: flyToCoordinates.name || 'Location',
              font: '14pt sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -20),
            },
          });
        }
      },
    });
  }, [flyToCoordinates]);

  return (
    <div
      ref={cesiumContainerRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    ></div>
  );
};

export default Globe;
