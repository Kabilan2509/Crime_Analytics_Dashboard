import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, ChevronDown, MapPin } from 'lucide-react';
import { districts, crimeHeads } from '../../data/schemaSelectors';

/* CommandCenterSelect dropdown matching command center specification */
function CommandCenterSelect({ value, onChange, options, label, isMulti = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    if (isMulti) {
      if (val === 'all') {
        onChange(['all']);
      } else {
        let current = value.filter(x => x !== 'all');
        if (current.includes(val)) {
          current = current.filter(x => x !== val);
        } else {
          current.push(val);
        }
        if (current.length === 0) current = ['all'];
        onChange(current);
      }
    } else {
      onChange(val);
      setIsOpen(false);
    }
  };

  const displayLabel = useMemo(() => {
    if (isMulti) {
      if (value.includes('all')) return `${label}: All`;
      if (value.length === 1) {
        const match = options.find(o => String(o.value) === String(value[0]));
        return match ? match.label : `${label}: Selected (1)`;
      }
      return `${label}: Selected (${value.length})`;
    } else {
      const match = options.find(o => String(o.value) === String(value));
      return match ? match.label : label;
    }
  }, [value, options, label, isMulti]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '6px 12px',
          border: '1px solid var(--border-color, rgba(173, 193, 214, 0.16))',
          borderRadius: '6px',
          background: 'var(--bg-panel-alt, #1a2a3f)',
          color: 'var(--text-primary, #edf3fb)',
          fontSize: '12px',
          fontFamily: 'monospace',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minWidth: isMulti ? '170px' : '140px',
          outline: 'none',
          textAlign: 'left'
        }}
      >
        <span>{displayLabel}</span>
        <ChevronDown size={16} strokeWidth={1.5} style={{ marginLeft: '6px', opacity: 0.7 }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1100,
            background: '#0f1729',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '4px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            minWidth: '220px',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '4px 0',
            fontFamily: 'monospace'
          }}
        >
          {options.map(opt => {
            const isSelected = isMulti 
              ? value.includes(String(opt.value)) 
              : String(value) === String(opt.value);

            return (
              <div
                key={opt.value}
                onClick={() => handleSelect(String(opt.value))}
                style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  background: isSelected ? 'var(--accent-primary, #3b82f6)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  userSelect: 'none',
                  transition: 'background 120ms, color 120ms'
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                {isMulti && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    style={{ pointerEvents: 'none', accentColor: 'var(--accent-primary)' }}
                  />
                )}
                <span>{opt.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MapFilters({
  localDistrict,
  setLocalDistrict,
  localCrimeTypes,
  setLocalCrimeTypes,
  severityFilter,
  setSeverityFilter,
  statusFilter,
  setStatusFilter,
  timeOfDayFilter,
  setTimeOfDayFilter,
  activeCount
}) {
  const districtOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Districts' },
      ...districts.map(d => ({ value: String(d.DistrictID), label: d.DistrictName }))
    ];
  }, []);

  const crimeOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Crime Heads' },
      ...crimeHeads.map(ch => ({ value: String(ch.CrimeHeadID), label: ch.CrimeGroupName }))
    ];
  }, []);

  const severityOptions = [
    { value: 'all', label: 'All Severities' },
    { value: 'heinous', label: 'Heinous Only' },
    { value: 'non-heinous', label: 'Non-Heinous Only' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active Cases' },
    { value: 'closed', label: 'Closed Cases' }
  ];

  const timeOptions = [
    { value: 'all', label: 'All Hours' },
    { value: 'morning', label: 'Morning (06:00-12:00)' },
    { value: 'afternoon', label: 'Afternoon (12:00-18:00)' },
    { value: 'night', label: 'Night (18:00-06:00)' }
  ];

  return (
    <div 
      className="map-filters-toolbar"
      style={{
        display: 'flex',
        gap: '8px',
        padding: '10px 24px',
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-color)',
        alignItems: 'center',
        flexWrap: 'wrap',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '12px', fontFamily: 'monospace', marginRight: '6px' }}>
        <Filter size={16} strokeWidth={1.5} />
        <span>FILTERS:</span>
      </div>

      <CommandCenterSelect
        value={localDistrict}
        onChange={setLocalDistrict}
        options={districtOptions}
        label="District"
      />

      <CommandCenterSelect
        value={localCrimeTypes}
        onChange={setLocalCrimeTypes}
        options={crimeOptions}
        label="Crime Head"
        isMulti={true}
      />

      <CommandCenterSelect
        value={severityFilter}
        onChange={setSeverityFilter}
        options={severityOptions}
        label="Severity"
      />

      <CommandCenterSelect
        value={statusFilter}
        onChange={setStatusFilter}
        options={statusOptions}
        label="Status"
      />

      <CommandCenterSelect
        value={timeOfDayFilter}
        onChange={setTimeOfDayFilter}
        options={timeOptions}
        label="Time of Day"
      />

      {activeCount !== undefined && (
        <div 
          style={{
            marginLeft: 'auto',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '4px 10px',
            fontSize: '10px',
            fontFamily: 'monospace',
            color: 'var(--accent-primary)',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={16} strokeWidth={1.5} />
            <span>{activeCount} INCIDENTS</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default MapFilters;
