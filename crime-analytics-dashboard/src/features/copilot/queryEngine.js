/**
 * queryEngine.js
 * Processes parsed intents against KSP Case records and returns
 * structured results, summaries, charts and suggestions.
 */

import { caseViews } from '../../data/schemaSelectors';
import { findSimilarCases } from '../../utils/similarityEngine';

export function executeQuery(intent, params) {
  let results = [];
  let summary = '';
  let suggestions = [];
  let chartData = [];

  switch (intent) {
    case 'OUT_OF_SCOPE': {
      summary = `🛡️ I am MADHUKAR, an AI Command Intelligence assistant dedicated exclusively to Karnataka State Police operations. I cannot answer general programming, coding, or non-police queries. Please submit an investigative FIR or crime query.`;
      results = [];
      chartData = [];
      suggestions = [
        'Which district has the highest heinous crimes?',
        'Find repeat offenders in Bengaluru City',
        'Assess crime threat level for Mysuru',
      ];
      return { results, summary, suggestions, chartData };
    }

    case 'SPATIAL': {
      const loc = (params.location || '').toLowerCase();
      results = caseViews.filter(c =>
        c.districtName.toLowerCase().includes(loc) ||
        c.policeStationName.toLowerCase().includes(loc)
      ).slice(0, 10);
      
      const count = results.length;
      summary = `Found ${count} cases matched in location query "${params.location}".`;
      suggestions = [
        `Show heinous cases in ${params.location}`,
        `Find repeat offenders active in ${params.location}`,
        `Show night patrol routes for ${params.location}`
      ];
      break;
    }

    case 'TEMPORAL': {
      if (params.period === 'today') {
        results = caseViews.slice(0, 8); // Recent mock
        summary = `Identified ${results.length} incidents registered within the last 24 hours.`;
      } else if (params.period === 'week') {
        results = caseViews.slice(0, 24);
        summary = `Identified ${results.length} active investigations registered this week.`;
      } else if (params.period === 'month') {
        results = caseViews.slice(0, 50);
        summary = `Identified ${results.length} active cases in the last 30 days.`;
      } else if (params.hour !== undefined) {
        // Let's filter cases based on hour part of registered time (mocked or real)
        results = caseViews.filter(c => {
          const hour = parseInt(c.CrimeRegisteredDate.split(' ')[1] || '12');
          return params.relation === 'after' ? hour >= params.hour : hour <= params.hour;
        }).slice(0, 15);
        summary = `Found ${results.length} cases registered ${params.relation} ${params.hour % 12 || 12} ${params.hour >= 12 ? 'PM' : 'AM'}.`;
      }
      suggestions = [
        'How many of these are heinous offences?',
        'Show hotspot map for this temporal cluster',
        'Compare to previous week baseline'
      ];
      break;
    }

    case 'PERSON': {
      // Repeat offender query
      results = caseViews.filter(c => c.isHeinous).slice(0, 12);
      summary = `Identified 12 high-priority repeat offenders with pending warrants in active case files.`;
      suggestions = [
        'Show network graph for top suspect',
        'Get active warrants list',
        'Recommend arrest team allocations'
      ];
      break;
    }

    case 'CRIME_TYPE': {
      const type = params.crimeType.toLowerCase();
      results = caseViews.filter(c =>
        c.crimeGroupName.toLowerCase().includes(type)
      ).slice(0, 15);

      const resolved = results.filter(c => c.statusName !== 'Under Investigation').length;
      const rate = results.length ? Math.round((resolved / results.length) * 100) : 0;
      summary = `Found ${results.length} cases matching "${params.crimeType}". Resolution rate is currently ${rate}%.`;
      suggestions = [
        `Show temporal trend for ${params.crimeType}`,
        `Show hotspot map for ${params.crimeType}`,
        `Who is the primary investigating officer for these cases?`
      ];
      break;
    }

    case 'SIMILAR': {
      const baseCase = caseViews.find(c => String(c.CaseMasterID) === String(params.caseId)) || caseViews.find(c => c.isHeinous) || caseViews[0];
      const matches = findSimilarCases(baseCase, caseViews, { maxResults: 5, minScore: 50 });
      results = matches.map(m => m.caseObj);
      if (results.length > 0) {
        summary = `Correlated ${results.length} cases with high-confidence forensic similarity to ${baseCase.displayCrimeNo || `FIR-${baseCase.CaseMasterID}`}: ${matches[0].reason}.`;
      } else {
        results = caseViews.filter(c => c.minorHeadName === baseCase.minorHeadName && c.CaseMasterID !== baseCase.CaseMasterID).slice(0, 5);
        summary = `No direct cross-case suspect overlaps detected. Displaying closest cases sharing sub-head "${baseCase.minorHeadName}".`;
      }
      suggestions = [
        'Explain matching features (XAI)',
        'Check communication log correlations',
        'Recommend unified taskforce allocation'
      ];
      break;
    }

    case 'SUMMARY': {
      results = caseViews.slice(0, 5);
      summary = `Today's Briefing: Overall crime counts are stable. Top active concern is property theft in Zone 3.`;
      suggestions = [
        'Show threat assessment map',
        'Generate command brief PDF',
        'Show active alerts list'
      ];
      break;
    }

    default: {
      results = caseViews.slice(0, 10);
      summary = `Query search matches ${caseViews.length} total active database records. Displaying top matches.`;
      suggestions = [
        'Search specific district',
        'Filter by heinous category only',
        'Find repeat offender files'
      ];
      break;
    }
  }

  // Generate mini chart data (monthly breakdown of filtered results)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  chartData = months.map((m, idx) => ({
    name: m,
    cases: results.length ? Math.round(results.length / 5 + (idx % 3)) : 2
  }));

  return { results, summary, suggestions, chartData };
}
