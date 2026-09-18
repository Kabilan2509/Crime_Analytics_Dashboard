import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function RecommendationsPane({ recommendations }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' vs 'actioned'

  useEffect(() => {
    setItems(recommendations.map((rec, i) => ({ ...rec, id: i, status: 'Pending' })));
  }, [recommendations]);

  const handleAction = (id) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: 'Actioned' };
      }
      return item;
    }));
  };

  const pendingItems = items.filter(x => x.status === 'Pending');
  const actionedItems = items.filter(x => x.status === 'Actioned');

  const getPriorityStyle = (priority) => {
    const p = String(priority).toLowerCase();
    if (p === 'high' || p === 'critical') return { bg: 'rgba(255, 77, 77, 0.12)', color: 'var(--accent-danger)' };
    if (p === 'medium' || p === 'moderate') return { bg: 'rgba(255, 170, 0, 0.12)', color: 'var(--accent-warning)' };
    return { bg: 'rgba(0, 200, 83, 0.12)', color: 'var(--accent-success)' };
  };

  const handleOpenCopilot = () => {
    navigate('/copilot');
  };

  return (
    <article className="card" style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
      {/* 12c. Recommendations Panel */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div>
          <span className="section-eyebrow">DECISION ENGINES</span>
          <h3 className="card-title" style={{ fontSize: '13px' }}>AI RECOMMENDATIONS & MISSIONS</h3>
        </div>

        {/* Tab triggers */}
        <div style={{ display: 'flex', background: 'var(--bg-panel-alt)', padding: '2px', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            style={{
              background: activeTab === 'pending' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'pending' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            PENDING ({pendingItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('actioned')}
            style={{
              background: activeTab === 'actioned' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'actioned' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ACTIONED ({actionedItems.length})
          </button>
        </div>
      </div>

      {/* List items block */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '310px' }}>
        
        {activeTab === 'pending' ? (
          pendingItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
              No pending recommendations. All missions deployed.
            </div>
          ) : (
            pendingItems.map(item => {
              const pStyle = getPriorityStyle(item.priority);
              return (
                <div key={item.id} style={{
                  padding: '12px',
                  background: 'var(--bg-panel-alt)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      background: pStyle.bg,
                      color: pStyle.color,
                      padding: '1px 6px'
                    }}>
                      {item.priority.toUpperCase()} PRIORITY
                    </span>

                    {item.confidence && (
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Confidence: <strong style={{ color: 'var(--accent-primary)' }}>{item.confidence}%</strong>
                      </span>
                    )}
                  </div>

                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {item.text}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleAction(item.id)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      className="stats-btn"
                    >
                      <ClipboardList size={16} strokeWidth={1.5} />
                      <span>DEPLOY MISSION</span>
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : (
          actionedItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
              No items deployed in this briefing session.
            </div>
          ) : (
            actionedItems.map(item => {
              const pStyle = getPriorityStyle(item.priority);
              return (
                <div key={item.id} style={{
                  padding: '12px',
                  background: 'var(--bg-panel-alt)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  opacity: 0.8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      background: 'rgba(116, 130, 151, 0.12)',
                      color: 'var(--text-secondary)',
                      padding: '1px 6px'
                    }}>
                      DEPLOYED
                    </span>
                    <CheckCircle2 size={16} strokeWidth={1.5} style={{ color: 'var(--accent-success)' }} />
                  </div>

                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, textDecoration: 'line-through' }}>
                    {item.text}
                  </p>
                </div>
              );
            })
          )
        )}

      </div>

      {/* deep link footer */}
      <div style={{
        marginTop: '12px',
        paddingTop: '10px',
        borderTop: '1px solid var(--border-color)',
        fontSize: '11px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ color: 'var(--text-muted)' }}>AI Copilot dispatch log active.</span>
        <button
          type="button"
          onClick={handleOpenCopilot}
          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: 0 }}
        >
          <span>Ask Copilot about recommendations</span>
          <ExternalLink size={16} strokeWidth={1.5} />
        </button>
      </div>

    </article>
  );
}

export default RecommendationsPane;
