import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { MdTrendingUp, MdBarChart, MdTimeline } from 'react-icons/md';
import GrafanaPanel from '../../../components/ui/GrafanaPanel';
import { useNavigate } from 'react-router-dom';

function TrendChartsSection({ trends }) {
  const navigate = useNavigate();
  const { trendData = [], sparklines = [], hourData = [] } = trends;

  const [visibleSeries, setVisibleSeries] = useState({
    Violent: true,
    Property: true,
    Cyber: true
  });

  const toggleSeries = (key) => {
    setVisibleSeries(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleStatsRedirect = () => {
    navigate('/statistics');
  };

  return (
    <div id="trends-brief-section" style={{ marginBottom: '24px' }}>
      {/* Title with link */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '4px', height: '14px', background: 'var(--accent-primary)', display: 'inline-block' }} />
          <span className="briefing-section-heading" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            TEMPORAL INTEL & TREND ANALYSIS
          </span>
        </div>

        <button
          type="button"
          onClick={handleStatsRedirect}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer'
          }}
          className="stats-btn"
        >
          <MdBarChart size={14} />
          <span>VIEW FULL STATISTICS</span>
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px'
      }} className="trends-layout">
        
        {/* 1. Crime Trend Area Chart */}
        <article className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
            <div>
              <span className="section-eyebrow">TEMPORAL FLUX</span>
              <h4 className="card-title" style={{ fontSize: '12px' }}>WEEKLY CATEGORY CASELOADS</h4>
            </div>

            {/* Checkbox togglers */}
            <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={visibleSeries.Violent}
                  onChange={() => toggleSeries('Violent')}
                  style={{ minHeight: 'auto', minWidth: 'auto', width: '13px', height: '13px', margin: 0, accentColor: '#ff4d4d' }}
                />
                <span style={{ color: '#ff4d4d', fontWeight: 600 }}>Violent</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={visibleSeries.Property}
                  onChange={() => toggleSeries('Property')}
                  style={{ minHeight: 'auto', minWidth: 'auto', width: '13px', height: '13px', margin: 0, accentColor: '#ffaa00' }}
                />
                <span style={{ color: '#ffaa00', fontWeight: 600 }}>Property</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={visibleSeries.Cyber}
                  onChange={() => toggleSeries('Cyber')}
                  style={{ minHeight: 'auto', minWidth: 'auto', width: '13px', height: '13px', margin: 0, accentColor: '#3897d8' }}
                />
                <span style={{ color: '#3897d8', fontWeight: 600 }}>Cyber</span>
              </label>
            </div>
          </div>

          <div className="chart-container" style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="violentGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff4d4d" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ff4d4d" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="propertyGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffaa00" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ffaa00" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="cyberGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3897d8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3897d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '0px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '11px' }}
                />
                {visibleSeries.Violent && (
                  <Area type="monotone" dataKey="Violent" stroke="#ff4d4d" strokeWidth={1.5} fill="url(#violentGlow)" name="Violent Crimes" />
                )}
                {visibleSeries.Property && (
                  <Area type="monotone" dataKey="Property" stroke="#ffaa00" strokeWidth={1.5} fill="url(#propertyGlow)" name="Property Crimes" />
                )}
                {visibleSeries.Cyber && (
                  <Area type="monotone" dataKey="Cyber" stroke="#3897d8" strokeWidth={1.5} fill="url(#cyberGlow)" name="Cyber Crimes" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* 2. Sparkline Grid & Time Histogram Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Sparklines Panel */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px'
          }}>
            {sparklines.map((sp, idx) => (
              <div key={idx} className="card" style={{
                padding: '12px !important',
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100px'
              }}>
                <div>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                    {sp.label}
                  </span>
                  <strong style={{ fontSize: '15px', color: 'var(--text-primary)', display: 'block', marginTop: '2px' }}>
                    {sp.value}
                  </strong>
                </div>

                <div style={{ width: '100%', height: '30px', marginTop: '6px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sp.trend.map((v, i) => ({ val: v, id: i }))}>
                      <Line type="monotone" dataKey="val" stroke="var(--accent-primary)" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          {/* Time of Day Histogram */}
          <article className="card" style={{ display: 'flex', flexDirection: 'column', margin: 0, flex: 1 }}>
            <div style={{ marginBottom: '8px' }}>
              <span className="section-eyebrow">CHRONOLOGICAL LOOPS</span>
              <h4 className="card-title" style={{ fontSize: '12px' }}>INCIDENTS BY HOUR OF DAY</h4>
            </div>

            <div className="chart-container" style={{ width: '100%', height: '100px', flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '0px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '10px' }}
                    formatter={(value) => [`${value} cases`, 'Caseload']}
                  />
                  <Bar dataKey="count" fill="var(--chart-indigo)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .trends-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default TrendChartsSection;
