import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polygon, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import * as turf from '@turf/turf';

import { caseViews as cases, districts, districtCenters } from '../data/schemaSelectors';
import { useSecurity } from '../context/SecurityContext';

/* Feature components */
import DistrictDrawer from '../features/crimeMap/DistrictDrawer';
import TimelineControls from '../features/crimeMap/TimelineControls';

/* Utils */
import {
  KARNATAKA_CENTER, KARNATAKA_ZOOM,
  filterMapCases, buildDistrictInspection, getDistrictCenter, calculateEmergingTrends,
  MAP_LAYERS
} from '../features/crimeMap/crimeMapUtils';

// Bind window.L for Leaflet plugins (leaflet.heat) after all imports
if (typeof window !== 'undefined') {
  window.L = L;
  try {
    require('leaflet.heat');
  } catch (e) {
    // fallback
  }
}

/* ---- CUSTOM UTILITY HOOKS ---- */

function useActiveTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');
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

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function MapInteractionController({ enabled }) {
  const map = useMap();
  useEffect(() => {
    const handlers = [map.dragging, map.scrollWheelZoom, map.doubleClickZoom, map.boxZoom, map.keyboard, map.touchZoom];
    handlers.forEach(handler => {
      if (!handler) return;
      if (enabled) handler.enable();
      else handler.disable();
    });
    if (!enabled) map.setView(KARNATAKA_CENTER, KARNATAKA_ZOOM, { animate: true });
  }, [map, enabled]);
  return null;
}

/* ---- Leaflet sub-components ---- */

function MapZoomTracker({ setZoom }) {
  const map = useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    }
  });
  return null;
}

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    
    const observer = new MutationObserver(() => {
      setTimeout(() => {
        map.invalidateSize();
      }, 200); 
    });
    
    const sidebarEl = document.querySelector('.sidebar');
    if (sidebarEl) {
      observer.observe(sidebarEl, { attributes: true, attributeFilter: ['class'] });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [map]);
  return null;
}

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => { 
    if (center && zoom) map.flyTo(center, zoom, { duration: 1.0 }); 
  }, [center, zoom, map]);
  return null;
}

function HeatmapLayer({ points, mapZoom }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !points?.length) return;

    if (typeof window !== 'undefined' && (!L.heatLayer && !window.L?.heatLayer)) {
      window.L = L;
      try {
        require('leaflet.heat');
      } catch (e) {
        console.error('leaflet.heat initialization error:', e);
      }
    }

    const heatFn = L.heatLayer || (typeof window !== 'undefined' && window.L && window.L.heatLayer);
    if (!heatFn) {
      console.warn('Leaflet heatLayer function unavailable.');
      return;
    }

    // Zoom-adaptive radius and blur calculations
    const radius = Math.max(22, Math.min(48, 60 - (mapZoom * 2.2)));
    const blur = Math.max(15, Math.round(radius * 0.7));

    const gradient = { 
      0.2: '#4c1d95',
      0.4: '#c026d3',
      0.6: '#f97316',
      0.8: '#ef4444',
      1.0: '#fecaca'
    };

    let layer = null;
    try {
      layer = heatFn(points, {
        radius,
        blur,
        minOpacity: 0.35,
        max: 1.0,
        maxZoom: 18,
        gradient
      });
      layer.addTo(map);
    } catch (err) {
      console.error('Error adding heatLayer to map:', err);
    }

    return () => {
      if (map && layer) {
        try {
          map.removeLayer(layer);
        } catch (e) {
          // cleanup fallback
        }
      }
    };
  }, [map, points, mapZoom]);
  return null;
}

