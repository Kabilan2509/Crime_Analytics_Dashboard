/**
 * copilotEngine.js — MADHUKAR AI Copilot Intelligence Engine
 *
 * All data is sourced from dataCache.js (shared 5-minute in-process cache).
 * No direct ZCQL queries here — all filtering and aggregation is done in
 * Node.js memory using the tables fetched once by dataCache.fetchAll().
 */

'use strict';

const dataCache = require('./dataCache');

// ─── Config ──────────────────────────────────────────────────────────────────
let _config = null;
function getConfig() {
  if (!_config) {
    try { _config = require('./quickml-config.json'); } catch (_) { _config = {}; }
  }
  return _config;
}

// ─── Lookup Map Builder (from raw tables) ─────────────────────────────────────
function buildMaps(tables) {
  const districts = tables.District || [];
  const units = tables.Unit || [];
  const crimeHeads = tables.CrimeHead || [];
  const gravityOffences = tables.GravityOffence || [];
  const employees = tables.Employee || [];
  const caseStatuses = tables.CaseStatusMaster || [];

  const districtByName = {};
  const districtByRowId = {};
  districts.forEach(d => {
    districtByName[(d.DistrictName || '').toLowerCase().trim()] = d;
    districtByRowId[d.ROWID] = d.DistrictName;
  });

  const stationByRowId = {};
  const stationRowIdsByDistrictRowId = {};
  units.forEach(u => {
    stationByRowId[u.ROWID] = u;
    const dRowId = u.DistrictID;
    if (dRowId) {
      if (!stationRowIdsByDistrictRowId[dRowId]) stationRowIdsByDistrictRowId[dRowId] = new Set();
      stationRowIdsByDistrictRowId[dRowId].add(u.ROWID);
    }
  });

  const crimeHeadByRowId = {};
  crimeHeads.forEach(h => { crimeHeadByRowId[h.ROWID] = h; });

  let heinousRowId = null;
  let nonHeinousRowId = null;
  gravityOffences.forEach(g => {
    const str = JSON.stringify(g).toLowerCase();
    if (/heinous|grave|serious/.test(str) && !heinousRowId) heinousRowId = g.ROWID;
    if (/non[- ]heinous|minor|petty/.test(str) && !nonHeinousRowId) nonHeinousRowId = g.ROWID;
  });
  if (!heinousRowId && gravityOffences.length > 0) heinousRowId = gravityOffences[0].ROWID;
  if (!nonHeinousRowId && gravityOffences.length > 1) nonHeinousRowId = gravityOffences[1].ROWID;

  const employeeByRowId = {};
  const employeeByEmpId = {};
  employees.forEach(e => {
    employeeByRowId[e.ROWID] = e;
    if (e.EmployeeID) employeeByEmpId[String(e.EmployeeID)] = e;
  });

  const statusByRowId = {};
  caseStatuses.forEach(s => { statusByRowId[s.ROWID] = s; });

  return {
    districtByName, districtByRowId,
    stationByRowId, stationRowIdsByDistrictRowId,
    crimeHeadByRowId, heinousRowId, nonHeinousRowId,
    employeeByRowId, employeeByEmpId, statusByRowId,
  };
}

// ─── In-Memory Filters ────────────────────────────────────────────────────────
function filterByDate(cases, dateRange) {
  if (!dateRange) return cases;
  const days = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[dateRange];
  if (!days) return cases;
  const cutoff = Date.now() - days * 86400000;
  return cases.filter(c => c.CrimeRegisteredDate && new Date(c.CrimeRegisteredDate).getTime() >= cutoff);
}

function getDistrictForCase(c, maps) {
  const station = maps.stationByRowId[c.PoliceStationID];
  if (!station) return null;
  return maps.districtByRowId[station.DistrictID] || null;
}

function filterByDistrict(cases, districtName, maps) {
  if (!districtName) return cases;
  const lower = districtName.toLowerCase().trim();
  const dist = maps.districtByName[lower] ||
    Object.values(maps.districtByName).find(d => (d.DistrictName || '').toLowerCase().includes(lower));
  if (!dist) return [];
  const stationSet = maps.stationRowIdsByDistrictRowId[dist.ROWID] || new Set();
  return cases.filter(c => stationSet.has(c.PoliceStationID));
}

function findCrimeHead(crimeType, tables) {
  if (!crimeType) return null;
  const lower = crimeType.toLowerCase();
  const keywords = CRIME_HEAD_KEYWORDS[lower] || CRIME_KEYWORDS[lower] || [lower];
  return (tables.CrimeHead || []).find(h =>
    keywords.some(kw => (h.CrimeGroupName || '').toLowerCase().includes(kw))
  ) || null;
}

function filterByCrimeType(cases, crimeType, tables) {
  const head = findCrimeHead(crimeType, tables);
  if (!head) return [];
  return cases.filter(c => c.CrimeMajorHeadID === head.ROWID);
}

function filterHeinous(cases, maps) {
  if (!maps.heinousRowId) return cases;
  return cases.filter(c => c.GravityOffenceID === maps.heinousRowId);
}

function filterByHour(cases, hour, relation) {
  return cases.filter(c => {
    const value = c.IncidentFromDate || c.InfoReceivedPSDate || c.CrimeRegisteredDate;
    if (!value) return false;
    const h = new Date(value.replace(' ', 'T')).getHours();
    return relation === 'after' ? h >= hour : h <= hour;
  });
}

