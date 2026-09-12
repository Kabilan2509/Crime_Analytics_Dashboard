import {
  states,
  districts,
  courts,
  units,
  unitTypes,
  ranks,
  designations,
  employees,
  casteMaster,
  religionMaster,
  occupationMaster,
  policeStations,
  crimeHeads,
  crimeSubHeads,
  crimeHeadActSection,
  caseCategories,
  gravityOffences,
  gravityOffenceMaster,
  caseStatuses,
  caseStatusMaster,
  acts,
  sections,
  cases,
  invOccuranceTime,
  complainantDetails,
  actSectionAssociations,
  victims,
  accused,
  arrests,
  chargesheets,
  chargesheetDetails,
  invArrestSurrenderAccused,
} from './sampleData';
import { resolveCrimeMajorHead, resolveCrimeMinorHead } from '../utils/crimeTaxonomy';

function indexBy(items, key) {
  const index = {};
  items.forEach(item => {
    if (item[key] !== undefined && item[key] !== null) index[String(item[key])] = item;
    if (item.ROWID !== undefined && item.ROWID !== null) index[String(item.ROWID)] = item;
  });
  return index;
}

function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key];
    if (!acc[value]) acc[value] = [];
    acc[value].push(item);
    return acc;
  }, {});
}

export const schemaEntities = {
  states,
  districts,
  courts,
  units,
  unitTypes,
  ranks,
  designations,
  employees,
  casteMaster,
  religionMaster,
  occupationMaster,
  policeStations,
  crimeHeads,
  crimeSubHeads,
  crimeHeadActSection,
  caseCategories,
  gravityOffences,
  gravityOffenceMaster,
  caseStatuses,
  caseStatusMaster,
  acts,
  sections,
  cases,
  invOccuranceTime,
  complainantDetails,
  actSectionAssociations,
  victims,
  accused,
  arrests,
  chargesheetDetails,
  invArrestSurrenderAccused,
};

export const stateMap = indexBy(states, 'StateID');
export const districtMap = indexBy(districts, 'DistrictID');
export const courtMap = indexBy(courts, 'CourtID');
export const unitMap = indexBy(units, 'UnitID');
export const unitTypeMap = indexBy(unitTypes, 'UnitTypeID');
export const employeeMap = indexBy(employees, 'EmployeeID');
export const rankMap = indexBy(ranks, 'RankID');
export const designationMap = indexBy(designations, 'DesignationID');
export const occupationMap = indexBy(occupationMaster, 'OccupationID');
export const religionMap = indexBy(religionMaster, 'ReligionID');
export const casteMap = indexBy(casteMaster, 'caste_master_id');
export const crimeHeadMap = indexBy(crimeHeads, 'CrimeHeadID');
export const crimeSubHeadMap = indexBy(crimeSubHeads, 'CrimeSubHeadID');
export const caseCategoryMap = Object.fromEntries(caseCategories.map((item) => [item.CaseCategoryID, item.LookupValue]));
export const gravityMap = Object.fromEntries(gravityOffences.map((item) => [item.GravityOffenceID, item.LookupValue]));
export const caseStatusMap = Object.fromEntries(caseStatusMaster.map((item) => [item.CaseStatusID, item.CaseStatusName]));
export const actMap = Object.fromEntries(acts.map((item) => [item.ActCode, item]));
export const sectionMap = Object.fromEntries(sections.map((item) => [`${item.ActCode}:${item.SectionCode}`, item]));

export const occurrenceByCase = indexBy(invOccuranceTime, 'CaseMasterID');
export const complainantsByCase = groupBy(complainantDetails, 'CaseMasterID');
export const victimsByCase = groupBy(victims, 'CaseMasterID');
export const accusedByCase = groupBy(accused, 'CaseMasterID');
export const arrestsByCase = groupBy(arrests, 'CaseMasterID');
export const chargesheetsByCase = groupBy(chargesheetDetails, 'CaseMasterID');
export const actSectionsByCase = groupBy(actSectionAssociations, 'CaseMasterID');

