/**
 * briefingApi.js — Client-side Simulated API Contract Layer for Operational Intelligence Briefing
 * 
 * Simulates server-side endpoints for KSP briefing workspace by calculating 
 * aggregates and indicators dynamically from the case views dataset.
 */

import { caseViews, districts, units, crimeHeads } from '../../data/schemaSelectors';

// Range Mapping definitions for Karnataka
export const rangeDistricts = {
  'Western Range': [4, 18, 19, 27],
  'Northern Range': [6, 7, 9, 20, 24, 25, 30, 31],
  'Central Range': [2, 10, 11, 12, 15, 16, 28, 29],
  'Southern Range': [3, 13, 14, 17, 26],
  'State Command': [1]
};

// District Populations for rate statistics
export const districtPopulations = {
  1: 12000000, 2: 1000000, 3: 3000000, 4: 2100000, 5: 1800000, 6: 4800000,
  7: 2600000, 8: 1400000, 9: 2500000, 10: 2700000, 11: 1800000, 12: 1950000,
  13: 1800000, 14: 1800000, 15: 1700000, 16: 1500000, 17: 1100000, 18: 1200000,
  19: 1400000, 20: 1700000, 21: 1100000, 22: 1600000, 23: 1400000, 24: 1900000,
  25: 1200000, 26: 1000000, 27: 550000, 28: 1100000, 29: 1300000, 30: 2200000,
  31: 1800000
};

// Parse briefing relative dates
function parseDateRange(range, customStart, customEnd) {
  const now = new Date("2026-07-18T23:59:59"); // Baseline platform simulation date
  let start = null;
  let end = now;

  if (range === '24h' || range === 'last_24h') {
    start = new Date(now.getTime() - 24 * 3600 * 1000);
  } else if (range === '7d' || range === 'last_7_days') {
    start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  } else if (range === 'custom' && customStart && customEnd) {
    start = new Date(customStart);
    end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
  } else {
    // default last 7 days for briefing summaries
    start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  }
  return { start, end };
}

// Master filter logic mirroring Statistics Page
function filterCaseload(filters = {}) {
  const {
    dateRange = 'last_7_days',
    startDate,
    endDate,
    jurisdictionLevel = 'all',
    selectedDistrict = 'all',
    selectedStation = 'all',
    selectedRange = 'all',
    crimeCategory = ['all'],
    threatLevel = 'all',
    classificationOnly = false
  } = filters;

  const { start, end } = parseDateRange(dateRange, startDate, endDate);

  return caseViews.filter(item => {
    // 1. Date filter
    if (item.registeredDateObj) {
      const time = item.registeredDateObj.getTime();
      if (time < start.getTime() || time > end.getTime()) return false;
    } else {
      return false;
    }

    // 2. Jurisdiction filter
    if (jurisdictionLevel === 'district' && selectedDistrict !== 'all') {
      if (item.districtID !== Number(selectedDistrict)) return false;
    } else if (jurisdictionLevel === 'station' && selectedStation !== 'all') {
      if (item.PoliceStationID !== Number(selectedStation)) return false;
    } else if (jurisdictionLevel === 'range' && selectedRange !== 'all') {
      const allowed = rangeDistricts[selectedRange] || [];
      if (!allowed.includes(item.districtID)) return false;
    }

    // 3. Category Filter
    if (crimeCategory && !crimeCategory.includes('all') && crimeCategory.length > 0) {
      const sId = String(item.majorHeadID);
      const isGroupMatched = crimeCategory.includes(sId) || crimeCategory.includes(item.crimeGroupName);
      if (!isGroupMatched) return false;
    }

    // 4. Heinous classification override if High Threat Level selected
    if (threatLevel === 'high' && !item.isHeinous) {
      return false;
    }

    // 5. Hide intelligence-grade items if classificationOnly is restricted
    if (classificationOnly && !item.isHeinous) {
      return false;
    }

    // 6. Simulate data feed filtering based on includeSources
    const includeSources = filters.includeSources || ['NCRB', 'OSINT'];
    if (!includeSources.includes('NCRB')) {
      if (item.CaseMasterID % 2 === 0) return false;
    }
    if (!includeSources.includes('OSINT')) {
      if (item.CaseMasterID % 2 !== 0) return false;
    }

    return true;
  });
}

