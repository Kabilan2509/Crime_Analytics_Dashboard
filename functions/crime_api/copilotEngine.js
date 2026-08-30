* copilotEngine.js — MADHUKAR AI Copilot (GLM-4.7-Flash Powered)
 *
/**
 * Uses Catalyst GLM-4.7-Flash (30B MoE) as the intelligence layer.
 * The LLM understands natural language queries and calls tools to fetch
 * live crime data from the shared dataCache. Responses are intelligent
 * prose, not templates.
 *
 * Flow:
 *   User message → GLM (tool calling) → dataCache queries → GLM response
 */

'use strict';

const dataCache  = require('./dataCache');
const glmClient  = require('./glmClient');

// ─── QuickML config ──────────────────────────────────────────────────────────
let _config = null;
function getConfig() {
  if (!_config) {
    try { _config = require('./quickml-config.json'); } catch (_) { _config = {}; }
  }
  return _config;
}

// ─── District / Crime keyword lists ──────────────────────────────────────────
const DISTRICT_NAMES = [
  'bagalkote','ballari','belagavi','bengaluru city','bengaluru district',
  'bidar','chamarajanagara','chikkaballapura','chikkamagaluru','chitradurga',
  'dakshina kannada','davanagere','dharwad','gadag','hassan','haveri',
  'kalaburagi','kodagu','kolar','koppal','mandya','mysuru','raichur',
  'ramanagara','shivamogga','tumakuru','udupi','uttara kannada','vijayapura','yadgir',
];

const CRIME_KEYWORDS = {
  murder:     ['murder','homicide','killing'],
  robbery:    ['robbery','rob','dacoity'],
  theft:      ['theft','steal','stolen','burglary'],
  assault:    ['assault','grievous hurt','hurt','attack'],
  rape:       ['rape','sexual assault','pocso'],
  fraud:      ['fraud','cheating','cybercrime','cyber'],
  ndps:       ['ndps','drugs','narcotic','ganja'],
  kidnapping: ['kidnap','abduction'],
};

// ─── Data Helpers ─────────────────────────────────────────────────────────────
function buildMaps(tables) {
  const districts    = tables.District        || [];
  const units        = tables.Unit            || [];
  const gravityOffences = tables.GravityOffence || [];
  const employees    = tables.Employee        || [];
  const caseStatuses = tables.CaseStatusMaster || [];

  const districtByName = {};
  const districtById = {};
  districts.forEach(d => {
    districtByName[(d.DistrictName || '').toLowerCase().trim()] = d;
    // Catalyst lookups may contain a ROWID while seeded records use DistrictID.
    // Keep both keys so district resolution does not collapse to "Unknown".
    if (d.ROWID != null) districtById[String(d.ROWID)] = d.DistrictName;
    if (d.DistrictID != null) districtById[String(d.DistrictID)] = d.DistrictName;
  });

  const stationById = {};
  const stationIdsByDistrictId = {};
  units.forEach(u => {
    if (u.ROWID != null) stationById[String(u.ROWID)] = u;
    if (u.UnitID != null) stationById[String(u.UnitID)] = u;
    const districtId = String(u.DistrictID);
    if (districtId && districtId !== 'undefined' && districtId !== 'null') {
      if (!stationIdsByDistrictId[districtId]) stationIdsByDistrictId[districtId] = new Set();
      if (u.ROWID != null) stationIdsByDistrictId[districtId].add(String(u.ROWID));
      if (u.UnitID != null) stationIdsByDistrictId[districtId].add(String(u.UnitID));
    }
  });

  // Identify heinous ROWID (most records share one value)
  const gravityCounts = {};
  gravityOffences.forEach(g => { gravityCounts[String(g.ROWID)] = 0; });
  let heinousRowId = null;
  gravityOffences.forEach(g => {
    const s = JSON.stringify(g).toLowerCase();
    if (/heinous|grave|serious/.test(s) && !heinousRowId) heinousRowId = String(g.ROWID);
  });
  if (!heinousRowId && gravityOffences.length > 0) heinousRowId = String(gravityOffences[0].ROWID);

  const employeeByRowId = {};
  employees.forEach(e => { employeeByRowId[String(e.ROWID)] = e; });

  const statusByRowId = {};
  caseStatuses.forEach(s => { statusByRowId[String(s.ROWID)] = s; });

  return {
    districtByName, districtById,
    stationById, stationIdsByDistrictId,
    heinousRowId, employeeByRowId, statusByRowId,
  };
}

