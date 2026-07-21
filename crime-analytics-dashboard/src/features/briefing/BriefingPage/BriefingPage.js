import React, { useState, useEffect } from 'react';
import BriefingHeader from './BriefingHeader';
import BriefingFiltersBar from './BriefingFiltersBar';
import ExecutiveSummaryKpiRow from './ExecutiveSummaryKpiRow';
import NarrativeSummaryPanel from './NarrativeSummaryPanel';
import AlertCardRow from './AlertCardRow';
import SituationalMapSection from './SituationalMapSection';
import TrendChartsSection from './TrendChartsSection';
import ComparisonSection from './ComparisonSection';
import CategoryDemographicsOpsSection from './CategoryDemographicsOpsSection';
import RecommendationsPane from './RecommendationsPane';
import UpcomingEventsInterAgencySection from './UpcomingEventsInterAgencySection';
import BriefingFooter from './BriefingFooter';
import { briefingApi } from '../briefingApi';
import { useSecurity } from '../../../context/SecurityContext';

const initialFilters = {
  dateRange: 'last_7_days',
  startDate: '',
  endDate: '',
  jurisdictionLevel: 'all',
  selectedDistrict: 'all',
  selectedStation: 'all',
  selectedRange: 'all',
  crimeCategory: ['all'],
  threatLevel: 'all',
  includeSources: ['NCRB', 'OSINT'],
  classificationOnly: false,
  viewMode: 'analyst' // 'analyst' vs 'data_only'
};

