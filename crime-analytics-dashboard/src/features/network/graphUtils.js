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

  const indexMasterRows = (rows, keys) => {
    const index = new Map();
    (rows || []).forEach(row => {
      keys.forEach(key => {
        const value = row?.[key];
        if (value !== undefined && value !== null && value !== '') index.set(String(value), row);
      });
    });
    return index;
  };
  const districtLookup = indexMasterRows(districts, ['ROWID', 'DistrictID', 'SourceDistrictID']);
  const stationLookup = indexMasterRows(stations, ['ROWID', 'UnitID', 'PoliceStationID', 'SourceUnitID']);
  const usableName = value => value && String(value).trim().toLowerCase() !== 'unknown';

  // The intelligence graph is a complete operational index. Never sample FIRs.
  const activeCases = [...(cases || [])]
    .sort((a, b) => (b.isHeinous ? 1 : 0) - (a.isHeinous ? 1 : 0));

  const districtNodeId = row => `dist_${row?.ROWID ?? row?.DistrictID ?? row?.SourceDistrictID}`;
  const stationNodeId = row => `station_${row?.ROWID ?? row?.UnitID ?? row?.PoliceStationID ?? row?.SourceUnitID}`;

  // Add every master location first, including locations with no FIR in the current dataset.
  (districts || []).forEach((district, index) => {
    const name = district?.DistrictName || district?.Name;
    const id = districtNodeId(district);
    if (!name || id.endsWith('undefined') || nodeSet.has(id)) return;
    nodes.push({ id, type: 'district', label: String(name), color: ENTITY.district.color, radius: 15, data: district, x: 0, y: 0, vx: 0, vy: 0, order: index });
    nodeSet.add(id);
  });
  (stations || []).forEach((station, index) => {
    const name = station?.UnitName || station?.PoliceStationName || station?.Name;
    const id = stationNodeId(station);
    if (!name || id.endsWith('undefined') || nodeSet.has(id)) return;
    nodes.push({ id, type: 'station', label: String(name), color: ENTITY.station.color, radius: 13, data: station, x: 0, y: 0, vx: 0, vy: 0, order: index });
    nodeSet.add(id);
    const district = districtLookup.get(String(station.DistrictID ?? station.SourceDistrictID));
    if (district && nodeSet.has(districtNodeId(district))) {
      edges.push({ source: id, target: districtNodeId(district), type: 'station_in_district', strength: 0.35 });
    }
  });

  // Catalyst child tables reference CaseMaster.ROWID, while the normalized case
  // view can expose the logical CaseMasterID. Resolve both forms to one graph node.
  const caseKeyToId = new Map();
  activeCases.forEach(c => {
    const canonicalId = String(c.ROWID || c.CaseMasterID);
    [c.ROWID, c.CaseMasterID, c.SourceCaseMasterID]
      .filter(value => value !== undefined && value !== null)
      .forEach(value => caseKeyToId.set(String(value), canonicalId));
  });

  const relationRows = (globalRows, property, idFields) => {
    const rows = [...(globalRows || []), ...activeCases.flatMap(c => c[property] || [])];
    const seen = new Set();
    return rows.filter((row, index) => {
      const identity = idFields.map(field => row[field]).find(value => value !== undefined && value !== null);
      const key = identity == null ? `${property}_${index}` : String(identity);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // 1. FIR Case nodes
  activeCases.forEach(c => {
    const caseId = String(c.ROWID || c.CaseMasterID);
    const nodeId = `case_${caseId}`;
    if (nodeSet.has(nodeId)) return;
    nodes.push({
      id: nodeId, type: 'case',
      label: c.CrimeNo || `FIR-${c.CaseMasterID}`,
      color: ENTITY.case.color, radius: 11, data: c,
      x: 0, y: 0, vx: 0, vy: 0,
    });
    nodeSet.add(nodeId);

    const stationKey = c.PoliceStationID ?? c.UnitID ?? c.unit?.UnitID ?? c.unit?.ROWID;
    const station = c.unit || stationLookup.get(String(stationKey)) || null;
    const stationName = usableName(c.policeStationName)
      ? String(c.policeStationName)
      : station?.UnitName || station?.PoliceStationName || null;
    const districtKey = c.DistrictID ?? c.districtID ?? c.district?.DistrictID
      ?? station?.DistrictID ?? station?.SourceDistrictID;
    const district = c.district || districtLookup.get(String(districtKey)) || null;
    const districtName = usableName(c.districtName)
      ? String(c.districtName)
      : district?.DistrictName || district?.Name || null;

    // 2. District node
    const distId = district ? districtNodeId(district) : `dist_${districtKey ?? districtName}`;
    if (districtName && !nodeSet.has(distId)) {
      nodes.push({
        id: distId, type: 'district',
        label: districtName,
        color: ENTITY.district.color, radius: 15, data: district || { name: districtName },
        x: 0, y: 0, vx: 0, vy: 0,
      });
      nodeSet.add(distId);
    }
    if (districtName) edges.push({ source: nodeId, target: distId, type: 'located_in', strength: 0.2 });

    // 3. Station node
    const stId = station ? stationNodeId(station) : `station_${stationKey ?? stationName}`;
    if (stationName && !nodeSet.has(stId)) {
      nodes.push({
        id: stId, type: 'station',
        label: stationName,
        color: ENTITY.station.color, radius: 13, data: station || { name: stationName },
        x: 0, y: 0, vx: 0, vy: 0,
      });
      nodeSet.add(stId);
    }
    if (stationName) edges.push({ source: nodeId, target: stId, type: 'registered_at', strength: 0.3 });
  });

  // 4. Accused nodes + co-accused edges
  const accusedByCaseId = {};  // caseId → [criminalNodeId]
  relationRows(accused, 'accused', ['ROWID', 'AccusedMasterID', 'AccusedID']).forEach((acc, idx) => {
    const resolvedCaseId = caseKeyToId.get(String(acc.CaseMasterID ?? acc.CaseID));
    if (!resolvedCaseId) return;
    const caseNodeId = `case_${resolvedCaseId}`;
    const accusedId = acc.ROWID || acc.AccusedMasterID || acc.AccusedID || idx;
    const criminalId = `accused_${accusedId}`;
    const fullName = acc.AccusedName || acc.Name || acc.FullName || acc.FirstName;
    const displayName = fullName
      ? String(fullName).trim().split(/\s+/).slice(0, 2).join(' ')
      : `Accused #${accusedId || idx + 101}`;

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
    if (!accusedByCaseId[resolvedCaseId]) accusedByCaseId[resolvedCaseId] = [];
    accusedByCaseId[resolvedCaseId].push(criminalId);
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
  relationRows(victims, 'victims', ['ROWID', 'VictimID']).forEach((vic, idx) => {
    const resolvedCaseId = caseKeyToId.get(String(vic.CaseMasterID ?? vic.CaseID));
    if (!resolvedCaseId) return;
    const caseNodeId = `case_${resolvedCaseId}`;
    const victimRecordId = vic.ROWID || vic.VictimID || idx;
    const victimId = `victim_${victimRecordId}`;
    const fullName = vic.VictimName || vic.Name || vic.FullName || vic.FirstName;
    const displayName = fullName
      ? String(fullName).trim().split(/\s+/).slice(0, 2).join(' ')
      : `Victim #${victimRecordId || idx + 201}`;

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

  // 6. Pattern Match (MO) Edges between Cases
  // Link cases that have the exact same majorHeadName AND policeStationName AND occurred within 7 days.
  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  for (let i = 0; i < activeCases.length; i++) {
    for (let j = i + 1; j < activeCases.length; j++) {
      const c1 = activeCases[i];
      const c2 = activeCases[j];
      
      // Skip if missing core pattern fields
      if (!c1.majorHeadName || c1.majorHeadName !== c2.majorHeadName) continue;
      
      const st1 = c1.policeStationName || c1.unit?.UnitName || c1.unit?.PoliceStationName;
      const st2 = c2.policeStationName || c2.unit?.UnitName || c2.unit?.PoliceStationName;
      if (!st1 || st1 !== st2) continue;

      // Check temporal proximity
      if (c1.registeredDateObj && c2.registeredDateObj) {
        const diffDays = Math.abs(c1.registeredDateObj - c2.registeredDateObj) / DAY_IN_MS;
        if (diffDays <= 7) {
          const id1 = `case_${c1.ROWID || c1.CaseMasterID}`;
          const id2 = `case_${c2.ROWID || c2.CaseMasterID}`;
          if (nodeSet.has(id1) && nodeSet.has(id2)) {
            edges.push({ source: id1, target: id2, type: 'pattern_match', strength: 0.1 });
          }
        }
      }
    }
  }

  // Fast Organic Force-Directed Layout
  // Runs synchronously for 150 iterations so it instantly renders in a clustered, organic structure.
  const W = 1000, H = 800;
  nodes.forEach((n, i) => {
    const angle = i * Math.PI * 0.1;
    n.x = W / 2 + Math.cos(angle) * (i * 0.5);
    n.y = H / 2 + Math.sin(angle) * (i * 0.5);
    n.vx = 0; n.vy = 0;
  });

  const iterations = 150;
  const k = 60; // spring length
  const repulsion = 5000;
  const nm = new Map(nodes.map((n, i) => [n.id, i]));
  
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distSq = dx * dx + dy * dy + 1;
        if (distSq < 80000) { 
          const f = repulsion / distSq;
          nodes[i].vx += dx * f; nodes[i].vy += dy * f;
          nodes[j].vx -= dx * f; nodes[j].vy -= dy * f;
        }
      }
    }
    
    for (const e of edges) {
      const i1 = nm.get(e.source);
      const i2 = nm.get(e.target);
      if (i1 !== undefined && i2 !== undefined) {
        const n1 = nodes[i1], n2 = nodes[i2];
        const dx = n2.x - n1.x, dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;
        const f = (dist - k) * (e.strength || 0.5) * 0.05;
        n1.vx += (dx / dist) * f; n1.vy += (dy / dist) * f;
        n2.vx -= (dx / dist) * f; n2.vy -= (dy / dist) * f;
      }
    }
    
    for (const n of nodes) {
      n.vx += (W / 2 - n.x) * 0.015; // Gravity
      n.vy += (H / 2 - n.y) * 0.015;
      n.vx *= 0.65; // Damping
      n.vy *= 0.65;
      n.x += n.vx; n.y += n.vy;
    }
  }

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
