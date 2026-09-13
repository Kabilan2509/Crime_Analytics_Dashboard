/**
 * Catalyst Serverless Function — Crime API
 *
 * Central API endpoint for the KSP Crime Analytics Dashboard.
 * Reads from Catalyst Data Store (all 26 tables) and returns
 * chart-ready, pre-computed data to the React frontend.
 *
 * Routes:
 *   GET /api/dashboard    — KPI metrics + chart data
 *   GET /api/cases        — Filtered case list with joins
 *   GET /api/statistics   — Pre-computed statistics charts
 *   GET /api/predictions  — Risk scores, forecasts, anomalies
 *   GET /api/reports      — Report metrics + summary
 *   GET /api/districts    — District lookup list
 *   GET /api/crimeheads   — Crime head taxonomy
 *   GET /api/stations     — Police station list
 *   GET /api/employees    — Officer list (role-filtered)
 *   GET /api/lookup       — FIR quick search
 *   GET /api/masters      — All master/reference tables
 */

const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const { handleCopilotChat } = require('./copilotEngine');
const dataCache = require('./dataCache');

const app = express();
app.use(express.json({ limit: '2mb' }));

function errorMessage(err) {
  if (err?.message) return err.message;
  if (err?.errorInfo) return JSON.stringify(err.errorInfo);
  if (err?.code || err?.value) {
    return JSON.stringify({ code: err.code, value: err.value });
  }
  if (err?.data) return typeof err.data === 'string' ? err.data : JSON.stringify(err.data);
  if (err?.response?.data) return JSON.stringify(err.response.data);
  const asString = String(err);
  if (asString && asString !== '[object Object]') return asString;
  try {
    const details = Object.fromEntries(
      Object.getOwnPropertyNames(err || {}).map(key => [key, err[key]])
    );
    return JSON.stringify(details);
  } catch (_) {
    return 'Unknown Catalyst SDK error';
  }
}

function businessRows(rows) {
  return rows.map(({ CREATORID, CREATEDTIME, MODIFIEDTIME, ...row }) => row);
}

// ─── Helper: Execute ZCQL query ───────────────────────────────────────────
async function query(app, sql) {
  const zcql = app.zcql();
  const result = await zcql.executeZCQLQuery(sql);
  return result.map((row) => {
    // ZCQL returns { TableName: { col: val } } — flatten it
    const tableName = Object.keys(row)[0];
    return row[tableName];
  });
}

async function optionalQuery(app, sql, tableName) {
  try {
    return await query(app, sql);
  } catch (err) {
    console.warn(`[crime_api] Optional table ${tableName} unavailable: ${errorMessage(err)}`);
    return [];
  }
}

const RESET_TABLES = new Set([
  'CrimeHeadActSection', 'Section', 'Act', 'ArrestSurrender', 'Accused', 'Victim',
  'ActSectionAssociation', 'ChargesheetDetails', 'GravityOffence', 'CaseCategory',
  'Employee', 'Designation', 'Rank', 'UnitType', 'ComplainantDetails', 'Unit',
  'State', 'District', 'Court', 'CaseStatusMaster', 'OccupationMaster',
  'ReligionMaster', 'CasteMaster', 'CrimeSubHead', 'CrimeHead', 'CaseMaster'
]);

// Local development maintenance route. It is deliberately inaccessible after deployment.
app.post('/api/local-reset', async (req, res) => {
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  const confirmation = req.headers['x-crime-reset-confirmation'];
  if (process.env.ENABLE_LOCAL_DATA_RESET !== 'true' ||
      !['localhost', '127.0.0.1', '::1'].includes(host) ||
      confirmation !== 'replace-local-dashboard-data') {
    return res.status(403).json({ error: 'This maintenance route is local-only.' });
  }

  const { operation, table, rows } = req.body || {};
  if (!RESET_TABLES.has(table)) return res.status(400).json({ error: 'Table is not in the reset allowlist.' });

  try {
    const catalystApp = catalyst.initialize(req);
    const dataTable = catalystApp.datastore().table(table);

    if (operation === 'delete-next') {
      const existing = await query(catalystApp, `SELECT ROWID FROM ${table} LIMIT 100`);
      const ids = existing.map(row => row.ROWID);
      if (ids.length) await dataTable.deleteRows(ids);
      return res.json({ deleted: ids.length });
    }

    if (operation === 'insert') {
      if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100) {
        return res.status(400).json({ error: 'Insert requires 1-100 rows.' });
      }
      const inserted = await dataTable.insertRows(rows);
      return res.json({ rows: businessRows(inserted) });
    }

    if (operation === 'count') {
      const result = await query(catalystApp, `SELECT COUNT(ROWID) AS total FROM ${table}`);
      const aggregate = result[0] || {};
      return res.json({ total: Number(aggregate.total ?? aggregate.TOTAL ?? Object.values(aggregate)[0] ?? 0) });
    }

    return res.status(400).json({ error: 'Unknown reset operation.' });
  } catch (err) {
    return res.status(500).json({ error: errorMessage(err) });
  }
});

