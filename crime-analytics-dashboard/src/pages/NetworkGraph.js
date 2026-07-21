import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MdHub, MdSearch, MdZoomIn, MdZoomOut, MdCenterFocusStrong
} from 'react-icons/md';
import { buildNetworkData, getNodeStats } from '../features/network/graphUtils';
import { caseViews } from '../data/schemaSelectors';
import { accused, victims, districts, units } from '../data/sampleData';

function NetworkGraph() {
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const canvasRef = useRef(null);

  // Initialize graph data once
  const rawGraphData = useMemo(() => {
    return buildNetworkData(caseViews, accused, victims, districts, units);
  }, []);

  const [graph] = useState(rawGraphData);

  // Filter nodes based on selected filter type
  const filteredNodes = useMemo(() => {
    if (filterType === 'all') return graph.nodes;
    return graph.nodes.filter(n => n.type === filterType);
  }, [graph.nodes, filterType]);

  const filteredEdges = useMemo(() => {
    // Keep edges only if both source and target nodes exist in filtered nodes
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return graph.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [filteredNodes, graph.edges]);

  // Selected node connections stats
  const selectedNodeDetails = useMemo(() => {
    if (!selectedNode) return null;
    return getNodeStats(selectedNode.id, graph.nodes, graph.edges);
  }, [selectedNode, graph]);

  // Canvas zoom/pan states
  const transformRef = useRef({ x: 0, y: 0, zoom: 1 });
  const dragStartNodeRef = useRef(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  // Force-directed simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const runSimulation = () => {
      // 1. Calculate force interactions (Hooke's and Coulomb's laws simple approximation)
      const nodes = filteredNodes;
      const edges = filteredEdges;

      // Coulomb repulsion forces between all nodes
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 280) {
            const force = (200 / (dist * dist));
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // Hooke's spring forces on connections
      edges.forEach(edge => {
        const s = nodes.find(n => n.id === edge.source);
        const t = nodes.find(n => n.id === edge.target);
        if (s && t) {
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desiredLen = 120;
          const springK = 0.008 * edge.strength;
          const force = (dist - desiredLen) * springK;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          s.vx += fx;
          s.vy += fy;
          t.vx -= fx;
          t.vy -= fy;
        }
      });

      // Central gravity force & apply velocity with friction damping
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      nodes.forEach(n => {
        if (n === dragStartNodeRef.current) return; // don't push dragged node

        const dx = cx - n.x;
        const dy = cy - n.y;
        n.vx += dx * 0.0008;
        n.vy += dy * 0.0008;

        n.x += n.vx;
        n.y += n.vy;

        // Dampen velocity
        n.vx *= 0.82;
        n.vy *= 0.82;
      });

      // 2. Draw canvas frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      
      // Apply pan/zoom transformations
      ctx.translate(transformRef.current.x, transformRef.current.y);
      ctx.scale(transformRef.current.zoom, transformRef.current.zoom);

      // Draw Edges (Links)
      ctx.lineWidth = 1;
      edges.forEach(e => {
        const s = nodes.find(n => n.id === e.source);
        const t = nodes.find(n => n.id === e.target);
        if (s && t) {
          const isHighlight = selectedNode && (selectedNode.id === s.id || selectedNode.id === t.id);
          ctx.strokeStyle = isHighlight ? 'rgba(30, 144, 255, 0.6)' : 'rgba(173, 193, 214, 0.12)';
          ctx.lineWidth = isHighlight ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.stroke();
        }
      });

      // Draw Nodes
      nodes.forEach(n => {
        const isSelected = selectedNode && selectedNode.id === n.id;
        const isSearchHighlight = search && (
          n.label.toLowerCase().includes(search.toLowerCase()) ||
          (n.type === 'case' && n.data?.BriefFacts?.toLowerCase().includes(search.toLowerCase())) ||
          (n.type === 'case' && n.data?.officerName?.toLowerCase().includes(search.toLowerCase()))
        );

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + (isSelected ? 2 : 0), 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();

        // Node outline/glow
        if (isSelected || isSearchHighlight) {
          ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(30, 144, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw subtle outer highlight ring
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(30,144,255,0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Draw Labels
        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(248, 251, 255, 0.7)';
        ctx.font = isSelected ? 'bold 11px sans-serif' : '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y - n.radius - 6);
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(runSimulation);
    };

    runSimulation();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [filteredNodes, filteredEdges, selectedNode, search]);

  // Handle click, drag & pan inside canvas
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert screen coordinates to simulation space coordinates (invert translate + scale)
    const t = transformRef.current;
    const simX = (clickX - t.x) / t.zoom;
    const simY = (clickY - t.y) / t.zoom;

    // Check if clicked a node
    const clickedNode = filteredNodes.find(n => {
      const dx = n.x - simX;
      const dy = n.y - simY;
      return (dx * dx + dy * dy) < (n.radius + 5) * (n.radius + 5);
    });

    if (clickedNode) {
      dragStartNodeRef.current = clickedNode;
      setSelectedNode(clickedNode);
    } else {
      // Pan start
      dragStartPosRef.current = { x: clickX - t.x, y: clickY - t.y };
      dragStartNodeRef.current = null;
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currX = e.clientX - rect.left;
    const currY = e.clientY - rect.top;

    if (dragStartNodeRef.current) {
      // Move dragged node in simulation space
      const t = transformRef.current;
      dragStartNodeRef.current.x = (currX - t.x) / t.zoom;
      dragStartNodeRef.current.y = (currY - t.y) / t.zoom;
      dragStartNodeRef.current.vx = 0;
      dragStartNodeRef.current.vy = 0;
    } else if (e.buttons === 1) {
      // Panning active
      transformRef.current = {
        ...transformRef.current,
        x: currX - dragStartPosRef.current.x,
        y: currY - dragStartPosRef.current.y
      };
    }
  };

  const handleMouseUp = () => {
    dragStartNodeRef.current = null;
  };

  const handleZoom = (factor) => {
    transformRef.current = {
      ...transformRef.current,
      zoom: Math.max(0.3, Math.min(transformRef.current.zoom * factor, 3))
    };
  };

  const handleRecenter = () => {
    transformRef.current = { x: 0, y: 0, zoom: 1 };
  };

  return (
    <div className="page-content animate-fade-in text-inverse">
      <div className="section-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MdHub size={18} /> Criminal Intelligence Network Graph
      </div>

      <div className="network-page">
        {/* Force canvas */}
        <div className="network-canvas" style={{ minHeight: '400px', position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={780}
            height={480}
            style={{ width: '100%', height: '100%', cursor: 'grab', background: '#09121d' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
          {/* Floating Legend */}
          <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(20, 33, 50, 0.85)', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10, fontSize: '11px' }}>
            <strong style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>GRAPH ENTITY LEGEND</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4d4d' }} /> <span>Accused / Suspects</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1e90ff' }} /> <span>FIR Cases</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00e676' }} /> <span>Victims</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffaa00' }} /> <span>Districts</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9b5de5' }} /> <span>Police Stations</span></div>
          </div>

          {/* Floating Controls */}
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', gap: '8px', zIndex: 10 }}>
            <button className="template-btn" onClick={() => handleZoom(1.2)} style={{ padding: '8px' }} aria-label="Zoom in"><MdZoomIn size={20} /></button>
            <button className="template-btn" onClick={() => handleZoom(0.8)} style={{ padding: '8px' }} aria-label="Zoom out"><MdZoomOut size={20} /></button>
            <button className="template-btn" onClick={handleRecenter} style={{ padding: '8px' }} aria-label="Recenter"><MdCenterFocusStrong size={20} /></button>
          </div>
        </div>

        {/* Control side section */}
        <div className="network-controls">
          {/* Node Search & Filter */}
          <article className="card" style={{ padding: '16px' }}>
            <div className="card-header" style={{ marginBottom: '12px', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>FILTER ENTITIES</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search network nodes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px',
                    background: 'var(--bg-panel-alt)', border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)', outline: 'none'
                  }}
                />
                <MdSearch size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              </div>

              {/* Type toggle */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-panel-alt)',
                  color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none'
                }}
              >
                <option value="all">Show All Types</option>
                <option value="criminal">Accused / Suspects</option>
                <option value="case">FIR Cases</option>
                <option value="victim">Victims</option>
                <option value="district">Districts</option>
                <option value="station">Police Stations</option>
              </select>
            </div>
          </article>

          {/* Node Details */}
          {selectedNode ? (
            <div className="node-detail-panel card">
              <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>
                <span className="badge" style={{ background: selectedNode.color, color: '#fff', fontSize: '9px', textTransform: 'uppercase' }}>
                  {selectedNode.type}
                </span>
                <h4 style={{ margin: '6px 0 0', fontSize: '15px', color: 'var(--text-primary)' }}>{selectedNode.label}</h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>DATABASE REF ID</span>
                  <strong>{selectedNode.id}</strong>
                </div>

                {selectedNode.type === 'case' && (
                  <>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>BRIEF FACTS Narrative</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{selectedNode.data.BriefFacts || 'N/A'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>STATUS</span>
                      <span className="badge badge-warning">{selectedNode.data.statusName}</span>
                    </div>
                  </>
                )}

                {selectedNodeDetails && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', marginBottom: '4px' }}>DIRECT CONNECTIONS ({selectedNodeDetails.totalConnections})</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                      {selectedNodeDetails.connectionLabels.map((lbl, idx) => (
                        <div key={idx} style={{ padding: '6px', background: 'var(--bg-panel-alt)', borderRadius: '6px', fontSize: '12px' }}>
                          {lbl}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Select a node in the graph to view intelligence connections and database facts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NetworkGraph;
