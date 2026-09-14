import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function TrendsSection({ trendsData }) {
  const {
    trendData = [],
    yoyData = [],
    yearlyMonthlyData = {},
    availableYears = ['2026', '2025', '2024'],
    granularity = 'monthly'
  } = trendsData;

  // Toggleable series state for line chart
  const [visibleSeries, setVisibleSeries] = useState({
    Violent: true,
    Property: true,
    Cybercrime: true,
    Narcotics: true,
    Other: true
  });

  const [baseYear, setBaseYear] = useState('2026');
  const [compareYear, setCompareYear] = useState('2025');

  const monthsLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dynamicYoyData = useMemo(() => {
    return monthsLabel.map((name, i) => {
      const valA = yearlyMonthlyData[baseYear] ? yearlyMonthlyData[baseYear][i] : 0;
      const valB = yearlyMonthlyData[compareYear] ? yearlyMonthlyData[compareYear][i] : 0;
      return {
        name,
        [baseYear]: valA,
        [compareYear]: valB
      };
    });
  }, [baseYear, compareYear, yearlyMonthlyData]);

  const toggleSeries = (key) => {
    setVisibleSeries(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Recharts custom legend renderer
  const renderCustomLegend = (props) => {
    const categories = ['Violent', 'Property', 'Cybercrime', 'Narcotics', 'Other'];
    const colors = {
      Violent: '#ff4d4d',
      Property: '#ffaa00',
      Cybercrime: '#3897d8',
      Narcotics: '#9b5de5',
      Other: '#8fa3ba'
    };

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '10px' }}>
        {categories.map(cat => (
          <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)' }}>
            <input
              type="checkbox"
              checked={visibleSeries[cat]}
              onChange={() => toggleSeries(cat)}
              style={{ accentColor: colors[cat], minHeight: 'auto', minWidth: 'auto', width: '16px', height: '16px', margin: 0 }}
            />
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colors[cat] }} />
            <span>{cat}</span>
          </label>
        ))}
      </div>
    );
  };

  return (
    <div id="trends-section" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
      gap: '20px',
      marginBottom: '24px'
    }}>
      {/* 5a. Crime Trend Line Chart */}
      <article className="card" style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: "'Source Sans 3', sans-serif", fontSize: '18px', color: 'var(--text-primary)' }}>Crime Trend</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Temporal resolution: <span style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent-primary)' }}>{granularity}</span>
            </span>
          </div>
        </div>

        {/* Legend checkboxes above */}
        {renderCustomLegend()}

        <div className="chart-container" style={{ width: '100%', height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="var(--text-muted)" 
                fontSize={11} 
                tickLine={false} 
              />
              <YAxis 
                domain={[0, 'auto']} 
                stroke="var(--text-muted)" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '12px' }} 
              />
              
              {visibleSeries.Violent && (
                <Line type="monotone" dataKey="Violent" name="Violent" stroke="#ff4d4d" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              )}
              {visibleSeries.Property && (
                <Line type="monotone" dataKey="Property" name="Property" stroke="#ffaa00" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              )}
              {visibleSeries.Cybercrime && (
                <Line type="monotone" dataKey="Cybercrime" name="Cybercrime" stroke="#3897d8" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              )}
              {visibleSeries.Narcotics && (
                <Line type="monotone" dataKey="Narcotics" name="Narcotics" stroke="#9b5de5" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              )}
              {visibleSeries.Other && (
                <Line type="monotone" dataKey="Other" name="Other" stroke="#8fa3ba" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* 5b. Year-over-Year Comparison Chart */}
      <article className="card" style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: "'Source Sans 3', sans-serif", fontSize: '18px', color: 'var(--text-primary)' }}>Yearly Comparison</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Multi-year cohort volume comparison</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Compare:</span>
            <select
              value={baseYear}
              onChange={e => setBaseYear(e.target.value)}
              aria-label="Select base comparison year"
              style={{
                padding: '4px 8px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                background: 'var(--bg-panel-alt)',
                color: 'var(--text-primary)',
                fontSize: '11px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {availableYears.map(yr => (
                <option key={`base_${yr}`} value={yr}>{yr}</option>
              ))}
            </select>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>vs</span>
            <select
              value={compareYear}
              onChange={e => setCompareYear(e.target.value)}
              aria-label="Select comparison year"
              style={{
                padding: '4px 8px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                background: 'var(--bg-panel-alt)',
                color: 'var(--text-primary)',
                fontSize: '11px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {availableYears.map(yr => (
                <option key={`comp_${yr}`} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="chart-container" style={{ width: '100%', height: '280px', marginTop: '10px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dynamicYoyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 'auto']} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '12px' }} 
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              
              <Bar dataKey={baseYear} name={`Year ${baseYear}`} fill="var(--chart-blue, #3897d8)" radius={[4, 4, 0, 0]} />
              <Bar dataKey={compareYear} name={`Year ${compareYear}`} fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <style>{`
        @media (max-width: 500px) {
          #trends-section {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default TrendsSection;
