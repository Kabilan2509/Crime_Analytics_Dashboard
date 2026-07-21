import React from 'react';
import { MdEventNote, MdRssFeed, MdWarning } from 'react-icons/md';

function UpcomingEventsInterAgencySection({ eventsData }) {
  const { events = [], bulletins = [] } = eventsData;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '20px',
      marginBottom: '24px'
    }} className="events-interagency-layout">
      {/* 13a. Upcoming Events & Alerts */}
      <article className="card" style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MdEventNote size={16} style={{ color: 'var(--accent-primary)' }} />
          <h3 className="card-title" style={{ fontSize: '13px' }}>UPCOMING DEPLOYMENT EVENTS</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '200px', flex: 1, padding: '4px 0' }}>
          {events.map(ev => {
            const isHigh = ev.severity === 'high';
            return (
              <div key={ev.id} style={{
                padding: '10px 12px',
                background: 'var(--bg-panel-alt)',
                border: '1px solid var(--border-color)',
                borderLeft: isHigh ? '3px solid var(--accent-danger)' : '3px solid var(--accent-warning)',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{ev.title}</strong>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ev.date}</span>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {ev.note}
                </p>
              </div>
            );
          })}
        </div>
      </article>

      {/* 13b. Inter-Agency Bulletins */}
      <article className="card" style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MdRssFeed size={16} style={{ color: 'var(--accent-primary)' }} />
          <h3 className="card-title" style={{ fontSize: '13px' }}>INTER-AGENCY INTELLIGENCE TICKER</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '200px', flex: 1, padding: '4px 0' }}>
          {bulletins.map((b, idx) => (
            <div key={idx} style={{
              padding: '10px 12px',
              background: 'var(--bg-panel-alt)',
              border: '1px solid var(--border-color)',
              fontSize: '11px',
              lineHeight: 1.5
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  background: 'rgba(56, 151, 216, 0.12)',
                  color: 'var(--accent-primary)',
                  padding: '1px 5px',
                  borderRadius: '0px'
                }}>
                  {b.source}
                </span>
              </div>
              <span style={{ color: 'var(--text-secondary)' }}>
                {b.text}
              </span>
            </div>
          ))}
        </div>
      </article>

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
