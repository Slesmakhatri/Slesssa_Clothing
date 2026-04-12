import { useEffect, useRef, useState } from 'react';

const LEAFLET_CSS_ID = 'slessaa-leaflet-css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

let leafletLoaderPromise = null;

function ensureLeafletCss() {
  if (document.getElementById(LEAFLET_CSS_ID)) return;
  const link = document.createElement('link');
  link.id = LEAFLET_CSS_ID;
  link.rel = 'stylesheet';
  link.href = LEAFLET_CSS_URL;
  document.head.appendChild(link);
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletLoaderPromise) {
    ensureLeafletCss();
    leafletLoaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = LEAFLET_JS_URL;
      script.async = true;
      script.onload = () => resolve(window.L);
      script.onerror = () => reject(new Error('Leaflet failed to load.'));
      document.body.appendChild(script);
    });
  }
  return leafletLoaderPromise;
}

function TailorMapPicker({ tailors, selectedTailorId, onSelectTailor, customerLocation }) {
  const mapNodeRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapLayerRef = useRef(null);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    let active = true;

    loadLeaflet()
      .then((L) => {
        if (!active || !mapNodeRef.current || mapInstanceRef.current) return;
        const map = L.map(mapNodeRef.current, {
          zoomControl: true,
          scrollWheelZoom: true
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        map.setView([27.7172, 85.324], 11);
        mapInstanceRef.current = map;
        mapLayerRef.current = L.layerGroup().addTo(map);
      })
      .catch(() => {
        if (active) {
          setMapError('Map tiles could not load. The nearby tailor list still works for demo use.');
        }
      });

    return () => {
      active = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        mapLayerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!window.L || !mapInstanceRef.current || !mapLayerRef.current) return;

    const L = window.L;
    const map = mapInstanceRef.current;
    const layerGroup = mapLayerRef.current;
    layerGroup.clearLayers();

    const bounds = [];

    if (customerLocation?.latitude != null && customerLocation?.longitude != null) {
      const customerMarker = L.circleMarker([customerLocation.latitude, customerLocation.longitude], {
        radius: 10,
        color: '#14515b',
        weight: 3,
        fillColor: '#1d7c8a',
        fillOpacity: 0.95
      })
        .bindPopup(`<strong>Your location</strong><br/>${customerLocation.label || 'Current reference point'}`);
      customerMarker.addTo(layerGroup);
      bounds.push([customerLocation.latitude, customerLocation.longitude]);
    }

    tailors.forEach((tailor) => {
      if (tailor.latitude == null || tailor.longitude == null) return;
      const active = tailor.user === selectedTailorId;
      const marker = L.circleMarker([tailor.latitude, tailor.longitude], {
        radius: active ? 11 : 8,
        color: active ? '#ae3d5b' : '#d98e04',
        weight: active ? 3 : 2,
        fillColor: active ? '#c8526d' : '#f0b132',
        fillOpacity: 0.9
      }).bindPopup(
        `<strong>${tailor.full_name || tailor.user_detail?.full_name || tailor.user_detail?.email || 'Tailor'}</strong><br/>${tailor.location_name || tailor.address || tailor.city || 'Tailor studio'}`
      );
      marker.on('click', () => onSelectTailor?.(tailor));
      marker.addTo(layerGroup);
      bounds.push([tailor.latitude, tailor.longitude]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 12);
      return;
    }
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [28, 28] });
    }
  }, [customerLocation, onSelectTailor, selectedTailorId, tailors]);

  return (
    <div className="tailor-map-shell">
      <div ref={mapNodeRef} className="tailor-map-canvas" />
      {mapError ? <div className="alert alert-warning mb-0 mt-3">{mapError}</div> : null}
    </div>
  );
}

export default TailorMapPicker;