export const districtCenters = {
  1: { lat: 12.9716, lng: 77.5946, zoom: 11 },
  2: { lat: 13.1000, lng: 77.4500, zoom: 11 },
  3: { lat: 12.2958, lng: 76.6394, zoom: 11 },
  4: { lat: 12.8714, lng: 74.8430, zoom: 11 },
  5: { lat: 15.3647, lng: 75.1240, zoom: 12 },
  6: { lat: 15.8497, lng: 74.4977, zoom: 11 },
  7: { lat: 17.3297, lng: 76.8343, zoom: 11 },
  8: { lat: 15.1394, lng: 76.9214, zoom: 11 },
  9: { lat: 16.2120, lng: 77.3439, zoom: 11 },
  10: { lat: 13.3379, lng: 77.1173, zoom: 11 },
  11: { lat: 13.9299, lng: 75.5681, zoom: 11 },
  12: { lat: 14.4644, lng: 75.9218, zoom: 11 },
  13: { lat: 13.0073, lng: 76.1004, zoom: 11 },
  14: { lat: 12.5218, lng: 76.8951, zoom: 11 },
  15: { lat: 14.2226, lng: 76.3987, zoom: 11 },
  16: { lat: 13.1361, lng: 78.1292, zoom: 11 },
  17: { lat: 13.3161, lng: 75.7720, zoom: 11 },
  18: { lat: 13.3409, lng: 74.7421, zoom: 11 },
  19: { lat: 14.8182, lng: 74.1290, zoom: 10 },
  20: { lat: 17.9104, lng: 77.5199, zoom: 11 },
  21: { lat: 15.4315, lng: 75.6355, zoom: 11 },
  22: { lat: 14.7951, lng: 75.4044, zoom: 11 },
  23: { lat: 15.3547, lng: 76.1548, zoom: 11 },
  24: { lat: 16.1691, lng: 75.6615, zoom: 11 },
  25: { lat: 16.7700, lng: 77.1380, zoom: 11 },
  26: { lat: 11.9261, lng: 76.9437, zoom: 11 },
  27: { lat: 12.4244, lng: 75.7382, zoom: 11 },
  28: { lat: 12.7159, lng: 77.2810, zoom: 11 },
  29: { lat: 13.4355, lng: 77.7315, zoom: 11 },
  30: { lat: 16.8302, lng: 75.7100, zoom: 11 },
  31: { lat: 15.4589, lng: 75.0078, zoom: 12 },
};

export const caseViews = cases.map((item) => {
  const unit = unitMap[item.PoliceStationID] || null;
  const district = unit ? districtMap[unit.DistrictID] : null;
  const court = courtMap[item.CourtID] || null;
  const employee = employeeMap[item.PolicePersonID] || null;
  const majorHead = crimeHeadMap[item.CrimeMajorHeadID] || null;
  const minorHead = crimeSubHeadMap[item.CrimeMinorHeadID] || null;
  const occurrence = occurrenceByCase[item.CaseMasterID] || null;
  const complainants = complainantsByCase[item.CaseMasterID] || [];
  const victimRows = victimsByCase[item.CaseMasterID] || [];
  const accusedRows = accusedByCase[item.CaseMasterID] || [];
  const arrestRows = arrestsByCase[item.CaseMasterID] || [];
  const chargesheetRows = chargesheetsByCase[item.CaseMasterID] || [];
  const actSectionRows = actSectionsByCase[item.CaseMasterID] || [];

  return {
    ...item,
    occurrence,
    unit,
    district,
    court,
    employee,
    majorHead,
    minorHead,
    complainants,
    victims: victimRows,
    accused: accusedRows,
    arrests: arrestRows,
    chargesheets: chargesheetRows,
    actSections: actSectionRows.map((row) => ({
      ...row,
      act: actMap[row.ActID] || null,
      section: sectionMap[`${row.ActID}:${row.SectionID}`] || null,
    })),
    categoryName: caseCategoryMap[item.CaseCategoryID] || 'Unknown',
    gravityLabel: gravityMap[item.GravityOffenceID] || 'Unknown',
    statusName: caseStatusMap[item.CaseStatusID] || 'Unknown',
    majorHeadName: resolveCrimeMajorHead(
      item.CrimeMajorHeadID,
      majorHead?.CrimeGroupName,
      item.CrimeMinorHeadID,
      occurrence?.BriefFacts ?? item.BriefFacts
    ),
    minorHeadName: resolveCrimeMinorHead(
      item.CrimeMinorHeadID,
      item.CrimeMajorHeadID,
      minorHead?.CrimeHeadName,
      majorHead?.CrimeGroupName,
      occurrence?.BriefFacts ?? item.BriefFacts
    ),
    districtID: district?.DistrictID || null,
    districtName: district?.DistrictName || 'Unknown',
    policeStationName: unit?.UnitName || 'Unknown',
    courtName: court?.CourtName || 'Unassigned',
    officerName: employee ? `${employee.FirstName} (${employee.KGID})` : 'Unassigned',
    officerKGID: employee?.KGID || null,
    latitude: occurrence?.latitude ?? item.latitude,
    longitude: occurrence?.longitude ?? item.longitude,
    briefFacts: occurrence?.BriefFacts ?? item.BriefFacts,
    incidentFromDate: occurrence?.IncidentFromDate ?? item.IncidentFromDate,
    incidentToDate: occurrence?.IncidentToDate ?? item.IncidentToDate,
    infoReceivedPSDate: occurrence?.InfoReceivedPSDate ?? item.InfoReceivedPSDate,
    registeredDateObj: new Date(String(item.CrimeRegisteredDate).replace(' ', 'T')),
    incidentFromDateObj: item.IncidentFromDate ? new Date(String((occurrence?.IncidentFromDate ?? item.IncidentFromDate)).replace(' ', 'T')) : null,
    infoReceivedDateObj: item.InfoReceivedPSDate ? new Date(String((occurrence?.InfoReceivedPSDate ?? item.InfoReceivedPSDate)).replace(' ', 'T')) : null,
    isHeinous: item.GravityOffenceID === 1,
  };
});