// Mock API Call delay wrapper
const delay = (data, ms = 150) => new Promise(res => setTimeout(() => res(data), ms));

export const briefingApi = {
  // 1. GET /api/briefing/summary
  getSummary: (filters) => {
    const list = filterCaseload(filters);
    const totalMajorCrimes = list.length;
    const pendingHeinous = list.filter(c => c.isHeinous && c.statusName === 'Under Investigation').length;
    const activeBolos = 4;
    const emergingTrendsCount = 3;

    // Count districts with escalated risk (> 5 cases in list)
    const dCounts = {};
    list.forEach(c => { dCounts[c.districtName] = (dCounts[c.districtName] || 0) + 1; });
    const districtsEscalated = Object.values(dCounts).filter(cnt => cnt > 5).length || 1;

    return delay({
      totalMajorCrimes,
      percentChange: 14.2,
      districtsEscalated,
      activeCriticalIncidents: pendingHeinous,
      activeBolos,
      emergingTrendsCount
    });
  },

  // 2. GET /api/briefing/narrative
  getNarrative: (filters) => {
    const list = filterCaseload(filters);
    const bullets = [];
    
    if (list.length > 0) {
      const heinousCount = list.filter(c => c.isHeinous).length;
      bullets.push({
        text: `Spike detected in heinous offenses with ${heinousCount} active files registered under state jurisdiction.`,
        level: heinousCount > 5 ? 'critical' : 'high'
      });

      // Find top district
      const dCounts = {};
      list.forEach(c => { dCounts[c.districtName] = (dCounts[c.districtName] || 0) + 1; });
      const topD = Object.entries(dCounts).sort((a,b)=>b[1]-a[1])[0];
      if (topD) {
        bullets.push({
          text: `District ${topD[0]} reports elevated volume with ${topD[1]} logged caseloads. Nighttime sweeps recommended.`,
          level: 'high'
        });
      }

      bullets.push({
        text: `CCTV surveillance uptimes reached 98.4% state-wide. Beat patrol intervals remain stabilized.`,
        level: 'moderate'
      });

      bullets.push({
        text: `Repeat offenders alert triggers remain active near critical transportation nodes.`,
        level: 'low'
      });
    } else {
      bullets.push({ text: 'All checked security sectors report normal baseline activity limits.', level: 'low' });
    }

    return delay(bullets);
  },

  // 3. GET /api/briefing/incidents
  getIncidents: (filters) => {
    const list = filterCaseload(filters);
    
    // Critical incidents from heinous crimes list
    const criticalIncidents = list.filter(c => c.isHeinous).slice(0, 3).map(c => ({
      id: c.CaseMasterID,
      title: `${c.crimeGroupName || 'Heinous Assault'} - FIR ${c.CrimeNo}`,
      time: c.CrimeRegisteredDate,
      location: `${c.policeStationName}, ${c.districtName}`,
      note: `Case registered under ${c.minorHeadName || 'special sections'}. Investigation assigned.`
    }));

    // Find real cases with accused in caseViews to map BOLOs to actual records
    const casesWithAccused = caseViews.filter(c => c.accused && c.accused.length > 0);
    const case1 = casesWithAccused[0] || { CaseMasterID: 1, accused: [{ AccusedMasterID: 's_101', AccusedName: 'ACCUSED-101' }], districtName: 'Bengaluru' };
    const case2 = casesWithAccused[1] || { CaseMasterID: 2, accused: [{ AccusedMasterID: 's_102', AccusedName: 'ACCUSED-102' }], districtName: 'Bengaluru Rural' };

    // BOLOs list
    const bolos = [
      { 
        id: case1.CaseMasterID, 
        title: `Wanted Suspect: ${case1.accused[0].AccusedName || 'Theft Lead'}`, 
        text: `Associated with crime head: ${case1.minorHeadName || 'Commercial Break-ins'}. Linked to vehicle KA-03-M-1124.`, 
        suspectId: case1.accused[0].AccusedMasterID 
      },
      { 
        id: case2.CaseMasterID, 
        title: `BOLO Suspect: ${case2.accused[0].AccusedName || 'Vehicle Advisory'}`, 
        text: `Accused wanted in active case. Spotted leaving crime scene in ${case2.districtName || 'Bengaluru Rural'}.`, 
        suspectId: case2.accused[0].AccusedMasterID 
      }
    ];

    // AI generated insights
    const aiInsights = [
      { id: 'AI-INS-01', title: 'Temporal Burglary Cluster', text: 'BURGLARY spikes detected between 2 AM and 4 AM on Thursdays near Sector-5. 92% pattern match.' },
      { id: 'AI-INS-02', title: 'Cyber Fraud Signature', text: 'Increased reporting of phishing alerts targeting elderly citizens in Central zones. Vector: fake banking links.' }
    ];

    // Recommended Actions
    const recommendations = [
      { id: 'REC-01', action: 'Intercept Alpha Road Beat', station: 'M G Road Station', reason: 'High likelihood of vehicular transit alerts.', priority: 'CRITICAL' },
      { id: 'REC-02', action: 'Saturate Zone 4 Night Patrols', station: 'Cubbon Park PS', reason: 'Preventive policing targeting auto-thefts.', priority: 'HIGH' }
    ];

    return delay({
      criticalIncidents,
      bolos,
      aiInsights,
      recommendations
    });
  },

  // 4. GET /api/briefing/map
  getMapData: (filters) => {
    const list = filterCaseload(filters);
    
    // District risk quotients
    const dRisk = {};
    districts.forEach(d => {
      dRisk[d.DistrictID] = {
        id: d.DistrictID,
        name: d.DistrictName.replace(' (Dakshina Kannada)', ''),
        riskScore: 0,
        count: 0
      };
    });

    list.forEach(c => {
      if (dRisk[c.districtID]) {
        dRisk[c.districtID].count += 1;
      }
    });

    // Calculate risk scores based on caseload to vary naturally and avoid identically clamping to 100%
    districts.forEach(d => {
      if (dRisk[d.DistrictID]) {
        const count = dRisk[d.DistrictID].count;
        dRisk[d.DistrictID].riskScore = Math.min(95, Math.round(15 + (d.DistrictID * 6) % 35 + count * 1.2));
      }
    });

    const hotspots = Object.values(dRisk).sort((a,b)=>b.riskScore-a.riskScore).slice(0, 5);

    // Dynamic pins for critical incidents
    const pins = list.filter(c => c.isHeinous).slice(0, 8).map((c, idx) => ({
      id: c.CaseMasterID,
      lat: 12.97 + (c.districtID * 0.12) % 2.5,
      lng: 75.8 + (c.districtID * 0.08) % 1.8,
      title: `FIR ${c.CrimeNo}`,
      districtName: c.districtName,
      riskLevel: c.isHeinous ? 'CRITICAL' : 'HIGH'
    }));

    return delay({
      districtsRisk: Object.values(dRisk),
      hotspots,
      pins
    });
  },

  // 5. GET /api/briefing/trends
  getTrends: (filters) => {
    const list = filterCaseload(filters);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const trendData = days.map((d, i) => {
      const scale = (i + 1) * 1.5;
      return {
        name: d,
        'Violent': Math.round(list.length * 0.08 + scale * 1.2),
        'Property': Math.round(list.length * 0.15 + scale * 2.1),
        'Cyber': Math.round(list.length * 0.04 + scale * 0.8)
      };
    });

    const sparklines = [
      { label: 'Offenders Apprehended', value: '42 cases', trend: [12, 19, 14, 25, 30, 42] },
      { label: 'Chargesheet Timeliness', value: '84.6%', trend: [80, 81, 79, 83, 85, 84] },
      { label: 'Emergency Response Avg', value: '11.8 min', trend: [15, 14, 13, 12, 12, 11] }
    ];

    const hours = Array.from({ length: 12 }, (_, i) => `${i * 2}h`);
    const hourData = hours.map((h, i) => ({
      name: h,
      count: Math.round(list.length * 0.05 + ((i - 6) * (i - 6)) * 2.5)
    }));

    return delay({
      trendData,
      sparklines,
      hourData
    });
  },

  // 6. GET /api/briefing/comparisons
  getComparisons: (filters) => {
    const list = filterCaseload(filters);

    const scores = districts.slice(0, 8).map((d, i) => {
      const count = list.filter(c => c.districtID === d.DistrictID).length || (12 + (d.DistrictID * 5) % 24);
      const clearance = 50 + (d.DistrictID * 9) % 45;
      return {
        id: d.DistrictID,
        name: d.DistrictName.replace(' (Dakshina Kannada)', ''),
        count,
        clearance,
        rate: Math.round(count * 3.2)
      };
    });

    return delay(scores.sort((a,b)=>b.count-a.count));
  },

  // 7. GET /api/briefing/categories
  getCategories: (filters) => {
    const list = filterCaseload(filters);
    
    // category chart data
    const catCounts = {};
    list.forEach(c => {
      catCounts[c.crimeGroupName] = (catCounts[c.crimeGroupName] || 0) + 1;
    });

    const categories = Object.entries(catCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a,b)=>b.count-a.count)
      .slice(0, 5);

    // Victim demographics
    const ageData = [
      { name: '<18', count: Math.round(list.length * 0.08) || 3 },
      { name: '18-35', count: Math.round(list.length * 0.45) || 20 },
      { name: '36-60', count: Math.round(list.length * 0.35) || 15 },
      { name: '60+', count: Math.round(list.length * 0.12) || 5 }
    ];

    const genderData = [
      { name: 'Male', count: Math.round(list.length * 0.58) },
      { name: 'Female', count: Math.round(list.length * 0.40) },
      { name: 'Other', count: Math.round(list.length * 0.02) }
    ];

    return delay({
      categories,
      demographics: {
        ageData,
        genderData
      }
    });
  },

  // 8. GET /api/briefing/operations
  getOperations: () => {
    return delay({
      patrolCoverage: '42 / 50 beats active',
      patrolPercent: 84,
      cctvUptime: 97.8,
      personnelAvailable: 91.2
    });
  },

  // 9. GET /api/briefing/events
  getEvents: (filters) => {
    const includeSources = filters?.includeSources || ['NCRB', 'OSINT'];
    const events = [
      { id: 'EVT-01', title: 'Local Gathering and Procession', date: '2026-07-19', note: 'Heavy transit regulations in Central Zone. 40 units deployed.', severity: 'medium' },
      { id: 'EVT-02', title: 'VVIP Convoy Transit Route Beat', date: '2026-07-20', note: 'Anti-sabotage sweep checks at Sector 2 and highway exits.', severity: 'high' }
    ];

    const externalBulletins = [
      { source: 'NCRB', text: 'Regional cybersecurity reports indicate rise in social engineering scam volumes.' },
      { source: 'OSINT', text: 'National watchlist updates. Border transit checks advised for suspect registry.' }
    ].filter(b => includeSources.includes(b.source));

    return delay({
      events,
      bulletins: externalBulletins
    });
  },

  // 10. GET /api/ai/recommendations
  getRecommendations: () => {
    const recommendations = [
      { text: 'Deploy intercept vehicles near highway checkpoint Alpha.', priority: 'High', confidence: 95, status: 'Pending' },
      { text: 'Activate secondary CCTV feeds in commercial sector hubs.', priority: 'Medium', confidence: 84, status: 'Pending' },
      { text: 'Conduct security drills near transit checkpoints.', priority: 'Low', confidence: 71, status: 'Pending' }
    ];

    return delay(recommendations);
  }
};
