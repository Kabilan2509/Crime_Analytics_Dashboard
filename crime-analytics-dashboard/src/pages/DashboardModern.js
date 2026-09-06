import React, { useEffect, useMemo, useState } from 'react';
import {
  MdArrowForward, MdCheckCircle, MdGavel, MdOutlineShield,
  MdPendingActions, MdTrendingUp, MdWarningAmber,
  MdMap, MdBarChart, MdDescription, MdSmartToy, MdHub,
  MdAutoGraph, MdPeople, MdLink, MdFolderOpen, MdPsychology,
  MdSettings, MdSecurity, MdAccessTime,
} from 'react-icons/md';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext';
import KarnatakaMap from '../features/dashboard/KarnatakaMap';
import { getCaseViews, getCronThreatAlerts, triggerCronThreatAssess } from '../services/dataService';
import { buildDashboardViewModel, filterDashboardCases } from '../features/dashboard/dashboardUtils';
import './DashboardModern.css';

const STAT_ICONS = [MdOutlineShield, MdGavel, MdCheckCircle, MdPendingActions];
const STAT_TONES = ['blue', 'red', 'green', 'amber'];

function DashboardTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="md-tooltip">
      <strong>{label}</strong>
      {payload.map(item => (
        <span key={item.dataKey} style={{ color: item.color }}>{item.name}: {Number(item.value).toLocaleString()}</span>
      ))}
    </div>
  );
}

function Panel({ eyebrow, title, action, children, className = '' }) {
  return (
    <section className={`md-panel ${className}`}>
      <header className="md-panel-head">
        <div>
          {eyebrow && <span>{eyebrow}</span>}
          <h3>{title}</h3>
        </div>
        {action}
      </header>
      <div className="md-panel-body">{children}</div>
    </section>
  );
}

