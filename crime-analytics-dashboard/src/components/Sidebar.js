import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MdDashboard, MdMap, MdBarChart, MdDescription, MdSettings,
  MdShield, MdClose, MdSmartToy, MdHub,
  MdAutoGraph, MdAssignment, MdPeople, MdLink
} from 'react-icons/md';
import { useSecurity } from '../context/SecurityContext';
import { caseViews } from '../data/schemaSelectors';

/**
 * Sidebar — Command center navigation
 *
 * Organized into operational sections:
 *   Operations → Command Center, Dispatch, War Room, Briefing, Map, Statistics, Reports
 *   AI Intelligence → Copilot, Network Graph, Case Priorities, Predictions
 *   Investigation → Case Overview, Evidence, Officer Analytics, Suspect Timeline
 *   Deployment → Patrol, Resources, EOC, Admin, Settings
 */
function Sidebar({ isOpen, onClose }) {
  const { isCommandMode } = useSecurity();

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
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-mark">
            <MdShield size={24} />
          </div>
          <div className="brand-copy">
            <div className="brand-eyebrow">Karnataka State Police</div>
            <div className="brand-title">AI Command Suite</div>
            <div className="brand-subtitle">MADHUKAR Intelligence Platform</div>
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
        </div>
      </aside>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
    </>
  );
}

export default Sidebar;
