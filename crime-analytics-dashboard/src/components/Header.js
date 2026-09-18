import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Menu, Sun, Moon,
  Search, Shield,
  User, Lock, CheckCircle2,
  Home, Map, BarChart3, Network,
  TrendingUp, FileText, Bot, Key, LogOut,
  ChevronDown, ArrowLeft, X
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import CommandPalette from './ui/CommandPalette';
import PIIUnlockModal from './ui/PIIUnlockModal';

const IDLE_LOGOUT_SECONDS = 150;

/**
 * Header — Compact 2-row layout (ribbon + controls)
 *
 * Row 1: Government ribbon with security badge
 * Row 2: Page title + search + theme toggle + notifications + profile
 */

const PAGE_TITLES = {
  '/':          { title: 'MADHUKAR Dashboard', subtitle: 'Modern Analytics and Data Hub for User Friendly Karnataka Anti Crime Response Dashboard' },
  '/map':       { title: 'Spatial Heatmap & GIS', subtitle: 'Crime concentration mapping and risk forecast layers' },
  '/statistics':{ title: 'Statistical Analytics Suite', subtitle: 'Pattern analysis, temporal distributions, and rankings' },
  '/reports':   { title: 'Briefing & Report Generator', subtitle: 'Intelligence summaries and briefing exports' },
  '/settings':  { title: 'Command Center Configuration', subtitle: 'Thresholds, refresh frequencies, and scaling settings' },
  '/predictions':{ title: 'Predictions', subtitle: 'Predictive intelligence modeling and regional risk forecasts' },
};

const NAVIGATION_GROUPS = [
  {
    id: 'intelligence', label: 'Intelligence', icon: <BarChart3 size={16} strokeWidth={1.5} />,
    paths: ['/map', '/statistics', '/predictions', '/network', '/copilot'],
    items: [
      { path: '/map', label: 'GIS Intelligence Map', detail: 'Hotspots, heatmaps and district drill-down' },
      { path: '/statistics', label: 'Crime Statistics', detail: 'Patterns, trends and comparative analysis' },
      { path: '/predictions', label: 'Risk Forecasts', detail: 'Risk indicators and priority signals' },
      { path: '/network', label: 'Criminal Network', detail: 'Relationships across cases and entities' },
      { path: '/copilot', label: 'MADHUKAR AI Copilot', detail: 'Natural-language intelligence queries' },
    ],
  },
  {
    id: 'investigations', label: 'Investigations', icon: <Shield size={16} strokeWidth={1.5} />,
    paths: ['/cases', '/case-overview', '/evidence', '/evidence-workspace', '/suspect-timeline'],
    items: [
      { path: '/cases', label: 'Case Registry', detail: 'Find and review FIR and case records' },
      { path: '/evidence', label: 'Evidence Workspace', detail: 'Review linked evidence and case material' },
      { path: '/suspect-timeline', label: 'Suspect Timeline', detail: 'Trace linked events and entities' },
    ],
  },
  {
    id: 'briefings', label: 'Briefings & Reports', icon: <FileText size={16} strokeWidth={1.5} />,
    paths: ['/briefing', '/reports'],
    items: [
      { path: '/briefing', label: 'Operational Briefing', detail: 'Situation summary and recommendations' },
      { path: '/reports', label: 'Report Centre', detail: 'Generate and export operational reports' },
    ],
  },
  {
    id: 'administration', label: 'Administration', icon: <Key size={16} strokeWidth={1.5} />,
    paths: ['/admin/users', '/settings'],
    items: [
      { path: '/admin/users', label: 'User Management', detail: 'Roles, users and access controls' },
      { path: '/settings', label: 'System Settings', detail: 'Command-centre configuration' },
    ],
  },
];

function getRouteContext(pathname) {
  if (pathname === '/') return { section: 'Command', label: 'Command Center', fallback: '/' };
  const group = NAVIGATION_GROUPS.find(({ paths }) => paths.some(path => pathname === path || pathname.startsWith(`${path}/`)));
  const item = group?.items.find(({ path }) => pathname === path || pathname.startsWith(`${path}/`));
  return { section: group?.label || 'Command', label: item?.label || 'Operational Workspace', fallback: group?.items[0]?.path || '/' };
}

