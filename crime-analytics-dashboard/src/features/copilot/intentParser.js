/**
 * intentParser.js
 * UI display helper only — used as offline fallback in Copilot.js.
 * All real intent classification is handled by the backend copilotEngine.js.
 */

export function parseIntent(query) {
  const q = (query || '').toLowerCase().trim();

  // Guard against out-of-scope coding, trivia, and non-police requests
  const isCoding = /\b(python|javascript|typescript|java|c\+\+|html|css|sql query|bash|shell script|write code|give me code|debug|function\s*\(|class\s+\w+|import\s+\w+|def\s+\w+|compile|leetcode)\b/i.test(q);
  const isCasual = /\b(tell me a joke|write a poem|write an essay|sing a song|recipe|how to cook|who is president|capital of|movie recommendation|play a game|weather today|weather forecast|translate this to french|calculate 2\+|\bmath problem\b)\b/i.test(q);
  const explicitCode = /\b(code|script|program|snippet)\b/i.test(q) && !/\b(crime|penal code|ipc|bns|fir|section|law)\b/i.test(q);

  if (isCoding || isCasual || explicitCode) {
    return { intent: 'OUT_OF_SCOPE', params: { query: q } };
  }

  if (/\b(predict|forecast|risk|threat)\b/.test(q)) return { intent: 'RISK_PREDICTION', params: {} };
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
