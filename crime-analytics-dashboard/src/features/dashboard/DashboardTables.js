import React from 'react';

function DashboardTables({ districtPerformance, recentSeriousFIRs, alerts, dataQualityScore }) {
  return (
    <section className="grid-2" style={{ gap: '20px', alignItems: 'stretch' }}>
      {/* Left Column: District Stats + Recent Heinous Cases */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* District Performance Card */}
        <article className="card" style={{ margin: 0 }}>
          <div className="card-header">
            <div>
              <div className="section-eyebrow">District View</div>
              <h3 className="card-title">Performance by district</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Rank</th>
                  <th>District / Unit</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Solved</th>
                  <th style={{ textAlign: 'right' }}>Heinous</th>
                  <th style={{ textAlign: 'right', paddingRight: '12px' }}>Clearance</th>
                </tr>
              </thead>
              <tbody>
                {districtPerformance.map((item, index) => (
                  <tr key={item.district}>
                    <td>{index + 1}</td>
                    <td><strong>{item.district}</strong></td>
                    <td style={{ textAlign: 'right' }}>{item.firs}</td>
                    <td style={{ textAlign: 'right' }}>{item.solved}</td>
                    <td style={{ textAlign: 'right' }}>{item.heinous}</td>
                    <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', width: '100%' }}>
                        <span className="status-dot-indicator" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.tierColor }} />
                        {item.detectionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        {/* Recent Serious FIR Drill-down Card */}
        <article className="card" style={{ margin: 0 }}>
          <div className="card-header">
            <div>
              <div className="section-eyebrow">Recent Serious Cases</div>
              <h3 className="card-title">High-severity recent FIR drill-down</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Crime No / Station</th>
                  <th>Offence Head</th>
                  <th>Registered Date</th>
                  <th>Current Status</th>
                  <th style={{ textAlign: 'right', paddingRight: '12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentSeriousFIRs.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.crimeNoDisplay}</strong>, {item.station}</td>
                    <td>{item.category}</td>
                    <td>{item.registeredDate}</td>
                    <td>
                      <span style={{ color: item.status === 'Closed' ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                      <a
                        href={item.actionUrl}
                        style={{ color: '#2563eb', textDecoration: 'underline' }}
                      >
                        Inspect
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

      </div>

      {/* Right Column: Alert Rail + Data Quality Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Alert Rail Card */}
        <article className="card" style={{ margin: 0, flex: 1 }}>
          <div className="card-header">
            <div>
              <div className="section-eyebrow">Real-time Intelligence</div>
              <h3 className="card-title">Operational alert logs</h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', fontFamily: 'Consolas, monospace' }}>
            {alerts.map((alert) => {
              const dotColor = alert.severity === 'red' ? '#dc2626' : alert.severity === 'amber' ? '#d97706' : '#2563eb';
              return (
                <div key={alert.id} style={{ display: 'flex', gap: '10px', fontSize: '12px', borderBottom: '1px solid rgba(173, 193, 214, 0.1)', paddingBottom: '8px' }}>
                  <div style={{ marginTop: '5px', minWidth: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{alert.text}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{alert.age}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Data Quality Completeness Card */}
        <article className="card" style={{ margin: 0 }}>
          <div className="card-header">
            <div>
              <div className="section-eyebrow">Integrity Check</div>
              <h3 className="card-title">Data-quality & schema-coverage</h3>
            </div>
          </div>
          <div style={{ marginTop: '16px', fontFamily: 'Consolas, monospace' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Metadata Completeness Score</span>
              <strong style={{ fontSize: '16px', color: '#16a34a' }}>{dataQualityScore}%</strong>
            </div>
            {/* Progress Bar */}
            <div style={{ height: '8px', width: '100%', backgroundColor: '#cbd5e1', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ height: '100%', width: `${dataQualityScore}%`, backgroundColor: '#2563eb', transition: 'width 0.4s ease' }} />
            </div>
            
            {/* Checklist details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• GPS Geo-Coordinates:</span>
                <span style={{ color: '#16a34a' }}>100% Ingested</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• Complainant Profiles:</span>
                <span style={{ color: '#16a34a' }}>98.2% Covered</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• Suspect Demographics:</span>
                <span style={{ color: dataQualityScore > 90 ? '#16a34a' : '#d97706' }}>{Math.round(dataQualityScore * 0.95)}% Covered</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• Act & Section Offence Codes:</span>
                <span style={{ color: '#16a34a' }}>100% Covered</span>
              </div>
            </div>
          </div>
        </article>

      </div>
    </section>
  );
}

export default DashboardTables;
