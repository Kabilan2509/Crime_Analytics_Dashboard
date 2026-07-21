/**
 * intentParser.js
 * UI display helper only — used as offline fallback in Copilot.js.
 * All real intent classification is handled by the backend copilotEngine.js.
 */

export function parseIntent(query) {
  const q = (query || '').toLowerCase().trim();

  if (/\b(predict|forecast|risk)\b/.test(q)) return { intent: 'RISK_PREDICTION', params: {} };
  if (/\b(briefing|brief|summary|daily|status)\b/.test(q)) return { intent: 'DAILY_BRIEFING', params: {} };
  if (/\b(repeat|offender|habitual|criminal history)\b/.test(q)) return { intent: 'REPEAT_OFFENDER', params: { type: 'repeat' } };
  if (/\b(who is|io|investigating officer)\b/.test(q)) return { intent: 'OFFICER_QUERY', params: {} };
  if (/\b(workload|pending|station|ps \d)\b/.test(q)) return { intent: 'STATION_WORKLOAD', params: {} };
  if (/\b(hotspot|most cases|highest|top district)\b/.test(q)) return { intent: 'HOTSPOT', params: {} };
  if (/\b(similar|linked|same accused)\b/.test(q)) return { intent: 'SIMILAR_CASE', params: {} };
  if (/\b(after \d|before \d|night|morning)\b/.test(q)) return { intent: 'TEMPORAL_PATTERN', params: {} };

  const crimeTypes = ['murder','robbery','theft','burglary','pocso','cyber','fraud','assault','ndps','rape','kidnap'];
  for (const type of crimeTypes) {
    if (q.includes(type)) return { intent: 'CRIME_TYPE', params: { crimeType: type } };
  }

  if (/\b(how many|count|total|firs|cases)\b/.test(q)) return { intent: 'CRIME_COUNT', params: {} };

  return { intent: 'CRIME_COUNT', params: { query: q } };
}
