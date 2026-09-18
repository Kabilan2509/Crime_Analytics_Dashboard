import React from 'react';
import { MapContainer, CircleMarker, Tooltip as MapTooltip } from 'react-leaflet';
import { Map, AlertTriangle, RotateCcw } from 'lucide-react';
import { districtCenters } from '../../../data/schemaSelectors';
import { useNavigate } from 'react-router-dom';
import ThemeAwareTileLayer from '../../../components/ui/ThemeAwareTileLayer';

function SituationalMapSection({ mapData, theme, onDistrictClick, activeKpiFilter, setActiveKpiFilter }) {
  const navigate = useNavigate();
  const { districtsRisk = [], hotspots = [], pins = [] } = mapData;

  const handleDistrictSelect = (districtID) => {
    onDistrictClick(districtID);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const mapCenter = [14.85, 75.8]; // Karnataka center
  const mapZoom = 6;

  const handleOpenFullGis = () => {
    navigate('/map');
  };

  // Perform KPI-specific filtering
  let filteredDistrictsRisk = districtsRisk;
  let filteredHotspots = hotspots;
  let filteredPins = pins;

  if (activeKpiFilter === 'escalated_districts') {
    // Show only districts with count > 5 (or top district if none are > 5)
    const escalatedList = districtsRisk.filter(d => d.count > 5);
    filteredDistrictsRisk = escalatedList.length > 0 
      ? escalatedList 
      : [districtsRisk.reduce((max, d) => d.riskScore > max.riskScore ? d : max, districtsRisk[0])];
    
    const escalatedIds = filteredDistrictsRisk.map(d => d.id);
    filteredHotspots = hotspots.filter(h => escalatedIds.includes(h.id));
    filteredPins = pins.filter(p => escalatedIds.includes(p.id) || p.riskLevel === 'CRITICAL');
  } else if (activeKpiFilter === 'critical_incidents') {
    // Keep only heinous incident districts and pins
    filteredPins = pins.filter(p => p.riskLevel === 'CRITICAL');
    const criticalDistrictNames = filteredPins.map(p => p.districtName.toLowerCase().trim());
    filteredDistrictsRisk = districtsRisk.filter(d => 
      criticalDistrictNames.some(name => d.name.toLowerCase().includes(name) || name.includes(d.name.toLowerCase()))
    );
    const criticalIds = filteredDistrictsRisk.map(d => d.id);
    filteredHotspots = hotspots.filter(h => criticalIds.includes(h.id));
  } else if (activeKpiFilter === 'bolos') {
    // BOLO alerts focus on specific districts (e.g. Bengaluru Urban/Rural, id: 1, 2)
    filteredDistrictsRisk = districtsRisk.filter(d => d.id === 1 || d.id === 2);
    filteredHotspots = hotspots.filter(h => h.id === 1 || h.id === 2);
    filteredPins = pins.filter(p => p.districtName.toLowerCase().includes('bengaluru') || p.districtName.toLowerCase().includes('urban'));
  }

  // Fallback if empty to avoid broken rendering
  if (filteredDistrictsRisk.length === 0) filteredDistrictsRisk = districtsRisk;
  if (filteredHotspots.length === 0) filteredHotspots = hotspots;

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
        margin: 0,
        position: 'relative'
      }}>
        <div className="card-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px'
        }}>
          <div>
            <span className="section-eyebrow">COMMAND BRIEFING GIS VIEW</span>
            <h3 className="card-title" style={{ margin: 0 }}>SITUATIONAL THREAT DISTRIBUTION</h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeKpiFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveKpiFilter('all')}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  background: 'var(--accent-danger, #ff4d4d)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 0 8px rgba(255, 77, 77, 0.4)'
                }}
                title="Click to clear filter and show all districts"
              >
                <RotateCcw size={16} strokeWidth={1.5} />
                <span>RESET MAP FILTER ({activeKpiFilter.toUpperCase().replace('_', ' ')})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenFullGis}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              className="stats-btn"
            >
              <Map size={16} strokeWidth={1.5} />
              <span>OPEN FULL GIS MAP</span>
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div style={{ flex: 1, position: 'relative', width: '100%' }}>
          {activeKpiFilter !== 'all' && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255, 77, 77, 0.95)',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              fontFamily: 'inherit',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <span>Filtering Map: <strong>{activeKpiFilter.toUpperCase().replace('_', ' ')}</strong></span>
              <button
                type="button"
                onClick={() => setActiveKpiFilter('all')}
                style={{
                  background: '#ffffff',
                  color: '#ff4d4d',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                <RotateCcw size={16} strokeWidth={1.5} />
                <span>SHOW ALL</span>
              </button>
            </div>
          )}
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            zoomControl={false}
            attributionControl={false}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
          >
            <ThemeAwareTileLayer />
            
            {/* 1. Render bubbles representing district risk score */}
            {filteredDistrictsRisk.map(d => {
              const center = districtCenters[d.id] || mapCenter;
              let bubbleColor = 'var(--chart-blue, #2196f3)';
              if (d.riskScore > 65) bubbleColor = 'var(--accent-danger, #ff4d4d)'; // Red
              else if (d.riskScore > 40) bubbleColor = 'var(--accent-warning, #ffaa00)'; // Amber

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
                    <div style={{ fontSize: '11px', fontFamily: 'inherit' }}>
                      <strong>{d.name}</strong><br />
                      Risk Index: {d.riskScore}%<br />
                      Period Cases: {d.count}
                    </div>
                  </MapTooltip>
                </CircleMarker>
              );
            })}

            {/* 2. Render pins for active critical incidents */}
            {filteredPins.map(pin => (
              <CircleMarker
                key={pin.id}
                center={[pin.lat, pin.lng]}
                radius={5}
                fillColor="var(--accent-danger, #ff4d4d)"
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
                  <div style={{ fontSize: '11px', fontFamily: 'inherit', color: 'var(--accent-danger)' }}>
                    <strong>CRITICAL INCIDENT</strong><br />
                    {pin.title} ({pin.districtName})
                  </div>
                </MapTooltip>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* User Friendly Legend Overlay */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: 'var(--bg-panel, #142132)',
            border: '1px solid var(--border-color, rgba(173, 193, 214, 0.16))',
            borderRadius: '4px',
            padding: '8px 12px',
            zIndex: 1000,
            fontSize: '10px',
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            pointerEvents: 'auto'
          }}>
            <strong style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-secondary, #94a3b8)', letterSpacing: '0.04em' }}>
              Risk Index Legend
            </strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-danger, #ff4d4d)', display: 'inline-block' }} />
              <span>Critical Risk (&gt;65%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-warning, #ffaa00)', display: 'inline-block' }} />
              <span>High Risk (40% - 65%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--chart-blue, #2196f3)', display: 'inline-block' }} />
              <span>Normal Risk (&lt;40%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '2px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-danger, #ff4d4d)', border: '1px solid #fff', display: 'inline-block' }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={16} strokeWidth={1.5} style={{ color: 'var(--accent-danger)' }} />
                Critical Incident
              </span>
            </div>
          </div>
        </div>
      </article>

      {/* 9b. Top Hotspot List */}
      <article className="card" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '420px',
        margin: 0
      }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="section-eyebrow">RISK THREAT AUDIT</span>
            <h3 className="card-title">TOP HOTSPOT DISTRICTS</h3>
          </div>
          {activeKpiFilter !== 'all' && (
            <span style={{ fontSize: '10px', color: 'var(--accent-warning)', fontWeight: 'bold' }}>
              [FILTERED]
            </span>
          )}
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
              {filteredHotspots.map((d, idx) => {
                let riskColor = 'var(--accent-success, #00c853)';
                if (d.riskScore > 65) riskColor = 'var(--accent-danger, #ff4d4d)';
                else if (d.riskScore > 40) riskColor = 'var(--accent-warning, #ffaa00)';

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
          <AlertTriangle size={16} strokeWidth={1.5} style={{ color: 'var(--accent-warning)' }} />
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
