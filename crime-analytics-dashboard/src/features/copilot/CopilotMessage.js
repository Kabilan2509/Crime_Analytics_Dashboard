import React from 'react';
import { MdSmartToy, MdPerson, MdSearch, MdStorage, MdWarning, MdTrendingUp } from 'react-icons/md';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';

const INTENT_LABELS = {
  CRIME_COUNT:      '📊 Crime Count',
  HOTSPOT:          '🔥 Hotspot Analysis',
  CRIME_TYPE:       '🔍 Crime Type Filter',
  REPEAT_OFFENDER:  '⚠️ Repeat Offender',
  TEMPORAL_PATTERN: '⏱️ Temporal Pattern',
  SIMILAR_CASE:     '🔗 Similar Cases',
  CROSS_REFERENCE:  '🕸️ Cross Reference',
  STATION_WORKLOAD: '🏢 Station Workload',
  OFFICER_QUERY:    '👮 Officer Query',
  DAILY_BRIEFING:   '📋 Intelligence Briefing',
  RISK_PREDICTION:  '🎯 Risk Prediction',
  WELCOME:          '👋 Welcome',
};

const CHART_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];

function IntentBadge({ intent }) {
  if (!intent || intent === 'WELCOME') return null;
  const label = INTENT_LABELS[intent] || intent;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 700,
      color: '#818cf8', marginBottom: '8px', letterSpacing: '0.3px'
    }}>
      {label}
    </div>
  );
}

function SourcesBadge({ sources }) {
  if (!sources || sources.length === 0) return null;
  const filtered = sources.filter(Boolean);
  if (!filtered.length) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
      marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)',
    }}>
      <MdStorage size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      {filtered.map((s, i) => (
        <span key={i} style={{
          fontSize: '10px', color: 'var(--text-muted)',
          background: 'var(--bg-panel-alt)', borderRadius: '3px', padding: '1px 6px',
        }}>{s}</span>
      ))}
    </div>
  );
}

function PredictionCard({ predictions }) {
  if (!predictions || predictions.length === 0) return null;
  return (
    <div style={{
      marginTop: '12px', padding: '12px 14px',
      background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '6px',
    }}>
      <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        <MdWarning size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
        Risk Assessment
      </div>
      {predictions.map((p, i) => {
        const score = Number(p.score) || 0;
        const color = score > 70 ? '#ef4444' : score > 40 ? '#f59e0b' : '#22c55e';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: i < predictions.length - 1 ? '6px' : 0 }}>
            <span style={{ fontSize: '12px', color: 'var(--text-primary)', minWidth: '120px' }}>{p.district || 'N/A'}</span>
            <div style={{ flex: 1, height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(score, 100)}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color, minWidth: '40px', textAlign: 'right' }}>
              {score}/100
            </span>
            {p.riskLabel && <span style={{ fontSize: '10px', color }}>{p.riskLabel}</span>}
            {p.confidence && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{Math.round(p.confidence * 100)}% conf.</span>}
          </div>
        );
      })}
    </div>
  );
}

function InlineMarkdown({ text }) {
  return String(text || '').split(/\*\*(.*?)\*\*/g).map((part, index) =>
    index % 2 ? <strong key={index}>{part}</strong> : <React.Fragment key={index}>{part}</React.Fragment>
  );
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

// Render the Copilot's structured Markdown as readable briefing content.
function MarkdownText({ text }) {
  if (!text) return null;
  const lines = String(text).replace(/\r/g, '').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }

    if (line.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = line.split('|').map(cell => cell.trim()).filter(Boolean);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes('|')) {
        const cells = lines[index].split('|').map(cell => cell.trim()).filter(Boolean);
        if (cells.length) rows.push(cells);
        index += 1;
      }
      blocks.push(
        <div key={`table-${index}`} className="copilot-markdown-table-wrap">
          <table className="copilot-markdown-table">
            <thead><tr>{headers.map((header, cell) => <th key={cell}><InlineMarkdown text={header} /></th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, cell) => <td key={cell}><InlineMarkdown text={row[cell] || '—'} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }

    const heading = line.match(/^(#{1,3}\s+)?([^:]{2,80}):\s*$/);
    if (heading) {
      blocks.push(<h4 key={`heading-${index}`} className="copilot-markdown-heading"><InlineMarkdown text={heading[2]} /></h4>);
      index += 1;
      continue;
    }

    if (/^(\*|-|•)\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^(\*|-|•)\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^(\*|-|•)\s+/, ''));
        index += 1;
      }
      blocks.push(<ul key={`list-${index}`} className="copilot-markdown-list">{items.map((item, itemIndex) => <li key={itemIndex}><InlineMarkdown text={item} /></li>)}</ul>);
      continue;
    }

    blocks.push(<p key={`paragraph-${index}`} className="copilot-markdown-paragraph"><InlineMarkdown text={line} /></p>);
    index += 1;
  }
  return <div className="copilot-markdown">{blocks}</div>;
}