export const caseViewsByDistrict = groupBy(caseViews, 'districtID');
export const caseViewsByStation = groupBy(caseViews, 'PoliceStationID');

function replaceArray(target, rows = []) {
  target.splice(0, target.length, ...rows);
}

function replaceIndex(target, rows, key) {
  Object.keys(target).forEach(existingKey => delete target[existingKey]);
  Object.assign(target, indexBy(rows, key));
}

function replaceValueIndex(target, rows, key, valueKey) {
  Object.keys(target).forEach(existingKey => delete target[existingKey]);
  rows.forEach(row => {
    const value = row[valueKey];
    if (row[key] !== undefined && row[key] !== null) target[String(row[key])] = value;
    if (row.ROWID !== undefined && row.ROWID !== null) target[String(row.ROWID)] = value;
  });
}

function catalystIds(rows = [], key) {
  return rows.map(row => ({
    ...row,
    [`Source${key}`]: row[key],
    [key]: String(row.ROWID || row[key]),
  }));
}

/** Replace sample-data exports in place so existing page imports see Catalyst data. */
export function hydrateCatalystSchema(caseRows, masters, tables) {
  replaceArray(caseViews, caseRows);
  replaceArray(cases, caseRows);
  Object.keys(caseViewsByDistrict).forEach(key => delete caseViewsByDistrict[key]);
  Object.assign(caseViewsByDistrict, groupBy(caseRows, 'districtID'));
  Object.keys(caseViewsByStation).forEach(key => delete caseViewsByStation[key]);
  Object.assign(caseViewsByStation, groupBy(caseRows, 'PoliceStationID'));
  replaceArray(districts, masters.districts);
  replaceArray(units, masters.stations);
  replaceArray(crimeHeads, masters.crimeHeads);
  replaceArray(crimeSubHeads, masters.crimeSubHeads);
  replaceArray(caseStatusMaster, masters.statuses);
  replaceArray(gravityOffences, masters.gravityOffences);
  replaceArray(caseCategories, masters.caseCategories);
  replaceArray(courts, masters.courts);
  replaceArray(employees, masters.employees);
  // Master collections are already normalised by dataService and retain their
  // safe catalog fallback when a Catalyst reference-table request is empty.
  replaceArray(states, masters.states);
  replaceArray(unitTypes, masters.unitTypes);
  replaceArray(ranks, masters.ranks);
  replaceArray(designations, masters.designations);
  replaceArray(casteMaster, masters.casteMaster);
  replaceArray(religionMaster, masters.religionMaster);
  replaceArray(occupationMaster, masters.occupationMaster);
  replaceArray(acts, masters.acts);
  replaceArray(sections, masters.sections);
  replaceArray(crimeHeadActSection, tables.CrimeHeadActSection);
  replaceArray(complainantDetails, tables.ComplainantDetails);
  replaceArray(actSectionAssociations, tables.ActSectionAssociation);
  replaceArray(victims, tables.Victim);
  replaceArray(accused, tables.Accused);
  replaceArray(arrests, tables.ArrestSurrender);
  replaceArray(chargesheetDetails, tables.ChargesheetDetails);
  replaceArray(policeStations, units);
  replaceArray(caseStatuses, caseStatusMaster);
  replaceArray(gravityOffenceMaster, gravityOffences);

  replaceIndex(districtMap, districts, 'DistrictID');
  replaceIndex(unitMap, units, 'UnitID');
  replaceIndex(crimeHeadMap, crimeHeads, 'CrimeHeadID');
  replaceIndex(crimeSubHeadMap, crimeSubHeads, 'CrimeSubHeadID');
  replaceValueIndex(caseStatusMap, caseStatusMaster, 'CaseStatusID', 'CaseStatusName');
  replaceValueIndex(gravityMap, gravityOffences, 'GravityOffenceID', 'LookupValue');
  replaceValueIndex(caseCategoryMap, caseCategories, 'CaseCategoryID', 'LookupValue');
  replaceIndex(courtMap, courts, 'CourtID');
  replaceIndex(employeeMap, employees, 'EmployeeID');
  replaceIndex(stateMap, states, 'StateID');
  replaceIndex(unitTypeMap, unitTypes, 'UnitTypeID');
  replaceIndex(rankMap, ranks, 'RankID');
  replaceIndex(designationMap, designations, 'DesignationID');
  replaceIndex(casteMap, casteMaster, 'caste_master_id');
  replaceIndex(religionMap, religionMaster, 'ReligionID');
  replaceIndex(occupationMap, occupationMaster, 'OccupationID');
  replaceIndex(actMap, acts, 'ActCode');

  const replaceGroups = (target, rows, key) => {
    Object.keys(target).forEach(existingKey => delete target[existingKey]);
    Object.assign(target, groupBy(rows, key));
  };
  replaceGroups(complainantsByCase, complainantDetails, 'CaseMasterID');
  replaceGroups(victimsByCase, victims, 'CaseMasterID');
  replaceGroups(accusedByCase, accused, 'CaseMasterID');
  replaceGroups(arrestsByCase, arrests, 'CaseMasterID');
  replaceGroups(chargesheetsByCase, chargesheetDetails, 'CaseMasterID');
  replaceGroups(actSectionsByCase, actSectionAssociations, 'CaseMasterID');
}

