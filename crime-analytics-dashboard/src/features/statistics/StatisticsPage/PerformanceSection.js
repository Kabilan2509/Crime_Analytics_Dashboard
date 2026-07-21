import React from 'react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

function PerformanceSection({ performanceData }) {
  const { funnel = [], clearanceByDistrict = [], avgTimeToChargesheet = { value: 52.4, target: 60 } } = performanceData;

  // Custom rendering for Case Resolution Funnel
  const renderFunnel = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
        {funnel.map((item, idx) => {
          // Calculate conversion from previous stage
          let conversionText = '';
          if (idx > 0 && funnel[idx - 1].count > 0) {
            const conv = Math.round((item.count / funnel[idx - 1].count) * 100);
            conversionText = `${conv}% conversion from previous stage`;
          } else {
            conversionText = 'Pipeline Entry';
          }

          const fillPct = item.pctOfFirst;

          return (
            <div key={item.stage} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                <span>{item.stage}</span>
                <span>{item.count} cases <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({fillPct}%)</span></span>
              </div>
              <div style={{
                height: '14px',
                width: '100%',
                background: 'var(--bg-panel-alt)',
                borderRadius: '7px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  height: '100%',
                  width: `${fillPct}%`,
                  background: 'linear-gradient(90deg, var(--chart-blue) 0%, var(--accent-secondary) 100%)',
                  borderRadius: '7px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'right' }}>
                {conversionText}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Custom rendering for Bullet Chart of Avg. Time to Chargesheet
  const renderBulletChart = () => {
    const val = avgTimeToChargesheet.value;
    const target = avgTimeToChargesheet.target;
    
    // Normalize percentage. Let's make max 100 hours
    const maxVal = 100;
    const valPct = Math.min(100, (val / maxVal) * 100);
    const targetPct = Math.min(100, (target / maxVal) * 100);

    const isGood = val <= target; // Lower time to chargesheet is better!

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Average Duration: <strong style={{ color: isGood ? 'var(--accent-success)' : 'var(--accent-warning)', fontSize: '18px' }}>{val} hrs</strong>
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target: {target} hrs</span>
        </div>

        {/* Horizontal Bullet Bar Container */}
        <div style={{
          position: 'relative',
          height: '24px',
          width: '100%',
          background: 'var(--bg-panel-alt)',
          borderRadius: '4px',
          border: '1px solid var(--border-color)',
          marginTop: '10px'
        }}>
          {/* Ranges underlay (simulated bullet chart qualitative bands: good/satisfactory/poor) */}
          <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            <div style={{ width: '60%', background: 'rgba(0, 200, 83, 0.04)', height: '100%' }} /> {/* Good: 0-60 hrs */}
            <div style={{ width: '20%', background: 'rgba(255, 170, 0, 0.04)', height: '100%' }} /> {/* Warning: 60-80 hrs */}
            <div style={{ width: '20%', background: 'rgba(255, 77, 77, 0.04)', height: '100%' }} />  {/* Poor: 80+ hrs */}
          </div>

          {/* Actual value bar */}
          <div style={{
            position: 'absolute',
            top: '4px',
            left: 0,
            height: '14px',
            width: `${valPct}%`,
            background: isGood ? 'var(--accent-success)' : 'var(--accent-warning)',
            borderRadius: '0 2px 2px 0',
            transition: 'width 0.3s ease',
            zIndex: 2
          }} />

          {/* Target marker line */}
          <div style={{
            position: 'absolute',
            top: '-4px',
            left: `${targetPct}%`,
            width: '3px',
            height: '30px',
            background: '#ffaa00',
            zIndex: 3,
            boxShadow: '0 0 4px rgba(0,0,0,0.5)'
          }}
          title={`Target Goal: ${target} hours`}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          <span>0 hrs (Optimal)</span>
          <span style={{ color: '#ffaa00', fontWeight: 700 }}>Target Benchmark ({target} hrs)</span>
          <span>100 hrs (Backlog limit)</span>
        </div>

        <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          {isGood 
            ? '✓ KSP Performance Audit confirms current average timeline is within state mandated 60-hour goal window.' 
            : '⚠️ Timeline alert: Investigation cycle exceeds target. Review officer caseload distribution.'
          }
        </p>
      </div>
    );
  };

  return (
    <div id="performance-section" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
      gap: '20px',
      marginBottom: '24px'
    }}>
      {/* 1. Funnel */}
      <article className="card" style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontFamily: "'Source Sans 3', sans-serif", fontSize: '18px', color: 'var(--text-primary)' }}>Case Resolution Funnel</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Conversion rates across key prosecution milestones</span>
        </div>
        {renderFunnel()}
      </article>

      {/* 2. Clearance Rate by District */}
      <article className="card" style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontFamily: "'Source Sans 3', sans-serif", fontSize: '18px', color: 'var(--text-primary)' }}>District Clearance Rates</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Top active districts compared by clearance percentage</span>
        </div>

        <div className="chart-container" style={{ width: '100%', height: '220px', flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={clearanceByDistrict} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '11px' }}
                formatter={(value) => [`${value}%`, 'Clearance Rate']}
              />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {clearanceByDistrict.map((entry, index) => {
                  let fill = 'var(--accent-danger)'; // red <60%
                  if (entry.rate >= 80) fill = 'var(--accent-success)'; // green
                  else if (entry.rate >= 60) fill = 'var(--accent-warning)'; // amber

                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* 3. Bullet Chart */}
      <article className="card" style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontFamily: "'Source Sans 3', sans-serif", fontSize: '18px', color: 'var(--text-primary)' }}>Avg. Time to Chargesheet</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Average duration from FIR registration to chargesheet filing</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {renderBulletChart()}
        </div>
      </article>
    </div>
  );
}

export default PerformanceSection;