function incidentDate(c) {
  const value = c.IncidentFromDate || c.InfoReceivedPSDate || c.CrimeRegisteredDate;
  if (!value) return null;
  const parsed = new Date(value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function filterTemporalWindow(cases, entities) {
  return cases.filter(c => {
    const date = incidentDate(c);
    if (!date) return false;
    if (entities.specificDate) {
      const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (localDate !== entities.specificDate) return false;
    }
    if (entities.weekendOnly && date.getDay() !== 0 && date.getDay() !== 6) return false;
    if (entities.hourStart !== undefined) {
      const hour = date.getHours();
      const inWindow = entities.hourStart <= entities.hourEnd
        ? hour >= entities.hourStart && hour <= entities.hourEnd
        : hour >= entities.hourStart || hour <= entities.hourEnd;
      if (!inWindow) return false;
    }
    return true;
  });
}

function labelRange(r) {
  return { '24h': 'today', '7d': 'this week', '30d': 'this month', '90d': 'last 3 months', '365d': 'this year' }[r] || 'all time';
}

// ─── Intent Classifier ───────────────────────────────────────────────────────
const DISTRICT_NAMES = [
  'bagalkot','ballari','belagavi','bengaluru urban','bengaluru rural',
  'bidar','chamarajanagar','chikkaballapura','chikkamagaluru','chitradurga',
  'dakshina kannada','davanagere','dharwad','gadag','hassan','haveri',
  'kalaburagi','kodagu','kolar','koppal','mandya','mysuru','raichur',
  'ramanagara','shivamogga','tumakuru','udupi','uttara kannada','vijayanagara','vijayapura','yadgir'
];

const DISTRICT_ALIASES = {
  'bangalore': 'Bengaluru Urban', 'bangalore city': 'Bengaluru Urban',
  'bengaluru city': 'Bengaluru Urban', 'bengaluru district': 'Bengaluru Rural',
  'bagalkote': 'Bagalkot', 'chamarajanagara': 'Chamarajanagar',
  'mysore': 'Mysuru', 'gulbarga': 'Kalaburagi', 'belgaum': 'Belagavi',
  'bellary': 'Ballari', 'bijapur': 'Vijayapura', 'shimoga': 'Shivamogga',
  'tumkur': 'Tumakuru', 'mangalore': 'Dakshina Kannada',
};

const CRIME_KEYWORDS = {
  murder:     ['murder','homicide','killing'],
  robbery:    ['robbery','rob','dacoity'],
  theft:      ['theft','steal','stolen','burglary','pickpocket'],
  assault:    ['assault','grievous hurt','hurt','attack'],
  rape:       ['rape','sexual assault','pocso'],
  fraud:      ['fraud','cheating','cybercrime','cyber'],
  ndps:       ['ndps','drugs','narcotic','ganja'],
  kidnapping: ['kidnap','abduction'],
  arson:      ['arson'],
};

const CRIME_HEAD_KEYWORDS = {
  murder: ['crimes against body'], robbery: ['crimes against property'],
  theft: ['crimes against property'], assault: ['crimes against body'],
  rape: ['crimes against women'], fraud: ['economic offences', 'cyber crimes'],
  ndps: ['narcotics'], kidnapping: ['crimes against body'],
  arson: ['crimes against property'],
};

function classifyIntent(q, history) {
  const lower = q.toLowerCase();
  if (/\b(who is|investigating officer|\bio\b|officer in charge|assigned officer)\b/.test(lower)) return 'OFFICER_QUERY';
  if (/\b(predict|forecast|risk|projection|future crime)\b/.test(lower)) return 'RISK_PREDICTION';
  if (/\b(briefing|brief|summary|daily report|intelligence summary|generate report)\b/.test(lower)) return 'DAILY_BRIEFING';
  if (/\b(repeat offender|habitual|criminal history|previous cases|prior|known criminal)\b/.test(lower)) return 'REPEAT_OFFENDER';
  if (/\b(cross.?ref|linked cases|same accused|same vehicle|related cases)\b/.test(lower)) return 'CROSS_REFERENCE';
  if (/\b(similar|same modus|modus operandi)\b/.test(lower)) return 'SIMILAR_CASE';
  if (/\b(workload|pending|backlog|open cases|station load)\b/.test(lower)) return 'STATION_WORKLOAD';
  if (/\b(hotspot|most cases|top district|highest|worst district|most crime|ranking)\b/.test(lower)) return 'HOTSPOT';
  if (/\b(after \d|before \d|midnight|night patrol|morning|afternoon|evening|weekends?|time of day|\d+ ?[ap]m)\b/.test(lower) ||
      /\b20\d{2}-\d{1,2}-\d{1,2}\b/.test(lower) ||
      /\b\d{1,2}[\/-]\d{1,2}[\/-]20\d{2}\b/.test(lower) ||
      /\b\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+20\d{2}\b/.test(lower)) return 'TEMPORAL_PATTERN';
  for (const [, keywords] of Object.entries(CRIME_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return 'CRIME_TYPE';
  }
  if (/\b(how many|count|total|number of|firs|cases|registered|crimes)\b/.test(lower)) return 'CRIME_COUNT';
  const isFollowUp = /\b(those|them|these|there|same|also|from those|of those|what about|how about|and in)\b/.test(lower);
  if (isFollowUp) {
    const lastAi = [...history].reverse().find(m => m.type === 'ai' && m.intent);
    if (lastAi) return lastAi.intent;
  }
  return 'CRIME_COUNT';
}

function extractEntities(q, history) {
  const lower = q.toLowerCase();
  const entities = {};
  const isFollowUp = /\b(those|them|these|there|same|also|from those|of those|what about|how about|and in)\b/.test(lower);

  for (const d of DISTRICT_NAMES) {
    if (lower.includes(d)) { entities.districtName = d.replace(/\b\w/g, c => c.toUpperCase()); break; }
  }
  if (!entities.districtName) {
    const alias = Object.keys(DISTRICT_ALIASES).find(name => lower.includes(name));
    if (alias) entities.districtName = DISTRICT_ALIASES[alias];
  }
  for (const [type, kws] of Object.entries(CRIME_KEYWORDS)) {
    if (kws.some(kw => lower.includes(kw))) { entities.crimeType = type; break; }
  }

  const firMatch = lower.match(/\b(?:fir|case|no\.?|number)[\s#]+([a-z0-9\-\/]+)/i) || lower.match(/\b(\d{5,})\b/);
  if (firMatch) entities.firNo = firMatch[1];

  if (/\btoday\b/.test(lower)) entities.dateRange = '24h';
  else if (/\bthis week\b|\blast 7 days?\b/.test(lower)) entities.dateRange = '7d';
  else if (/\bthis month\b|\blast 30 days?\b/.test(lower)) entities.dateRange = '30d';
  else if (/\blast 3 months?\b|\blast quarter\b/.test(lower)) entities.dateRange = '90d';
  else if (/\bthis year\b|\blast year\b/.test(lower)) entities.dateRange = '365d';

  const isoDate = lower.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  const slashDate = lower.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/);
  const monthNames = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
  const namedDate = lower.match(/\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2})\b/);
  const monthFirstDate = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)[,\s]+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(20\d{2})\b/);
  if (isoDate) entities.specificDate = `${isoDate[1]}-${isoDate[2].padStart(2, '0')}-${isoDate[3].padStart(2, '0')}`;
  else if (slashDate) entities.specificDate = `${slashDate[3]}-${slashDate[2].padStart(2, '0')}-${slashDate[1].padStart(2, '0')}`;
  else if (namedDate) entities.specificDate = `${namedDate[3]}-${String(monthNames[namedDate[2]]).padStart(2, '0')}-${namedDate[1].padStart(2, '0')}`;
  else if (monthFirstDate) entities.specificDate = `${monthFirstDate[3]}-${String(monthNames[monthFirstDate[1]]).padStart(2, '0')}-${monthFirstDate[2].padStart(2, '0')}`;

  const hourMatch = lower.match(/\b(after|before) (\d+)\s*(pm|am)\b/);
  if (hourMatch) {
    let h = parseInt(hourMatch[2]);
    if (hourMatch[3] === 'pm' && h !== 12) h += 12;
    if (hourMatch[3] === 'am' && h === 12) h = 0;
    entities.hour = h; entities.hourRelation = hourMatch[1];
  }
  if (/\bmidnight\b/.test(lower)) { entities.hourStart = 0; entities.hourEnd = 3; }
  else if (/\bmorning\b/.test(lower)) { entities.hourStart = 5; entities.hourEnd = 11; }
  else if (/\bafternoon\b/.test(lower)) { entities.hourStart = 12; entities.hourEnd = 16; }
  else if (/\bevening\b/.test(lower)) { entities.hourStart = 17; entities.hourEnd = 20; }
  else if (/\bnight(?: patrol)?\b/.test(lower)) { entities.hourStart = 21; entities.hourEnd = 4; }
  if (/\bweekends?\b/.test(lower)) entities.weekendOnly = true;
  if (/\b(heinous|grave|serious|capital)\b/.test(lower)) entities.heinousOnly = true;

  const lastAi = [...history].reverse().find(m => m.type === 'ai' && m.entities);
  if (isFollowUp && lastAi) {
    if (!entities.districtName && lastAi.entities?.districtName) { entities.districtName = lastAi.entities.districtName; entities._inherited = true; }
    if (!entities.crimeType && lastAi.entities?.crimeType) { entities.crimeType = lastAi.entities.crimeType; entities._inherited = true; }
    if (!entities.dateRange && lastAi.entities?.dateRange) { entities.dateRange = lastAi.entities.dateRange; }
  }
  return entities;
}

