/**
 * intentParser.js
 * Regular expression based intent parsing for police natural language queries.
 */

export function parseIntent(query) {
  const q = (query || '').toLowerCase().trim();

  // 1. Spatial queries (crimes near X, cases in Y)
  const spatialRegex = /(?:crimes|cases|incidents|happenings) (?:near|in|at|around) ([\w\s]+)/i;
  const spatialMatch = q.match(spatialRegex);
  if (spatialMatch) {
    return {
      intent: 'SPATIAL',
      params: { location: spatialMatch[1].trim() }
    };
  }

  // 2. Temporal queries (after X PM, this week, today, etc.)
  if (q.includes('today') || q.includes('daily')) {
    return { intent: 'TEMPORAL', params: { period: 'today' } };
  }
  if (q.includes('week') || q.includes('7 days')) {
    return { intent: 'TEMPORAL', params: { period: 'week' } };
  }
  if (q.includes('month') || q.includes('30 days')) {
    return { intent: 'TEMPORAL', params: { period: 'month' } };
  }
  const hourMatch = q.match(/(?:after|before|around) (\d+)\s*(pm|am)/i);
  if (hourMatch) {
    let hour = parseInt(hourMatch[1]);
    const isPm = hourMatch[2].toLowerCase() === 'pm';
    if (isPm && hour !== 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return {
      intent: 'TEMPORAL',
      params: { hour, relation: q.includes('after') ? 'after' : 'before' }
    };
  }

  // 3. Repeat offenders
  if (q.includes('repeat') || q.includes('offender') || q.includes('history') || q.includes('previous')) {
    return { intent: 'PERSON', params: { type: 'repeat' } };
  }

  // 4. Specific Crime Types (murder, robbery, theft, POCSO, etc.)
  const crimeTypes = ['murder', 'robbery', 'theft', 'burglary', 'pocso', 'scst', 'cyber', 'fraud', 'assault', 'ndps'];
  for (const type of crimeTypes) {
    if (q.includes(type)) {
      return { intent: 'CRIME_TYPE', params: { crimeType: type } };
    }
  }

  // 5. Similar case search
  const similarMatch = q.match(/(?:similar|like) (?:case|fir|number|no)?\s*(\w+)/i);
  if (similarMatch) {
    return { intent: 'SIMILAR', params: { caseId: similarMatch[1].trim() } };
  }

  // 6. Summary / Briefing requests
  if (q.includes('summary') || q.includes('brief') || q.includes('report') || q.includes('status')) {
    return { intent: 'SUMMARY', params: {} };
  }

  // Fallback to general statistics / search
  return {
    intent: 'STATS',
    params: { query: q }
  };
}