export function getAverageResponseHours(caseList) {
  let total = 0;
  let count = 0;
  caseList.forEach((item) => {
    if (!item.incidentFromDateObj || !item.infoReceivedDateObj) return;
    const hrs = Math.abs(item.infoReceivedDateObj - item.incidentFromDateObj) / 3600000;
    if (!Number.isNaN(hrs)) {
      total += hrs;
      count += 1;
    }
  });
  return count ? total / count : 0;
}

export function getMonthlyCounts(caseList, accessor = () => 1) {
  const counts = new Map();
  caseList.forEach((item) => {
    if (!item.registeredDateObj || Number.isNaN(item.registeredDateObj.getTime())) return;
    const key = `${item.registeredDateObj.getFullYear()}-${String(item.registeredDateObj.getMonth() + 1).padStart(2, '0')}`;
    counts.set(key, (counts.get(key) || 0) + accessor(item));
  });
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function getMonthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]} ${String(year).slice(2)}`;
}

export {
  states,
  districts,
  courts,
  units,
  unitTypes,
  ranks,
  designations,
  employees,
  casteMaster,
  religionMaster,
  occupationMaster,
  policeStations,
  crimeHeads,
  crimeSubHeads,
  crimeHeadActSection,
  caseCategories,
  gravityOffences,
  gravityOffenceMaster,
  caseStatuses,
  caseStatusMaster,
  acts,
  sections,
  cases,
  invOccuranceTime,
  complainantDetails,
  actSectionAssociations,
  victims,
  accused,
  arrests,
  chargesheetDetails,
  invArrestSurrenderAccused,
};
