import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { districts } from '../../../data/schemaSelectors';

function ComparisonsRankingsSection({ rankingsData }) {
  const { districts: districtRankings = [], stations: stationRankings = [] } = rankingsData;

  // Comparison State
  const [selectedDistricts, setSelectedDistricts] = useState(['1', '3', '4']); // default ids: Bengaluru Urban, Mysuru, Mangaluru
  const [metric, setMetric] = useState('rate'); // 'rate' (crime rate) vs 'count' (incident count)
  
  // Rankings State
  const [rankingType, setRankingType] = useState('districts'); // 'districts' vs 'stations'

  const handleDistrictToggle = (id) => {
    const sId = String(id);
    if (selectedDistricts.includes(sId)) {
      if (selectedDistricts.length > 1) {
        setSelectedDistricts(selectedDistricts.filter(x => x !== sId));
      }
    } else {
      setSelectedDistricts([...selectedDistricts, sId]);
    }
  };

  // Build comparison data
  const comparisonData = selectedDistricts.map(sId => {
    const dObj = districts.find(d => String(d.DistrictID) === sId);
    const dRank = districtRankings.find(dr => String(dr.id) === sId) || { count: 0, rate: 0, clearance: 0 };
    return {
      name: dObj ? dObj.DistrictName.replace(' (Dakshina Kannada)', '') : `District ${sId}`,
      rate: dRank.rate,
      clearance: dRank.clearance,
      count: dRank.count
    };
  });

  return (
    <div id="rankings-section" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
      gap: '20px',
      marginBottom: '24px'
    }}>
      {/* 1. District Comparison (Grouped Bar) */}
      <article className="card" style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: "'Source Sans 3', sans-serif", fontSize: '18px', color: 'var(--text-primary)' }}>District Comparison</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Compare metrics side-by-side</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={metric}
              onChange={e => setMetric(e.target.value)}
              style={{
                padding: '4px 8px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                background: 'var(--bg-panel-alt)',
                color: 'var(--text-primary)',
                fontSize: '11px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="rate">Crime Rate vs Clearance</option>
              <option value="count">Case Volume vs Clearance</option>
            </select>
          </div>
        </div>

        {/* District Checkbox List */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '14px',
          maxHeight: '70px',
          overflowY: 'auto',
          padding: '6px',
          background: 'var(--bg-panel-alt)',
          borderRadius: '6px',
          border: '1px solid var(--border-color)'
        }}>
          {districts.slice(0, 10).map(d => {
            const sId = String(d.DistrictID);
            const isChecked = selectedDistricts.includes(sId);
            return (
              <label key={d.DistrictID} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: isChecked ? 700 : 500,
                color: isChecked ? 'var(--accent-primary)' : 'var(--text-secondary)'
              }}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleDistrictToggle(d.DistrictID)}
                  style={{ minHeight: 'auto', minWidth: 'auto', width: '16px', height: '16px', margin: 0 }}
                />
                <span>{d.DistrictName.split(' ')[0]}</span>
              </label>
            );
          })}
        </div>

        <div className="chart-container" style={{ width: '100%', height: '240px', flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '11px' }}
              />
              <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />

              <Bar 
                dataKey={metric === 'rate' ? 'rate' : 'count'} 
                name={metric === 'rate' ? 'Crime Rate (per 100k)' : 'Total Crimes'} 
                fill="var(--chart-blue)" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey="clearance" 
                name="Clearance Rate (%)" 
                fill="var(--chart-green)" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* 2. Top-N Ranking Table */}
      <article className="card" style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: "'Source Sans 3', sans-serif", fontSize: '18px', color: 'var(--text-primary)' }}>Performance Rankings</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Top audit and volume listings</span>
          </div>

          {/* Toggle Type */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-panel-alt)',
            borderRadius: '6px',
            padding: '2px',
            border: '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              onClick={() => setRankingType('districts')}
              style={{
                background: rankingType === 'districts' ? 'var(--accent-primary)' : 'transparent',
                color: rankingType === 'districts' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                minHeight: '26px',
                minWidth: 'auto',
                cursor: 'pointer'
              }}
            >
              Top Districts
            </button>
            <button
              type="button"
              onClick={() => setRankingType('stations')}
              style={{
                background: rankingType === 'stations' ? 'var(--accent-primary)' : 'transparent',
                color: rankingType === 'stations' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                minHeight: '26px',
                minWidth: 'auto',
                cursor: 'pointer'
              }}
            >
              Top Stations
            </button>
          </div>
        </div>

        {/* Ranking Table Wrap */}
        <div className="table-wrap" style={{ overflowX: 'auto', flex: 1 }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ textAlign: 'left', padding: '10px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Rank</th>
                <th style={{ textAlign: 'left', padding: '10px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  {rankingType === 'districts' ? 'District' : 'Police Station'}
                </th>
                <th style={{ textAlign: 'right', padding: '10px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  {rankingType === 'districts' ? 'Crime Rate' : 'Audit Score'}
                </th>
                <th style={{ textAlign: 'right', padding: '10px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Clearance
                </th>
              </tr>
            </thead>
            <tbody>
              {rankingType === 'districts' ? (
                districtRankings.slice(0, 5).map((row, idx) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)', height: '44px' }} className="ranking-row">
                    <td style={{ padding: '10px', fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)' }}>#{idx + 1}</td>
                    <td style={{ padding: '10px', fontSize: '13px', fontWeight: 600 }}>{row.name}</td>
                    <td style={{ padding: '10px', fontSize: '13px', fontWeight: 700, textAlign: 'right', color: 'var(--accent-danger)' }}>
                      {row.rate} <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>/100k</span>
                    </td>
                    <td style={{ padding: '10px', fontSize: '13px', fontWeight: 600, textAlign: 'right', color: 'var(--accent-success)' }}>
                      {row.clearance}%
                    </td>
                  </tr>
                ))
              ) : (
                stationRankings.slice(0, 5).map((row, idx) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)', height: '44px' }} className="ranking-row">
                    <td style={{ padding: '10px', fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)' }}>#{idx + 1}</td>
                    <td style={{ padding: '10px', fontSize: '13px', fontWeight: 600 }}>{row.station}</td>
                    <td style={{ padding: '10px', fontSize: '13px', fontWeight: 700, textAlign: 'right', color: 'var(--accent-success)' }}>
                      {row.score}%
                    </td>
                    <td style={{ padding: '10px', fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>
                      <span className={`badge ${row.status === 'Exemplary' ? 'badge-success' : 'badge-info'}`} style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: row.status === 'Exemplary' ? 'rgba(0, 200, 83, 0.12)' : 'rgba(56, 151, 216, 0.12)',
                        color: row.status === 'Exemplary' ? 'var(--accent-success)' : 'var(--accent-primary)'
                      }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <style>{`
        .ranking-row:hover {
          background: var(--bg-panel-alt);
        }
        @media (max-width: 900px) {
          #rankings-section {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ComparisonsRankingsSection;