function makeSuggestions(intent, entities) {
  const d = entities.districtName || 'Bengaluru City';
  switch (intent) {
    case 'CRIME_COUNT':      return [`Which districts have the most heinous crimes?`, `Show ${entities.crimeType || 'robbery'} cases in ${d}`, `Find repeat offenders in ${d}`];
    case 'HOTSPOT':          return [`Show pending cases in the top district`, `Predict crime risk for ${d}`, `Find repeat offenders in ${d}`];
    case 'CRIME_TYPE':       return [`Show temporal pattern for ${entities.crimeType || 'robbery'} cases`, `Who are repeat offenders for ${entities.crimeType || 'robbery'}?`, `Which station has the most ${entities.crimeType || 'robbery'} cases?`];
    case 'REPEAT_OFFENDER':  return [`Cross-reference these accused with other districts`, `Show cases with same accused in different stations`, `Generate daily briefing`];
    case 'TEMPORAL_PATTERN': return [`Which area is the hotspot for this time window?`, `Find crimes on weekends in ${d}`, `Show patrol allocation for peak hours`];
    case 'STATION_WORKLOAD': return [`Show IO assignments for pending cases in ${d}`, `Compare workload across stations in ${d}`, `Generate daily briefing`];
    case 'OFFICER_QUERY':    return [`Show all pending cases for this officer`, `Show workload by station in ${d}`, `Who are top IOs in ${d}?`];
    case 'DAILY_BRIEFING':   return [`Show hotspots from today`, `Predict risk for top 3 districts`, `Find repeat offenders active this week`];
    case 'RISK_PREDICTION':  return [`Show crime trend for ${d} this year`, `Find hotspot stations in ${d}`, `Generate intelligence briefing for ${d}`];
    default:                 return [`Show heinous cases in ${d}`, `Find repeat offenders in ${d}`, `Generate daily intelligence briefing`];
  }
}