function CopilotMessage({ msg, onSuggestionClick }) {
  const isAi = msg.type === 'ai';
  const isOffline = msg._offline;

  return (
    <div className={`chat-msg ${isAi ? 'ai' : 'user'}`}>
      <div style={{ display: 'flex', gap: '12px', flexDirection: isAi ? 'row' : 'row-reverse' }}>

        {/* Avatar */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: isAi ? 'linear-gradient(135deg, #9b5de5 0%, #1976d2 100%)' : 'var(--accent-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          boxShadow: isAi ? '0 0 10px rgba(155, 93, 229, 0.4)' : 'none', flexShrink: 0,
          alignSelf: 'flex-start', marginTop: '2px',
        }}>
          {isAi ? <MdSmartToy size={20} /> : <MdPerson size={20} />}
        </div>

        {/* Message body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: 'calc(100% - 48px)', minWidth: 0 }}>

          <div className={isAi ? 'chat-bubble-ai' : 'chat-bubble-user'}>
            {/* Intent badge */}
            {isAi && <IntentBadge intent={msg.intent} />}

            {/* Offline warning */}
            {isOffline && (
              <div style={{ fontSize: '10px', color: '#f59e0b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MdWarning size={11} /> Offline mode — API unavailable, showing local data
              </div>
            )}

            {/* Main content */}
            <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
              <MarkdownText text={msg.content} />
            </div>

            <style>{`
              .copilot-markdown-heading { margin: 12px 0 5px; color: var(--text-primary); font-size: 12px; font-weight: 800; }
              .copilot-markdown-heading:first-child { margin-top: 0; font-size: 14px; }
              .copilot-markdown-paragraph { margin: 0 0 8px; color: var(--text-secondary); }
              .copilot-markdown-list { margin: 6px 0 10px; padding-left: 18px; color: var(--text-secondary); }
              .copilot-markdown-list li { margin: 4px 0; padding-left: 2px; }
              .copilot-markdown strong { color: var(--text-primary); font-weight: 750; }
              .copilot-markdown-table-wrap { width: 100%; margin: 8px 0 12px; overflow-x: auto; border: 1px solid var(--border-color); border-radius: 6px; }
              .copilot-markdown-table { width: 100%; min-width: 420px; border-collapse: collapse; font-size: 11px; }
              .copilot-markdown-table th { padding: 8px 10px; background: var(--bg-panel-alt); color: var(--text-muted); font-size: 10px; font-weight: 800; letter-spacing: .03em; text-align: left; text-transform: uppercase; white-space: nowrap; }
              .copilot-markdown-table td { padding: 8px 10px; border-top: 1px solid var(--border-color); color: var(--text-secondary); white-space: nowrap; }
              .copilot-markdown-table tbody tr:nth-child(even) { background: color-mix(in srgb, var(--bg-panel-alt) 45%, transparent); }
            `}</style>

            {/* Summary block */}
            {isAi && msg.summary && msg.summary !== msg.content && (
              <div style={{
                marginTop: '10px', padding: '8px 12px',
                background: 'var(--bg-panel)', borderLeft: '3px solid var(--accent-primary)',
                borderRadius: '3px', fontSize: '12px', color: 'var(--text-secondary)',
              }}>
                <MdTrendingUp size={11} style={{ verticalAlign: 'middle', marginRight: '4px', color: 'var(--accent-primary)' }} />
                {msg.summary}
              </div>
            )}

            {/* Risk Prediction Card */}
            {isAi && <PredictionCard predictions={msg.predictions} />}

            {/* Mini Bar Chart */}
            {isAi && msg.chartData && msg.chartData.length > 0 && (
              <div style={{ marginTop: '14px', height: '110px', background: 'var(--bg-panel)', padding: '8px', borderRadius: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Distribution Trend
                </span>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={msg.chartData} margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
                    <XAxis dataKey="name" fontSize={9} stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '11px' }}
                      labelStyle={{ color: 'var(--text-muted)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Bar dataKey="cases" radius={[3, 3, 0, 0]}>
                      {msg.chartData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Sources */}
            {isAi && <SourcesBadge sources={msg.sources} />}
          </div>

          {/* Results Table */}
          {isAi && msg.results && msg.results.length > 0 && (
            <div style={{
              background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
              borderRadius: '8px', overflow: 'hidden', width: '100%',
            }}>
              <div style={{
                padding: '6px 12px', background: 'var(--bg-panel-alt)',
                fontSize: '10px', fontWeight: 700, borderBottom: '1px solid var(--border-color)',
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>Retrieved Records</span>
                <span style={{ color: 'var(--accent-primary)' }}>{msg.results.length} rows</span>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '200px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '7px 10px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {msg.intent === 'HOTSPOT' || msg.intent === 'STATION_WORKLOAD' ? 'Count' : 'FIR No'}
                      </th>
                      <th style={{ padding: '7px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {msg.intent === 'REPEAT_OFFENDER' ? 'Name' : msg.intent === 'OFFICER_QUERY' ? 'Officer' : 'Station / District'}
                      </th>
                      <th style={{ padding: '7px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {msg.intent === 'STATION_WORKLOAD' ? 'Pending' : 'Crime Group / Status'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {msg.results.map((row, idx) => (
                      <tr key={idx} style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                      }}>
                        <td style={{ padding: '7px 10px', fontWeight: 600, color: 'var(--accent-secondary)', whiteSpace: 'nowrap' }}>
                          {row.CrimeNo}
                        </td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-primary)' }}>
                          {row.policeStationName}
                        </td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-secondary)' }}>
                          {row.crimeGroupName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Suggestion Chips */}
          {isAi && msg.suggestions && msg.suggestions.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
              {msg.suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => onSuggestionClick(sug)}
                  style={{
                    padding: '5px 11px', background: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)', borderRadius: '20px',
                    color: 'var(--accent-secondary)', fontSize: '11px', cursor: 'pointer',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px',
                    lineHeight: 1.3,
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.background = 'rgba(30,144,255,0.06)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.background = 'var(--bg-panel)';
                  }}
                >
                  <MdSearch size={11} />
                  {sug}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CopilotMessage;
