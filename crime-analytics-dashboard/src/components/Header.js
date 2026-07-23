import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  MdMenu, MdOutlineLightMode, MdOutlineDarkMode,
  MdNotificationsNone, MdSearch, MdShield,
  MdAccountCircle, MdLock, MdVerifiedUser,
} from 'react-icons/md';
import { useSecurity } from '../context/SecurityContext';
import CommandPalette from './ui/CommandPalette';
import PIIUnlockModal from './ui/PIIUnlockModal';

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

function Header({ theme, onToggleTheme, onToggleSidebar, sidebarCollapsed, sidebarOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const page = PAGE_TITLES[location.pathname] || PAGE_TITLES['/'];
  const { session, isCommandMode, lockSession } = useSecurity();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showPiiModal, setShowPiiModal] = useState(false);
  const [showLockDropdown, setShowLockDropdown] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
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
  }, [isCommandMode, session.unlockedAt]);

  const handlePillClick = () => {
    if (isCommandMode) {
      setShowLockDropdown(prev => !prev);
    } else {
      setShowPiiModal(true);
    }
  };

  const alerts = [
    { id: 1, type: 'Spike', text: 'Crime spike: Cyber Crimes in Bengaluru Urban (+18% past 48h)', time: '5m ago', unread: true },
    { id: 2, type: 'Crisis', text: 'Delayed response: Heinous Crime response time in Belagavi', time: '18m ago', unread: true },
    { id: 3, type: 'Alert', text: 'Hubballi Division exceeds monthly closure target', time: '1h ago', unread: false },
  ];

  return (
    <header className="header" style={{ position: 'relative' }}>
      {/* Row 1: Government Ribbon */}
      <div className="utility-ribbon">
        <div className="ribbon-left">
          <strong>GOVERNMENT OF KARNATAKA</strong>
          <span className="ribbon-sep">•</span>
          <span>HOME DEPARTMENT</span>
          <span className="ribbon-sep">•</span>
          <strong>KARNATAKA STATE POLICE</strong>
        </div>
        <div className="ribbon-right">
          <time className="command-clock" dateTime={currentTime.toISOString()} title="Indian Standard Time">
            <strong>{clockTime}</strong>
            <span>{clockDate} · IST</span>
          </time>
          <span className="ribbon-clock-separator" aria-hidden="true" />
          <span className="freshness-dot" />
          SECURE PROTOCOL HTTPS/AES-256
        </div>
      </div>

      {/* Row 2: Title + Controls */}
      <div className="header-main">
        <div className="header-left">
          <button
            type="button"
            className="header-menu-btn"
            onClick={onToggleSidebar}
            aria-label={compactViewport
              ? `${sidebarOpen ? 'Close' : 'Open'} navigation`
              : `${sidebarCollapsed ? 'Expand' : 'Collapse'} navigation`}
            aria-expanded={compactViewport ? sidebarOpen : !sidebarCollapsed}
            aria-controls="primary-sidebar"
            title={compactViewport
              ? `${sidebarOpen ? 'Close' : 'Open'} sidebar`
              : `${sidebarCollapsed ? 'Expand' : 'Collapse'} sidebar`}
          >
            <MdMenu size={22} />
          </button>
          <MdShield size={28} className="header-shield" />
          <div>
            <div className="header-breadcrumb">
              {location.pathname.startsWith('/predictions') ? 'AI Intelligence / Predictions' : 'Command Center / Police Operations'}
            </div>
            <h1 className="header-title">{page.title}</h1>
          </div>
        </div>

        <div className="header-right">
          {/* Search trigger */}
          <label className="header-search-shell" htmlFor="portal-search">
            <MdSearch size={16} />
            <input
              id="portal-search"
              type="text"
              placeholder="Quick Lookup (Ctrl+K)"
              onFocus={e => { e.target.blur(); openQuickLookup(); }}
              readOnly
            />
            <span className="kbd-hint">Ctrl+K</span>
          </label>

          {/* Persistent security authorization banner */}
          {isCommandMode && (
            <div 
              style={{
                fontSize: '10px',
                color: 'var(--accent-success, #00e676)',
                background: 'rgba(0, 230, 118, 0.08)',
                border: '1px solid rgba(0, 230, 118, 0.2)',
                borderRadius: '4px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '32px',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap'
              }} 
              className="command-banner-indicator"
              title={`Authorized access granted to station ${session.unitName}`}
            >
              <span style={{ width: '6px', height: '6px', background: 'var(--accent-success, #00e676)', borderRadius: '50%', display: 'inline-block' }} />
              <span className="command-banner-label">COMMAND MODE</span>
              <span className="command-banner-details">— {session.officerName} ({session.badgeId}) — unlocked {elapsedTime}</span>
            </div>
          )}

          {/* Security badge & Interactive Lock Button for PII */}
          <div className="security-control" style={{ position: 'relative' }}>
            <div 
              className={`security-pill ${isCommandMode ? 'live' : ''}`}
              onClick={handlePillClick}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              title="Click to manage PII access permissions"
            >
              {isCommandMode ? <MdVerifiedUser size={14} /> : <MdLock size={14} />}
              <span className="security-pill-label">
                {isCommandMode ? 'Command Mode' : 'Restricted'}
              </span>
              <span style={{ fontSize: '9px', marginLeft: '4px', opacity: 0.6 }}>🔑</span>
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
                  background: 'var(--bg-panel, #142132)',
                  border: '1px solid var(--border-color, rgba(173, 193, 214, 0.16))',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
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
                      display: 'block'
                    }}
                  >
                    🔒 Lock PII Access
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Theme toggle */}
          <button type="button" className="header-icon-btn" onClick={onToggleTheme} aria-label="Toggle theme" title="Toggle theme">
            {theme === 'light' ? <MdOutlineDarkMode size={18} /> : <MdOutlineLightMode size={18} />}
          </button>

          {/* Notifications */}
          <div className="header-notifications">
            <button type="button" className="header-icon-btn" onClick={() => setShowNotifications(!showNotifications)} aria-label="Notifications">
              <MdNotificationsNone size={18} />
              <span className="notif-dot" />
            </button>
            {showNotifications && (
              <>
                <div className="dropdown-backdrop" onClick={() => setShowNotifications(false)} />
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <strong>Operational Alerts</strong>
                    <span className="badge badge-danger">2 New</span>
                  </div>
                  {alerts.map(a => (
                    <div key={a.id} className={`notif-item ${a.unread ? 'unread' : ''}`}>
                      <div className="notif-item-top">
                        <span className="notif-type">{a.type}</span>
                        <span className="notif-time">{a.time}</span>
                      </div>
                      <p className="notif-text">{a.text}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Profile */}
          <div className="header-profile">
            <MdAccountCircle size={22} />
            <div>
              <span className="profile-name">
                {session.officerName ? session.officerName : 'DGP Kishore, IPS'}
              </span>
              <span className="profile-role">
                {session.badgeId ? `${session.badgeId} · ${session.unitName}` : 'State DGP Command'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
      <PIIUnlockModal isOpen={showPiiModal} onClose={() => setShowPiiModal(false)} />
    </header>
  );
}

export default Header;