// ─── Intent Handlers ─────────────────────────────────────────────────────────

async function handleCrimeCount(app, entities) {
  const tables = await dataCache.fetchAll(app);
  const maps = buildMaps(tables);
  let filtered = filterByDate(tables.CaseMaster, entities.dateRange);
  if (entities.districtName) filtered = filterByDistrict(filtered, entities.districtName, maps);
  if (entities.heinousOnly) filtered = filterHeinous(filtered, maps);
  if (entities.crimeType) filtered = filterByCrimeType(filtered, entities.crimeType, tables);
  const total = filtered.length;
  const scope = entities.districtName || 'Karnataka';
  const qualifier = entities.heinousOnly ? ' heinous' : '';
  return {
    answer: `There are **${total.toLocaleString()}**${qualifier} FIRs registered in **${scope}** for ${labelRange(entities.dateRange)}.`,
    summary: `Total${qualifier} cases in ${scope} (${labelRange(entities.dateRange)}): ${total}`,
    results: [],
    chartData: [],
    sources: [`CaseMaster × ${total} rows (filtered from ${tables.CaseMaster.length})`],
  };
}

async function handleHotspot(app, entities) {
  const tables = await dataCache.fetchAll(app);
  const maps = buildMaps(tables);
  let filtered = filterByDate(tables.CaseMaster, entities.dateRange);
  if (entities.heinousOnly) filtered = filterHeinous(filtered, maps);

  const distCounts = {};
  filtered.forEach(c => {
    const name = getDistrictForCase(c, maps) || 'Unknown';
    distCounts[name] = (distCounts[name] || 0) + 1;
  });
  const ranked = Object.entries(distCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  const top = ranked[0];
  const qualifier = entities.heinousOnly ? 'heinous ' : '';
  return {
    answer: `**${top?.name || 'N/A'}** is the top ${qualifier}crime hotspot with **${top?.count?.toLocaleString() || 0}** FIRs (${labelRange(entities.dateRange)}).`,
    summary: `Top 10 districts by ${qualifier}caseload (${labelRange(entities.dateRange)})`,
    results: ranked.map((r, i) => ({ CrimeNo: `#${i + 1}`, policeStationName: r.name, crimeGroupName: `${r.count.toLocaleString()} FIRs` })),
    chartData: ranked.slice(0, 6).map(r => ({ name: r.name.split(' ')[0], cases: r.count })),
    sources: [`CaseMaster × ${filtered.length} rows grouped by district`],
  };
}

async function handleCrimeType(app, entities) {
  const tables = await dataCache.fetchAll(app);
  const maps = buildMaps(tables);
  const crimeHead = findCrimeHead(entities.crimeType, tables);

  let filtered = filterByDate(tables.CaseMaster, entities.dateRange);
  if (entities.districtName) filtered = filterByDistrict(filtered, entities.districtName, maps);
  if (entities.heinousOnly) filtered = filterHeinous(filtered, maps);
  if (entities.crimeType) filtered = filterByCrimeType(filtered, entities.crimeType, tables);

  const monthly = {};
  filtered.forEach(c => {
    if (!c.CrimeRegisteredDate) return;
    const m = c.CrimeRegisteredDate.substring(0, 7);
    monthly[m] = (monthly[m] || 0) + 1;
  });
  const chartData = Object.entries(monthly).sort(([a],[b]) => a.localeCompare(b)).slice(-6)
    .map(([k,v]) => ({ name: k.substring(5), cases: v }));

  const scope = entities.districtName || 'Karnataka';
  return {
    answer: `Found **${filtered.length}** ${entities.crimeType || 'crime'} cases in **${scope}** (${labelRange(entities.dateRange)}).`,
    summary: `${entities.crimeType || 'Crime'} in ${scope} (${labelRange(entities.dateRange)}): ${filtered.length} records`,
    results: filtered.slice(0, 10).map(c => ({
      CrimeNo: c.CrimeNo || c.CaseMasterID,
      policeStationName: maps.stationByRowId[c.PoliceStationID]?.UnitName || '—',
      crimeGroupName: crimeHead?.CrimeGroupName || entities.crimeType,
    })),
    chartData,
    sources: [`CaseMaster × ${filtered.length} rows`, crimeHead ? `CrimeHead: ${crimeHead.CrimeGroupName}` : ''],
  };
}

async function handleRepeatOffender(app, entities) {
  const tables = await dataCache.fetchAll(app);
  const maps = buildMaps(tables);
  const accused = tables.Accused || [];

  let filteredCases = tables.CaseMaster;
  if (entities.districtName) filteredCases = filterByDistrict(filteredCases, entities.districtName, maps);
  const caseRowIds = new Set(filteredCases.map(c => c.ROWID));

  const nameMap = {};
  accused.forEach(a => {
    if (!a.AccusedName) return;
    if (entities.districtName && !caseRowIds.has(a.CaseMasterID)) return;
    const key = a.AccusedName.toLowerCase().trim();
    if (!nameMap[key]) nameMap[key] = { name: a.AccusedName, alias: a.AccusedAliasName, count: 0 };
    nameMap[key].count++;
  });

  const repeats = Object.values(nameMap).filter(r => r.count > 1)
    .sort((a, b) => b.count - a.count).slice(0, 10);
  const scope = entities.districtName || 'Karnataka';

  return {
    answer: `Identified **${repeats.length}** repeat offenders in **${scope}** with multiple FIRs on record.`,
    summary: `Repeat offenders (${scope}): ${repeats.length} individuals with 2+ cases`,
    results: repeats.map(r => ({ CrimeNo: `${r.count} FIRs`, policeStationName: r.name, crimeGroupName: r.alias ? `aka ${r.alias}` : 'No alias' })),
    chartData: repeats.slice(0, 6).map(r => ({ name: (r.name || '?').split(' ')[0], cases: r.count })),
    sources: [`Accused × ${accused.length} records cross-referenced`],
  };
}

async function handleTemporalPattern(app, entities) {
  const tables = await dataCache.fetchAll(app);
  const maps = buildMaps(tables);

  let filtered = filterByDate(tables.CaseMaster, entities.specificDate ? undefined : (entities.dateRange || '30d'));
  if (entities.districtName) filtered = filterByDistrict(filtered, entities.districtName, maps);
  if (entities.crimeType) filtered = filterByCrimeType(filtered, entities.crimeType, tables);
  if (entities.hour !== undefined) filtered = filterByHour(filtered, entities.hour, entities.hourRelation);
  filtered = filterTemporalWindow(filtered, entities);

  const hourDist = {};
  filtered.forEach(c => {
    const date = incidentDate(c);
    if (!date) return;
    const h = date.getHours();
    const label = `${h.toString().padStart(2,'0')}h`;
    hourDist[label] = (hourDist[label] || 0) + 1;
  });
  const peakEntry = Object.entries(hourDist).sort(([,a],[,b]) => b-a)[0];
  const chartData = Object.entries(hourDist).sort(([a],[b]) => a.localeCompare(b))
    .map(([name, cases]) => ({ name, cases }));
  const scope = entities.districtName || 'Karnataka';

  return {
    answer: `Analysed **${filtered.length}** cases in **${scope}**. Peak crime hour: **${peakEntry?.[0] || 'N/A'}** with **${peakEntry?.[1] || 0}** incidents.`,
    summary: `Temporal pattern (${scope}): peak at ${peakEntry?.[0] || 'N/A'}`,
    results: filtered.slice(0, 8).map(c => ({
      CrimeNo: c.CrimeNo || c.CaseMasterID,
      policeStationName: maps.stationByRowId[c.PoliceStationID]?.UnitName || '—',
      crimeGroupName: incidentDate(c)?.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) || '—',
    })),
    chartData,
    sources: [`CaseMaster × ${filtered.length} rows (time-filtered)`],
  };
}