const customPinIcon = L.divIcon({
  html: `<div style="background-color: #3b82f6; border: 2px solid #ffffff; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 6px rgba(0,0,0,0.4);"></div>`,
  className: 'custom-pin-icon',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

function MarkerClusterGroup({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !points?.length) return;

    const markers = L.markerClusterGroup({ 
      chunkedLoading: true,
      maxClusterRadius: 45
    });

    points.forEach(p => {
      const desc = p.briefFacts || 'No narrative details.';
      const popupContent = `
        <div style="font-family: monospace; font-size: 11px; padding: 4px;">
          <strong>Case ID: ${p.CaseMasterID || 'N/A'}</strong><br/>
          <strong>Category:</strong> ${p.majorHeadName || 'N/A'}<br/>
          <strong>Type:</strong> ${p.minorHeadName || 'N/A'}<br/>
          <strong>Date:</strong> ${String(p.CrimeRegisteredDate).split(' ')[0]}<br/>
          <strong>Station:</strong> ${p.policeStationName || 'N/A'}<br/>
          <strong>Severity:</strong> ${p.isHeinous ? 'HEINOUS' : 'NON-HEINOUS'}<br/>
          <hr style="border:none; border-top:1px solid #ddd; margin:6px 0;" />
          <strong>Facts:</strong> ${desc.slice(0, 100)}${desc.length > 100 ? '...' : ''}
        </div>
      `;
      const marker = L.marker([p.lat, p.lng], { icon: customPinIcon }).bindPopup(popupContent);
      markers.addLayer(marker);
    });

    map.addLayer(markers);
    return () => map.removeLayer(markers);
  }, [map, points]);
  return null;
}

function ChoroplethLayer({ cells, theme }) {
  const maxCount = Math.max(...cells.map(c => c.count), 1);
  
  return cells.map(cell => {
    const ratio = cell.count / maxCount;
    let color = '#ef4444';
    if (theme === 'dark') {
      if (ratio < 0.25) color = '#1d4ed8'; 
      else if (ratio < 0.5) color = '#059669'; 
      else if (ratio < 0.75) color = '#d97706'; 
    } else {
      if (ratio < 0.25) color = '#93c5fd';
      else if (ratio < 0.5) color = '#34d399';
      else if (ratio < 0.75) color = '#fbbf24';
    }

    const style = {
      fillColor: color,
      color: theme === 'dark' ? '#334155' : '#cbd5e1',
      weight: 1,
      fillOpacity: 0.4,
    };

    const tooltipContent = `
      <div style="font-family: monospace; font-size: 11px;">
        <strong>Grid Cell Incidents: ${cell.count}</strong><br/>
        <hr style="border:none; border-top:1px solid #ddd; margin:4px 0;"/>
        ${Object.entries(cell.categories)
          .map(([cat, count]) => `${cat}: ${count}`)
          .join('<br/>')}
      </div>
    `;

    return (
      <Polygon
        key={cell.id}
        positions={cell.geometry.coordinates[0].map(coord => [coord[1], coord[0]])}
        pathOptions={style}
      >
        <Tooltip sticky html>{tooltipContent}</Tooltip>
      </Polygon>
    );
  });
}

function GraduatedPointsLayer({ cells }) {
  const map = useMap();
  return cells.map(cell => {
    const radius = 6 + Math.sqrt(cell.count) * 2;
    
    let color = '#facc15';
    if (cell.count >= 50) color = '#ef4444';
    else if (cell.count >= 20) color = '#f97316';

    const tooltipContent = `
      <div style="font-family: monospace; font-size: 11px;">
        <strong>Hotspot Density Centroid</strong><br/>
        Volume: ${cell.count} cases<br/>
        <hr style="border:none; border-top:1px solid #ddd; margin:4px 0;"/>
        ${Object.entries(cell.categories)
          .map(([cat, count]) => `${cat}: ${count}`)
          .join('<br/>')}
      </div>
    `;

    return (
      <CircleMarker
        key={`grad_${cell.id}`}
        center={cell.centroid}
        radius={radius}
        pathOptions={{ 
          fillColor: color, 
          color: '#ffffff', 
          weight: 1.5, 
          fillOpacity: 0.65,
          className: 'graduated-symbol-marker'
        }}
        eventHandlers={{
          click: () => {
            map.flyTo(cell.centroid, 13);
          }
        }}
      >
        <Tooltip sticky>{tooltipContent}</Tooltip>
      </CircleMarker>
    );
  });
}