function Header({ theme, onToggleTheme, onToggleSidebar, sidebarCollapsed, sidebarOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const page = PAGE_TITLES[location.pathname] || PAGE_TITLES['/'];
  const { session, isCommandMode, lockSession, logout } = useSecurity();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showPiiModal, setShowPiiModal] = useState(false);
  const [showLockDropdown, setShowLockDropdown] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showProfileSummary, setShowProfileSummary] = useState(false);
  const [openNavigationGroup, setOpenNavigationGroup] = useState('');
  const [idleSecondsRemaining, setIdleSecondsRemaining] = useState(IDLE_LOGOUT_SECONDS);
  const navigationMenuRef = useRef(null);
  const [elapsedTime, setElapsedTime] = useState('just now');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [compactViewport, setCompactViewport] = useState(() => window.matchMedia('(max-width: 1080px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1080px)');
    const handleViewportChange = event => setCompactViewport(event.matches);
    media.addEventListener('change', handleViewportChange);
    return () => media.removeEventListener('change', handleViewportChange);
  }, []);

  useEffect(() => {
    const clockInterval = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    let idleDeadline = Date.now() + (IDLE_LOGOUT_SECONDS * 1000);
    let hasTimedOut = false;
    const resetIdleDeadline = () => {
      if (hasTimedOut) return;
      idleDeadline = Date.now() + (IDLE_LOGOUT_SECONDS * 1000);
      setIdleSecondsRemaining(IDLE_LOGOUT_SECONDS);
    };
    const updateCountdown = () => {
      const seconds = Math.max(0, Math.ceil((idleDeadline - Date.now()) / 1000));
      setIdleSecondsRemaining(seconds);
      if (seconds === 0 && !hasTimedOut) {
        hasTimedOut = true;
        logout();
        window.sessionStorage.removeItem('ksp-catalyst-browser-session');
        const loginUrl = `${window.location.origin}/__catalyst/auth/login`;
        try {
          if (window.catalyst?.auth?.signOut) {
            window.catalyst.auth.signOut(loginUrl);
            return;
          }
        } catch (error) {
          console.error('Catalyst idle sign out failed; returning to hosted login.', error);
        }
        window.location.replace(loginUrl);
      }
    };
    const activityEvents = ['mousemove', 'mousedown', 'click', 'keydown', 'scroll', 'touchstart', 'pointerdown'];
    activityEvents.forEach(eventName => window.addEventListener(eventName, resetIdleDeadline, { passive: true }));
    const interval = window.setInterval(updateCountdown, 1000);
    updateCountdown();
    return () => {
      window.clearInterval(interval);
      activityEvents.forEach(eventName => window.removeEventListener(eventName, resetIdleDeadline));
    };
  }, [logout]);

  useEffect(() => {
    if (!openNavigationGroup) return undefined;
    const closeOnOutsideInteraction = event => {
      if (navigationMenuRef.current && !navigationMenuRef.current.contains(event.target)) {
        setOpenNavigationGroup('');
      }
    };
    const closeOnEscape = event => {
      if (event.key === 'Escape') setOpenNavigationGroup('');
    };
    document.addEventListener('mousedown', closeOnOutsideInteraction);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideInteraction);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openNavigationGroup]);

  const clockTime = currentTime.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const clockDate = currentTime.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();

  const openQuickLookup = () => {
    setShowCommandPalette(true);
  };

  useEffect(() => {
    const handleQuickLookup = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        const target = event.target;
        if (
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) &&
          target.id !== 'portal-search'
        ) {
          return;
        }

        event.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleQuickLookup);
    return () => window.removeEventListener('keydown', handleQuickLookup);
  }, []);

  // Minute-interval hook to calculate elapsed unlock time
  useEffect(() => {
    if (!isCommandMode || !session.unlockedAt) {
      setElapsedTime('just now');
      return;
    }

    const updateElapsed = () => {
      const diffMs = new Date().getTime() - session.unlockedAt;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) {
        setElapsedTime('just now');
      } else {
        setElapsedTime(`${diffMins} min ago`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [isCommandMode, session.unlockedAt]);  const [lang, setLang] = useState(() => localStorage.getItem('ksp-language') || 'en');

  useEffect(() => {
    const handleLangChange = (e) => setLang(e.detail);
    window.addEventListener('ksp-language-change', handleLangChange);
    return () => window.removeEventListener('ksp-language-change', handleLangChange);
  }, []);

  const toggleLanguage = () => {
    const nextLang = lang === 'en' ? 'kn' : 'en';
    setLang(nextLang);
    localStorage.setItem('ksp-language', nextLang);
    window.dispatchEvent(new CustomEvent('ksp-language-change', { detail: nextLang }));
  };

  const handlePillClick = () => {
    if (isCommandMode) {
      setShowLockDropdown(prev => !prev);
    } else {
      setShowPiiModal(true);
    }
  };

  const TRANSLATIONS = {
    en: {
      helplines: "Emergency: 112 / 100",
      langToggle: "ಕನ್ನಡ / English",
      home: "Home",
      map: "GIS Map",
      stats: "Statistics",
      network: "Criminal Network",
      predictions: "AI Predictions",
      reports: "Report Hub",
      copilot: "AI Copilot",
      searchPlaceholder: "Lookup FIR or Suspect...",
      commandMode: "Command Mode",
      restricted: "Restricted",
      titleSub: "Home Department · Govt. of Karnataka · operational command console",
      lockPii: "Lock PII Access",
      profileTitle: "User Profile Summary",
      profileId: "Official Badge ID",
      profileSysId: "System Employee ID",
      profileName: "Officer Name",
      profileRole: "Assigned Role",
      profileUnit: "Command Unit",
      viewProfile: "Close Details",
      closeBtn: "Close"
    },
    kn: {
      helplines: "ತುರ್ತು ಸೇವೆ: 112 / 100",
      langToggle: "English / ಕನ್ನಡ",
      home: "ಮುಖಪುಟ",
      map: "ಜಿಐಎಸ್ ಭೂಪಟ",
      stats: "ಅಂಕಿಅಂಶಗಳು",
      network: "ಅಪರಾಧ ಜಾಲ",
      predictions: "ಎಐ ಮುನ್ಸೂಚನೆಗಳು",
      reports: "ವರದಿ ಕೇಂದ್ರ",
      copilot: "ಎಐ ಸಹಾಯಕ",
      searchPlaceholder: "ಎಫ್ಐಆರ್ ಅಥವಾ ಶಂಕಿತರನ್ನು ಹುಡುಕಿ...",
      commandMode: "ಕಾರ್ಯಾಚರಣೆ ಮೋಡ್",
      restricted: "ನಿರ್ಬಂಧಿತ",
      titleSub: "ಗೃಹ ಇಲಾಖೆ · ಕರ್ನಾಟಕ ಸರ್ಕಾರ · ಕಾರ್ಯಾಚರಣೆ ನಿಯಂತ್ರಣ ಫಲಕ",
      lockPii: "ಪಿಐಐ ಪ್ರವೇಶ ನಿರ್ಬಂಧಿಸಿ",
      profileTitle: "ಬಳಕೆದಾರರ ಪ್ರೊಫೈಲ್ ಸಾರಾಂಶ",
      profileId: "ಅಧಿಕೃತ ಬ್ಯಾಡ್ಜ್ ಐಡಿ",
      profileSysId: "ಸಿಸ್ಟಮ್ ಉದ್ಯೋಗಿ ಐಡಿ",
      profileName: "ಅಧಿಕಾರಿಯ ಹೆಸರು",
      profileRole: "ನಿಯೋಜಿತ ಪಾತ್ರ",
      profileUnit: "ನಿಯಂತ್ರಣ ಘಟಕ",
      viewProfile: "ವಿವರಗಳನ್ನು ಮುಚ್ಚಿ",
      closeBtn: "ಮುಚ್ಚಿ"
    }
  };

  const t = TRANSLATIONS[lang];
  const routeContext = getRouteContext(location.pathname);
  const showBackButton = location.pathname !== '/';

  const goBack = () => {
    // React Router tracks an index for in-app history. A deep link should return
    // to the relevant workflow hub rather than leave the protected dashboard.
    if (Number(window.history.state?.idx) > 0) {
      navigate(-1);
      return;
    }
    navigate(routeContext.fallback);
  };

  const isGroupActive = group => group.paths.some(path => location.pathname === path || location.pathname.startsWith(`${path}/`));

  const endAuthenticatedSession = () => {
    logout();
    window.sessionStorage.removeItem('ksp-catalyst-browser-session');
    const loginUrl = `${window.location.origin}/__catalyst/auth/login`;
    try {
      if (window.catalyst?.auth?.signOut) {
        window.catalyst.auth.signOut(loginUrl);
        return;
      }
    } catch (error) {
      console.error('Catalyst sign out failed; returning to hosted login.', error);
    }
    window.location.replace(loginUrl);
  };

  return (
    <header className="header ksp-portal-header">
      {/* Scope styling block for self-contained, clean government visual elements */}
      <style>{`
        .ksp-portal-header {
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border-bottom: 2px solid #5c2e91;
          width: 100%;
          box-shadow: none !important;
          position: sticky;
          top: 0;
          /* Stay above page-level sticky search panels and their suggestion lists. */
          z-index: 1100;
        }

        .portal-top-banner {
          background: #5c2e91;
          color: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 24px;
          height: 56px;
          border-bottom: 2px solid #d97706; /* Golden thin separator */
        }

        .portal-logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .portal-emblem {
          height: 40px;
          width: auto;
        }

        .portal-title-block {
          display: flex;
          flex-direction: column;
        }

        .portal-title-main {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.8px;
          margin: 0;
          color: #ffffff;
          font-family: 'Public Sans', 'Segoe UI', sans-serif;
        }

        .portal-title-sub {
          font-size: 9px;
          opacity: 0.9;
          letter-spacing: 0.4px;
          margin: 0;
        }

        .portal-top-right {
          display: flex;
          align-items: center;
          gap: 20px;
          font-size: 11px;
          font-family: 'Consolas', 'Segoe UI', monospace;
        }

        .portal-helplines {
          font-weight: bold;
          color: #ffffff;
          text-decoration: none;
          background: rgba(255, 255, 255, 0.12);
          padding: 4px 10px;
          border-radius: 2px;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }

        .portal-idle-timer {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }
        .portal-idle-timer.warning {
          border-color: #fca5a5;
          background: rgba(185, 28, 28, 0.32);
          color: #fee2e2;
        }

        .portal-lang-toggle {
          cursor: pointer;
          color: #ffffff;
          border-right: 1px solid rgba(255,255,255,0.3);
          padding-right: 15px;
          font-weight: bold;
        }

        /* Second Row: Horizontal Nav Menu */
        .portal-nav-bar {
          background: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 0 24px;
          height: 48px;
          border-bottom: 1px solid #e2e8f0;
        }

        .portal-menu-links {
          display: flex;
          flex: 1 1 auto;
          min-width: 0;
          gap: 18px;
          list-style: none;
          margin: 0;
          padding: 0;
          height: 100%;
          align-items: center;
        }

        .portal-menu-item {
          height: 100%;
          display: flex;
          align-items: center;
          position: relative;
        }

        /* Replaced by the grouped workflow menu below. Keeping the old links
           in the source avoids breaking bookmarked routes while removing the
           crowded, flat navigation from the officer interface. */
        .portal-menu-item:has(.portal-legacy-direct-link),
        .portal-menu-item.portal-legacy-direct-link {
          display: none;
        }

        .portal-nav-link {
          text-decoration: none;
          color: #475569;
          font-weight: 600;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 4px;
          height: 100%;
          border-bottom: 3px solid transparent;
          transition: all 0.15s ease;
        }

        .portal-nav-link svg {
          color: #64748b;
          transition: color 0.15s ease;
        }

        .portal-nav-link:hover {
          color: #5c2e91;
        }

        .portal-nav-link:hover svg {
          color: #5c2e91;
        }

        .portal-nav-link.active-link {
          color: #5c2e91;
          border-bottom: 3px solid #5c2e91;
        }

        .portal-nav-link.active-link svg {
          color: #5c2e91;
        }

        .portal-nav-arrow {
          font-size: 8px;
          opacity: 0.6;
        }

        .portal-investigation-trigger {
          background: transparent;
          border: 0;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-family: inherit;
        }

        .portal-investigation-menu {
          position: absolute;
          top: calc(100% - 1px);
          left: 0;
          z-index: 1102;
          width: 290px;
          margin: 0;
          padding: 6px;
          list-style: none;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
        }

        .portal-investigation-option {
          display: block;
          padding: 10px 12px;
          border-radius: 3px;
          color: #334155;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          white-space: normal;
        }

        .portal-investigation-option strong,
        .portal-investigation-option small {
          display: block;
        }

        .portal-investigation-option strong {
          font-size: 12px;
        }

        .portal-investigation-option small {
          margin-top: 3px;
          color: #64748b;
          font-size: 10px;
          font-weight: 500;
          line-height: 1.35;
        }

        .portal-back-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 32px;
          padding: 0 14px 0 10px;
          border: 1px solid rgba(92, 46, 145, 0.15);
          border-radius: 20px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          color: #475569;
          cursor: pointer;
          font-family: 'Public Sans', 'Segoe UI', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.3px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), inset 0 1px 0 rgba(255,255,255,0.8);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .portal-back-button:hover,
        .portal-back-button:focus-visible {
          background: linear-gradient(180deg, #f3e8ff 0%, #faf5ff 100%);
          border-color: #d8b4fe;
          color: #5c2e91;
          box-shadow: 0 3px 8px rgba(92, 46, 145, 0.15), inset 0 1px 0 #ffffff;
          transform: translateY(-1px);
          outline: none;
        }

        .portal-back-button:active {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(92, 46, 145, 0.1);
          background: #f3e8ff;
        }

        .portal-workflow-context {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 112px;
          padding-right: 8px;
          border-right: 1px solid #e2e8f0;
          line-height: 1.15;
        }

        .portal-workflow-context span {
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .portal-workflow-context strong {
          color: #1e293b;
          font-size: 12px;
        }

        .portal-investigation-option:hover,
        .portal-investigation-option:focus {
          background: #f3e8ff;
          color: #5c2e91;
          outline: none;
        }

        .portal-nav-controls {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 12px;
        }

        /* Command banner inside horizontal menu */
        .portal-sec-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .portal-sec-pill.active {
          background: #f0fdf4;
          border-color: #bbf7d0;
          color: #16a34a;
        }

        .portal-search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          width: 180px;
          height: 32px;
          min-height: 0;
          box-sizing: border-box;
          cursor: pointer;
          overflow: hidden;
        }

        .portal-search-bar input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 11px;
          width: 100%;
          min-width: 0;
          height: 18px;
          min-height: 0;
          padding: 0;
          line-height: 18px;
          box-sizing: border-box;
          cursor: pointer;
        }

        html[data-theme='dark'] .ksp-portal-header,
        html[data-theme='dark'] .portal-nav-bar {
          background: var(--bg-header) !important;
          border-color: var(--border-color) !important;
        }

        html[data-theme='dark'] .portal-nav-link,
        html[data-theme='dark'] .portal-nav-link svg {
          color: var(--text-secondary) !important;
        }

        html[data-theme='dark'] .portal-nav-link:hover,
        html[data-theme='dark'] .portal-nav-link:hover svg,
        html[data-theme='dark'] .portal-nav-link.active-link,
        html[data-theme='dark'] .portal-nav-link.active-link svg {
          color: var(--accent-secondary) !important;
        }

        html[data-theme='dark'] .portal-back-button {
          background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
          border-color: rgba(255,255,255,0.1);
          color: var(--text-primary);
          box-shadow: 0 2px 5px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
        }
        
        html[data-theme='dark'] .portal-back-button:hover,
        html[data-theme='dark'] .portal-back-button:focus-visible {
          background: linear-gradient(180deg, rgba(167, 139, 250, 0.15) 0%, rgba(167, 139, 250, 0.05) 100%);
          border-color: rgba(167, 139, 250, 0.3);
          color: #c4b5fd;
          box-shadow: 0 4px 12px rgba(167, 139, 250, 0.15), inset 0 1px 0 rgba(255,255,255,0.1);
        }

        html[data-theme='dark'] .portal-back-button:active {
          background: rgba(167, 139, 250, 0.1);
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        html[data-theme='dark'] .portal-workflow-context {
          border-color: var(--border-color);
        }

        html[data-theme='dark'] .portal-workflow-context strong {
          color: var(--text-primary);
        }

        html[data-theme='dark'] .portal-search-bar,
        html[data-theme='dark'] .portal-sec-pill,
        html[data-theme='dark'] .portal-investigation-menu {
          background: var(--bg-panel) !important;
          border-color: var(--border-color) !important;
          color: var(--text-primary) !important;
        }

        html[data-theme='dark'] .portal-search-bar input,
        html[data-theme='dark'] .portal-investigation-option {
          color: var(--text-primary) !important;
        }

        html[data-theme='dark'] .portal-investigation-option:hover,
        html[data-theme='dark'] .portal-investigation-option:focus {
          background: var(--bg-panel-alt) !important;
          color: var(--accent-secondary) !important;
        }

        html[data-theme='dark'] .portal-sec-pill.active {
          background: color-mix(in srgb, var(--bg-panel) 82%, var(--accent-success) 18%) !important;
          border-color: color-mix(in srgb, var(--border-color) 65%, var(--accent-success) 35%) !important;
          color: var(--accent-success) !important;
        }

        /* Keep the lookup control in its own space before the menu becomes crowded. */
        @media (max-width: 1450px) {
          .portal-menu-links {
            gap: 10px;
          }
          .portal-nav-link {
            font-size: 12px;
            gap: 4px;
          }
          .portal-search-bar {
            width: 150px;
          }
          .portal-sec-pill {
            padding: 5px 8px;
            font-size: 10px;
          }
        }

        @media (max-width: 1250px) {
          .portal-menu-links {
            gap: 8px;
          }
          .portal-nav-link {
            font-size: 11px;
            gap: 3px;
          }
          .portal-search-bar {
            width: 130px;
          }
        }

        @media (max-width: 1100px) {
          .portal-menu-links {
            gap: 8px;
          }
          .portal-nav-link {
            font-size: 11px;
            gap: 2px;
          }
          .portal-search-bar {
            width: 32px;
            padding: 6px;
            justify-content: center;
          }
          .portal-search-bar input {
            display: none;
          }
          .portal-sec-pill span {
            display: none;
          }
          .portal-sec-pill {
            padding: 6px;
            border-radius: 50%;
            justify-content: center;
          }
        }

        @media (max-width: 780px) {
          .portal-nav-bar { padding: 0 12px; gap: 8px; }
          .portal-workflow-context { display: none; }
          .portal-menu-links { gap: 10px; overflow-x: auto; }
          .portal-nav-link { white-space: nowrap; }
          .portal-back-button span { display: none; }
        }
      `}</style>

      {/* Row 1: Government Purple Banner */}
      <div className="portal-top-banner">
        <div className="portal-logo-section">
          <img src="/app/ksp-emblem.png" className="portal-emblem" alt="KSP Emblem" />
          <div className="portal-title-block">
            <h2 className="portal-title-main">KARNATAKA STATE POLICE</h2>
            <span className="portal-title-sub">{t.titleSub}</span>
          </div>
        </div>

        <div className="portal-top-right">
          <span
            className={`portal-idle-timer${idleSecondsRemaining <= 30 ? ' warning' : ''}`}
            title="Automatic logout after 2 minutes 30 seconds without activity"
            aria-label={`Automatic logout in ${String(Math.floor(idleSecondsRemaining / 60)).padStart(2, '0')}:${String(idleSecondsRemaining % 60).padStart(2, '0')}`}
          >
            Session {String(Math.floor(idleSecondsRemaining / 60)).padStart(2, '0')}:{String(idleSecondsRemaining % 60).padStart(2, '0')}
          </span>
          <a href="#helplines" className="portal-helplines" onClick={e => e.preventDefault()}>
            {t.helplines}
          </a>
          <span className="portal-lang-toggle" onClick={toggleLanguage}>
            {lang === 'en' ? 'ಕನ್ನಡ' : 'English'}
          </span>
          <div 
            onClick={() => setShowProfileSummary(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            title={t.profileTitle}
          >
            <User size={16} strokeWidth={1.5} style={{ color: '#ffffff' }} />
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '10px', textAlign: 'left' }}>
              <strong style={{ color: '#ffffff' }}>{session.officerName || 'DGP Kishore, IPS'}</strong>
              <span style={{ color: '#cbd5e1', fontSize: '9px' }}>{session.unitName || 'State DGP Command'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Horizontal Navigation Bar */}
      <div className="portal-nav-bar">
        <ul className="portal-menu-links">
          {showBackButton && (
            <li className="portal-menu-item">
              <button type="button" className="portal-back-button" onClick={goBack} aria-label={`Go back from ${routeContext.label}`} title="Return to the previous page">
                <ArrowLeft size={16} strokeWidth={1.5} /> <span>Back</span>
              </button>
            </li>
          )}
          <li className="portal-menu-item portal-workflow-context" aria-label={`Current workspace: ${routeContext.section}, ${routeContext.label}`}>
            <span>{routeContext.section}</span>
            <strong>{routeContext.label}</strong>
          </li>
          <li className="portal-menu-item">
            <Link to="/" className={`portal-nav-link ${location.pathname === '/' ? 'active-link' : ''}`}>
              <Home size={16} strokeWidth={1.5} /> Command Center
            </Link>
          </li>
          {NAVIGATION_GROUPS.map(group => {
            const isOpen = openNavigationGroup === group.id;
            return (
              <li className="portal-menu-item" key={group.id} ref={isOpen ? navigationMenuRef : null}>
                <button
                  type="button"
                  className={`portal-nav-link portal-investigation-trigger ${isGroupActive(group) ? 'active-link' : ''}`}
                  onClick={() => setOpenNavigationGroup(current => current === group.id ? '' : group.id)}
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                >
                  {group.icon} {group.label} <ChevronDown className="portal-nav-arrow" size={16} strokeWidth={1.5} />
                </button>
                {isOpen && (
                  <ul className="portal-investigation-menu" role="menu" aria-label={`${group.label} navigation`}>
                    {group.items.map(item => (
                      <li role="none" key={item.path}>
                        <Link role="menuitem" className="portal-investigation-option" to={item.path} onClick={() => setOpenNavigationGroup('')}>
                          <strong>{item.label}</strong>
                          <small>{item.detail}</small>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
          <li className="portal-menu-item">
            <Link to="/map" className={`portal-nav-link portal-legacy-direct-link ${location.pathname === '/map' ? 'active-link' : ''}`}>
              <Map size={16} strokeWidth={1.5} /> {t.map} <ChevronDown className="portal-nav-arrow" size={16} strokeWidth={1.5} />
            </Link>
          </li>
          <li className="portal-menu-item">
            <Link to="/statistics" className={`portal-nav-link portal-legacy-direct-link ${location.pathname === '/statistics' ? 'active-link' : ''}`}>
              <BarChart3 size={16} strokeWidth={1.5} /> {t.stats} <ChevronDown className="portal-nav-arrow" size={16} strokeWidth={1.5} />
            </Link>
          </li>
          <li className="portal-menu-item">
            <Link to="/network" className={`portal-nav-link portal-legacy-direct-link ${location.pathname === '/network' ? 'active-link' : ''}`}>
              <Network size={16} strokeWidth={1.5} /> {t.network} <ChevronDown className="portal-nav-arrow" size={16} strokeWidth={1.5} />
            </Link>
          </li>
          <li className="portal-menu-item">
            <Link to="/predictions" className={`portal-nav-link portal-legacy-direct-link ${location.pathname === '/predictions' ? 'active-link' : ''}`}>
              <TrendingUp size={16} strokeWidth={1.5} /> {t.predictions} <ChevronDown className="portal-nav-arrow" size={16} strokeWidth={1.5} />
            </Link>
          </li>
          <li className="portal-menu-item">
            <Link to="/reports" className={`portal-nav-link portal-legacy-direct-link ${location.pathname === '/reports' ? 'active-link' : ''}`}>
              <FileText size={16} strokeWidth={1.5} /> {t.reports} <ChevronDown className="portal-nav-arrow" size={16} strokeWidth={1.5} />
            </Link>
          </li>
          <li className="portal-menu-item">
            <Link to="/copilot" className={`portal-nav-link portal-legacy-direct-link ${location.pathname === '/copilot' ? 'active-link' : ''}`}>
              <Bot size={16} strokeWidth={1.5} /> {t.copilot} <ChevronDown className="portal-nav-arrow" size={16} strokeWidth={1.5} />
            </Link>
          </li>
          <li className="portal-menu-item portal-legacy-direct-link" ref={navigationMenuRef}>
            <button
              type="button"
              className={`portal-nav-link portal-investigation-trigger ${['/case-overview', '/cases', '/suspect-timeline', '/evidence-workspace', '/evidence'].some(path => location.pathname.startsWith(path)) ? 'active-link' : ''}`}
              onClick={() => setOpenNavigationGroup(current => current === 'legacy-investigation' ? '' : 'legacy-investigation')}
              aria-expanded={openNavigationGroup === 'legacy-investigation'}
              aria-haspopup="menu"
            >
              <Shield size={16} strokeWidth={1.5} /> Investigation Hub <ChevronDown className="portal-nav-arrow" size={16} strokeWidth={1.5} />
            </button>
            {openNavigationGroup === 'legacy-investigation' && (
              <ul className="portal-investigation-menu" role="menu" aria-label="Investigation Hub">
                <li role="none"><Link role="menuitem" className="portal-investigation-option" to="/case-overview" onClick={() => setOpenNavigationGroup('')}>Case Registry Overview</Link></li>
                <li role="none"><Link role="menuitem" className="portal-investigation-option" to="/suspect-timeline" onClick={() => setOpenNavigationGroup('')}>Suspect Timeline Tracker</Link></li>
                <li role="none"><Link role="menuitem" className="portal-investigation-option" to="/evidence-workspace" onClick={() => setOpenNavigationGroup('')}>Evidence Workshop</Link></li>
              </ul>
            )}
          </li>
        </ul>

        <div className="portal-nav-controls">
          {/* Quick Search */}
          <div className="portal-search-bar" onClick={openQuickLookup}>
            <Search size={16} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
            <input type="text" placeholder={t.searchPlaceholder} readOnly />
          </div>

          {/* Security Pill */}
          <div style={{ position: 'relative' }}>
            <div 
              className={`portal-sec-pill ${isCommandMode ? 'active' : ''}`}
              onClick={handlePillClick}
            >
              {isCommandMode ? <CheckCircle2 size={16} strokeWidth={1.5} style={{ color: 'var(--accent-success)' }} /> : <Lock size={16} strokeWidth={1.5} />}
              <span>{isCommandMode ? t.commandMode : t.restricted}</span>
              <span style={{ fontSize: '9px', marginLeft: '2px', opacity: 0.6 }}><Key size={16} strokeWidth={1.5} /></span>
            </div>

            {showLockDropdown && (
              <>
                <div 
                  onClick={() => setShowLockDropdown(false)} 
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999,
                    background: 'transparent'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '36px',
                  right: '0',
                  background: 'var(--bg-panel, #ffffff)',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  zIndex: 1000,
                  width: '180px',
                  padding: '4px 0',
                  fontFamily: 'monospace'
                }}>
                  <button
                    type="button"
                    onClick={() => { lockSession(); setShowLockDropdown(false); }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Lock size={16} strokeWidth={1.5} /> {t.lockPii}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle */}
          <button type="button" className="header-icon-btn" onClick={onToggleTheme} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
            {theme === 'light' ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
      <PIIUnlockModal isOpen={showPiiModal} onClose={() => setShowPiiModal(false)} />

      {showProfileSummary && (
        <div 
          style={{
            position: 'fixed',
            top: '92px',
            right: '20px',
            zIndex: 1001,
            pointerEvents: 'none'
          }}
        >
          <div 
            style={{
              background: '#ffffff',
              width: '360px',
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: '4px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              overflow: 'hidden',
              fontFamily: '"Public Sans", "Segoe UI", sans-serif',
              color: '#1e293b',
              position: 'relative',
              pointerEvents: 'auto'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc'
            }}>
              <span style={{ fontWeight: '800', fontSize: '14px', color: '#5c2e91' }}>{t.profileTitle}</span>
              <button 
                type="button" 
                onClick={() => setShowProfileSummary(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Profile Avatar */}
            <div style={{ padding: '8px 20px 4px', textAlign: 'center' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#f1f5f9',
                border: '2px solid #cbd5e1',
                margin: '0 auto 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)'
              }}>
                <User size={18} strokeWidth={1.5} />
              </div>
            </div>

            {/* Fields List */}
            <div style={{ padding: '4px 20px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: 'bold', width: '150px', textAlign: 'left' }}>{t.profileId}</span>
                <span style={{ fontWeight: '700', color: '#1e293b', flex: 1, textAlign: 'right' }}>{session.badgeId || 'KG1001'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: 'bold', width: '150px', textAlign: 'left' }}>{t.profileSysId}</span>
                <span style={{ fontWeight: '700', color: '#1e293b', flex: 1, textAlign: 'right' }}>{session.badgeId ? 'EMP_' + session.badgeId.replace('KG', '') + '_KSP' : 'EMP_1001_KSP'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: 'bold', width: '150px', textAlign: 'left' }}>{t.profileName}</span>
                <span style={{ fontWeight: '700', color: '#1e293b', flex: 1, textAlign: 'right' }}>{session.officerName || 'DGP Kishore, IPS'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: 'bold', width: '150px', textAlign: 'left' }}>{t.profileRole}</span>
                <span style={{ fontWeight: '700', color: '#1e293b', flex: 1, textAlign: 'right' }}>{session.role || 'Command Level'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: 'bold', width: '150px', textAlign: 'left' }}>{t.profileUnit}</span>
                <span style={{ fontWeight: '700', color: '#1e293b', flex: 1, textAlign: 'right' }}>{session.unitName || 'State DGP Command'}</span>
              </div>
            </div>

            {/* Actions Footer */}
            <div style={{
              display: 'flex',
              gap: '12px',
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => setShowProfileSummary(false)}
                style={{
                  padding: '8px 16px',
                  background: '#5c2e91',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                {t.closeBtn}
              </button>
              <button
                type="button"
                onClick={endAuthenticatedSession}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: '#b91c1c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                <LogOut size={16} strokeWidth={1.5} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
