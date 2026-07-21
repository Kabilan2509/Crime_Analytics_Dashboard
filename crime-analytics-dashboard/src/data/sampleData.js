// ============================================================================
// KSP Crime Analytics Dashboard - Sample Data
// Matches Karnataka State Police FIR Database Schema
// ============================================================================

// ---------------------------------------------------------------------------
// Seeded Random Number Generator (for consistent, reproducible data)
// ---------------------------------------------------------------------------
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seededRandom(42);

// Helper: pick random element from array
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// Helper: weighted random pick — weights is an array of { value, weight }
function weightedPick(items) {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

// Helper: random int in [min, max]
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

// Helper: random date between two dates
function randomDate(start, end) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + rand() * (e - s));
}

// Helper: format date as YYYY-MM-DD
function fmt(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper: format date-time as YYYY-MM-DD HH:MM
function fmtTime(date) {
  const d = new Date(date);
  // Bias toward evening / night (6 PM – 2 AM) for ~60 % of records
  let hour;
  if (rand() < 0.6) {
    hour = randInt(18, 25) % 24; // 18-23 or 0-1
  } else {
    hour = randInt(6, 17);
  }
  const min = randInt(0, 59);
  return `${fmt(d)} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// 1. Districts (All 31 Karnataka Districts)
// ---------------------------------------------------------------------------
const districtNames = [
  'Bengaluru Urban', 'Bengaluru Rural', 'Mysuru',
  'Dakshina Kannada', 'Dharwad', 'Belagavi',
  'Kalaburagi', 'Ballari', 'Raichur', 'Tumakuru',
  'Shivamogga', 'Davanagere', 'Hassan', 'Mandya',
  'Chitradurga', 'Kolar', 'Chikkamagaluru', 'Udupi',
  'Uttara Kannada', 'Bidar', 'Gadag', 'Haveri',
  'Koppal', 'Bagalkot', 'Yadgir', 'Chamarajanagar',
  'Kodagu', 'Ramanagara', 'Chikkaballapura', 'Vijayapura', 'Vijayanagara'
];

const districts = districtNames.map((name, i) => ({
  DistrictID: i + 1,
  DistrictName: name,
  StateID: 1,
  Active: 1
}));

// ---------------------------------------------------------------------------
// 2. Police Stations (Units) — 60 realistic stations
// ---------------------------------------------------------------------------
const stationDefs = [
  // Bengaluru Urban (DistrictID 1) — 15 stations
  { name: 'Cubbon Park PS', districtID: 1 },
  { name: 'Whitefield PS', districtID: 1 },
  { name: 'Indiranagar PS', districtID: 1 },
  { name: 'Jayanagar PS', districtID: 1 },
  { name: 'Koramangala PS', districtID: 1 },
  { name: 'Electronic City PS', districtID: 1 },
  { name: 'Yelahanka PS', districtID: 1 },
  { name: 'Marathahalli PS', districtID: 1 },
  { name: 'HSR Layout PS', districtID: 1 },
  { name: 'BTM Layout PS', districtID: 1 },
  { name: 'Vijayanagar PS', districtID: 1 },
  { name: 'Peenya PS', districtID: 1 },
  { name: 'Yeshwanthpur PS', districtID: 1 },
  { name: 'Rajajinagar PS', districtID: 1 },
  { name: 'Basavanagudi PS', districtID: 1 },
  // Bengaluru Rural (DistrictID 2) — 3 stations
  { name: 'Devanahalli PS', districtID: 2 },
  { name: 'Nelamangala PS', districtID: 2 },
  { name: 'Hosakote PS', districtID: 2 },
  // Mysuru (DistrictID 3) — 4 stations
  { name: 'Mysuru North PS', districtID: 3 },
  { name: 'Mysuru South PS', districtID: 3 },
  { name: 'Nanjangud PS', districtID: 3 },
  { name: 'T. Narasipura PS', districtID: 3 },
  // Mangaluru (DistrictID 4) — 3 stations
  { name: 'Mangaluru North PS', districtID: 4 },
  { name: 'Mangaluru South PS', districtID: 4 },
  { name: 'Puttur PS', districtID: 4 },
  // Hubli-Dharwad (DistrictID 5) — 3 stations
  { name: 'Hubli PS', districtID: 5 },
  { name: 'Dharwad PS', districtID: 5 },
  { name: 'Keshwapur PS', districtID: 5 },
  // Belagavi (DistrictID 6) — 3 stations
  { name: 'Belagavi City PS', districtID: 6 },
  { name: 'Belagavi Market PS', districtID: 6 },
  { name: 'Gokak PS', districtID: 6 },
  // Kalaburagi (DistrictID 7) — 2 stations
  { name: 'Kalaburagi PS', districtID: 7 },
  { name: 'Kalaburagi Rural PS', districtID: 7 },
  // Ballari (DistrictID 8) — 2 stations
  { name: 'Ballari City PS', districtID: 8 },
  { name: 'Hospet PS', districtID: 8 },
  // Raichur (DistrictID 9) — 2 stations
  { name: 'Raichur City PS', districtID: 9 },
  { name: 'Sindhanur PS', districtID: 9 },
  // Tumakuru (DistrictID 10) — 2 stations
  { name: 'Tumakuru City PS', districtID: 10 },
  { name: 'Sira PS', districtID: 10 },
  // Shivamogga (DistrictID 11) — 2 stations
  { name: 'Shivamogga City PS', districtID: 11 },
  { name: 'Bhadravati PS', districtID: 11 },
  // Davanagere (DistrictID 12) — 2 stations
  { name: 'Davanagere City PS', districtID: 12 },
  { name: 'Harihar PS', districtID: 12 },
  // Hassan (DistrictID 13) — 1 station
  { name: 'Hassan City PS', districtID: 13 },
  // Mandya (DistrictID 14) — 1 station
  { name: 'Mandya City PS', districtID: 14 },
  // Chitradurga (DistrictID 15) — 1 station
  { name: 'Chitradurga PS', districtID: 15 },
  // Kolar (DistrictID 16) — 1 station
  { name: 'Kolar PS', districtID: 16 },
  // Chikkamagaluru (DistrictID 17) — 1 station
  { name: 'Chikkamagaluru PS', districtID: 17 },
  // Udupi (DistrictID 18) — 1 station
  { name: 'Udupi PS', districtID: 18 },
  // Uttara Kannada (DistrictID 19) — 1 station
  { name: 'Karwar PS', districtID: 19 },
  // Bidar (DistrictID 20) — 1 station
  { name: 'Bidar PS', districtID: 20 },
  // Gadag (DistrictID 21) — 1 station
  { name: 'Gadag PS', districtID: 21 },
  // Haveri (DistrictID 22) — 1 station
  { name: 'Haveri PS', districtID: 22 },
  // Koppal (DistrictID 23) — 1 station
  { name: 'Koppal PS', districtID: 23 },
  // Bagalkot (DistrictID 24) — 1 station
  { name: 'Bagalkot PS', districtID: 24 },
  // Yadgir (DistrictID 25) — 1 station
  { name: 'Yadgir PS', districtID: 25 },
  // Chamarajanagar (DistrictID 26) — 1 station
  { name: 'Chamarajanagar PS', districtID: 26 },
  // Kodagu (DistrictID 27) — 1 station
  { name: 'Madikeri PS', districtID: 27 },
  // Ramanagara (DistrictID 28) — 1 station
  { name: 'Ramanagara PS', districtID: 28 },
  // Chikkaballapura (DistrictID 29) — 1 station
  { name: 'Chikkaballapura PS', districtID: 29 },
  // Vijayapura (DistrictID 30) — 1 station
  { name: 'Vijayapura PS', districtID: 30 },
  // Dharwad (DistrictID 31) — 1 station
  { name: 'Vijayanagara PS', districtID: 31 },
];

const policeStations = stationDefs.map((s, i) => ({
  UnitID: i + 1,
  UnitName: s.name,
  TypeID: 1,
  DistrictID: s.districtID,
  StateID: 1,
  Active: 1
}));

// ---------------------------------------------------------------------------
// 3. Crime Heads (Major Crime Categories)
// ---------------------------------------------------------------------------
const crimeHeads = [
  { CrimeHeadID: 1, CrimeGroupName: 'Crimes Against Body', Active: 1 },
  { CrimeHeadID: 2, CrimeGroupName: 'Crimes Against Property', Active: 1 },
  { CrimeHeadID: 3, CrimeGroupName: 'Crimes Against Women', Active: 1 },
  { CrimeHeadID: 4, CrimeGroupName: 'Crimes Against Children', Active: 1 },
  { CrimeHeadID: 5, CrimeGroupName: 'Cyber Crimes', Active: 1 },
  { CrimeHeadID: 6, CrimeGroupName: 'Economic Offences', Active: 1 },
  { CrimeHeadID: 7, CrimeGroupName: 'Narcotics', Active: 1 },
  { CrimeHeadID: 8, CrimeGroupName: 'Crimes Against Public Order', Active: 1 },
  { CrimeHeadID: 9, CrimeGroupName: 'Arms Act Cases', Active: 1 },
  { CrimeHeadID: 10, CrimeGroupName: 'Crimes Against SC/ST', Active: 1 },
];

// ---------------------------------------------------------------------------
// 4. Crime Sub-Heads (Minor Categories under each Head)
// ---------------------------------------------------------------------------
const crimeSubHeads = [
  // Crimes Against Body (CrimeHeadID: 1)
  { CrimeSubHeadID: 1, CrimeHeadID: 1, CrimeHeadName: 'Murder', SeqID: 1 },
  { CrimeSubHeadID: 2, CrimeHeadID: 1, CrimeHeadName: 'Attempt to Murder', SeqID: 2 },
  { CrimeSubHeadID: 3, CrimeHeadID: 1, CrimeHeadName: 'Culpable Homicide', SeqID: 3 },
  { CrimeSubHeadID: 4, CrimeHeadID: 1, CrimeHeadName: 'Kidnapping', SeqID: 4 },
  { CrimeSubHeadID: 5, CrimeHeadID: 1, CrimeHeadName: 'Assault', SeqID: 5 },
  { CrimeSubHeadID: 6, CrimeHeadID: 1, CrimeHeadName: 'Grievous Hurt', SeqID: 6 },

  // Crimes Against Property (CrimeHeadID: 2)
  { CrimeSubHeadID: 7, CrimeHeadID: 2, CrimeHeadName: 'Robbery', SeqID: 1 },
  { CrimeSubHeadID: 8, CrimeHeadID: 2, CrimeHeadName: 'Dacoity', SeqID: 2 },
  { CrimeSubHeadID: 9, CrimeHeadID: 2, CrimeHeadName: 'Burglary', SeqID: 3 },
  { CrimeSubHeadID: 10, CrimeHeadID: 2, CrimeHeadName: 'Theft', SeqID: 4 },
  { CrimeSubHeadID: 11, CrimeHeadID: 2, CrimeHeadName: 'Motor Vehicle Theft', SeqID: 5 },
  { CrimeSubHeadID: 12, CrimeHeadID: 2, CrimeHeadName: 'Chain Snatching', SeqID: 6 },

  // Crimes Against Women (CrimeHeadID: 3)
  { CrimeSubHeadID: 13, CrimeHeadID: 3, CrimeHeadName: 'Dowry Death', SeqID: 1 },
  { CrimeSubHeadID: 14, CrimeHeadID: 3, CrimeHeadName: 'Cruelty by Husband', SeqID: 2 },
  { CrimeSubHeadID: 15, CrimeHeadID: 3, CrimeHeadName: 'Sexual Assault', SeqID: 3 },
  { CrimeSubHeadID: 16, CrimeHeadID: 3, CrimeHeadName: 'Stalking', SeqID: 4 },
  { CrimeSubHeadID: 17, CrimeHeadID: 3, CrimeHeadName: 'Molestation', SeqID: 5 },

  // Crimes Against Children (CrimeHeadID: 4)
  { CrimeSubHeadID: 18, CrimeHeadID: 4, CrimeHeadName: 'Child Abuse', SeqID: 1 },
  { CrimeSubHeadID: 19, CrimeHeadID: 4, CrimeHeadName: 'Child Labour', SeqID: 2 },
  { CrimeSubHeadID: 20, CrimeHeadID: 4, CrimeHeadName: 'POCSO Cases', SeqID: 3 },
  { CrimeSubHeadID: 21, CrimeHeadID: 4, CrimeHeadName: 'Child Trafficking', SeqID: 4 },
  { CrimeSubHeadID: 22, CrimeHeadID: 4, CrimeHeadName: 'Missing Children', SeqID: 5 },

  // Cyber Crimes (CrimeHeadID: 5)
  { CrimeSubHeadID: 23, CrimeHeadID: 5, CrimeHeadName: 'Online Fraud', SeqID: 1 },
  { CrimeSubHeadID: 24, CrimeHeadID: 5, CrimeHeadName: 'Identity Theft', SeqID: 2 },
  { CrimeSubHeadID: 25, CrimeHeadID: 5, CrimeHeadName: 'Cyberbullying', SeqID: 3 },
  { CrimeSubHeadID: 26, CrimeHeadID: 5, CrimeHeadName: 'Hacking', SeqID: 4 },
  { CrimeSubHeadID: 27, CrimeHeadID: 5, CrimeHeadName: 'Social Media Crime', SeqID: 5 },

  // Economic Offences (CrimeHeadID: 6)
  { CrimeSubHeadID: 28, CrimeHeadID: 6, CrimeHeadName: 'Cheating', SeqID: 1 },
  { CrimeSubHeadID: 29, CrimeHeadID: 6, CrimeHeadName: 'Forgery', SeqID: 2 },
  { CrimeSubHeadID: 30, CrimeHeadID: 6, CrimeHeadName: 'Counterfeiting', SeqID: 3 },
  { CrimeSubHeadID: 31, CrimeHeadID: 6, CrimeHeadName: 'Bank Fraud', SeqID: 4 },
  { CrimeSubHeadID: 32, CrimeHeadID: 6, CrimeHeadName: 'Property Fraud', SeqID: 5 },

  // Narcotics (CrimeHeadID: 7)
  { CrimeSubHeadID: 33, CrimeHeadID: 7, CrimeHeadName: 'Ganja', SeqID: 1 },
  { CrimeSubHeadID: 34, CrimeHeadID: 7, CrimeHeadName: 'Cocaine', SeqID: 2 },
  { CrimeSubHeadID: 35, CrimeHeadID: 7, CrimeHeadName: 'NDPS Act Violation', SeqID: 3 },
  { CrimeSubHeadID: 36, CrimeHeadID: 7, CrimeHeadName: 'Drug Trafficking', SeqID: 4 },
  { CrimeSubHeadID: 37, CrimeHeadID: 7, CrimeHeadName: 'Drug Consumption', SeqID: 5 },

  // Crimes Against Public Order (CrimeHeadID: 8)
  { CrimeSubHeadID: 38, CrimeHeadID: 8, CrimeHeadName: 'Rioting', SeqID: 1 },
  { CrimeSubHeadID: 39, CrimeHeadID: 8, CrimeHeadName: 'Unlawful Assembly', SeqID: 2 },
  { CrimeSubHeadID: 40, CrimeHeadID: 8, CrimeHeadName: 'Affray', SeqID: 3 },
  { CrimeSubHeadID: 41, CrimeHeadID: 8, CrimeHeadName: 'Public Nuisance', SeqID: 4 },
  { CrimeSubHeadID: 42, CrimeHeadID: 8, CrimeHeadName: 'Criminal Intimidation', SeqID: 5 },

  // Arms Act Cases (CrimeHeadID: 9)
  { CrimeSubHeadID: 43, CrimeHeadID: 9, CrimeHeadName: 'Illegal Possession of Arms', SeqID: 1 },
  { CrimeSubHeadID: 44, CrimeHeadID: 9, CrimeHeadName: 'Arms Trafficking', SeqID: 2 },
  { CrimeSubHeadID: 45, CrimeHeadID: 9, CrimeHeadName: 'Illegal Manufacturing', SeqID: 3 },
  { CrimeSubHeadID: 46, CrimeHeadID: 9, CrimeHeadName: 'Using Illegal Arms', SeqID: 4 },

  // Crimes Against SC/ST (CrimeHeadID: 10)
  { CrimeSubHeadID: 47, CrimeHeadID: 10, CrimeHeadName: 'Atrocity Against SC', SeqID: 1 },
  { CrimeSubHeadID: 48, CrimeHeadID: 10, CrimeHeadName: 'Atrocity Against ST', SeqID: 2 },
  { CrimeSubHeadID: 49, CrimeHeadID: 10, CrimeHeadName: 'Denial of Rights', SeqID: 3 },
  { CrimeSubHeadID: 50, CrimeHeadID: 10, CrimeHeadName: 'Caste-based Discrimination', SeqID: 4 },
];

// Build lookup: CrimeHeadID → array of CrimeSubHeadIDs
const subHeadsByHead = {};
crimeSubHeads.forEach((sh) => {
  if (!subHeadsByHead[sh.CrimeHeadID]) subHeadsByHead[sh.CrimeHeadID] = [];
  subHeadsByHead[sh.CrimeHeadID].push(sh.CrimeSubHeadID);
});

// ---------------------------------------------------------------------------
// 5. Case Categories
// ---------------------------------------------------------------------------
const caseCategories = [
  { CaseCategoryID: 1, LookupValue: 'FIR' },
  { CaseCategoryID: 2, LookupValue: 'NCR' },
  { CaseCategoryID: 3, LookupValue: 'UDR' },
  { CaseCategoryID: 4, LookupValue: 'PAR' },
  { CaseCategoryID: 5, LookupValue: 'Zero FIR' },
];

// ---------------------------------------------------------------------------
// 6. Gravity Offences
// ---------------------------------------------------------------------------
const gravityOffences = [
  { GravityOffenceID: 1, LookupValue: 'Heinous' },
  { GravityOffenceID: 2, LookupValue: 'Non-Heinous' },
];

// ---------------------------------------------------------------------------
// 7. Case Statuses
// ---------------------------------------------------------------------------
const caseStatuses = [
  { CaseStatusID: 1, CaseStatusName: 'Under Investigation' },
  { CaseStatusID: 2, CaseStatusName: 'Charge Sheeted' },
  { CaseStatusID: 3, CaseStatusName: 'Closed' },
  { CaseStatusID: 4, CaseStatusName: 'Undetected' },
  { CaseStatusID: 5, CaseStatusName: 'Pending Trial' },
  { CaseStatusID: 6, CaseStatusName: 'Convicted' },
  { CaseStatusID: 7, CaseStatusName: 'Acquitted' },
];

// ---------------------------------------------------------------------------
// 8. Acts
// ---------------------------------------------------------------------------
const acts = [
  { ActCode: 'IPC', ActDescription: 'Indian Penal Code / Bharatiya Nyaya Sanhita', ShortName: 'IPC/BNS', Active: 1 },
  { ActCode: 'CrPC', ActDescription: 'Code of Criminal Procedure / Bharatiya Nagarik Suraksha Sanhita', ShortName: 'CrPC/BNSS', Active: 1 },
  { ActCode: 'NDPS', ActDescription: 'Narcotic Drugs and Psychotropic Substances Act', ShortName: 'NDPS', Active: 1 },
  { ActCode: 'POCSO', ActDescription: 'Protection of Children from Sexual Offences Act', ShortName: 'POCSO', Active: 1 },
  { ActCode: 'IT', ActDescription: 'Information Technology Act, 2000', ShortName: 'IT Act', Active: 1 },
  { ActCode: 'SCST', ActDescription: 'Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act', ShortName: 'SC/ST Act', Active: 1 },
  { ActCode: 'ARMS', ActDescription: 'Arms Act, 1959', ShortName: 'Arms Act', Active: 1 },
  { ActCode: 'DPA', ActDescription: 'Dowry Prohibition Act, 1961', ShortName: 'Dowry Prohibition Act', Active: 1 },
  { ActCode: 'KPA', ActDescription: 'Karnataka Police Act, 1963', ShortName: 'Karnataka Police Act', Active: 1 },
  { ActCode: 'MVA', ActDescription: 'Motor Vehicles Act, 1988', ShortName: 'Motor Vehicles Act', Active: 1 },
];

// ---------------------------------------------------------------------------
// 9. Sections
// ---------------------------------------------------------------------------
const sections = [
  // IPC Sections
  { ActCode: 'IPC', SectionCode: '302', SectionDescription: 'Murder', Active: 1 },
  { ActCode: 'IPC', SectionCode: '307', SectionDescription: 'Attempt to Murder', Active: 1 },
  { ActCode: 'IPC', SectionCode: '304', SectionDescription: 'Culpable Homicide not amounting to Murder', Active: 1 },
  { ActCode: 'IPC', SectionCode: '304B', SectionDescription: 'Dowry Death', Active: 1 },
  { ActCode: 'IPC', SectionCode: '363', SectionDescription: 'Kidnapping', Active: 1 },
  { ActCode: 'IPC', SectionCode: '376', SectionDescription: 'Sexual Assault', Active: 1 },
  { ActCode: 'IPC', SectionCode: '420', SectionDescription: 'Cheating and dishonestly inducing delivery of property', Active: 1 },
  { ActCode: 'IPC', SectionCode: '498A', SectionDescription: 'Cruelty by Husband or Relatives of Husband', Active: 1 },
  { ActCode: 'IPC', SectionCode: '354', SectionDescription: 'Assault or Criminal Force to Woman with intent to Outrage Modesty', Active: 1 },
  { ActCode: 'IPC', SectionCode: '379', SectionDescription: 'Theft', Active: 1 },
  { ActCode: 'IPC', SectionCode: '392', SectionDescription: 'Robbery', Active: 1 },
  { ActCode: 'IPC', SectionCode: '395', SectionDescription: 'Dacoity', Active: 1 },
  { ActCode: 'IPC', SectionCode: '457', SectionDescription: 'Lurking House-trespass or House-breaking by night', Active: 1 },
  { ActCode: 'IPC', SectionCode: '323', SectionDescription: 'Voluntarily Causing Hurt', Active: 1 },
  { ActCode: 'IPC', SectionCode: '324', SectionDescription: 'Voluntarily Causing Hurt by Dangerous Weapon', Active: 1 },
  { ActCode: 'IPC', SectionCode: '326', SectionDescription: 'Voluntarily Causing Grievous Hurt by Dangerous Weapon', Active: 1 },
  { ActCode: 'IPC', SectionCode: '506', SectionDescription: 'Criminal Intimidation', Active: 1 },
  { ActCode: 'IPC', SectionCode: '509', SectionDescription: 'Word, Gesture or Act intended to insult Modesty of a Woman', Active: 1 },
  { ActCode: 'IPC', SectionCode: '34', SectionDescription: 'Acts done by several persons in furtherance of Common Intention', Active: 1 },
  { ActCode: 'IPC', SectionCode: '147', SectionDescription: 'Rioting', Active: 1 },
  { ActCode: 'IPC', SectionCode: '148', SectionDescription: 'Rioting armed with Deadly Weapon', Active: 1 },
  { ActCode: 'IPC', SectionCode: '341', SectionDescription: 'Wrongful Restraint', Active: 1 },
  { ActCode: 'IPC', SectionCode: '354A', SectionDescription: 'Sexual Harassment', Active: 1 },
  { ActCode: 'IPC', SectionCode: '354D', SectionDescription: 'Stalking', Active: 1 },
  { ActCode: 'IPC', SectionCode: '468', SectionDescription: 'Forgery for purpose of Cheating', Active: 1 },
  { ActCode: 'IPC', SectionCode: '471', SectionDescription: 'Using a forged document as genuine', Active: 1 },
  { ActCode: 'IPC', SectionCode: '489A', SectionDescription: 'Counterfeiting Currency Notes', Active: 1 },

  // NDPS Sections
  { ActCode: 'NDPS', SectionCode: '20', SectionDescription: 'Punishment for contravention involving Cannabis plant and Cannabis', Active: 1 },
  { ActCode: 'NDPS', SectionCode: '21', SectionDescription: 'Punishment for contravention involving Manufactured Drugs', Active: 1 },
  { ActCode: 'NDPS', SectionCode: '22', SectionDescription: 'Punishment for contravention involving Psychotropic Substances', Active: 1 },
  { ActCode: 'NDPS', SectionCode: '27', SectionDescription: 'Punishment for consumption of any Narcotic Drug or Psychotropic Substance', Active: 1 },
  { ActCode: 'NDPS', SectionCode: '29', SectionDescription: 'Punishment for abetment and Criminal Conspiracy in Drug Trafficking', Active: 1 },

  // IT Act Sections
  { ActCode: 'IT', SectionCode: '66C', SectionDescription: 'Identity Theft', Active: 1 },
  { ActCode: 'IT', SectionCode: '66D', SectionDescription: 'Cheating by Personation using Computer Resource', Active: 1 },
  { ActCode: 'IT', SectionCode: '67', SectionDescription: 'Publishing or Transmitting Obscene Material in Electronic Form', Active: 1 },
  { ActCode: 'IT', SectionCode: '66', SectionDescription: 'Computer Related Offences — Hacking', Active: 1 },
  { ActCode: 'IT', SectionCode: '66E', SectionDescription: 'Punishment for violation of Privacy', Active: 1 },

  // POCSO Sections
  { ActCode: 'POCSO', SectionCode: '4', SectionDescription: 'Punishment for Penetrative Sexual Assault', Active: 1 },
  { ActCode: 'POCSO', SectionCode: '6', SectionDescription: 'Punishment for Aggravated Penetrative Sexual Assault', Active: 1 },
  { ActCode: 'POCSO', SectionCode: '8', SectionDescription: 'Punishment for Sexual Assault', Active: 1 },
  { ActCode: 'POCSO', SectionCode: '10', SectionDescription: 'Punishment for Aggravated Sexual Assault', Active: 1 },
  { ActCode: 'POCSO', SectionCode: '12', SectionDescription: 'Punishment for Sexual Harassment', Active: 1 },

  // SC/ST Act
  { ActCode: 'SCST', SectionCode: '3(1)', SectionDescription: 'Offences of Atrocities', Active: 1 },
  { ActCode: 'SCST', SectionCode: '3(2)', SectionDescription: 'Offences of Atrocities — Denial of Rights', Active: 1 },

  // Arms Act
  { ActCode: 'ARMS', SectionCode: '25', SectionDescription: 'Punishment for certain offences — Illegal Possession', Active: 1 },
  { ActCode: 'ARMS', SectionCode: '27', SectionDescription: 'Using Arms — Punishment', Active: 1 },

  // Dowry Prohibition Act
  { ActCode: 'DPA', SectionCode: '3', SectionDescription: 'Penalty for giving or taking Dowry', Active: 1 },
  { ActCode: 'DPA', SectionCode: '4', SectionDescription: 'Penalty for demanding Dowry', Active: 1 },

  // Karnataka Police Act
  { ActCode: 'KPA', SectionCode: '86', SectionDescription: 'Disobedience of Order of Police', Active: 1 },
  { ActCode: 'KPA', SectionCode: '95', SectionDescription: 'Public Nuisance', Active: 1 },

  // Motor Vehicles Act
  { ActCode: 'MVA', SectionCode: '184', SectionDescription: 'Driving dangerously', Active: 1 },
  { ActCode: 'MVA', SectionCode: '185', SectionDescription: 'Driving under influence of Alcohol/Drugs', Active: 1 },
];

// ---------------------------------------------------------------------------
// Realistic Indian names pools
// ---------------------------------------------------------------------------
const maleFirstNames = [
  'Rajesh', 'Suresh', 'Mahesh', 'Ramesh', 'Ganesh', 'Prakash', 'Venkatesh',
  'Anil', 'Sunil', 'Ravi', 'Vijay', 'Ajay', 'Sanjay', 'Kumar', 'Naveen',
  'Manoj', 'Deepak', 'Vinod', 'Ashok', 'Santosh', 'Manjunath', 'Basavaraj',
  'Siddharth', 'Arjun', 'Karthik', 'Vishwanath', 'Shivaraj', 'Hanumanthappa',
  'Girish', 'Harish', 'Nagaraj', 'Jagadish', 'Lokesh', 'Shivakumar',
  'Mohan', 'Srinivas', 'Chandrashekar', 'Pradeep', 'Umesh', 'Dinesh',
  'Madhu', 'Gopal', 'Raju', 'Ramanna', 'Veerappa', 'Ningappa', 'Mallappa',
  'Irfan', 'Mohammed', 'Abdul', 'Syed', 'Ahmed', 'Farhan', 'Imran',
  'Joseph', 'Anthony', 'David', 'Michael', 'Thomas'
];

const femaleFirstNames = [
  'Lakshmi', 'Savitri', 'Radha', 'Geetha', 'Anita', 'Sunita', 'Kavitha',
  'Pushpa', 'Manjula', 'Shobha', 'Roopa', 'Rekha', 'Suma', 'Uma',
  'Priya', 'Divya', 'Swathi', 'Pooja', 'Deepa', 'Meena', 'Rashmi',
  'Asha', 'Nandini', 'Padma', 'Bhagya', 'Shilpa', 'Sowmya', 'Vidya',
  'Sharada', 'Jayamma', 'Parvathi', 'Kamala', 'Sarojini', 'Indira',
  'Fathima', 'Ayesha', 'Shabana', 'Zainab', 'Mary', 'Grace'
];

const lastNames = [
  'Gowda', 'Reddy', 'Nayak', 'Shetty', 'Rao', 'Patil', 'Desai',
  'Kulkarni', 'Hegde', 'Bhat', 'Joshi', 'Naik', 'Swamy', 'Murthy',
  'Acharya', 'Poojary', 'Bangera', 'Devadiga', 'Shenoy', 'Kamath',
  'Hiremath', 'Goudar', 'Hadimani', 'Kambali', 'Angadi', 'Hoogar',
  'Bijjal', 'Basappa', 'Madar', 'Nandeppanavar', 'Kumar', 'Singh',
  'Sharma', 'Verma', 'Gupta', 'Khan', 'Pasha', 'Hussain', 'Shaikh',
  'D\'Souza', 'Fernandes', 'Lobo', 'Sequeira'
];

function randomMaleName() {
  return pick(maleFirstNames) + ' ' + pick(lastNames);
}
function randomFemaleName() {
  return pick(femaleFirstNames) + ' ' + pick(lastNames);
}
function randomName(gender) {
  if (gender === 'F') return randomFemaleName();
  return randomMaleName();
}

function buildProtectedAlias(prefix, id) {
  return `${prefix}-${String(id).padStart(5, '0')}`;
}

function buildOfficerCallsign(id, unitID, seedName) {
  const prefix = seedName?.charAt(0)?.toUpperCase() || 'O';
  return `Officer-${prefix}${String(unitID).padStart(3, '0')}-${String(id).padStart(4, '0')}`;
}

// ---------------------------------------------------------------------------
// Brief facts templates
// ---------------------------------------------------------------------------
const briefFactsTemplates = [
  'Complainant reported theft of mobile phone and wallet near {location}.',
  'Accused allegedly assaulted the victim with a sharp weapon at {location}.',
  'Online fraud reported — complainant lost Rs. {amount} via fake UPI link.',
  'Domestic violence complaint filed by wife against husband at {location}.',
  'Motor vehicle theft reported. Two-wheeler bearing registration KA-{reg} missing from parking area.',
  'Chain snatching incident near {location}. Gold chain worth Rs. {amount} snatched by bike-borne miscreants.',
  'House burglary reported. Cash and jewellery worth Rs. {amount} stolen from residence at {location}.',
  'Complainant reported cyberbullying and threatening messages on social media.',
  'Drug seizure — {quantity} grams of contraband substance recovered from accused at {location}.',
  'Road rage incident. Accused attacked complainant with iron rod near {location}.',
  'Stalking complaint filed. Accused repeatedly followed and harassed complainant near {location}.',
  'Forgery and cheating — accused forged property documents and cheated complainant of Rs. {amount}.',
  'Child reported missing from school premises at {location}. Investigation initiated.',
  'Accused persons created unlawful assembly and caused riot near {location}.',
  'Illegal arms — country-made pistol and ammunition recovered from accused at {location}.',
  'Complainant reported identity theft. Fraudulent bank transactions worth Rs. {amount} detected.',
  'Dowry harassment — complainant\'s family demanded Rs. {amount} as additional dowry.',
  'Atrocity against SC/ST community member reported at {location}.',
  'NDPS Act violation — accused found in possession of {quantity} grams of ganja at {location}.',
  'Accident case — rash and negligent driving caused injury to pedestrian at {location}.',
];

const locations = [
  'MG Road', 'Brigade Road', 'Jayanagar 4th Block', 'Koramangala 5th Block',
  'Whitefield Main Road', 'HSR Layout Sector 2', 'Indiranagar 100 Feet Road',
  'Electronic City Phase 1', 'Marathahalli Bridge', 'Yelahanka New Town',
  'Rajajinagar 1st Block', 'Basavanagudi Bull Temple Road', 'BTM Layout 2nd Stage',
  'Peenya Industrial Area', 'Yeshwanthpur Circle', 'KR Market',
  'Mysuru Devaraja Market', 'Mangaluru Hampankatta', 'Hubli Lamington Road',
  'Belagavi Khanapur Road', 'Kalaburagi Super Market', 'Tumakuru Bus Stand area',
  'Davanagere PJ Extension', 'Shivamogga JC Road', 'Ballari Cowl Bazaar'
];

function generateBriefFacts() {
  let fact = pick(briefFactsTemplates);
  fact = fact.replace('{location}', pick(locations));
  fact = fact.replace('{amount}', String(randInt(5, 500) * 1000));
  fact = fact.replace('{reg}', `${randInt(1, 72)}-${String.fromCharCode(65 + randInt(0, 25))}${String.fromCharCode(65 + randInt(0, 25))}-${randInt(1000, 9999)}`);
  fact = fact.replace('{quantity}', String(randInt(10, 5000)));
  return fact;
}

// ---------------------------------------------------------------------------
// District center coordinates (approx) for realistic lat/lng
// ---------------------------------------------------------------------------
const districtCoords = {
  1: { lat: 12.9716, lng: 77.5946, spread: 0.15 },   // Bengaluru Urban
  2: { lat: 13.1000, lng: 77.4500, spread: 0.20 },   // Bengaluru Rural
  3: { lat: 12.2958, lng: 76.6394, spread: 0.15 },   // Mysuru
  4: { lat: 12.8714, lng: 74.8430, spread: 0.20 },   // Mangaluru
  5: { lat: 15.3647, lng: 75.1240, spread: 0.10 },   // Hubli-Dharwad
  6: { lat: 15.8497, lng: 74.4977, spread: 0.20 },   // Belagavi
  7: { lat: 17.3297, lng: 76.8343, spread: 0.20 },   // Kalaburagi
  8: { lat: 15.1394, lng: 76.9214, spread: 0.20 },   // Ballari
  9: { lat: 16.2120, lng: 77.3439, spread: 0.20 },   // Raichur
  10: { lat: 13.3379, lng: 77.1173, spread: 0.20 },  // Tumakuru
  11: { lat: 13.9299, lng: 75.5681, spread: 0.20 },  // Shivamogga
  12: { lat: 14.4644, lng: 75.9218, spread: 0.15 },  // Davanagere
  13: { lat: 13.0073, lng: 76.1004, spread: 0.20 },  // Hassan
  14: { lat: 12.5218, lng: 76.8951, spread: 0.15 },  // Mandya
  15: { lat: 14.2226, lng: 76.3987, spread: 0.20 },  // Chitradurga
  16: { lat: 13.1361, lng: 78.1292, spread: 0.15 },  // Kolar
  17: { lat: 13.3161, lng: 75.7720, spread: 0.20 },  // Chikkamagaluru
  18: { lat: 13.3409, lng: 74.7421, spread: 0.15 },  // Udupi
  19: { lat: 14.8182, lng: 74.1290, spread: 0.30 },  // Uttara Kannada
  20: { lat: 17.9104, lng: 77.5199, spread: 0.15 },  // Bidar
  21: { lat: 15.4315, lng: 75.6355, spread: 0.15 },  // Gadag
  22: { lat: 14.7951, lng: 75.4044, spread: 0.20 },  // Haveri
  23: { lat: 15.3547, lng: 76.1548, spread: 0.15 },  // Koppal
  24: { lat: 16.1691, lng: 75.6615, spread: 0.20 },  // Bagalkot
  25: { lat: 16.7700, lng: 77.1380, spread: 0.15 },  // Yadgir
  26: { lat: 11.9261, lng: 76.9437, spread: 0.15 },  // Chamarajanagar
  27: { lat: 12.4244, lng: 75.7382, spread: 0.15 },  // Kodagu
  28: { lat: 12.7159, lng: 77.2810, spread: 0.15 },  // Ramanagara
  29: { lat: 13.4355, lng: 77.7315, spread: 0.15 },  // Chikkaballapura
  30: { lat: 16.8302, lng: 75.7100, spread: 0.15 },  // Vijayapura
  31: { lat: 15.4589, lng: 75.0078, spread: 0.10 },  // Dharwad
};

function getCoordinates(districtID) {
  const c = districtCoords[districtID] || { lat: 13.0, lng: 77.0, spread: 0.5 };
  return {
    latitude: +(c.lat + (rand() - 0.5) * 2 * c.spread).toFixed(6),
    longitude: +(c.lng + (rand() - 0.5) * 2 * c.spread).toFixed(6),
  };
}

// ---------------------------------------------------------------------------
// Stations grouped by district for easy lookups
// ---------------------------------------------------------------------------
const stationsByDistrict = {};
policeStations.forEach((ps) => {
  if (!stationsByDistrict[ps.DistrictID]) stationsByDistrict[ps.DistrictID] = [];
  stationsByDistrict[ps.DistrictID].push(ps.UnitID);
});

// ---------------------------------------------------------------------------
// 10. Generate 1500 Cases and linked operational rows
// ---------------------------------------------------------------------------

const TOTAL_CASES = 1500;
const TOTAL_VICTIMS = 1800;
const TOTAL_ACCUSED = 1650;
const TOTAL_ARRESTS = 1500;
const TOTAL_CHARGESHEETS = 1500;
const MIN_COMPLAINANTS = 1500;

// Distribution weights for districts
const districtWeights = districts.map((d) => {
  if (d.DistrictID === 1) return { value: d.DistrictID, weight: 40 };  // Bengaluru Urban 40%
  if (d.DistrictID === 3) return { value: d.DistrictID, weight: 10 };  // Mysuru 10%
  if (d.DistrictID === 4) return { value: d.DistrictID, weight: 8 };   // Mangaluru 8%
  if (d.DistrictID === 5) return { value: d.DistrictID, weight: 8 };   // Hubli-Dharwad 8%
  if (d.DistrictID === 6) return { value: d.DistrictID, weight: 8 };   // Belagavi 8%
  return { value: d.DistrictID, weight: 26 / 26 };                     // Remaining ~1% each
});

const caseCategoryWeights = [
  { value: 1, weight: 70 },  // FIR
  { value: 2, weight: 10 },  // NCR
  { value: 3, weight: 10 },  // UDR
  { value: 4, weight: 5 },   // PAR
  { value: 5, weight: 5 },   // Zero FIR
];

const gravityWeights = [
  { value: 1, weight: 30 },  // Heinous
  { value: 2, weight: 70 },  // Non-Heinous
];

const statusWeights = [
  { value: 1, weight: 40 },  // Under Investigation
  { value: 2, weight: 25 },  // Charge Sheeted
  { value: 3, weight: 15 },  // Closed
  { value: 4, weight: 10 },  // Undetected
  { value: 5, weight: 5 },   // Pending Trial
  { value: 6, weight: 3 },   // Convicted
  { value: 7, weight: 2 },   // Acquitted
];

const crimeHeadWeights = [
  { value: 1, weight: 15 },  // Crimes Against Body
  { value: 2, weight: 25 },  // Crimes Against Property
  { value: 3, weight: 12 },  // Crimes Against Women
  { value: 4, weight: 5 },   // Crimes Against Children
  { value: 5, weight: 15 },  // Cyber Crimes
  { value: 6, weight: 10 },  // Economic Offences
  { value: 7, weight: 7 },   // Narcotics
  { value: 8, weight: 5 },   // Crimes Against Public Order
  { value: 9, weight: 3 },   // Arms Act Cases
  { value: 10, weight: 3 },  // Crimes Against SC/ST
];

const cases = [];

for (let i = 0; i < TOTAL_CASES; i++) {
  const districtID = weightedPick(districtWeights);
  const stationsInDistrict = stationsByDistrict[districtID] || [1];
  const policeStationID = pick(stationsInDistrict);

  const crimeHeadID = weightedPick(crimeHeadWeights);
  const possibleSubHeads = subHeadsByHead[crimeHeadID];
  const crimeSubHeadID = pick(possibleSubHeads);

  // Date with trend: later dates more frequent (slight increase toward 2026)
  // Use a biased random to favor more recent dates
  const startDate = new Date('2024-01-01').getTime();
  const endDate = new Date('2026-06-30').getTime();
  const biasedRandom = Math.pow(rand(), 0.8); // bias toward 1 = later dates
  const registrationDate = new Date(startDate + biasedRandom * (endDate - startDate));

  // Incident date is 0–3 days before registration
  const incidentOffset = randInt(0, 3) * 24 * 60 * 60 * 1000;
  const incidentFromDate = new Date(registrationDate.getTime() - incidentOffset);
  const incidentToDate = new Date(incidentFromDate.getTime() + randInt(0, 1) * 24 * 60 * 60 * 1000);

  // Info received between incident and registration
  const infoReceivedDate = new Date(
    incidentFromDate.getTime() +
    rand() * (registrationDate.getTime() - incidentFromDate.getTime())
  );

  const coords = getCoordinates(districtID);

  // CrimeNo format: 10 44 300 06 2026 00001
  // StateCode(2) + DistrictCode(2) + UnitCode(3) + CaseCategory(2) + Year(4) + SeqNo(5)
  const stateCode = '10';
  const districtCode = String(districtID).padStart(2, '0');
  const unitCode = String(policeStationID).padStart(3, '0');
  const caseCategoryID = weightedPick(caseCategoryWeights);
  const catCode = String(caseCategoryID).padStart(2, '0');
  const yearCode = String(registrationDate.getFullYear());
  const seqNo = String(i + 1).padStart(5, '0');
  const crimeNo = `${stateCode}${districtCode}${unitCode}${catCode}${yearCode}${seqNo}`;

  cases.push({
    CaseMasterID: i + 1,
    CrimeNo: crimeNo,
    CaseNo: crimeNo.slice(-9),
    CrimeRegisteredDate: fmtTime(registrationDate),
    PoliceStationID: policeStationID,
    DistrictID: districtID,
    CaseCategoryID: caseCategoryID,
    GravityOffenceID: weightedPick(gravityWeights),
    CrimeMajorHeadID: crimeHeadID,
    CrimeMinorHeadID: crimeSubHeadID,
    CaseStatusID: weightedPick(statusWeights),
    IncidentFromDate: fmtTime(incidentFromDate),
    IncidentToDate: fmtTime(incidentToDate),
    InfoReceivedPSDate: fmtTime(infoReceivedDate),
    latitude: coords.latitude,
    longitude: coords.longitude,
    BriefFacts: generateBriefFacts(),
  });
}

// ---------------------------------------------------------------------------
// 11. Victims — 1800 records
// ---------------------------------------------------------------------------
const victims = [];
let victimID = 1;

// Distribute victims across cases (each case gets at least 1 victim)
for (let i = 0; i < TOTAL_CASES; i++) {
  const numVictims = rand() < 0.8 ? 1 : randInt(2, 3); // 80% single victim
  for (let v = 0; v < numVictims && victimID <= TOTAL_VICTIMS; v++) {
    const gender = weightedPick([
      { value: 'M', weight: 55 },
      { value: 'F', weight: 43 },
      { value: 'T', weight: 2 },
    ]);
    victims.push({
      VictimMasterID: victimID,
      CaseMasterID: i + 1,
      VictimName: buildProtectedAlias('VIC', victimID),
      AgeYear: randInt(18, 70),
      GenderID: gender,
      VictimPolice: rand() < 0.02 ? '1' : '0',
    });
    victimID++;
  }
}

// If we haven't reached the target, fill remaining victims to random cases
while (victimID <= TOTAL_VICTIMS) {
  const caseIdx = randInt(0, TOTAL_CASES - 1);
  const gender = weightedPick([
    { value: 'M', weight: 55 },
    { value: 'F', weight: 43 },
    { value: 'T', weight: 2 },
  ]);
  victims.push({
    VictimMasterID: victimID,
    CaseMasterID: caseIdx + 1,
    VictimName: buildProtectedAlias('VIC', victimID),
    AgeYear: randInt(18, 70),
    GenderID: gender,
    VictimPolice: rand() < 0.02 ? '1' : '0',
  });
  victimID++;
}

// ---------------------------------------------------------------------------
// 12. Accused — 1650 records
// ---------------------------------------------------------------------------
const accused = [];
let accusedID = 1;

// Track person IDs per case
const personCountByCase = {};

for (let i = 0; i < TOTAL_ACCUSED; i++) {
  const caseIdx = i < TOTAL_CASES ? i % TOTAL_CASES : randInt(0, TOTAL_CASES - 1);
  const caseMasterID = caseIdx + 1;

  if (!personCountByCase[caseMasterID]) personCountByCase[caseMasterID] = 0;
  personCountByCase[caseMasterID]++;
  const personNum = personCountByCase[caseMasterID];

  const gender = weightedPick([
    { value: 'M', weight: 85 },
    { value: 'F', weight: 14 },
    { value: 'T', weight: 1 },
  ]);

  accused.push({
    AccusedMasterID: accusedID,
    CaseMasterID: caseMasterID,
    AccusedName: buildProtectedAlias('ACCUSED', accusedID),
    AgeYear: randInt(18, 55),
    GenderID: gender,
    PersonID: `A${personNum}`,
  });
  accusedID++;
}

// ---------------------------------------------------------------------------
// 13. Arrests — 1500 records
// ---------------------------------------------------------------------------
const arrests = [];

// Pick accused who will be arrested across the operational workload.
const arrestedAccusedIndices = [];
const usedAccusedIDs = new Set();

while (arrestedAccusedIndices.length < TOTAL_ARRESTS) {
  const idx = randInt(0, accused.length - 1);
  if (!usedAccusedIDs.has(accused[idx].AccusedMasterID)) {
    usedAccusedIDs.add(accused[idx].AccusedMasterID);
    arrestedAccusedIndices.push(idx);
  }
}

for (let i = 0; i < TOTAL_ARRESTS; i++) {
  const acc = accused[arrestedAccusedIndices[i]];
  const relatedCase = cases[acc.CaseMasterID - 1];

  // Arrest date: between registration date and up to 90 days later
  const regDate = new Date(relatedCase.CrimeRegisteredDate.split(' ')[0]);
  const maxArrestDate = new Date(regDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const capDate = maxArrestDate > new Date('2026-06-30') ? new Date('2026-06-30') : maxArrestDate;
  const arrestDate = randomDate(regDate, capDate);

  arrests.push({
    ArrestSurrenderID: i + 1,
    CaseMasterID: acc.CaseMasterID,
    ArrestSurrenderTypeID: weightedPick([
      { value: 1, weight: 90 },  // Arrest
      { value: 2, weight: 10 },  // Surrender
    ]),
    ArrestSurrenderDate: fmt(arrestDate),
    AccusedMasterID: acc.AccusedMasterID,
    IsAccused: 1,
    IsComplainantAccused: rand() < 0.05 ? 1 : 0,
  });
}

// ---------------------------------------------------------------------------
// 14. Chargesheets — 1500 records
// ---------------------------------------------------------------------------
const chargesheets = [];

// Pick cases that are charge sheeted or beyond (status 2, 5, 6, 7)
const eligibleCaseIDs = cases
  .filter((c) => [2, 5, 6, 7].includes(c.CaseStatusID))
  .map((c) => c.CaseMasterID);

for (let i = 0; i < TOTAL_CHARGESHEETS; i++) {
  const caseMasterID = eligibleCaseIDs.length > 0
    ? eligibleCaseIDs[i % eligibleCaseIDs.length]
    : randInt(1, TOTAL_CASES);

  const relatedCase = cases[caseMasterID - 1];
  const regDate = new Date(relatedCase.CrimeRegisteredDate.split(' ')[0]);

  // CS date: 30 to 180 days after registration
  const csDate = new Date(regDate.getTime() + randInt(30, 180) * 24 * 60 * 60 * 1000);
  const capCSDate = csDate > new Date('2026-06-30') ? new Date('2026-06-30') : csDate;

  chargesheets.push({
    CSID: i + 1,
    CaseMasterID: caseMasterID,
    csdate: fmt(capCSDate),
    cstype: weightedPick([
      { value: 'A', weight: 70 },
      { value: 'B', weight: 15 },
      { value: 'C', weight: 15 },
    ]),
  });
}

// ---------------------------------------------------------------------------
// Named Exports
// ---------------------------------------------------------------------------
const states = [
  { StateID: 1, StateName: 'Karnataka', NationalityID: 1, Active: 1 },
  { StateID: 2, StateName: 'Tamil Nadu', NationalityID: 1, Active: 1 },
  { StateID: 3, StateName: 'Telangana', NationalityID: 1, Active: 1 },
];

const unitTypes = [
  { UnitTypeID: 1, UnitTypeName: 'Police Station', CityDistState: 'District', Hierarchy: 3, Active: 1 },
  { UnitTypeID: 2, UnitTypeName: 'Circle Office', CityDistState: 'District', Hierarchy: 2, Active: 1 },
  { UnitTypeID: 3, UnitTypeName: 'Commissioner Office', CityDistState: 'City', Hierarchy: 1, Active: 1 },
];

const units = policeStations.map((station) => ({
  ...station,
  ParentUnit: null,
}));

const ranks = [
  { RankID: 1, RankName: 'DSP', Hierarchy: 1, Active: 1 },
  { RankID: 2, RankName: 'Inspector', Hierarchy: 2, Active: 1 },
  { RankID: 3, RankName: 'Sub Inspector', Hierarchy: 3, Active: 1 },
  { RankID: 4, RankName: 'Head Constable', Hierarchy: 4, Active: 1 },
  { RankID: 5, RankName: 'Constable', Hierarchy: 5, Active: 1 },
];

const designations = [
  { DesignationID: 1, DesignationName: 'Investigating Officer', Active: 1, SortOrder: 1 },
  { DesignationID: 2, DesignationName: 'Station House Officer', Active: 1, SortOrder: 2 },
  { DesignationID: 3, DesignationName: 'Writer', Active: 1, SortOrder: 3 },
];

const casteMaster = [
  { caste_master_id: 1, caste_master_name: 'General' },
  { caste_master_id: 2, caste_master_name: 'OBC' },
  { caste_master_id: 3, caste_master_name: 'SC' },
  { caste_master_id: 4, caste_master_name: 'ST' },
  { caste_master_id: 5, caste_master_name: 'Minority' },
];

const religionMaster = [
  { ReligionID: 1, ReligionName: 'Hindu' },
  { ReligionID: 2, ReligionName: 'Muslim' },
  { ReligionID: 3, ReligionName: 'Christian' },
  { ReligionID: 4, ReligionName: 'Jain' },
  { ReligionID: 5, ReligionName: 'Sikh' },
];

const occupationMaster = [
  { OccupationID: 1, OccupationName: 'Farmer' },
  { OccupationID: 2, OccupationName: 'Government Employee' },
  { OccupationID: 3, OccupationName: 'Private Employee' },
  { OccupationID: 4, OccupationName: 'Business' },
  { OccupationID: 5, OccupationName: 'Student' },
  { OccupationID: 6, OccupationName: 'Homemaker' },
  { OccupationID: 7, OccupationName: 'Daily Wage Worker' },
];

const caseStatusMaster = caseStatuses.map((status) => ({
  CaseStatusID: status.CaseStatusID,
  CaseStatusName: status.CaseStatusName,
}));

const gravityOffenceMaster = gravityOffences.map((gravity) => ({
  GravityOffenceID: gravity.GravityOffenceID,
  LookupValue: gravity.LookupValue,
}));

const employees = [];
let employeeID = 1;
for (const unit of units) {
  const employeesPerUnit = unit.DistrictID === 1 ? 4 : unit.DistrictID <= 6 ? 3 : 2;
  for (let i = 0; i < employeesPerUnit; i++) {
    const gender = weightedPick([
      { value: 'M', weight: 78 },
      { value: 'F', weight: 21 },
      { value: 'T', weight: 1 },
    ]);
    const aliasSeed = randomName(gender);
    employees.push({
      EmployeeID: employeeID,
      DistrictID: unit.DistrictID,
      UnitID: unit.UnitID,
      RankID: i === 0 ? 2 : i === 1 ? 3 : 4,
      DesignationID: i === 0 ? 2 : 1,
      KGID: `KG${String(100000 + employeeID).padStart(6, '0')}`,
      FirstName: buildOfficerCallsign(employeeID, unit.UnitID, aliasSeed),
      EmployeeDOB: fmt(randomDate('1971-01-01', '2000-12-31')),
      GenderID: gender,
      BloodGroupID: randInt(1, 8),
      PhysicallyChallenged: rand() < 0.02 ? 1 : 0,
      AppointmentDate: fmt(randomDate('1998-01-01', '2024-06-30')),
    });
    employeeID++;
  }
}

const employeesByUnit = {};
employees.forEach((employee) => {
  if (!employeesByUnit[employee.UnitID]) employeesByUnit[employee.UnitID] = [];
  employeesByUnit[employee.UnitID].push(employee);
});

const courts = [];
let courtID = 1;
districts.forEach((district) => {
  const courtsInDistrict = district.DistrictID <= 6 ? 2 : 1;
  for (let i = 0; i < courtsInDistrict; i++) {
    courts.push({
      CourtID: courtID,
      CourtName: `${district.DistrictName} ${i === 0 ? 'District Court' : 'Sessions Court'}`,
      DistrictID: district.DistrictID,
      StateID: district.StateID,
      Active: 1,
    });
    courtID++;
  }
});

const courtsByDistrict = {};
courts.forEach((court) => {
  if (!courtsByDistrict[court.DistrictID]) courtsByDistrict[court.DistrictID] = [];
  courtsByDistrict[court.DistrictID].push(court);
});

const crimeHeadActSection = [
  { CrimeHeadID: 1, ActCode: 'IPC', SectionCode: '302' },
  { CrimeHeadID: 1, ActCode: 'IPC', SectionCode: '307' },
  { CrimeHeadID: 2, ActCode: 'IPC', SectionCode: '379' },
  { CrimeHeadID: 2, ActCode: 'IPC', SectionCode: '392' },
  { CrimeHeadID: 3, ActCode: 'IPC', SectionCode: '354' },
  { CrimeHeadID: 3, ActCode: 'DPA', SectionCode: '4' },
  { CrimeHeadID: 4, ActCode: 'POCSO', SectionCode: '8' },
  { CrimeHeadID: 4, ActCode: 'POCSO', SectionCode: '10' },
  { CrimeHeadID: 5, ActCode: 'IT', SectionCode: '66C' },
  { CrimeHeadID: 5, ActCode: 'IT', SectionCode: '66D' },
  { CrimeHeadID: 6, ActCode: 'IPC', SectionCode: '420' },
  { CrimeHeadID: 6, ActCode: 'IPC', SectionCode: '468' },
  { CrimeHeadID: 7, ActCode: 'NDPS', SectionCode: '20' },
  { CrimeHeadID: 7, ActCode: 'NDPS', SectionCode: '21' },
  { CrimeHeadID: 8, ActCode: 'IPC', SectionCode: '147' },
  { CrimeHeadID: 8, ActCode: 'KPA', SectionCode: '95' },
  { CrimeHeadID: 9, ActCode: 'ARMS', SectionCode: '25' },
  { CrimeHeadID: 10, ActCode: 'SCST', SectionCode: '3(1)' },
];

const actSectionAssociations = [];
const invOccuranceTime = [];
const complainantDetails = [];
const genderWeights = [
  { value: 'M', weight: 60 },
  { value: 'F', weight: 39 },
  { value: 'T', weight: 1 },
];

cases.forEach((item) => {
  const officers = employeesByUnit[item.PoliceStationID] || employees.slice(0, 1);
  const officer = pick(officers);
  const districtCourts = courtsByDistrict[item.DistrictID] || courts.slice(0, 1);
  const court = pick(districtCourts);

  item.PolicePersonID = officer.EmployeeID;
  item.CourtID = court.CourtID;

  invOccuranceTime.push({
    CaseMasterID: item.CaseMasterID,
    IncidentFromDate: item.IncidentFromDate,
    IncidentToDate: item.IncidentToDate,
    InfoReceivedPSDate: item.InfoReceivedPSDate,
    latitude: item.latitude,
    longitude: item.longitude,
    BriefFacts: item.BriefFacts,
  });

  const complainantCount = rand() < 0.86 ? 1 : 2;
  for (let i = 0; i < complainantCount; i++) {
    const gender = weightedPick(genderWeights);
    complainantDetails.push({
      ComplainantID: complainantDetails.length + 1,
      CaseMasterID: item.CaseMasterID,
      ComplainantName: buildProtectedAlias('COMP', complainantDetails.length + 1),
      AgeYear: randInt(18, 68),
      OccupationID: randInt(1, occupationMaster.length),
      ReligionID: randInt(1, religionMaster.length),
      CasteID: randInt(1, casteMaster.length),
      GenderID: gender,
    });
  }

  const relevantSections = crimeHeadActSection
    .filter((entry) => entry.CrimeHeadID === item.CrimeMajorHeadID)
    .slice(0, rand() < 0.7 ? 1 : 2);

  relevantSections.forEach((entry, index) => {
    actSectionAssociations.push({
      CaseMasterID: item.CaseMasterID,
      ActID: entry.ActCode,
      SectionID: entry.SectionCode,
      ActOrderID: index + 1,
      SectionOrderID: index + 1,
    });
  });
});

while (complainantDetails.length < MIN_COMPLAINANTS) {
  const caseMasterID = randInt(1, TOTAL_CASES);
  const gender = weightedPick(genderWeights);
  complainantDetails.push({
    ComplainantID: complainantDetails.length + 1,
    CaseMasterID: caseMasterID,
    ComplainantName: buildProtectedAlias('COMP', complainantDetails.length + 1),
    AgeYear: randInt(18, 68),
    OccupationID: randInt(1, occupationMaster.length),
    ReligionID: randInt(1, religionMaster.length),
    CasteID: randInt(1, casteMaster.length),
    GenderID: gender,
  });
}

arrests.forEach((arrest) => {
  const relatedCase = cases[arrest.CaseMasterID - 1];
  const station = units.find((unit) => unit.UnitID === relatedCase.PoliceStationID) || units[0];
  const localOfficers = employeesByUnit[station.UnitID] || employees.slice(0, 1);
  const io = pick(localOfficers);
  const districtCourt = pick(courtsByDistrict[station.DistrictID] || courts.slice(0, 1));
  arrest.ArrestSurrenderStateId = rand() < 0.93 ? station.StateID : pick(states.filter((state) => state.StateID !== station.StateID)).StateID;
  arrest.ArrestSurrenderDistrictId = station.DistrictID;
  arrest.PoliceStationID = station.UnitID;
  arrest.IOID = io.EmployeeID;
  arrest.CourtID = districtCourt.CourtID;
});

chargesheets.forEach((chargesheet) => {
  const relatedCase = cases[chargesheet.CaseMasterID - 1];
  chargesheet.PolicePersonID = relatedCase?.PolicePersonID || employees[0].EmployeeID;
});

const chargesheetDetails = chargesheets;

const invArrestSurrenderAccused = arrests.map((arrest, index) => ({
  InvArrestSurrenderAccusedID: index + 1,
  ArrestSurrenderID: arrest.ArrestSurrenderID,
  AccusedMasterID: arrest.AccusedMasterID,
}));

const MIN_TABLE_ROWS = 1500;

function padNumericTable(rows, idField, createRow) {
  if (rows.length >= MIN_TABLE_ROWS) return rows;
  const padded = [...rows];
  let nextId = Math.max(0, ...rows.map((item) => Number(item[idField]) || 0)) + 1;
  while (padded.length < MIN_TABLE_ROWS) {
    const source = rows[(padded.length - rows.length) % rows.length] || {};
    padded.push(createRow(source, nextId, padded.length + 1));
    nextId += 1;
  }
  return padded;
}

function padStringTable(rows, keyField, createRow) {
  if (rows.length >= MIN_TABLE_ROWS) return rows;
  const padded = [...rows];
  let nextId = rows.length + 1;
  while (padded.length < MIN_TABLE_ROWS) {
    const source = rows[(padded.length - rows.length) % rows.length] || {};
    padded.push(createRow(source, nextId, padded.length + 1));
    nextId += 1;
  }
  return padded;
}

function padGenericTable(rows, createRow) {
  if (rows.length >= MIN_TABLE_ROWS) return rows;
  const padded = [...rows];
  let nextId = rows.length + 1;
  while (padded.length < MIN_TABLE_ROWS) {
    const source = rows[(padded.length - rows.length) % rows.length] || {};
    padded.push(createRow(source, nextId, padded.length + 1));
    nextId += 1;
  }
  return padded;
}

const exportedStates = padNumericTable(states, 'StateID', (source, nextId) => ({
  ...source,
  StateID: nextId,
  StateName: `Archive State ${nextId}`,
  Active: 0,
  ArchiveRow: 1,
}));

const exportedDistricts = padNumericTable(districts, 'DistrictID', (source, nextId) => ({
  ...source,
  DistrictID: nextId,
  DistrictName: `Archive District ${nextId}`,
  StateID: 1,
  Active: 0,
  ArchiveRow: 1,
}));

const exportedCourts = padNumericTable(courts, 'CourtID', (source, nextId) => ({
  ...source,
  CourtID: nextId,
  CourtName: `Archive Court ${nextId}`,
  DistrictID: source.DistrictID || 1,
  StateID: source.StateID || 1,
  Active: 0,
  ArchiveRow: 1,
}));

const exportedPoliceStations = padNumericTable(policeStations, 'UnitID', (source, nextId) => ({
  ...source,
  UnitID: nextId,
  UnitName: `Archive Unit ${nextId}`,
  DistrictID: source.DistrictID || 1,
  StateID: source.StateID || 1,
  Active: 0,
  ArchiveRow: 1,
}));

const exportedUnitTypes = padNumericTable(unitTypes, 'UnitTypeID', (source, nextId) => ({
  ...source,
  UnitTypeID: nextId,
  UnitTypeName: `Archive Unit Type ${nextId}`,
  Active: 0,
  ArchiveRow: 1,
}));

const exportedUnits = padNumericTable(units, 'UnitID', (source, nextId) => ({
  ...source,
  UnitID: nextId,
  UnitName: `Archive Unit ${nextId}`,
  DistrictID: source.DistrictID || 1,
  StateID: source.StateID || 1,
  Active: 0,
  ArchiveRow: 1,
}));

const exportedRanks = padNumericTable(ranks, 'RankID', (source, nextId) => ({
  ...source,
  RankID: nextId,
  RankName: `Archive Rank ${nextId}`,
  Active: 0,
  ArchiveRow: 1,
}));

const exportedDesignations = padNumericTable(designations, 'DesignationID', (source, nextId) => ({
  ...source,
  DesignationID: nextId,
  DesignationName: `Archive Designation ${nextId}`,
  Active: 0,
  ArchiveRow: 1,
}));

const exportedEmployees = padNumericTable(employees, 'EmployeeID', (source, nextId) => ({
  ...source,
  EmployeeID: nextId,
  UnitID: source.UnitID || 1,
  DistrictID: source.DistrictID || 1,
  KGID: `KG${String(900000 + nextId).padStart(6, '0')}`,
  FirstName: buildOfficerCallsign(nextId, source.UnitID || 1, 'Archive'),
  Active: 0,
  ArchiveRow: 1,
}));

const exportedCasteMaster = padNumericTable(casteMaster, 'caste_master_id', (source, nextId) => ({
  ...source,
  caste_master_id: nextId,
  caste_master_name: `Archive Caste ${nextId}`,
  ArchiveRow: 1,
}));

const exportedReligionMaster = padNumericTable(religionMaster, 'ReligionID', (source, nextId) => ({
  ...source,
  ReligionID: nextId,
  ReligionName: `Archive Religion ${nextId}`,
  ArchiveRow: 1,
}));

const exportedOccupationMaster = padNumericTable(occupationMaster, 'OccupationID', (source, nextId) => ({
  ...source,
  OccupationID: nextId,
  OccupationName: `Archive Occupation ${nextId}`,
  ArchiveRow: 1,
}));

const exportedCrimeHeads = padNumericTable(crimeHeads, 'CrimeHeadID', (source, nextId) => ({
  ...source,
  CrimeHeadID: nextId,
  CrimeGroupName: `Archive Crime Group ${nextId}`,
  Active: 0,
  ArchiveRow: 1,
}));

const exportedCrimeSubHeads = padNumericTable(crimeSubHeads, 'CrimeSubHeadID', (source, nextId) => ({
  ...source,
  CrimeSubHeadID: nextId,
  CrimeHeadID: source.CrimeHeadID || 1,
  CrimeHeadName: `Archive Crime Sub Head ${nextId}`,
  ArchiveRow: 1,
}));

const exportedCrimeHeadActSection = padGenericTable(crimeHeadActSection, (source, nextId) => ({
  ...source,
  CrimeHeadID: source.CrimeHeadID || 1,
  ActCode: source.ActCode || 'IPC',
  SectionCode: `${source.SectionCode || '302'}-A${nextId}`,
  ArchiveRowID: nextId,
  ArchiveRow: 1,
}));

const exportedCaseCategories = padNumericTable(caseCategories, 'CaseCategoryID', (source, nextId) => ({
  ...source,
  CaseCategoryID: nextId,
  LookupValue: `Archive Category ${nextId}`,
  ArchiveRow: 1,
}));

const exportedGravityOffences = padNumericTable(gravityOffences, 'GravityOffenceID', (source, nextId) => ({
  ...source,
  GravityOffenceID: nextId,
  LookupValue: `Archive Gravity ${nextId}`,
  ArchiveRow: 1,
}));

const exportedGravityOffenceMaster = padNumericTable(gravityOffenceMaster, 'GravityOffenceID', (source, nextId) => ({
  ...source,
  GravityOffenceID: nextId,
  LookupValue: `Archive Gravity ${nextId}`,
  ArchiveRow: 1,
}));

const exportedCaseStatuses = padNumericTable(caseStatuses, 'CaseStatusID', (source, nextId) => ({
  ...source,
  CaseStatusID: nextId,
  CaseStatusName: `Archive Status ${nextId}`,
  ArchiveRow: 1,
}));

const exportedCaseStatusMaster = padNumericTable(caseStatusMaster, 'CaseStatusID', (source, nextId) => ({
  ...source,
  CaseStatusID: nextId,
  CaseStatusName: `Archive Status ${nextId}`,
  ArchiveRow: 1,
}));

const exportedActs = padStringTable(acts, 'ActCode', (source, nextId) => ({
  ...source,
  ActCode: `ARCHACT${nextId}`,
  ActDescription: `Archived Act ${nextId}`,
  ShortName: `ARCH-${nextId}`,
  Active: 0,
  ArchiveRow: 1,
}));

const exportedSections = padGenericTable(sections, (source, nextId) => ({
  ...source,
  ActCode: source.ActCode || 'IPC',
  SectionCode: `ARCH-${nextId}`,
  SectionDescription: `Archived Section ${nextId}`,
  Active: 0,
  ArchiveRow: 1,
}));

const exportedCases = cases;
const exportedInvOccuranceTime = invOccuranceTime;
const exportedComplainantDetails = complainantDetails;
const exportedActSectionAssociations = padGenericTable(actSectionAssociations, (source, nextId) => ({
  ...source,
  CaseMasterID: source.CaseMasterID || 1,
  ActID: source.ActID || 'IPC',
  SectionID: `${source.SectionID || '302'}-ARCH-${nextId}`,
  ActOrderID: source.ActOrderID || 1,
  SectionOrderID: source.SectionOrderID || 1,
  ArchiveRowID: nextId,
  ArchiveRow: 1,
}));
const exportedVictims = victims;
const exportedAccused = accused;
const exportedArrests = arrests;
const exportedChargesheets = chargesheets;
const exportedChargesheetDetails = chargesheetDetails;
const exportedInvArrestSurrenderAccused = invArrestSurrenderAccused;

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
  exportedCases as cases,
  exportedInvOccuranceTime as invOccuranceTime,
  exportedComplainantDetails as complainantDetails,
  actSectionAssociations,
  exportedVictims as victims,
  exportedAccused as accused,
  exportedArrests as arrests,
  exportedChargesheets as chargesheets,
  exportedChargesheetDetails as chargesheetDetails,
  exportedInvArrestSurrenderAccused as invArrestSurrenderAccused
};
