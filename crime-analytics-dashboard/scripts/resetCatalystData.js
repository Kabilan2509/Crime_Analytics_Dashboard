/**
 * Replace the 26 Catalyst Data Store tables with the deterministic dashboard data.
 * Start `catalyst serve` with ENABLE_LOCAL_DATA_RESET=true only for the reset window.
 */
const fs = require('fs');
const vm = require('vm');
const babel = require('@babel/core');

const API = process.env.CATALYST_LOCAL_URL || 'http://localhost:3000/server/crime_api/api/local-reset';
const HEADERS = {
  'content-type': 'application/json',
  'x-crime-reset-confirmation': 'replace-local-dashboard-data'
};
const BATCH_SIZE = 100;

const TABLES = {
  State: ['states', 'StateID'], District: ['districts', 'DistrictID'],
  UnitType: ['unitTypes', 'UnitTypeID'], Unit: ['units', 'UnitID'],
  Court: ['courts', 'CourtID'], Rank: ['ranks', 'RankID'],
  Designation: ['designations', 'DesignationID'], Employee: ['employees', 'EmployeeID'],
  CasteMaster: ['casteMaster', 'caste_master_id'], ReligionMaster: ['religionMaster', 'ReligionID'],
  OccupationMaster: ['occupationMaster', 'OccupationID'], CrimeHead: ['crimeHeads', 'CrimeHeadID'],
  CrimeSubHead: ['crimeSubHeads', 'CrimeSubHeadID'], Act: ['acts', 'ActCode'],
  Section: ['sections', null], CrimeHeadActSection: ['crimeHeadActSection', null],
  CaseCategory: ['caseCategories', 'CaseCategoryID'], GravityOffence: ['gravityOffences', 'GravityOffenceID'],
  CaseStatusMaster: ['caseStatusMaster', 'CaseStatusID'], CaseMaster: ['cases', 'CaseMasterID'],
  ComplainantDetails: ['complainantDetails', 'ComplainantID'], Victim: ['victims', 'VictimMasterID'],
  Accused: ['accused', 'AccusedMasterID'], ArrestSurrender: ['arrests', 'ArrestSurrenderID'],
  ChargesheetDetails: ['chargesheetDetails', 'CSID'], ActSectionAssociation: ['actSectionAssociations', null]
};
const INSERT_ORDER = Object.keys(TABLES);
const DELETE_ORDER = [...INSERT_ORDER].reverse();
const ALLOWED = {
  State: 'StateID StateName NationalityID Active', District: 'DistrictID DistrictName StateID Active',
  UnitType: 'UnitTypeID UnitTypeName CityDistState Hierarchy Active', Unit: 'UnitID UnitName TypeID ParentUnit NationalityID StateID DistrictID Active',
  Court: 'CourtID CourtName DistrictID StateID Active', Rank: 'RankID RankName Hierarchy Active',
  Designation: 'DesignationID DesignationName Active SortOrder', Employee: 'EmployeeID DistrictID UnitID RankID DesignationID KGID FirstName EmployeeDOB GenderID BloodGroupID PhysicallyChallenged AppointmentDate',
  CasteMaster: 'caste_master_id caste_master_name', ReligionMaster: 'ReligionID ReligionName', OccupationMaster: 'OccupationID OccupationName',
  CrimeHead: 'CrimeHeadID CrimeGroupName Active', CrimeSubHead: 'CrimeSubHeadID CrimeHeadID CrimeHeadName SeqID',
  Act: 'ActCode ActDescription ShortName Active', Section: 'ActCode SectionCode SectionDescription Active', CrimeHeadActSection: 'CrimeHeadID ActCode SectionCode',
  CaseCategory: 'CaseCategoryID LookupValue', GravityOffence: 'GravityOffenceID LookupValue', CaseStatusMaster: 'CaseStatusID CaseStatusName',
  CaseMaster: 'CaseMasterID CrimeNo CaseNo CrimeRegisteredDate PolicePersonID PoliceStationID CaseCategoryID GravityOffenceID CrimeMajorHeadID CrimeMinorHeadID CaseStatusID CourtID IncidentFromDate IncidentToDate InfoReceivedPSDate latitude longitude BriefFacts',
  ComplainantDetails: 'ComplainantID CaseMasterID ComplainantName AgeYear OccupationID ReligionID CasteID GenderID',
  Victim: 'VictimMasterID CaseMasterID VictimName AgeYear GenderID VictimPolice', Accused: 'AccusedMasterID CaseMasterID AccusedName AgeYear GenderID PersonID',
  ArrestSurrender: 'ArrestSurrenderID CaseMasterID ArrestSurrenderTypeID ArrestSurrenderDate ArrestSurrenderStateId ArrestSurrenderDistrictId PoliceStationID IOID CourtID AccusedMasterID IsAccused IsComplainantAccused',
  ChargesheetDetails: 'CSID CaseMasterID csdate cstype PolicePersonID', ActSectionAssociation: 'CaseMasterID ActID SectionID ActOrderID SectionOrderID'
};
for (const key of Object.keys(ALLOWED)) ALLOWED[key] = new Set(ALLOWED[key].split(' '));

