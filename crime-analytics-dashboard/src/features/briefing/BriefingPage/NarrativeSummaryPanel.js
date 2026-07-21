import React from 'react';
import { MdEdit, MdRefresh, MdSmartToy } from 'react-icons/md';

function NarrativeSummaryPanel({ narrative }) {
  const handleEdit = () => {
    alert('Narrative editing is locked in Command mode.');
  };

  const handleRegenerate = () => {
    alert('Regenerating NLP summary with updated filters...');
  };

  return (
    <article className="card narrative-panel" style={{
      background: 'linear-gradient(135deg, var(--bg-panel) 0%, rgba(30, 144, 255, 0.04) 100%)',
      border: '1.5px dashed var(--accent-primary)',
      padding: '20px',
      marginBottom: '20px',
      position: 'relative'
    }}>
      {/* Header controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '10px',
        marginBottom: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MdSmartToy size={18} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Key Findings Since Last Briefing
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={handleEdit}
            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            className="stats-btn"
            title="Edit narrative summary"
          >
            <MdEdit size={12} />
            <span>EDIT</span>
          </button>
          
          <button
            type="button"
            onClick={handleRegenerate}
            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            className="stats-btn"
            title="Regenerate NLP model"
          >
            <MdRefresh size={12} />
            <span>REGENERATE</span>
          </button>
        </div>
      </div>

      {/* Narrative Bullets list */}
      <ul style={{
        margin: 0,
        padding: 0,
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {narrative.map((item, idx) => {
          let dotColor = '#00c853'; // green
          if (item.level === 'critical' || item.level === 'high') {
            dotColor = '#ff4d4d'; // red
          } else if (item.level === 'moderate' || item.level === 'medium+') {
            dotColor = '#ffaa00'; // amber
          }

          return (
            <li key={idx} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '13px',
              lineHeight: '1.6',
              color: 'var(--text-primary)'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: dotColor,
                display: 'inline-block',
                marginTop: '6px',
                flexShrink: 0
              }} />
              <span>{item.text}</span>
            </li>
          );
        })}
      </ul>

      {/* Cross link out to Copilot */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px dotted var(--border-color)',
        fontSize: '11px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <span style={{ color: 'var(--text-muted)' }}>
          Insights derived from state crime registers and police logistics channels.
        </span>
        <a 
          href="/copilot"
          style={{
            color: 'var(--accent-primary)',
            textDecoration: 'none',
            fontWeight: 700
          }}
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = '#/copilot'; // routing helper or hash
            alert('Redirecting to Copilot conversation on this narrative summary...');
          }}
        >
          Ask Copilot about this briefing →
        </a>
      </div>
    </article>
  );
}

export default NarrativeSummaryPanel;
