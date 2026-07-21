import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const DateFilterContext = createContext();

/* Preset range calculators */
function getPresetRange(preset) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start;

  switch (preset) {
    case '7d':
      start = new Date(end);
      start.setDate(start.getDate() - 7);
      break;
    case '1m':
      start = new Date(end);
      start.setMonth(start.getMonth() - 1);
      break;
    case '3m':
      start = new Date(end);
      start.setMonth(start.getMonth() - 3);
      break;
    case '6m':
      start = new Date(end);
      start.setMonth(start.getMonth() - 6);
      break;
    case '1y':
      start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'ytd':
      start = new Date(end.getFullYear(), 0, 1);
      break;
    case 'all':
    default:
      return { start: null, end: null, preset: 'all', label: 'All Time' };
  }

  start.setHours(0, 0, 0, 0);
  return { start, end, preset, label: getPresetLabel(preset) };
}

function getPresetLabel(preset) {
  const labels = {
    '7d': 'Last 7 Days',
    '1m': 'Last 1 Month',
    '3m': 'Last 3 Months',
    '6m': 'Last 6 Months',
    '1y': 'Last 1 Year',
    'ytd': 'Year to Date',
    'all': 'All Time',
    'custom': 'Custom Range',
  };
  return labels[preset] || 'All Time';
}

export function DateFilterProvider({ children }) {
  const [dateRange, setDateRange] = useState(() => getPresetRange('all'));

  const selectPreset = useCallback((preset) => {
    setDateRange(getPresetRange(preset));
  }, []);

  const selectCustomRange = useCallback((startStr, endStr) => {
    const start = new Date(startStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endStr);
    end.setHours(23, 59, 59, 999);
    setDateRange({
      start,
      end,
      preset: 'custom',
      label: `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} — ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    });
  }, []);

  const filterByDate = useCallback((items, dateField = 'CrimeRegisteredDate') => {
    if (!dateRange.start || !dateRange.end) return items;
    return items.filter(item => {
      const val = item[dateField];
      if (!val) return false;
      const d = new Date(typeof val === 'string' ? val.replace(' ', 'T') : val);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [dateRange]);

  const value = useMemo(() => ({
    dateRange,
    selectPreset,
    selectCustomRange,
    filterByDate,
  }), [dateRange, selectPreset, selectCustomRange, filterByDate]);

  return (
    <DateFilterContext.Provider value={value}>
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const ctx = useContext(DateFilterContext);
  if (!ctx) throw new Error('useDateFilter must be used within DateFilterProvider');
  return ctx;
}
