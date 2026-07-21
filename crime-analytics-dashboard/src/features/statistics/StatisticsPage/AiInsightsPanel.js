import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { MdSmartToy } from 'react-icons/md';

function AiInsightsPanel({ insightsData }) {
  const { bullets = [], forecast = [] } = insightsData;

  return (
    <div id="insights-section" style={{ marginBottom: '24px' }}>
      <article className="ai-insights-card" style={{
        background: 'linear-gradient(135deg, var(--bg-panel) 0%, rgba(56, 151, 216, 0.05) 100%)',
        border: '1.5px dashed var(--accent-primary)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 12px 30px rgba(56, 151, 216, 0.12)',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '-12px',
          left: '20px',
          background: 'var(--accent-primary)',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '4px 10px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
        }}>
          <MdSmartToy size={14} />
          <span>AI Insight & Predictive Model</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginTop: '6px'
        }}>
          {/* Narrative Bullets */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: 'var(--accent-primary)', fontWeight: 700 }}>
              Algorithmic Caseload Analysis
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {bullets.map((bullet, idx) => (
                <li key={idx} style={{
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  lineHeight: '1.5',
                  listStyleType: 'square'
                }}>
                  {bullet}
                </li>
              ))}
            </ul>
            <div style={{
              marginTop: '18px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              borderLeft: '2px solid var(--accent-primary)',
              paddingLeft: '8px',
              fontStyle: 'italic'
            }}>
              Forecast model based on triple exponential smoothing (Holt-Winters) calculated across YTD spatiotemporal aggregates.
            </div>
          </div>

          {/* Forecasting Mini Chart */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              3-Month Caseload Projection
            </h4>

            <div className="chart-container" style={{ width: '100%', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forecastGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '11px' }}
                  />
                  <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />

                  {/* Shaded confidence interval band */}
                  <Area
                    type="monotone"
                    dataKey="confidenceMax"
                    stroke="none"
                    fill="url(#forecastGlow)"
                    name="Confidence Range"
                  />
                  
                  {/* Actual lines */}
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="var(--accent-primary)"
                    strokeWidth={2}
                    fill="none"
                    name="Actual Incidents"
                    activeDot={{ r: 4 }}
                  />
                  
                  {/* Predicted lines */}
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="var(--accent-secondary)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fill="none"
                    name="Predicted Trend"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

export default AiInsightsPanel;
