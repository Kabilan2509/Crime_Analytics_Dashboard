/**
 * dataService.js — Smart data layer that switches between sources
 *
 * By default: Fetches from /server/crime_api/api/* endpoints. This works for
 * both `catalyst serve` and deployed Catalyst clients.
 * Set REACT_APP_DATA_SOURCE=sample to use sampleData.js for offline UI work.
 *
 * Every page imports from this service instead of sampleData directly.
 * Zero code changes needed when switching environments.
 */

import * as sampleData from '../data/sampleData';
import { caseViews, employees, districts as schemaDistricts, hydrateCatalystSchema } from '../data/schemaSelectors';

// ─── Data-source selection ─────────────────────────────────────────────
// Catalyst's local server uses localhost, so hostname detection cannot reliably
// distinguish `catalyst serve` from a standalone React dev server.
const IS_CATALYST = process.env.REACT_APP_DATA_SOURCE !== 'sample';

const API_BASE = '/server/crime_api/api';

// ─── Generic fetch wrapper ────────────────────────────────────────────────
async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== 'all') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try {
      const parsed = JSON.parse(body);
      detail = parsed.error || parsed.message || body;
    } catch (_) {
      // Keep the plain-text response returned by the local Catalyst server.
    }
    const message = `Catalyst API ${res.status} (${endpoint}): ${detail || res.statusText}`;
    console.error(message);
    throw new Error(message);
  }
  return res.json();
}

let masterDataPromise;
let catalystTablesPromise;
const caseViewsRequests = new Map();

const CATALYST_TABLES = [
  'CrimeHeadActSection', 'Section', 'Act', 'ArrestSurrender', 'Accused',
  'Victim', 'ActSectionAssociation', 'ChargesheetDetails', 'GravityOffence',
  'CaseCategory', 'Employee', 'Designation', 'Rank', 'UnitType',
  'ComplainantDetails', 'Unit', 'State', 'District', 'Court',
  'CaseStatusMaster', 'OccupationMaster', 'ReligionMaster', 'CasteMaster',
  'CrimeSubHead', 'CrimeHead', 'CaseMaster',
];

async function fetchWholeTable(tableName) {
  const rows = [];
  const pageSize = 300;
  let offset = 0;
  let pageRows;
  do {
    const page = await apiFetch('/masters', { table: tableName, limit: pageSize, offset });
    pageRows = page.data || [];
    rows.push(...pageRows);
    offset += pageRows.length;
  } while (pageRows.length === pageSize);
  return rows;
}

function getCatalystTables() {
  if (!catalystTablesPromise) {
    catalystTablesPromise = Promise.all(
      CATALYST_TABLES.map(async table => [table, await fetchWholeTable(table)])
    ).then(Object.fromEntries).catch(error => {
      catalystTablesPromise = null;
      throw error;
    });
  }
  return catalystTablesPromise;
}

function toMasters(tables) {
  const stateIndex = indexBy(tables.State, 'ROWID', 'StateID');
  const districtIndex = indexBy(tables.District, 'ROWID', 'DistrictID');
  const unitTypeIndex = indexBy(tables.UnitType, 'ROWID', 'UnitTypeID');
  const crimeHeadIndex = indexBy(tables.CrimeHead, 'ROWID', 'CrimeHeadID');
  const actIndex = indexBy(tables.Act, 'ROWID', 'ActCode');
  const normalizedDistricts = tables.District.map(district => ({
    ...district,
    StateID: stateIndex[String(district.StateID)]?.StateID ?? district.StateID,
  }));
  const normalizedStations = tables.Unit.map(unit => ({
    ...unit,
    DistrictID: districtIndex[String(unit.DistrictID)]?.DistrictID ?? unit.DistrictID,
    StateID: stateIndex[String(unit.StateID)]?.StateID ?? unit.StateID,
    TypeID: unitTypeIndex[String(unit.TypeID)]?.UnitTypeID ?? unit.TypeID,
  }));
  const normalizedCrimeSubHeads = tables.CrimeSubHead.map(subHead => ({
    ...subHead,
    CrimeHeadID: crimeHeadIndex[String(subHead.CrimeHeadID)]?.CrimeHeadID ?? subHead.CrimeHeadID,
  }));
  const normalizedSections = tables.Section.map(section => ({
    ...section,
    ActCode: actIndex[String(section.ActCode)]?.ActCode ?? section.ActCode,
  }));
  return {
    districts: normalizedDistricts,
    crimeHeads: tables.CrimeHead,
    crimeSubHeads: normalizedCrimeSubHeads,
    statuses: tables.CaseStatusMaster,
    stations: normalizedStations,
    ranks: tables.Rank,
    gravityOffences: tables.GravityOffence,
    caseCategories: tables.CaseCategory,
    courts: tables.Court,
    employees: tables.Employee,
    states: tables.State,
    unitTypes: tables.UnitType,
    designations: tables.Designation,
    casteMaster: tables.CasteMaster,
    religionMaster: tables.ReligionMaster,
    occupationMaster: tables.OccupationMaster,
    acts: tables.Act,
    sections: normalizedSections,
  };
}

