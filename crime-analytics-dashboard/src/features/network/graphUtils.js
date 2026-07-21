/**
 * graphUtils.js
 * Generates criminal network node-link relations for Canvas render.
 */

export function buildNetworkData(cases, accused, victims, districts, stations) {
  const nodes = [];
  const edges = [];
  const nodeSet = new Set();

  // Pick top 15 cases (prioritize heinous) for readable rendering
  const activeCases = cases
    .sort((a, b) => (b.isHeinous ? 1 : 0) - (a.isHeinous ? 1 : 0))
    .slice(0, 15);

  // 1. Create Case nodes
  activeCases.forEach(c => {
    const nodeId = `case_${c.CaseMasterID}`;
    if (!nodeSet.has(nodeId)) {
      nodes.push({
        id: nodeId,
        type: 'case',
        label: c.CrimeNo || `FIR-${c.CaseMasterID}`,
        color: '#1e90ff',
        radius: 12,
        data: c
      });
      nodeSet.add(nodeId);
    }

    // 2. Create District nodes (if case has district)
    const distId = `dist_${c.districtName}`;
    if (c.districtName && !nodeSet.has(distId)) {
      nodes.push({
        id: distId,
        type: 'district',
        label: c.districtName,
        color: '#ffaa00',
        radius: 16,
        data: { name: c.districtName }
      });
      nodeSet.add(distId);
    }
    if (c.districtName) {
      edges.push({ source: nodeId, target: distId, type: 'located_in', strength: 0.2 });
    }

    // 3. Create Station nodes
    const stationId = `station_${c.policeStationName}`;
    if (c.policeStationName && !nodeSet.has(stationId)) {
      nodes.push({
        id: stationId,
        type: 'station',
        label: c.policeStationName,
        color: '#9b5de5',
        radius: 14,
        data: { name: c.policeStationName }
      });
      nodeSet.add(stationId);
    }
    if (c.policeStationName) {
      edges.push({ source: nodeId, target: stationId, type: 'registered_at', strength: 0.3 });
    }
  });

  // 4. Create Accused (Criminal) nodes linked to active cases
  accused.forEach((acc, idx) => {
    const caseId = `case_${acc.CaseMasterID}`;
    if (nodeSet.has(caseId)) {
      const criminalId = `accused_${acc.AccusedID || idx}`;
      if (!nodeSet.has(criminalId)) {
        nodes.push({
          id: criminalId,
          type: 'criminal',
          label: `Suspect #${acc.AccusedID || idx + 101} (Age: ${acc.Age || 34})`,
          color: '#ff4d4d',
          radius: 10,
          data: acc
        });
        nodeSet.add(criminalId);
      }
      edges.push({ source: criminalId, target: caseId, type: 'accused_in', strength: 0.8 });
    }
  });

  // 5. Create Victim nodes linked to active cases
  victims.forEach((vic, idx) => {
    const caseId = `case_${vic.CaseMasterID}`;
    if (nodeSet.has(caseId)) {
      const victimId = `victim_${vic.VictimID || idx}`;
      if (!nodeSet.has(victimId)) {
        nodes.push({
          id: victimId,
          type: 'victim',
          label: `Victim #${vic.VictimID || idx + 201} (Age: ${vic.Age || 28})`,
          color: '#00e676',
          radius: 8,
          data: vic
        });
        nodeSet.add(victimId);
      }
      edges.push({ source: victimId, target: caseId, type: 'victim_of', strength: 0.5 });
    }
  });

  // Position nodes in a circle initially to avoid overlay overlap
  const width = 600;
  const height = 400;
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    n.x = width / 2 + Math.cos(angle) * 150;
    n.y = height / 2 + Math.sin(angle) * 150;
    n.vx = 0;
    n.vy = 0;
  });

  return { nodes, edges };
}

export function searchNodes(nodes, query) {
  const q = (query || '').toLowerCase();
  return nodes.filter(n => n.label.toLowerCase().includes(q));
}

export function getConnectedNodes(nodeId, edges) {
  const connected = new Set();
  edges.forEach(e => {
    if (e.source === nodeId) connected.add(e.target);
    if (e.target === nodeId) connected.add(e.source);
  });
  return Array.from(connected);
}
export function getNodeStats(nodeId, nodes, edges) {
  const connected = getConnectedNodes(nodeId, edges);
  return {
    totalConnections: connected.length,
    connectionLabels: connected.map(id => {
      const found = nodes.find(n => n.id === id);
      return found ? found.label : id;
    })
  };
}
