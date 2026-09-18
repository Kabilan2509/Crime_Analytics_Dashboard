import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

function ComparisonSection({ comparisons }) {
  const [metric, setMetric] = useState('count'); // 'count' | 'rate' | 'clearance'

  // Sort and identify best/worst nodes dynamically
  const sortedData = [...comparisons].sort((a, b) => {
    // We always list descending
    return b[metric] - a[metric];
  });

  const getCellColor = (index, totalLength) => {
    if (totalLength < 4) return 'var(--chart-blue)'; // too few to highlight best/worst

    if (metric === 'clearance') {
      // Descending by clearance: worst are at the bottom, best are at the top
      if (index < 3) return 'var(--accent-success)'; // Top 3 best clearance -> green
      if (index >= totalLength - 3) return 'var(--accent-danger)'; // Bottom 3 worst clearance -> red
    } else {
      // Descending by count or rate: worst are at the top, best are at the bottom
      if (index < 3) return 'var(--accent-danger)'; // Top 3 worst crime volumes -> red
      if (index >= totalLength - 3) return 'var(--accent-success)'; // Bottom 3 best crime volumes -> green
    }

    return 'var(--chart-blue)'; // Neutral
  };

  return (
    <div style={{ marginBottom: '24px' }} className="comparison-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
        <span style={{ width: '4px', height: '14px', background: 'var(--accent-primary)', display: 'inline-block' }} />
        <span className="briefing-section-heading" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          JURISDICTIONAL COMPARISON & RANKINGS
        </span>
      </div>

      <article className="card" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px'
      }}>
        {/* Left column: Chart and sorting */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span className="section-eyebrow">UNIT AUDITS</span>
              <h4 className="card-title" style={{ fontSize: '12px' }}>DISTRICT COMPARATIVE CHARTS</h4>
            </div>
            
            <select
              value={metric}
              onChange={e => setMetric(e.target.value)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                height: '32px',
                width: '150px'
              }}
            >
              <option value="count">Total Crimes</option>
              <option value="rate">Crime Rate (/100k)</option>
              <option value="clearance">Clearance Rate (%)</option>
            </select>
          </div>

          <div className="chart-container" style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-muted)" 
                  fontSize={8} 
                  tickLine={false} 
                  interval={0} 
                  angle={-35} 
                  textAnchor="end" 
                  height={50} 
                />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '0px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '11px' }}
                  formatter={(value) => [
                    metric === 'clearance' ? `${value}%` : value,
                    metric === 'clearance' ? 'Clearance' : metric === 'rate' ? 'Rate per 100k' : 'Total Cases'
                  ]}
                />
                <Bar dataKey={metric} radius={[4, 4, 0, 0]}>
                  {sortedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCellColor(index, sortedData.length)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column: Compact ranking table */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div>
            <span className="section-eyebrow">LEAGUE RANKINGS</span>
            <h4 className="card-title" style={{ fontSize: '12px', marginBottom: '12px' }}>RANKED PERFORMANCE LIST</h4>
          </div>

          <div className="table-wrap" style={{ overflowY: 'auto', flex: 1, maxHeight: '240px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>District</th>
                  <th style={{ textAlign: 'right' }}>
                    {metric === 'clearance' ? 'Clearance %' : metric === 'rate' ? 'Rate /100k' : 'Intake'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row, idx) => {
                  const color = getCellColor(idx, sortedData.length);
                  let labelColor = 'inherit';
                  if (color === 'var(--accent-danger)') labelColor = 'var(--accent-danger)';
                  if (color === 'var(--accent-success)') labelColor = 'var(--accent-success)';

                  return (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 700, color: labelColor }}>#{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{row.name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: labelColor }}>
                        {metric === 'clearance' ? `${row.clearance}%` : metric === 'rate' ? row.rate : row.count}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </article>
    </div>
  );
}

export default ComparisonSection;
