import React from 'react';
import { Info } from 'lucide-react';

function PageHeader({ activeFilterSummary }) {
  return (
    <div className="stats-page-header" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      padding: '16px 20px',
      background: 'var(--bg-panel)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      boxShadow: 'var(--shadow-card)'
    }}>
      <div>
        <h2 style={{
          margin: 0,
          fontSize: '22px',
          color: 'var(--text-primary)'
        }}>Crime Statistics Console</h2>
        <p style={{
          margin: '4px 0 0 0',
          fontSize: '13px',
          color: 'var(--text-secondary)'
        }}>
          Showing: <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{activeFilterSummary}</span>
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          background: 'rgba(56, 151, 216, 0.1)',
          color: 'var(--accent-primary)',
          fontSize: '12px',
          fontWeight: 600,
          padding: '6px 12px',
          borderRadius: '20px',
          border: '1px solid rgba(56, 151, 216, 0.2)'
        }}>
          Analytical Workspace
        </div>
        <div 
          style={{ position: 'relative', cursor: 'help', display: 'flex', alignItems: 'center' }}
          title="KSP Crime Statistics Console provides comprehensive pattern analysis, spatiotemporal distributions, predictive metrics, and performance audit tracking."
        >
          <Info size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
        </div>
      </div>
    </div>
  );
}

export default PageHeader;