async function handleSimilarCase(app, entities) {
  const tables = await dataCache.fetchAll(app);
  const maps = buildMaps(tables);
  const cases = tables.CaseMaster || [];

  const baseCase = entities.firNo
    ? cases.find(c => (c.CrimeNo || '').includes(entities.firNo) || (c.CaseMasterID || '').includes(entities.firNo))
    : null;
  const similar = baseCase
    ? cases.filter(c => c.ROWID !== baseCase.ROWID && c.CrimeMajorHeadID === baseCase.CrimeMajorHeadID && c.PoliceStationID === baseCase.PoliceStationID).slice(0, 10)
    : [...cases].sort((a, b) => (b.CrimeRegisteredDate || '').localeCompare(a.CrimeRegisteredDate || '')).slice(0, 10);

  return {
    answer: baseCase ? `Found **${similar.length}** cases similar to FIR **${baseCase.CrimeNo}**.` : `No FIR number detected. Showing **${similar.length}** most recent cases.`,
    summary: `Similar case search: ${similar.length} matched records`,
    results: similar.map(c => ({ CrimeNo: c.CrimeNo || c.CaseMasterID, policeStationName: maps.stationByRowId[c.PoliceStationID]?.UnitName || '—', crimeGroupName: (c.CrimeRegisteredDate || '').split('T')[0] })),
    chartData: [],
    sources: [`CaseMaster in-memory similarity match`],
  };
}