// Custom Styled Zoom Control Overlay matching custom app aesthetics
function ZoomControlOverlay({ overlayBg, overlayBorder }) {
  const map = useMap();
  return (
    <div 
      style={{
        position: 'absolute',
        top: '75px',
        right: '20px',
        zIndex: 1005,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        background: overlayBg,
        backdropFilter: 'blur(6px)',
        border: overlayBorder,
        padding: '4px',
        borderRadius: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}
    >
      <button
        onClick={() => map.zoomIn()}
        style={{
          width: '28px',
          height: '28px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          fontWeight: 'bold',
          fontSize: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '28px',
          minWidth: '28px',
          padding: 0,
          outline: 'none'
        }}
        title="Zoom In"
      >
        +
      </button>
      <div style={{ height: '1px', background: 'var(--border-color)', margin: '2px 4px' }} />
      <button
        onClick={() => map.zoomOut()}
        style={{
          width: '28px',
          height: '28px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          fontWeight: 'bold',
          fontSize: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '28px',
          minWidth: '28px',
          padding: 0,
          outline: 'none'
        }}
        title="Zoom Out"
      >
        −
      </button>
    </div>
  );
}

// Static Horizontal Legend Strip (No popup box)
function MapLegend({ activeLayer, activeVisLayers, theme, overlayBg, overlayBorder }) {
  const opLayerLegendMap = {
    gis_cctv: { label: 'CCTV Grid Camera', color: '#00e676' },
    gis_schools: { label: 'School Location', color: '#1e90ff' },
    emergency: { label: '112 Emergency Call', color: '#ff4d4d' },
    patrols: { label: 'Patrol Unit Coverage', color: '#3b82f6' },
    forecast_tomorrow: { label: "Tomorrow's AI Forecast", color: '#ff4d4d' },
    forecast_week: { label: "Next Week AI Forecast", color: '#ffaa00' },
  };

  const activeOp = opLayerLegendMap[activeLayer];
  const isHeatActive = activeVisLayers?.density || ['overall', 'murder', 'theft', 'women', 'cyber'].includes(activeLayer);

  return (
    <div 
      className="map-legend-strip" 
      style={{
        position: 'absolute',
        top: '160px',
        right: '15px',
        zIndex: 1005,
        background: overlayBg,
        backdropFilter: 'blur(6px)',
        border: overlayBorder,
        padding: '6px 12px',
        borderRadius: '20px',
        fontFamily: 'monospace',
        fontSize: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        pointerEvents: 'auto'
      }}
    >
      <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-primary)', fontSize: '9px', letterSpacing: '0.5px' }}>
        MAP LEGEND:
      </span>

      {activeOp && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', backgroundColor: activeOp.color, border: '1px solid #fff' }} />
          <span style={{ fontWeight: 'bold' }}>{activeOp.label}</span>
        </div>
      )}

      {isHeatActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>Density:</span>
          <div style={{
            height: '8px',
            width: '60px',
            background: 'linear-gradient(to right, #4c1d95, #c026d3, #f97316, #ef4444, #fecaca)',
            borderRadius: '2px'
          }} />
          <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Low → High</span>
        </div>
      )}

      {activeVisLayers?.graduated && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>Tiers:</span>
          <span style={{ color: '#facc15' }}>● Low</span>
          <span style={{ color: '#f97316' }}>● Med</span>
          <span style={{ color: '#ef4444' }}>● High</span>
        </div>
      )}

      {activeVisLayers?.rawPins && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6', border: '1px solid #fff' }} />
          <span>Incident Pin</span>
        </div>
      )}
    </div>
  );
}

