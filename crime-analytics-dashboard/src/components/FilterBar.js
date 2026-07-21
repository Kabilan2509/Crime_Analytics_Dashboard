import React from 'react';
import { MdFilterList } from 'react-icons/md';
import { districts, crimeHeads } from '../data/schemaSelectors';

/**
 * FilterBar — Global scope filters (District, Crime Type, Date Range)
 * 
 * Extracted from Header.js to reduce Header complexity.
 * Sits below the main header as a secondary ribbon.
 */

const selectStyle = {
  padding: '6px 12px',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  background: 'var(--bg-panel-alt)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

function FilterBar({
  selectedDistrict, setSelectedDistrict,
  selectedCrimeType, setSelectedCrimeType,
  dateRange, setDateRange,
  searchQuery, setSearchQuery,
}) {
  const hasActiveFilter = selectedDistrict !== 'all' || selectedCrimeType !== 'all' || dateRange !== 'all' || searchQuery !== '';

  const resetAll = () => {
    setSelectedDistrict('all');
    setSelectedCrimeType('all');
    setDateRange('all');
    setSearchQuery('');
  };

  return (
    <div className="filter-bar">
      <div className="filter-bar-left">
        <div className="filter-bar-label">
          <MdFilterList size={16} />
          <span>Scope Filters</span>
        </div>

        <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} style={selectStyle}>
          <option value="all">All Karnataka Districts</option>
          {districts.map(d => (
            <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
          ))}
        </select>

        <select value={selectedCrimeType} onChange={e => setSelectedCrimeType(e.target.value)} style={selectStyle}>
          <option value="all">All Crime Heads</option>
          {crimeHeads.map(ch => (
            <option key={ch.CrimeHeadID} value={ch.CrimeHeadID}>{ch.CrimeGroupName}</option>
          ))}
        </select>

        <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={selectStyle}>
          <option value="all">All Time Records</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="365d">Year-to-Date (YTD)</option>
        </select>

        {hasActiveFilter && (
          <button type="button" onClick={resetAll} className="filter-reset-btn">
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}

export default FilterBar;
