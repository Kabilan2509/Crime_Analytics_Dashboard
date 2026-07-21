import React, { useMemo, useState } from 'react';
import {
  MdPeople, MdVerifiedUser, MdLock, MdHistory, MdRefresh
} from 'react-icons/md';
import { playAlertSound } from '../utils/audioAlert';

function UserManagement() {
  const [operators, setOperators] = useState([
    { id: 'op_01', name: 'DGP Kishore, IPS', role: 'State DGP Command', clearance: 'Command L1', status: 'Active Session', desk: 'Desk #01' },
    { id: 'op_02', name: 'PSI Ramesh Kumar', role: 'Field Commander', clearance: 'Command L2', status: 'Active Session', desk: 'Desk #04' },
    { id: 'op_03', name: 'Analyst Ananya Hegde', role: 'Crime Analyst', clearance: 'Restricted Analyst', status: 'Idle (14m)', desk: 'Desk #12' },
    { id: 'op_04', name: 'PSI Suresh Gowda', role: 'Duty Officer', clearance: 'Command L2', status: 'Offline', desk: 'Desk #09' }
  ]);

  const auditLogs = useMemo(() => [
    { time: '17:30:15', user: 'PSI Ramesh', action: 'PII Unlocked for FIR-1002 suspect lookup', hash: 'AES-256' },
    { time: '17:32:48', user: 'DGP Kishore', action: 'Emergency dispatch vector authorized for Unit 1201', hash: 'AES-256' },
    { time: '17:41:05', user: 'Analyst Ananya', action: 'Spatial hotspot prediction dataset exported', hash: 'AES-256' }
  ], []);

  const handleToggleClearance = (opId) => {
    playAlertSound(700, 0.05);
    setOperators(prev => prev.map(op => {
      if (op.id === opId) {
        const nextClearance = op.clearance === 'Command L1' ? 'Command L2' : op.clearance === 'Command L2' ? 'Restricted Analyst' : 'Command L1';
        return { ...op, clearance: nextClearance };
      }
      return op;
    }));
  };

  const handleRevokeAccess = (opId) => {
    playAlertSound(300, 0.15);
    setOperators(prev => prev.map(op => {
      if (op.id === opId) {
        return { ...op, status: 'Offline', clearance: 'Restricted Analyst' };
      }
      return op;
    }));
    alert('Clearance revoked and operator logged out of active session.');
  };

  return (
    <div className="page-content user-management-page text-inverse">
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <MdPeople size={28} style={{ color: 'var(--accent-primary)' }} />
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Operator & Command Clearance Console</h2>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Configure dispatcher credentials, system session clearance, and audit trails</span>
        </div>
      </div>

      {/* DETAIL GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '20px', minHeight: '480px' }}>
        
        {/* OPERATORS MANAGEMENT TABLE */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
          <div style={{ padding: '12px 16px', background: 'var(--bg-panel-alt)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px', letterSpacing: '0.04em' }}>ACTIVE OPERATOR CLEARANCE MATRIX</strong>
            <button
              onClick={() => {
                playAlertSound(600, 0.05);
                setOperators(prev => prev.map(op => op.id === 'op_03' ? { ...op, status: 'Active Session' } : op));
              }}
              className="session-btn"
              style={{ minHeight: '32px', minWidth: '80px', fontSize: '12px' }}
            >
              <MdRefresh size={14} style={{ marginRight: '4px' }} /> Sync Telemetry
            </button>
          </div>

          <div style={{ flex: 1, padding: '16px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 8px' }}>User Name</th>
                  <th style={{ padding: '12px 8px' }}>Role</th>
                  <th style={{ padding: '12px 8px' }}>Clearance</th>
                  <th style={{ padding: '12px 8px' }}>Session Status</th>
                  <th style={{ padding: '12px 8px' }}>Dispatch Desk</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {operators.map(op => {
                  let statusColor = 'var(--text-secondary)';
                  if (op.status === 'Active Session') statusColor = 'var(--accent-success)';
                  if (op.status.includes('Idle')) statusColor = 'var(--accent-warning)';

                  return (
                    <tr key={op.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>{op.name}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{op.role}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span className="badge" style={{
                          background: op.clearance.includes('L1') ? 'rgba(200,0,0,0.12)' : 'rgba(116,130,151,0.12)',
                          color: op.clearance.includes('L1') ? 'var(--accent-danger)' : 'var(--text-primary)',
                          fontWeight: 700, fontSize: '10px'
                        }}>
                          {op.clearance}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: statusColor, fontWeight: 600 }}>{op.status}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{op.desk}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleToggleClearance(op.id)}
                            className="template-btn"
                            style={{ minHeight: '32px', minWidth: '32px', padding: 0, fontSize: '11px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--accent-primary)' }}
                            title="Toggle Clearance"
                          >
                            <MdVerifiedUser size={14} />
                          </button>
                          <button
                            onClick={() => handleRevokeAccess(op.id)}
                            className="template-btn"
                            disabled={op.status === 'Offline'}
                            style={{ minHeight: '32px', minWidth: '32px', padding: 0, fontSize: '11px', background: 'transparent', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)' }}
                            title="Revoke Access"
                          >
                            <MdLock size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SYSTEM TRANSACTION AUDIT LOG */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
          <div style={{ padding: '12px 16px', background: 'var(--bg-panel-alt)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MdHistory style={{ color: 'var(--accent-primary)' }} />
            <strong style={{ fontSize: '13px', letterSpacing: '0.04em' }}>SYSTEM SECURITY AUDIT TRAIL</strong>
          </div>

          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', maxHeight: '420px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {auditLogs.map((log, idx) => (
                <div key={idx} style={{ padding: '12px', background: 'var(--bg-panel-alt)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                    <span>⏱️ {log.time}</span>
                    <span>{log.user}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', lineHeight: 1.4 }}>{log.action}</span>
                  <span style={{ fontSize: '10px', color: 'var(--accent-success)', display: 'block', marginTop: '4px', fontFamily: 'monospace' }}>
                    🔐 Protocol: {log.hash} Encrypted
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default UserManagement;
