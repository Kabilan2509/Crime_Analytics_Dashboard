import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const GEOJSON_TO_DB_MAP = {
  'Bangalore': 1,
  'Bangalore Rural': 2,
  'Mysore': 3,
  'Dakshina Kannada': 4,
  'Dharwad': 5, // Maps to Hubli-Dharwad
  'Belgaum': 6, // Belagavi
  'Gulbarga': 7, // Kalaburagi
  'Bellary': 8, // Ballari
  'Raichur': 9,
  'Tumkur': 10, // Tumakuru
  'Shimoga': 11, // Shivamogga
  'Davanagere': 12,
  'Hassan': 13,
  'Mandya': 14,
  'Chitradurga': 15,
  'Kolar': 16,
  'Chikmagalur': 17, // Chikkamagaluru
  'Udupi': 18,
  'Uttara Kannada': 19,
  'Bidar': 20,
  'Gadag': 21,
  'Haveri': 22,
  'Koppal': 23,
  'Bagalkot': 24,
  'Yadgir': 25,
  'Chamrajnagar': 26, // Chamarajanagar
  'Kodagu': 27,
  'Ramanagara': 28,
  'Chikkaballapura': 29,
  'Bijapur': 30 // Vijayapura
};

function useActiveTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      setTheme(currentTheme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

const KARNATAKA_CENTER = [14.65, 75.9];
const KARNATAKA_ZOOM = 6.2;

function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function KarnatakaMap({ cases, selectedDistrict, setSelectedDistrict }) {
  const theme = useActiveTheme();
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch GeoJSON at runtime from public CDN
  useEffect(() => {
    let active = true;
    fetch('https://raw.githubusercontent.com/shuklaneerajdev/IndiaStateTopojsonFiles/master/Karnataka.geojson')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (active) {
          setGeoJsonData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          console.error('Failed to load Karnataka GeoJSON:', err);
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, []);

  // Compute case counts per district for severity shading
  const districtCounts = useMemo(() => {
    const counts = {};
    cases.forEach(c => {
      if (c.districtID) {
        counts[c.districtID] = (counts[c.districtID] || 0) + 1;
      }
    });
    return counts;
  }, [cases]);

  // Find max count to scale opacity
  const maxCount = useMemo(() => {
    const values = Object.values(districtCounts);
    return values.length > 0 ? Math.max(...values) : 1;
  }, [districtCounts]);

  const styleGeoJson = (feature) => {
    const distName = feature.properties.Dist_Name;
    const dbId = GEOJSON_TO_DB_MAP[distName];
    const count = districtCounts[dbId] || 0;
    
    // Scale opacity based on case volume ratio
    const opacity = maxCount > 0 ? (count / maxCount) : 0;
    const isSelected = selectedDistrict && String(dbId) === String(selectedDistrict);
    
    return {
      fillColor: '#2563eb', // Informational primary blue
      fillOpacity: count > 0 ? (0.15 + opacity * 0.7) : 0.03,
      color: isSelected ? (theme === 'dark' ? '#edf3fb' : '#1e293b') : (theme === 'dark' ? '#8fa2b8' : '#cbd5e1'),
      weight: isSelected ? 2.5 : 1,
    };
  };

  const onEachFeature = (feature, layer) => {
    const distName = feature.properties.Dist_Name;
    const dbId = GEOJSON_TO_DB_MAP[distName];
    const count = districtCounts[dbId] || 0;

    layer.bindTooltip(`<strong>${distName}</strong><br/>Workload: ${count} FIRs`, {
      sticky: true,
      className: 'map-tooltip'
    });

    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({
          color: theme === 'dark' ? '#edf3fb' : '#1e293b',
          weight: 2,
          fillOpacity: count > 0 ? 0.9 : 0.15
        });
      },
      mouseout: (e) => {
        const l = e.target;
        l.setStyle(styleGeoJson(feature));
      },
      click: () => {
        if (dbId) {
          // If clicked the currently selected one, clear filter, otherwise set it
          const nextDistrict = String(dbId) === String(selectedDistrict) ? 'all' : String(dbId);
          setSelectedDistrict(nextDistrict);
        }
      }
    });
  };

  if (loading) {
    return (
      <div style={{ height: '100%', minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-panel-alt)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontFamily: 'Consolas, monospace', fontSize: '12px' }}>
        <span>Ingesting Geographic Overlays...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100%', minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-panel-alt)', border: '1px solid var(--border-color)', color: 'var(--accent-danger)', fontFamily: 'Consolas, monospace', fontSize: '12px', padding: '20px', textAlign: 'center' }}>
        <span>GIS Fetch Bypass Required: Failed to load map coordinates ({error})</span>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <style>{`
        .map-tooltip {
          background-color: var(--bg-panel) !important;
          border: 1px solid var(--border-color) !important;
          color: var(--text-primary) !important;
          font-family: Consolas, monospace !important;
          font-size: 11px !important;
          box-shadow: none !important;
          border-radius: 0px !important;
        }
        .leaflet-container {
          background: #faf8f5 !important;
        }
        [data-theme="dark"] .leaflet-container,
        .theme-dark .leaflet-container {
          background: #0B0E11 !important;
        }
      `}</style>
      <MapContainer 
        center={KARNATAKA_CENTER} 
        zoom={KARNATAKA_ZOOM} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <ResizeMap />
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {geoJsonData && (
          <GeoJSON 
            data={geoJsonData} 
            style={styleGeoJson} 
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}

export default KarnatakaMap;
