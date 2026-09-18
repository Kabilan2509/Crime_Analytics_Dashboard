import React, { useState, useMemo } from 'react';
import { Link2, Search, Car, Phone, Landmark, MapPin } from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { maskText } from '../security/securityUtils';

function EvidenceCorrelation() {
  const { isCommandMode } = useSecurity();
  const [query, setQuery] = useState('');

  // Enforce realistic mock relationships
  const relationships = useMemo(() => [
    { id: 1, type: 'phone', value: '+91 98452 10243', label: 'Suspect Communication Link', sourceCase: 'FIR-1002', targetCase: 'FIR-1042', matchScore: 94, reason: 'Identical call logs active during incident timeline.' },
    { id: 2, type: 'vehicle', value: 'KA-03-MJ-4822', label: 'Cross-Jurisdiction Vehicle Spot', sourceCase: 'FIR-1015', targetCase: 'FIR-1089', matchScore: 88, reason: 'Captured on highway CCTV toll nodes within 4 hrs.' },
    { id: 3, type: 'bank', value: 'SBI-7432-8419', label: 'Financial Fraud Trail', sourceCase: 'FIR-1023', targetCase: 'FIR-1102', matchScore: 92, reason: 'Shared mule account identified in portal metadata.' },
    { id: 4, type: 'location', value: 'Hebbal Flyover Junction', label: 'Spatial Proximity Match', sourceCase: 'FIR-1005', targetCase: 'FIR-1056', matchScore: 78, reason: 'Cell tower triangulation overlap detected.' }
  ], []);

  const secureRelationships = useMemo(() => relationships.map(r => {
    if (isCommandMode) return r;
    return {
      ...r,
      value: maskText(r.value, r.type === 'phone' ? 3 : 2, 2),
      sourceCase: maskText(r.sourceCase, 3, 2),
      targetCase: maskText(r.targetCase, 3, 2),
      reason: 'Correlation details restricted. Unlock PII access to inspect the underlying evidence match.',
    };
  }), [relationships, isCommandMode]);

  const filtered = useMemo(() => {
    if (!query) return secureRelationships;
    const q = query.toLowerCase();
    return secureRelationships.filter(r =>
      r.value.toLowerCase().includes(q) ||
      r.label.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q)
    );
  }, [secureRelationships, query]);

  return (
    <div className="page-content animate-fade-in text-inverse">
      <div className="section-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link2 size={18} strokeWidth={1.5} /> Evidence Correlation Engine
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Search header */}
        <article className="card" style={{ padding: '16px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search telephone numbers, vehicle plates, bank trails..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px 10px 40px', borderRadius: '8px',
                background: 'var(--bg-panel-alt)', border: '1px solid var(--border-color)',
                color: 'var(--text-primary)', outline: 'none', fontSize: '14px'
              }}
            />
            <Search size={16} strokeWidth={1.5} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          </div>
        </article>

        {/* Connections List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(r => (
            <div key={r.id} className="card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: 'var(--text-secondary)'
                }}>
                  {r.type === 'phone' && <Phone size={18} strokeWidth={1.5} />}
                  {r.type === 'vehicle' && <Car size={18} strokeWidth={1.5} />}
                  {r.type === 'bank' && <Landmark size={18} strokeWidth={1.5} />}
                  {r.type === 'location' && <MapPin size={18} strokeWidth={1.5} />}
                </div>
                <div>
                  <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{r.value}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{r.label}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>{r.reason}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CASE LINKS</div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{r.sourceCase} ↔ {r.targetCase}</strong>
                </div>
                <span className="badge badge-ai" style={{ fontSize: '10px', padding: '6px 12px' }}>{r.matchScore}% Match</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EvidenceCorrelation;
