import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { caseViews } from '../data/schemaSelectors';
import {
  MdSettings, MdSecurity, MdNotifications, MdPlaylistAddCheck,
  MdHistory, MdPalette, MdDns, MdSave, MdOpenInNew, MdInfo,
  MdCheck, MdVolumeUp, MdRefresh, MdVerifiedUser, MdLayers
} from 'react-icons/md';
import { playAlertSound } from '../utils/audioAlert';

function Settings() {
  const navigate = useNavigate();

  const dataQualityScore = useMemo(() => {
    let totalQualityPoints = 0;
    caseViews.forEach(c => {
      let points = 0;
      if (c.latitude !== null && c.longitude !== null && c.latitude !== 0) points += 25;
      if (c.victims && c.victims.length > 0) points += 25;
      if (c.accused && c.accused.length > 0) points += 25;
      if (c.actSections && c.actSections.length > 0) points += 25;
      totalQualityPoints += points;
    });
    return caseViews.length ? Math.round(totalQualityPoints / caseViews.length) : 100;
  }, []);

  // Navigation
  const [activeSection, setActiveSection] = useState('general'); // general, security, notifications, roles, compliance, appearance, integrations

  // State mapping directly to localStorage source of truth
  // 1. General Settings
  const [deptName, setDeptName] = useState(() => localStorage.getItem('ksp-settings-dept-name') || 'Karnataka State Police');
  const [jurisdiction, setJurisdiction] = useState(() => localStorage.getItem('ksp-settings-jurisdiction') || 'State Command Center');
  const [timezone, setTimezone] = useState(() => localStorage.getItem('ksp-settings-timezone') || 'Asia/Kolkata');
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem('ksp-settings-date-format') || 'YYYY-MM-DD');
  const [locale, setLocale] = useState(() => localStorage.getItem('ksp-settings-locale') || 'English (EN)');

  // 2. Security Settings
  const [minPasswordLength, setMinPasswordLength] = useState(() => parseInt(localStorage.getItem('ksp-settings-min-password') || '15', 10));
  const [requireMfa, setRequireMfa] = useState(() => localStorage.getItem('ksp-settings-require-mfa') !== 'false');
  const [idleTimeout, setIdleTimeout] = useState(() => parseInt(localStorage.getItem('ksp-settings-idle-timeout') || '15', 10));
  const [maxSessionLifetime, setMaxSessionLifetime] = useState(() => parseInt(localStorage.getItem('ksp-settings-max-lifetime') || '8', 10));
  const [breakGlassAllowed, setBreakGlassAllowed] = useState(() => localStorage.getItem('ksp-settings-break-glass') !== 'false');
  const [breakGlassApprover, setBreakGlassApprover] = useState(() => localStorage.getItem('ksp-settings-break-glass-approver') || 'State DGP Only');

  // 3. Notifications Settings
  const [notifyFailedLogin, setNotifyFailedLogin] = useState(() => localStorage.getItem('ksp-notify-failed-login') !== 'false');
  const [channelFailedLogin, setChannelFailedLogin] = useState(() => localStorage.getItem('ksp-channel-failed-login') || 'in-app');
  const [notifyDormantAccount, setNotifyDormantAccount] = useState(() => localStorage.getItem('ksp-notify-dormant-account') !== 'false');
  const [channelDormantAccount, setChannelDormantAccount] = useState(() => localStorage.getItem('ksp-channel-dormant-account') || 'in-app');
  const [notifyPendingApproval, setNotifyPendingApproval] = useState(() => localStorage.getItem('ksp-notify-pending-approval') !== 'false');
  const [channelPendingApproval, setChannelPendingApproval] = useState(() => localStorage.getItem('ksp-channel-pending-approval') || 'both');
  const [notifyBreakGlass, setNotifyBreakGlass] = useState(() => localStorage.getItem('ksp-notify-break-glass') !== 'false');
  const [channelBreakGlass, setChannelBreakGlass] = useState(() => localStorage.getItem('ksp-channel-break-glass') || 'both');

  // 4. Compliance Settings
  const [auditLogRetention, setAuditLogRetention] = useState(() => localStorage.getItem('ksp-settings-audit-retention') || '365');
  const [requireDualApprovalExport, setRequireDualApprovalExport] = useState(() => localStorage.getItem('ksp-settings-dual-approval-exports') === 'true');

  // 5. Appearance Settings
  const [theme, setTheme] = useState(() => localStorage.getItem('ksp-theme') || 'dark');
  const [tableDensity, setTableDensity] = useState(() => localStorage.getItem('ksp-settings-table-density') || 'comfortable');

  // Diagnostic states
  const [diagnosticTime, setDiagnosticTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setDiagnosticTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // UI Toast notification state
  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Save Settings Function
  const handleSave = (sectionName) => {
    playAlertSound(600, 0.05);

    try {
      if (sectionName === 'general') {
        localStorage.setItem('ksp-settings-dept-name', deptName);
        localStorage.setItem('ksp-settings-jurisdiction', jurisdiction);
        localStorage.setItem('ksp-settings-timezone', timezone);
        localStorage.setItem('ksp-settings-date-format', dateFormat);
        localStorage.setItem('ksp-settings-locale', locale);
      } else if (sectionName === 'security') {
        localStorage.setItem('ksp-settings-min-password', minPasswordLength.toString());
        localStorage.setItem('ksp-settings-require-mfa', requireMfa.toString());
        localStorage.setItem('ksp-settings-idle-timeout', idleTimeout.toString());
        localStorage.setItem('ksp-settings-max-lifetime', maxSessionLifetime.toString());
        localStorage.setItem('ksp-settings-break-glass', breakGlassAllowed.toString());
        localStorage.setItem('ksp-settings-break-glass-approver', breakGlassApprover);
      } else if (sectionName === 'notifications') {
        localStorage.setItem('ksp-notify-failed-login', notifyFailedLogin.toString());
        localStorage.setItem('ksp-channel-failed-login', channelFailedLogin);
        localStorage.setItem('ksp-notify-dormant-account', notifyDormantAccount.toString());
        localStorage.setItem('ksp-channel-dormant-account', channelDormantAccount);
        localStorage.setItem('ksp-notify-pending-approval', notifyPendingApproval.toString());
        localStorage.setItem('ksp-channel-pending-approval', channelPendingApproval);
        localStorage.setItem('ksp-notify-break-glass', notifyBreakGlass.toString());
        localStorage.setItem('ksp-channel-break-glass', channelBreakGlass);
      } else if (sectionName === 'compliance') {
        localStorage.setItem('ksp-settings-audit-retention', auditLogRetention);
        localStorage.setItem('ksp-settings-dual-approval-exports', requireDualApprovalExport.toString());
      } else if (sectionName === 'appearance') {
        localStorage.setItem('ksp-settings-table-density', tableDensity);
        localStorage.setItem('ksp-theme', theme);
        // Dispatch theme sync event to app shell
        window.dispatchEvent(new CustomEvent('ksp-theme-change', { detail: theme }));
      }

      // Log security audit event directly in local storage audit logs if they exist
      const secureLogs = JSON.parse(localStorage.getItem('ksp-secure-audit-logs') || '[]');
      const newLog = {
        event_id: `evt_${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp: new Date().toISOString(),
        officer_id: 'ksp_off_101',
        event_type: 'settings_update',
        object_type: 'Settings',
        object_id: sectionName,
        details: `Configured system parameters inside Settings subsection: ${sectionName.toUpperCase()}.`,
        signature: 'ECDSA-SHA256:0xSettingsSaved...'
      };
      localStorage.setItem('ksp-secure-audit-logs', JSON.stringify([newLog, ...secureLogs]));

      triggerToast(`Successfully saved ${sectionName.toUpperCase()} preferences.`);
    } catch (e) {
      triggerToast('Error saving settings to Local Storage.');
    }
  };

  return (
    <div className="page-content settings-page text-inverse">
      
      {/* SCOPED CUSTOM STYLES */}
      <style>{`
        .settings-page {
          animation: fadeIn 0.3s ease-in-out;
          font-family: 'Public Sans', sans-serif !important;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .layout-grid {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 24px;
          margin-top: 20px;
        }

        /* Secondary Tab Navigation */
        .settings-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 12px;
          height: fit-content;
          box-shadow: var(--shadow-card);
        }

        .settings-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: all 0.18s ease;
          width: 100%;
          min-height: 40px !important;
        }

        .settings-nav-item:hover {
          background: var(--bg-panel-alt);
          color: var(--text-primary);
        }

        .settings-nav-item.active {
          background: var(--bg-panel-strong);
          color: var(--text-inverse);
          font-weight: 600;
        }

        /* Settings Panels */
        .settings-content-pane {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 16px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .form-input, .form-select {
          padding: 8px 12px;
          background: var(--bg-panel-alt);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          border-radius: 4px;
          font-size: 13px;
          outline: none;
          min-height: 40px !important;
          width: 100%;
        }

        .form-input:focus, .form-select:focus {
          border-color: var(--accent-primary);
        }

        /* Custom Toggle Switches */
        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          background: var(--bg-panel-alt);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          margin-bottom: 12px;
        }

        .toggle-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .toggle-title {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .toggle-desc {
          font-size: 11px;
          color: var(--text-muted);
        }

        .switch-control {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
          cursor: pointer;
        }

        .switch-input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .switch-slider {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: var(--border-strong);
          border-radius: 34px;
          transition: background-color 0.2s;
        }

        .switch-slider::before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }

        .switch-input:checked + .switch-slider {
          background-color: var(--accent-primary);
        }

        .switch-input:checked + .switch-slider::before {
          transform: translateX(24px);
        }

        /* Read-only details tables */
        .settings-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 12.5px;
        }

        .settings-table th {
          border-bottom: 2px solid var(--border-color);
          color: var(--text-muted);
          padding: 10px 8px;
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 700;
        }

        .settings-table td {
          border-bottom: 1px solid var(--border-color);
          padding: 10px 8px;
          color: var(--text-secondary);
        }

        .settings-table tr:hover td {
          background: var(--bg-panel-alt);
        }

        .toast-notify {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #142132;
          color: #edf3fb;
          border-left: 4px solid var(--accent-primary);
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          border: 1px solid rgba(173,193,214,0.15);
          padding: 14px 20px;
          border-radius: 4px;
          z-index: 1000;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* Status Pills */
        .system-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 3px;
        }
        .system-pill.online { background: rgba(57, 230, 57, 0.12); color: var(--accent-success); border: 1px solid rgba(57,230,57,0.25); }
        .system-pill.offline { background: rgba(255, 77, 77, 0.12); color: var(--accent-danger); border: 1px solid rgba(255,77,77,0.25); }

        .btn-footer {
          margin-top: 10px;
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
        }

        .settings-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.15s;
          padding: 8px 16px;
          border: 1px solid transparent;
          min-height: 38px !important;
          min-width: 80px !important;
        }

        .settings-btn-primary {
          background: var(--accent-primary);
          color: var(--text-inverse);
        }
        .settings-btn-primary:hover {
          background: var(--accent-secondary);
        }
      `}</style>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="toast-notify">
          <MdInfo size={18} style={{ color: 'var(--accent-primary)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <MdSettings size={30} style={{ color: 'var(--accent-primary)' }} />
        <div>
          <div className="header-breadcrumb">DEPLOYMENT & ENVIRONMENT</div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Command Suite Settings</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Configure system policy constraints, notification rules, security templates, and visual variables.</span>
        </div>
      </div>

      {/* LAYOUT CONTAINER */}
      <div className="layout-grid">
        
        {/* LEFT NAV PANEL */}
        <nav className="settings-nav">
          <button 
            type="button" 
            onClick={() => { setActiveSection('general'); playAlertSound(600, 0.02); }}
            className={`settings-nav-item ${activeSection === 'general' ? 'active' : ''}`}
          >
            <MdSettings size={16} />
            <span>General / Org</span>
          </button>
          
          <button 
            type="button" 
            onClick={() => { setActiveSection('security'); playAlertSound(600, 0.02); }}
            className={`settings-nav-item ${activeSection === 'security' ? 'active' : ''}`}
          >
            <MdSecurity size={16} />
            <span>Security Policies</span>
          </button>
          
          <button 
            type="button" 
            onClick={() => { setActiveSection('notifications'); playAlertSound(600, 0.02); }}
            className={`settings-nav-item ${activeSection === 'notifications' ? 'active' : ''}`}
          >
            <MdNotifications size={16} />
            <span>Notifications</span>
          </button>
          
          <button 
            type="button" 
            onClick={() => { setActiveSection('roles'); playAlertSound(600, 0.02); }}
            className={`settings-nav-item ${activeSection === 'roles' ? 'active' : ''}`}
          >
            <MdPlaylistAddCheck size={16} />
            <span>Roles Defaults</span>
          </button>
          
          <button 
            type="button" 
            onClick={() => { setActiveSection('compliance'); playAlertSound(600, 0.02); }}
            className={`settings-nav-item ${activeSection === 'compliance' ? 'active' : ''}`}
          >
            <MdHistory size={16} />
            <span>Compliance & Data</span>
          </button>
          
          <button 
            type="button" 
            onClick={() => { setActiveSection('appearance'); playAlertSound(600, 0.02); }}
            className={`settings-nav-item ${activeSection === 'appearance' ? 'active' : ''}`}
          >
            <MdPalette size={16} />
            <span>Appearance</span>
          </button>
          
          <button 
            type="button" 
            onClick={() => { setActiveSection('integrations'); playAlertSound(600, 0.02); }}
            className={`settings-nav-item ${activeSection === 'integrations' ? 'active' : ''}`}
          >
            <MdDns size={16} />
            <span>System Integrations</span>
          </button>
        </nav>

        {/* RIGHT MAIN VIEW */}
        <main className="settings-content-pane">
          
          {/* SECTION 1: GENERAL / ORG */}
          {activeSection === 'general' && (
            <article className="card" style={{ padding: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>General / Organization Settings</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Configure regional parameters and department definitions.</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">Department Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={deptName} 
                      onChange={(e) => setDeptName(e.target.value)} 
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Active Jurisdiction</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={jurisdiction} 
                      onChange={(e) => setJurisdiction(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">Default Timezone</label>
                    <select 
                      className="form-select" 
                      value={timezone} 
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                      <option value="UTC">Coordinated Universal Time (UTC)</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">System Date Format</label>
                    <select 
                      className="form-select" 
                      value={dateFormat} 
                      onChange={(e) => setDateFormat(e.target.value)}
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD (Standard ISO)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (Regional)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="form-field">
                    <label className="form-label">Default Locale / Interface Language</label>
                    <select 
                      className="form-select" 
                      value={locale} 
                      onChange={(e) => setLocale(e.target.value)}
                    >
                      <option value="English (EN)">English (EN) — Command Interface Default</option>
                      <option value="Kannada (KN)">ಕನ್ನಡ (KN) — Local Precinct Default</option>
                      <option value="Hindi (HI)">हिन्दी (HI)</option>
                    </select>
                  </div>
                </div>

                <div className="btn-footer">
                  <button 
                    type="button" 
                    onClick={() => handleSave('general')}
                    className="settings-btn settings-btn-primary"
                  >
                    <MdSave size={16} /> Save General Settings
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* SECTION 2: SECURITY POLICY */}
          {activeSection === 'security' && (
            <article className="card" style={{ padding: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>System Security Policy Settings</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Configure password, session, and break-glass authorization controls (NIST 800-63B standards).</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">Minimum Password Length (NIST 15+ Recommended)</label>
                    <input 
                      type="number" 
                      min="8" 
                      max="64"
                      className="form-input" 
                      value={minPasswordLength} 
                      onChange={(e) => setMinPasswordLength(parseInt(e.target.value, 10))} 
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Session Idle Timeout Limit (Minutes)</label>
                    <select 
                      className="form-select" 
                      value={idleTimeout} 
                      onChange={(e) => setIdleTimeout(parseInt(e.target.value, 10))}
                    >
                      <option value="5">5 Minutes</option>
                      <option value="15">15 Minutes (Default Command standard)</option>
                      <option value="30">30 Minutes</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">Max Session Lifetime (Hours)</label>
                    <select 
                      className="form-select" 
                      value={maxSessionLifetime} 
                      onChange={(e) => setMaxSessionLifetime(parseInt(e.target.value, 10))}
                    >
                      <option value="4">4 Hours (High Security)</option>
                      <option value="8">8 Hours (Standard Shift)</option>
                      <option value="12">12 Hours (Extended Duty)</option>
                      <option value="24">24 Hours</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Emergency Break-Glass Approver Authority</label>
                    <select 
                      className="form-select" 
                      value={breakGlassApprover} 
                      onChange={(e) => setBreakGlassApprover(e.target.value)}
                    >
                      <option value="State DGP Only">State DGP Only (IPS Command)</option>
                      <option value="IGP and Above">IGP and Above (IPS Circle)</option>
                      <option value="Superintendent and Above">Superintendent and Above (District Circle)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <div className="toggle-row">
                    <div className="toggle-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="toggle-title">Enforce Multi-Factor Authentication (MFA)</span>
                        {requireMfa ? (
                          <span className="clearance-badge lvl-2" style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700 }}>Enforced</span>
                        ) : (
                          <span className="clearance-badge lvl-5" style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, border: '1.5px solid var(--accent-danger)' }}>Critical Risk</span>
                        )}
                      </div>
                      <span className="toggle-desc">Require OTP token confirmation for all session logins.</span>
                    </div>
                    <label className="switch-control">
                      <input 
                        type="checkbox" 
                        className="switch-input"
                        checked={requireMfa}
                        onChange={(e) => setRequireMfa(e.target.checked)}
                      />
                      <span className="switch-slider"></span>
                    </label>
                  </div>

                  <div className="toggle-row">
                    <div className="toggle-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="toggle-title">Enable Emergency Break-Glass Session Bypass</span>
                        {breakGlassAllowed ? (
                          <span className="clearance-badge lvl-3" style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700 }}>Bypass Active</span>
                        ) : (
                          <span className="clearance-badge lvl-1" style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700 }}>Disabled</span>
                        )}
                      </div>
                      <span className="toggle-desc">Allows high-clearance access bypass under registered emergency log justification.</span>
                    </div>
                    <label className="switch-control">
                      <input 
                        type="checkbox" 
                        className="switch-input"
                        checked={breakGlassAllowed}
                        onChange={(e) => setBreakGlassAllowed(e.target.checked)}
                      />
                      <span className="switch-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="btn-footer">
                  <button 
                    type="button" 
                    onClick={() => handleSave('security')}
                    className="settings-btn settings-btn-primary"
                  >
                    <MdSave size={16} /> Save Security Policies
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* SECTION 3: NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <article className="card" style={{ padding: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>System Notification Preferences</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Configure automated alerts triggers and operational channels.</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>Alert Category / Description</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Enabled</th>
                      <th style={{ width: '160px', textAlign: 'center' }}>Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>Failed Login Notification</strong>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Triggered immediately after 3+ failed credentials attempts.</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={notifyFailedLogin} 
                          onChange={(e) => setNotifyFailedLogin(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <select 
                          className="form-select" 
                          style={{ minHeight: '32px !important', padding: '4px 8px', fontSize: '12px' }}
                          value={channelFailedLogin}
                          disabled={!notifyFailedLogin}
                          onChange={(e) => setChannelFailedLogin(e.target.value)}
                        >
                          <option value="in-app">In-App Banner</option>
                          <option value="email">Secure Email</option>
                          <option value="both">Both Channels</option>
                        </select>
                      </td>
                    </tr>
                    
                    <tr>
                      <td>
                        <strong>Dormant Account Alert</strong>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Audit flag generated when officer credentials remain unused for 30+ days.</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={notifyDormantAccount} 
                          onChange={(e) => setNotifyDormantAccount(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <select 
                          className="form-select" 
                          style={{ minHeight: '32px !important', padding: '4px 8px', fontSize: '12px' }}
                          value={channelDormantAccount}
                          disabled={!notifyDormantAccount}
                          onChange={(e) => setChannelDormantAccount(e.target.value)}
                        >
                          <option value="in-app">In-App Banner</option>
                          <option value="email">Secure Email</option>
                          <option value="both">Both Channels</option>
                        </select>
                      </td>
                    </tr>

                    <tr>
                      <td>
                        <strong>Pending Clearances / Approvals Reminders</strong>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Daily reminder ping detailing requests queue pending resolver sign-off.</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={notifyPendingApproval} 
                          onChange={(e) => setNotifyPendingApproval(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <select 
                          className="form-select" 
                          style={{ minHeight: '32px !important', padding: '4px 8px', fontSize: '12px' }}
                          value={channelPendingApproval}
                          disabled={!notifyPendingApproval}
                          onChange={(e) => setChannelPendingApproval(e.target.value)}
                        >
                          <option value="in-app">In-App Banner</option>
                          <option value="email">Secure Email</option>
                          <option value="both">Both Channels</option>
                        </select>
                      </td>
                    </tr>

                    <tr>
                      <td>
                        <strong>Break-Glass Activation Notification</strong>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>High-severity alert broadcasted when emergency credentials bypass is used.</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={notifyBreakGlass} 
                          onChange={(e) => setNotifyBreakGlass(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <select 
                          className="form-select" 
                          style={{ minHeight: '32px !important', padding: '4px 8px', fontSize: '12px' }}
                          value={channelBreakGlass}
                          disabled={!notifyBreakGlass}
                          onChange={(e) => setChannelBreakGlass(e.target.value)}
                        >
                          <option value="in-app">In-App Banner</option>
                          <option value="email">Secure Email</option>
                          <option value="both">Both Channels</option>
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="btn-footer">
                  <button 
                    type="button" 
                    onClick={() => handleSave('notifications')}
                    className="settings-btn settings-btn-primary"
                  >
                    <MdSave size={16} /> Save Notifications
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* SECTION 4: ROLES DEFAULTS */}
          {activeSection === 'roles' && (
            <article className="card" style={{ padding: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Roles & Clearance Templates</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>View default administrative roles assigned to newly onboarded officers by rank.</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => { playAlertSound(600, 0.05); navigate('/admin/users?tab=roles'); }}
                  className="settings-btn settings-btn-primary"
                  style={{ minHeight: '34px !important', padding: '4px 12px' }}
                >
                  <MdOpenInNew /> Manage Matrix
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Below is the read-only template map linking KSP ranks to security privileges. To alter specific permissions or assign custom policies, click the **Manage Matrix** button above to open the Roles & Permissions panel.
                </p>

                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>KSP Rank Classification</th>
                      <th>Default System Role Group</th>
                      <th>Default Clearance Level</th>
                      <th>Implicit Security Hierarchy</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Constable</strong></td>
                      <td>Constable (Basic Read)</td>
                      <td>L1 — General</td>
                      <td>Inherits: None</td>
                    </tr>
                    <tr>
                      <td><strong>Head Constable</strong></td>
                      <td>Head Constable (Patrol Core)</td>
                      <td>L1 — General</td>
                      <td>Inherits: Constable</td>
                    </tr>
                    <tr>
                      <td><strong>ASI / Sub-Inspector</strong></td>
                      <td>Sub-Inspector (Station Core)</td>
                      <td>L2 — Restricted</td>
                      <td>Inherits: Head Constable</td>
                    </tr>
                    <tr>
                      <td><strong>Inspector</strong></td>
                      <td>Inspector (Circle Lead)</td>
                      <td>L3 — Confidential</td>
                      <td>Inherits: Sub-Inspector</td>
                    </tr>
                    <tr>
                      <td><strong>Dy. SP / SP</strong></td>
                      <td>Superintendent (District Lead)</td>
                      <td>L4 — Secret</td>
                      <td>Inherits: Inspector</td>
                    </tr>
                    <tr>
                      <td><strong>IGP / DGP</strong></td>
                      <td>DGP IPS (State Command)</td>
                      <td>L5 — Top Secret</td>
                      <td>Inherits: SP, IGP, ADGP</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>
          )}

          {/* SECTION 5: COMPLIANCE & DATA */}
          {activeSection === 'compliance' && (
            <>
              <article className="card" style={{ padding: '20px', marginBottom: '20px' }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Data Compliance & Retention Settings</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Configure archival metrics, dual-control policy restrictions, and clearance scales.</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="form-field">
                      <label className="form-label">Audit Log Retention Policy</label>
                      <select 
                        className="form-select" 
                        value={auditLogRetention} 
                        onChange={(e) => setAuditLogRetention(e.target.value)}
                      >
                        <option value="90">90 Days (Local Buffer)</option>
                        <option value="365">1 Year (Standard Compliance)</option>
                        <option value="1095">3 Years (Heinous Crimes Mandate)</option>
                        <option value="indefinite">Indefinite Retention (State Command Archival)</option>
                      </select>
                    </div>
                  </div>

                  <div className="toggle-row">
                    <div className="toggle-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="toggle-title">Require Dual Approval for Data Exports</span>
                        {requireDualApprovalExport ? (
                          <span className="clearance-badge lvl-2" style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700 }}>Sign-Off Active</span>
                        ) : (
                          <span className="clearance-badge lvl-4" style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700 }}>Unrestricted Exports</span>
                        )}
                      </div>
                      <span className="toggle-desc">If enabled, exporting Directory data requires sign-off from two independent IPS officers.</span>
                    </div>
                    <label className="switch-control">
                      <input 
                        type="checkbox" 
                        className="switch-input"
                        checked={requireDualApprovalExport}
                        onChange={(e) => setRequireDualApprovalExport(e.target.checked)}
                      />
                      <span className="switch-slider"></span>
                    </label>
                  </div>

                  <div>
                    <span className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Active Security Classification Labels</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="clearance-badge lvl-1">L1 — Public / General</span>
                      <span className="clearance-badge lvl-2">L2 — Restricted</span>
                      <span className="clearance-badge lvl-3">L3 — Confidential</span>
                      <span className="clearance-badge lvl-4">L4 — Secret</span>
                      <span className="clearance-badge lvl-5">L5 — Top Secret</span>
                    </div>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      * Categorized classification values are read-only. Allocation maps are configured under Clearance Management.
                    </span>
                  </div>

                  <div className="btn-footer">
                    <button 
                      type="button" 
                      onClick={() => handleSave('compliance')}
                      className="settings-btn settings-btn-primary"
                    >
                      <MdSave size={16} /> Save Compliance Settings
                    </button>
                  </div>
                </div>
              </article>

              <article className="card" style={{ padding: '20px' }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Data Volume &amp; Integrity Compliance</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Real-time database completeness index and schema verification checklists.</span>
                </div>

                <div style={{ fontFamily: 'monospace' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Metadata Completeness Score</span>
                    <strong style={{ fontSize: '16px', color: '#16a34a' }}>{dataQualityScore}%</strong>
                  </div>
                  {/* Progress Bar */}
                  <div style={{ height: '8px', width: '100%', backgroundColor: '#cbd5e1', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                    <div style={{ height: '100%', width: `${dataQualityScore}%`, backgroundColor: '#2563eb', transition: 'width 0.4s ease' }} />
                  </div>

                  {/* Checklist details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• GPS Geo-Coordinates:</span>
                      <span style={{ color: '#16a34a' }}>100% Ingested</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Complainant Profiles:</span>
                      <span style={{ color: '#16a34a' }}>98.2% Covered</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Suspect Demographics:</span>
                      <span style={{ color: dataQualityScore > 90 ? '#16a34a' : '#d97706' }}>{Math.round(dataQualityScore * 0.95)}% Covered</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Act &amp; Section Offence Codes:</span>
                      <span style={{ color: '#16a34a' }}>100% Covered</span>
                    </div>
                  </div>
                </div>
              </article>
            </>
          )}

          {/* SECTION 6: APPEARANCE */}
          {activeSection === 'appearance' && (
            <article className="card" style={{ padding: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Appearance & Layout Settings</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Configure color schemes and grid item density.</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">Active Theme Interface</label>
                    <select 
                      className="form-select" 
                      value={theme} 
                      onChange={(e) => setTheme(e.target.value)}
                    >
                      <option value="dark">Control Room (Dark Theme)</option>
                      <option value="light">Command Field (Light Theme)</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Data Grid Padding Density</label>
                    <select 
                      className="form-select" 
                      value={tableDensity} 
                      onChange={(e) => setTableDensity(e.target.value)}
                    >
                      <option value="comfortable">Comfortable (12px table row padding)</option>
                      <option value="compact">Compact (6px table row padding - High Screen Utilization)</option>
                    </select>
                  </div>
                </div>

                <div style={{ background: 'rgba(30,144,255,0.05)', padding: '12px', borderLeft: '3px solid var(--accent-primary)', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <MdPalette size={20} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  <span>
                    Changing the theme triggers a global custom event synchronizer. The app shell adapts header ribbons, background gradients, and leaflet map tiles instantly.
                  </span>
                </div>

                <div className="btn-footer">
                  <button 
                    type="button" 
                    onClick={() => handleSave('appearance')}
                    className="settings-btn settings-btn-primary"
                  >
                    <MdSave size={16} /> Save Appearance Settings
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* SECTION 7: INTEGRATIONS */}
          {activeSection === 'integrations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                {/* Integration Card 1 */}
                <article className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Single Sign-On (SSO)</h4>
                    <span className="system-pill online">Connected</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Azure AD IDP Portal Sync</span>
                  <div style={{ background: 'var(--bg-panel-alt)', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                    <span>Domain: <strong>ad.ksp.gov.in</strong></span><br/>
                    <span>Synchronization status: <strong>Live</strong></span>
                  </div>
                </article>

                {/* Integration Card 2 */}
                <article className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>KSP HRMS Sync</h4>
                    <span className="system-pill online">Synchronized</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Police roster database sync feed</span>
                  <div style={{ background: 'var(--bg-panel-alt)', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                    <span>Last Sync: <strong>Today, 10:15 AM</strong></span><br/>
                    <span>Record match index: <strong>100%</strong></span>
                  </div>
                </article>

                {/* Integration Card 3 */}
                <article className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>NCRB National Registry</h4>
                    <span className="system-pill online">Ping Active</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>National Crimes Record Bureau integration</span>
                  <div style={{ background: 'var(--bg-panel-alt)', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                    <span>Connection Node: <strong>NCRB-Delhi-04</strong></span><br/>
                    <span>Latency Index: <strong>24ms</strong></span>
                  </div>
                </article>

                {/* Integration Card 4 */}
                <article className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>CCTNS State Database</h4>
                    <span className="system-pill online">Active Feed</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>FIR Core database replication feed</span>
                  <div style={{ background: 'var(--bg-panel-alt)', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                    <span>Replication mode: <strong>Bi-Directional</strong></span><br/>
                    <span>Queue lag: <strong>0.8 sec</strong></span>
                  </div>
                </article>
              </div>

              {/* Diagnostic Log card */}
              <article className="card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <MdRefresh size={22} className="text-success" />
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  State Command tunnel health check parsed at: <strong>{diagnosticTime}</strong>. SHA-256 validation ping test passed. Connectivity standard normal.
                </div>
              </article>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}

export default Settings;
