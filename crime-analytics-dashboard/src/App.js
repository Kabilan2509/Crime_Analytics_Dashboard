import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

/* Layout components */
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import EmergencyTicker from './components/EmergencyTicker';
import AccessibilityToolbar from './components/AccessibilityToolbar';

/* Core Pages (eagerly loaded) */
import Dashboard from './pages/Dashboard';
import CrimeMap from './pages/CrimeMap';
import Statistics from './pages/Statistics';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

/* Contexts */
import { SecurityProvider } from './context/SecurityContext';
import { DateFilterProvider } from './context/DateFilterContext';
import { getCaseViews } from './services/dataService';

/* AI Pages (lazy-loaded for performance) */
const Briefing = lazy(() => import('./pages/Briefing'));
const Copilot = lazy(() => import('./pages/Copilot'));
const NetworkGraph = lazy(() => import('./pages/NetworkGraph'));
const Predictions = lazy(() => import('./pages/Predictions'));
const EvidenceCorrelation = lazy(() => import('./pages/EvidenceCorrelation'));

/* New Command Center Pages */
const CaseOverview = lazy(() => import('./pages/CaseOverview'));
const EvidenceWorkspace = lazy(() => import('./pages/EvidenceWorkspace'));
const SuspectTimeline = lazy(() => import('./pages/SuspectTimeline'));
const UserManagement = lazy(() => import('./pages/UserManagement'));

/* Loading fallback for lazy pages */
function PageLoader({ compact = false }) {
  return (
    <div className={`page-loader government-loader${compact ? ' compact' : ''}`} role="status" aria-live="polite">
      <div className="government-loader-seal">
        <img src={`${process.env.PUBLIC_URL}/ksp-emblem.png`} alt="Karnataka State Police emblem" />
      </div>
      <div className="government-loader-heading">
        <span className="government-loader-kicker">Government of Karnataka</span>
        <strong>Karnataka State Police</strong>
        <span>MADHUKAR Dashboard</span>
        <span>Modern Analytics and Data Hub for User Friendly Karnataka Anti Crime Response Dashboard</span>
      </div>
      <div className="government-loader-progress" aria-hidden="true"><span /></div>
      <span className="government-loader-status">Securely loading operational data</span>
    </div>
  );
}

function AdaptiveFilterBar(props) {
  const location = useLocation();
  const usesGlobalScopeFilters = location.pathname === '/' || location.pathname.startsWith('/predictions');
  return usesGlobalScopeFilters ? <FilterBar {...props} /> : null;
}

function MainContentWrapper({ children }) {
  const location = useLocation();
  const isMapRoute = location.pathname.startsWith('/map');
  const isCopilotRoute = location.pathname.startsWith('/copilot');
  const contentClassName = isMapRoute
    ? 'main-content-map'
    : `main-content${isCopilotRoute ? ' main-content-copilot' : ''}`;
  return (
    <main id="main-content" tabIndex="-1" className={contentClassName}>
      {children}
    </main>
  );
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('ksp-theme') || 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('ksp-sidebar-collapsed') === 'true');
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState('');

  /* Global scope filters */
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedCrimeType, setSelectedCrimeType] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ksp-theme', theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    getCaseViews().then(() => {
      if (active) setDataReady(true);
    }).catch(error => {
      console.error('Catalyst data bootstrap failed:', error);
      if (active) setDataError(error.message || 'Unable to load Catalyst Data Store');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleThemeChange = (e) => {
      setTheme(e.detail);
    };
    window.addEventListener('ksp-theme-change', handleThemeChange);
    return () => window.removeEventListener('ksp-theme-change', handleThemeChange);
  }, []);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  const handleSidebarToggle = () => {
    if (window.matchMedia('(max-width: 1080px)').matches) {
      setSidebarOpen(open => !open);
      return;
    }
    setSidebarCollapsed(collapsed => {
      const next = !collapsed;
      localStorage.setItem('ksp-sidebar-collapsed', String(next));
      return next;
    });
  };

  const filterProps = {
    selectedDistrict, setSelectedDistrict,
    selectedCrimeType, setSelectedCrimeType,
    dateRange, setDateRange,
    searchQuery, setSearchQuery,
  };

  if (dataError) {
    return <div role="alert" className="page-loader">Catalyst Data Store: {dataError}</div>;
  }

  if (!dataReady) return <PageLoader />;

  return (
    <SecurityProvider>
      <DateFilterProvider>
        <Router basename="/app">
          <div className={`app-shell theme-${theme}${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
            <a className="skip-link" href="#main-content">Skip to main content</a>
            <Sidebar isOpen={sidebarOpen} isCollapsed={sidebarCollapsed} onClose={() => setSidebarOpen(false)} />
            <div className="app-main">
              <EmergencyTicker />
              <Header
                theme={theme}
                onToggleTheme={toggleTheme}
                onToggleSidebar={handleSidebarToggle}
                sidebarCollapsed={sidebarCollapsed}
                sidebarOpen={sidebarOpen}
              />
              <AdaptiveFilterBar {...filterProps} />
              <MainContentWrapper>
                <Suspense fallback={<PageLoader compact />}>
                  <Routes>
                    {/* Core / Operations Pages */}
                    <Route path="/" element={<Dashboard {...filterProps} />} />

                    {/* Investigations Pages */}
                    <Route path="/cases" element={<CaseOverview />} />
                    <Route path="/cases/:caseId" element={<CaseOverview />} />
                    <Route path="/case-overview" element={<CaseOverview />} />
                    <Route path="/case-overview/:caseId" element={<CaseOverview />} />
                    <Route path="/evidence" element={<EvidenceWorkspace />} />
                    <Route path="/evidence/:caseId" element={<EvidenceWorkspace />} />
                    <Route path="/evidence-workspace" element={<EvidenceWorkspace />} />
                    <Route path="/evidence-workspace/:caseId" element={<EvidenceWorkspace />} />
                    <Route path="/suspect-timeline" element={<SuspectTimeline />} />
                    <Route path="/suspect-timeline/:caseId" element={<SuspectTimeline />} />
                    <Route path="/network" element={<NetworkGraph />} />

                    {/* Analytics Pages */}
                    <Route path="/map" element={<CrimeMap {...filterProps} />} />
                    <Route path="/statistics" element={<Statistics {...filterProps} />} />
                    <Route path="/reports" element={<Reports {...filterProps} />} />
                    <Route path="/predictions" element={<Predictions {...filterProps} />} />

                    {/* Admin Pages */}
                    <Route path="/admin/users" element={<UserManagement />} />
                    <Route path="/settings" element={<Settings />} />

                    {/* AI / Legacy Pages */}
                    <Route path="/briefing" element={<Briefing />} />
                    <Route path="/copilot" element={<Copilot />} />
                    <Route path="/evidence-correlation" element={<EvidenceCorrelation />} />
                  </Routes>
                </Suspense>
              </MainContentWrapper>
            </div>
          </div>
          <AccessibilityToolbar />
        </Router>
      </DateFilterProvider>
    </SecurityProvider>
  );
}

export default App;
