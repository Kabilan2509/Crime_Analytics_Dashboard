/**
 * graphUtils.js — Enhanced Criminal Network Graph Builder
 * Builds node-link data from live crime records with real names,
 * degree-weighted sizing, and co-accused relationship edges.
 */

// ─── Node color palette ───────────────────────────────────────────────────────
export const ENTITY = {
  criminal: { color: '#ff4d6d', glow: 'rgba(255,77,109,0.4)',  label: 'Accused / Suspect' },
  case:     { color: '#4fc3f7', glow: 'rgba(79,195,247,0.4)',  label: 'FIR Case'           },
  victim:   { color: '#69f0ae', glow: 'rgba(105,240,174,0.4)', label: 'Victim'             },
  district: { color: '#FFD54F', glow: 'rgba(255,213,79,0.4)',  label: 'District'           },
  station:  { color: '#ce93d8', glow: 'rgba(206,147,216,0.4)', label: 'Police Station'     },
};

export function buildNetworkData(cases, accused, victims, districts, stations) {
  const nodes  = [];
  const edges  = [];
  const nodeSet = new Set();

  // Top 40 cases (heinous first)
  const activeCases = [...(cases || [])]
    .sort((a, b) => (b.isHeinous ? 1 : 0) - (a.isHeinous ? 1 : 0))
    .slice(0, 40);

  const activeCaseIds = new Set(activeCases.map(c => c.CaseMasterID));

  // 1. FIR Case nodes
  activeCases.forEach(c => {
    const nodeId = `case_${c.CaseMasterID}`;
    if (nodeSet.has(nodeId)) return;
    nodes.push({
      id: nodeId, type: 'case',
      label: c.CrimeNo || `FIR-${c.CaseMasterID}`,
      color: ENTITY.case.color, radius: 11, data: c,
      x: 0, y: 0, vx: 0, vy: 0,
    });
    nodeSet.add(nodeId);

    // 2. District node
    const distId = `dist_${c.districtName}`;
    if (c.districtName && !nodeSet.has(distId)) {
      nodes.push({
        id: distId, type: 'district',
        label: c.districtName,
        color: ENTITY.district.color, radius: 15, data: { name: c.districtName },
        x: 0, y: 0, vx: 0, vy: 0,
      });
      nodeSet.add(distId);
    }
    if (c.districtName) edges.push({ source: nodeId, target: distId, type: 'located_in', strength: 0.2 });

    // 3. Station node
    const stId = `station_${c.policeStationName}`;
    if (c.policeStationName && !nodeSet.has(stId)) {
      nodes.push({
        id: stId, type: 'station',
        label: c.policeStationName,
        color: ENTITY.station.color, radius: 13, data: { name: c.policeStationName },
        x: 0, y: 0, vx: 0, vy: 0,
      });
      nodeSet.add(stId);
    }
    if (c.policeStationName) edges.push({ source: nodeId, target: stId, type: 'registered_at', strength: 0.3 });
  });

  // 4. Accused nodes + co-accused edges
  const accusedByCaseId = {};  // caseId → [criminalNodeId]
  (accused || []).forEach((acc, idx) => {
    if (!activeCaseIds.has(acc.CaseMasterID)) return;
    const caseNodeId    = `case_${acc.CaseMasterID}`;
    const criminalId    = `accused_${acc.AccusedID || idx}`;
    const displayName   = acc.AccusedName
      ? acc.AccusedName.trim().split(' ').slice(0, 2).join(' ')
      : `Accused #${acc.AccusedID || idx + 101}`;

    if (!nodeSet.has(criminalId)) {
      nodes.push({
        id: criminalId, type: 'criminal',
        label: displayName,
        color: ENTITY.criminal.color, radius: 9, data: acc,
        x: 0, y: 0, vx: 0, vy: 0,
      });
      nodeSet.add(criminalId);
    }
    edges.push({ source: criminalId, target: caseNodeId, type: 'accused_in', strength: 0.8 });

    // Track accused per case for co-accused edges
    if (!accusedByCaseId[acc.CaseMasterID]) accusedByCaseId[acc.CaseMasterID] = [];
    accusedByCaseId[acc.CaseMasterID].push(criminalId);
  });

  // Co-accused edges (accused who share the same case)
  Object.values(accusedByCaseId).forEach(ids => {
    if (ids.length < 2) return;
    for (let i = 0; i < Math.min(ids.length, 4); i++) {
      for (let j = i + 1; j < Math.min(ids.length, 4); j++) {
        edges.push({ source: ids[i], target: ids[j], type: 'co_accused', strength: 0.4 });
      }
    }
  });

  // 5. Victim nodes
  (victims || []).forEach((vic, idx) => {
    if (!activeCaseIds.has(vic.CaseMasterID)) return;
    const caseNodeId = `case_${vic.CaseMasterID}`;
    const victimId   = `victim_${vic.VictimID || idx}`;
    const displayName = vic.VictimName
      ? vic.VictimName.trim().split(' ').slice(0, 2).join(' ')
      : `Victim #${vic.VictimID || idx + 201}`;

    if (!nodeSet.has(victimId)) {
      nodes.push({
        id: victimId, type: 'victim',
        label: displayName,
        color: ENTITY.victim.color, radius: 8, data: vic,
        x: 0, y: 0, vx: 0, vy: 0,
      });
      nodeSet.add(victimId);
    }
    edges.push({ source: victimId, target: caseNodeId, type: 'victim_of', strength: 0.5 });
  });

  // Position nodes in a force-friendly circle
  const W = 700, H = 460;
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    n.x = W / 2 + Math.cos(angle) * (100 + Math.random() * 80);
    n.y = H / 2 + Math.sin(angle) * (100 + Math.random() * 80);
  });

  return { nodes, edges };
}

export function getNodeStats(nodeId, nodes, edges) {
  const nodeMap   = new Map(nodes.map(n => [n.id, n]));
  const connected = [];
  edges.forEach(e => {
    if (e.source === nodeId) connected.push({ id: e.target, type: e.type });
    if (e.target === nodeId) connected.push({ id: e.source, type: e.type });
  });
  return {
    totalConnections: connected.length,
    connected: connected.map(({ id, type }) => ({
      id, type,
      node: nodeMap.get(id),
    })),
  };
}
