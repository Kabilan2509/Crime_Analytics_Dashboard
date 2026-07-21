import React from 'react';
import { MdTrendingDown, MdTrendingUp, MdShield, MdPeople, MdFolderOpen, MdReportProblem, MdOutlineInfo } from 'react-icons/md';

function KpiRow({ summaryData }) {
  const {
    totalCrimes = 0,
    crimeDelta = 0,
    crimeRate = 0,
    rateTrend = 'down',
    clearanceRate = 0,
    clearanceDelta = 0,
    totalArrests = 0,
    arrestDelta = 0,
    pendingChargesheets = 0,
    riskIndex = 5.0
  } = summaryData;

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper for delta badge
  const renderDelta = (val, reverse = false) => {
    const isZero = val === 0;
    const isDown = val < 0;
    
    // For crime rates, DOWN is good (green), UP is bad (red)
    // For clearance/arrests, UP is good (green), DOWN is bad (red)
    let good = isDown;
    if (reverse) {
      good = !isDown;
    }

    const color = isZero
      ? 'var(--text-secondary)'
      : good
        ? 'var(--accent-success)'
        : 'var(--accent-danger)';

    const icon = isDown ? '▼' : '▲';
    const cleanVal = Math.abs(val);

    return (
      <span style={{
        fontSize: '11px',
        fontWeight: 700,
        color,
        background: isZero ? 'rgba(112, 131, 154, 0.1)' : good ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 77, 77, 0.1)',
        padding: '2px 6px',
        borderRadius: '12px',
        marginLeft: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px'
      }}>
        {icon} {cleanVal}%
      </span>
    );
  };

  // AI Risk colors
  const getRiskColor = (idx) => {
    if (idx < 4.0) return 'var(--accent-success)';
    if (idx < 7.0) return 'var(--accent-warning)';
    return 'var(--accent-danger)';
  };

  const getRiskLabel = (idx) => {
    if (idx < 4.0) return 'Low Risk';
    if (idx < 7.0) return 'Medium Risk';
    return 'High Risk';
  };

  return (
    <div className="stats-kpi-row" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {/* 1. Total Crimes */}
      <div
        onClick={() => scrollToSection('trends-section')}
        className="kpi-card"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: 'var(--shadow-card)',
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Crimes</span>
          <MdFolderOpen size={18} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: "'Source Sans 3', sans-serif" }}>{totalCrimes}</span>
          {renderDelta(crimeDelta, false)}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
          vs. previous equivalent period
        </div>
      </div>

      {/* 2. Crime Rate per 100k */}
      <div
        onClick={() => scrollToSection('spatial-section')}
        className="kpi-card"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: 'var(--shadow-card)',
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Crime Rate (per 100k)</span>
          {rateTrend === 'down' ? (
            <MdTrendingDown size={18} style={{ color: 'var(--accent-success)' }} />
          ) : (
            <MdTrendingUp size={18} style={{ color: 'var(--accent-danger)' }} />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
          <span style={{ fontSize: '28px', fontWeight: 700 }}>{crimeRate}</span>
          <span style={{
            fontSize: '11px',
            color: rateTrend === 'down' ? 'var(--accent-success)' : 'var(--accent-danger)',
            marginLeft: '6px',
            fontWeight: 700
          }}>
            {rateTrend === 'down' ? '▼ Declining' : '▲ Rising'}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
          aggregated across active scale
        </div>
      </div>

      {/* 3. Clearance Rate */}
      <div
        onClick={() => scrollToSection('performance-section')}
        className="kpi-card"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: 'var(--shadow-card)',
          cursor: 'pointer',
          transition: 'transform 0.2s',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Clearance Rate</span>
          <MdShield size={18} style={{ color: 'var(--accent-success)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: '28px', fontWeight: 700 }}>{clearanceRate}%</span>
            {renderDelta(clearanceDelta, true)}
          </div>
          {/* Radial Ring Indicator */}
          <div style={{ position: 'relative', width: '36px', height: '36px' }}>
            <svg width="36" height="36" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="var(--bg-panel-alt)" strokeWidth="4" />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="transparent"
                stroke="var(--accent-success)"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 14}`}
                strokeDashoffset={`${2 * Math.PI * 14 * (1 - clearanceRate / 100)}`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
          closed & chargesheeted pipeline
        </div>
      </div>

      {/* 4. Total Arrests */}
      <div
        onClick={() => scrollToSection('performance-section')}
        className="kpi-card"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: 'var(--shadow-card)',
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Arrests</span>
          <MdPeople size={18} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
          <span style={{ fontSize: '28px', fontWeight: 700 }}>{totalArrests}</span>
          {renderDelta(arrestDelta, true)}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
          cumulative offender apprehensions
        </div>
      </div>

      {/* 5. Pending Chargesheets */}
      <div
        onClick={() => scrollToSection('rankings-section')}
        className="kpi-card"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: 'var(--shadow-card)',
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending Chargesheets</span>
          <MdReportProblem size={18} style={{ color: pendingChargesheets > 20 ? 'var(--accent-warning)' : 'var(--text-secondary)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
          <span style={{
            fontSize: '28px',
            fontWeight: 700,
            color: pendingChargesheets > 20 ? 'var(--accent-warning)' : 'var(--text-primary)'
          }}>{pendingChargesheets}</span>
          {pendingChargesheets > 20 && (
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              color: 'var(--accent-warning)',
              background: 'rgba(255, 170, 0, 0.1)',
              padding: '2px 6px',
              borderRadius: '8px',
              marginLeft: '6px'
            }}>
              Needs Review
            </span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
          active investigation backlog
        </div>
      </div>

      {/* 6. AI Risk Index */}
      <div
        onClick={() => scrollToSection('insights-section')}
        className="kpi-card"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: 'var(--shadow-card)',
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Risk Index</span>
          <div 
            title="Computed based on Heinous Crime ratio, response times, and local spatiotemporal clearance scores."
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <MdOutlineInfo size={16} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: getRiskColor(riskIndex) }}>
            {riskIndex} <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>/ 10</span>
          </span>
          <span style={{
            fontSize: '11px',
            color: getRiskColor(riskIndex),
            marginLeft: '6px',
            fontWeight: 700,
            background: `rgba(${riskIndex >= 7.0 ? '255, 77, 77' : riskIndex >= 4.0 ? '255, 170, 0' : '0, 200, 83'}, 0.1)`,
            padding: '2px 6px',
            borderRadius: '10px'
          }}>
            {getRiskLabel(riskIndex)}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
          algorithmic district risk coefficient
        </div>
      </div>

      <style>{`
        .kpi-card:hover {
          transform: translateY(-4px);
          border-color: var(--accent-primary) !important;
        }
      `}</style>
    </div>
  );
}

export default KpiRow;
