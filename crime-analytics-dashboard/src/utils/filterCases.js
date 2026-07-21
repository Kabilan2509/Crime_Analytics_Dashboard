/**
 * filterCases.js — Shared case filtering utility
 *
 * Single source of truth for filtering caseViews by district, crime type,
 * date range, and search query. Used by Statistics, Reports, Dashboard.
 *
 * Eliminates the duplicated filter logic in statisticsUtils and reportsUtils.
 */

/**
 * Filter an array of case objects by common criteria.
 *
 * @param {Array} cases - Array of case view objects
 * @param {Object} filters
 * @param {string} filters.selectedDistrict - 'all' or district ID
 * @param {string} filters.selectedCrimeType - 'all' or crime head ID
 * @param {string} filters.dateRange - 'all', '24h', '7d', '30d', '365d'
 * @param {string} [filters.searchQuery] - free text search
 * @param {string} [filters.selectedOfficer] - 'all' or officer KGID
 * @returns {Array} filtered cases
 */
export function filterCases(cases, {
  selectedDistrict = 'all',
  selectedCrimeType = 'all',
  dateRange = 'all',
  searchQuery = '',
  selectedOfficer = 'all',
} = {}) {
  // Pre-compute date boundary once (not per item)
  let maxDate = null;
  let dayLimit = null;
  if (dateRange !== 'all') {
    const limits = { '24h': 1, '7d': 7, '30d': 30, '365d': 365 };
    dayLimit = limits[dateRange] || null;
    if (dayLimit) {
      const timestamps = cases.map(c => c.registeredDateObj?.getTime()).filter(Boolean);
      maxDate = timestamps.length ? Math.max(...timestamps) : Date.now();
    }
  }

  const query = searchQuery?.toLowerCase() || '';

  return cases.filter(item => {
    // District
    if (selectedDistrict !== 'all' && item.districtID !== Number(selectedDistrict)) return false;

    // Crime type
    if (selectedCrimeType !== 'all' && item.CrimeMajorHeadID !== Number(selectedCrimeType)) return false;

    // Officer
    if (selectedOfficer !== 'all' && item.officerKGID !== Number(selectedOfficer)) return false;

    // Search
    if (query) {
      const haystack = [item.CaseMasterID, item.FIRNo, item.districtName, item.policeStationName]
        .map(v => String(v || '').toLowerCase());
      if (!haystack.some(h => h.includes(query))) return false;
    }

    // Date range
    if (dayLimit && maxDate) {
      const t = item.registeredDateObj?.getTime();
      if (t && (maxDate - t) / 86400000 > dayLimit) return false;
    }

    return true;
  });
}
