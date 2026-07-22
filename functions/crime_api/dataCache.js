/**
 * dataCache.js — Shared In-Process Data Cache
 *
 * Fetches ALL Catalyst Data Store tables ONCE and caches them for 5 minutes.
 * Both the /api/app-data endpoint (used by the frontend dashboard) and the
 * copilotEngine.js import from this module — eliminating duplicate fetches
 * and replacing the 60+ individual /api/masters requests.
 *
 * Cache TTL: 5 minutes
 * Thread-safe: deduplicates concurrent in-flight requests with a single Promise
 */

'use strict';

// ─── ZCQL Helper ──────────────────────────────────────────────────────────────
async function zcql(app, sql) {
  const result = await app.zcql().executeZCQLQuery(sql);
  return result.map((row) => { const t = Object.keys(row)[0]; return row[t]; });
}

async function safeZcql(app, sql, label) {
  try { return await zcql(app, sql); }
  catch (err) {
    console.warn(`[DataCache] ${label} failed:`, (err.message || '').toString().slice(0, 120));
    return [];
  }
}

// ─── Pagination helper ────────────────────────────────────────────────────────
async function fetchTablePaged(app, tableName, maxPages = 10) {
  const rows = [];
  const seenRowIds = new Set();
  for (let page = 0; page < maxPages; page++) {
    const offset = page * 300;
    const batch = await safeZcql(
      app,
      `SELECT * FROM ${tableName} ORDER BY ROWID ASC LIMIT 300 OFFSET ${offset}`,
      `${tableName}-p${page}`
    );
    if (!batch.length) break;
    // Catalyst can repeat the boundary ROWID on adjacent OFFSET pages.
    // De-duplicate it so dashboard consumers receive each stored row once.
    for (const row of batch) {
      const rowId = row.ROWID == null ? null : String(row.ROWID);
      if (rowId !== null && seenRowIds.has(rowId)) continue;
      if (rowId !== null) seenRowIds.add(rowId);
      rows.push(row);
    }
    if (batch.length < 300) break;
  }
  return rows;
}

async function fetchTableOnce(app, tableName) {
  return safeZcql(app, `SELECT * FROM ${tableName}`, tableName);
}

// ─── Cache State ──────────────────────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const _cache = { data: null, ts: 0 };
let _inflight = null; // deduplicate concurrent fetches

// ─── Main Fetch ───────────────────────────────────────────────────────────────
async function fetchAll(app) {
  // Serve from cache if still fresh
  if (_cache.data && Date.now() - _cache.ts < CACHE_TTL) {
    return _cache.data;
  }

  // Deduplicate concurrent requests — return the in-flight promise if one exists
  if (_inflight) return _inflight;

  _inflight = (async () => {
    try {
      const t0 = Date.now();
      console.log('[DataCache] Starting full data refresh...');

      // ── Large/paginated tables (fetch in parallel) ──────────────────────
      const [
        CaseMaster,
        Accused,
        Victim,
        ArrestSurrender,
        ChargesheetDetails,
        ComplainantDetails,
        ActSectionAssociation,
        CrimeHeadActSection,
        Employee,
      ] = await Promise.all([
        fetchTablePaged(app, 'CaseMaster'),
        fetchTablePaged(app, 'Accused'),
        fetchTablePaged(app, 'Victim'),
        fetchTablePaged(app, 'ArrestSurrender'),
        fetchTablePaged(app, 'ChargesheetDetails'),
        fetchTablePaged(app, 'ComplainantDetails'),
        fetchTablePaged(app, 'ActSectionAssociation'),
        fetchTablePaged(app, 'CrimeHeadActSection'),
        fetchTablePaged(app, 'Employee'),
      ]);

      // ── Small reference tables (fetch in parallel) ──────────────────────
      const [
        Section, Act, GravityOffence, CaseCategory, Designation, Rank,
        UnitType, Unit, State, District, Court, CaseStatusMaster,
        OccupationMaster, ReligionMaster, CasteMaster, CrimeSubHead, CrimeHead,
      ] = await Promise.all([
        fetchTableOnce(app, 'Section'),
        fetchTableOnce(app, 'Act'),
        fetchTableOnce(app, 'GravityOffence'),
        fetchTableOnce(app, 'CaseCategory'),
        fetchTableOnce(app, 'Designation'),
        fetchTableOnce(app, 'Rank'),
        fetchTableOnce(app, 'UnitType'),
        fetchTableOnce(app, 'Unit'),
        fetchTableOnce(app, 'State'),
        fetchTableOnce(app, 'District'),
        fetchTableOnce(app, 'Court'),
        fetchTableOnce(app, 'CaseStatusMaster'),
        fetchTableOnce(app, 'OccupationMaster'),
        fetchTableOnce(app, 'ReligionMaster'),
        fetchTableOnce(app, 'CasteMaster'),
        fetchTableOnce(app, 'CrimeSubHead'),
        fetchTableOnce(app, 'CrimeHead'),
      ]);

      const tables = {
        CaseMaster, Accused, Victim, ArrestSurrender, ChargesheetDetails,
        ComplainantDetails, ActSectionAssociation, CrimeHeadActSection, Employee,
        Section, Act, GravityOffence, CaseCategory, Designation, Rank,
        UnitType, Unit, State, District, Court, CaseStatusMaster,
        OccupationMaster, ReligionMaster, CasteMaster, CrimeSubHead, CrimeHead,
      };

      _cache.data = tables;
      _cache.ts = Date.now();

      const elapsed = Date.now() - t0;
      const summary = Object.entries(tables)
        .map(([k, v]) => `${k}:${v.length}`)
        .join(', ');
      console.log(`[DataCache] Refresh done in ${elapsed}ms — ${summary}`);

      return tables;
    } finally {
      _inflight = null;
    }
  })();

  return _inflight;
}

/** Force cache invalidation (call after data mutations). */
function invalidate() {
  _cache.data = null;
  _cache.ts = 0;
  _inflight = null;
  console.log('[DataCache] Cache invalidated.');
}

/** Return cache metadata (useful for /api/app-data response header). */
function getMeta() {
  if (!_cache.data) return null;
  return {
    cachedAt: new Date(_cache.ts).toISOString(),
    expiresAt: new Date(_cache.ts + CACHE_TTL).toISOString(),
    counts: Object.fromEntries(
      Object.entries(_cache.data).map(([k, v]) => [k, v.length])
    ),
  };
}

module.exports = { fetchAll, invalidate, getMeta };
