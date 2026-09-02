const fs = require('fs');
/**
 * graphUtils.js — Enhanced Criminal Network Graph Builder
 * Builds node-link data from live crime records with real names,
 * degree-weighted sizing, and co-accused relationship edges.
 */

// ─── Node color palette ───────────────────────────────────────────────────────
const ENTITY = {
  criminal: { color: '#ff4d6d', glow: 'rgba(255,77,109,0.4)',  label: 'Accused / Suspect' },
  case:     { color: '#4fc3f7', glow: 'rgba(79,195,247,0.4)',  label: 'FIR Case'           },
  victim:   { color: '#69f0ae', glow: 'rgba(105,240,174,0.4)', label: 'Victim'             },
  district: { color: '#FFD54F', glow: 'rgba(255,213,79,0.4)',  label: 'District'           },
  station:  { color: '#ce93d8', glow: 'rgba(206,147,216,0.4)', label: 'Police Station'     },
};

function buildNetworkData(cases, accused, victims, districts, stations) {
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
  const casesByAccusedId = {}; // criminalNodeId → [caseNodeId]
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
    if (!casesByAccusedId[criminalId]) casesByAccusedId[criminalId] = [];
    casesByAccusedId[criminalId].push(caseNodeId);
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

  // 6. Pattern matches are indexed, not pairwise compared.  This is critical
  // when the production data store grows beyond a prototype-sized result set.
  const patternBuckets = new Map();
  activeCases.forEach(c => {
    const station = c.policeStationName || c.unit?.UnitName || c.unit?.PoliceStationName;
    if (!c.majorHeadName || !station) return;
    const key = `${c.majorHeadName}::${station}`;
    const bucket = patternBuckets.get(key) || [];
    // Keep only a small recent candidate window; broad similarity belongs in a
    // server-side graph query, not in a browser canvas.
    bucket.slice(-12).forEach(other => {
      const a = new Date(c.registeredDateObj || c.RegisteredDate);
      const b = new Date(other.registeredDateObj || other.RegisteredDate);
      if (!Number.isNaN(a.valueOf()) && !Number.isNaN(b.valueOf()) && Math.abs(a - b) <= 7 * 86400000) {
        edges.push({ source: `case_${c.ROWID || c.CaseMasterID}`, target: `case_${other.ROWID || other.CaseMasterID}`, type: 'pattern_match', strength: 0.1 });
      }
    });
    bucket.push(c);
    patternBuckets.set(key, bucket);
  });

  // Repeat accused are high-confidence FIR-to-FIR routes. They are shown
  // directly as a pattern link as well as through the person record.
  Object.entries(casesByAccusedId).forEach(([criminalId, linkedCases]) => {
    const uniqueCases = [...new Set(linkedCases)];
    for (let i = 0; i < Math.min(uniqueCases.length, 10); i++) {
      for (let j = i + 1; j < Math.min(uniqueCases.length, 10); j++) {
        edges.push({ source: uniqueCases[i], target: uniqueCases[j], type: 'pattern_match', strength: 0.95, reason: `Shared accused: ${criminalId}` });
      }
    }
  });

  // Deterministic investigation lanes: geography → FIR → people.  Unlike a
  // force-directed graph, this never becomes a radial/rangoli shape and is
  // stable between renders, screenshots and analyst hand-offs.
  const laneX = { district: 120, station: 370, case: 700, criminal: 1040, victim: 1340 };
  const degree = new Map(nodes.map(n => [n.id, 0]));
  edges.forEach(e => { degree.set(e.source, (degree.get(e.source) || 0) + 1); degree.set(e.target, (degree.get(e.target) || 0) + 1); });
  Object.keys(laneX).forEach(type => {
    const laneNodes = nodes.filter(n => n.type === type)
      .sort((a, b) => (degree.get(b.id) - degree.get(a.id)) || a.label.localeCompare(b.label));
    laneNodes.forEach((node, index) => {
      node.x = laneX[type];
      node.y = 110 + index * 86;
      node.vx = 0;
      node.vy = 0;
      node.order = index;
    });
  });

  return { nodes, edges };
}

function getNodeStats(nodeId, nodes, edges) {
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

const data = JSON.parse(fs.readFileSync('testData.json', 'utf8')); const cases = data.CaseMaster.filter(c => c.ROWID === '56064000000177002'); const rawGraph = buildNetworkData(cases, data.Accused, data.Victim, data.District, data.Unit); let nodes = rawGraph.nodes; const MAX_CASES = 15; const allCases = nodes.filter(n => n.type === 'case').sort((a,b)=>0); const topCaseIds = new Set(allCases.slice(0, MAX_CASES).map(n => n.id)); const validIds = new Set(topCaseIds); rawGraph.edges.forEach(e => { if (topCaseIds.has(e.source)) validIds.add(e.target); if (topCaseIds.has(e.target)) validIds.add(e.source); }); nodes = nodes.filter(n => validIds.has(n.id)); console.log('Criminals before:', rawGraph.nodes.filter(n=>n.type==='criminal').length); console.log('Criminals after:', nodes.filter(n=>n.type==='criminal').length);