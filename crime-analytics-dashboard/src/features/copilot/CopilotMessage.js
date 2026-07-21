import React from 'react';
import { MdSmartToy, MdPerson, MdSearch } from 'react-icons/md';
import { BarChart, Bar, ResponsiveContainer, XAxis } from 'recharts';

function CopilotMessage({ msg, onSuggestionClick }) {
  const isAi = msg.type === 'ai';

  return (
    <div className={`chat-msg ${isAi ? 'ai' : 'user'}`}>
      <div style={{ display: 'flex', gap: '12px', flexDirection: isAi ? 'row' : 'row-reverse' }}>
        {/* Avatar */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: isAi ? 'linear-gradient(135deg, #9b5de5 0%, #1976d2 100%)' : 'var(--accent-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          boxShadow: isAi ? '0 0 10px rgba(155, 93, 229, 0.4)' : 'none', flexShrink: 0
        }}>
          {isAi ? <MdSmartToy size={20} /> : <MdPerson size={20} />}
        </div>

        {/* Message body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: 'calc(100% - 48px)' }}>
          <div className={isAi ? 'chat-bubble-ai' : 'chat-bubble-user'}>
            {/* Main content */}
            <div>{msg.content}</div>

            {/* AI Enriched Details */}
            {isAi && msg.summary && (
              <div style={{
                marginTop: '12px', padding: '10px 14px', background: 'var(--bg-panel)',
                borderLeft: '3px solid var(--accent-primary)', borderRadius: '4px', fontSize: '13px'
              }}>
                <strong>System Summary:</strong> {msg.summary}
              </div>
            )}

            {/* AI Mini Chart */}
            {isAi && msg.chartData && msg.results && msg.results.length > 0 && (
              <div style={{ marginTop: '16px', height: '120px', width: '280px', background: 'var(--bg-panel)', padding: '8px', borderRadius: '8px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Distribution Trend</span>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={msg.chartData}>
                    <XAxis dataKey="name" fontSize={9} stroke="var(--text-muted)" tickLine={false} />
                    <Bar dataKey="cases" fill="var(--chart-blue)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* AI Results Table */}
          {isAi && msg.results && msg.results.length > 0 && (
            <div style={{
              background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
              borderRadius: '10px', overflow: 'hidden', width: '100%', maxWidth: '500px'
            }}>
              <div style={{ padding: '8px 12px', background: 'var(--bg-panel-alt)', fontSize: '11px', fontWeight: 700, borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                RETRIEVED FIR RECORDS ({msg.results.length})
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '180px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px' }}>FIR No</th>
                      <th style={{ padding: '8px' }}>Station</th>
                      <th style={{ padding: '8px' }}>Crime Group</th>
                    </tr>
                  </thead>
                  <tbody>
                    {msg.results.slice(0, 5).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px', fontWeight: 600, color: 'var(--accent-secondary)' }}>{row.CrimeNo}</td>
                        <td style={{ padding: '8px' }}>{row.policeStationName}</td>
                        <td style={{ padding: '8px' }}>{row.crimeGroupName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Suggestions Chips */}
          {isAi && msg.suggestions && msg.suggestions.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              {msg.suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => onSuggestionClick(sug)}
                  style={{
                    padding: '6px 12px', background: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)', borderRadius: '20px',
                    color: 'var(--accent-secondary)', fontSize: '11px', cursor: 'pointer',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px'
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
                  <MdSearch size={12} />
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