function DashboardModern({
  selectedDistrict = 'all', setSelectedDistrict,
  selectedCrimeType = 'all', searchQuery = '', dateRange = 'all',
}) {
  const navigate = useNavigate();
  const { session } = useSecurity();
  const [cases, setCases] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [activeConsoleTab, setActiveConsoleTab] = useState('ops');
  const [lang, setLang] = useState(() => localStorage.getItem('ksp-language') || 'en');

  useEffect(() => {
    const handleLangChange = (e) => setLang(e.detail);
    window.addEventListener('ksp-language-change', handleLangChange);
    return () => window.removeEventListener('ksp-language-change', handleLangChange);
  }, []);

  const TRANSLATIONS = {
    en: {
      kicker: "State Operations Centre",
      title: "Crime Intelligence Overview",
      subtitle: "Live operational picture across Karnataka police districts",
      statusOnline: "KSP Command Systems Online",
      tabOps: "Operational Controls",
      tabAi: "AI Intelligence Services",
      tabInv: "Investigation Hub",
      cardMapTitle: "GIS Operations Map",
      cardMapDesc: "Interactive spatial density mapping, hot-spots, and division statistics.",
      cardStatsTitle: "Temporal Crime Statistics",
      cardStatsDesc: "Examine temporal patterns (hourly, weekly, and monthly) and breakdowns.",
      cardReportsTitle: "Operational Reports Hub",
      cardReportsDesc: "Generate daily intelligence briefings, monthly logs, and UCR sheets.",
      cardCopilotTitle: "MADHUKAR AI Copilot",
      cardCopilotDesc: "Interact with the data using natural language queries powered by AI.",
      cardNetworkTitle: "Criminal Network Analyst",
      cardNetworkDesc: "Visualize crime networks, accused-victim connections, and station links.",
      cardPredTitle: "AI Predictive Modeling",
      cardPredDesc: "Analyze upcoming crime risk scoring, area forecasts, and alerts.",
      cardCasesTitle: "Case Registry Overview",
      cardCasesDesc: "Officer case register with filtering, PII redactions, and records review.",
      cardTimelineTitle: "Suspect Timeline Tracker",
      cardTimelineDesc: "Track and audit criminal timeline across multiple operational periods.",
      cardEvidenceTitle: "Evidence Workspace",
      cardEvidenceDesc: "Correlate evidence attachments, digital evidence, and file records.",
      mapPanelTitle: "Karnataka crime density",
      mapPanelEyebrow: "Geospatial intelligence",
      trendPanelTitle: "Monthly crime and resolution trend",
      trendPanelEyebrow: "January–December 2024",
      categoryPanelTitle: "Crime by category",
      categoryPanelEyebrow: "Case classification",
      casesPanelTitle: "Recent serious cases",
      casesPanelEyebrow: "Live case registry",
      alertsPanelTitle: "Active alerts",
      alertsPanelEyebrow: "Realtime intelligence",
      viewAll: "View all",
      live: "Live",
      newAlerts: "new",
      colCrimeNo: "Crime no.",
      colDistrict: "District / station",
      colOffence: "Offence",
      colStatus: "Status",
      cardCronTitle: "Run Catalyst Cron Audit"
    },
    kn: {
      kicker: "ರಾಜ್ಯ ಕಾರ್ಯಾಚರಣೆ ಕೇಂದ್ರ",
      title: "ಅಪರಾಧ ಗುಪ್ತಚರ ಅವಲೋಕನ",
      subtitle: "ಕರ್ನಾಟಕದ ಪೊಲೀಸ್ ಜಿಲ್ಲೆಗಳ ನೇರ ಕಾರ್ಯಾಚರಣೆಯ ವಿವರ",
      statusOnline: "ಕೆಎಸ್ಪಿ ನಿಯಂತ್ರಣ ವ್ಯವಸ್ಥೆ ಸಕ್ರಿಯವಾಗಿದೆ",
      tabOps: "ಕಾರ್ಯಾಚರಣೆ ನಿಯಂತ್ರಣಗಳು",
      tabAi: "ಎಐ ಗುಪ್ತಚರ ಸೇವೆಗಳು",
      tabInv: "ತನಿಖಾ ಕೇಂದ್ರ",
      cardMapTitle: "ಜಿಐಎಸ್ ಕಾರ್ಯಾಚರಣೆ ಭೂಪಟ",
      cardMapDesc: "ಸಂವಾದಾತ್ಮಕ ಅಪರಾಧ ಸಾಂದ್ರತೆಯ ನಕ್ಷೆ, ಹಾಟ್-ಸ್ಪಾಟ್‌ಗಳು ಮತ್ತು ಅಂಕಿಅಂಶಗಳು.",
      cardStatsTitle: "ಅಪರಾಧ ಅಂಕಿಅಂಶಗಳು",
      cardStatsDesc: "ಅಪರಾಧದ ಸಮಯದ ಮಾದರಿಗಳು (ಗಂಟೆ, ವಾರ ಮತ್ತು ಮಾಸಿಕ ವಿವರ) ವಿಶ್ಲೇಷಿಸಿ.",
      cardReportsTitle: "ಕಾರ್ಯಾಚರಣೆ ವರದಿಗಳು",
      cardReportsDesc: "ದೈನಂದಿನ ಗುಪ್ತಚರ ಬ್ರೀಫಿಂಗ್‌ಗಳು, ಮಾಸಿಕ ಲಾಗ್‌ಗಳು ಮತ್ತು ಯುಸಿಆರ್ ಪತ್ರಿಕೆಗಳು.",
      cardCopilotTitle: "ಮಧುಕರ್ ಎಐ ಸಹಾಯಕ",
      cardCopilotDesc: "ಎಐ ಆಧಾರಿತ ನೈಸರ್ಗಿಕ ಭಾಷೆಯ ಮೂಲಕ ದತ್ತಾಂಶದೊಂದಿಗೆ ಸಂವಹನ ನಡೆಸಿ.",
      cardNetworkTitle: "ಅಪರಾಧ ಜಾಲ ವಿಶ್ಲೇಷಕ",
      cardNetworkDesc: "ಅಪರಾಧ ಜಾಲಗಳು, ಆರೋಪಿ-ಸಂತ್ರಸ್ತರ ಸಂಬಂಧಗಳು ಮತ್ತು ಠಾಣಾ ಲಿಂಕ್‌ಗಳನ್ನು ನೋಡಿ.",
      cardPredTitle: "ಎಐ ಭವಿಷ್ಯಸೂಚಕ ಮಾದರಿ",
      cardPredDesc: "ಅಪರಾಧದ ಅಪಾಯದ ಅಂಕಗಳು, ಪ್ರದೇಶದ ಮುನ್ಸೂಚನೆಗಳು ಮತ್ತು ಎಚ್ಚರಿಕೆಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಿ.",
      cardCasesTitle: "ಪ್ರಕರಣಗಳ ದಾಖಲಾತಿ",
      cardCasesDesc: "ಶೋಧನೆ ಮತ್ತು ರೆಡಾಕ್ಷನ್‌ಗಳೊಂದಿಗೆ ಅಧಿಕಾರಿಗಳ ಪ್ರಕರಣಗಳ ನೋಂದಣಿ ಪಟ್ಟಿ.",
      cardTimelineTitle: "ಶಂಕಿತರ ಕಾಲಗತಿ ಟ್ರ್ಯಾಕರ್",
      cardTimelineDesc: "ವಿವಿಧಿ ಕಾರ್ಯಾಚರಣೆಯ ಅವಧಿಗಳಲ್ಲಿ ಅಪರಾಧಿಗಳ ಚಟುವಟಿಕೆಗಳ ಕಾಲಗತಿಯನ್ನು ಆಡಿಟ್ ಮಾಡಿ.",
      cardEvidenceTitle: "ಸಾಕ್ಷ್ಯಧಾರಗಳ ಕಾರ್ಯಸ್ಥಳ",
      cardEvidenceDesc: "ಅಪರಾಧ ಸ್ಥಳದ ಸಾಕ್ಷ್ಯಾಧಾರಗಳು, ಡಿಜಿಟಲ್ ಫೈಲ್‌ಗಳು ಮತ್ತು ದಾಖಲೆಗಳನ್ನು ಜೋಡಿಸಿ.",
      mapPanelTitle: "ಕರ್ನಾಟಕ ಅಪರಾಧ ಸಾಂದ್ರತೆ",
      mapPanelEyebrow: "ಭೌಗೋಳಿಕ ಜಾಣ್ಮೆ",
      trendPanelTitle: "ಮಾಸಿಕ ಅಪರಾಧ ಮತ್ತು ತನಿಖಾ ಪ್ರಗತಿ",
      trendPanelEyebrow: "ಜನವರಿ-ಡಿಸೆಂಬರ್ 2024",
      categoryPanelTitle: "ವರ್ಗಾವಾರು ಅಪರಾಧ",
      categoryPanelEyebrow: "ಪ್ರಕರಣಗಳ ವರ್ಗೀಕರಣ",
      casesPanelTitle: "ಇತ್ತೀಚಿನ ಗಂಭೀರ ಪ್ರಕರಣಗಳು",
      casesPanelEyebrow: "ಲೈವ್ ಪ್ರಕರಣಗಳ ನೋಂದಣಿ",
      alertsPanelTitle: "ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳು",
      alertsPanelEyebrow: "ನೈಜ ಸಮಯದ ಗುಪ್ತಚರ",
      viewAll: "ಎಲ್ಲವನ್ನೂ ವೀಕ್ಷಿಸಿ",
      live: "ಲೈವ್",
      newAlerts: "ಹೊಸ",
      colCrimeNo: "ಪ್ರಕರಣ ಸಂಖ್ಯೆ",
      colDistrict: "ಜಿಲ್ಲೆ / ಪೊಲೀಸ್ ಠಾಣೆ",
      colOffence: "ಅಪರಾಧದ ವಿವರ",
      colStatus: "ಸ್ಥಿತಿ",
      cardCronTitle: "ಕ್ರಾನ್ ಆಡಿಟ್ ರನ್ ಮಾಡಿ"
    }
  };

  const t = TRANSLATIONS[lang];

  const [cronAlerts, setCronAlerts] = useState([]);
  const [isRunningCron, setIsRunningCron] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCaseViews()
      .then(rows => mounted && setCases(rows))
      .catch(error => mounted && setLoadError(error.message || 'Unable to load operational data'));

    getCronThreatAlerts()
      .then(res => {
        if (mounted && res?.alerts) setCronAlerts(res.alerts);
      })
      .catch(() => {});

    return () => { mounted = false; };
  }, []);

  const runSchedulerCron = async () => {
    if (isRunningCron) return;
    setIsRunningCron(true);
    try {
      const res = await triggerCronThreatAssess();
      if (res?.success) {
        const updated = await getCronThreatAlerts();
        setCronAlerts(updated.alerts || []);
        alert(lang === 'kn' 
          ? `ಕ್ರಾನ್ ಯಶಸ್ವಿಯಾಗಿದೆ! ${res.alertsGenerated} ವಿಳಂಬ ಎಚ್ಚರಿಕೆಗಳನ್ನು ಕ್ಯಾಶ್ ಮಾಡಲಾಗಿದೆ.` 
          : `Catalyst Cron Run Successful!\nGenerated & cached ${res.alertsGenerated} critical delay alerts from Datastore.`
        );
      }
    } catch (err) {
      alert(`Cron execution failed: ${err.message}`);
    } finally {
      setIsRunningCron(false);
    }
  };

  const filteredCases = useMemo(() => filterDashboardCases({
    cases, selectedDistrict, selectedCrimeType, searchQuery, dateRange,
  }), [cases, selectedDistrict, selectedCrimeType, searchQuery, dateRange]);

  const data = useMemo(
    () => buildDashboardViewModel(filteredCases, session.accessLevel, { selectedDistrict }),
    [filteredCases, session.accessLevel, selectedDistrict],
  );

  const renderStatLabel = (label) => {
    if (lang !== 'kn') return label;
    if (label === 'High-Risk Status') return 'ಅಪಾಯದ ಸ್ಥಿತಿ';
    if (label === 'High-Risk Districts') return 'ಹೆಚ್ಚಿನ ಅಪಾಯದ ಜಿಲ್ಲೆಗಳು';
    if (label === 'FIR Registered') return 'ದಾಖಲಾದ ಎಫ್‌ಐಆರ್‌ಗಳು';
    if (label === 'Heinous Crime Cases') return 'ಗಂಭೀರ ಅಪರಾಧ ಪ್ರಕರಣಗಳು';
    if (label === 'Case Clearance Rate') return 'ಪ್ರಕರಣ ವಿಲೇವಾರಿ ದರ';
    return label;
  };

  const renderStatValue = (val) => {
    if (lang !== 'kn') return val;
    if (val === 'High Risk') return 'ಹೆಚ್ಚಿನ ಅಪಾಯ';
    if (val === 'Moderate Risk') return 'ಮಧ್ಯಮ ಅಪಾಯ';
    if (val === 'Low Risk') return 'ಕಡಿಮೆ ಅಪಾಯ';
    return val;
  };

  return (
    <div className="md-dashboard">
      {/* Scope CSS Style Overrides to adapt the general styling into clean official government portal theme */}
      <style>{`
        .md-dashboard {
          padding: 24px clamp(16px, 2vw, 32px);
          background: #f4f7fb !important;
          color: #1e293b !important;
        }

        .gov-tab-console {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          margin-bottom: 24px;
          box-shadow: none !important;
          overflow: hidden;
        }

        .gov-tabs-header {
          display: flex;
          background: #f8fafc;
          border-bottom: 1px solid #cbd5e1;
        }

        .gov-tab-btn {
          padding: 12px 20px;
          background: transparent;
          border: none;
          font-weight: 700;
          font-size: 13px;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          border-bottom: 3px solid transparent;
        }

        .gov-tab-btn svg {
          color: #64748b;
        }

        .gov-tab-btn:hover {
          color: #5c2e91;
          background: #f1f5f9;
        }

        .gov-tab-btn:hover svg {
          color: #5c2e91;
        }

        .gov-tab-btn.active {
          background: #5c2e91;
          color: #ffffff;
          border-bottom-color: #d97706;
        }

        .gov-tab-btn.active svg {
          color: #ffffff;
        }

        .gov-tabs-content {
          padding: 24px 20px;
          background: #ffffff;
        }

        /* Clean Flat Row layout for services - matching official government look */
        .gov-service-grid {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 40px;
          flex-wrap: wrap;
        }

        .gov-service-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 140px;
          text-align: center;
        }

        .gov-service-item:hover {
          transform: translateY(-2px);
        }

        .gov-service-item:hover .gov-item-icon-circle {
          background: #f3e8ff;
          color: #5c2e91;
          border-color: #5c2e91;
        }

        .gov-service-item:hover .gov-item-label {
          color: #5c2e91;
        }

        .gov-item-icon-circle {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #64748b;
          transition: all 0.2s ease;
        }

        .gov-item-label {
          font-size: 11px;
          font-weight: 700;
          color: #334155;
          line-height: 1.3;
          transition: all 0.2s ease;
        }

        /* Override panels to official look */
        .md-panel {
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          box-shadow: none !important;
        }

        .md-panel-head {
          border-bottom: 1px solid #edf2f7 !important;
          padding-bottom: 8px !important;
          margin-bottom: 12px !important;
        }

        .md-panel-head h3 {
          color: #1e293b !important;
          font-weight: 700 !important;
          font-size: 14px !important;
        }

        .md-stat {
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          box-shadow: none !important;
          border-radius: 4px !important;
        }

        .md-stat strong {
          color: #1e293b !important;
        }

        .md-stat-red .md-stat-copy strong {
          color: #cf3441 !important;
        }

        .md-stat-green .md-stat-copy strong {
          color: #148965 !important;
        }

        .md-stat-amber .md-stat-copy strong {
          color: #b9780f !important;
        }

        .md-stat-blue .md-stat-copy strong {
          color: #205794 !important;
        }

        .md-stat-copy strong.is-text-val {
          font-size: 21px !important;
          letter-spacing: normal !important;
        }

        .md-table th {
          background: #f8fafc !important;
          color: #475569 !important;
          border-bottom: 2px solid #cbd5e1 !important;
          font-weight: bold !important;
        }

        .md-table td {
          border-bottom: 1px solid #edf2f7 !important;
          color: #334155 !important;
        }

        .md-table tr:hover td {
          background: #faf5ff !important;
        }

        /* The dashboard's portal skin has fixed light-mode defaults above.
           Reapply the shared dark palette with equal-or-higher specificity. */
        html[data-theme="dark"] .md-dashboard {
          background: var(--bg-app) !important;
          color: var(--text-primary) !important;
        }
        html[data-theme="dark"] .gov-tab-console,
        html[data-theme="dark"] .gov-tabs-content,
        html[data-theme="dark"] .md-panel,
        html[data-theme="dark"] .md-stat {
          background: var(--bg-panel) !important;
          border-color: var(--border-color) !important;
        }
        html[data-theme="dark"] .gov-tabs-header,
        html[data-theme="dark"] .md-table th {
          background: var(--bg-panel-alt) !important;
          border-color: var(--border-color) !important;
        }
        html[data-theme="dark"] .gov-tab-btn,
        html[data-theme="dark"] .gov-tab-btn svg,
        html[data-theme="dark"] .gov-item-icon-circle,
        html[data-theme="dark"] .md-table th {
          color: var(--text-muted) !important;
        }
        html[data-theme="dark"] .gov-item-icon-circle {
          background: var(--bg-panel-alt) !important;
          border-color: var(--border-color) !important;
        }
        html[data-theme="dark"] .gov-item-label,
        html[data-theme="dark"] .md-panel-head h3,
        html[data-theme="dark"] .md-stat strong,
        html[data-theme="dark"] .md-table td,
        html[data-theme="dark"] .md-page-heading h2 {
          color: var(--text-primary) !important;
        }
        html[data-theme="dark"] .md-stat-red .md-stat-copy strong {
          color: #f87171 !important;
        }
        html[data-theme="dark"] .md-stat-green .md-stat-copy strong {
          color: #4ade80 !important;
        }
        html[data-theme="dark"] .md-stat-amber .md-stat-copy strong {
          color: #fbbf24 !important;
        }
        html[data-theme="dark"] .md-stat-blue .md-stat-copy strong {
          color: #60a5fa !important;
        }
        html[data-theme="dark"] .md-page-heading p,
        html[data-theme="dark"] .md-stat-copy > span,
        html[data-theme="dark"] .md-stat-copy small,
        html[data-theme="dark"] .md-panel-head span:first-child {
          color: var(--text-muted) !important;
        }
        html[data-theme="dark"] .md-panel-head,
        html[data-theme="dark"] .md-table td {
          border-color: var(--border-color) !important;
        }
        html[data-theme="dark"] .md-table tr:hover td {
          background: color-mix(in srgb, var(--bg-panel) 82%, var(--accent-primary) 18%) !important;
        }
      `}</style>

      <div className="md-page-heading" style={{ marginBottom: '20px' }}>
        <div>
          <span className="md-page-kicker" style={{ color: '#5c2e91', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>{t.kicker}</span>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>{t.title}</h2>
          <p style={{ color: '#64748b', fontSize: '12px' }}>{t.subtitle}</p>
        </div>
        <div className="md-system-state" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>
          <i style={{ background: '#16a34a' }} /> {t.statusOnline}
        </div>
      </div>

      {loadError && <div className="md-error" role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px', borderRadius: '4px', marginBottom: '20px', fontSize: '12px' }}>{loadError}</div>}

      {/* Tabbed Operations Console (Suits government portal visual style) */}
      <div className="gov-tab-console">
        <div className="gov-tabs-header">
          <button 
            type="button" 
            className={`gov-tab-btn ${activeConsoleTab === 'ops' ? 'active' : ''}`}
            onClick={() => setActiveConsoleTab('ops')}
          >
            <MdSettings size={16} /> {t.tabOps}
          </button>
          <button 
            type="button" 
            className={`gov-tab-btn ${activeConsoleTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveConsoleTab('ai')}
          >
            <MdPsychology size={16} /> {t.tabAi}
          </button>
          <button 
            type="button" 
            className={`gov-tab-btn ${activeConsoleTab === 'inv' ? 'active' : ''}`}
            onClick={() => setActiveConsoleTab('inv')}
          >
            <MdSecurity size={16} /> {t.tabInv}
          </button>
        </div>

        <div className="gov-tabs-content">
          {activeConsoleTab === 'ops' && (
            <div className="gov-service-grid">
              <div className="gov-service-item" onClick={() => navigate('/map')}>
                <div className="gov-item-icon-circle"><MdMap /></div>
                <span className="gov-item-label">{t.cardMapTitle}</span>
              </div>
              <div className="gov-service-item" onClick={() => navigate('/statistics')}>
                <div className="gov-item-icon-circle"><MdBarChart /></div>
                <span className="gov-item-label">{t.cardStatsTitle}</span>
              </div>
              <div className="gov-service-item" onClick={() => navigate('/reports')}>
                <div className="gov-item-icon-circle"><MdDescription /></div>
                <span className="gov-item-label">{t.cardReportsTitle}</span>
              </div>
              <div className="gov-service-item" onClick={runSchedulerCron}>
                <div className="gov-item-icon-circle" style={isRunningCron ? { background: '#ea580c', color: '#ffffff' } : {}}>
                  <MdAccessTime />
                </div>
                <span className="gov-item-label">{t.cardCronTitle}</span>
              </div>
            </div>
          )}

          {activeConsoleTab === 'ai' && (
            <div className="gov-service-grid">
              <div className="gov-service-item" onClick={() => navigate('/copilot')}>
                <div className="gov-item-icon-circle"><MdSmartToy /></div>
                <span className="gov-item-label">{t.cardCopilotTitle}</span>
              </div>
              <div className="gov-service-item" onClick={() => navigate('/network')}>
                <div className="gov-item-icon-circle"><MdHub /></div>
                <span className="gov-item-label">{t.cardNetworkTitle}</span>
              </div>
              <div className="gov-service-item" onClick={() => navigate('/predictions')}>
                <div className="gov-item-icon-circle"><MdAutoGraph /></div>
                <span className="gov-item-label">{t.cardPredTitle}</span>
              </div>
            </div>
          )}

          {activeConsoleTab === 'inv' && (
            <div className="gov-service-grid">
              <div className="gov-service-item" onClick={() => navigate('/cases')}>
                <div className="gov-item-icon-circle"><MdFolderOpen /></div>
                <span className="gov-item-label">{t.cardCasesTitle}</span>
              </div>
              <div className="gov-service-item" onClick={() => navigate('/suspect-timeline')}>
                <div className="gov-item-icon-circle"><MdAccessTime /></div>
                <span className="gov-item-label">{t.cardTimelineTitle}</span>
              </div>
              <div className="gov-service-item" onClick={() => navigate('/evidence')}>
                <div className="gov-item-icon-circle"><MdLink /></div>
                <span className="gov-item-label">{t.cardEvidenceTitle}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="md-stats" aria-label="Operational statistics">
        {data.opsStats.condensedStats.map((stat, index) => {
          const tone = stat.tone || (
            stat.status === 'danger' ? 'red' :
            stat.status === 'warning' ? 'amber' :
            stat.status === 'success' ? 'green' :
            (STAT_TONES[index] || 'blue')
          );
          const Icon = stat.isDistrictRisk
            ? (stat.status === 'danger' || stat.status === 'warning' ? MdWarningAmber : MdCheckCircle)
            : (STAT_ICONS[index] || MdOutlineShield);
          const isTextVal = typeof stat.value === 'string' && isNaN(Number(String(stat.value).replace('%', '')));

          return (
            <article className={`md-stat md-stat-${tone}`} key={stat.label}>
              <div className="md-stat-icon"><Icon /></div>
              <div className="md-stat-copy">
                <span>{renderStatLabel(stat.label)}</span>
                <strong className={isTextVal ? 'is-text-val' : ''}>{renderStatValue(stat.value)}</strong>
                <small>{stat.caption}</small>
              </div>
              <MdTrendingUp className="md-stat-trend" />
            </article>
          );
        })}
      </section>

      <div className="md-top-grid">
        <div className="md-panel md-map-panel">
          <div className="md-panel-head">
            <div>
              <span>{t.mapPanelEyebrow}</span>
              <h3>{t.mapPanelTitle}</h3>
            </div>
            <span className="md-live"><i /> {t.live}</span>
          </div>
          <div className="md-panel-body">
            <KarnatakaMap cases={filteredCases} selectedDistrict={selectedDistrict} setSelectedDistrict={setSelectedDistrict} />
          </div>
        </div>

        <div className="md-panel md-trend-panel">
          <div className="md-panel-head">
            <div>
              <span>{t.trendPanelEyebrow}</span>
              <h3>{t.trendPanelTitle}</h3>
            </div>
          </div>
          <div className="md-panel-body">
            <div className="md-chart-legend">
              <span><i className="blue" style={{ backgroundColor: '#5c2e91' }} /> FIRs</span>
              <span><i className="green" style={{ backgroundColor: '#16a34a' }} /> Chargesheets</span>
              <span><i className="amber" style={{ backgroundColor: '#ea580c' }} /> Arrests</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mdFirs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#5c2e91" stopOpacity=".2" />
                    <stop offset="1" stopColor="#5c2e91" stopOpacity=".01" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e8edf4" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8592a5', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8592a5', fontSize: 11 }} />
                <Tooltip content={<DashboardTooltip />} />
                <Area type="monotone" dataKey="firs" name="FIRs" stroke="#5c2e91" strokeWidth={2} fill="url(#mdFirs)" />
                <Area type="monotone" dataKey="chargesheets" name="Chargesheets" stroke="#16a34a" strokeWidth={1.6} fill="transparent" />
                <Area type="monotone" dataKey="arrests" name="Arrests" stroke="#ea580c" strokeWidth={1.4} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="md-bottom-grid">
        <div className="md-panel md-category-panel">
          <div className="md-panel-head">
            <div>
              <span>{t.categoryPanelEyebrow}</span>
              <h3>{t.categoryPanelTitle}</h3>
            </div>
          </div>
          <div className="md-panel-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.crimeDistribution.slice(0, 7)} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="#edf1f6" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8a97a9', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={142} axisLine={false} tickLine={false} tick={{ fill: '#526278', fontSize: 11 }} />
                <Tooltip content={<DashboardTooltip />} />
                <Bar dataKey="value" name="Cases" radius={[0, 4, 4, 0]} barSize={10}>
                  {data.crimeDistribution.slice(0, 7).map((item, index) => <Cell key={item.name} fill={index === 0 ? '#5c2e91' : index < 4 ? '#7c3aed' : '#ea580c'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="md-panel md-cases-panel">
          <div className="md-panel-head">
            <div>
              <span>{t.casesPanelEyebrow}</span>
              <h3>{t.casesPanelTitle}</h3>
            </div>
            <Link to="/cases" className="md-text-link" style={{ color: '#5c2e91', fontWeight: 'bold' }}>{t.viewAll} <MdArrowForward /></Link>
          </div>
          <div className="md-panel-body">
            <div className="md-table-wrap">
              <table className="md-table">
                <thead><tr><th>{t.colCrimeNo}</th><th>{t.colDistrict}</th><th>{t.colOffence}</th><th>{t.colStatus}</th></tr></thead>
                <tbody>
                  {data.recentSeriousFIRs.slice(0, 6).map(item => (
                    <tr key={item.id}>
                      <td><Link to={item.actionUrl} style={{ color: '#5c2e91', fontWeight: 'bold' }}>{item.crimeNoDisplay}</Link></td>
                      <td>{item.station}</td><td>{item.category}</td>
                      <td><span className={`md-status ${item.status === 'Closed' ? 'closed' : 'active'}`} style={item.status === 'Closed' ? { background: '#f1f5f9', color: '#64748b' } : { background: '#f0fdf4', color: '#16a34a' }}>{item.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="md-panel md-alerts-panel">
          <div className="md-panel-head">
            <div>
              <span>{t.alertsPanelEyebrow}</span>
              <h3>{t.alertsPanelTitle}</h3>
            </div>
            <span className="md-new-count" style={{ background: '#fee2e2', color: '#ef4444' }}>
              {cronAlerts.length > 0 ? cronAlerts.length : data.alerts.length} {t.newAlerts}
            </span>
          </div>
          <div className="md-panel-body">
            <div className="md-alert-list">
              {cronAlerts.length > 0 ? (
                cronAlerts.slice(0, 5).map(alert => (
                  <article className="md-alert md-alert-critical" key={alert.alert_id} style={{ borderLeftColor: '#dc2626' }}>
                    <MdWarningAmber style={{ color: '#dc2626' }} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <p style={{ color: '#1e293b', margin: 0, fontWeight: 'bold' }}>
                        {lang === 'kn' ? 'ತನಿಖೆ ವಿಳಂಬ' : 'INVESTIGATION DELAY'} (FIR: {alert.crimeNo})
                      </p>
                      <p style={{ color: '#475569', fontSize: '11px', margin: '3px 0' }}>{alert.message}</p>
                      <time style={{ color: '#dc2626', fontSize: '10px', fontWeight: '600' }}>
                        ⚠️ {lang === 'kn' ? `${alert.delayDays} ದಿನಗಳ ವಿಳಂಬ` : `${alert.delayDays} Days Delayed`}
                      </time>
                    </div>
                  </article>
                ))
              ) : (
                data.alerts.slice(0, 5).map(alert => (
                  <article className={`md-alert md-alert-${alert.severity}`} key={alert.id} style={{ borderLeftColor: alert.severity === 'critical' ? '#dc2626' : alert.severity === 'warning' ? '#ea580c' : '#3b82f6' }}>
                    <MdWarningAmber style={{ color: alert.severity === 'critical' ? '#dc2626' : alert.severity === 'warning' ? '#ea580c' : '#3b82f6' }} />
                    <div style={{ flex: 1, textAlign: 'left' }}><p style={{ color: '#1e293b', margin: 0 }}>{alert.text}</p><time style={{ color: '#64748b' }}>{alert.age}</time></div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardModern;