// Dataset uses historical dates — use max date in dataset as "now" reference
function getDatasetMaxDate(cases) {
  let max = 0;
  for (const c of cases) {
    if (c.CrimeRegisteredDate) {
      const d = new Date(c.CrimeRegisteredDate).getTime();
      if (!isNaN(d) && d > max) max = d;
    }
  }
  return max || Date.now();
}

function filterByDate(cases, dateRange) {
  if (!dateRange || dateRange === 'all') return cases;
  const days = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[dateRange];
  if (!days) return cases;
  // Use dataset's most recent date as reference (handles historical data correctly)
  const maxDate  = getDatasetMaxDate(cases);
  const cutoff   = maxDate - days * 86400000;
  const filtered = cases.filter(c => c.CrimeRegisteredDate &&
    new Date(c.CrimeRegisteredDate).getTime() >= cutoff);
  return filtered.length > 0 ? filtered : cases; // fallback: all data
}

function filterByDistrict(cases, districtName, maps) {
  if (!districtName) return cases;
  const lower = districtName.toLowerCase().trim();
  const dist  = maps.districtByName[lower] ||
    Object.values(maps.districtByName).find(d =>
      (d.DistrictName || '').toLowerCase().includes(lower));
  if (!dist) return cases;
  const stationSet = new Set([
    ...(maps.stationIdsByDistrictId[String(dist.ROWID)] || []),
    ...(maps.stationIdsByDistrictId[String(dist.DistrictID)] || []),
  ]);
  return cases.filter(c => stationSet.has(String(c.PoliceStationID)));
}

function filterHeinous(cases, maps) {
  if (!maps.heinousRowId) return cases;
  return cases.filter(c => String(c.GravityOffenceID) === maps.heinousRowId);
}

function filterByCrimeType(cases, crimeType, tables) {
  if (!crimeType) return cases;
  const lower = crimeType.toLowerCase();
  const kws   = CRIME_KEYWORDS[lower] || [lower];
  const head  = (tables.CrimeHead || []).find(h =>
    kws.some(kw => (h.CrimeGroupName || '').toLowerCase().includes(kw)));
  if (!head) return cases;
  return cases.filter(c => String(c.CrimeMajorHeadID) === String(head.ROWID));
}

function getDistrictForCase(c, maps) {
  const station = maps.stationById[String(c.PoliceStationID)];
  if (!station) return null;
  return maps.districtById[String(station.DistrictID)] || null;
}

// ─── QuickML Risk Prediction ──────────────────────────────────────────────────
async function callQuickML(cfg, featureData) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ data: featureData });
    const url  = new URL(cfg.quickml_endpoint_url + '?explainModel=false');
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-QUICKML-ENDPOINT-KEY': cfg.quickml_endpoint_key,
        'CATALYST-ORG': String(cfg.quickml_org_id),
        'Environment': cfg.quickml_environment || 'Development',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', ch => { data += ch; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`QuickML parse: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('QuickML timeout')); });
    req.write(body); req.end();
  });
}