function getCachedMasterData() {
  if (!masterDataPromise) masterDataPromise = getCatalystTables().then(toMasters);
  return masterDataPromise;
}

function indexBy(rows = [], ...keys) {
  const index = {};
  rows.forEach(row => {
    keys.forEach(key => {
      if (row[key] !== undefined && row[key] !== null) index[String(row[key])] = row;
    });
  });
  return index;
}

function groupBy(rows = [], key) {
  return rows.reduce((groups, row) => {
    const value = String(row[key]);
    if (!groups[value]) groups[value] = [];
    groups[value].push(row);
    return groups;
  }, {});
}

function normalizeCatalystCases(rows, masters, tables) {
  // Catalyst lookup columns contain the referenced row's ROWID, while older
  // seed data may contain logical IDs. Index both forms so either schema works.
  const districts = indexBy(masters.districts, 'ROWID', 'DistrictID');
  const stations = indexBy(masters.stations, 'ROWID', 'UnitID');
  const crimeHeads = indexBy(masters.crimeHeads, 'ROWID', 'CrimeHeadID');
  const crimeSubHeads = indexBy(masters.crimeSubHeads, 'ROWID', 'CrimeSubHeadID');
  const statuses = indexBy(masters.statuses, 'ROWID', 'CaseStatusID');
  const gravityOffences = indexBy(masters.gravityOffences, 'ROWID', 'GravityOffenceID');
  const caseCategories = indexBy(masters.caseCategories, 'ROWID', 'CaseCategoryID');
  const courts = indexBy(masters.courts, 'ROWID', 'CourtID');
  const employees = indexBy(masters.employees, 'ROWID', 'EmployeeID');
  const acts = indexBy(tables.Act, 'ROWID', 'ActCode');
  const sections = indexBy(masters.sections, 'ROWID', 'SectionCode');
  const complainantsByCase = groupBy(tables.ComplainantDetails, 'CaseMasterID');
  const victimsByCase = groupBy(tables.Victim, 'CaseMasterID');
  const accusedByCase = groupBy(tables.Accused, 'CaseMasterID');
  const arrestsByCase = groupBy(tables.ArrestSurrender, 'CaseMasterID');
  const chargesheetsByCase = groupBy(tables.ChargesheetDetails, 'CaseMasterID');
  const actSectionsByCase = groupBy(tables.ActSectionAssociation, 'CaseMasterID');

  return rows.map(item => {
    const station = stations[String(item.PoliceStationID)];
    const district = districts[String(item.DistrictID ?? station?.DistrictID)];
    const districtId = district?.DistrictID ?? item.DistrictID ?? station?.DistrictID;
    const gravity = gravityOffences[String(item.GravityOffenceID)];
    const gravityLabel = gravity?.LookupValue || gravity?.GravityOffenceName || gravity?.Name || '';
    const employee = employees[String(item.PolicePersonID)];
    const caseKeys = [String(item.ROWID), String(item.CaseMasterID)];
    const related = groups => caseKeys.flatMap(key => groups[key] || []);
    const registeredDateObj = new Date(String(item.CrimeRegisteredDate || '').replace(' ', 'T'));
    const incidentFromDateObj = item.IncidentFromDate
      ? new Date(String(item.IncidentFromDate).replace(' ', 'T')) : null;
    const infoReceivedDateObj = item.InfoReceivedPSDate
      ? new Date(String(item.InfoReceivedPSDate).replace(' ', 'T')) : null;

    return {
      ...item,
      // UI filters, maps and selectors use the ER diagram's logical IDs. Catalyst
      // ROWIDs remain available on the joined master/child records for internal joins.
      PoliceStationID: station?.UnitID ?? item.PoliceStationID,
      PolicePersonID: employee?.EmployeeID ?? item.PolicePersonID,
      CrimeMajorHeadID: crimeHeads[String(item.CrimeMajorHeadID)]?.CrimeHeadID ?? item.CrimeMajorHeadID,
      CrimeMinorHeadID: crimeSubHeads[String(item.CrimeMinorHeadID)]?.CrimeSubHeadID ?? item.CrimeMinorHeadID,
      CaseStatusID: statuses[String(item.CaseStatusID)]?.CaseStatusID ?? item.CaseStatusID,
      GravityOffenceID: gravity?.GravityOffenceID ?? item.GravityOffenceID,
      CaseCategoryID: caseCategories[String(item.CaseCategoryID)]?.CaseCategoryID ?? item.CaseCategoryID,
      CourtID: courts[String(item.CourtID)]?.CourtID ?? item.CourtID,
      districtID: districtId == null ? null : String(districtId),
      districtName: district?.DistrictName || 'Unknown',
      policeStationName: station?.UnitName || station?.PoliceStationName || 'Unknown',
      majorHeadName: crimeHeads[String(item.CrimeMajorHeadID)]?.CrimeGroupName || 'Unknown',
      minorHeadName: crimeSubHeads[String(item.CrimeMinorHeadID)]?.CrimeHeadName || 'Unknown',
      statusName: statuses[String(item.CaseStatusID)]?.CaseStatusName || 'Unknown',
      categoryName: caseCategories[String(item.CaseCategoryID)]?.LookupValue || 'Unknown',
      courtName: courts[String(item.CourtID)]?.CourtName || 'Unassigned',
      officerName: employee ? `${employee.FirstName || 'Officer'}${employee.KGID ? ` (${employee.KGID})` : ''}` : 'Unassigned',
      officerKGID: employee?.KGID || null,
      registeredDateObj,
      incidentFromDateObj,
      infoReceivedDateObj,
      gravityLabel: gravityLabel || 'Unknown',
      isHeinous: /heinous/i.test(gravityLabel) && !/non[-\s]?heinous/i.test(gravityLabel),
      latitude: item.latitude == null ? null : Number(item.latitude),
      longitude: item.longitude == null ? null : Number(item.longitude),
      complainants: related(complainantsByCase),
      victims: related(victimsByCase),
      accused: related(accusedByCase),
      arrests: related(arrestsByCase),
      chargesheets: related(chargesheetsByCase),
      actSections: related(actSectionsByCase).map(row => ({
        ...row,
        act: acts[String(row.ActID)] || null,
        section: sections[String(row.SectionID)] || null,
      })),
    };
  }).filter(item => !Number.isNaN(item.registeredDateObj.getTime()));
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API — used by all pages
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all reference/master data (districts, crimeHeads, statuses, etc.)
 * Called once on app load to populate dropdowns and filters.
 */
export async function getMasterData() {
  if (IS_CATALYST) {
    return getCachedMasterData();
  }
  // Local fallback
  return {
    districts: sampleData.districts,
    crimeHeads: sampleData.crimeHeads,
    statuses: sampleData.caseStatusMaster,
    stations: sampleData.units,
    ranks: sampleData.ranks,
    employees: sampleData.employees,
    states: sampleData.states,
    unitTypes: sampleData.unitTypes,
    designations: sampleData.designations,
    casteMaster: sampleData.casteMaster,
    religionMaster: sampleData.religionMaster,
    occupationMaster: sampleData.occupationMaster,
    acts: sampleData.acts,
    sections: sampleData.sections,
    caseCategories: sampleData.caseCategories,
    gravityOffences: sampleData.gravityOffences,
    gravityOffenceMaster: sampleData.gravityOffenceMaster,
    courts: sampleData.courts,
  };
}

/**
 * Get enriched case views (joined data).
 * This is the main data source for Dashboard, Statistics, Reports, Predictions.
 */
async function fetchCatalystCaseViews(filters) {
    const tables = await getCatalystTables();
    const allCases = tables.CaseMaster;
    const masters = toMasters(tables);
    const uniqueCases = [...new Map(
      allCases.map(item => [String(item.ROWID || item.CaseMasterID), item])
    ).values()];
    const normalizedCases = normalizeCatalystCases(uniqueCases, masters, tables);
    hydrateCatalystSchema(normalizedCases, masters, tables);
    return normalizedCases;
}

export async function getCaseViews(filters = {}) {
  if (IS_CATALYST) {
    const requestKey = JSON.stringify(filters);
    if (!caseViewsRequests.has(requestKey)) {
      const request = fetchCatalystCaseViews(filters).catch(error => {
        caseViewsRequests.delete(requestKey);
        throw error;
      });
      caseViewsRequests.set(requestKey, request);
    }
    return caseViewsRequests.get(requestKey);
  }
  // Local fallback — return pre-joined caseViews
  return caseViews;
}

/**
 * Get dashboard KPI data (totals, monthly trend, district breakdown).
 */
export async function getDashboardData(filters = {}) {
  if (IS_CATALYST) {
    return apiFetch('/dashboard', filters);
  }
  // Local fallback — compute from sampleData
  const { filterCases } = await import('../utils/filterCases');
  const filtered = filterCases(caseViews, filters);
  const total = filtered.length;
  const heinous = filtered.filter(c => c.isHeinous).length;
  return {
    totals: [{ total, heinous }],
    monthlyTrend: [],
    districtBreakdown: [],
    statusBreakdown: [],
  };
}

/**
 * Get pre-computed statistics for charts.
 */
export async function getStatisticsData(filters = {}) {
  if (IS_CATALYST) {
    return apiFetch('/statistics', filters);
  }
  // Local fallback — let statisticsUtils handle it
  return null; // Signal to use local computation
}

/**
 * Get prediction/risk data.
 */
export async function getPredictionData() {
  if (IS_CATALYST) {
    return apiFetch('/predictions');
  }
  return null; // Signal to use local computation
}

/**
 * Get report metrics.
 */
export async function getReportData(filters = {}) {
  if (IS_CATALYST) {
    return apiFetch('/reports', filters);
  }
  return null; // Signal to use local computation
}

/**
 * FIR quick search.
 */
export async function firLookup(query) {
  if (IS_CATALYST) {
    const data = await apiFetch('/lookup', { q: query });
    return data.results || [];
  }
  // Local fallback
  const q = (query || '').toLowerCase();
  return caseViews
    .filter(c =>
      String(c.CaseMasterID).includes(q) ||
      (c.FIRNo || '').toLowerCase().includes(q) ||
      (c.districtName || '').toLowerCase().includes(q) ||
      (c.policeStationName || '').toLowerCase().includes(q)
    )
    .slice(0, 20);
}

/**
 * Get a specific master table by name.
 */
export async function getMasterTable(tableName) {
  if (IS_CATALYST) {
    const data = await apiFetch('/masters', { table: tableName });
    return data.data || [];
  }
  // Local fallback — map table name to sampleData export
  const TABLE_MAP = {
    State: sampleData.states,
    District: sampleData.districts,
    Court: sampleData.courts,
    PoliceStation: sampleData.units,
    UnitType: sampleData.unitTypes,
    Rank: sampleData.ranks,
    Designation: sampleData.designations,
    Employee: sampleData.employees,
    CasteMaster: sampleData.casteMaster,
    ReligionMaster: sampleData.religionMaster,
    OccupationMaster: sampleData.occupationMaster,
    CrimeHead: sampleData.crimeHeads,
    CrimeSubHead: sampleData.crimeSubHeads,
    CaseCategory: sampleData.caseCategories,
    GravityOffence: sampleData.gravityOffences,
    CaseStatus: sampleData.caseStatuses,
    CaseStatusMaster: sampleData.caseStatusMaster,
    Act: sampleData.acts,
    Section: sampleData.sections,
    Victim: sampleData.victims,
    Accused: sampleData.accused,
    Arrest: sampleData.arrests,
    ChargeSheet: sampleData.chargesheetDetails,
  };
  return TABLE_MAP[tableName] || [];
}

/**
 * Get district list (convenience shortcut).
 */
export async function getDistricts() {
  if (IS_CATALYST) {
    return apiFetch('/districts');
  }
  return sampleData.districts;
}

/**
 * Get employees list (convenience shortcut).
 */
export async function getEmployees(districtId) {
  if (IS_CATALYST) {
    return apiFetch('/employees', { districtId });
  }
  return districtId
    ? sampleData.employees.filter(e => e.DistrictID === Number(districtId))
    : sampleData.employees;
}

// ─── Environment info (for debugging) ─────────────────────────────────────
export function getEnvironment() {
  return {
    isCatalyst: IS_CATALYST,
    apiBase: IS_CATALYST ? API_BASE : 'local (sampleData.js)',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
  };
}
