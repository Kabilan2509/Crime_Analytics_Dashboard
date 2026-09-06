import React from 'react';
import { MdClose, MdTrendingUp } from 'react-icons/md';
import { maskText } from '../../security/securityUtils';

/**
 * DistrictDrawer — Right-side detail panel when a district is clicked on the map
 */
function DistrictDrawer({ data, isCommandMode, onClose, isColorblind }) {
  if (!data) return null;

  const severity = data.total > 20 ? 'CRITICAL RISK LEVEL' : data.total > 10 ? 'HIGH SEVERITY' : 'STABLE RISK INDEX';
  const detectionColor = isColorblind ? '#0072b2' : '#00e676';
  const severityColor = isColorblind
    ? (data.total > 20 ? '#d81b60' : data.total > 10 ? '#e69f00' : '#0072b2')
    : undefined;

  const rows = [
    { label: 'Total Crimes', value: data.total },
    { label: 'Detection Rate', value: data.detection, color: detectionColor },
    { label: 'Top Crime Category', value: data.topCrime },
    { label: 'Peak Crime Time', value: data.peakTime },
    { label: 'Highest Hotspot', value: isCommandMode ? data.highestArea : maskText(data.highestArea, 4, 3) },
  ];

  return (
    <div className={`map-drawer${isColorblind ? ' colorblind-drawer' : ''}`}>
      <button type="button" onClick={onClose} className="map-drawer-close"><MdClose size={20} /></button>
      <h3 className="map-drawer-title">{data.name}</h3>
      <span className="map-drawer-eyebrow">Division GIS Report</span>
      <hr className="map-divider" />

      <div className="map-drawer-stats">
        {rows.map(r => (
          <div key={r.label} className="map-stat-row">
            <span className="map-stat-label">{r.label}:</span>
            <strong style={r.color ? { color: r.color } : undefined}>{r.value}</strong>
          </div>
        ))}
      </div>

      <div className="map-severity-card" style={severityColor ? { borderColor: severityColor, background: `color-mix(in srgb, ${severityColor} 12%, transparent)` } : undefined}>
        <span className="map-severity-label"><MdTrendingUp /> LIVE SEVERITY RATING</span>
        <strong className="map-severity-value" style={severityColor ? { color: severityColor } : undefined}>{severity}</strong>
      </div>
    </div>
  );
}

export default DistrictDrawer;
