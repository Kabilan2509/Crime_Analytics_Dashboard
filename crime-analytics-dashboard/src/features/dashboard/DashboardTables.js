import React from 'react';
import { Link } from 'react-router-dom';

function DashboardTables({ districtPerformance, recentSeriousFIRs, alerts }) {
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
                      <Link
                        to={item.actionUrl}
                        style={{ color: '#2563eb', textDecoration: 'underline' }}
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

      </div>

      {/* Right Column: Alert Rail */}
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

      </div>
    </section>
  );
}

export default DashboardTables;
