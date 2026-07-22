import React, { useState, useEffect, useRef } from 'react';
import { MdFilterList, MdClose, MdSearch, MdExpandMore, MdExpandLess, MdSettingsBackupRestore } from 'react-icons/md';
import { districts, units, crimeHeads } from '../../../data/schemaSelectors';
import { rangeDistricts } from '../statisticsApi';

function GlobalFiltersBar({ filters, setFilters, onReset }) {
  const [showMore, setShowMore] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const catRef = useRef(null);

  const [mobileOpen, setMobileOpen] = useState(false);

  // Handle click outside category dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (catRef.current && !catRef.current.contains(event.target)) {
        setCatDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const updated = { ...prev, [key]: value };
      
      // Dependent dropdown logic
      if (key === 'jurisdictionLevel') {
        updated.selectedDistrict = 'all';
        updated.selectedStation = 'all';
        updated.selectedRange = 'all';
      } else if (key === 'selectedDistrict') {
        updated.selectedStation = 'all';
      }
      
      return updated;
    });
  };

  const handleCategoryToggle = (catId) => {
    let current = Array.isArray(filters.crimeCategory) ? [...filters.crimeCategory] : [];
    if (catId === 'all') {
      current = ['all'];
    } else {
      current = current.filter(x => x !== 'all');
      if (current.includes(catId)) {
        current = current.filter(x => x !== catId);
      } else {
        current.push(catId);
      }
      if (current.length === 0) {
        current = ['all'];
      }
    }
    handleFilterChange('crimeCategory', current);
  };

  const filteredCrimeHeads = crimeHeads.filter(ch => 
    ch.CrimeGroupName.toLowerCase().includes(catSearch.toLowerCase())
  );

  const activeCategoryLabels = () => {
    const cats = Array.isArray(filters.crimeCategory) ? filters.crimeCategory : [filters.crimeCategory];
    if (cats.includes('all') || cats.length === 0) return 'All Crime Categories';
    return crimeHeads
      .filter(ch => cats.includes(String(ch.CrimeHeadID)))
      .map(ch => ch.CrimeGroupName.split(' ')[0])
      .join(', ');
  };

  // Build active chips list
  const getActiveChips = () => {
    const chips = [];
    
    // Date Range Chip
    if (filters.dateRange !== 'all') {
      const label = {
        'all': 'All Time',
        '7d': 'Last 7 Days',
        '30d': 'Last 30 Days',
        'this_month': 'This Month',
        'this_year': 'This Year',
        'custom': `Custom: ${filters.startDate || ''} to ${filters.endDate || ''}`
      }[filters.dateRange] || filters.dateRange;
      chips.push({ key: 'dateRange', label: `Date: ${label}`, resetValue: 'all' });
    }

    // Jurisdiction Chip
    if (filters.jurisdictionLevel !== 'all') {
      let label = filters.jurisdictionLevel.toUpperCase();
      if (filters.jurisdictionLevel === 'district' && filters.selectedDistrict !== 'all') {
        const d = districts.find(dist => String(dist.DistrictID) === filters.selectedDistrict);
        label = `District: ${d ? d.DistrictName : filters.selectedDistrict}`;
      } else if (filters.jurisdictionLevel === 'station' && filters.selectedStation !== 'all') {
        const s = units.find(st => String(st.UnitID) === filters.selectedStation);
        label = `Station: ${s ? s.UnitName : filters.selectedStation}`;
      } else if (filters.jurisdictionLevel === 'range' && filters.selectedRange !== 'all') {
        label = `Range: ${filters.selectedRange}`;
      }
      chips.push({ key: 'jurisdictionLevel', label, resetValue: 'all' });
    }

    // Category Chips
    const cats = Array.isArray(filters.crimeCategory) ? filters.crimeCategory : [filters.crimeCategory];
    if (cats.length > 0 && !cats.includes('all')) {
      cats.forEach(c => {
        const ch = crimeHeads.find(h => String(h.CrimeHeadID) === c);
        chips.push({
          key: 'crimeCategoryRemove',
          label: ch ? ch.CrimeGroupName : c,
          value: c
        });
      });
    }

    // Status Chip
    if (filters.caseStatus !== 'all') {
      chips.push({ key: 'caseStatus', label: `Status: ${filters.caseStatus}`, resetValue: 'all' });
    }

    // Severity Chip
    if (filters.severity !== 'all') {
      chips.push({ key: 'severity', label: `Severity: ${filters.severity}`, resetValue: 'all' });
    }

    // Demographics Chips
    if (filters.gender !== 'all') {
      chips.push({ key: 'gender', label: `Gender: ${filters.gender}`, resetValue: 'all' });
    }
    if (filters.ageGroup !== 'all') {
      chips.push({ key: 'ageGroup', label: `Age: ${filters.ageGroup}`, resetValue: 'all' });
    }

    return chips;
  };

  const chips = getActiveChips();

  const removeChip = (chip) => {
    if (chip.key === 'crimeCategoryRemove') {
      const current = Array.isArray(filters.crimeCategory) ? [...filters.crimeCategory] : [];
      const updated = current.filter(x => x !== chip.value);
      handleFilterChange('crimeCategory', updated.length === 0 ? ['all'] : updated);
    } else {
      handleFilterChange(chip.key, chip.resetValue);
    }
  };

  // Styled select inline matching design tokens
  const selectStyle = {
    padding: '8px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    background: 'var(--bg-panel-alt)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    height: '38px',
    minWidth: '130px',
    boxSizing: 'border-box'
  };

  return (
    <div className="stats-filter-bar-container" style={{
      position: 'sticky',
      top: '0px',
      zIndex: 998,
      background: 'var(--bg-panel)',
      borderBottom: '1px solid var(--border-color)',
      padding: '10px 24px',
      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      {/* Mobile Toggle Bar */}
      <div className="mobile-filter-header" style={{
        display: 'none',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0'
      }}>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            background: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minHeight: '38px'
          }}
        >
          <MdFilterList size={18} />
          {mobileOpen ? 'Hide Filters' : 'Show Filters'}
        </button>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {chips.length} Active Filters
        </span>
      </div>

      {/* Main Filter Inputs */}
      <div className={`filters-grid ${mobileOpen ? 'mobile-show' : ''}`} style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <MdFilterList size={16} />
          <span>Filters</span>
        </div>

        {/* 1. Date Range Dropdown */}
        <select
          value={filters.dateRange}
          onChange={e => handleFilterChange('dateRange', e.target.value)}
          style={selectStyle}
        >
          <option value="last_7_days">Last 7 Days</option>
          <option value="last_30_days">Last 30 Days</option>
          <option value="this_month">This Month</option>
          <option value="this_year">This Year</option>
          <option value="last_year">Last Year</option>
          <option value="all">All Records</option>
          <option value="custom">Custom Range...</option>
        </select>

        {/* Custom date range pickers */}
        {filters.dateRange === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={e => handleFilterChange('startDate', e.target.value)}
              style={{ ...selectStyle, minWidth: '120px' }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>to</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={e => handleFilterChange('endDate', e.target.value)}
              style={{ ...selectStyle, minWidth: '120px' }}
            />
          </div>
        )}

        {/* 2. Jurisdiction Level */}
        <select
          value={filters.jurisdictionLevel}
          onChange={e => handleFilterChange('jurisdictionLevel', e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Karnataka</option>
          <option value="range">Range</option>
          <option value="district">District</option>
          <option value="station">Police Station</option>
        </select>

        {/* Dependent Dropdowns */}
        {filters.jurisdictionLevel === 'range' && (
          <select
            value={filters.selectedRange}
            onChange={e => handleFilterChange('selectedRange', e.target.value)}
            style={selectStyle}
          >
            <option value="all">Select Range...</option>
            {Object.keys(rangeDistricts).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}

        {filters.jurisdictionLevel === 'district' && (
          <select
            value={filters.selectedDistrict}
            onChange={e => handleFilterChange('selectedDistrict', e.target.value)}
            style={selectStyle}
          >
            <option value="all">Select District...</option>
            {districts.map(d => (
              <option key={d.DistrictID} value={String(d.DistrictID)}>{d.DistrictName}</option>
            ))}
          </select>
        )}

        {filters.jurisdictionLevel === 'station' && (
          <>
            <select
              value={filters.selectedDistrict}
              onChange={e => handleFilterChange('selectedDistrict', e.target.value)}
              style={selectStyle}
            >
              <option value="all">Select District...</option>
              {districts.map(d => (
                <option key={d.DistrictID} value={String(d.DistrictID)}>{d.DistrictName}</option>
              ))}
            </select>
            <select
              value={filters.selectedStation}
              onChange={e => handleFilterChange('selectedStation', e.target.value)}
              disabled={filters.selectedDistrict === 'all'}
              style={selectStyle}
            >
              <option value="all">Select Station...</option>
              {units
                .filter(u => filters.selectedDistrict === 'all' || String(u.DistrictID) === filters.selectedDistrict)
                .map(u => (
                  <option key={u.UnitID} value={String(u.UnitID)}>{u.UnitName}</option>
                ))}
            </select>
          </>
        )}

        {/* 3. Searchable Multi-Select Category Dropdown */}
        <div ref={catRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setCatDropdownOpen(!catDropdownOpen)}
            style={{
              ...selectStyle,
              background: 'var(--bg-panel-alt)',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minWidth: '180px'
            }}
          >
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '150px',
              fontSize: '13px'
            }}>
              {activeCategoryLabels()}
            </span>
            <MdExpandMore size={16} />
          </button>
          {catDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '42px',
              left: 0,
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-soft)',
              width: '280px',
              zIndex: 9999,
              padding: '10px'
            }}>
              {/* Search bar inside dropdown */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '4px 8px',
                marginBottom: '8px',
                background: 'var(--bg-panel-alt)'
              }}>
                <MdSearch size={16} style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={catSearch}
                  onChange={e => setCatSearch(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    width: '100%'
                  }}
                />
              </div>

              {/* Items scroll */}
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', padding: '2px 4px' }}>
                  <input
                    type="checkbox"
                    checked={filters.crimeCategory.includes('all')}
                    onChange={() => handleCategoryToggle('all')}
                    style={{ minHeight: 'auto', minWidth: 'auto', width: '16px', height: '16px', margin: 0 }}
                  />
                  <strong>All Categories</strong>
                </label>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                {filteredCrimeHeads.map(ch => {
                  const sId = String(ch.CrimeHeadID);
                  return (
                    <label key={ch.CrimeHeadID} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', padding: '2px 4px' }}>
                      <input
                        type="checkbox"
                        checked={filters.crimeCategory.includes(sId)}
                        onChange={() => handleCategoryToggle(sId)}
                        style={{ minHeight: 'auto', minWidth: 'auto', width: '16px', height: '16px', margin: 0 }}
                      />
                      <span>{ch.CrimeGroupName}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 4. Case Status Select */}
        <select
          value={filters.caseStatus}
          onChange={e => handleFilterChange('caseStatus', e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Statuses</option>
          <option value="Open">Open Cases</option>
          <option value="Chargesheeted">Chargesheeted</option>
          <option value="Closed">Closed / Convicted</option>
        </select>

        {/* 5. Severity Select */}
        <select
          value={filters.severity}
          onChange={e => handleFilterChange('severity', e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Severity</option>
          <option value="High">Heinous Crimes</option>
          <option value="Medium">Non-Heinous</option>
        </select>

        {/* 6. More Filters Toggle */}
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-primary)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            minHeight: '30px',
            minWidth: 'auto'
          }}
        >
          {showMore ? (
            <>
              <span>Fewer Filters</span>
              <MdExpandLess size={16} />
            </>
          ) : (
            <>
              <span>More Filters</span>
              <MdExpandMore size={16} />
            </>
          )}
        </button>

        {/* Reset Filters text-button */}
        <button
          type="button"
          onClick={onReset}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-danger)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: 'auto',
            padding: '4px 8px',
            minHeight: '30px',
            minWidth: 'auto'
          }}
        >
          <MdSettingsBackupRestore size={16} />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* Collapsible Secondary Demographics Row */}
      {showMore && (
        <div className="demographics-row" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <strong>Demographics:</strong>
          </div>
          <select
            value={filters.gender}
            onChange={e => handleFilterChange('gender', e.target.value)}
            style={selectStyle}
          >
            <option value="all">All Victim Genders</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="T">Other</option>
          </select>
          <select
            value={filters.ageGroup}
            onChange={e => handleFilterChange('ageGroup', e.target.value)}
            style={selectStyle}
          >
            <option value="all">All Victim Ages</option>
            <option value="0-17">Children (0-17)</option>
            <option value="18-30">Youth (18-30)</option>
            <option value="31-45">Adults (31-45)</option>
            <option value="46-60">Middle-Aged (46-60)</option>
            <option value="60+">Seniors (60+)</option>
          </select>
        </div>
      )}

      {/* Active Filter Chips Row */}
      {chips.length > 0 && (
        <div className="active-chips-row" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '10px',
          paddingTop: '6px'
        }}>
          {chips.map((chip, idx) => (
            <div
              key={`${chip.key}-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(56, 151, 216, 0.12)',
                border: '1px solid rgba(56, 151, 216, 0.25)',
                color: 'var(--text-primary)',
                padding: '3px 8px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={() => removeChip(chip)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 'auto',
                  minHeight: 'auto'
                }}
              >
                <MdClose size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Custom responsive overrides styles loaded dynamically */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-filter-header {
            display: flex !important;
          }
          .filters-grid {
            display: none !important;
            flex-direction: column !important;
            align-items: stretch !important;
            margin-top: 10px;
          }
          .filters-grid.mobile-show {
            display: flex !important;
          }
          .filters-grid select, 
          .filters-grid button,
          .filters-grid input {
            width: 100% !important;
          }
          .stats-filter-bar-container {
            padding: 8px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default GlobalFiltersBar;