// ─── Helper: Build WHERE clause from query params ─────────────────────────
function buildFilters(params) {
  const clauses = [];
  const id = (value) => /^\d+$/.test(String(value || '')) ? String(value) : null;
  if (params.districtId && params.districtId !== 'all') {
    const value = id(params.districtId);
    if (value) clauses.push(`DistrictID = ${value}`);
  }
  if (params.crimeHeadId && params.crimeHeadId !== 'all') {
    const value = id(params.crimeHeadId);
    if (value) clauses.push(`CrimeMajorHeadID = ${value}`);
  }
  if (params.stationId && params.stationId !== 'all') {
    const value = id(params.stationId);
    if (value) clauses.push(`PoliceStationID = ${value}`);
  }
  if (params.statusId && params.statusId !== 'all') {
    const value = id(params.statusId);
    if (value) clauses.push(`CaseStatusID = ${value}`);
  }
  if (params.fromDate) {
    clauses.push(`CrimeRegisteredDate >= '${params.fromDate}'`);
  }
  if (params.toDate) {
    clauses.push(`CrimeRegisteredDate <= '${params.toDate}'`);
  }
  if (params.dateRange && params.dateRange !== 'all') {
    const daysMap = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
    const days = daysMap[params.dateRange];
    if (days) {
      const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      clauses.push(`CrimeRegisteredDate >= '${cutoff}'`);
    }
  }
  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: Dashboard KPIs
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/dashboard', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const where = buildFilters(req.query);

    const [totals, monthlyTrend, districtBreakdown, statusBreakdown] = await Promise.all([
      // Total cases, heinous count
      query(catalystApp, `
        SELECT COUNT(ROWID) as total,
               SUM(CASE WHEN GravityOffenceID = 1 THEN 1 ELSE 0 END) as heinous
        FROM CaseMaster ${where}
      `),
      // Monthly trend
      query(catalystApp, `
        SELECT MONTH(CrimeRegisteredDate) as month,
               YEAR(CrimeRegisteredDate) as year,
               COUNT(ROWID) as count
        FROM CaseMaster ${where}
        GROUP BY YEAR(CrimeRegisteredDate), MONTH(CrimeRegisteredDate)
        ORDER BY year, month
      `),
      // District-wise
      query(catalystApp, `
        SELECT d.DistrictName, COUNT(c.ROWID) as count
        FROM CaseMaster c
        LEFT JOIN District d ON c.DistrictID = d.DistrictID
        ${where ? where.replace('WHERE', 'WHERE c.') : ''}
        GROUP BY d.DistrictName
        ORDER BY count DESC
      `),
      // Status breakdown
      query(catalystApp, `
        SELECT s.CaseStatusName, COUNT(c.ROWID) as count
        FROM CaseMaster c
        LEFT JOIN CaseStatusMaster s ON c.CaseStatusID = s.CaseStatusID
        ${where ? where.replace('WHERE', 'WHERE c.') : ''}
        GROUP BY s.CaseStatusName
      `),
    ]);

    res.status(200).json({ totals, monthlyTrend, districtBreakdown, statusBreakdown });
  } catch (err) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: Filtered case list with joins
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/cases', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const where = buildFilters(req.query);
    // Catalyst ZCQL allows at most 300 rows in a single LIMIT clause.
    const limit = Math.min(Math.max(Number(req.query.limit) || 300, 1), 300);
    const offset = Number(req.query.offset) || 0;

    const cases = await query(catalystApp, `
      SELECT ROWID, CaseMasterID, CrimeNo, CaseNo, CrimeRegisteredDate,
             PolicePersonID, PoliceStationID, CaseCategoryID, GravityOffenceID,
             CrimeMajorHeadID, CrimeMinorHeadID, CaseStatusID, CourtID,
             IncidentFromDate, IncidentToDate, InfoReceivedPSDate,
             latitude, longitude, BriefFacts
      FROM CaseMaster
      ${where}
      ORDER BY ROWID ASC
      LIMIT ${limit} OFFSET ${offset}
    `);

    res.status(200).json({ cases, limit, offset });
  } catch (err) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: Statistics (pre-computed chart data)
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/statistics', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const where = buildFilters(req.query);

    const [hourly, dayOfWeek, crimeHeads, severity] = await Promise.all([
      query(catalystApp, `
        SELECT HOUR(CrimeRegisteredDate) as hour, COUNT(ROWID) as count
        FROM CaseMaster ${where}
        GROUP BY HOUR(CrimeRegisteredDate) ORDER BY hour
      `),
      query(catalystApp, `
        SELECT DAYOFWEEK(CrimeRegisteredDate) as day, COUNT(ROWID) as count
        FROM CaseMaster ${where}
        GROUP BY DAYOFWEEK(CrimeRegisteredDate) ORDER BY day
      `),
      query(catalystApp, `
        SELECT ch.CrimeGroupName, COUNT(c.ROWID) as count
        FROM CaseMaster c
        LEFT JOIN CrimeHead ch ON c.CrimeMajorHeadID = ch.CrimeHeadID
        ${where ? where.replace('WHERE', 'WHERE c.') : ''}
        GROUP BY ch.CrimeGroupName
        ORDER BY count DESC
      `),
      query(catalystApp, `
        SELECT GravityOffenceID, COUNT(ROWID) as count
        FROM CaseMaster ${where}
        GROUP BY GravityOffenceID
      `),
    ]);

    res.status(200).json({ hourly, dayOfWeek, crimeHeads, severity });
  } catch (err) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: Predictions (risk scores, anomalies)
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/predictions', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);

    const [districtRisks, stationHotspots] = await Promise.all([
      // District risk scores
      query(catalystApp, `
        SELECT d.DistrictName, d.DistrictID,
               COUNT(c.ROWID) as total,
               SUM(CASE WHEN c.GravityOffenceID = 1 THEN 1 ELSE 0 END) as heinous
        FROM CaseMaster c
        LEFT JOIN District d ON c.DistrictID = d.DistrictID
        GROUP BY d.DistrictName, d.DistrictID
        ORDER BY total DESC
      `),
      // Top 10 hotspot stations
      query(catalystApp, `
        SELECT ps.UnitName as station, d.DistrictName as district,
               COUNT(c.ROWID) as total,
               SUM(CASE WHEN c.GravityOffenceID = 1 THEN 1 ELSE 0 END) as heinous
        FROM CaseMaster c
        LEFT JOIN PoliceStation ps ON c.PoliceStationID = ps.UnitID
        LEFT JOIN District d ON c.DistrictID = d.DistrictID
        GROUP BY ps.UnitName, d.DistrictName
        ORDER BY total DESC
        LIMIT 10
      `),
    ]);

    // Compute risk scores server-side
    const risks = districtRisks.map((d) => ({
      ...d,
      score: Math.round(((d.heinous * 3 + d.total) / Math.max(1, d.total / 10)) * 10) / 10,
    }));

    res.status(200).json({ districtRisks: risks, stationHotspots });
  } catch (err) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: Report data
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/reports', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const where = buildFilters(req.query);

    const metrics = await query(catalystApp, `
      SELECT COUNT(ROWID) as total,
             SUM(CASE WHEN GravityOffenceID = 1 THEN 1 ELSE 0 END) as heinous,
             SUM(CASE WHEN CaseStatusID IN (4,5,6) THEN 1 ELSE 0 END) as solved
      FROM CaseMaster ${where}
    `);

    res.status(200).json({ metrics: metrics[0] || { total: 0, heinous: 0, solved: 0 } });
  } catch (err) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: FIR Quick Lookup
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/lookup', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.status(200).json({ results: [] });

    const results = await query(catalystApp, `
      SELECT c.CaseMasterID, c.CrimeNo, c.CrimeRegisteredDate,
             c.DistrictID, c.PoliceStationID, c.CaseStatusID
      FROM CaseMaster c
      WHERE c.CrimeNo LIKE '%${q}%'
         OR c.CaseMasterID LIKE '%${q}%'
      LIMIT 20
    `);

    res.status(200).json({ results });
  } catch (err) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: Master/Reference tables (all 26 tables)
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/masters', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const table = req.query.table;

    const ALLOWED_TABLES = [
      'State', 'District', 'Court', 'Unit', 'PoliceStation', 'UnitType',
      'Rank', 'Designation', 'Employee', 'CasteMaster', 'ReligionMaster',
      'OccupationMaster', 'CrimeHead', 'CrimeSubHead', 'CrimeHeadActSection',
      'CaseCategory', 'GravityOffence', 'GravityOffenceMaster',
      'CaseStatus', 'CaseStatusMaster', 'Act', 'Section',
      'ComplainantDetails', 'ActSectionAssociation', 'Victim', 'Accused',
      'ArrestSurrender', 'ChargesheetDetails', 'CaseMaster',
    ];

    if (table && ALLOWED_TABLES.includes(table)) {
      const limit = Math.min(Math.max(Number(req.query.limit) || 300, 1), 300);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const data = await query(
        catalystApp,
        `SELECT * FROM ${table} ORDER BY ROWID ASC LIMIT ${limit} OFFSET ${offset}`
      );
      return res.status(200).json({ table, data: businessRows(data), limit, offset });
    }

    // Return all reference tables at once (for initial page load)
    const [
      districts, crimeHeads, crimeSubHeads, statuses, stations, ranks,
      gravityOffences, caseCategories, courts, employees,
    ] = await Promise.all([
      optionalQuery(catalystApp, 'SELECT * FROM District ORDER BY DistrictName', 'District'),
      optionalQuery(catalystApp, 'SELECT * FROM CrimeHead ORDER BY CrimeHeadID', 'CrimeHead'),
      optionalQuery(catalystApp, 'SELECT * FROM CrimeSubHead ORDER BY CrimeSubHeadID', 'CrimeSubHead'),
      optionalQuery(catalystApp, 'SELECT * FROM CaseStatusMaster', 'CaseStatusMaster'),
      optionalQuery(catalystApp, 'SELECT * FROM Unit ORDER BY UnitName', 'Unit'),
      optionalQuery(catalystApp, 'SELECT * FROM Rank ORDER BY Hierarchy', 'Rank'),
      optionalQuery(catalystApp, 'SELECT * FROM GravityOffence', 'GravityOffence'),
      optionalQuery(catalystApp, 'SELECT * FROM CaseCategory', 'CaseCategory'),
      optionalQuery(catalystApp, 'SELECT * FROM Court ORDER BY CourtName', 'Court'),
      optionalQuery(catalystApp, 'SELECT * FROM Employee', 'Employee'),
    ]);

    res.status(200).json({
      districts, crimeHeads, crimeSubHeads, statuses, stations, ranks,
      gravityOffences, caseCategories, courts, employees,
    });
  } catch (err) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: Individual reference tables
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/districts', async (req, res) => {
  try {
    const data = await query(catalyst.initialize(req), 'SELECT * FROM District ORDER BY DistrictName');
    res.status(200).json(data);
  } catch (err) { res.status(500).json({ error: errorMessage(err) }); }
});

