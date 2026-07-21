import React from 'react';
import { MdClose, MdTrendingUp } from 'react-icons/md';
import { maskText } from '../../security/securityUtils';

/**
 * DistrictDrawer — Right-side detail panel when a district is clicked on the map
 */
function DistrictDrawer({ data, isCommandMode, onClose }) {
  if (!data) return null;

  const severity = data.total > 20 ? 'CRITICAL RISK LEVEL' : data.total > 10 ? 'HIGH SEVERITY' : 'STABLE RISK INDEX';

  const rows = [
    { label: 'Total Crimes', value: data.total },
    { label: 'Detection Rate', value: data.detection, color: '#00e676' },
    { label: 'Top Crime Category', value: data.topCrime },
    { label: 'Peak Crime Time', value: data.peakTime },
    { label: 'Highest Hotspot', value: isCommandMode ? data.highestArea : maskText(data.highestArea, 4, 3) },
  ];

  return (
    <div className="map-drawer">
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

      <div className="map-severity-card">
        <span className="map-severity-label"><MdTrendingUp /> LIVE SEVERITY RATING</span>
        <strong className="map-severity-value">{severity}</strong>
      </div>
    </div>
  );
}

export default DistrictDrawer;
