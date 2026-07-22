import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MdMenu, MdOutlineLightMode, MdOutlineDarkMode,
  MdNotificationsNone, MdSearch, MdShield,
  MdAccountCircle, MdLock, MdVerifiedUser, MdLockOpen,
} from 'react-icons/md';
import { useSecurity } from '../context/SecurityContext';

/**
 * Header — Compact 2-row layout (ribbon + controls)
 *
 * Row 1: Government ribbon with security badge
 * Row 2: Page title + search + theme toggle + notifications + profile
 *
 * Session Strip is now a floating modal overlay triggerable from the header bar.
 */

const PAGE_TITLES = {
  '/':          { title: 'State Crime Analytics Command Center', subtitle: 'Statewide crime intelligence and incident command desk' },
  '/map':       { title: 'Spatial Heatmap & GIS', subtitle: 'Crime concentration mapping and risk forecast layers' },
  '/statistics':{ title: 'Statistical Analytics Suite', subtitle: 'Pattern analysis, temporal distributions, and rankings' },
  '/reports':   { title: 'Briefing & Report Generator', subtitle: 'Intelligence summaries and briefing exports' },
  '/settings':  { title: 'Command Center Configuration', subtitle: 'Thresholds, refresh frequencies, and scaling settings' },
  '/predictions':{ title: 'Predictions', subtitle: 'Predictive intelligence modeling and regional risk forecasts' },
};

function Header({ theme, onToggleTheme, onOpenSidebar }) {
  const location = useLocation();
  const page = PAGE_TITLES[location.pathname] || PAGE_TITLES['/'];
  const { session, isCommandMode, startSecureSession, lockSession } = useSecurity();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showPiiModal, setShowPiiModal] = useState(false);
  const [form, setForm] = useState({ officerName: '', badgeId: '', unitName: '', role: 'Field Officer' });

  const handleSubmit = (e) => {
    e.preventDefault();
    startSecureSession(form);
    setShowPiiModal(false);
  };
  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

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
          <span className="freshness-dot" />
          SECURE PROTOCOL HTTPS/AES-256
        </div>
      </div>

      {/* Row 2: Title + Controls */}
      <div className="header-main">
        <div className="header-left">
          <button type="button" className="header-menu-btn" onClick={onOpenSidebar} aria-label="Open navigation">
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
              onFocus={e => { e.target.blur(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })); }}
              readOnly
            />
            <span className="kbd-hint">Ctrl+K</span>
          </label>

          {/* Security badge & Interactive Lock Button for PII */}
          <div 
            className={`security-pill ${isCommandMode ? 'live' : ''}`}
            onClick={() => setShowPiiModal(true)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
            title="Click to manage PII access permissions"
          >
            {isCommandMode ? <MdVerifiedUser size={14} /> : <MdLock size={14} />}
            <span className="security-pill-label">{isCommandMode ? session.role : 'Redacted'}</span>
            <span style={{ fontSize: '9px', marginLeft: '4px', opacity: 0.6 }}>🔑</span>
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
              <span className="profile-name">DGP Kishore, IPS</span>
              <span className="profile-role">State DGP Command</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Modal Overlay for PII Credentials */}
      {showPiiModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowPiiModal(false)}
        >
          <div 
            style={{
              background: 'var(--bg-panel, #142132)',
              border: '1px solid var(--border-color, rgba(173, 193, 214, 0.16))',
              borderRadius: '8px',
              padding: '24px',
              width: '320px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              fontFamily: 'monospace',
              color: 'var(--text-primary)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <strong style={{ fontSize: '13px', textTransform: 'uppercase', color: '#60a5fa', letterSpacing: '0.5px' }}>
                🔑 PII Access Control
              </strong>
              <button 
                onClick={() => setShowPiiModal(false)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--text-secondary)', 
                  cursor: 'pointer', 
                  fontSize: '14px',
                  minHeight: 'auto',
                  minWidth: 'auto'
                }}
              >
                ✕
              </button>
            </div>

            {isCommandMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '11px', margin: 0, color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Secure session active for <strong>{session.officerName}</strong> at <strong>{session.unitName}</strong>.
                </p>
                <button 
                  type="button" 
                  onClick={() => {
                    lockSession();
                    setShowPiiModal(false);
                  }} 
                  style={{
                    background: 'var(--accent-danger, #ff4d4d)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    width: '100%',
                    minHeight: '36px'
                  }}
                >
                  Lock Session (Redact PII)
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>PSI NAME</label>
                  <input 
                    value={form.officerName} 
                    onChange={e => setField('officerName', e.target.value)} 
                    placeholder="e.g. Inspector Ramesh" 
                    required 
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-panel-alt)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                      minHeight: '36px'
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>KGID / BADGE NUMBER</label>
                  <input 
                    value={form.badgeId} 
                    onChange={e => setField('badgeId', e.target.value)} 
                    placeholder="e.g. KG12345" 
                    required 
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-panel-alt)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                      minHeight: '36px'
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>ASSIGNED STATION</label>
                  <input 
                    value={form.unitName} 
                    onChange={e => setField('unitName', e.target.value)} 
                    placeholder="e.g. Shivaji Nagar PS" 
                    required 
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-panel-alt)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                      minHeight: '36px'
                    }} 
                  />
                </div>
                <button 
                  type="submit" 
                  style={{
                    background: 'var(--accent-primary, #3b82f6)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginTop: '4px',
                    width: '100%',
                    minHeight: '36px'
                  }}
                >
                  Unlock PII Data
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