app.get('/api/crimeheads', async (req, res) => {
  try {
    const data = await query(catalyst.initialize(req), 'SELECT * FROM CrimeHead ORDER BY CrimeHeadID');
    res.status(200).json(data);
  } catch (err) { res.status(500).json({ error: errorMessage(err) }); }
});

app.get('/api/stations', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const districtId = req.query.districtId;
    const where = districtId ? `WHERE DistrictID = ${Number(districtId)}` : '';
    const data = await query(catalystApp, `SELECT * FROM PoliceStation ${where} ORDER BY UnitName`);
    res.status(200).json(data);
  } catch (err) { res.status(500).json({ error: errorMessage(err) }); }
});

app.get('/api/employees', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const districtId = req.query.districtId;
    const where = districtId ? `WHERE DistrictID = ${Number(districtId)}` : '';
    const data = await query(catalystApp, `SELECT * FROM Employee ${where} ORDER BY FirstName LIMIT 100`);
    res.status(200).json(data);
  } catch (err) { res.status(500).json({ error: errorMessage(err) }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: GET /api/app-data — All tables in ONE request (replaces 60+ /api/masters calls)
// The frontend dataService.js calls this instead of fetching each table individually.
// Data is served from the shared 5-minute in-process cache in dataCache.js.
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/app-data', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const tables = await dataCache.fetchAll(catalystApp);
    const meta = dataCache.getMeta();
    return res.status(200).json({ ...tables, _meta: meta });
  } catch (err) {
    console.error('[app-data] Error:', err);
    return res.status(500).json({ error: errorMessage(err) });
  }
});

