import React from 'react';
import { MdEventNote, MdRssFeed } from 'react-icons/md';

function UpcomingEventsInterAgencySection({ eventsData, viewMode }) {
  const { events = [], bulletins = [] } = eventsData;
  const isAnalyst = viewMode === 'analyst';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isAnalyst ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr',
      gap: '20px',
      marginBottom: '24px'
    }} className="events-interagency-layout">
      {/* Upcoming Deployment Events & Alerts */}
      <article className="card" style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 16px' }}>
          <MdEventNote size={18} style={{ color: 'var(--accent-primary)' }} />
          <h3 className="card-title" style={{ fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
            Upcoming Deployment Events
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '250px', flex: 1, padding: '16px' }}>
          {events.map(ev => {
            const isHigh = ev.severity === 'high';
            return (
              <div key={ev.id} style={{
                padding: '12px 14px',
                background: 'var(--bg-panel-alt)',
                border: '1px solid var(--border-color)',
                borderLeft: isHigh ? '4px solid var(--accent-danger)' : '4px solid var(--accent-warning)',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{ev.title}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{ev.date}</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {ev.note}
                </p>
              </div>
            );
          })}
        </div>
      </article>

      {/* Inter-Agency Bulletins (Hidden in data-only mode) */}
      {isAnalyst && (
        <article className="card" style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 16px' }}>
            <MdRssFeed size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="card-title" style={{ fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Inter-Agency Intelligence Ticker
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '250px', flex: 1, padding: '16px' }}>
            {bulletins.map((b, idx) => (
              <div key={idx} style={{
                padding: '12px 14px',
                background: 'var(--bg-panel-alt)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                lineHeight: 1.5
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    background: 'rgba(56, 151, 216, 0.12)',
                    color: 'var(--accent-primary)',
                    padding: '2px 6px',
                    fontFamily: 'monospace',
                    borderRadius: '0px'
                  }}>
                    {b.source}
                  </span>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                  {b.text}
                </span>
              </div>
            ))}
          </div>
        </article>
      )}

      <style>{`
        @media (max-width: 900px) {
          .events-interagency-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default UpcomingEventsInterAgencySection;
