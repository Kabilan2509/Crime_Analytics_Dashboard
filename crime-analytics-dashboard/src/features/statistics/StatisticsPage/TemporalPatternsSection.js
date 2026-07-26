import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip } from 'recharts';

function TemporalPatternsSection({ temporalData, onTimeFilter }) {
  const { heatmap = [], dayOfWeek = [], hasHourlyData = true } = temporalData;

  const daysName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hoursLabel = Array.from({ length: 24 }, (_, i) => i);

  // Find max count in heatmap for color scaling
  const maxCount = heatmap.length > 0 ? Math.max(...heatmap.map(h => h.count)) : 1;

  // Helper for heatmap cell color intensity
  const getCellColor = (count) => {
    if (count === 0) return 'rgba(112, 131, 154, 0.05)';
    const ratio = count / maxCount;
    // Sequential color ramp based on accent-primary (#3897d8)
    if (ratio < 0.25) return 'rgba(56, 151, 216, 0.2)';
    if (ratio < 0.5) return 'rgba(56, 151, 216, 0.45)';
    if (ratio < 0.75) return 'rgba(56, 151, 216, 0.75)';
    return 'var(--accent-primary)'; // High intensity peak
  };

  const handleCellClick = (day, hour) => {
    if (onTimeFilter) {
      onTimeFilter(day, hour);
    }
  };

  return (
    <div id="temporal-section" style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
      gap: '20px',
      marginBottom: '24px'
    }}>
      {/* 1. 24x7 Time Heatmap */}
      <article className="card" style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontFamily: "'Source Sans 3', sans-serif", fontSize: '18px', color: 'var(--text-primary)' }}>24×7 Temporal Heatmap</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Hourly concentration of incidents across the week. Click cell to filter by hour.
          </span>
          {!hasHourlyData && (
            <div style={{ marginTop: '8px', color: 'var(--warning, #d6a84b)', fontSize: '12px' }}>
              Hourly breakdown unavailable: these records contain dates without a reliable time of day.
            </div>
          )}
        </div>

        {/* Heatmap Grid Wrapper */}
        <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
          <div style={{ minWidth: '600px' }}>
            {/* Hours Header Row */}
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <div style={{ width: '40px', flexShrink: 0 }} /> {/* spacer */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', width: '100%' }}>
                {hoursLabel.map(h => (
                  <div key={h} style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    textTransform: 'uppercase'
                  }}>
                    {h === 0 ? '12a' : h === 12 ? '12p' : h > 12 ? `${h-12}p` : `${h}a`}
                  </div>
                ))}
              </div>
            </div>

            {/* Days Matrix Rows */}
            {daysName.map((day, dIdx) => (
              <div key={day} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                {/* Day label */}
                <div style={{
                  width: '40px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  flexShrink: 0
                }}>
                  {day}
                </div>

                {/* Heatmap Cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', width: '100%', gap: '3px' }}>
                  {hoursLabel.map(hour => {
                    const cell = heatmap.find(h => h.day === day && h.hour === hour) || { count: 0 };
                    const cellColor = getCellColor(cell.count);

                    return (
                      <div
                        key={hour}
                        onClick={() => handleCellClick(day, hour)}
                        style={{
                          background: cellColor,
                          aspectRatio: '1',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'transform 0.1s'
                        }}
                        className="heatmap-cell"
                        title={`${day} @ ${hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour-12} PM` : `${hour} AM`}: ${cell.count} cases`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap intensity legend */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '12px',
          justifyContent: 'flex-end',
          fontSize: '10px',
          color: 'var(--text-secondary)'
        }}>
          <span>Fewer Incidents</span>
          <span style={{ width: '12px', height: '12px', background: 'rgba(112, 131, 154, 0.05)', borderRadius: '2px', border: '1px solid var(--border-color)' }} />
          <span style={{ width: '12px', height: '12px', background: 'rgba(56, 151, 216, 0.2)', borderRadius: '2px' }} />
          <span style={{ width: '12px', height: '12px', background: 'rgba(56, 151, 216, 0.45)', borderRadius: '2px' }} />
          <span style={{ width: '12px', height: '12px', background: 'rgba(56, 151, 216, 0.75)', borderRadius: '2px' }} />
          <span style={{ width: '12px', height: '12px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
          <span>More Incidents</span>
        </div>
      </article>

      {/* 2. Day-of-Week Bar Chart */}
      <article className="card" style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontFamily: "'Source Sans 3', sans-serif", fontSize: '18px', color: 'var(--text-primary)' }}>Day of Week Distribution</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Aggregate cases registered per weekday</span>
        </div>

        <div className="chart-container" style={{ width: '100%', height: '220px', flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayOfWeek} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 'auto']} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <ChartTooltip
                contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '12px' }}
              />
              <Bar dataKey="count" name="Case Count" fill="var(--chart-blue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <style>{`
        .heatmap-cell:hover {
          transform: scale(1.2);
          box-shadow: 0 0 5px rgba(255,255,255,0.4);
          z-index: 10;
        }
        @media (max-width: 900px) {
          #temporal-section {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default TemporalPatternsSection;