// ROUTE: POST /api/cache/invalidate — Force cache refresh
app.post('/api/cache/invalidate', (req, res) => {
  dataCache.invalidate();
  res.status(200).json({ message: 'Cache invalidated. Next request will re-fetch all tables.' });
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: MADHUKAR AI Copilot Chat
// ═══════════════════════════════════════════════════════════════════════════
app.post('/api/copilot/chat', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }
    // Sanitise history — keep last 10 turns to avoid huge payloads
    const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
    const result = await handleCopilotChat(catalystApp, req, message.trim(), recentHistory);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[Copilot Route] Error:', err);
    return res.status(500).json({ error: errorMessage(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE: Catalyst Cron Webhook Trigger - Threat & Investigation Audit
// ═══════════════════════════════════════════════════════════════════════════
let localCronAlerts = null;

app.post('/api/cron/threat-assess', async (req, res) => {
  try {
    const host = String(req.headers.host || '').split(':')[0].toLowerCase();
    const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host);
    
    if (!isLocal) {
      const clientKey = req.query.cron_key || req.headers['x-catalyst-cron-key'];
      const secureKey = process.env.CRON_SECRET_KEY;
      if (secureKey && clientKey !== secureKey) {
        return res.status(401).json({ error: 'Unauthorized: Invalid cron key parameter' });
      }
    }

    const catalystApp = catalyst.initialize(req);
    
    // 1. Fetch fresh tables through cache
    const tables = await dataCache.fetchAll(catalystApp);
    const cases = tables.CaseMaster || [];
    const accused = tables.Accused || [];
    const chargesheets = tables.ChargesheetDetails || [];
    
    const heinouses = cases.filter(c => Number(c.GravityOffenceID) === 1);
    
    const alerts = [];
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 30); // 30 days ago
    
    for (const c of heinouses) {
      // Find if chargesheet has been filed
      const cs = chargesheets.find(sheet => String(sheet.CaseMasterID) === String(c.CaseMasterID));
      const isPending = !cs;
      
      const regDate = new Date(c.CrimeRegisteredDate || c.CREATEDTIME);
      if (isPending && regDate < limitDate) {
        // Find accused count
        const caseAccused = accused.filter(a => String(a.CaseMasterID) === String(c.CaseMasterID));
        
        alerts.push({
          alert_id: `alert_${c.ROWID || Math.floor(1000 + Math.random() * 9000)}`,
          caseMasterId: c.CaseMasterID,
          crimeNo: c.CrimeNo || 'N/A',
          registeredDate: c.CrimeRegisteredDate,
          districtId: c.DistrictID,
          delayDays: Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24)),
          accusedCount: caseAccused.length,
          severity: 'CRITICAL',
          message: `Heinous offence FIR ${c.CrimeNo || ''} has been pending for ${Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24))} days without a chargesheet.`
        });
      }
    }
    
    // Sort alerts by delay length descending
    alerts.sort((a, b) => b.delayDays - a.delayDays);
    
    // Store in Catalyst Cache
    try {
      const cache = catalystApp.cache();
      const segment = cache.segment('56064000000013067');
      await segment.put('ksp-cron-threat-alerts', JSON.stringify(alerts), 1440);
      console.log(`[Cron] Stored ${alerts.length} threat alerts to Catalyst Cache.`);
    } catch (cacheErr) {
      console.warn('[Cron] Catalyst Cache Segment unavailable, falling back to local memory:', cacheErr.message);
      localCronAlerts = alerts;
    }
    
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      evaluatedCases: cases.length,
      alertsGenerated: alerts.length,
      alerts: alerts.slice(0, 10) // return top 10
    });
  } catch (err) {
    console.error('[Cron Route] Threat Assessment Error:', err);
    return res.status(500).json({ error: errorMessage(err) });
  }
});

