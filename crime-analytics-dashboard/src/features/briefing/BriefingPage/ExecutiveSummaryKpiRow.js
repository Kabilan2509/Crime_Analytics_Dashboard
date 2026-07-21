import React from 'react';
import { MdAssignment, MdWarning, MdNotifications, MdSecurity, MdTrendingUp } from 'react-icons/md';

function ExecutiveSummaryKpiRow({ summary }) {
  const {
    totalMajorCrimes = 0,
    percentChange = 0,
    districtsEscalated = 0,
    activeCriticalIncidents = 0,
    activeBolos = 0,
    emergingTrendsCount = 0
  } = summary;

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '20px'
    }}>
      {/* 1. Total Major Crimes */}
      <div 
        onClick={() => scrollToSection('trends-brief-section')}
        style={{
          borderLeft: '4px solid var(--accent-primary)',
          cursor: 'pointer'
        }}
        className="kpi-card"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
            MAJOR CRIMES INTAKE
          </span>
          <MdAssignment size={18} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0 2px 0' }}>{totalMajorCrimes}</div>
        <div style={{ fontSize: '10px', color: 'var(--accent-success)', fontWeight: 600 }}>
          ▲ +{percentChange}% vs prev period
        </div>
      </div>

      {/* 2. Districts with Escalated Risk */}
      <div 
        onClick={() => scrollToSection('map-brief-section')}
        style={{
          borderLeft: districtsEscalated > 0 ? '4px solid var(--accent-danger)' : '4px solid var(--border-color)',
          cursor: 'pointer'
        }}
        className="kpi-card"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
            ESCALATED RISK DISTRICTS
          </span>
          <MdWarning size={18} style={{ color: districtsEscalated > 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }} />
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0 2px 0', color: districtsEscalated > 0 ? 'var(--accent-danger)' : 'inherit' }}>
          {districtsEscalated}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {districtsEscalated > 0 ? 'Urgent patrols recommended' : 'Within normal limits'}
        </div>
      </div>

      {/* 3. Active Critical Incidents */}
      <div 
        onClick={() => scrollToSection('alerts-brief-section')}
        style={{
          borderLeft: activeCriticalIncidents > 0 ? '4px solid var(--accent-danger)' : '4px solid var(--border-color)',
          border: activeCriticalIncidents > 0 ? '1px solid var(--accent-danger)' : '1px solid var(--border-color)',
          cursor: 'pointer'
        }}
        className="kpi-card"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
            CRITICAL INCIDENTS
          </span>
          <MdNotifications size={18} style={{ color: activeCriticalIncidents > 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }} />
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0 2px 0', color: activeCriticalIncidents > 0 ? 'var(--accent-danger)' : 'inherit' }}>
          {activeCriticalIncidents}
        </div>
        <div style={{ fontSize: '10px', color: activeCriticalIncidents > 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>
          {activeCriticalIncidents > 0 ? 'Surveillance active' : 'No active alerts'}
        </div>
      </div>

      {/* 4. Active BOLOs */}
      <div 
        onClick={() => scrollToSection('alerts-brief-section')}
        style={{
          borderLeft: '4px solid var(--accent-warning)',
          cursor: 'pointer'
        }}
        className="kpi-card"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
            ACTIVE BOLOS / ALERTS
          </span>
          <MdSecurity size={18} style={{ color: 'var(--accent-warning)' }} />
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0 2px 0' }}>{activeBolos}</div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          Broadcasted to highway beats
        </div>
      </div>

      {/* 5. Emerging Trends Flagged */}
      <div 
        onClick={() => scrollToSection('trends-brief-section')}
        style={{
          borderLeft: '4px solid var(--accent-primary)',
          cursor: 'pointer'
        }}
        className="kpi-card"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
            EMERGING TRENDS
          </span>
          <MdTrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0 2px 0' }}>{emergingTrendsCount}</div>
        <div style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600 }}>
          AI classification flagged
        </div>
      </div>

      <style>{`
        .kpi-card {
          background-color: var(--bg-panel);
          border: 1px solid var(--border-color);
          padding: 14px 16px;
          transition: transform 0.15s, border-color 0.15s;
        }
        .kpi-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-primary);
        }
      `}</style>
    </div>
  );
}

export default ExecutiveSummaryKpiRow;
