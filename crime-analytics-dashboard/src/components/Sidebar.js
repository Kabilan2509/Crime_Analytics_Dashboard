import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MdDashboard, MdMap, MdBarChart, MdDescription, MdSettings,
  MdShield, MdClose, MdSmartToy, MdHub,
  MdAutoGraph, MdAssignment, MdPeople, MdLink, MdLogout
} from 'react-icons/md';
import { useSecurity } from '../context/SecurityContext';
import { caseViews } from '../data/schemaSelectors';

const IDLE_TIMEOUT_MS = 2.5 * 60 * 1000;
const LOGIN_PATH = '/__catalyst/auth/login';
const BROWSER_SESSION_KEY = 'ksp-catalyst-browser-session';

/**
 * Sidebar — Command center navigation
 *
 * Organized into operational sections:
 *   Operations → Command Center, Dispatch, War Room, Briefing, Map, Statistics, Reports
 *   AI Intelligence → Copilot, Network Graph, Case Priorities, Predictions
 *   Investigation → Case Overview, Evidence, Officer Analytics, Suspect Timeline
 *   Deployment → Patrol, Resources, EOC, Admin, Settings
 */
function Sidebar({ isOpen, isCollapsed, onClose }) {
  const { isCommandMode, logout: clearLocalSession } = useSecurity();
  const [idleSecondsRemaining, setIdleSecondsRemaining] = useState(IDLE_TIMEOUT_MS / 1000);

  const endAuthenticatedSession = useCallback(() => {
    clearLocalSession();
    window.sessionStorage.removeItem(BROWSER_SESSION_KEY);
    const loginUrl = `${window.location.origin}${LOGIN_PATH}`;

    try {
      if (window.catalyst?.auth?.signOut) {
        window.catalyst.auth.signOut(loginUrl);
        return;
      }
    } catch (error) {
      console.error('Catalyst sign out failed; continuing to hosted login.', error);
    }

    window.location.replace(loginUrl);
  }, [clearLocalSession]);

  useEffect(() => {
    let idleDeadline = Date.now() + IDLE_TIMEOUT_MS;
    let hasTimedOut = false;

    const resetIdleDeadline = () => {
      if (hasTimedOut) return;
      idleDeadline = Date.now() + IDLE_TIMEOUT_MS;
      setIdleSecondsRemaining(IDLE_TIMEOUT_MS / 1000);
    };
    const updateCountdown = () => {
      const seconds = Math.max(0, Math.ceil((idleDeadline - Date.now()) / 1000));
      setIdleSecondsRemaining(seconds);
      if (seconds === 0 && !hasTimedOut) {
        hasTimedOut = true;
        endAuthenticatedSession();
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'click', 'keydown', 'scroll', 'touchstart', 'pointerdown'];
    activityEvents.forEach(eventName => window.addEventListener(eventName, resetIdleDeadline, { passive: true }));
    const countdownInterval = window.setInterval(updateCountdown, 1000);
    updateCountdown();

    return () => {
      window.clearInterval(countdownInterval);
      activityEvents.forEach(eventName => window.removeEventListener(eventName, resetIdleDeadline));
    };
  }, [endAuthenticatedSession]);

  const idleTimerLabel = `${String(Math.floor(idleSecondsRemaining / 60)).padStart(2, '0')}:${String(idleSecondsRemaining % 60).padStart(2, '0')}`;

  const quickStats = useMemo(() => {
    const total = caseViews.length;
    const heinous = caseViews.filter(c => c.isHeinous).length;
    const pending = caseViews.filter(c => c.statusName === 'Under Investigation').length;
    return { total, heinous, pending };
  }, []);

  const navSections = [
    {
      title: 'OPERATIONS',
      items: [
        { path: '/', icon: <MdDashboard />, label: 'Command Center' },
        { path: '/briefing', icon: <MdAssignment />, label: 'Operational Intelligence Briefing', badge: 'AI' },
        { path: '/map', icon: <MdMap />, label: 'GIS Intelligence Map' },
        { path: '/statistics', icon: <MdBarChart />, label: 'Crime Statistics' },
        { path: '/reports', icon: <MdDescription />, label: 'Reports' },
      ],
    },
    {
      title: 'AI INTELLIGENCE',
      items: [
        { path: '/copilot', icon: <MdSmartToy />, label: 'AI Copilot', badge: 'NEW' },
        { path: '/network', icon: <MdHub />, label: 'Criminal Network', badge: 'NEW' },
        { path: '/predictions', icon: <MdAutoGraph />, label: 'Predictions' },
      ],
    },
    {
      title: 'INVESTIGATION',
      items: [
        { path: '/cases', icon: <MdPeople />, label: 'Case Overview' },
        { path: '/evidence', icon: <MdLink />, label: 'Evidence Workspace', badge: 'AI' },
        { path: '/suspect-timeline', icon: <MdAutoGraph />, label: 'Suspect Timeline', badge: 'NEW' },
      ],
    },
    {
      title: 'DEPLOYMENT',
      items: [
        { path: '/admin/users', icon: <MdPeople />, label: 'User Management' },
        { path: '/settings', icon: <MdSettings />, label: 'Settings' },
      ],
    },
  ];

  return (
    <>
      <aside id="primary-sidebar" className={`sidebar ${isOpen ? 'open' : ''}${isCollapsed ? ' collapsed' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-mark">
            <MdShield size={24} />
          </div>
          <div className="brand-copy">
            <div className="brand-eyebrow">Karnataka State Police</div>
            <div className="brand-title">MADHUKAR</div>
            <div className="brand-subtitle" title="Modern Analytics and Data Hub for User Friendly Karnataka Anti Crime Response Dashboard">Modern Analytics &amp; Data Hub</div>
          </div>
          <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <MdClose size={20} />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="sidebar-nav">
          {navSections.map(section => (
            <div key={section.title} className="nav-section">
              <div className="nav-section-title">{section.title}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.badge && (
                    <span className={`nav-badge ${item.badge === 'NEW' ? 'badge-new' : 'badge-ai'}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Quick Stats Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-stat-row">
            <span>Active Cases</span>
            <strong>{quickStats.total}</strong>
          </div>
          <div className="sidebar-stat-row">
            <span>Heinous</span>
            <strong className="text-danger">{quickStats.heinous}</strong>
          </div>
          <div className="sidebar-stat-row">
            <span>Under Investigation</span>
            <strong className="text-warning">{quickStats.pending}</strong>
          </div>
          <div className="sidebar-session">
            <div className={`session-dot ${isCommandMode ? 'active' : ''}`} />
            <span>{isCommandMode ? 'Command Mode' : 'Restricted Mode'}</span>
          </div>
          <div className="sidebar-session-actions">
            <div
              className={`session-timer${idleSecondsRemaining <= 30 ? ' session-timer-warning' : ''}`}
              title="Time remaining before automatic logout due to inactivity"
              aria-label={`Automatic logout in ${idleTimerLabel}`}
            >
              <span>Idle logout</span>
              <strong>{idleTimerLabel}</strong>
            </div>
            <button
              type="button"
              className="header-logout-btn sidebar-logout-btn"
              onClick={endAuthenticatedSession}
              title="Log out of the KSP dashboard"
            >
              <MdLogout size={17} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />}
    </>
  );
}

export default Sidebar;