function loadData() {
  const source = fs.readFileSync(require.resolve('../src/data/sampleData.js'), 'utf8');
  const code = babel.transformSync(source, { plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require, console, Date, Math, Set, Map });
  return module.exports;
}
async function call(operation, table, rows) {
  const response = await fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify({ operation, table, rows }) });
  const result = await response.json();
  if (!response.ok) throw new Error(`${table}/${operation}: ${result.error || response.statusText}`);
  return result;
}
const maps = {};
const lookup = (table, id) => {
  if (id === null || id === undefined || id === '') return null;
  const value = maps[table]?.get(String(id));
  if (!value) throw new Error(`Missing ${table} lookup for local ID ${id}`);
  return value;
};
function transform(table, source) {
  const row = Object.fromEntries(Object.entries(source).filter(([key, value]) => ALLOWED[table].has(key) && value !== undefined));
  for (const field of ['Active', 'PhysicallyChallenged', 'IsAccused', 'IsComplainantAccused']) {
    if (Object.prototype.hasOwnProperty.call(row, field) && row[field] !== null) row[field] = Boolean(Number(row[field]));
  }
  if (Object.prototype.hasOwnProperty.call(row, 'GenderID')) {
    row.GenderID = ({ M: 1, F: 2, T: 3 })[row.GenderID] ?? Number(row.GenderID);
  }
  for (const field of ['IncidentFromDate', 'IncidentToDate', 'InfoReceivedPSDate']) {
    if (row[field] && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(row[field])) row[field] += ':00';
  }
  if (row.CrimeRegisteredDate) row.CrimeRegisteredDate = String(row.CrimeRegisteredDate).slice(0, 10);
  if (row.csdate && /^\d{4}-\d{2}-\d{2}$/.test(row.csdate)) row.csdate += ' 00:00:00';
  const fk = (field, parent) => { if (row[field] !== null && row[field] !== undefined && row[field] !== '') row[field] = lookup(parent, row[field]); };
  if (table === 'District') fk('StateID', 'State');
  if (table === 'Unit') { fk('TypeID', 'UnitType'); fk('StateID', 'State'); fk('DistrictID', 'District'); if (row.ParentUnit) fk('ParentUnit', 'Unit'); }
  if (table === 'Court') { fk('StateID', 'State'); fk('DistrictID', 'District'); }
  if (table === 'Employee') { fk('DistrictID', 'District'); fk('UnitID', 'Unit'); fk('RankID', 'Rank'); fk('DesignationID', 'Designation'); }
  if (table === 'CrimeSubHead') fk('CrimeHeadID', 'CrimeHead');
  if (table === 'Section') fk('ActCode', 'Act');
  if (table === 'CrimeHeadActSection') { fk('CrimeHeadID', 'CrimeHead'); fk('ActCode', 'Act'); }
  if (table === 'CaseMaster') { fk('PolicePersonID', 'Employee'); fk('PoliceStationID', 'Unit'); fk('CaseCategoryID', 'CaseCategory'); fk('GravityOffenceID', 'GravityOffence'); fk('CrimeMajorHeadID', 'CrimeHead'); fk('CrimeMinorHeadID', 'CrimeSubHead'); fk('CaseStatusID', 'CaseStatusMaster'); fk('CourtID', 'Court'); }
  if (['ComplainantDetails','Victim','Accused','ArrestSurrender','ChargesheetDetails','ActSectionAssociation'].includes(table)) fk('CaseMasterID', 'CaseMaster');
  if (table === 'ComplainantDetails') { fk('OccupationID','OccupationMaster'); fk('ReligionID','ReligionMaster'); fk('CasteID','CasteMaster'); }
  if (table === 'ArrestSurrender') { fk('ArrestSurrenderStateId','State'); fk('ArrestSurrenderDistrictId','District'); fk('PoliceStationID','Unit'); fk('IOID','Employee'); fk('CourtID','Court'); fk('AccusedMasterID','Accused'); }
  if (table === 'ChargesheetDetails') fk('PolicePersonID','Employee');
  if (table === 'ActSectionAssociation') { const act = source.ActID; fk('ActID','Act'); row.SectionID = lookup('Section', `${act}|${source.SectionID}`); }
  return row;
}

async function main() {
  const data = loadData();
  console.log('Source:', INSERT_ORDER.map(t => `${t}=${data[TABLES[t][0]].length}`).join(', '));
  // Resolve every relationship before deleting anything. Fake ROWIDs are enough for this pass.
  for (const table of INSERT_ORDER) {
    const [sourceName, idField] = TABLES[table];
    maps[table] = new Map();
    data[sourceName].forEach((row, index) => {
      const key = table === 'Section' ? `${row.ActCode}|${row.SectionCode}` : idField ? row[idField] : null;
      if (key !== null) maps[table].set(String(key), `preflight-${table}-${index + 1}`);
    });
    data[sourceName].forEach(row => transform(table, row));
  }
  for (const table of INSERT_ORDER) maps[table] = new Map();
  console.log('All local foreign-key relationships validated.');
  if (!process.argv.includes('--execute')) { console.log('Validation complete. Re-run with --execute to replace Catalyst rows.'); return; }
  for (const table of DELETE_ORDER) { let total=0, n; do { n=(await call('delete-next',table)).deleted; total+=n; } while(n); console.log(`Deleted ${table}: ${total}`); }
  for (const table of INSERT_ORDER) {
    const [sourceName, idField] = TABLES[table]; const rows = data[sourceName]; maps[table] = new Map();
    for (let i=0;i<rows.length;i+=BATCH_SIZE) {
      const sourceBatch=rows.slice(i,i+BATCH_SIZE); const result=await call('insert',table,sourceBatch.map(r=>transform(table,r)));
      result.rows.forEach((saved,j) => { const key = table === 'Section' ? `${sourceBatch[j].ActCode}|${sourceBatch[j].SectionCode}` : idField ? sourceBatch[j][idField] : null; if(key!==null) maps[table].set(String(key),String(saved.ROWID)); });
    }
    const count=(await call('count',table)).total; if(count!==rows.length) throw new Error(`${table}: expected ${rows.length}, found ${count}`); console.log(`Inserted ${table}: ${count}`);
  }
  console.log('Catalyst reset completed and all 26 table counts verified.');
}
main().catch(err => { console.error(err); process.exitCode=1; });
