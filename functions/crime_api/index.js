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

// ─── Express listener for Catalyst ────────────────────────────────────────
module.exports = app;
