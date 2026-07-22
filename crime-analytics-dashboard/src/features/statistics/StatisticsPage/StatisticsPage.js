import React, { useState, useEffect } from 'react';
import PageHeader from './PageHeader';
import GlobalFiltersBar from './GlobalFiltersBar';
import KpiRow from './KpiRow';
import TrendsSection from './TrendsSection';
import SpatialSection from './SpatialSection';
import CategoryBreakdownSection from './CategoryBreakdownSection';
import TemporalPatternsSection from './TemporalPatternsSection';
import PerformanceSection from './PerformanceSection';
import AiInsightsPanel from './AiInsightsPanel';
import ComparisonsRankingsSection from './ComparisonsRankingsSection';
import ExportFooter from './ExportFooter';
import { statisticsApi } from '../statisticsApi';

const initialFilters = {
  dateRange: 'all',
  startDate: '',
  endDate: '',
  jurisdictionLevel: 'all',
  selectedDistrict: 'all',
  selectedStation: 'all',
  selectedRange: 'all',
  crimeCategory: ['all'],
  caseStatus: 'all',
  severity: 'all',
  gender: 'all',
  ageGroup: 'all'
};

function StatisticsPage({ defaultDistrict = 'all', defaultCrimeType = 'all', defaultDateRange = 'all' }) {
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    selectedDistrict: defaultDistrict,
    crimeCategory: defaultCrimeType !== 'all' ? [String(defaultCrimeType)] : ['all'],
    dateRange: defaultDateRange
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // App theme context retrieved from local HTML element attribute
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');

  // Monitor theme attribute changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(currentTheme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Aggregated data state for every section
  const [pageData, setPageData] = useState({
    summary: {},
    trends: {},
    spatial: {},
    categories: {},
    temporal: {},
    performance: {},
    insights: {},
    rankings: {}
  });

  // Re-fetch all data when filters update
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      statisticsApi.getSummary(filters),
      statisticsApi.getTrends(filters),
      statisticsApi.getMapData(filters),
      statisticsApi.getCategories(filters),
      statisticsApi.getTemporal(filters),
      statisticsApi.getPerformance(filters),
      statisticsApi.getInsights(filters),
      statisticsApi.getRankings(filters)
    ])
      .then(([summary, trends, spatial, categories, temporal, performance, insights, rankings]) => {
        if (!active) return;
        setPageData({
          summary,
          trends,
          spatial,
          categories,
          temporal,
          performance,
          insights,
          rankings,
          filteredList: spatial.filteredCases || []
        });
        setLoading(false);
      })
      .catch(err => {
        if (!active) return;
        console.error('Failed to load statistics indicators', err);
        setError('Failed to fetch analytics metrics. Please retry.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters]);

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const handleDistrictDrillDown = (districtID) => {
    setFilters(prev => ({
      ...prev,
      jurisdictionLevel: 'district',
      selectedDistrict: districtID
    }));
  };

  const handleTimeCellDrillDown = (day, hour) => {
    // Additive drill down logic
    alert(`Applied sub-cohort drilldown filters: ${day} at ${hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour-12} PM` : `${hour} AM`}`);
  };

  // Build active filters summary for header
  const getActiveFilterSummary = () => {
    const parts = [];

    // Date range
    if (filters.dateRange === 'custom') {
      parts.push(`${filters.startDate || 'Start'} to ${filters.endDate || 'End'}`);
    } else {
      const dates = {
        'last_7_days': 'Last 7 Days',
        'last_30_days': 'Last 30 Days',
        'this_month': 'This Month',
        'this_year': 'This Year',
        'last_year': '2025 (Last Year)'
      };
      parts.push(dates[filters.dateRange] || 'All Records');
    }

    // Jurisdiction
    if (filters.jurisdictionLevel === 'all') {
      parts.push('State Level');
    } else if (filters.jurisdictionLevel === 'range') {
      parts.push(`Range: ${filters.selectedRange === 'all' ? 'All' : filters.selectedRange}`);
    } else if (filters.jurisdictionLevel === 'district') {
      parts.push(filters.selectedDistrict === 'all' ? 'All Districts' : `District ${filters.selectedDistrict}`);
    } else if (filters.jurisdictionLevel === 'station') {
      parts.push(filters.selectedStation === 'all' ? 'All Stations' : `Station ${filters.selectedStation}`);
    }

    // Category
    const cats = filters.crimeCategory;
    if (cats.includes('all') || cats.length === 0) {
      parts.push('All Categories');
    } else {
      parts.push(`${cats.length} Categories`);
    }

    return parts.join(' · ');
  };

  return (
    <div className="page-content statistics-page text-inverse" style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
      <PageHeader activeFilterSummary={getActiveFilterSummary()} />

      {/* KSP Secure command status header strip */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', background: 'transparent',
        border: '1px solid var(--border-color)', borderRadius: '0px', marginBottom: '20px',
        fontSize: '13px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00c853', display: 'inline-block' }} />
          <span>KSP SECURE ANALYTICS COMMAND ENGINE ACTIVE</span>
        </div>
        <span className="badge badge-ai" style={{ fontSize: '9px', borderRadius: '0px', padding: '2px 6px', background: 'rgba(56, 151, 216, 0.12)', color: 'var(--accent-primary)', fontWeight: 700 }}>STATISTICS LOGS VALIDATED</span>
      </div>
      
      <GlobalFiltersBar
        filters={filters}
        setFilters={setFilters}
        onReset={handleResetFilters}
      />

      {!loading && !error && (
        <ExportFooter
          filteredCases={pageData.filteredList}
          filterSummary={getActiveFilterSummary()}
        />
      )}

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
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Querying KSP Command Analytical Engine...
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
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reset System
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease' }}>
          {/* KPI Dashboard metrics */}
          <KpiRow summaryData={pageData.summary} />
          
          {/* Main Temporal and YoY Trends */}
          <TrendsSection trendsData={pageData.trends} />
          
          {/* Geographic Hotspot mapping */}
          <SpatialSection
            spatialData={pageData.spatial}
            theme={theme}
            onDistrictClick={handleDistrictDrillDown}
          />
          
          {/* Crime Category breaks and demographics */}
          <CategoryBreakdownSection categoryData={pageData.categories} />
          
          {/* 24x7 matrix grids */}
          <TemporalPatternsSection
            temporalData={pageData.temporal}
            onTimeFilter={handleTimeCellDrillDown}
          />
          
          {/* Clearance rates and audit funnels */}
          <PerformanceSection performanceData={pageData.performance} />
          
          {/* Forecast overlays */}
          <AiInsightsPanel insightsData={pageData.insights} />
          
          {/* Custom ranks and comparison charts */}
          <ComparisonsRankingsSection rankingsData={pageData.rankings} />
          
        </div>
      )}

      {/* Global page command-center theme and keyframes animations */}
      <style>{`
        /* ----------------------------------------------------
           COMMAND CENTER STYLE OVERRIDES FOR STATISTICS
           ---------------------------------------------------- */
        .statistics-page {
          background-color: #faf8f5 !important;
          color: #1e293b !important;
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
        }
        .statistics-page * {
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
        }
        .statistics-page .card,
        .statistics-page .kpi-card,
        .statistics-page select,
        .statistics-page button,
        .statistics-page input,
        .statistics-page .stats-filter-bar-container,
        .statistics-page .stats-page-header,
        .statistics-page .stats-btn {
          border-radius: 0px !important;
          box-shadow: none !important;
        }
        
        /* Light mode elements colors */
        .statistics-page .card,
        .statistics-page .kpi-card,
        .statistics-page .stats-page-header {
          background-color: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
        }
        .statistics-page .stats-filter-bar-container {
          border-top: 1px solid #cbd5e1 !important;
          border-bottom: 1px solid #cbd5e1 !important;
        }
        .statistics-page select,
        .statistics-page input,
        .statistics-page .stats-btn,
        .statistics-page button:not(.header-menu-btn):not(.mobile-filter-header button) {
          border: 1px solid #cbd5e1 !important;
          background-color: #ffffff !important;
          color: #1e293b !important;
        }
        .statistics-page .card-header {
          border-bottom: 1px solid #cbd5e1 !important;
          background: transparent !important;
        }
        
        /* Dark mode overrides */
        .theme-dark .statistics-page,
        [data-theme="dark"] .statistics-page {
          background-color: #0B0E11 !important;
          color: #edf3fb !important;
        }
        .theme-dark .statistics-page .card,
        .theme-dark .statistics-page .kpi-card,
        .theme-dark .statistics-page .stats-page-header,
        [data-theme="dark"] .statistics-page .card,
        [data-theme="dark"] .statistics-page .kpi-card,
        [data-theme="dark"] .statistics-page .stats-page-header {
          background-color: #0B0E11 !important;
          border: 1px solid rgba(173, 193, 214, 0.15) !important;
        }
        .theme-dark .statistics-page select,
        .theme-dark .statistics-page input,
        .theme-dark .statistics-page .stats-btn,
        .theme-dark .statistics-page button:not(.header-menu-btn):not(.mobile-filter-header button),
        [data-theme="dark"] .statistics-page select,
        [data-theme="dark"] .statistics-page input,
        [data-theme="dark"] .statistics-page .stats-btn,
        [data-theme="dark"] .statistics-page button:not(.header-menu-btn):not(.mobile-filter-header button) {
          background-color: #0B0E11 !important;
          border: 1px solid rgba(173, 193, 214, 0.15) !important;
          color: #edf3fb !important;
        }
        .theme-dark .statistics-page .stats-filter-bar-container,
        [data-theme="dark"] .statistics-page .stats-filter-bar-container {
          border-top: 1px solid rgba(173, 193, 214, 0.15) !important;
          border-bottom: 1px solid rgba(173, 193, 214, 0.15) !important;
          background-color: #0B0E11 !important;
        }
        .theme-dark .statistics-page .card-header,
        [data-theme="dark"] .statistics-page .card-header {
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

export default StatisticsPage;
