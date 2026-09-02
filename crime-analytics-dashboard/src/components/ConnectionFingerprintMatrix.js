import React, { useMemo, useState } from 'react';

const keyFor = (a, b) => [a, b].sort().join('::');

// A forensic, pair-first alternative to a node graph. Every cell explains a relationship.
export default function ConnectionFingerprintMatrix({ nodes, edges, onSelect }) {
  const [selectedPair, setSelectedPair] = useState(null);
  const matrix = useMemo(() => {
    const people = nodes.filter(node => node.type === 'criminal');
    const cases = new Map(nodes.filter(node => node.type === 'case').map(node => [node.id, node]));
    const peopleByCase = new Map();
    edges.forEach(edge => {
      if (cases.has(edge.target) && people.some(person => person.id === edge.source)) {
        if (!peopleByCase.has(edge.target)) peopleByCase.set(edge.target, []);
        peopleByCase.get(edge.target).push(edge.source);
      }
      if (cases.has(edge.source) && people.some(person => person.id === edge.target)) {
        if (!peopleByCase.has(edge.source)) peopleByCase.set(edge.source, []);
        peopleByCase.get(edge.source).push(edge.target);
      }
    });
    const links = new Map();
    peopleByCase.forEach((ids, caseId) => {
      [...new Set(ids)].forEach((a, index, group) => group.slice(index + 1).forEach(b => {
        const key = keyFor(a, b);
        if (!links.has(key)) links.set(key, []);
        links.get(key).push(cases.get(caseId));
      }));
    });
    const score = new Map(people.map(person => [person.id, 0]));
    links.forEach((records, key) => key.split('::').forEach(id => score.set(id, (score.get(id) || 0) + records.length)));
    const displayedPeople = [...people].sort((a, b) => (score.get(b.id) || 0) - (score.get(a.id) || 0)).slice(0, 16);
    return { people: displayedPeople, links, score };
  }, [nodes, edges]);

  const maxScore = Math.max(1, ...Array.from(matrix.links.values()).map(records => records.length));
  const activeEvidence = selectedPair ? matrix.links.get(selectedPair) || [] : [];
  const activePeople = selectedPair?.split('::').map(id => matrix.people.find(person => person.id === id)).filter(Boolean) || [];

  return (
    <div className="fingerprint-matrix">
      <style>{`
        .fingerprint-matrix { min-height:560px; padding:18px; overflow:auto; background:radial-gradient(circle at 20% 0,#183756,#081220 45%,#050b14); color:#eaf4ff; }
        .fingerprint-head { display:flex; align-items:start; justify-content:space-between; gap:16px; margin-bottom:16px; }
        .fingerprint-title { font:700 11px system-ui,sans-serif; letter-spacing:.13em; color:#fff; }
        .fingerprint-sub { margin-top:5px; font:11px/1.45 system-ui,sans-serif; color:#a8c1d8; }
        .fingerprint-key { font:10px/1.5 system-ui,sans-serif; color:#aac8df; text-align:right; }
        .fp-grid { display:grid; grid-template-columns:150px repeat(var(--count), minmax(34px,1fr)); min-width:700px; border:1px solid rgba(137,209,255,.18); background:rgba(4,13,24,.62); }
        .fp-corner,.fp-col,.fp-row { background:rgba(19,46,70,.58); border-right:1px solid rgba(137,209,255,.1); border-bottom:1px solid rgba(137,209,255,.1); }
        .fp-corner { padding:11px; font:700 9px system-ui,sans-serif; letter-spacing:.1em; color:#a8c9e2; }
        .fp-col { height:112px; display:flex; align-items:end; justify-content:center; padding-bottom:7px; }
        .fp-col span { display:block; max-width:98px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transform:rotate(-55deg); transform-origin:bottom center; font:600 10px system-ui,sans-serif; color:#cae3f7; }
        .fp-row { min-height:35px; display:flex; align-items:center; gap:8px; padding:0 10px; font:600 11px system-ui,sans-serif; color:#dceeff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .fp-score { display:inline-grid; place-items:center; width:18px; height:18px; flex:0 0 auto; border-radius:50%; background:#155273; color:#dff5ff; font-size:9px; }
        .fp-cell { min-height:35px; border:0; border-right:1px solid rgba(137,209,255,.08); border-bottom:1px solid rgba(137,209,255,.08); cursor:pointer; background:transparent; position:relative; }
        .fp-cell:hover { outline:2px solid #bdefff; outline-offset:-2px; z-index:2; }
        .fp-cell.is-diagonal { cursor:default; background:rgba(255,255,255,.025); }
        .fp-mark { position:absolute; inset:6px; border-radius:4px; background:repeating-linear-gradient(135deg,rgba(255,255,255,.9) 0 2px,transparent 2px 5px); box-shadow:0 0 12px currentColor; }
        .fp-empty { color:rgba(190,221,245,.18); font-size:11px; }
        .fp-receipt { margin-top:16px; max-width:580px; padding:14px; border-radius:10px; border:1px solid rgba(104,222,160,.32); background:rgba(10,31,42,.92); box-shadow:0 12px 35px rgba(0,0,0,.24); }
        .fp-receipt h3 { margin:0 0 5px; color:#fff; font-size:14px; }
        .fp-receipt p { margin:0 0 10px; color:#b6cfe1; font-size:11px; }
        .fp-tag { display:inline-block; margin:3px 5px 0 0; padding:4px 7px; border-radius:5px; border:1px solid rgba(79,195,247,.35); background:rgba(79,195,247,.1); color:#cbeeff; font-size:10px; cursor:pointer; }
      `}</style>
      <div className="fingerprint-head">
        <div><div className="fingerprint-title">CONNECTION FINGERPRINT MATRIX</div><div className="fingerprint-sub">Each tile is a pairwise relationship. Pattern intensity reveals how much shared case evidence connects two accused.</div></div>
        <div className="fingerprint-key">BRIDGE SCORE → total shared-case links<br />Select a tile to inspect the proof.</div>
      </div>
      <div className="fp-grid" style={{ '--count': matrix.people.length }}>
        <div className="fp-corner">ACCUSED /<br />BRIDGE SCORE</div>
        {matrix.people.map(person => <div className="fp-col" key={`column-${person.id}`}><span>{person.label}</span></div>)}
        {matrix.people.map(row => <React.Fragment key={row.id}>
          <div className="fp-row"><span className="fp-score">{matrix.score.get(row.id) || 0}</span>{row.label}</div>
          {matrix.people.map(column => {
            const same = row.id === column.id;
            const pairKey = same ? null : keyFor(row.id, column.id);
            const evidence = pairKey ? matrix.links.get(pairKey) : null;
            const strength = evidence?.length || 0;
            const opacity = strength ? .25 + (strength / maxScore) * .75 : 0;
            return <button key={column.id} type="button" className={`fp-cell ${same ? 'is-diagonal' : ''}`} aria-label={same ? `${row.label}, same person` : `${row.label} and ${column.label}: ${strength} shared cases`} onClick={() => evidence && setSelectedPair(pairKey)}>
              {strength ? <span className="fp-mark" style={{ color: `rgba(104,230,160,${opacity})`, backgroundColor: `rgba(104,230,160,${opacity})` }} /> : !same && <span className="fp-empty">·</span>}
            </button>;
          })}
        </React.Fragment>)}
      </div>
      {selectedPair && <div className="fp-receipt"><h3>{activePeople.map(person => person.label).join('  ↔  ')}</h3><p>Shared evidence receipt: {activeEvidence.length} FIR case{activeEvidence.length !== 1 ? 's' : ''} tie these accused together.</p>{activeEvidence.map(record => <button type="button" className="fp-tag" key={record.id} onClick={() => onSelect(record)}>FIR {record.label}</button>)}</div>}
    </div>
  );
}
