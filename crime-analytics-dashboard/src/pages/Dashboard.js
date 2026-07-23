import React, { useEffect, useMemo, useState } from 'react';
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
    return buildDashboardViewModel(filteredCases, session.accessLevel);
  }, [filteredCases, session.accessLevel]);

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
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
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
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
          text-transform: uppercase !important;
          font-size: 18px !important;
          font-weight: 700 !important;
          letter-spacing: 1.2px !important;
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
        .dashboard-page .data-table {
          width: 100% !important;
          border-collapse: collapse !important;
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
        }
        .dashboard-page .data-table th {
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
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
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
          font-size: 19px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          color: #334155 !important;
          letter-spacing: 0.5px !important;
          margin-bottom: 2px !important;
        }
        .ops-stat-value {
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
          font-size: 29px !important;
          font-weight: 800 !important;
          color: #0f172a !important;
          margin-bottom: 2px !important;
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
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
          font-size: 9.5px !important;
          color: #64748b !important;
          font-style: italic !important;
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
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
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
          background-color: #0B0E11 !important;
          color: #edf3fb !important;
        }
        .theme-dark .dashboard-page .card,
        [data-theme="dark"] .dashboard-page .card {
          background-color: #0B0E11 !important;
          border: 1px solid rgba(173, 193, 214, 0.15) !important;
        }
        .theme-dark .dashboard-page .card-header,
        [data-theme="dark"] .dashboard-page .card-header {
          border-bottom: 1px solid rgba(173, 193, 214, 0.15) !important;
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
        .theme-dark .ops-stat-strip,
        [data-theme="dark"] .ops-stat-strip {
          border: 1px solid rgba(173, 193, 214, 0.15) !important;
          background-color: #0B0E11 !important;
        }
        .theme-dark .ops-stat-block,
        [data-theme="dark"] .ops-stat-block {
          background-color: #0B0E11 !important;
        }
        .theme-dark .ops-stat-block:not(:last-child),
        [data-theme="dark"] .ops-stat-block:not(:last-child) {
          border-right: 1px solid rgba(173, 193, 214, 0.15) !important;
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
          background-color: #0B0E11 !important;
          border: 1px solid rgba(30, 144, 255, 0.3) !important;
        }
        .theme-dark .chart-tooltip-label,
        [data-theme="dark"] .chart-tooltip-label {
          color: #8fa2b8 !important;
        }
        .theme-dark .chart-tooltip,
        [data-theme="dark"] .chart-tooltip {
          background-color: #0B0E11 !important;
          border: 1px solid rgba(30, 144, 255, 0.3) !important;
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

      {/* Condensed Operational Overview KPI Strip */}
      <div className="section-eyebrow">Operational Overview At-A-Glance</div>
      <section className="ops-stat-strip animate-fade-in" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        {dashboardData.opsStats.condensedStats.map((stat, idx) => (
          <div key={idx} className="ops-stat-block">
            <div className="ops-stat-label">{stat.label}</div>
            <div className={`ops-stat-value status-${stat.status}`}>{stat.value}</div>
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
