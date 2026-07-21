export function maskText(value, visibleStart = 4, visibleEnd = 3) {
  if (!value) return 'Protected';
  if (value.length <= visibleStart + visibleEnd) return `${value.slice(0, 2)}•••`;
  return `${value.slice(0, visibleStart)}${'•'.repeat(Math.max(4, value.length - visibleStart - visibleEnd))}${value.slice(-visibleEnd)}`;
}

export function maskNarrative(text) {
  if (!text) return 'Narrative restricted to authenticated police sessions.';
  return 'Narrative restricted. Open a secure police session to view operational case facts.';
}

export function secureOfficerLabel(officerName, accessLevel) {
  if (accessLevel === 'command') return officerName;
  return officerName ? `Assigned ${maskText(officerName, 3, 4)}` : 'Assigned Officer Protected';
}

export function getSecureCaseViews(caseViews, accessLevel) {
  return caseViews.map((item) => ({
    ...item,
    displayCrimeNo: accessLevel === 'command' ? item.CrimeNo : maskText(item.CrimeNo, 6, 4),
    displayOfficerName: secureOfficerLabel(item.officerName, accessLevel),
    displayBriefFacts: accessLevel === 'command' ? item.briefFacts : maskNarrative(item.briefFacts),
    latitude: accessLevel === 'command' ? item.latitude : Number(item.latitude.toFixed(2)),
    longitude: accessLevel === 'command' ? item.longitude : Number(item.longitude.toFixed(2)),
  }));
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
