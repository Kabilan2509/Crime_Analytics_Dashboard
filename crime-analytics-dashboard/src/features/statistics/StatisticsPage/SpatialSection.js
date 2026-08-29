import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip } from 'recharts';
import { districtCenters } from '../../../data/schemaSelectors';
import 'leaflet/dist/leaflet.css';

function SpatialSection({ spatialData, theme, onDistrictClick }) {
  const { districts = [], points = [] } = spatialData;
  const [mapMode, setMapMode] = useState('choropleth'); // 'choropleth' vs 'point'

  // Map center: center of Karnataka
  const mapCenter = [14.8500, 75.8000];
  const mapZoom = 6.5;

  // Filter districts that have cases to calculate average rate
  const activeDistricts = districts.filter(d => d.count > 0);
  const stateAvgRate = activeDistricts.length > 0
    ? parseFloat((activeDistricts.reduce((sum, d) => sum + d.rate, 0) / activeDistricts.length).toFixed(1))
    : 0;

  // Top 5 hotspots
  const topHotspots = [...districts]
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  // Helper for color scale based on crime rate
  const getIntensityColor = (rate) => {
    // Range roughly 1.0 to 10.0 per 100k in our seeds
    if (rate < 2.0) return '#b9ddf3';
    if (rate < 5.0) return '#6ec9de';
    if (rate < 8.0) return '#3897d8';
    return '#ff4d4d'; // Heinous / critical hotspot
  };

  const handleDistrictSelect = (dId) => {
    onDistrictClick(String(dId));
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="spatial-section" style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
      gap: '20px',
      marginBottom: '24px'
    }}>
      {/* 6a. Crime Intensity Map (Choropleth/Bubble / Point Heatmap) */}
      <article className="card" style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: "'Source Sans 3', sans-serif", fontSize: '18px', color: 'var(--text-primary)' }}>Crime Intensity Map</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click a district to drill down into localized reports</span>
          </div>

          {/* Toggle Map Mode */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-panel-alt)',
            borderRadius: '6px',
            padding: '2px',
            border: '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              onClick={() => setMapMode('choropleth')}
              style={{
                background: mapMode === 'choropleth' ? 'var(--accent-primary)' : 'transparent',
                color: mapMode === 'choropleth' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                minHeight: '26px',
                minWidth: 'auto',
                cursor: 'pointer'
              }}
            >
              Choropleth Scale
            </button>
            <button
              type="button"
              onClick={() => setMapMode('point')}
              style={{
                background: mapMode === 'point' ? 'var(--accent-primary)' : 'transparent',
                color: mapMode === 'point' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                minHeight: '26px',
                minWidth: 'auto',
                cursor: 'pointer'
              }}
            >
              Incident Points
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div style={{ height: '360px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', zIndex: 1 }}>
          <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer
              key={theme}
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {/* Render bubbles for district aggregates */}
            {mapMode === 'choropleth' && districts.map(d => {
              const coords = districtCenters[d.id];
              if (!coords || d.count === 0) return null;
              
              // dynamic bubble size
              const radius = Math.min(24, Math.max(7, 4 + Math.sqrt(d.count) * 1.5));
              const fillColor = getIntensityColor(d.rate);

              return (
                <CircleMarker
                  key={d.id}
                  center={[coords.lat, coords.lng]}
                  radius={radius}
                  fillColor={fillColor}
                  color={theme === 'dark' ? '#1e293b' : '#ffffff'}
                  weight={1.5}
                  fillOpacity={0.65}
                  eventHandlers={{
                    click: () => handleDistrictSelect(d.id)
                  }}
                >
                  <Tooltip sticky>
                    <div style={{ fontFamily: 'inherit', fontSize: '12px', padding: '2px' }}>
                      <strong>{d.name}</strong><br/>
                      Incidents: {d.count}<br/>
                      Rate (per 100k): {d.rate}
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

            {/* Render exact coordinate points */}
            {mapMode === 'point' && points.map(pt => (
              <CircleMarker
                key={pt.id}
                center={[pt.lat, pt.lng]}
                radius={4}
                fillColor="#ff4d4d"
                color="#ffffff"
                weight={0.5}
                fillOpacity={0.8}
              >
                <Popup>
                  <div style={{ fontFamily: 'inherit', fontSize: '11px' }}>
                    <strong>FIR No: FIR-{pt.id}</strong><br/>
                    District: {pt.district}<br/>
                    Category: {pt.category}<br/>
                    Date: {pt.date}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Map Color Scale Legend */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '8px 10px',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
          }}>
            <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Crime Rate (per 100k)</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ width: '10px', height: '10px', background: '#b9ddf3', borderRadius: '2px' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-primary)' }}>&lt; 2.0</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ width: '10px', height: '10px', background: '#6ec9de', borderRadius: '2px' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-primary)' }}>2.0 - 5.0</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ width: '10px', height: '10px', background: '#3897d8', borderRadius: '2px' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-primary)' }}>5.0 - 8.0</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ width: '10px', height: '10px', background: '#ff4d4d', borderRadius: '2px' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-primary)' }}>&gt; 8.0 (Critical)</span>
            </div>
          </div>
        </div>
      </article>

      {/* 6b. Top 5 Hotspot Districts (Horizontal Bar) */}
      <article className="card" style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontFamily: "'Source Sans 3', sans-serif", fontSize: '18px', color: 'var(--text-primary)' }}>Top 5 Hotspot Districts</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Districts ranked by rate. State average: <strong style={{ color: 'var(--accent-primary)' }}>{stateAvgRate}</strong> per 100k.
          </span>
        </div>

        <div className="chart-container" style={{ width: '100%', height: '340px', display: 'flex', alignItems: 'center' }}>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={topHotspots}
              layout="vertical"
              margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
            >
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} tickLine={false} width={100} />
              <ChartTooltip
                contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '12px' }}
              />
              <Bar dataKey="rate" name="Crime Rate" radius={[0, 4, 4, 0]}>
                {topHotspots.map((entry, index) => {
                  const aboveAvg = entry.rate > stateAvgRate;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={aboveAvg ? 'var(--accent-danger)' : 'var(--chart-blue)'}
                      style={{
                        stroke: aboveAvg ? 'rgba(255, 77, 77, 0.4)' : 'transparent',
                        strokeWidth: aboveAvg ? 2 : 0
                      }}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <style>{`
        @media (max-width: 900px) {
          #spatial-section {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default SpatialSection;
