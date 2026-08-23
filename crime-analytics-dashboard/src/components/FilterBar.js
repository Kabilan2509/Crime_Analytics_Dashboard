import React, { useState, useEffect } from 'react';
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
  borderRadius: '4px',
  background: 'var(--bg-panel-alt)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const TRANSLATIONS = {
  en: {
    filters: "Scope Filters",
    allDistricts: "All Karnataka Districts",
    allCrimes: "All Crime Heads",
    allTime: "All Time Records",
    last24h: "Last 24 Hours",
    last7d: "Last 7 Days",
    last30d: "Last 30 Days",
    last365d: "Year-to-Date (YTD)",
    clear: "Clear Filters"
  },
  kn: {
    filters: "ಫಿಲ್ಟರ್‌ಗಳು",
    allDistricts: "ಎಲ್ಲಾ ಕರ್ನಾಟಕ ಜಿಲ್ಲೆಗಳು",
    allCrimes: "ಎಲ್ಲಾ ಅಪರಾಧ ವಿಭಾಗಗಳು",
    allTime: "ಎಲ್ಲಾ ದಾಖಲೆಗಳು",
    last24h: "ಕಳೆದ ೨೪ ಗಂಟೆಗಳು",
    last7d: "ಕಳೆದ ೭ ದಿನಗಳು",
    last30d: "ಕಳೆದ ೩೦ ದಿನಗಳು",
    last365d: "ವರ್ಷದ ಆರಂಭದಿಂದ ಇಲ್ಲಿಯವರೆಗೆ",
    clear: "ಫಿಲ್ಟರ್‌ಗಳನ್ನು ತೆರವುಗೊಳಿಸಿ"
  }
};

function FilterBar({
  selectedDistrict, setSelectedDistrict,
  selectedCrimeType, setSelectedCrimeType,
  dateRange, setDateRange,
  searchQuery, setSearchQuery,
}) {
  const [lang, setLang] = useState(() => localStorage.getItem('ksp-language') || 'en');

  useEffect(() => {
    const handleLangChange = (e) => setLang(e.detail);
    window.addEventListener('ksp-language-change', handleLangChange);
    return () => window.removeEventListener('ksp-language-change', handleLangChange);
  }, []);

  const t = TRANSLATIONS[lang];
  const hasActiveFilter = selectedDistrict !== 'all' || selectedCrimeType !== 'all' || dateRange !== 'all' || searchQuery !== '';

  const resetAll = () => {
    setSelectedDistrict('all');
    setSelectedCrimeType('all');
    setDateRange('all');
    setSearchQuery('');
  };

  return (
    <div className="filter-bar" style={{ borderRadius: '0px', boxShadow: 'none' }}>
      <div className="filter-bar-left">
        <div className="filter-bar-label">
          <MdFilterList size={16} />
          <span>{t.filters}</span>
        </div>

        <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} style={selectStyle}>
          <option value="all">{t.allDistricts}</option>
          {districts.map(d => (
            <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
          ))}
        </select>

        <select value={selectedCrimeType} onChange={e => setSelectedCrimeType(e.target.value)} style={selectStyle}>
          <option value="all">{t.allCrimes}</option>
          {crimeHeads.map(ch => (
            <option key={ch.CrimeHeadID} value={ch.CrimeHeadID}>{ch.CrimeGroupName}</option>
          ))}
        </select>

        <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={selectStyle}>
          <option value="all">{t.allTime}</option>
          <option value="24h">{t.last24h}</option>
          <option value="7d">{t.last7d}</option>
          <option value="30d">{t.last30d}</option>
          <option value="365d">{t.last365d}</option>
        </select>

        {hasActiveFilter && (
          <button type="button" onClick={resetAll} className="filter-reset-btn" style={{ borderRadius: '4px' }}>
            {t.clear}
          </button>
        )}
      </div>
    </div>
  );
}

export default FilterBar;