// ─── Tool Definitions (for GLM) ───────────────────────────────────────────────
const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'count_crimes',
      description: 'Count FIRs/crimes. Use for: "how many cases", "total FIRs", crime counts by area or type.',
      parameters: {
        type: 'object',
        properties: {
          district:    { type: 'string', description: 'District name, e.g. "Mysuru", "Bengaluru City"' },
          crimeType:   { type: 'string', description: 'Crime keyword: murder, theft, robbery, assault, fraud, ndps, rape, kidnapping' },
          dateRange:   { type: 'string', enum: ['7d','30d','90d','365d','all'], description: 'Time window. Use "all" for entire dataset.' },
          heinousOnly: { type: 'boolean', description: 'Only count heinous/grave offences' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_hotspots',
      description: 'Rank districts by crime volume. Use for: "worst district", "most crime", "crime hotspot", "top districts".',
      parameters: {
        type: 'object',
        properties: {
          limit:       { type: 'number', description: 'How many districts to return (default 5)' },
          dateRange:   { type: 'string', enum: ['7d','30d','90d','365d','all'] },
          heinousOnly: { type: 'boolean' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_repeat_offenders',
      description: 'Find individuals with 2+ FIRs. Use for: "repeat offenders", "habitual criminals", "known criminals", "who appears in multiple cases".',
      parameters: {
        type: 'object',
        properties: {
          district: { type: 'string', description: 'Filter by district (optional)' },
          limit:    { type: 'number', description: 'Top N results (default 10)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_temporal_pattern',
      description: 'Analyse crime by hour of day. Use for: "when do crimes happen", "peak hour", "night crimes", "patrol scheduling".',
      parameters: {
        type: 'object',
        properties: {
          district:  { type: 'string' },
          dateRange: { type: 'string', enum: ['7d','30d','90d','365d','all'] },
          crimeType: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_station_workload',
      description: 'Show caseload per police station in a district. Use for: "station workload", "pending cases by station", "busiest station".',
      parameters: {
        type: 'object',
        properties: {
          district: { type: 'string' },
          limit:    { type: 'number', description: 'Top N stations (default 10)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_fir',
      description: 'Find a specific FIR or its Investigating Officer. Use for: "who is IO for case X", "FIR details", "find case number".',
      parameters: {
        type: 'object',
        properties: {
          firNo:    { type: 'string', description: 'FIR/case number or partial ID' },
          district: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'predict_risk',
      description: 'ML-powered crime risk prediction for a district using QuickML Random Forest model trained on 1,501 FIRs.',
      parameters: {
        type: 'object',
        properties: {
          district: { type: 'string', description: 'District to assess risk for' },
        },
        required: ['district'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_daily_briefing',
      description: 'Generate intelligence overview: recent FIRs, top hotspots, heinous crime count, key stats.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

// ─── Tool Executor ────────────────────────────────────────────────────────────
function makeExecuteTool(tables, maps) {
  const allCases = tables.CaseMaster || [];

  return async function executeTool(name, args) {
    switch (name) {

      case 'count_crimes': {
        let cases = filterByDate(allCases, args.dateRange);
        if (args.district)    cases = filterByDistrict(cases, args.district, maps);
        if (args.heinousOnly) cases = filterHeinous(cases, maps);
        if (args.crimeType)   cases = filterByCrimeType(cases, args.crimeType, tables);

        const stCounts = {};
        cases.forEach(c => {
          const n = maps.stationById[String(c.PoliceStationID)]?.UnitName || 'Unknown';
          stCounts[n] = (stCounts[n] || 0) + 1;
        });
        const topStations = Object.entries(stCounts)
          .sort(([,a],[,b]) => b-a).slice(0, 6)
          .map(([name, count]) => ({ name, count }));

        return {
          glmResult: {
            total: cases.length,
            district: args.district || 'All Karnataka',
            crimeType: args.crimeType || 'all types',
            dateRange: args.dateRange || 'all available data',
            heinousOnly: !!args.heinousOnly,
            topStations,
          },
          uiData: {
            results:   topStations.map(s => ({ CrimeNo: `${s.count} FIRs`, policeStationName: s.name, crimeGroupName: args.crimeType || 'All crimes' })),
            chartData: topStations.map(s => ({ name: s.name.split(' ')[0], cases: s.count })),
            sources:   [`CaseMaster × ${cases.length} rows (${args.district || 'Karnataka'}, ${args.dateRange || 'all data'})`],
            predictions: [],
          },
        };
      }

      case 'get_hotspots': {
        let cases = filterByDate(allCases, args.dateRange);
        if (args.heinousOnly) cases = filterHeinous(cases, maps);

        const distCounts = {};
        cases.forEach(c => {
          const n = getDistrictForCase(c, maps) || 'Unknown';
          distCounts[n] = (distCounts[n] || 0) + 1;
        });
        const ranked = Object.entries(distCounts)
          .sort(([,a],[,b]) => b-a).slice(0, args.limit || 5)
          .map(([name, count]) => ({ name, count }));

        return {
          glmResult: {
            hotspots: ranked,
            total: cases.length,
            dateRange: args.dateRange || 'all available data',
            heinousOnly: !!args.heinousOnly,
          },
          uiData: {
            results:   ranked.map((r,i) => ({ CrimeNo: `#${i+1} — ${r.count} FIRs`, policeStationName: r.name, crimeGroupName: args.heinousOnly ? 'Heinous crimes' : 'All FIRs' })),
            chartData: ranked.map(r => ({ name: r.name.split(' ')[0], cases: r.count })),
            sources:   [`CaseMaster × ${cases.length} rows grouped by district`],
            predictions: [],
          },
        };
      }

      case 'get_repeat_offenders': {
        const accused = tables.Accused || [];
        let filteredCases = allCases;
        if (args.district) filteredCases = filterByDistrict(allCases, args.district, maps);
        const caseRowIds = new Set(filteredCases.map(c => String(c.ROWID)));

        const nameMap = {};
        accused.forEach(a => {
          if (!a.AccusedName) return;
          if (args.district && !caseRowIds.has(String(a.CaseMasterID))) return;
          const key = (a.AccusedName || '').toLowerCase().trim();
          if (!nameMap[key]) nameMap[key] = { name: a.AccusedName, alias: a.AccusedAliasName, count: 0 };
          nameMap[key].count++;
        });
        const repeats = Object.values(nameMap).filter(r => r.count > 1)
          .sort((a,b) => b.count - a.count).slice(0, args.limit || 10);

        return {
          glmResult: {
            repeatOffenders: repeats.map(r => ({ name: r.name, alias: r.alias || null, caseCount: r.count })),
            total: repeats.length,
            district: args.district || 'All Karnataka',
          },
          uiData: {
            results:   repeats.map(r => ({ CrimeNo: `${r.count} cases`, policeStationName: r.name, crimeGroupName: r.alias ? `aka ${r.alias}` : 'No alias on record' })),
            chartData: repeats.slice(0,6).map(r => ({ name: (r.name||'?').split(' ')[0], cases: r.count })),
            sources:   [`Accused × ${accused.length} records cross-referenced`],
            predictions: [],
          },
        };
      }

      case 'get_temporal_pattern': {
        let cases = filterByDate(allCases, args.dateRange);
        if (args.district)  cases = filterByDistrict(cases, args.district, maps);
        if (args.crimeType) cases = filterByCrimeType(cases, args.crimeType, tables);

        const hourDist = {};
        cases.forEach(c => {
          if (!c.CrimeRegisteredDate) return;
          const h = new Date(c.CrimeRegisteredDate).getHours();
          const label = `${String(h).padStart(2,'0')}:00`;
          hourDist[label] = (hourDist[label] || 0) + 1;
        });
        const sorted = Object.entries(hourDist).sort(([a],[b]) => a.localeCompare(b));
        const peak = sorted.slice().sort(([,a],[,b]) => b-a)[0];

        return {
          glmResult: {
            totalCases: cases.length,
            peakHour: peak?.[0] || 'N/A',
            peakCount: peak?.[1] || 0,
            distribution: sorted.map(([hour, count]) => ({ hour, count })),
            district: args.district || 'All Karnataka',
          },
          uiData: {
            results:   sorted.slice(0,8).map(([hour,count]) => ({ CrimeNo: `${count} cases`, policeStationName: hour, crimeGroupName: 'Hour of day' })),
            chartData: sorted.map(([hour,count]) => ({ name: hour, cases: count })),
            sources:   [`CaseMaster × ${cases.length} rows — hourly distribution`],
            predictions: [],
          },
        };
      }

      case 'get_station_workload': {
        let cases = allCases;
        if (args.district) cases = filterByDistrict(cases, args.district, maps);

        const stCounts = {};
        cases.forEach(c => {
          const sid = String(c.PoliceStationID);
          if (!stCounts[sid]) stCounts[sid] = { total: 0, pending: 0 };
          stCounts[sid].total++;
          const status = maps.statusByRowId[String(c.CaseStatusID)];
          if (/pending|investigation|under/i.test(JSON.stringify(status || {}))) stCounts[sid].pending++;
        });
        const ranked = Object.entries(stCounts)
          .map(([sid, d]) => ({ name: maps.stationById[sid]?.UnitName || `Station ${sid}`, ...d }))
          .sort((a,b) => b.total - a.total).slice(0, args.limit || 10);

        return {
          glmResult: {
            stations: ranked,
            district: args.district || 'All Karnataka',
            total: cases.length,
          },
          uiData: {
            results:   ranked.map(r => ({ CrimeNo: `${r.total} total`, policeStationName: r.name, crimeGroupName: `${r.pending} pending` })),
            chartData: ranked.slice(0,6).map(r => ({ name: r.name.split(' ')[0], cases: r.total })),
            sources:   [`CaseMaster × ${cases.length} rows by station (${args.district || 'Karnataka'})`],
            predictions: [],
          },
        };
      }

      case 'search_fir': {
        const found = allCases.find(c =>
          (c.CrimeNo || '').includes(args.firNo || '') ||
          (c.CaseMasterID || '').includes(args.firNo || '') ||
          (c.ROWID || '').includes(args.firNo || ''));

        if (!found) {
          return {
            glmResult: { found: false, firNo: args.firNo, message: 'FIR not found in dataset' },
            uiData: { results: [], chartData: [], sources: ['CaseMaster search'], predictions: [] },
          };
        }

        const emp = maps.employeeByRowId[String(found.PolicePersonID)];
        const station = maps.stationById[String(found.PoliceStationID)];
        const io = emp ? `${emp.FirstName || ''} ${emp.LastName || ''}`.trim() : `ID ${found.PolicePersonID}`;

        return {
          glmResult: {
            found: true,
            firNo: found.CrimeNo || found.CaseMasterID,
            station: station?.UnitName || 'Unknown',
            investigatingOfficer: io,
            officerKGID: emp?.KGID || null,
            registeredDate: found.CrimeRegisteredDate,
            district: getDistrictForCase(found, maps) || 'Unknown',
          },
          uiData: {
            results: [{ CrimeNo: found.CrimeNo || found.CaseMasterID, policeStationName: io, crimeGroupName: 'Investigating Officer' }],
            chartData: [],
            sources: ['CaseMaster + Employee lookup'],
            predictions: [],
          },
        };
      }

      case 'predict_risk': {
        const cfg = getConfig();
        let distCases = filterByDistrict(allCases, args.district, maps);
        const heinousCases = filterHeinous(distCases, maps);
        const statScore = distCases.length > 0
          ? Math.min(100, Math.round((heinousCases.length / distCases.length) * 100 * 1.5 + Math.log(distCases.length + 1) * 5))
          : 0;

        if (cfg.quickml_endpoint_key && cfg.quickml_endpoint_url && distCases.length > 0) {
          try {
            const samples = [...distCases]
              .sort((a,b) => (b.CrimeRegisteredDate||'').localeCompare(a.CrimeRegisteredDate||''))
              .slice(0, 5)
              .filter(c => c.CrimeMajorHeadID && c.PoliceStationID && c.CaseStatusID && c.CaseCategoryID);

            let heinousPred = 0, total = 0, avgLike = 0;
            for (const c of samples) {
              const result = await callQuickML(cfg, {
                CrimeMajorHeadID: c.CrimeMajorHeadID, latitude: parseFloat(c.latitude)||0,
                CaseStatusID: c.CaseStatusID, CaseCategoryID: c.CaseCategoryID,
                PoliceStationID: c.PoliceStationID, longitude: parseFloat(c.longitude)||0,
              });
              const predicted = result?.result?.[0];
              const likelihood = parseFloat(result?.likelihood_score?.[0] || 0);
              avgLike += likelihood; total++;
              if (String(predicted) === String(maps.heinousRowId)) heinousPred++;
            }

            if (total > 0) {
              const mlScore = Math.round((heinousPred / total) * 100);
              avgLike = avgLike / total;
              const riskLabel = mlScore > 70 ? 'HIGH RISK' : mlScore > 40 ? 'MODERATE RISK' : 'LOW RISK';
              return {
                glmResult: {
                  district: args.district,
                  method: 'QuickML Random Forest',
                  mlPredictedHeinousRate: mlScore,
                  confidence: Math.round(avgLike * 100),
                  riskLevel: riskLabel,
                  totalCases: distCases.length,
                  actualHeinous: heinousCases.length,
                  samplesEvaluated: total,
                },
                uiData: {
                  results: [],
                  chartData: [{ name: 'Predicted Heinous', cases: mlScore }, { name: 'Predicted Safe', cases: 100 - mlScore }],
                  sources: [`QuickML × ${total} predictions`, `CaseMaster × ${distCases.length} rows (${args.district})`],
                  predictions: [{ district: args.district, score: mlScore, riskLabel, confidence: avgLike }],
                },
              };
            }
          } catch (err) {
            console.warn('[Tool predict_risk] QuickML error:', err.message);
          }
        }

        // Statistical fallback
        const riskLabel = statScore > 70 ? 'HIGH RISK' : statScore > 40 ? 'MODERATE RISK' : 'LOW RISK';
        return {
          glmResult: {
            district: args.district,
            method: 'Statistical model',
            riskScore: statScore,
            riskLevel: riskLabel,
            totalCases: distCases.length,
            actualHeinous: heinousCases.length,
          },
          uiData: {
            results: [],
            chartData: [],
            sources: [`CaseMaster × ${distCases.length} rows (statistical model)`],
            predictions: [{ district: args.district, score: statScore, riskLabel }],
          },
        };
      }

      case 'get_daily_briefing': {
        const maxDate   = getDatasetMaxDate(allCases);
        const weekCases = filterByDate(allCases, '7d');
        const heinous   = filterHeinous(weekCases, maps);

        const distCounts = {};
        weekCases.forEach(c => {
          const n = getDistrictForCase(c, maps) || 'Unknown';
          distCounts[n] = (distCounts[n] || 0) + 1;
        });
        const topDistricts = Object.entries(distCounts)
          .sort(([,a],[,b]) => b-a).slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        const dataDate = new Date(maxDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

        return {
          glmResult: {
            reportDate: dataDate,
            period: 'Last 7 days of available data',
            totalFIRs: weekCases.length,
            heinousOffences: heinous.length,
            heinousRate: weekCases.length > 0 ? Math.round((heinous.length / weekCases.length) * 100) : 0,
            totalDatasetSize: allCases.length,
            topHotspots: topDistricts,
          },
          uiData: {
            results:   topDistricts.map(r => ({ CrimeNo: `${r.count} FIRs`, policeStationName: r.name, crimeGroupName: 'Last 7 days' })),
            chartData: topDistricts.map(r => ({ name: r.name.split(' ')[0], cases: r.count })),
            sources:   [`CaseMaster × ${weekCases.length} rows (last 7 days of dataset)`],
            predictions: [],
          },
        };
      }

      default:
        return {
          glmResult: { error: `Unknown tool: ${name}` },
          uiData: { results: [], chartData: [], sources: [], predictions: [] },
        };
    }
  };
}

// ─── System Prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(tables) {
  const caseCount     = tables.CaseMaster?.length || 0;
  const districtCount = tables.District?.length || 0;
  const stationCount  = tables.Unit?.length || 0;
  const accusedCount  = tables.Accused?.length || 0;
  const victimCount   = tables.Victim?.length || 0;

  const districtList = (tables.District || [])
    .map(d => d.DistrictName).filter(Boolean).join(', ');

  return `You are MADHUKAR, the AI Intelligence Copilot for Karnataka State Police (KSP) and the State Crime Records Bureau (SCRB). You assist senior police officers and analysts with evidence-based crime intelligence.

LIVE CRIME DATA AVAILABLE (via tools):
- FIR Records: ${caseCount.toLocaleString()} cases (CaseMaster)
- Districts: ${districtCount} Karnataka districts — ${districtList}
- Police Stations: ${stationCount} units
- Accused records: ${accusedCount.toLocaleString()}
- Victim records: ${victimCount.toLocaleString()}
- NOTE: This is a historical dataset. "Recent" means the most recent data in the dataset.

INSTRUCTIONS:
1. ALWAYS call one or more tools before answering — never respond from memory alone
2. Use markdown formatting with **bold** numbers for key statistics
3. Be concise and actionable — officers need quick, clear intelligence
4. For any district or crime query, call count_crimes or get_hotspots first
5. For risk assessment, use predict_risk which invokes a trained ML model
6. Cite data sources in every response
7. If asked about something not covered by tools, say so clearly`;
}

// ─── Fallback: Rule-based for common queries ──────────────────────────────────
function quickFallback(message, tables, maps) {
  const lower = message.toLowerCase();
  const allCases = tables.CaseMaster || [];

  // Most common query: overall count
  if (/how many|total|count/.test(lower) && !/district|station/.test(lower)) {
    return {
      intent: 'CRIME_COUNT', entities: {},
      answer: `The dataset contains **${allCases.length.toLocaleString()} FIRs** across **${(tables.District||[]).length} Karnataka districts** and **${(tables.Unit||[]).length} police stations**.\n\nAsk me about specific districts, crime types, hotspots, or risk predictions!`,
      summary: `Total: ${allCases.length} FIRs`, results: [], chartData: [],
      sources: [`CaseMaster × ${allCases.length} rows`], predictions: [],
      suggestions: ['Which district has the most crimes?', 'Show repeat offenders in Bengaluru City', 'Predict risk for Mysuru'],
    };
  }
  return null;
}

// ─── Main Export ─────────────────────────────────────────────────────────────
async function handleCopilotChat(app, httpReq, message, history = []) {
  console.log(`[Copilot] Message: "${message.slice(0, 80)}"`);

  // Pre-fetch all data (from shared 5-min cache)
  const tables = await dataCache.fetchAll(app);
  const maps   = buildMaps(tables);

  // Quick fallback for trivially simple queries (no GLM needed)
  const quick = quickFallback(message, tables, maps);
  if (quick) return quick;

  // Build conversation messages
  const systemPrompt = buildSystemPrompt(tables);
  const messages = [
    { role: 'system', content: systemPrompt },
    // Include recent conversation history
    ...history.slice(-8).map(h => ({
      role: h.type === 'user' ? 'user' : 'assistant',
      content: h.text || h.content || '',
    })),
    { role: 'user', content: message },
  ];

  // Create tool executor bound to this request's data
  const executeTool = makeExecuteTool(tables, maps);

  try {
    const { text, uiAccumulator, toolCalls } = await glmClient.runConversation(
      app, httpReq, messages, TOOL_DEFINITIONS, executeTool
    );

    console.log(`[Copilot] GLM done. Tools used: ${toolCalls.map(t => t.name).join(', ') || 'none'}`);

    // Generate contextual suggestions based on what tools were called
    const usedTools = new Set(toolCalls.map(t => t.name));
    const suggestions = [];
    if (!usedTools.has('predict_risk') && toolCalls.length > 0) {
      const distArg = toolCalls.find(t => t.args?.district)?.args?.district;
      if (distArg) suggestions.push(`Predict crime risk for ${distArg}`);
    }
    if (!usedTools.has('get_repeat_offenders')) suggestions.push('Find repeat offenders in this area');
    if (!usedTools.has('get_daily_briefing'))   suggestions.push('Generate daily intelligence briefing');
    if (suggestions.length < 2) suggestions.push('Show crime hotspot rankings', 'Analyse temporal crime patterns');

    return {
      intent: toolCalls[0]?.name || 'GLM_RESPONSE',
      entities: toolCalls[0]?.args || {},
      answer:  text,
      summary: text.split('\n')[0].replace(/\*\*/g, '').slice(0, 120),
      results: uiAccumulator.results,
      chartData: uiAccumulator.chartData,
      sources: uiAccumulator.sources,
      predictions: uiAccumulator.predictions,
      suggestions: suggestions.slice(0, 3),
      timestamp: new Date().toISOString(),
      _powered_by: 'GLM-4.7-Flash',
    };

  } catch (glmErr) {
    // GLM failed (likely auth issue) → graceful fallback message
    console.error('[Copilot] GLM error:', glmErr.message);

    // Try rule-based fallback for basic queries
    const lower = message.toLowerCase();
    let fallbackAnswer;

    if (/hotspot|most crime|worst district/.test(lower)) {
      const distCounts = {};
      (tables.CaseMaster||[]).forEach(c => {
        const n = getDistrictForCase(c, maps) || 'Unknown';
        distCounts[n] = (distCounts[n]||0) + 1;
      });
      const top = Object.entries(distCounts).sort(([,a],[,b])=>b-a).slice(0,5);
      fallbackAnswer = `**Top 5 Crime Hotspots (Karnataka):**\n${top.map((r,i)=>`${i+1}. **${r[0]}** — ${r[1]} FIRs`).join('\n')}\n\n*Note: GLM AI temporarily unavailable (${glmErr.message?.slice(0,60)}). Showing statistical results.*`;
    } else {
      const total = (tables.CaseMaster||[]).length;
      fallbackAnswer = `I have access to **${total.toLocaleString()} FIRs** across Karnataka.\n\n⚠️ The AI engine (GLM) is temporarily unavailable: *${glmErr.message?.slice(0,100)}*\n\nPlease check the \`ZOHO_ACCESS_TOKEN\` configuration in the Catalyst Function environment variables.`;
    }

    return {
      intent: 'FALLBACK',
      entities: {},
      answer: fallbackAnswer,
      summary: 'GLM unavailable — statistical fallback',
      results: [], chartData: [], sources: [`CaseMaster × ${tables.CaseMaster?.length} rows`],
      predictions: [],
      suggestions: ['Show crime hotspots', 'Count crimes in Mysuru', 'Find repeat offenders'],
      timestamp: new Date().toISOString(),
      _powered_by: 'statistical-fallback',
      _glm_error: glmErr.message,
    };
  }
}

module.exports = { handleCopilotChat };
