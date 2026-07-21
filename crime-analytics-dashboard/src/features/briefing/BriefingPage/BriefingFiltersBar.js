import React, { useState } from 'react';
import { MdFilterList, MdRefresh, MdExpandMore } from 'react-icons/md';
import { districts, units, crimeHeads } from '../../../data/schemaSelectors';
import { rangeDistricts } from '../briefingApi';
import { useSecurity } from '../../../context/SecurityContext';

function BriefingFiltersBar({ filters, setFilters, onReset }) {
  const { session } = useSecurity();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // Check if session role locks inputs (same lock logic as Crime Statistics page)
  const isShoLocked = session && session.unitName && session.unitName !== 'State Control Room' && session.unitName !== 'command center' && session.unitName !== '';
  
  const currentDistrict = isShoLocked ? (session.districtID || '1') : filters.selectedDistrict;
  const currentStation = isShoLocked ? (session.policeStationID || 'all') : filters.selectedStation;

  // Handler helpers
  const handleFilterChange = (key, val) => {
    setFilters(prev => ({
      ...prev,
      [key]: val
    }));
  };

  // Determine stations to show
  const filteredStations = units.filter(u => {
    if (filters.jurisdictionLevel === 'station' || filters.jurisdictionLevel === 'district') {
      return String(u.DistrictID) === String(currentDistrict);
    }
    return true;
  });

  const handleSourceToggle = (src) => {
    const active = filters.includeSources || [];
    if (active.includes(src)) {
      if (active.length > 1) {
        handleFilterChange('includeSources', active.filter(x => x !== src));
      }
    } else {
      handleFilterChange('includeSources', [...active, src]);
    }
  };

  // Preset time select handler
  const handleTimePresetChange = (preset) => {
    setFilters(prev => ({
      ...prev,
      dateRange: preset,
      startDate: '',
      endDate: ''
    }));
  };

  return (
    <div className="stats-filter-bar-container" style={{
      background: 'var(--bg-panel)',
      padding: '12px 20px',
      marginBottom: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      borderTop: '1px solid var(--border-color)',
      borderBottom: '1px solid var(--border-color)'
    }}>
      {/* Filters Summary & Mobile Toggle Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="mobile-filter-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
          <MdFilterList size={16} />
          <span>BRIEFING FILTERS</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileExpanded(!mobileExpanded)}
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            fontSize: '11px'
          }}
          className="mobile-toggle-btn"
        >
          <span>Options</span>
          <MdExpandMore style={{ transform: mobileExpanded ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>

      {/* Main Grid Filters Container */}
      <div style={{
        display: mobileExpanded ? 'flex' : 'flex',
        flexDirection: 'column',
        gap: '14px'
      }} className={`filters-panel ${mobileExpanded ? 'expanded' : 'collapsed'}`}>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {/* 1. Time Range Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '6px' }}>
              TIME SEQUENCE
            </label>
            <select
              value={filters.dateRange}
              onChange={e => handleTimePresetChange(e.target.value)}
              style={{ width: '100%', height: '38px' }}
            >
              <option value="last_24h">Last 24 Hours</option>
              <option value="last_7_days">Last 7 Days (Default)</option>
              <option value="custom">Custom Date Range</option>
            </select>

            {filters.dateRange === 'custom' && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={e => handleFilterChange('startDate', e.target.value)}
                  style={{ width: '50%', height: '30px', padding: '2px 4px', fontSize: '11px' }}
                />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={e => handleFilterChange('endDate', e.target.value)}
                  style={{ width: '50%', height: '30px', padding: '2px 4px', fontSize: '11px' }}
                />
              </div>
            )}
          </div>

          {/* 2. Geography Chain */}
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '6px' }}>
              JURISDICTION
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                value={filters.jurisdictionLevel}
                disabled={isShoLocked}
                onChange={e => {
                  setFilters(prev => ({
                    ...prev,
                    jurisdictionLevel: e.target.value,
                    selectedRange: 'all',
                    selectedDistrict: 'all',
                    selectedStation: 'all'
                  }));
                }}
                style={{ width: '40%', height: '38px' }}
              >
                <option value="all">State Level</option>
                <option value="range">Range</option>
                <option value="district">District</option>
                <option value="station">Station</option>
              </select>

              {filters.jurisdictionLevel === 'range' && (
                <select
                  value={filters.selectedRange}
                  onChange={e => handleFilterChange('selectedRange', e.target.value)}
                  style={{ width: '60%', height: '38px' }}
                >
                  <option value="all">All Ranges</option>
                  {Object.keys(rangeDistricts).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}

              {(filters.jurisdictionLevel === 'district' || filters.jurisdictionLevel === 'station') && (
                <select
                  value={currentDistrict}
                  disabled={isShoLocked}
                  onChange={e => {
                    setFilters(prev => ({
                      ...prev,
                      selectedDistrict: e.target.value,
                      selectedStation: 'all'
                    }));
                  }}
                  style={{ width: '60%', height: '38px' }}
                >
                  <option value="all">All Districts</option>
                  {districts.map(d => (
                    <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName.replace(' (Dakshina Kannada)', '')}</option>
                  ))}
                </select>
              )}
            </div>

            {filters.jurisdictionLevel === 'station' && (
              <select
                value={currentStation}
                disabled={isShoLocked}
                onChange={e => handleFilterChange('selectedStation', e.target.value)}
                style={{ width: '100%', height: '38px', marginTop: '6px' }}
              >
                <option value="all">All Stations</option>
                {filteredStations.map(st => (
                  <option key={st.PoliceStationID} value={st.PoliceStationID}>{st.PoliceStationName}</option>
                ))}
              </select>
            )}
          </div>

          {/* 3. Threat Assessment Threshold */}
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '6px' }}>
              THREAT LEVEL
            </label>
            <select
              value={filters.threatLevel}
              onChange={e => handleFilterChange('threatLevel', e.target.value)}
              style={{ width: '100%', height: '38px' }}
            >
              <option value="all">Show All Threat Grades</option>
              <option value="high">High & Critical Alerts Only</option>
              <option value="medium+">Medium + High Risks</option>
            </select>
          </div>

          {/* 4. External Data Sources & Classifications */}
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '6px' }}>
              DATA FEEDS & GRADES
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filters.includeSources.includes('NCRB')}
                    onChange={() => handleSourceToggle('NCRB')}
                    style={{ minHeight: 'auto', minWidth: 'auto', width: '14px', height: '14px', margin: 0 }}
                  />
                  <span>NCRB Stats</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filters.includeSources.includes('OSINT')}
                    onChange={() => handleSourceToggle('OSINT')}
                    style={{ minHeight: 'auto', minWidth: 'auto', width: '14px', height: '14px', margin: 0 }}
                  />
                  <span>OSINT Ticker</span>
                </label>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={filters.classificationOnly}
                  onChange={e => handleFilterChange('classificationOnly', e.target.checked)}
                  style={{ minHeight: 'auto', minWidth: 'auto', width: '14px', height: '14px', margin: 0 }}
                />
                <span style={{ color: filters.classificationOnly ? 'var(--accent-danger)' : 'inherit', fontWeight: filters.classificationOnly ? 700 : 500 }}>
                  Show Intel-Grade Only (Classified)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* View Mode Segmented Controls & Reset Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '10px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Analyst vs Data Only view mode */}
          <div style={{ display: 'flex', background: 'var(--bg-panel-alt)', padding: '2px', border: '1px solid var(--border-color)', borderRadius: '0px' }}>
            <button
              type="button"
              onClick={() => handleFilterChange('viewMode', 'analyst')}
              style={{
                background: filters.viewMode === 'analyst' ? 'var(--accent-primary)' : 'transparent',
                color: filters.viewMode === 'analyst' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ANALYST VIEW
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange('viewMode', 'data_only')}
              style={{
                background: filters.viewMode === 'data_only' ? 'var(--accent-primary)' : 'transparent',
                color: filters.viewMode === 'data_only' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              DATA ONLY
            </button>
          </div>

          <button
            type="button"
            onClick={onReset}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            className="stats-btn"
          >
            <MdRefresh size={14} />
            <span>RESET FILTERS</span>
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .mobile-toggle-btn {
            display: inline-flex !important;
          }
          .filters-panel.collapsed {
            display: none !important;
          }
          .filters-panel.expanded {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}

export default BriefingFiltersBar;