// Compact Overlay Dropdown for Coverage and Visualization Modes
function LayerDropdown({
  activeLayer,
  setActiveLayer,
  showAiPredictions,
  setShowAiPredictions,
  activeVisLayers,
  toggleVisLayer,
  overlayBg,
  overlayBorder
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeLayerObj = MAP_LAYERS.find(l => l.id === activeLayer);
  const displayLabel = activeLayerObj ? `Layer: ${activeLayerObj.label}` : 'Select Layer';

  const groups = [
    {
      title: 'Crime Categories',
      items: MAP_LAYERS.slice(0, 5)
    },
    {
      title: 'Operational GIS',
      items: MAP_LAYERS.slice(5, 7).concat(MAP_LAYERS.slice(9, 11))
    },
    {
      title: 'AI Forecasts',
      items: MAP_LAYERS.slice(7, 9)
    }
  ];

  return (
    <div ref={ref} style={{ position: 'absolute', top: '75px', left: '15px', zIndex: 1005 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 14px',
          background: overlayBg,
          backdropFilter: 'blur(4px)',
          border: overlayBorder,
          borderRadius: '20px',
          color: 'var(--text-primary)',
          fontFamily: 'monospace',
          fontSize: '11px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          outline: 'none'
        }}
      >
        <span>{displayLabel}</span>
        <span style={{ fontSize: '9px', opacity: 0.8 }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            background: 'var(--bg-panel, #0f1729)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            width: '250px',
            maxHeight: '380px',
            overflowY: 'auto',
            padding: '8px 0',
            fontFamily: 'monospace',
            zIndex: 1100
          }}
        >
          {groups.map(g => (
            <div key={g.title}>
              <div style={{ padding: '6px 12px 4px', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                {g.title}
              </div>
              {g.items.map(item => {
                const isSelected = activeLayer === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveLayer(item.id);
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      background: isSelected ? 'var(--accent-primary, #3b82f6)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 120ms'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    {item.label}
                  </div>
                );
              })}
            </div>
          ))}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />
          
          <div style={{ padding: '4px 16px 8px', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Visualization Modes
          </div>
          {[
            { key: 'density', label: 'Heat Density Overlay' },
            { key: 'graduated', label: 'Graduated Symbols' },
            { key: 'choropleth', label: 'Choropleth Grid' },
            { key: 'rawPins', label: 'Raw Incident Pins' }
          ].map(item => (
            <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.label}</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={activeVisLayers[item.key]}
                  onChange={() => toggleVisLayer(item.key)}
                />
                <span className={`toggle-track ${activeVisLayers[item.key] ? 'active' : ''}`}>
                  <span className="toggle-thumb" />
                </span>
              </label>
            </div>
          ))}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>AI Predictions</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showAiPredictions}
                onChange={e => setShowAiPredictions(e.target.checked)}
              />
              <span className={`toggle-track ${showAiPredictions ? 'active' : ''}`}>
                <span className="toggle-thumb" />
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Main Page ---- */

function CrimeMap({ selectedDistrict: globalDistrict, selectedCrimeType: globalCrimeType }) {
  const { isCommandMode } = useSecurity();
  const theme = useActiveTheme();

  /* Local filter state */
  const [localDistrict, setLocalDistrict] = useState('all');
  const [localCrimeTypes, setLocalCrimeTypes] = useState(['all']);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeOfDayFilter, setTimeOfDayFilter] = useState('all');

  /* Map state */
  const [activeLayer, setActiveLayer] = useState('overall');
  const [showAiPredictions, setShowAiPredictions] = useState(false);
  const [inspectedDistrict, setInspectedDistrict] = useState(null);
  const [mapCenter, setMapCenter] = useState(KARNATAKA_CENTER);
  const [mapZoom, setMapZoom] = useState(KARNATAKA_ZOOM);
  const [liveMapZoom, setLiveMapZoom] = useState(KARNATAKA_ZOOM);
  const [mapInteractive, setMapInteractive] = useState(false);

  /* Visualization Mode checkboxes (Choropleth and Graduated are disabled by default) */
  const [activeVisLayers, setActiveVisLayers] = useState({
    density: true,
    graduated: false,
    choropleth: false,
    rawPins: false
  });

  const toggleVisLayer = (key) => {
    setActiveVisLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  /* Timeline ranges with debouncer */
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(30);
  const debouncedStartIndex = useDebounce(startIndex, 150);
  const debouncedEndIndex = useDebounce(endIndex, 150);

  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleEscape = event => {
      if (event.key === 'Escape') {
        setMapInteractive(false);
        setMapCenter(KARNATAKA_CENTER);
        setMapZoom(KARNATAKA_ZOOM);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    if (globalDistrict !== 'all') setLocalDistrict(globalDistrict);
    if (globalCrimeType !== 'all') setLocalCrimeTypes([String(globalCrimeType)]);
  }, [globalDistrict, globalCrimeType]);

  // Animate active time window
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setStartIndex(prevStart => {
          const size = endIndex - prevStart;
          const nextStart = prevStart + 1;
          const nextEnd = nextStart + size;
          if (nextEnd > 30) {
            setIsPlaying(false);
            return prevStart;
          }
          setEndIndex(nextEnd);
          return nextStart;
        });
      }, 1200);
    } else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [isPlaying, endIndex]);

  /* Data Scoping */
  const districtId = localDistrict !== 'all' ? localDistrict : globalDistrict;

  const emergingTrends = useMemo(() => {
    return calculateEmergingTrends(cases, districts);
  }, []);

  const baseFilteredCases = useMemo(() => {
    return filterMapCases(cases, {
      districtId, 
      crimeHeadId: 'all', 
      severityFilter, 
      statusFilter, 
      timelineIndex: 30, 
      activeLayer, 
      timeOfDayFilter,
    });
  }, [districtId, severityFilter, statusFilter, activeLayer, timeOfDayFilter]);

  const categoryFilteredCases = useMemo(() => {
    if (localCrimeTypes.includes('all')) return baseFilteredCases;
    return baseFilteredCases.filter(c => localCrimeTypes.includes(String(c.CrimeMajorHeadID)));
  }, [baseFilteredCases, localCrimeTypes]);

  const timelineBounds = useMemo(() => {
    const times = cases.map(c => new Date(String(c.CrimeRegisteredDate).replace(' ', 'T')).getTime()).filter(Number.isFinite);
    return {
      min: times.length ? new Date(Math.min(...times)) : new Date(),
      max: times.length ? new Date(Math.max(...times)) : new Date(),
    };
  }, []);

  // Extract total monthly counts for timeline sparkline
  const timelineHistogram = useMemo(() => {
    const counts = new Array(31).fill(0);
    const allTimes = cases.map(c => new Date(String(c.CrimeRegisteredDate).replace(' ', 'T')).getTime()).filter(Boolean);
    const maxTime = allTimes.length ? Math.max(...allTimes) : Date.now();
    const minTime = allTimes.length ? Math.min(...allTimes) : Date.now();
    const dateRangeMs = maxTime - minTime;

    categoryFilteredCases.forEach(c => {
      const t = new Date(String(c.CrimeRegisteredDate).replace(' ', 'T')).getTime();
      if (isNaN(t) || t < minTime || t > maxTime) return;
      const index = Math.min(30, Math.floor(((t - minTime) / dateRangeMs) * 30));
      counts[index]++;
    });
    return counts;
  }, [categoryFilteredCases]);

  // Apply range window filter locally
  const filteredCases = useMemo(() => {
    const allTimes = cases.map(c => new Date(String(c.CrimeRegisteredDate).replace(' ', 'T')).getTime()).filter(Boolean);
    const maxTime = allTimes.length ? Math.max(...allTimes) : Date.now();
    const minTime = allTimes.length ? Math.min(...allTimes) : Date.now();
    const dateRangeMs = maxTime - minTime;

    const windowMin = minTime + (dateRangeMs * (debouncedStartIndex / 30));
    const windowMax = minTime + (dateRangeMs * (debouncedEndIndex / 30));

    return categoryFilteredCases.filter(c => {
      const t = new Date(String(c.CrimeRegisteredDate).replace(' ', 'T')).getTime();
      return t >= windowMin && t <= windowMax;
    });
  }, [categoryFilteredCases, debouncedStartIndex, debouncedEndIndex]);

  // Secure coordinates with metadata
  const secureCases = useMemo(() => {
    return filteredCases.map(c => {
      const lat = isCommandMode ? c.latitude : Number(Number(c.latitude).toFixed(2));
      const lng = isCommandMode ? c.longitude : Number(Number(c.longitude).toFixed(2));
      return {
        ...c,
        lat,
        lng
      };
    });
  }, [filteredCases, isCommandMode]);

  // Leaflet.heat performs proximity aggregation itself. Preserve every incident
  // so nearby cases form hotspots; exact-coordinate grouping made unique points
  // look uniformly weighted and hid the real district/city concentrations.
  const weightedHeatPoints = useMemo(() => {
    return secureCases
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map(p => [p.lat, p.lng, p.isHeinous ? 1 : 0.62]);
  }, [secureCases]);

  // Client-side spatial binning using Turf.js squareGrid
  const binnedGridCells = useMemo(() => {
    if (!secureCases.length) return [];
    
    const lats = secureCases.map(p => p.lat);
    const lngs = secureCases.map(p => p.lng);
    const minLat = Math.min(...lats) - 0.2;
    const maxLat = Math.max(...lats) + 0.2;
    const minLng = Math.min(...lngs) - 0.2;
    const maxLng = Math.max(...lngs) + 0.2;
    const bbox = [minLng, minLat, maxLng, maxLat];

    const grid = turf.squareGrid(bbox, 30, { units: 'kilometers' });
    const turfPoints = turf.featureCollection(secureCases.map(p => turf.point([p.lng, p.lat], { case: p })));

    const cells = [];
    grid.features.forEach((cell, i) => {
      const ptsInCell = turf.pointsWithinPolygon(turfPoints, cell);
      const count = ptsInCell.features.length;
      if (count > 0) {
        const categories = {};
        ptsInCell.features.forEach(f => {
          const name = f.properties.case.majorHeadName || 'General';
          categories[name] = (categories[name] || 0) + 1;
        });
        
        const centroid = turf.centroid(cell);
        
        cells.push({
          id: `cell_${i}`,
          geometry: cell.geometry,
          count,
          categories,
          centroid: [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]], 
        });
      }
    });

    return cells;
  }, [secureCases]);

  const handleInspect = (name, id) => {
    setInspectedDistrict(buildDistrictInspection(name, id));
    const center = getDistrictCenter(id);
    if (center) { 
      setMapCenter([center.lat, center.lng]); 
      setMapZoom(10); 
    }
  };

  // Dynamic light/dark styling configurations
  const isDark = theme === 'dark';
  const overlayBg = isDark ? 'rgba(20, 33, 50, 0.9)' : 'rgba(255, 255, 255, 0.95)';
  const overlayBorder = isDark ? '1px solid rgba(173, 193, 214, 0.16)' : '1px solid rgba(15, 23, 42, 0.12)';

  return (
    <div 
      className="page-content map-page"
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '0px', 
        overflow: 'hidden',
        maxWidth: 'none',
        margin: '0'
      }}
    >
      {/* Spatiotemporal Trends Box repositioned to top-right below filters bar */}
      {emergingTrends.length > 0 && (
        <div style={{
          padding: '6px 12px', background: overlayBg,
          border: overlayBorder, borderRadius: '4px',
          display: 'flex', flexDirection: 'column', gap: '2px',
          position: 'absolute', top: '16px', right: '70px', zIndex: 1005,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', backdropFilter: 'blur(4px)',
          width: '240px', pointerEvents: 'auto', color: 'var(--text-primary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-danger)', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-danger)', animation: 'tickerPulse 1.2s infinite' }} />
            Emerging Trend Alerts:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '9px', color: 'var(--text-secondary)' }}>
            {emergingTrends.slice(0, 2).map((trend, idx) => (
              <span
                key={idx}
                onClick={() => handleInspect(trend.districtName, trend.districtId)}
                style={{ background: 'var(--bg-panel-alt)', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
              >
                📍 <strong>{trend.districtName}</strong>: <strong style={{ color: 'var(--accent-danger)' }}>+{trend.pctChange}%</strong> spike
              </span>
            ))}
          </div>
        </div>
      )}

      <div 
        className="map-workspace" 
        style={{ 
          display: 'flex', 
          flex: 1, 
          position: 'relative', 
          height: '100%', 
          width: '100%',
          overflow: 'hidden'
        }}
      >
        <div 
          className="map-container-wrap" 
          style={{ 
            position: 'relative', 
            width: '100%', 
            height: '100%',
            flex: 1
          }}
        >
          {/* FLOATING OVERLAY CONTROLS */}
          <LayerDropdown
            activeLayer={activeLayer} setActiveLayer={setActiveLayer}
            showAiPredictions={showAiPredictions} setShowAiPredictions={setShowAiPredictions}
            activeVisLayers={activeVisLayers} toggleVisLayer={toggleVisLayer}
            overlayBg={overlayBg} overlayBorder={overlayBorder}
          />

          <MapLegend activeLayer={activeLayer} activeVisLayers={activeVisLayers} theme={theme} overlayBg={overlayBg} overlayBorder={overlayBorder} />

          <TimelineControls 
            startIndex={startIndex} setStartIndex={setStartIndex}
            endIndex={endIndex} setEndIndex={setEndIndex}
            isPlaying={isPlaying} setIsPlaying={setIsPlaying}
            histogram={timelineHistogram}
            theme={theme}
            minDate={timelineBounds.min}
            maxDate={timelineBounds.max}
            visibleCount={filteredCases.length}
          />

          {!mapInteractive ? (
            <button
              type="button"
              className="map-interaction-gate"
              onClick={() => setMapInteractive(true)}
              aria-label="Activate map navigation"
              style={{
                position: 'absolute', inset: 0, zIndex: 900, border: 'none',
                background: 'transparent', cursor: 'pointer', padding: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '11px 18px', borderRadius: 9, background: overlayBg,
                border: overlayBorder, boxShadow: '0 8px 24px rgba(0,0,0,.28)',
                color: 'var(--text-primary)', backdropFilter: 'blur(8px)',
              }}>
                <strong style={{ fontSize: 12, letterSpacing: '.04em' }}>Click to explore the map</strong>
                <small style={{ fontSize: 9, color: 'var(--text-muted)' }}>Page scrolling is currently enabled</small>
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMapInteractive(false);
                setMapCenter(KARNATAKA_CENTER);
                setMapZoom(KARNATAKA_ZOOM);
              }}
              style={{
                position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1008,
                padding: '7px 12px', borderRadius: 7, background: overlayBg, border: overlayBorder,
                color: 'var(--text-primary)', boxShadow: '0 5px 16px rgba(0,0,0,.24)',
                fontSize: 10, fontWeight: 700, cursor: 'pointer',
              }}
              title="Press Escape to exit map navigation"
            >
              Exit map navigation (Esc)
            </button>
          )}

          {/* Leaflet Map container with custom zoom overlays */}
          <MapContainer 
            center={KARNATAKA_CENTER} 
            zoom={KARNATAKA_ZOOM} 
            style={{ height: '100%', width: '100%', zIndex: 1 }} 
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            boxZoom={false}
            keyboard={false}
          >
            <TileLayer
              key={theme}
              url={theme === 'dark' 
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'}
              attribution='&copy; CARTO'
            />
            <MapController center={mapCenter} zoom={mapZoom} />
            <MapInteractionController enabled={mapInteractive} />
            <MapZoomTracker setZoom={setLiveMapZoom} />
            <MapInvalidator />
            <ZoomControlOverlay overlayBg={overlayBg} overlayBorder={overlayBorder} />

            {/* True Kernel Density Estimation Layer */}
            {(activeVisLayers.density || ['overall', 'murder', 'theft', 'women', 'cyber'].includes(activeLayer)) && weightedHeatPoints.length > 0 && (
              <HeatmapLayer points={weightedHeatPoints} mapZoom={liveMapZoom} />
            )}

            {/* Choropleth Grid Layer */}
            {activeVisLayers.choropleth && liveMapZoom < 9 && binnedGridCells.length > 0 && (
              <ChoroplethLayer cells={binnedGridCells} theme={theme} />
            )}

            {/* Graduated Points Layer */}
            {activeVisLayers.graduated && liveMapZoom >= 9 && liveMapZoom < 13 && binnedGridCells.length > 0 && (
              <GraduatedPointsLayer cells={binnedGridCells} />
            )}

            {/* Raw Incident Pins Cluster Layer */}
            {activeVisLayers.rawPins && liveMapZoom >= 13 && secureCases.length > 0 && (
              <MarkerClusterGroup points={secureCases} />
            )}

            {/* Spatiotemporal overlay hours */}
            {timeOfDayFilter !== 'all' && secureCases.map((p, idx) => {
              let color = '#ffaa00'; 
              if (timeOfDayFilter === 'night') color = '#9b5de5'; 
              return (
                <CircleMarker
                  key={`spatio_${idx}`}
                  center={[p.lat, p.lng]}
                  radius={10}
                  pathOptions={{ fillColor: color, color: '#fff', weight: 1, fillOpacity: 0.7 }}
                />
              );
            })}

            {/* AI Crime Forecast Overlay */}
            {activeLayer === 'forecast_tomorrow' && secureCases.slice(0, 18).map((p, idx) => (
              <CircleMarker
                key={`fore_tom_${idx}`}
                center={[p.lat + 0.005 * Math.sin(idx), p.lng + 0.005 * Math.cos(idx)]}
                radius={24}
                pathOptions={{ fillColor: '#ff4d4d', color: '#ff4d4d', weight: 1.5, dashArray: '4, 4', fillOpacity: 0.2 }}
              />
            ))}

            {activeLayer === 'forecast_week' && secureCases.slice(0, 24).map((p, idx) => (
              <CircleMarker
                key={`fore_week_${idx}`}
                center={[p.lat + 0.008 * Math.cos(idx), p.lng + 0.008 * Math.sin(idx)]}
                radius={36}
                pathOptions={{ fillColor: '#ffaa00', color: '#ffaa00', weight: 1.5, dashArray: '5, 5', fillOpacity: 0.15 }}
              />
            ))}

            {/* GIS CCTV Nodes */}
            {activeLayer === 'gis_cctv' && secureCases.slice(0, 30).map((p, idx) => (
              <CircleMarker
                key={`cctv_${idx}`}
                center={[p.lat + 0.002, p.lng - 0.002]}
                radius={5}
                pathOptions={{ fillColor: '#00e676', color: '#fff', weight: 1, fillOpacity: 0.9 }}
              />
            ))}

            {/* GIS Schools */}
            {activeLayer === 'gis_schools' && secureCases.slice(0, 15).map((p, idx) => (
              <CircleMarker
                key={`school_${idx}`}
                center={[p.lat - 0.003, p.lng + 0.003]}
                radius={7}
                pathOptions={{ fillColor: '#1e90ff', color: '#fff', weight: 1, fillOpacity: 0.9 }}
              />
            ))}

            {activeLayer === 'emergency' && districts.map((d, i) => {
              const c = districtCenters[d.SourceDistrictID || d.DistrictID]; if (!c) return null;
              return <CircleMarker key={i} center={[c.lat + (i % 2 ? 0.05 : -0.05), c.lng + (i % 3 ? 0.03 : -0.03)]} radius={6} pathOptions={{ fillColor: '#ff4d4d', color: '#ff4d4d', weight: 1, fillOpacity: 0.8 }} />;
            })}

            {activeLayer === 'patrols' && districts.map((d, i) => {
              const c = districtCenters[d.SourceDistrictID || d.DistrictID]; if (!c) return null;
              return <CircleMarker key={i} center={[c.lat + 0.02, c.lng - 0.02]} radius={7} pathOptions={{ fillColor: 'var(--accent-primary)', color: '#fff', weight: 1.5, fillOpacity: 0.9 }} />;
            })}

            {showAiPredictions && districts.slice(0, 3).map(d => {
              const c = districtCenters[d.SourceDistrictID || d.DistrictID]; if (!c) return null;
              return <CircleMarker key={d.DistrictID} center={[c.lat, c.lng]} radius={45} pathOptions={{ fillColor: '#9b5de5', color: '#9b5de5', weight: 1.5, dashArray: '5, 8', fillOpacity: 0.12 }} />;
            })}

            {districts.map(d => {
              const c = districtCenters[d.SourceDistrictID || d.DistrictID]; if (!c) return null;
              return <CircleMarker key={d.DistrictID} center={[c.lat, c.lng]} radius={3} pathOptions={{ color: 'transparent', fillColor: 'transparent' }} eventHandlers={{ click: () => handleInspect(d.DistrictName, d.DistrictID) }} />;
            })}
          </MapContainer>
        </div>

        <DistrictDrawer data={inspectedDistrict} isCommandMode={isCommandMode} onClose={() => setInspectedDistrict(null)} />
      </div>
    </div>
  );
}

export default CrimeMap;