async function handleStationWorkload(app, entities) {
  const tables = await dataCache.fetchAll(app);
  const maps = buildMaps(tables);

  let filtered = filterByDate(tables.CaseMaster, entities.dateRange);
  if (entities.districtName) filtered = filterByDistrict(filtered, entities.districtName, maps);

  const stationCounts = {};
  filtered.forEach(c => {
    const sid = c.PoliceStationID;
    if (!stationCounts[sid]) stationCounts[sid] = { total: 0, pending: 0 };
    stationCounts[sid].total++;
    const statusRow = maps.statusByRowId[c.CaseStatusID];
    if (/pending|investigation|under/i.test(JSON.stringify(statusRow || {}))) stationCounts[sid].pending++;
  });

  const ranked = Object.entries(stationCounts)
    .map(([sid, d]) => ({ name: maps.stationByRowId[sid]?.UnitName || `Station—`, total: d.total, pending: d.pending }))
    .sort((a, b) => b.total - a.total).slice(0, 10);
  const top = ranked[0];
  const scope = entities.districtName || 'Karnataka';

  return {
    answer: `**${top?.name || 'N/A'}** has the highest caseload with **${top?.total || 0}** FIRs in **${scope}**.`,
    summary: `Station workload (${scope}): top 10 stations`,
    results: ranked.map(r => ({ CrimeNo: `${r.total} total`, policeStationName: r.name, crimeGroupName: `${r.pending} pending` })),
    chartData: ranked.slice(0, 6).map(r => ({ name: r.name.split(' ')[0], cases: r.total })),
    sources: [`CaseMaster × ${filtered.length} rows grouped by station`],
  };
}

async function handleOfficerQuery(app, entities) {
  const tables = await dataCache.fetchAll(app);
  const maps = buildMaps(tables);
  const cases = tables.CaseMaster || [];

  const targetCase = entities.firNo
    ? cases.find(c => (c.CrimeNo || '').includes(entities.firNo) || (c.CaseMasterID || '').includes(entities.firNo))
    : null;

  if (targetCase) {
    const emp = maps.employeeByRowId[targetCase.PolicePersonID] || maps.employeeByEmpId[String(targetCase.PolicePersonID)] || null;
    const name = emp ? `${emp.FirstName || ''} ${emp.LastName || ''}`.trim() : `ID ${targetCase.PolicePersonID}`;
    return {
      answer: `The Investigating Officer for FIR **${targetCase.CrimeNo}** is **${name}**.`,
      summary: `IO for FIR ${targetCase.CrimeNo}: ${name}`,
      results: [{ CrimeNo: targetCase.CrimeNo || targetCase.CaseMasterID, policeStationName: name, crimeGroupName: 'Investigating Officer' }],
      chartData: [],
      sources: [`CaseMaster + Employee lookup`],
    };
  }

  let filteredCases = filterByDate(cases, entities.dateRange);
  if (entities.districtName) filteredCases = filterByDistrict(filteredCases, entities.districtName, maps);
  const officerCounts = {};
  filteredCases.forEach(c => { if (c.PolicePersonID) officerCounts[c.PolicePersonID] = (officerCounts[c.PolicePersonID] || 0) + 1; });
  const topOfficers = Object.entries(officerCounts).sort(([,a],[,b]) => b-a).slice(0, 5)
    .map(([pid, cnt]) => {
      const emp = maps.employeeByRowId[pid] || maps.employeeByEmpId[pid] || null;
      const name = emp ? `${emp.FirstName || ''} ${emp.LastName || ''}`.trim() : `Officer ${pid}`;
      return { CrimeNo: `${cnt} cases`, policeStationName: name, crimeGroupName: 'Investigating Officer' };
    });

  return {
    answer: `Top Investigating Officers in **${entities.districtName || 'Karnataka'}** by caseload:`,
    summary: `Officer workload — top 5 IOs`,
    results: topOfficers,
    chartData: [],
    sources: [`CaseMaster + Employee tables`],
  };
}

