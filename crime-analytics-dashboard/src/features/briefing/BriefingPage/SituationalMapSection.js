import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as MapTooltip } from 'react-leaflet';
import { MdMap, MdWarning } from 'react-icons/md';
import { districtCenters } from '../../../data/schemaSelectors';

function SituationalMapSection({ mapData, theme, onDistrictClick }) {
  const { districtsRisk = [], hotspots = [], pins = [] } = mapData;

  const handleDistrictSelect = (districtID) => {
    onDistrictClick(districtID);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const mapCenter = [14.85, 75.8]; // Karnataka center
  const mapZoom = 6;

  // Determine map tiles
  const isDark = theme === 'dark';
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const handleOpenFullGis = () => {
    alert('Opening Full GIS Intelligence Map...');
    window.location.hash = '#/map';
  };

  return (
    <div id="map-brief-section" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '20px',
      marginBottom: '24px'
    }} className="situational-layout">
      {/* 9a. District Risk Map */}
      <article className="card" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '420px',
        margin: 0
      }}>
        <div className="card-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span className="section-eyebrow">COMMAND BRIEFING GIS VIEW</span>
            <h3 className="card-title">SITUATIONAL THREAT DISTRIBUTION</h3>
          </div>
          <button
            type="button"
            onClick={handleOpenFullGis}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
            className="stats-btn"
          >
            <MdMap size={14} />
            <span>OPEN FULL GIS MAP</span>
          </button>
        </div>

        {/* Map Container */}
        <div style={{ flex: 1, position: 'relative', width: '100%' }}>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            zoomControl={false}
            attributionControl={false}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
          >
            <TileLayer url={tileUrl} />
            
            {/* 1. Render bubbles representing district risk score */}
            {districtsRisk.map(d => {
              const center = districtCenters[d.id] || mapCenter;
              let bubbleColor = 'var(--chart-blue)';
              if (d.riskScore > 65) bubbleColor = 'var(--accent-danger)'; // Red
              else if (d.riskScore > 40) bubbleColor = 'var(--accent-warning)'; // Amber

              return (
                <CircleMarker
                  key={d.id}
                  center={center}
                  radius={8 + (d.riskScore * 0.15)}
                  fillColor={bubbleColor}
                  color={bubbleColor}
                  fillOpacity={0.4}
                  weight={1.5}
                  eventHandlers={{
                    click: () => handleDistrictSelect(d.id)
                  }}
                >
                  <MapTooltip direction="top" offset={[0, -5]}>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                      <strong>{d.name}</strong><br />
                      Risk Index: {d.riskScore}<br />
                      Period Cases: {d.count}
                    </div>
                  </MapTooltip>
                </CircleMarker>
              );
            })}

            {/* 2. Render pins for active critical incidents */}
            {pins.map(pin => (
              <CircleMarker
                key={pin.id}
                center={[pin.lat, pin.lng]}
                radius={5}
                fillColor="var(--accent-danger)"
                color="#fff"
                weight={1.5}
                fillOpacity={0.9}
                eventHandlers={{
                  click: () => {
                    alert(`Critical Incident Pin Clicked:\n${pin.title}\nDistrict: ${pin.districtName}`);
                  }
                }}
              >
                <MapTooltip direction="top" offset={[0, -2]}>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--accent-danger)' }}>
                    🚨 <strong>CRITICAL INCIDENT</strong><br />
                    {pin.title} ({pin.districtName})
                  </div>
                </MapTooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </article>

      {/* 9b. Top Hotspot List */}
      <article className="card" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '420px',
        margin: 0
      }}>
        <div className="card-header">
          <span className="section-eyebrow">RISK THREAT AUDIT</span>
          <h3 className="card-title">TOP HOTSPOT DISTRICTS</h3>
        </div>

        <div className="table-wrap" style={{ overflowY: 'auto', flex: 1 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>District</th>
                <th style={{ textAlign: 'right' }}>Caseload</th>
                <th style={{ textAlign: 'right' }}>Risk Quotient</th>
              </tr>
            </thead>
            <tbody>
              {hotspots.map((d, idx) => {
                let riskColor = 'var(--accent-success)';
                if (d.riskScore > 65) riskColor = 'var(--accent-danger)';
                else if (d.riskScore > 40) riskColor = 'var(--accent-warning)';

                return (
                  <tr
                    key={d.id}
                    onClick={() => handleDistrictSelect(d.id)}
                    style={{ cursor: 'pointer' }}
                    className="clickable-row"
                  >
                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>#{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td style={{ textAlign: 'right' }}>{d.count}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: riskColor }}>
                      {d.riskScore}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div style={{
          padding: '10px 14px',
          background: 'var(--bg-panel-alt)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <MdWarning size={14} style={{ color: 'var(--accent-warning)' }} />
          <span>Click a district row or map bubble to filter entire dashboard.</span>
        </div>
      </article>

      <style>{`
        .clickable-row:hover td {
          background-color: rgba(30, 144, 255, 0.05) !important;
        }
        @media (max-width: 900px) {
          .situational-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default SituationalMapSection;
