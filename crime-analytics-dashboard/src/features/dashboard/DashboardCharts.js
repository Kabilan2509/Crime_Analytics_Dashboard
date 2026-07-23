import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';

function useActiveTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      setTheme(currentTheme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip" style={{ margin: 0, padding: 0 }}>
      <p className="chart-tooltip-label" style={{ margin: '0 0 6px 0', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color || item.fill, margin: '2px 0', fontSize: '12px', fontFamily: 'Consolas, monospace' }}>
          {item.name}: {Number(item.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function DashboardCharts({ monthlyTrend, crimeDistribution, stacked = false }) {
  const theme = useActiveTheme();
  
  const textColor = theme === 'dark' ? '#edf3fb' : '#1e293b';
  const mutedTextColor = theme === 'dark' ? '#8fa2b8' : '#64748b';
  const gridColor = theme === 'dark' ? 'rgba(173, 193, 214, 0.15)' : 'rgba(148, 163, 184, 0.15)';

  const containerStyle = stacked 
    ? { display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', margin: 0 }
    : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };

  return (
    <div style={containerStyle}>
      <style>{`
        .recharts-legend-item-text {
          color: ${textColor} !important;
          font-size: 10px !important;
          letter-spacing: 0.5px !important;
          font-family: 'Consolas', monospace !important;
          text-transform: uppercase !important;
        }
      `}</style>
      
      {/* Trend Line Chart Panel */}
      <article className="card" style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <div>
            <div className="section-eyebrow">Trend Suite</div>
            <h3 className="card-title">Case registration vs Resolution progression</h3>
          </div>
        </div>
        <div className="chart-container" style={{ height: '220px', flex: 1, marginTop: '8px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrend} margin={{ bottom: 5, left: -10, right: 10 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="1 3" vertical={false} />
              <XAxis dataKey="month" stroke={mutedTextColor} tickLine={false} axisLine={false} style={{ fontSize: '11px', fontFamily: 'Consolas, monospace' }} />
              <YAxis stroke={mutedTextColor} tickLine={false} axisLine={false} style={{ fontSize: '11px', fontFamily: 'Consolas, monospace' }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: 'Consolas, monospace', fontSize: '10px', textTransform: 'uppercase' }} />
              <Line type="monotone" dataKey="firs" name="FIR Registrations" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="arrests" name="Arrest Events" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="chargesheets" name="Chargesheets Filed" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* Distribution Bar Chart Panel */}
      <article className="card" style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <div>
            <div className="section-eyebrow">Classification Distribution</div>
            <h3 className="card-title">Workload distribution by crime category</h3>
          </div>
        </div>
        <div className="chart-container" style={{ height: '220px', flex: 1, marginTop: '8px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={crimeDistribution} layout="vertical" margin={{ left: 10, right: 15, bottom: 15 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="1 3" horizontal={false} />
              <XAxis type="number" stroke={mutedTextColor} tickLine={false} axisLine={false} style={{ fontSize: '11px', fontFamily: 'Consolas, monospace' }} label={{ value: 'TOTAL CASE WORKLOAD', position: 'insideBottom', offset: -8, fill: mutedTextColor, fontSize: '9px', fontFamily: 'Consolas, monospace', letterSpacing: '1px' }} />
              <YAxis
                type="category"
                dataKey="name"
                width={190}
                interval={0}
                stroke={mutedTextColor}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fontFamily: 'Consolas, monospace' }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: 'Consolas, monospace', fontSize: '10px' }} />
              <Bar dataKey="value" name="Cases Recorded" radius={0}>
                {crimeDistribution.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}

export default DashboardCharts;