function BriefingPage() {
  const { session } = useSecurity();
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // App theme context retrieved from html attribute
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');

  // Monitor theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(currentTheme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const [data, setData] = useState({
    summary: {},
    narrative: [],
    incidents: {},
    mapData: {},
    trends: {},
    comparisons: [],
    categories: {},
    operations: {},
    events: {},
    recommendations: []
  });

  // Re-fetch all data on filter changes
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      briefingApi.getSummary(filters),
      briefingApi.getNarrative(filters),
      briefingApi.getIncidents(filters),
      briefingApi.getMapData(filters),
      briefingApi.getTrends(filters),
      briefingApi.getComparisons(filters),
      briefingApi.getCategories(filters),
      briefingApi.getOperations(filters),
      briefingApi.getEvents(filters),
      briefingApi.getRecommendations(filters)
    ])
      .then(([summary, narrative, incidents, mapData, trends, comparisons, categories, operations, events, recommendations]) => {
        if (!active) return;
        setData({
          summary,
          narrative,
          incidents,
          mapData,
          trends,
          comparisons,
          categories,
          operations,
          events,
          recommendations
        });
        setLoading(false);
      })
      .catch(err => {
        if (!active) return;
        console.error('Failed to load daily briefing metrics', err);
        setError('Failed to fetch command briefing data. Please retry.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters]);

  const handleResetFilters = () => {
    const isLocked = session && session.unitName && session.unitName !== 'State Control Room' && session.unitName !== 'command center' && session.unitName !== '';
    if (isLocked) {
      setFilters(prev => ({
        ...initialFilters,
        jurisdictionLevel: prev.jurisdictionLevel,
        selectedDistrict: prev.selectedDistrict,
        selectedStation: prev.selectedStation
      }));
    } else {
      setFilters(initialFilters);
    }
  };

  const handleDistrictDrillDown = (districtID) => {
    setFilters(prev => ({
      ...prev,
      jurisdictionLevel: 'district',
      selectedDistrict: districtID
    }));
  };

  // Build breadcrumb indicator text
  const getActiveFilterSummary = () => {
    const parts = [];

    // Date
    if (filters.dateRange === 'custom') {
      parts.push(`${filters.startDate || 'Start'} to ${filters.endDate || 'End'}`);
    } else {
      const dates = {
        'last_24h': 'Last 24 Hours',
        'last_7_days': 'Last 7 Days'
      };
      parts.push(dates[filters.dateRange] || 'All Records');
    }

    // Geography
    if (filters.jurisdictionLevel === 'all') {
      parts.push('State Level');
    } else if (filters.jurisdictionLevel === 'range') {
      parts.push(`Range: ${filters.selectedRange}`);
    } else if (filters.jurisdictionLevel === 'district') {
      parts.push(`District: ${filters.selectedDistrict}`);
    } else if (filters.jurisdictionLevel === 'station') {
      parts.push(`Station: ${filters.selectedStation}`);
    }

    // Threat level
    if (filters.threatLevel !== 'all') {
      parts.push(`Threat: ${filters.threatLevel.toUpperCase()}`);
    }

    // Classification
    if (filters.classificationOnly) {
      parts.push('INTELLIGENCE GRADE ONLY');
    }

    return parts.join(' · ');
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="page-content briefing-page text-inverse" style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
      
      {/* 1. Header & Metadata Bar */}
      <BriefingHeader activeFilterSummary={getActiveFilterSummary()} onExport={handleExportPDF} />

      {/* Secure Command Status Banner matching Dashboard.js */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', background: 'transparent',
        border: '1px solid var(--border-color)', borderRadius: '0px', marginBottom: '20px',
        fontSize: '13px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00c853', display: 'inline-block' }} />
          <span>KSP SECURE TRANSIT COMMAND SYSTEM ACTIVE — BRIEFING LOGS ONLINE</span>
        </div>
        <span className="badge badge-ai" style={{ fontSize: '9px', borderRadius: '0px', padding: '2px 6px', background: 'rgba(56,151,216,0.12)', color: 'var(--accent-primary)', fontWeight: 700 }}>AI DISPATCH ENABLED</span>
      </div>

      {/* 2. Global Filters & Controls */}
      <BriefingFiltersBar
        filters={filters}
        setFilters={setFilters}
        onReset={handleResetFilters}
      />

      {loading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          padding: '60px 0',
          gap: '16px'
        }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--border-color)',
            borderTop: '4px solid var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Retrieving Security Fusion Briefing...
          </span>
        </div>
      ) : error ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'var(--accent-danger)'
        }}>
          <p>{error}</p>
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              padding: '8px 16px',
              background: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '0px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reset Systems
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease' }}>
          
          {/* 3. Executive Summary KPI Row */}
          <ExecutiveSummaryKpiRow summary={data.summary} />

          {/* 4. Narrative Summary (Key Findings) */}
          {filters.viewMode === 'analyst' && (
            <NarrativeSummaryPanel narrative={data.narrative} />
          )}

          {/* 5. Threat & Incident Alert Row */}
          <AlertCardRow incidents={data.incidents} />

          {/* 6. Situational Map + Hotspot List (split layout) */}
          <SituationalMapSection
            mapData={data.mapData}
            theme={theme}
            onDistrictClick={handleDistrictDrillDown}
          />

          {/* 7. Trend Charts Section */}
          <TrendChartsSection trends={data.trends} />

          {/* 8. District/Unit Comparison Section */}
          <ComparisonSection comparisons={data.comparisons} />

          {/* 9 & 10. Demographics, Resource Readiness & Actions */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <CategoryDemographicsOpsSection categoriesData={data.categories} operations={data.operations} />
            <RecommendationsPane recommendations={data.recommendations} />
          </div>

          {/* 11 & 12. Upcoming Events & Footers */}
          <UpcomingEventsInterAgencySection eventsData={data.events} />
          
          <BriefingFooter summary={data.summary} onExport={handleExportPDF} />
        </div>
      )}

      {/* Command Center CSS variables and font styles injected scoped */}
      <style>{`
        /* ----------------------------------------------------
           COMMAND CENTER THEME COPIED TO BRIEFING
           ---------------------------------------------------- */
        .briefing-page {
          background-color: #faf8f5 !important;
          color: #1e293b !important;
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
        }
        .briefing-page * {
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
        }
        .briefing-page .card,
        .briefing-page .kpi-card,
        .briefing-page select,
        .briefing-page button,
        .briefing-page input,
        .briefing-page .stats-filter-bar-container,
        .briefing-page .stats-page-header,
        .briefing-page .stats-btn {
          border-radius: 0px !important;
          box-shadow: none !important;
        }
        
        /* Light mode elements colors */
        .briefing-page .card,
        .briefing-page .kpi-card,
        .briefing-page .stats-page-header {
          background-color: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
        }
        .briefing-page .stats-filter-bar-container {
          border-top: 1px solid #cbd5e1 !important;
          border-bottom: 1px solid #cbd5e1 !important;
        }
        .briefing-page select,
        .briefing-page input,
        .briefing-page .stats-btn,
        .briefing-page button:not(.header-menu-btn):not(.mobile-filter-header button) {
          border: 1px solid #cbd5e1 !important;
          background-color: #ffffff !important;
          color: #1e293b !important;
        }
        .briefing-page .card-header {
          border-bottom: 1px solid #cbd5e1 !important;
          background: transparent !important;
        }
        
        /* Dark mode overrides */
        .theme-dark .briefing-page,
        [data-theme="dark"] .briefing-page {
          background-color: #0B0E11 !important;
          color: #edf3fb !important;
        }
        .theme-dark .briefing-page .card,
        .theme-dark .briefing-page .kpi-card,
        .theme-dark .briefing-page .stats-page-header,
        [data-theme="dark"] .briefing-page .card,
        [data-theme="dark"] .briefing-page .kpi-card,
        [data-theme="dark"] .briefing-page .stats-page-header {
          background-color: #0B0E11 !important;
          border: 1px solid rgba(173, 193, 214, 0.15) !important;
        }
        .theme-dark .briefing-page select,
        .theme-dark .briefing-page input,
        .theme-dark .briefing-page .stats-btn,
        .theme-dark .briefing-page button:not(.header-menu-btn):not(.mobile-filter-header button),
        [data-theme="dark"] .briefing-page select,
        [data-theme="dark"] .briefing-page input,
        [data-theme="dark"] .briefing-page .stats-btn,
        [data-theme="dark"] .briefing-page button:not(.header-menu-btn):not(.mobile-filter-header button) {
          background-color: #0B0E11 !important;
          border: 1px solid rgba(173, 193, 214, 0.15) !important;
          color: #edf3fb !important;
        }
        .theme-dark .briefing-page .stats-filter-bar-container,
        [data-theme="dark"] .briefing-page .stats-filter-bar-container {
          border-top: 1px solid rgba(173, 193, 214, 0.15) !important;
          border-bottom: 1px solid rgba(173, 193, 214, 0.15) !important;
          background-color: #0B0E11 !important;
        }
        .theme-dark .briefing-page .card-header,
        [data-theme="dark"] .briefing-page .card-header {
          border-bottom: 1px solid rgba(173, 193, 214, 0.15) !important;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default BriefingPage;
