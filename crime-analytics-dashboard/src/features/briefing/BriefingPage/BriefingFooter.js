import React from 'react';
import { MdFileDownload, MdSecurity } from 'react-icons/md';
import { useSecurity } from '../../../context/SecurityContext';

function BriefingFooter({ summary, onExport }) {
  const { session } = useSecurity();
  const refreshTime = new Date().toLocaleTimeString();

  const userName = session && session.officerName ? session.officerName : 'DGP Kishore, IPS';
  const userRole = session && session.role ? session.role : 'State Command Director';

  return (
    <footer style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '20px',
      paddingTop: '20px',
      borderTop: '1px solid var(--border-color)',
      flexWrap: 'wrap',
      gap: '16px',
      fontSize: '11px',
      color: 'var(--text-muted)'
    }} className="stats-page-footer">
      {/* 13c. Attribution and Disclaimer */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <MdSecurity size={12} style={{ color: 'var(--accent-danger)' }} />
          <strong style={{ color: 'var(--text-secondary)' }}>
            DISCLAIMER: CLASSIFIED TRANSIT LOGS
          </strong>
        </div>
        <div>
          Sources: Karnataka State Crime Records Bureau (SCRB) · NATGRID feed · OSINT Social Listeners.
        </div>
      </div>

      {/* Export trigger and metadata */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'right' }}>
          <span>Generated for <strong>{userName}</strong> ({userRole})</span><br />
          <span>Intake Refresh: {refreshTime}</span>
        </div>

        <button
          type="button"
          onClick={onExport}
          style={{
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
          className="stats-btn"
        >
          <MdFileDownload size={14} />
          <span>EXPORT PDF</span>
        </button>
      </div>
    </footer>
  );
}

export default BriefingFooter;
