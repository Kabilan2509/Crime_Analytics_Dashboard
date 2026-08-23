import React, { useEffect, useState, useMemo } from 'react';
import { MdWarning, MdNotificationsActive } from 'react-icons/md';
import { getCaseViews } from '../services/dataService';

/**
 * Emergency Alert Ticker — scrolling heinous crime alerts
 * Mimics government SOC (Security Operations Center) real-time feeds
 */
function EmergencyTicker() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    let active = true;
    getCaseViews().then(rows => {
      if (active) setCases(rows);
    });
    return () => { active = false; };
  }, []);

  const alerts = useMemo(() => {
    return cases
      .filter(c => c.isHeinous)
      .sort((a, b) => (b.registeredDateObj || 0) - (a.registeredDateObj || 0))
      .slice(0, 12)
      .map(c => ({
        id: c.CaseMasterID,
        crimeNo: c.CrimeNo || c.CaseNo,
        type: c.minorHeadName,
        district: c.districtName,
        station: c.policeStationName,
        date: c.registeredDateObj
          ? c.registeredDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          : '',
        status: c.statusName,
      }));
  }, [cases]);

  if (!alerts.length) return null;

  return (
    <div className="emergency-ticker">
      <div className="ticker-label">
        <MdNotificationsActive size={14} className="ticker-icon-pulse" />
        <span>LIVE ALERTS</span>
      </div>
      <div className="ticker-track">
        <div className="ticker-content">
          {[...alerts, ...alerts].map((a, i) => (
            <span key={i} className="ticker-item">
              <MdWarning size={12} style={{ color: '#ef4444', flexShrink: 0 }} />
              <strong>{a.type}</strong> — {a.district} ({a.station}) — {a.date} —
              <span className={`ticker-status ${a.status === 'Under Investigation' ? 'active' : ''}`}>
                {a.status}
              </span>
              <span className="ticker-divider">│</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EmergencyTicker;