async function handleDailyBriefing(app, entities) {
  const tables = await dataCache.fetchAll(app);
  const maps = buildMaps(tables);

  const isSpecificDate = Boolean(entities.specificDate);
  let weekCases = isSpecificDate
    ? filterTemporalWindow(tables.CaseMaster, entities)
    : filterByDate(tables.CaseMaster, '7d');
  let todayCases = isSpecificDate ? [...weekCases] : filterByDate(tables.CaseMaster, '24h');
  if (entities.districtName) {
    weekCases = filterByDistrict(weekCases, entities.districtName, maps);
    todayCases = filterByDistrict(todayCases, entities.districtName, maps);
  }
  const heinousWeek = filterHeinous(weekCases, maps);

  const distCounts = {};
  weekCases.forEach(c => {
    const name = getDistrictForCase(c, maps) || 'Unknown';
    distCounts[name] = (distCounts[name] || 0) + 1;
  });
  const topDistricts = Object.entries(distCounts).sort(([,a],[,b]) => b-a).slice(0, 5);
  const topDistrictName = topDistricts[0]?.[0] || entities.districtName || 'N/A';
  const today = isSpecificDate
    ? new Date(`${entities.specificDate}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const overviewLabel = isSpecificDate ? 'Selected Date Overview' : 'Week Overview (last 7 days)';
  const periodLabel = isSpecificDate ? 'on selected date' : 'this week';
  const todayLabel = isSpecificDate ? 'FIRs on selected date' : 'FIRs today';

  return {
    answer: `## KSP Intelligence Briefing — ${entities.districtName || 'Karnataka'} — ${today}\n\n**${overviewLabel}:**\n- Total FIRs registered: **${weekCases.length.toLocaleString()}**\n- Heinous/Grave offences: **${heinousWeek.length.toLocaleString()}**\n- ${todayLabel}: **${todayCases.length}**\n- Top hotspot: **${topDistrictName}** (${topDistricts[0]?.[1] || 0} FIRs ${periodLabel})\n\nAll data sourced live from Catalyst Data Store.`,
    summary: `Briefing (${today}): ${weekCases.length} FIRs ${periodLabel}, ${heinousWeek.length} heinous. Hotspot: ${topDistrictName}.`,
    results: topDistricts.map(([name, cnt]) => ({ CrimeNo: `${cnt} FIRs`, policeStationName: name, crimeGroupName: isSpecificDate ? 'Selected date' : 'This week' })),
    chartData: topDistricts.map(([name, cnt]) => ({ name: name.split(' ')[0], cases: cnt })),
    sources: [`CaseMaster × ${weekCases.length} rows (${isSpecificDate ? entities.specificDate : 'last 7 days'})`, `District + Unit reference`],
  };
}

async function callQuickML(cfg, featureData) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const accessToken = process.env.QUICKML_ACCESS_TOKEN || cfg.quickml_access_token;
    if (!accessToken) {
      reject(new Error('QuickML OAuth token is missing (requires QuickML.deployment.READ)'));
      return;
    }

    const body = JSON.stringify({ data: featureData });
    const url = new URL(cfg.quickml_endpoint_url);
    url.searchParams.set('explainModel', 'true');
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-QUICKML-ENDPOINT-KEY': cfg.quickml_endpoint_key,
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'CATALYST-ORG': String(cfg.quickml_org_id),
        'Environment': cfg.quickml_environment || 'Development',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`QuickML HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed?.code && parsed?.message && !parsed?.result) {
            reject(new Error(`QuickML ${parsed.code}: ${parsed.message}`));
            return;
          }
          resolve(parsed);
        }
        catch (e) { reject(new Error(`QuickML parse error: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('QuickML timeout')); });
    req.write(body);
    req.end();
  });
}

async function handleRiskPrediction(app, entities) {
  const tables = await dataCache.fetchAll(app);
  const maps = buildMaps(tables);

  let filtered = filterByDate(tables.CaseMaster, entities.dateRange || '30d');
  if (entities.districtName) filtered = filterByDistrict(filtered, entities.districtName, maps);
  const heinousFiltered = filterHeinous(filtered, maps);

  const total = filtered.length;
  const heinousCount = heinousFiltered.length;
  const scope = entities.districtName || 'Karnataka';
  const period = labelRange(entities.dateRange || '30d');
  const statScore = total > 0 ? Math.min(100, Math.round((heinousCount / total) * 100 * 1.5 + Math.log(total + 1) * 5)) : 0;
  const riskLabel = statScore > 70 ? '🔴 HIGH' : statScore > 40 ? '🟡 MODERATE' : '🟢 LOW';

  const cfg = getConfig();
  if (cfg.quickml_endpoint_key && cfg.quickml_endpoint_url && filtered.length > 0) {
    try {
      const sampleCases = [...filtered]
        .sort((a, b) => (b.CrimeRegisteredDate || '').localeCompare(a.CrimeRegisteredDate || ''))
        .slice(0, 5)
        .filter(c => c.CrimeMajorHeadID && c.PoliceStationID && c.CaseStatusID && c.CaseCategoryID);

      if (sampleCases.length === 0) throw new Error('No valid feature rows');

      let heinousPredictions = 0, totalPredictions = 0, avgLikelihood = 0;
      for (const c of sampleCases) {
        const result = await callQuickML(cfg, {
          CrimeMajorHeadID: c.CrimeMajorHeadID,
          latitude: parseFloat(c.latitude) || 0,
          CaseStatusID: c.CaseStatusID,
          CaseCategoryID: c.CaseCategoryID,
          PoliceStationID: c.PoliceStationID,
          longitude: parseFloat(c.longitude) || 0,
        });
        console.log(`[Copilot QuickML] Case ${c.CrimeNo} →`, JSON.stringify(result).slice(0, 120));
        const predicted = result?.result?.[0];
        const likelihood = parseFloat(result?.likelihood_score?.[0] || 0);
        avgLikelihood += likelihood;
        totalPredictions++;
        if (String(predicted) === String(maps.heinousRowId)) heinousPredictions++;
      }

      const mlScore = Math.round((heinousPredictions / totalPredictions) * 100);
      avgLikelihood = avgLikelihood / totalPredictions;
      const mlLabel = mlScore > 70 ? '🔴 HIGH RISK' : mlScore > 40 ? '🟡 MODERATE RISK' : '🟢 LOW RISK';

      return {
        answer: `**🤖 QuickML Risk Assessment — ${scope}** (${period}):\n\n- Cases analysed: **${total.toLocaleString()}** | Heinous (actual): **${heinousCount}**\n- ML samples evaluated: **${totalPredictions}** recent FIRs\n- ML Predicted Heinous Rate: **${mlScore}%** — ${mlLabel}\n- Model Confidence: **${Math.round(avgLikelihood * 100)}%**\n\n*Powered by Catalyst QuickML (Random Forest, trained on 1501 FIRs)*`,
        summary: `QuickML risk for ${scope}: ${mlScore}% predicted heinous rate (${mlLabel})`,
        results: [],
        predictions: [{ district: scope, score: mlScore, riskLabel: mlLabel, confidence: avgLikelihood }],
        chartData: [{ name: 'Predicted Heinous', cases: mlScore }, { name: 'Predicted Safe', cases: 100 - mlScore }],
        sources: [`CaseMaster × ${total} rows`, `Catalyst QuickML × ${totalPredictions} predictions`],
      };
    } catch (err) {
      console.warn('[Copilot QuickML] Error:', err.message || err);
    }
  }

  return {
    answer: `**Statistical Risk Assessment — ${scope}** (${period}):\n- Total FIRs: **${total.toLocaleString()}**\n- Heinous offences: **${heinousCount.toLocaleString()}** (${total > 0 ? Math.round(heinousCount/total*100) : 0}%)\n- Risk Index: **${statScore}/100** — ${riskLabel}`,
    summary: `Risk index for ${scope}: ${statScore}/100 (${riskLabel})`,
    results: [],
    predictions: [{ district: scope, score: statScore, riskLabel }],
    chartData: [],
    sources: [`CaseMaster × ${total} rows (statistical model)`],
  };
}