// ROUTE: GET /api/cron/threat-alerts — Retrieves cached alerts for the dashboard
app.get('/api/cron/threat-alerts', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    let alerts = [];
    
    try {
      const cache = catalystApp.cache();
      const segment = cache.segment('56064000000013067');
      const cached = await segment.getValue('ksp-cron-threat-alerts');
      if (cached) {
        alerts = JSON.parse(cached);
      } else if (localCronAlerts) {
        alerts = localCronAlerts;
      }
    } catch (err) {
      if (localCronAlerts) {
        alerts = localCronAlerts;
      }
    }
    
    return res.status(200).json({ alerts });
  } catch (err) {
    return res.status(500).json({ error: errorMessage(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES: Catalyst MFA Security OTP (Break-Glass PII Access Control)
// ═══════════════════════════════════════════════════════════════════════════
const localOtpStorage = new Map();

app.post('/api/security/request-otp', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const { email: emailAddress, badgeId, officerName } = req.body;
    
    if (!emailAddress || !badgeId) {
      return res.status(400).json({ error: 'Email and Badge ID are required' });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
      const cache = catalystApp.cache();
      const segment = cache.segment('56064000000013067');
      await segment.put(`pii-otp-${badgeId.toUpperCase()}`, otp, 5);
      console.log(`[OTP] Saved OTP for badge ${badgeId} to cache.`);
    } catch (cacheErr) {
      console.warn('[OTP] Cache segment unavailable, storing in memory:', cacheErr.message);
      localOtpStorage.set(badgeId.toUpperCase(), { otp, expires: Date.now() + 5 * 60 * 1000 });
    }
    
    let emailSent = false;
    let mailError = null;
    try {
      const email = catalystApp.email();
      const emailConfig = {
        from_email: 'kabilanka2509@gmail.com',
        to_email: [emailAddress],
        subject: 'KSP Command Center - PII Unlock Verification',
        html_mode: true,
        content: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #cbd5e1; border-radius: 6px; max-width: 500px; color: #1e293b;">
            <h2 style="color: #5c2e91; margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #5c2e91; padding-bottom: 8px;">KSP PII ACCESS VERIFICATION</h2>
            <p style="font-size: 14px;">Officer <strong>${officerName || 'Officer'} (${badgeId})</strong> has requested PII access for this command session.</p>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
              <span style="font-size: 28px; font-weight: bold; color: #5c2e91; font-family: monospace; letter-spacing: 3px;">${otp}</span>
            </div>
            <p style="font-size: 12px; color: #64748b;">This OTP code is valid for 5 minutes. Do not share this with unauthorized personnel.</p>
          </div>
        `
      };
      await email.sendMail(emailConfig);
      emailSent = true;
    } catch (err) {
      mailError = err.message || err;
      console.warn('[OTP] Catalyst Mail sending failed:', mailError);
    }
    
    return res.status(200).json({
      success: true,
      emailSent,
      debugOtp: !emailSent ? otp : null,
      message: emailSent 
        ? 'OTP sent successfully to your registered email.' 
        : `Email delivery failed (${mailError}). For demo purposes, enter OTP: ${otp}`
    });
  } catch (err) {
    console.error('[OTP Route] Request Error:', err);
    return res.status(500).json({ error: errorMessage(err) });
  }
});

app.post('/api/security/verify-otp', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const { badgeId, otp } = req.body;
    
    if (!badgeId || !otp) {
      return res.status(400).json({ error: 'Badge ID and OTP code are required' });
    }
    
    let savedOtp = null;
    
    try {
      const cache = catalystApp.cache();
      const segment = cache.segment('56064000000013067');
      savedOtp = await segment.getValue(`pii-otp-${badgeId.toUpperCase()}`);
    } catch (cacheErr) {
      console.warn('[OTP] Cache read failed:', cacheErr.message);
    }
    
    if (!savedOtp) {
      const record = localOtpStorage.get(badgeId.toUpperCase());
      if (record && record.expires > Date.now()) {
        savedOtp = record.otp;
      }
    }
    
    if (!savedOtp) {
      return res.status(400).json({ error: 'OTP code has expired or is invalid. Please request a new one.' });
    }
    
    if (String(savedOtp).trim() !== String(otp).trim()) {
      return res.status(400).json({ error: 'Invalid verification OTP code. Please try again.' });
    }
    
    try {
      const cache = catalystApp.cache();
      const segment = cache.segment('56064000000013067');
      await segment.delete(`pii-otp-${badgeId.toUpperCase()}`);
    } catch (err) {
      localOtpStorage.delete(badgeId.toUpperCase());
    }
    
    return res.status(200).json({ success: true, message: 'OTP verified successfully.' });
  } catch (err) {
    console.error('[OTP Route] Verify Error:', err);
    return res.status(500).json({ error: errorMessage(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES: Dynamic Per-Officer MFA & PII Access Control
// ═══════════════════════════════════════════════════════════════════════════
const mfaService = require('./mfaService');
const localMfaProfiles = new Map();

function getCatalystAdminApp(req) {
  try {
    return catalyst.initialize(req, { scope: 'admin' });
  } catch (_) {
    return catalyst.initialize(req);
  }
}

// 1. Check MFA Status for an officer (Returns QR if not active / enrolled, or ENROLLED)
app.get('/api/mfa/status', async (req, res) => {
  try {
    const catalystApp = getCatalystAdminApp(req);
    const email = String(req.query.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid officer email is required' });
    }

    const dataTable = catalystApp.datastore().table('UserMFA');
    const existingRows = await optionalQuery(catalystApp, `SELECT ROWID, UserEmail, EncryptedSecret, IsActive, LastVerifiedAt FROM UserMFA WHERE UserEmail = '${email}'`, 'UserMFA');

    let row = existingRows && existingRows.length > 0 ? existingRows[0] : null;
    if (!row && localMfaProfiles.has(email)) {
      row = localMfaProfiles.get(email);
    }

    if (row && (row.IsActive === true || String(row.IsActive).toLowerCase() === 'true')) {
      return res.status(200).json({
        status: 'ENROLLED',
        userEmail: email,
        lastVerifiedAt: row.LastVerifiedAt || null,
        message: 'Officer is enrolled in Authenticator 2FA.'
      });
    }

    // Not enrolled or setup required -> Generate a unique Base32 secret
    const secret = mfaService.generateBase32Secret();
    const encryptedSecret = mfaService.encryptSecret(secret);
    const uri = mfaService.generateOtpauthURI(email, secret, 'KSP Intelligence');
    const qrDataUrl = await mfaService.generateQrDataUrl(uri);

    try {
      if (row && row.ROWID) {
        await dataTable.updateRow({
          ROWID: row.ROWID,
          EncryptedSecret: encryptedSecret,
          IsActive: false,
        });
      } else {
        const inserted = await dataTable.insertRow({
          UserEmail: email,
          EncryptedSecret: encryptedSecret,
          IsActive: false,
        });
        if (inserted && inserted.ROWID) row = inserted;
      }
    } catch (dbErr) {
      console.warn('[MFA Status] DataStore write notice:', dbErr.message);
      localMfaProfiles.set(email, {
        UserEmail: email,
        EncryptedSecret: encryptedSecret,
        IsActive: false,
      });
    }

    return res.status(200).json({
      status: 'SETUP_REQUIRED',
      userEmail: email,
      qrDataUrl,
      secret,
      uri,
      message: 'Scan the QR code with Google Authenticator or enter the setup key.'
    });
  } catch (err) {
    console.error('[MFA Status] Error:', err);
    return res.status(500).json({ error: errorMessage(err) });
  }
});

// 2. Verify 6-digit TOTP code (Activates user on setup, or authorizes PII unlock)
app.post('/api/mfa/verify', async (req, res) => {
  try {
    const catalystApp = getCatalystAdminApp(req);
    const email = String(req.body.email || '').trim().toLowerCase();
    const token = String(req.body.token || '').trim();

    if (!email || !token) {
      return res.status(400).json({ error: 'Email and 6-digit Authenticator code are required' });
    }

    const dataTable = catalystApp.datastore().table('UserMFA');
    const existingRows = await optionalQuery(catalystApp, `SELECT ROWID, UserEmail, EncryptedSecret, IsActive FROM UserMFA WHERE UserEmail = '${email}'`, 'UserMFA');

    let row = existingRows && existingRows.length > 0 ? existingRows[0] : null;
    if (!row && localMfaProfiles.has(email)) {
      row = localMfaProfiles.get(email);
    }

    if (!row || !row.EncryptedSecret) {
      return res.status(404).json({ error: 'Officer MFA profile not found. Please initiate setup first.' });
    }

    const plainSecret = mfaService.decryptSecret(row.EncryptedSecret);
    if (!plainSecret) {
      return res.status(500).json({ error: 'Failed to decrypt MFA security key' });
    }

    const isValid = mfaService.verifyTOTP(plainSecret, token, 1);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid 6-digit Authenticator code. Please check your Authenticator app and try again.' });
    }

    // Catalyst Datastore datetime format must be YYYY-MM-DD HH:mm:ss
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    try {
      if (row.ROWID) {
        await dataTable.updateRow({
          ROWID: row.ROWID,
          IsActive: true,
          LastVerifiedAt: now,
        });
      }
    } catch (dbErr) {
      console.warn('[MFA Verify] DataStore update notice:', dbErr.message);
    }

    localMfaProfiles.set(email, {
      ...row,
      IsActive: true,
      LastVerifiedAt: now,
    });

    return res.status(200).json({
      success: true,
      verified: true,
      userEmail: email,
      message: 'PII access authorized.'
    });
  } catch (err) {
    console.error('[MFA Verify] Error:', err);
    return res.status(500).json({ error: errorMessage(err) });
  }
});

// 3. Request MFA Reset (Lost Phone / Re-enroll) -> Sends 6-digit verification code to email
app.post('/api/mfa/request-reset', async (req, res) => {
  try {
    const catalystApp = getCatalystAdminApp(req);
    const emailAddress = String(req.body.email || '').trim().toLowerCase();
    const badgeId = req.body.badgeId || '';
    const officerName = req.body.officerName || 'Officer';

    if (!emailAddress || !emailAddress.includes('@')) {
      return res.status(400).json({ error: 'Valid officer email is required' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const cacheKey = `mfa-reset-${emailAddress.replace(/[^a-z0-9]/gi, '_')}`;

    try {
      const cache = catalystApp.cache();
      const segment = cache.segment('56064000000013067');
      await segment.put(cacheKey, otp, 5); // 5 minutes TTL
    } catch (cacheErr) {
      localOtpStorage.set(cacheKey, { otp, expires: Date.now() + 5 * 60 * 1000 });
    }

    let emailSent = false;
    let mailError = null;
    try {
      const email = catalystApp.email();
      const emailConfig = {
        from_email: 'kabilanka2509@gmail.com',
        to_email: [emailAddress],
        subject: 'KSP Command Center — Authenticator Reset Verification Code',
        html_mode: true,
        content: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #cbd5e1; border-radius: 8px; max-width: 500px; color: #1e293b;">
            <h2 style="color: #5c2e91; margin: 0 0 12px 0; font-size: 20px; border-bottom: 2px solid #5c2e91; padding-bottom: 8px;">KSP MFA DEVICE RESET</h2>
            <p style="font-size: 14px; line-height: 1.5;">Officer <strong>${officerName} ${badgeId ? `(${badgeId})` : ''}</strong> has requested to reset their Authenticator setup key.</p>
            <p style="font-size: 14px; margin-top: 15px;">Use the verification code below to authorize the new Authenticator QR code:</p>
            <div style="background: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #5c2e91; font-family: monospace; letter-spacing: 4px;">${otp}</span>
            </div>
            <p style="font-size: 12px; color: #64748b;">This code expires in 5 minutes. If you did not request this reset, contact the Command IT Administrator immediately.</p>
          </div>
        `
      };
      await email.sendMail(emailConfig);
      emailSent = true;
    } catch (err) {
      mailError = err.message || err;
      console.warn('[MFA Reset] Email send failed:', mailError);
    }

    return res.status(200).json({
      success: true,
      emailSent,
      debugOtp: !emailSent ? otp : null,
      message: emailSent
        ? `Verification code sent to ${emailAddress}.`
        : `Email delivery unavailable (${mailError}). For demo: ${otp}`
    });
  } catch (err) {
    console.error('[MFA Request Reset] Error:', err);
    return res.status(500).json({ error: errorMessage(err) });
  }
});

// 4. Confirm Reset & Issue New QR Code
app.post('/api/mfa/confirm-reset', async (req, res) => {
  try {
    const catalystApp = getCatalystAdminApp(req);
    const emailAddress = String(req.body.email || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim();

    if (!emailAddress || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const cacheKey = `mfa-reset-${emailAddress.replace(/[^a-z0-9]/gi, '_')}`;
    let savedOtp = null;

    try {
      const cache = catalystApp.cache();
      const segment = cache.segment('56064000000013067');
      savedOtp = await segment.getValue(cacheKey);
    } catch (cacheErr) {
      console.warn('[MFA Reset] Cache read failed:', cacheErr.message);
    }

    if (!savedOtp) {
      const record = localOtpStorage.get(cacheKey);
      if (record && record.expires > Date.now()) savedOtp = record.otp;
    }

    if (!savedOtp || String(savedOtp).trim() !== String(code).trim()) {
      return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new code.' });
    }

    // Code is valid! Clean up cache
    try {
      const cache = catalystApp.cache();
      const segment = cache.segment('56064000000013067');
      await segment.delete(cacheKey);
    } catch (_) {
      localOtpStorage.delete(cacheKey);
    }

    // Invalidate old secret, generate brand-new secret
    const newSecret = mfaService.generateBase32Secret();
    const newEncrypted = mfaService.encryptSecret(newSecret);
    const uri = mfaService.generateOtpauthURI(emailAddress, newSecret, 'KSP Intelligence');
    const qrDataUrl = await mfaService.generateQrDataUrl(uri);

    const dataTable = catalystApp.datastore().table('UserMFA');
    const existingRows = await optionalQuery(catalystApp, `SELECT ROWID FROM UserMFA WHERE UserEmail = '${emailAddress}'`, 'UserMFA');

    let row = existingRows && existingRows.length > 0 ? existingRows[0] : null;

    try {
      if (row && row.ROWID) {
        await dataTable.updateRow({
          ROWID: row.ROWID,
          EncryptedSecret: newEncrypted,
          IsActive: false, // Must re-verify with first code
        });
      } else {
        await dataTable.insertRow({
          UserEmail: emailAddress,
          EncryptedSecret: newEncrypted,
          IsActive: false,
        });
      }
    } catch (dbErr) {
      console.warn('[MFA Confirm Reset] DataStore write notice:', dbErr.message);
    }

    localMfaProfiles.set(emailAddress, {
      UserEmail: emailAddress,
      EncryptedSecret: newEncrypted,
      IsActive: false,
    });

    return res.status(200).json({
      success: true,
      status: 'SETUP_REQUIRED',
      qrDataUrl,
      secret: newSecret,
      uri,
      message: 'Old Authenticator key revoked. Scan the new QR code to re-enroll.'
    });
  } catch (err) {
    console.error('[MFA Confirm Reset] Error:', err);
    return res.status(500).json({ error: errorMessage(err) });
  }
});

// ─── Express listener for Catalyst ────────────────────────────────────────
module.exports = app;
