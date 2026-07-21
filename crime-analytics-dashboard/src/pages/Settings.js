import React, { useState } from 'react';
import {
  MdSettings,
  MdRefresh,
  MdVolumeUp,
  MdTv,
  MdSecurity,
  MdDns,
  MdCloudQueue,
  MdCheckCircle,
} from 'react-icons/md';

function Settings() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState('30');
  const [volume, setVolume] = useState('80');
  const [monitorMode, setMonitorMode] = useState('standard');
  const [alertLevel, setAlertLevel] = useState('high');
  const [cctvOverlay, setCctvOverlay] = useState(true);

  // Status diagnostics
  const diagnostics = [
    { name: 'CCTNS National Database Feed', status: 'Active', latency: '42ms', icon: <MdDns className="text-success" /> },
    { name: 'Emergency Command Response (112)', status: 'Active', latency: '12ms', icon: <MdCloudQueue className="text-success" /> },
    { name: 'District GIS Mapping Coordinates Feed', status: 'Active', latency: '110ms', icon: <MdCloudQueue className="text-success" /> },
    { name: 'Police Vehicle Telemetry Stream', status: 'Warning', latency: '820ms', icon: <MdSecurity className="text-warning" /> },
  ];

  return (
    <div className="page-content animate-fade-in text-inverse">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <MdSettings size={28} style={{ color: 'var(--accent-primary)' }} />
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Command Suite Settings</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            Configure operational thresholds, telemetry settings, and visual presentation parameters.
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ gap: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {/* Left Side: System Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: Feed Refresh & Alerts */}
          <article className="card" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 className="card-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <MdRefresh size={20} /> Data Telemetry & Refresh
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '15px' }}>Auto-Stream Live Events</strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Dynamically ingest incoming 112 calls and FIR filings.</span>
                </div>
                <label className="switch-label" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className={`slider-switch ${autoRefresh ? 'active' : ''}`} style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: autoRefresh ? 'var(--accent-primary)' : 'var(--border-strong)',
                    borderRadius: '34px', transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '18px', width: '18px', left: autoRefresh ? '26px' : '4px', bottom: '3px',
                      backgroundColor: 'white', borderRadius: '50%', transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>

              {autoRefresh && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '16px', borderLeft: '2px solid var(--border-strong)' }}>
                  <div>
                    <span style={{ fontSize: '14px' }}>Refresh Frequency</span>
                  </div>
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(e.target.value)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-panel-alt)',
                      color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none'
                    }}
                  >
                    <option value="10">Every 10 Seconds</option>
                    <option value="30">Every 30 Seconds</option>
                    <option value="60">Every 60 Seconds</option>
                    <option value="300">Every 5 Minutes</option>
                  </select>
                </div>
              )}

              <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '15px' }}>Critical Alert Volume</strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Audio signal decibel level for heinous incident alerts.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MdVolumeUp size={16} />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    style={{ width: '100px', accentColor: 'var(--accent-primary)' }}
                  />
                  <span style={{ fontSize: '13px', width: '32px', textAlign: 'right' }}>{volume}%</span>
                </div>
              </div>
            </div>
          </article>

          {/* Card 2: Display Configurations */}
          <article className="card" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 className="card-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <MdTv size={20} /> Presentation & Layout Mode
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '15px', marginBottom: '12px' }}>Display Layout Scaling</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setMonitorMode('standard')}
                    style={{
                      padding: '12px', borderRadius: '12px',
                      background: monitorMode === 'standard' ? 'rgba(30, 144, 255, 0.15)' : 'var(--bg-panel-alt)',
                      border: monitorMode === 'standard' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      color: monitorMode === 'standard' ? 'var(--accent-primary)' : 'var(--text-primary)',
                      fontWeight: 600, transition: 'all 0.2s'
                    }}
                  >
                    Standard Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonitorMode('wall')}
                    style={{
                      padding: '12px', borderRadius: '12px',
                      background: monitorMode === 'wall' ? 'rgba(30, 144, 255, 0.15)' : 'var(--bg-panel-alt)',
                      border: monitorMode === 'wall' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      color: monitorMode === 'wall' ? 'var(--accent-primary)' : 'var(--text-primary)',
                      fontWeight: 600, transition: 'all 0.2s'
                    }}
                  >
                    Command Video Wall (2K/4K)
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '15px' }}>Overlay CCTV Stream Widgets</strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Display CCTV camera availability lists.</span>
                </div>
                <label className="switch-label" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                  <input
                    type="checkbox"
                    checked={cctvOverlay}
                    onChange={(e) => setCctvOverlay(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className={`slider-switch ${cctvOverlay ? 'active' : ''}`} style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: cctvOverlay ? 'var(--accent-primary)' : 'var(--border-strong)',
                    borderRadius: '34px', transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '18px', width: '18px', left: cctvOverlay ? '26px' : '4px', bottom: '3px',
                      backgroundColor: 'white', borderRadius: '50%', transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '15px' }}>Priority Alert Threshold</strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Notify only on crimes meeting selection level.</span>
                </div>
                <select
                  value={alertLevel}
                  onChange={(e) => setAlertLevel(e.target.value)}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-panel-alt)',
                    color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none'
                  }}
                >
                  <option value="all">All Alerts</option>
                  <option value="moderate">Moderate & Higher</option>
                  <option value="high">High Risk Only</option>
                </select>
              </div>
            </div>
          </article>
        </div>

        {/* Right Side: Diagnostics & Integrity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 3: Systems Integrations */}
          <article className="card" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 className="card-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <MdSecurity size={20} /> Integration Services Health
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {diagnostics.map((feed) => (
                <div key={feed.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'var(--bg-panel-alt)', borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {feed.icon}
                    <div>
                      <strong style={{ display: 'block', fontSize: '14px' }}>{feed.name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Latency: {feed.latency}</span>
                    </div>
                  </div>
                  <span className={`badge ${feed.status === 'Active' ? 'badge-success' : 'badge-warning'}`} style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                    {feed.status}
                  </span>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '20px', padding: '12px', background: 'rgba(0, 230, 118, 0.08)',
              border: '1px solid rgba(0, 230, 118, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <MdCheckCircle className="text-success" size={20} />
              <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                System Encryption Protocol: <strong>SHA-256 / AES-256 Command Tunnel</strong>. External data access audit logs are active.
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

export default Settings;