async function handleCrossReference(app, entities) {
  const tables = await dataCache.fetchAll(app);
  const maps = buildMaps(tables);
  const cases = tables.CaseMaster || [];
  const accused = tables.Accused || [];

  const targetCase = entities.firNo
    ? cases.find(c => (c.CrimeNo || '').includes(entities.firNo) || (c.CaseMasterID || '').includes(entities.firNo))
    : null;
  const targetAccused = targetCase ? accused.filter(a => a.CaseMasterID === targetCase.ROWID) : [];
  const nameSet = new Set(targetAccused.map(a => (a.AccusedName || '').toLowerCase().trim()).filter(Boolean));
  const linkedIds = new Set();
  if (nameSet.size > 0) {
    accused.forEach(a => {
      if (nameSet.has((a.AccusedName || '').toLowerCase().trim()) && a.CaseMasterID !== targetCase?.ROWID) linkedIds.add(a.CaseMasterID);
    });
  }

  return {
    answer: targetCase
      ? `Cross-reference for FIR **${entities.firNo}**: Found **${targetAccused.length}** accused linked to **${linkedIds.size}** other case files.`
      : `Provide a FIR number to cross-reference. Example: *"Cross-reference FIR 100230"*`,
    summary: `Cross-reference: ${targetAccused.length} accused → ${linkedIds.size} linked cases`,
    results: targetAccused.slice(0, 8).map(a => ({ CrimeNo: a.AccusedID || '—', policeStationName: a.AccusedName || 'Unknown', crimeGroupName: `Alias: ${a.AccusedAliasName || 'None'}` })),
    chartData: [],
    sources: [`Accused × ${accused.length} records cross-referenced`],
  };
}

// ─── Main Export ─────────────────────────────────────────────────────────────
async function handleCopilotChat(app, message, history = []) {
  const intent = classifyIntent(message, history);
  const entities = extractEntities(message, history);
  console.log(`[Copilot Engine] intent=${intent} entities=${JSON.stringify(entities)}`);

  let response;
  try {
    switch (intent) {
      case 'CRIME_COUNT':      response = await handleCrimeCount(app, entities); break;
      case 'HOTSPOT':          response = await handleHotspot(app, entities); break;
      case 'CRIME_TYPE':       response = await handleCrimeType(app, entities); break;
      case 'REPEAT_OFFENDER':  response = await handleRepeatOffender(app, entities); break;
      case 'TEMPORAL_PATTERN': response = await handleTemporalPattern(app, entities); break;
      case 'SIMILAR_CASE':     response = await handleSimilarCase(app, entities); break;
      case 'CROSS_REFERENCE':  response = await handleCrossReference(app, entities); break;
      case 'STATION_WORKLOAD': response = await handleStationWorkload(app, entities); break;
      case 'OFFICER_QUERY':    response = await handleOfficerQuery(app, entities); break;
      case 'DAILY_BRIEFING':   response = await handleDailyBriefing(app, entities); break;
      case 'RISK_PREDICTION':  response = await handleRiskPrediction(app, entities); break;
      default:                 response = await handleCrimeCount(app, entities);
    }
  } catch (err) {
    console.error('[Copilot Engine] Handler error:', err.message || err);
    response = {
      answer: `I encountered an error. Please try again.\n\nError: ${(err.message || '').slice(0, 100)}`,
      summary: 'Query failed', results: [], chartData: [], sources: [],
    };
  }

  return { intent, entities, ...response, suggestions: makeSuggestions(intent, entities), timestamp: new Date().toISOString() };
}

module.exports = { handleCopilotChat };
