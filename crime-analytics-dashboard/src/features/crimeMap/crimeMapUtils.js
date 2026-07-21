/**
 * crimeMapUtils.js — Data transforms for CrimeMap page
 *
 * Pure functions for filtering, district inspection, coordinate security.
 */

import { cases, units, crimeHeads, caseStatusMaster, districtCenters } from '../../data/schemaSelectors';

export const KARNATAKA_CENTER = [15.3173, 75.7139];
export const KARNATAKA_ZOOM = 7;

export const MAP_LAYERS = [
  { id: 'overall', label: 'Overall Density' },
  { id: 'murder', label: 'Violent / Murder' },
  { id: 'theft', label: 'Property Theft' },
  { id: 'women', label: 'Women Safety' },
  { id: 'cyber', label: 'Cyber Crimes' },
  { id: 'emergency', label: '112 Emergency calls' },
  { id: 'patrols', label: 'Patrol Coverage' },
  { id: 'forecast_tomorrow', label: "👁️ Tomorrow's Forecast" },
  { id: 'forecast_week', label: '👁️ Next Week Forecast' },
  { id: 'gis_cctv', label: '📹 CCTV Grid' },
  { id: 'gis_schools', label: '🏫 Schools' },
];

/** Filter cases based on map-specific criteria */
export function filterMapCases(allCases, {
  districtId, crimeHeadId, severityFilter, statusFilter, timelineIndex, activeLayer, timeOfDayFilter,
}) {
  const allTimes = allCases.map(c => new Date(String(c.CrimeRegisteredDate).replace(' ', 'T')).getTime()).filter(Boolean);
  const maxTime = allTimes.length ? Math.max(...allTimes) : Date.now();
  const minTime = allTimes.length ? Math.min(...allTimes) : Date.now();
  const dateRangeMs = maxTime - minTime;

  return allCases.filter(item => {
    if (districtId !== 'all') {
      if (String(item.districtID) !== String(districtId)) return false;
    }
    if (crimeHeadId !== 'all' && String(item.CrimeMajorHeadID) !== String(crimeHeadId)) return false;
    if (severityFilter !== 'all') {
      const isH = item.isHeinous;
      if (severityFilter === 'heinous' && !isH) return false;
      if (severityFilter === 'non-heinous' && isH) return false;
    }
    if (statusFilter !== 'all') {
      const name = item.statusName || '';
      if (statusFilter === 'active' && ['Closed', 'Convicted'].includes(name)) return false;
      if (statusFilter === 'closed' && !['Closed', 'Convicted'].includes(name)) return false;
    }
    if (timeOfDayFilter && timeOfDayFilter !== 'all') {
      const regDate = new Date(String(item.CrimeRegisteredDate).replace(' ', 'T'));
      const hour = isNaN(regDate.getTime()) ? 12 : regDate.getHours();
      if (timeOfDayFilter === 'morning' && (hour < 6 || hour >= 12)) return false;
      if (timeOfDayFilter === 'afternoon' && (hour < 12 || hour >= 18)) return false;
      if (timeOfDayFilter === 'night' && (hour >= 6 && hour < 18)) return false;
    }
    const caseTime = new Date(String(item.CrimeRegisteredDate).replace(' ', 'T')).getTime();
    if (caseTime > minTime + (dateRangeMs * (timelineIndex / 30))) return false;

    const layerTerms = { murder: 'murder', cyber: 'cyber', theft: 'theft', women: 'women' };
    if (layerTerms[activeLayer] && !`${item.majorHeadName} ${item.minorHeadName}`.toLowerCase().includes(layerTerms[activeLayer])) return false;

    return true;
  });
}

/** Calculate district-level crime trend spikes above 30% */
export function calculateEmergingTrends(allCases, districtsList) {
  // Define recent (e.g. last 30 days) and historical (prior 5 months) bounds
  const recentMin = new Date('2026-06-01').getTime();
  const recentMax = new Date('2026-06-30').getTime();
  const histMin = new Date('2026-01-01').getTime();

  const stats = {};
  districtsList.forEach(d => {
    stats[d.DistrictID] = { name: d.DistrictName, id: d.DistrictID, recent: 0, historical: 0 };
  });

  allCases.forEach(c => {
    const t = new Date(String(c.CrimeRegisteredDate).replace(' ', 'T')).getTime();
    if (isNaN(t)) return;
    
    // Find district via unit PoliceStationID
    const districtId = String(c.districtID);
    if (!stats[districtId]) return;

    if (t >= recentMin && t <= recentMax) {
      stats[districtId].recent += 1;
    } else if (t < recentMin && t >= histMin) {
      stats[districtId].historical += 1;
    }
  });

  const alerts = [];
  Object.values(stats).forEach(s => {
    const histAvg = s.historical / 5; // 5 month average
    if (histAvg > 0) {
      const pct = ((s.recent - histAvg) / histAvg) * 100;
      if (pct >= 30 && s.recent >= 4) {
        alerts.push({
          districtId: s.id,
          districtName: s.name,
          pctChange: Math.round(pct),
          recentCount: s.recent,
          avgCount: Math.round(histAvg)
        });
      }
    }
  });

  return alerts.sort((a, b) => b.pctChange - a.pctChange);
}


/** Build district inspection data for the drawer */
export function buildDistrictInspection(dName, dID) {
  const distCases = cases.filter(c => {
    return String(c.districtID) === String(dID);
  });
  const solved = distCases.filter(c => {
    return ['Closed', 'Convicted', 'Charge Sheeted'].includes(c.statusName);
  }).length;
  const rate = distCases.length > 0 ? Math.round((solved / distCases.length) * 100) : 76;

  const crimesCount = {};
  distCases.forEach(c => {
    const head = crimeHeads.find(h => h.CrimeHeadID === c.CrimeMajorHeadID);
    crimesCount[head?.CrimeGroupName || 'General'] = (crimesCount[head?.CrimeGroupName || 'General'] || 0) + 1;
  });
  const topCrime = Object.entries(crimesCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Property Offence';

  return {
    name: dName, id: dID, total: distCases.length, solved,
    detection: `${rate}%`, topCrime, peakTime: '21:00 - 01:00', highestArea: 'Division HQ Circle',
  };
}

/** Apply coordinate security (obfuscation in redacted mode) */
export function secureCoordinates(filteredCases, isCommandMode) {
  return filteredCases.map(c => {
    if (isCommandMode) return { lat: c.latitude, lng: c.longitude };
    return { lat: Number(Number(c.latitude).toFixed(2)), lng: Number(Number(c.longitude).toFixed(2)) };
  });
}

/** Get district center for fly-to */
export function getDistrictCenter(dID) {
  return districtCenters[dID] || null;
}
