export function maskText(value, visibleStart = 4, visibleEnd = 3) {
  if (!value) return 'Protected';
  if (value.length <= visibleStart + visibleEnd) return `${value.slice(0, 2)}•••`;
  return `${value.slice(0, visibleStart)}${'•'.repeat(Math.max(4, value.length - visibleStart - visibleEnd))}${value.slice(-visibleEnd)}`;
}

export function maskNarrative(text) {
  if (!text) return 'Narrative restricted to authenticated police sessions.';
  return 'Narrative restricted. Open a secure police session to view operational case facts.';
}

export function maskPersonName(value, label = 'Protected Person') {
  if (!value) return label;
  const first = String(value).trim().charAt(0).toUpperCase();
  return first ? `${first}. ••••• (${label})` : label;
}

export function maskBadge(value) {
  if (!value) return 'Protected';
  return maskText(String(value), 2, 2);
}

function redactPersonRecord(record, kind) {
  if (!record) return record;
  const redacted = { ...record };
  const nameFields = ['AccusedName', 'VictimName', 'ComplainantName', 'Name', 'FullName', 'FirstName', 'LastName'];
  const privateFields = [
    'Address', 'PresentAddress', 'PermanentAddress', 'MobileNo', 'PhoneNo', 'Phone',
    'Email', 'EmailID', 'AadhaarNo', 'AadharNo', 'PAN', 'PassportNo', 'IMEI',
  ];
  nameFields.forEach(field => {
    if (redacted[field]) redacted[field] = maskPersonName(redacted[field], kind);
  });
  privateFields.forEach(field => {
    if (redacted[field]) redacted[field] = 'Protected';
  });
  return redacted;
}

export function getSecureCaseView(item, accessLevel) {
  if (!item) return item;
  const command = accessLevel === 'command';
  const crimeNumber = item.CrimeNo || item.FIRNo || item.CaseNo || `FIR-${item.CaseMasterID}`;
  if (command) {
    return {
      ...item,
      displayCrimeNo: item.displayCrimeNo || crimeNumber,
      displayOfficerName: item.officerName || 'Unassigned',
      displayBriefFacts: item.briefFacts || item.BriefFacts || '',
    };
  }

  const maskedCrimeNumber = maskText(String(crimeNumber), 4, 3);
  const maskedOfficer = maskPersonName(item.officerName, 'Protected Officer');
  const restrictedNarrative = maskNarrative(item.briefFacts || item.BriefFacts);
  const safeCoordinate = value => Number.isFinite(Number(value)) ? Number(Number(value).toFixed(1)) : value;

  return {
    ...item,
    CrimeNo: maskedCrimeNumber,
    FIRNo: maskedCrimeNumber,
    CaseNo: item.CaseNo ? maskText(String(item.CaseNo), 3, 2) : item.CaseNo,
    displayCrimeNo: maskedCrimeNumber,
    officerName: maskedOfficer,
    officerKGID: maskBadge(item.officerKGID),
    briefFacts: restrictedNarrative,
    BriefFacts: restrictedNarrative,
    displayOfficerName: maskedOfficer,
    displayBriefFacts: restrictedNarrative,
    latitude: safeCoordinate(item.latitude),
    longitude: safeCoordinate(item.longitude),
    accused: (item.accused || []).map(person => redactPersonRecord(person, 'Protected Accused')),
    victims: (item.victims || []).map(person => redactPersonRecord(person, 'Protected Victim')),
    complainants: (item.complainants || []).map(person => redactPersonRecord(person, 'Protected Complainant')),
    employee: item.employee ? redactPersonRecord({ ...item.employee, KGID: maskBadge(item.employee.KGID) }, 'Protected Officer') : item.employee,
  };
}

export function secureOfficerLabel(officerName, accessLevel) {
  if (accessLevel === 'command') return officerName;
  return officerName ? `Assigned ${maskText(officerName, 3, 4)}` : 'Assigned Officer Protected';
}

export function getSecureCaseViews(caseViews, accessLevel) {
  return caseViews.map(item => getSecureCaseView(item, accessLevel));
}

export function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => {
      const value = row[key] ?? '';
      const normalized = String(value).replace(/"/g, '""');
      return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
    }).join(',')),
  ];
  return lines.join('\n');
}
