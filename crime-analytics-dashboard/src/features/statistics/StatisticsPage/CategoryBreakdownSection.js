import React from 'react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

function CategoryBreakdownSection({ categoryData }) {
  const { categories = [], genderData = [], ageData = [] } = categoryData;

  // Render horizontal stacked segmented bar for gender
  const renderGenderSegmentBar = () => {
    const total = genderData.reduce((sum, g) => sum + g.count, 0) || 1;
    
    // Define colors for gender
    const colors = {
      Male: '#3897d8',
      Female: '#ff4d4d',
      Other: '#8fa3ba'
    };

    return (
      <div style={{ padding: '10px 0' }}>
        {/* The actual stacked bar */}
        <div style={{
          display: 'flex',
          height: '24px',
          width: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'var(--bg-panel-alt)',
          border: '1px solid var(--border-color)'
        }}>
          {genderData.map(g => {
            const pct = (g.count / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={g.name}
                style={{
                  width: `${pct}%`,
                  background: colors[g.name] || '#8fa3ba',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  transition: 'width 0.3s ease',
                  minWidth: pct > 8 ? '20px' : '0px'
                }}
                title={`${g.name}: ${g.count} victims (${g.value}%)`}
              >
                {pct > 12 && `${g.value}%`}
              </div>
            );
          })}
        </div>

        {/* Legend beneath the bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginTop: '16px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {genderData.map(g => (
            <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                backgroundColor: colors[g.name]
              }} />
              <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                {g.name}: <strong>{g.count}</strong> ({g.value}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div id="category-section" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
      gap: '20px',
      marginBottom: '24px'
    }}>
      {/* 1. Crime by Category (Horizontal Bar) */}
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
          <h3 style={{ margin: 0, fontFamily: "'Source Sans 3', sans-serif", fontSize: '17px', color: 'var(--text-primary)' }}>Crime Categories</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Top crime heads ranked by volume</span>
        </div>

        <div className="chart-container" style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categories}
              layout="vertical"
              margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} tickLine={false} width={100} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '11px' }}
              />
              <Bar dataKey="count" name="Case Count" fill="var(--chart-indigo)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* 2. Victim Gender Distribution (Stacked Horizontal Bar) */}
      <article className="card" style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontFamily: "'Source Sans 3', sans-serif", fontSize: '17px', color: 'var(--text-primary)' }}>Victim Gender Distribution</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Composition split among affected persons</span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {renderGenderSegmentBar()}
        </div>
      </article>

      {/* 3. Victim Age Distribution (Vertical Bar) */}
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
          <h3 style={{ margin: 0, fontFamily: "'Source Sans 3', sans-serif", fontSize: '17px', color: 'var(--text-primary)' }}>Victim Age Distribution</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Age buckets of affected persons</span>
        </div>

        <div className="chart-container" style={{ width: '100%', height: '220px', flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={ageData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <YAxis domain={[0, 'auto']} stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '11px' }}
              />
              <Bar dataKey="count" name="Victim Count" fill="var(--chart-cyan)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}

export default CategoryBreakdownSection;
