/**
 * predictionsUtils.js — Data transforms for Predictions page
 *
 * Pure functions for risk scoring, trend forecasting, anomaly detection, and hotspot ranking.
 */

import { districts, units, getMonthLabel, getMonthlyCounts } from '../../data/schemaSelectors';

/** Risk level badge from score */
export function getRiskLevel(score) {
  if (score >= 40) return { label: 'High Risk', cls: 'badge-danger' };
  if (score >= 15) return { label: 'Medium Risk', cls: 'badge-warning' };
  return { label: 'Low Risk', cls: 'badge-success' };
}

/** District risk scores */
export function buildDistrictRisks(cases) {
  const stats = {};
  districts.forEach(d => {
    stats[d.DistrictID] = {
      name: d.DistrictName, total: 0, heinous: 0,
      stations: units.filter(u => u.DistrictID === d.DistrictID).length || 1,
    };
  });
  cases.forEach(c => {
    if (!stats[c.districtID]) return;
    stats[c.districtID].total += 1;
    if (c.isHeinous) stats[c.districtID].heinous += 1;
  });
  return Object.values(stats)
    .map(s => ({ ...s, score: Math.round(((s.heinous * 3 + s.total) / s.stations) * 10) / 10 }))
    .sort((a, b) => b.score - a.score);
}

/** Trend forecast with 3-month linear extrapolation */
export function buildTrendForecast(cases) {
  const last12 = getMonthlyCounts(cases).slice(-12);
  if (!last12.length) return [];
  const data = last12.map(([key, count]) => ({ month: getMonthLabel(key), actual: count, predicted: null }));
  const vals = data.map(d => d.actual);
  const n = vals.length;
  const sumX = vals.reduce((s, _, i) => s + i, 0);
  const sumY = vals.reduce((s, v) => s + v, 0);
  const sumXY = vals.reduce((s, v, i) => s + i * v, 0);
  const sumX2 = vals.reduce((s, _, i) => s + i * i, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n;

  const lastKey = last12[last12.length - 1]?.[0];
  let [year, month] = lastKey.split('-').map(Number);
  for (let i = 1; i <= 3; i++) {
    month += 1;
    if (month > 12) { month = 1; year += 1; }
    data.push({
      month: getMonthLabel(`${year}-${String(month).padStart(2, '0')}`),
      actual: null,
      predicted: Math.max(0, Math.round(intercept + slope * (n + i - 1))),
    });
  }
  if (data.length > 12) data[11].predicted = data[11].actual;
  return data;
}

/** Anomaly detection: districts with >20% spike vs 6-month average */
export function buildAnomalies(cases) {
  const byDistrict = {};
  cases.forEach(c => {
    if (!c.districtID || !c.registeredDateObj || isNaN(c.registeredDateObj.getTime())) return;
    const key = `${c.registeredDateObj.getFullYear()}-${String(c.registeredDateObj.getMonth() + 1).padStart(2, '0')}`;
    if (!byDistrict[c.districtID]) byDistrict[c.districtID] = {};
    byDistrict[c.districtID][key] = (byDistrict[c.districtID][key] || 0) + 1;
  });
  const results = [];
  Object.entries(byDistrict).forEach(([id, months]) => {
    const sorted = Object.entries(months).sort((a, b) => a[0].localeCompare(b[0]));
    if (sorted.length < 3) return;
    const last = sorted[sorted.length - 1];
    const prev = sorted.slice(-7, -1);
    if (!prev.length) return;
    const avg = prev.reduce((s, [, v]) => s + v, 0) / prev.length;
    if (!avg) return;
    const pct = ((last[1] - avg) / avg) * 100;
    if (pct > 20) {
      results.push({
        district: districts.find(d => d.DistrictID === Number(id))?.DistrictName || 'Unknown',
        lastCount: last[1], avgCount: Math.round(avg), pctChange: Math.round(pct),
        severity: pct > 50 ? 'Critical' : 'Moderate',
      });
    }
  });
  return results.sort((a, b) => b.pctChange - a.pctChange).slice(0, 6);
}

/** Hotspot: top 10 stations by case volume */
export function buildHotspots(cases) {
  const counts = {};
  cases.forEach(c => {
    if (!counts[c.PoliceStationID]) counts[c.PoliceStationID] = { total: 0, heinous: 0, station: c.policeStationName, district: c.districtName };
    counts[c.PoliceStationID].total += 1;
    if (c.isHeinous) counts[c.PoliceStationID].heinous += 1;
  });
  return Object.values(counts)
    .map(s => ({ ...s, heinousPct: Math.round((s.heinous / s.total) * 100), risk: s.total > 15 ? 'High' : s.total > 8 ? 'Medium' : 'Low' }))
    .sort((a, b) => b.total - a.total).slice(0, 10);
}

/** Prediction KPIs */
export function buildPredictionKPIs(cases) {
  const total = cases.length || 1;
  const csRate = Math.round((cases.filter(c => c.chargesheets?.some(e => e.cstype === 'A')).length / total) * 100);
  const arrestRate = Math.round((cases.filter(c => c.arrests?.length > 0).length / total) * 100);
  const pending = cases.filter(c => c.statusName === 'Under Investigation').length;
  return { csRate, arrestRate, avgDays: 45, expectedClosures: Math.round(pending * (csRate / 100) * 0.3) };
}

export const RISK_ACTIONS = [
  'Increase night patrols in high-density areas',
  'Deploy additional CCTV surveillance units',
  'Initiate community policing programme',
  'Conduct targeted anti-narcotics operations',
  'Strengthen women safety cells and helplines',
  'Enhance cybercrime awareness campaigns',
  'Coordinate with neighbouring district forces',
  'Review and optimise beat allocation',
  'Deploy rapid response vehicles',
  'Establish additional mobile patrol units',
];
