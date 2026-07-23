import React, { useState, useEffect } from 'react';
import { MdClose, MdPushPin, MdNotifications, MdWarning, MdSmartToy, MdLocalPolice } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useSecurity } from '../../../context/SecurityContext';

function AlertCardRow({ incidents, viewMode }) {
  const navigate = useNavigate();
  const { isCommandMode } = useSecurity();
  const {
    criticalIncidents = [],
    bolos = [],
    aiInsights = [],
    recommendations = []
  } = incidents;

  const [cards, setCards] = useState([]);

  // Sync props to state on mount/change, taking viewMode into account
  useEffect(() => {
    let list = [];
    if (viewMode === 'data_only') {
      // In data-only mode, we only show quantitative critical incidents
      list = [
        ...criticalIncidents.map(c => ({ ...c, cardType: 'critical', pinned: false }))
      ];
    } else {
      list = [
        ...criticalIncidents.map(c => ({ ...c, cardType: 'critical', pinned: false })),
        ...bolos.map(b => ({ ...b, cardType: 'bolo', pinned: false })),
        ...aiInsights.map(a => ({ ...a, cardType: 'ai', pinned: false })),
        ...recommendations.map(r => ({ ...r, cardType: 'recommendation', pinned: false }))
      ];
    }
    setCards(list);
  }, [criticalIncidents, bolos, aiInsights, recommendations, viewMode]);

  const handleDismiss = (id) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const handleTogglePin = (id) => {
    setCards(prev => {
      const target = prev.find(c => c.id === id);
      if (!target) return prev;
      const updated = { ...target, pinned: !target.pinned };
      const rest = prev.filter(c => c.id !== id);
      return updated.pinned ? [updated, ...rest] : [...rest, updated];
    });
  };

  const handleLinkRedirect = (route) => {
    navigate(route);
  };

  const maskText = (value, visibleStart = 4, visibleEnd = 3) => {
    if (!value) return 'Protected';
    if (value.length <= visibleStart + visibleEnd) return `${value.slice(0, 2)}•••`;
    return `${value.slice(0, visibleStart)}${'•'.repeat(Math.max(4, value.length - visibleStart - visibleEnd))}${value.slice(-visibleEnd)}`;
  };

  const getSecureTitle = (card) => {
    if (card.cardType !== 'critical') return card.title || card.action;
    if (isCommandMode) return card.title;
    
    // Mask the FIR part (e.g. "Heinous Assault - FIR 20230005" -> "Heinous Assault - FIR 2023••••05")
    const match = card.title.match(/(.*- FIR\s+)(.*)/i);
    if (match) {
      return `${match[1]}${maskText(match[2], 6, 4)}`;
    }
    return card.title;
  };

  const getSecureLocation = (card) => {
    if (isCommandMode) return card.location;
    // Mask the police station name (before the comma, e.g. "Shivaji PS, Bengaluru" -> "Sh•••• PS, Bengaluru")
    const parts = card.location.split(',');
    if (parts.length > 0) {
      const station = parts[0].trim();
      const district = parts.slice(1).join(',').trim();
      return `${maskText(station, 3, 3)}, ${district}`;
    }
    return card.location;
  };

  if (cards.length === 0) {
    return null;
  }

  return (
    <div id="alerts-brief-section" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <span style={{ width: '4px', height: '14px', background: 'var(--accent-primary)', display: 'inline-block' }} />
        <span className="briefing-section-heading" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Active Threat & Security Alerts
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Scroll horizontally to view all · Cards dismissible)</span>
      </div>

      {/* Horizontally scrollable list */}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        gap: '16px',
        paddingBottom: '12px',
        scrollbarWidth: 'thin'
      }} className="alerts-scroller">
        
        {cards.map(card => {
          let leftColor = 'var(--accent-primary)';
          let icon = <MdNotifications />;
          
          if (card.cardType === 'critical') {
            leftColor = 'var(--accent-danger)';
            icon = <MdNotifications style={{ color: 'var(--accent-danger)' }} />;
          } else if (card.cardType === 'bolo') {
            leftColor = 'var(--accent-warning)';
            icon = <MdWarning style={{ color: 'var(--accent-warning)' }} />;
          } else if (card.cardType === 'ai') {
            leftColor = 'var(--accent-primary)';
            icon = <MdSmartToy style={{ color: 'var(--accent-primary)' }} />;
          } else if (card.cardType === 'recommendation') {
            leftColor = '#009688';
            icon = <MdLocalPolice style={{ color: '#009688' }} />;
          }

          return (
            <div
              key={card.id}
              style={{
                flex: '0 0 280px',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderLeft: `4px solid ${leftColor}`,
                padding: '14px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s',
                backgroundColor: card.pinned ? 'rgba(30, 144, 255, 0.03)' : 'var(--bg-panel)'
              }}
              className="alert-card"
            >
              {/* Header with pin and close */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {icon}
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {card.cardType} {card.pinned && '· PINNED'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => handleTogglePin(card.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: card.pinned ? 'var(--accent-primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0
                    }}
                    title="Pin card to top"
                  >
                    <MdPushPin size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDismiss(card.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0
                    }}
                    title="Dismiss alert"
                  >
                    <MdClose size={15} />
                  </button>
                </div>
              </div>

              {/* Main Content */}
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {getSecureTitle(card)}
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {card.text || card.note || card.reason}
                </p>
                {card.location && (
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Loc: {getSecureLocation(card)}
                  </div>
                )}
              </div>

              {/* Footer deep links */}
              <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                {card.cardType === 'critical' && (
                  <button
                    type="button"
                    onClick={() => handleLinkRedirect(card.id ? `/cases/${card.id}` : '/cases')}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    VIEW DETAILS →
                  </button>
                )}

                {card.cardType === 'bolo' && card.suspectId && (
                  <button
                    type="button"
                    onClick={() => handleLinkRedirect(`/suspect-timeline/${card.id || ''}?suspectId=${card.suspectId}`)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-warning)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    SUSPECT TIMELINE →
                  </button>
                )}

                {card.cardType === 'ai' && (
                  <button
                    type="button"
                    onClick={() => handleLinkRedirect('/copilot')}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    ASK COPILOT →
                  </button>
                )}

                {card.cardType === 'recommendation' && (
                  <div style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#fff',
                    background: card.priority === 'CRITICAL' ? 'var(--accent-danger)' : 'var(--accent-primary)',
                    padding: '1px 6px',
                    borderRadius: '0px'
                  }}>
                    {card.priority}
                  </div>
                )}
              </div>

            </div>
          );
        })}

      </div>
    </div>
  );
}

export default AlertCardRow;
