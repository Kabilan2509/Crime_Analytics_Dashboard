import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { MdPeople, MdLocalPolice, MdVideocam, MdGroup } from 'react-icons/md';

function CategoryDemographicsOpsSection({ categoriesData, operations }) {
  const { categories = [], demographics = {} } = categoriesData;
  const { ageData = [], genderData = [] } = demographics;
  
  const {
    patrolCoverage = 'N/A',
    patrolPercent = 0,
    cctvUptime = 100,
    personnelAvailable = 100
  } = operations;

  const getMetricColor = (val) => {
    if (val < 70) return 'var(--accent-danger)';
    if (val < 90) return 'var(--accent-warning)';
    return 'var(--accent-success)';
  };

  return (
    <article className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: 0 }}>
      {/* 12a. Categories & Demographics */}
      <div>
        <span className="section-eyebrow">DEMOGRAPHICS & CRIME HEADS</span>
        <h3 className="card-title" style={{ fontSize: '13px', marginBottom: '14px' }}>CASELOAD CATEGORIES & PATIENT SPECIFICS</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
          {/* Crime Category Breakdown */}
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
              CRIME MIX RANKING
            </span>
            <div style={{ height: '130px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} layout="vertical" margin={{ top: 0, right: 10, left: 15, bottom: 0 }}>
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={8} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={8} tickLine={false} width={90} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '0px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '9px' }}
                  />
                  <Bar dataKey="count" fill="var(--chart-blue)" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Demographics Age Snapshot */}
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
              VICTIM AGE PROFILE
            </span>
            <div style={{ height: '130px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} margin={{ top: 0, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={8} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '0px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '9px' }}
                  />
                  <Bar dataKey="count" fill="var(--chart-indigo)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Demographics Gender split summary (flex row) */}
        <div style={{
          display: 'flex',
          gap: '12px',
          background: 'var(--bg-panel-alt)',
          padding: '8px 12px',
          border: '1px solid var(--border-color)',
          fontSize: '11px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
            <MdPeople size={14} />
            <strong>GENDER MIX:</strong>
          </div>
          {genderData.map(g => (
            <div key={g.name} style={{ display: 'flex', gap: '4px' }}>
              <span>{g.name}:</span>
              <strong style={{ color: 'var(--accent-primary)' }}>{g.count}</strong>
            </div>
          ))}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

      {/* 12b. Operations/Resource Status */}
      <div>
        <span className="section-eyebrow">LOGISTICS & MOBILIZATION</span>
        <h3 className="card-title" style={{ fontSize: '13px', marginBottom: '14px' }}>TACTICAL READYNESS METERS</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Active Patrols */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MdLocalPolice size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>Active Patrol Beat Coverage</span>
              </div>
              <strong style={{ color: getMetricColor(patrolPercent) }}>{patrolCoverage}</strong>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '0px' }}>
              <div style={{
                width: `${patrolPercent}%`,
                height: '100%',
                background: getMetricColor(patrolPercent),
                transition: 'width 0.4s'
              }} />
            </div>
          </div>

          {/* CCTV Uptime */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MdVideocam size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>CCTV Cameras Active (Uptime)</span>
              </div>
              <strong style={{ color: getMetricColor(cctvUptime) }}>{cctvUptime}%</strong>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '0px' }}>
              <div style={{
                width: `${cctvUptime}%`,
                height: '100%',
                background: getMetricColor(cctvUptime),
                transition: 'width 0.4s'
              }} />
            </div>
          </div>

          {/* Personnel Availability */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MdGroup size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>Available Duty Officers</span>
              </div>
              <strong style={{ color: getMetricColor(personnelAvailable) }}>{personnelAvailable}%</strong>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '0px' }}>
              <div style={{
                width: `${personnelAvailable}%`,
                height: '100%',
                background: getMetricColor(personnelAvailable),
                transition: 'width 0.4s'
              }} />
            </div>
          </div>
        </div>
      </div>

    </article>
  );
}

export default CategoryDemographicsOpsSection;
