import React, { useMemo } from 'react';
import { Shield, Download } from 'lucide-react';
import { useSecurity } from '../../../context/SecurityContext';

function BriefingHeader({ activeFilterSummary, onExport }) {
  const { session } = useSecurity();

  const timeDetails = useMemo(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const hour = now.getHours();
    let shift = 'Morning Shift';
    if (hour >= 13 && hour < 18) {
      shift = 'Afternoon Shift';
    } else if (hour >= 18 || hour < 6) {
      shift = 'Night/Evening Shift';
    }
    return { dateStr, shift };
  }, []);

  const userName = session && session.officerName ? session.officerName : 'DGP Kishore, IPS';
  const userRole = session && session.role ? session.role : 'State Command Director';

  return (
    <header className="stats-page-header" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            KSP Daily Briefing — {timeDetails.dateStr}, {timeDetails.shift}
          </h2>
          <span style={{
            fontSize: '9px',
            background: 'var(--accent-danger)',
            color: '#fff',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '0px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Shield size={16} strokeWidth={1.5} />
            <span>CONFIDENTIAL</span>
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Issuing Unit: <strong>SCRB Fusion Cell</strong> · Active Scope: <span style={{ textTransform: 'uppercase' }}>{activeFilterSummary}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'right', fontSize: '11px' }}>
          <span style={{ display: 'block', color: 'var(--text-muted)' }}>AUTHORIZED OFFICER</span>
          <strong style={{ color: 'var(--accent-primary)' }}>{userName}</strong> ({userRole})
        </div>

        <button
          type="button"
          onClick={onExport}
          style={{
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
          className="stats-btn"
        >
          <Download size={16} strokeWidth={1.5} />
          <span>Export Briefing (PDF)</span>
        </button>
      </div>
    </header>
  );
}

export default BriefingHeader;
