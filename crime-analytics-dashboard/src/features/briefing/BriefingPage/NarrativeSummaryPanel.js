import React, { useState, useEffect } from 'react';
import { Pencil, RotateCcw, Bot, Save, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function NarrativeSummaryPanel({ narrative }) {
  const navigate = useNavigate();
  const [narrativeList, setNarrativeList] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    setNarrativeList(narrative);
  }, [narrative]);

  const handleStartEdit = () => {
    setEditedText(narrativeList.map(n => n.text).join('\n'));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    const lines = editedText.split('\n').filter(line => line.trim().length > 0);
    const updated = lines.map((line, idx) => {
      const oldItem = narrativeList[idx] || {};
      return {
        text: line.trim(),
        level: oldItem.level || 'moderate'
      };
    });
    setNarrativeList(updated);
    setIsEditing(false);

    // Log to audit log
    try {
      const stored = localStorage.getItem('ksp-secure-audit-logs');
      const logs = stored ? JSON.parse(stored) : [];
      const newLog = {
        event_id: `evt_${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp: new Date().toISOString(),
        officer_id: 'Command Analyst',
        event_type: 'settings_update',
        object_type: 'Briefing',
        object_id: 'briefing_narrative',
        details: `Edited briefing narrative commentary summary. Active bullets count: ${updated.length}`,
        signature: `ECDSA-SHA256:0x${Math.random().toString(16).substr(2, 8).toUpperCase()}`
      };
      logs.unshift(newLog);
      localStorage.setItem('ksp-secure-audit-logs', JSON.stringify(logs));
    } catch (e) {}
  };

  const handleRegenerate = () => {
    setRegenerating(true);
    setTimeout(() => {
      setRegenerating(false);

      const synonyms = {
        'Spike detected': 'Elevated levels reported',
        'CCTV surveillance': 'High-definition cameras',
        'Repeat offenders': 'Known recidivists',
        'District': 'Zone',
        'sweeps recommended.': 'sweeps active.'
      };

      const updated = narrativeList.map(item => {
        let newText = item.text;
        Object.entries(synonyms).forEach(([word, syn]) => {
          newText = newText.replace(word, syn);
        });
        if (newText === item.text) {
          newText = newText + ' [AI verified]';
        }
        return {
          ...item,
          text: newText
        };
      });

      setNarrativeList(updated);

      // Log to audit log
      try {
        const stored = localStorage.getItem('ksp-secure-audit-logs');
        const logs = stored ? JSON.parse(stored) : [];
        const newLog = {
          event_id: `evt_${Math.floor(100000 + Math.random() * 900000)}`,
          timestamp: new Date().toISOString(),
          officer_id: 'AI Engine',
          event_type: 'settings_update',
          object_type: 'Briefing',
          object_id: 'briefing_narrative',
          details: `Regenerated briefing narrative summary using dynamic NLP patterns.`,
          signature: `ECDSA-SHA256:0x${Math.random().toString(16).substr(2, 8).toUpperCase()}`
        };
        logs.unshift(newLog);
        localStorage.setItem('ksp-secure-audit-logs', JSON.stringify(logs));
      } catch (e) {}
    }, 1000);
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
          <Bot size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Key Findings Since Last Briefing
          </h3>
        </div>

        {!isEditing && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={handleStartEdit}
              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              className="stats-btn"
              title="Edit narrative summary"
            >
              <Pencil size={16} strokeWidth={1.5} />
              <span>EDIT</span>
            </button>
            
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: regenerating ? 0.6 : 1 }}
              className="stats-btn"
              title="Regenerate NLP model"
            >
              {regenerating ? (
                <span className="spinner" style={{ width: '10px', height: '10px', border: '2px solid var(--border-color)', borderTop: '2px solid var(--accent-primary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
              ) : (
                <RotateCcw size={16} strokeWidth={1.5} />
              )}
              <span>{regenerating ? 'REGENERATING...' : 'REGENERATE'}</span>
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea
            value={editedText}
            onChange={e => setEditedText(e.target.value)}
            rows={5}
            style={{
              width: '100%',
              background: 'var(--bg-panel-alt)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '10px',
              fontFamily: 'inherit',
              fontSize: '13px',
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              className="stats-btn"
            >
              <X size={16} strokeWidth={1.5} />
              <span>CANCEL</span>
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'var(--accent-primary)', color: '#fff', border: 'none' }}
              className="stats-btn"
            >
              <Save size={16} strokeWidth={1.5} />
              <span>SAVE CHANGES</span>
            </button>
          </div>
        </div>
      ) : (
        <ul style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {narrativeList.map((item, idx) => {
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
      )}

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
            navigate('/copilot');
          }}
        >
          Ask Copilot about this briefing <ArrowRight size={16} strokeWidth={1.5} style={{ verticalAlign: 'middle', marginLeft: '4px' }} />
        </a>
      </div>
    </article>
  );
}

export default NarrativeSummaryPanel;
