import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext';
import { useDateFilter } from '../context/DateFilterContext';
import DashboardCharts from '../features/dashboard/DashboardCharts';
import DashboardTables from '../features/dashboard/DashboardTables';
import KarnatakaMap from '../features/dashboard/KarnatakaMap';
import { getCaseViews } from '../services/dataService';
import {
  buildDashboardViewModel,
  filterDashboardCases,
} from '../features/dashboard/dashboardUtils';

function Dashboard({
  selectedDistrict = 'all',
  setSelectedDistrict,
  selectedCrimeType = 'all',
  searchQuery = '',
  dateRange = 'all',
}) {
  const { session } = useSecurity();
  const [cases, setCases] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    getCaseViews()
      .then(rows => {
        if (active) setCases(rows);
      })
      .catch(error => {
        if (active) setLoadError(error.message || 'Unable to load Catalyst Data Store data');
      });
    return () => { active = false; };
  }, []);

  const filteredCases = useMemo(() => {
    return filterDashboardCases({
      cases,
      selectedDistrict,
      selectedCrimeType,
      searchQuery,
      dateRange,
    });
  }, [cases, selectedDistrict, selectedCrimeType, searchQuery, dateRange]);

  const dashboardData = useMemo(() => {
    return buildDashboardViewModel(filteredCases, session.accessLevel, { selectedDistrict });
  }, [filteredCases, session.accessLevel, selectedDistrict]);

  return (
    <div className="page-content dashboard-page text-inverse">
      {loadError && <div role="alert" className="alert alert-danger">Catalyst Data Store: {loadError}</div>}
      {/* Scoped CSS Style Injection */}
      <style>{`
        /* ----------------------------------------------------
           LIGHT MODE (PRIMARY / DEFAULT)
           ---------------------------------------------------- */
        .dashboard-page {
          background-color: #faf8f5 !important;
          color: #1e293b !important;
        }
        .dashboard-page .card {
          background-color: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 0px !important;
          box-shadow: none !important;
          padding: 16px !important;
          margin-bottom: 20px !important;
        }
        .dashboard-page .card-header {
          border-bottom: 1px solid #cbd5e1 !important;
          padding-bottom: 8px !important;
          margin-bottom: 12px !important;
          background: transparent !important;
        }
        .dashboard-page .card-title {
          color: #1e293b !important;
          text-transform: uppercase !important;
          font-size: 16px !important;
          font-weight: 700 !important;
          letter-spacing: 0.05em !important;
          margin: 0 !important;
        }
        .dashboard-page .section-eyebrow {
          color: #64748b !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 1.5px !important;
          margin: 28px 0 10px 0 !important;
          padding-left: 10px !important;
          border-left: 3px solid var(--accent-primary) !important;
          font-weight: bold !important;
        }
        .dashboard-page .card-header .section-eyebrow {
          margin: 0 0 6px 0 !important;
        }
        .dashboard-tables {
          display: grid;
          gap: 20px;
        }
        .dashboard-tables-summary {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
          gap: 20px;
          align-items: stretch;
        }
        .dashboard-page .dashboard-table-card {
          min-width: 0;
          margin: 0 !important;
        }
        .dashboard-serious-table-wrap {
          width: 100%;
          overflow-x: auto;
        }
        .dashboard-serious-table {
          min-width: 760px;
          table-layout: fixed;
        }
        .dashboard-serious-table th:nth-child(1) { width: 28%; }
        .dashboard-serious-table th:nth-child(2) { width: 27%; }
        .dashboard-serious-table th:nth-child(3) { width: 17%; }
        .dashboard-serious-table th:nth-child(4) { width: 18%; }
        .dashboard-serious-table th:nth-child(5) { width: 10%; }
        .dashboard-page .case-station {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 11px;
        }
        .dashboard-page .table-nowrap { white-space: nowrap; }
        .dashboard-page .table-action-column {
          text-align: right !important;
          padding-right: 12px !important;
          white-space: nowrap;
        }
        .dashboard-page .case-status { font-weight: 700; }
        .dashboard-page .case-status-closed { color: #16a34a; }
        .dashboard-page .case-status-active { color: #d97706; }
        .dashboard-page .case-inspect-link {
          color: #2563eb;
          font-weight: 700;
          text-decoration: none;
        }
        .dashboard-page .case-inspect-link:hover { text-decoration: underline; }
        @media (max-width: 1050px) {
          .dashboard-tables-summary { grid-template-columns: 1fr; }
        }
        @media (max-width: 700px) {
          .dashboard-page .card { padding: 12px !important; }
          .dashboard-page .card-title { font-size: 15px !important; }
        }
        .dashboard-page .data-table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        .dashboard-page .data-table th {
          text-transform: uppercase !important;
          font-size: 11px !important;
          color: #64748b !important;
          border-bottom: 1px solid #cbd5e1 !important;
          padding: 8px !important;
          text-align: left !important;
          background: transparent !important;
          font-weight: 600 !important;
          letter-spacing: 0.5px !important;
        }
        .dashboard-page .data-table td {
          padding: 8px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          font-size: 12px !important;
          color: #1e293b !important;
          background: transparent !important;
        }
        .dashboard-page .data-table tbody tr:hover td {
          background-color: rgba(0, 0, 0, 0.02) !important;
        }
        
        /* Ops stats strip styling */
        .ops-stat-strip {
          display: grid !important;
          border: 1px solid #cbd5e1 !important;
          background-color: #ffffff !important;
          margin-bottom: 20px !important;
          border-radius: 0px !important;
        }
        .ops-stat-block {
          padding: 12px 16px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          background-color: #ffffff !important;
        }
        .ops-stat-block:not(:last-child) {
          border-right: 1px solid #cbd5e1 !important;
        }
        .ops-stat-label {
          font-size: 12px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          color: #334155 !important;
          letter-spacing: 0.05em !important;
          margin-bottom: 2px !important;
        }
        .ops-stat-value {
          font-size: 26px !important;
          font-weight: 800 !important;
          color: #0f172a !important;
          margin-bottom: 2px !important;
        }
        .ops-stat-value.is-text-val {
          font-size: 18px !important;
        }
        .ops-stat-value.status-success {
          color: #16a34a !important;
        }
        .ops-stat-value.status-warning {
          color: #d97706 !important;
        }
        .ops-stat-value.status-danger {
          color: #dc2626 !important;
        }
        .ops-stat-caption {
          font-size: 11px !important;
          color: #64748b !important;
          font-weight: normal !important;
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
        }
        
        /* Tooltip styling */
        .chart-tooltip {
          background-color: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 0px !important;
          padding: 8px 12px !important;
        }
        .chart-tooltip-label {
          margin: 0 0 4px 0 !important;
          font-size: 11px !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          color: #64748b !important;
        }
        
        /* ----------------------------------------------------
           DARK MODE (SECONDARY / CONTROL ROOM)
           ---------------------------------------------------- */
        .theme-dark .dashboard-page,
        [data-theme="dark"] .dashboard-page {
          background-color: var(--bg-app) !important;
          color: var(--text-primary) !important;
        }
        .theme-dark .dashboard-page .card,
        [data-theme="dark"] .dashboard-page .card {
          background-color: var(--bg-panel) !important;
          border: 1px solid var(--border-color) !important;
        }
        .theme-dark .dashboard-page .card-header,
        [data-theme="dark"] .dashboard-page .card-header {
          border-bottom: 1px solid var(--border-color) !important;
        }
        .theme-dark .dashboard-page .card-title,
        [data-theme="dark"] .dashboard-page .card-title {
          color: #edf3fb !important;
        }
        .theme-dark .dashboard-page .section-eyebrow,
        [data-theme="dark"] .dashboard-page .section-eyebrow {
          color: #8fa2b8 !important;
        }
        .theme-dark .dashboard-page .data-table th,
        [data-theme="dark"] .dashboard-page .data-table th {
          color: #8fa2b8 !important;
          border-bottom: 1px solid rgba(173, 193, 214, 0.25) !important;
        }
        .theme-dark .dashboard-page .data-table td,
        [data-theme="dark"] .dashboard-page .data-table td {
          border-bottom: 1px solid rgba(173, 193, 214, 0.1) !important;
          color: #edf3fb !important;
        }
        .theme-dark .dashboard-page .data-table tbody tr:hover td,
        [data-theme="dark"] .dashboard-page .data-table tbody tr:hover td {
          background-color: rgba(255, 255, 255, 0.02) !important;
        }
        .theme-dark .dashboard-page .case-station,
        [data-theme="dark"] .dashboard-page .case-station {
          color: var(--text-muted) !important;
        }
        .theme-dark .dashboard-page .case-inspect-link,
        [data-theme="dark"] .dashboard-page .case-inspect-link {
          color: var(--accent-secondary) !important;
        }
        .theme-dark .ops-stat-strip,
        [data-theme="dark"] .ops-stat-strip {
          border: 1px solid var(--border-color) !important;
          background-color: var(--bg-panel) !important;
        }
        .theme-dark .ops-stat-block,
        [data-theme="dark"] .ops-stat-block {
          background-color: var(--bg-panel) !important;
        }
        .theme-dark .ops-stat-block:not(:last-child),
        [data-theme="dark"] .ops-stat-block:not(:last-child) {
          border-right: 1px solid var(--border-color) !important;
        }
        .theme-dark .ops-stat-label,
        [data-theme="dark"] .ops-stat-label {
          color: #cbd5e1 !important;
        }
        .theme-dark .ops-stat-value,
        [data-theme="dark"] .ops-stat-value {
          color: #ffffff !important;
        }
        .theme-dark .ops-stat-value.status-success,
        [data-theme="dark"] .ops-stat-value.status-success {
          color: #4ade80 !important;
        }
        .theme-dark .ops-stat-value.status-warning,
        [data-theme="dark"] .ops-stat-value.status-warning {
          color: #facc15 !important;
        }
        .theme-dark .ops-stat-value.status-danger,
        [data-theme="dark"] .ops-stat-value.status-danger {
          color: #f87171 !important;
        }
        .theme-dark .ops-stat-caption,
        [data-theme="dark"] .ops-stat-caption {
          color: #8fa2b8 !important;
        }
        .theme-dark .chart-tooltip,
        [data-theme="dark"] .chart-tooltip {
          background-color: var(--bg-panel) !important;
          border: 1px solid var(--border-color) !important;
        }
        .theme-dark .chart-tooltip-label,
        [data-theme="dark"] .chart-tooltip-label {
          color: #8fa2b8 !important;
        }
        .theme-dark .chart-tooltip,
        [data-theme="dark"] .chart-tooltip {
          background-color: var(--bg-panel) !important;
          border: 1px solid var(--border-color) !important;
        }
        .theme-dark .chart-tooltip-label,
        [data-theme="dark"] .chart-tooltip-label {
          color: #8fa2b8 !important;
        }
      `}</style>

      {/* Command Status Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', background: 'transparent',
        border: '1px solid var(--border-color)', borderRadius: '0px', marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <div className="session-dot active" />
          <span>KSP SECURE TRANSIT COMMAND SYSTEM ACTIVE</span>
        </div>
        <span className="badge badge-ai" style={{ fontSize: '9px', borderRadius: '0px' }}>AI DISPATCH ENABLED</span>
      </div>

      {/* ── Quick Action Station Strip ─────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        {/* FIR Intake Terminal */}
        <Link to="/digitize" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderLeft: '4px solid #172a43',
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'box-shadow 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(23,42,67,0.12)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            {/* Icon: a stylised document with a pen — no AI imagery */}
            <div style={{
              width: 40, height: 40, flexShrink: 0,
              background: '#172a43',
              borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Plain SVG document + pen — police stationery style */}
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Document outline */}
                <rect x="3" y="1" width="13" height="17" rx="1.5" fill="#1e3a5f" stroke="#93c5fd" strokeWidth="1.2"/>
                {/* Folded corner */}
                <path d="M13 1 L16 4 L13 4 Z" fill="#93c5fd" opacity="0.5"/>
                {/* Lines on doc */}
                <line x1="5.5" y1="7" x2="12.5" y2="7" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round"/>
                <line x1="5.5" y1="10" x2="12.5" y2="10" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round"/>
                <line x1="5.5" y1="13" x2="9.5" y2="13" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round"/>
                {/* Pen tip at bottom-right */}
                <rect x="13" y="14" width="3.5" height="7" rx="0.8" transform="rotate(-40 13 14)" fill="#f59e0b" stroke="#92400e" strokeWidth="0.7"/>
                <path d="M15.5 19.5 L14.8 21.5 L16.2 21.5 Z" fill="#1e293b"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#172a43', letterSpacing: '0.01em' }}>FIR Intake Terminal</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Register new complaint · CCTNS DataStore</div>
            </div>
          </div>
        </Link>

        {/* GIS Crime Map */}
        <Link to="/map" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderLeft: '4px solid #245fa8',
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'box-shadow 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(36,95,168,0.12)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{
              width: 40, height: 40, flexShrink: 0,
              background: '#245fa8',
              borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Map pin */}
                <path d="M11 2C8.24 2 6 4.24 6 7c0 4.25 5 12 5 12s5-7.75 5-12c0-2.76-2.24-5-5-5z" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1.2"/>
                <circle cx="11" cy="7" r="2" fill="#1d4ed8"/>
                {/* Grid lines */}
                <line x1="3" y1="18" x2="19" y2="18" stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="1.5 1.5"/>
                <line x1="3" y1="15" x2="7" y2="15" stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="1.5 1.5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#172a43' }}>GIS Intelligence Map</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Hotspots · District heatmap</div>
            </div>
          </div>
        </Link>

        {/* Operational Briefing */}
        <Link to="/briefing" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderLeft: '4px solid #15803d',
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'box-shadow 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(21,128,61,0.12)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{
              width: 40, height: 40, flexShrink: 0,
              background: '#15803d',
              borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Shield */}
                <path d="M11 2L4 5v5c0 4.42 2.97 8.57 7 9.93C15.03 18.57 18 14.42 18 10V5L11 2z" fill="#166534" stroke="#86efac" strokeWidth="1.2"/>
                {/* Tick */}
                <path d="M8 11L10.5 13.5L14.5 9" stroke="#86efac" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#172a43' }}>Operational Briefing</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Threat assessment · Recommendations</div>
            </div>
          </div>
        </Link>

        {/* Statistics Suite */}
        <Link to="/statistics" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderLeft: '4px solid #7c3aed',
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'box-shadow 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(124,58,237,0.12)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{
              width: 40, height: 40, flexShrink: 0,
              background: '#7c3aed',
              borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Bar chart bars */}
                <rect x="3" y="13" width="4" height="7" rx="0.5" fill="#ddd6fe"/>
                <rect x="9" y="8"  width="4" height="12" rx="0.5" fill="#c4b5fd"/>
                <rect x="15" y="5" width="4" height="15" rx="0.5" fill="#a78bfa"/>
                {/* Baseline */}
                <line x1="2" y1="20" x2="20" y2="20" stroke="#c4b5fd" strokeWidth="1"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#172a43' }}>Crime Statistics</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Patterns · Trends · Rankings</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Condensed Operational Overview KPI Strip */}
      <div className="section-eyebrow">Operational Overview At-A-Glance</div>
      <section className="ops-stat-strip animate-fade-in" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        {dashboardData.opsStats.condensedStats.map((stat, idx) => (
          <div key={idx} className="ops-stat-block">
            <div className="ops-stat-label">{stat.label}</div>
            <div className={`ops-stat-value status-${stat.status}${typeof stat.value === 'string' && isNaN(Number(String(stat.value).replace('%', ''))) ? ' is-text-val' : ''}`}>{stat.value}</div>
            <div className="ops-stat-caption">
              <span>{stat.caption}</span>
            </div>
          </div>
        ))}
      </section>
      
      {/* Map & Charts Middle Section Layout */}
      <div className="grid-2 animate-fade-in" style={{ gap: '20px', marginBottom: '20px', alignItems: 'stretch' }}>
        <article className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', margin: 0, padding: '16px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <div className="section-eyebrow">GIS Overview</div>
              <h3 className="card-title">Karnataka district caseload choropleth</h3>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: '520px' }}>
            <KarnatakaMap
              cases={filteredCases}
              selectedDistrict={selectedDistrict}
              setSelectedDistrict={setSelectedDistrict}
            />
          </div>
        </article>

        <DashboardCharts
          monthlyTrend={dashboardData.monthlyTrend}
          crimeDistribution={dashboardData.crimeDistribution}
          stacked={true}
        />
      </div>

      <DashboardTables
        districtPerformance={dashboardData.districtPerformance}
        recentSeriousFIRs={dashboardData.recentSeriousFIRs}
        alerts={dashboardData.alerts}
      />
    </div>
  );
}

export default Dashboard;
