import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MdHub, MdSearch, MdZoomIn, MdZoomOut, MdCenterFocusStrong, MdPushPin, MdClose, MdSecurity } from 'react-icons/md';
import { buildNetworkData, ENTITY } from '../features/network/graphUtils';
import { caseViews, districts, units, accused, victims } from '../data/schemaSelectors';
import { useSecurity } from '../context/SecurityContext';
import { getSecureCaseViews } from '../security/securityUtils';

const FILTER_CHIPS = [
  { key: 'all',      label: 'All Entities' },
  { key: 'criminal', label: 'Accused' },
  { key: 'case',     label: 'FIRs' },
  { key: 'victim',   label: 'Victims' },
  { key: 'district', label: 'Districts' },
  { key: 'station',  label: 'Stations' },
];

const REPULSION = 6000;
const SPRING_K = 0.004;
const IDEAL_LEN = 110;
const GRAVITY = 0.0007;
const DAMPING = 0.78;

const nodeSprites = {};
const generateSprites = () => {
  Object.keys(ENTITY).forEach(type => {
    const ent = ENTITY[type];
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const cx = 32, cy = 32, r = 24;

    const gr = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, 32);
    gr.addColorStop(0, ent.glow || ent.color);
    gr.addColorStop(1, 'transparent');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 64, 64);

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - (Math.PI / 6);
      ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fillStyle = ent.color;
    ctx.fill();
    
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - (Math.PI / 6);
      ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    }
    ctx.closePath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    nodeSprites[type] = canvas;
  });
};
generateSprites();

export default function NetworkGraph() {
  const { session } = useSecurity();
  const secureCases = useMemo(() => getSecureCaseViews(caseViews, session.accessLevel), [session.accessLevel]);

  const [hasQueried, setHasQueried] = useState(false);
  
  // Query Form State
  const [qSearch, setQSearch] = useState('');
  const [qCategory, setQCategory] = useState('all');
  const [qDistrict, setQDistrict] = useState('all');
  const [qStation, setQStation] = useState('all');
  
  // Graph State
  const [filterType, setFilterType] = useState('all');
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [pinnedNodes, setPinnedNodes] = useState(new Set());

  const crimeTypesList = useMemo(() => {
    const types = new Set();
    secureCases.forEach(c => { if (c.majorHeadName) types.add(c.majorHeadName); });
    return ['all', ...Array.from(types).sort()];
  }, [secureCases]);
  
  const districtList = useMemo(() => {
    const ds = new Set();
    districts.forEach(d => { if(d.DistrictName) ds.add(d.DistrictName); });
    return ['all', ...Array.from(ds).sort()];
  }, []);

  const stationList = useMemo(() => {
    const st = new Set();
    units.forEach(u => { 
      if (!u.UnitName) return;
      if (qDistrict !== 'all') {
        const d = districts.find(d => String(d.DistrictID) === String(u.DistrictID));
        if (d && d.DistrictName !== qDistrict) return;
      }
      st.add(u.UnitName);
    });
    return ['all', ...Array.from(st).sort()];
  }, [qDistrict]);

  const rawGraph = useMemo(() => {
    if (!hasQueried) return { nodes: [], edges: [] };
    
    // Query-First Approach: Filter secureCases BEFORE building graph!
    const filteredCases = secureCases.filter(c => {
      let match = true;
      if (qCategory !== 'all' && c.majorHeadName !== qCategory) match = false;
      
      const distName = c.districtName || c.district?.DistrictName;
      if (qDistrict !== 'all' && distName !== qDistrict) match = false;

      const stName = c.policeStationName || c.unit?.UnitName || c.unit?.PoliceStationName;
      if (qStation !== 'all' && stName !== qStation) match = false;
      
      if (qSearch) {
        const term = qSearch.toLowerCase();
        // Deep search across all case metadata (including nested unit, district, and arrays)
        if (!JSON.stringify(c).toLowerCase().includes(term)) {
          match = false;
        }
      }
      return match;
    });
    
    // Build network from heavily filtered list
    return buildNetworkData(filteredCases, accused, victims, districts, units);
  }, [hasQueried, secureCases, qCategory, qStation, qSearch]);

  const { visNodes, visEdges, nodeMap } = useMemo(() => {
    let nodes = rawGraph.nodes.filter(n => filterType === 'all' || n.type === filterType);
    
    // Core nodes are the actual data (Cases, Accused, Victims)
    const coreNodeIds = new Set();
    rawGraph.nodes.forEach(n => {
      if (['case', 'criminal', 'victim'].includes(n.type)) {
        coreNodeIds.add(n.id);
      }
    });

    // We only want to keep structural nodes (Stations, Districts) if they are directly linked to core data
    const validNodeIds = new Set(coreNodeIds);
    rawGraph.edges.forEach(e => {
      if (coreNodeIds.has(e.source)) validNodeIds.add(e.target);
      if (coreNodeIds.has(e.target)) validNodeIds.add(e.source);
    });

    // Filter out all the empty master stations/districts that have no cases
    nodes = nodes.filter(n => validNodeIds.has(n.id));
    
    const finalIds = new Set(nodes.map(n => n.id));
    const edges = rawGraph.edges.filter(e => finalIds.has(e.source) && finalIds.has(e.target));
    const map = new Map(nodes.map(n => [n.id, n]));
    
    return { visNodes: nodes, visEdges: edges, nodeMap: map };
  }, [rawGraph, filterType]);

  const deg = useMemo(() => {
    const d = {};
    visEdges.forEach(e => {
      d[e.source] = (d[e.source] || 0) + 1;
      d[e.target] = (d[e.target] || 0) + 1;
    });
    return d;
  }, [visEdges]);

  const connectedSet = useMemo(() => {
    if (!selectedNode) return null;
    const s = new Set([selectedNode.id]);
    visEdges.forEach(e => {
      if (e.source === selectedNode.id) s.add(e.target);
      if (e.target === selectedNode.id) s.add(e.source);
    });
    return s;
  }, [selectedNode, visEdges]);

  const canvasRef = useRef(null);
  const transformRef = useRef({ x: 0, y: 0, zoom: 1 });
  const dragRef = useRef({ node: null });
  const panRef = useRef({ active: false, ox: 0, oy: 0 });
  const pinnedRef = useRef(new Set());
  const hoveredRef = useRef(null);
  const selectedRef = useRef(null);
  const connSetRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => { pinnedRef.current = pinnedNodes; }, [pinnedNodes]);
  useEffect(() => { hoveredRef.current = hoveredNode; }, [hoveredNode]);
  useEffect(() => { selectedRef.current = selectedNode; }, [selectedNode]);
  useEffect(() => { connSetRef.current = connectedSet; }, [connectedSet]);

  useEffect(() => {
    if (!hasQueried || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const nodes = visNodes;
    const edges = visEdges;
    const nm = nodeMap;

    let initialFit = false;
    const fitGraph = () => {
      if (nodes.length === 0 || W === 0 || H === 0) return;
      const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      let fitZoom = Math.min((W - 100) / Math.max(maxX - minX, 1), (H - 100) / Math.max(maxY - minY, 1), 1);
      fitZoom = Math.max(fitZoom, 0.1);
      transformRef.current = {
        zoom: fitZoom,
        x: W / 2 - ((minX + maxX) / 2) * fitZoom,
        y: H / 2 - ((minY + maxY) / 2) * fitZoom,
      };
      initialFit = true;
    };

    const frame = () => {
      animRef.current = requestAnimationFrame(frame);
      if (!initialFit) fitGraph();

      const { x: tx, y: ty, zoom: tz } = transformRef.current;
      const dragged = dragRef.current.node;
      const pinned = pinnedRef.current;
      const cx = W / 2, cy = H / 2;
      const cSet = connSetRef.current;
      const sel = selectedRef.current;

      const runExactPhysics = nodes.length <= 350;

      nodes.forEach(n => {
        if (n.ox === undefined) { n.ox = n.x; n.oy = n.y; }
      });

      if (!runExactPhysics) {
        nodes.forEach(n => {
          if (pinned.has(n.id) || n === dragged) return;
          if (cSet && !cSet.has(n.id)) return;
          n.vx += (n.ox - n.x) * 0.06;
          n.vy += (n.oy - n.y) * 0.06;
          n.x += n.vx;
          n.y += n.vy;
          n.vx *= 0.82;
          n.vy *= 0.82;
        });
      } else {
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          if (pinned.has(a.id) || a === dragged) continue;
          if (cSet && !cSet.has(a.id)) continue;
          
          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            if (cSet && !cSet.has(b.id)) continue;
            const dx = (b.x - a.x) || 0.01;
            const dy = (b.y - a.y) || 0.01;
            const d2 = dx * dx + dy * dy;
            if (d2 > 90000) continue;
            const d = Math.sqrt(d2) || 1;
            const f = REPULSION / d2;
            const fx = (dx / d) * f;
            const fy = (dy / d) * f;
            a.vx -= fx * 0.01; a.vy -= fy * 0.01;
            if (!pinned.has(b.id) && b !== dragged) { b.vx += fx * 0.01; b.vy += fy * 0.01; }
          }
        }
        edges.forEach(edge => {
          const s = nm.get(edge.source), t = nm.get(edge.target);
          if (!s || !t) return;
          if (cSet && (!cSet.has(s.id) || !cSet.has(t.id))) return;
          const dx = t.x - s.x, dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = (dist - IDEAL_LEN) * SPRING_K * (edge.strength || 1);
          const fx = (dx / dist) * f, fy = (dy / dist) * f;
          if (!pinned.has(s.id) && s !== dragged) { s.vx += fx; s.vy += fy; }
          if (!pinned.has(t.id) && t !== dragged) { t.vx -= fx; t.vy -= fy; }
        });
        nodes.forEach(n => {
          if (pinned.has(n.id) || n === dragged) return;
          if (cSet && !cSet.has(n.id)) return;
          n.vx += (cx - n.x) * GRAVITY;
          n.vy += (cy - n.y) * GRAVITY;
          n.x += n.vx; n.y += n.vy;
          n.vx *= DAMPING; n.vy *= DAMPING;
        });
      }

      ctx.clearRect(0, 0, W, H);

      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(tz, tz);

      const activeNode = sel;
      if (activeNode) {
        edges.forEach(edge => {
          if (edge.source !== activeNode.id && edge.target !== activeNode.id) return;
          const s = nm.get(edge.source), t = nm.get(edge.target);
          if (!s || !t) return;
          const isSourceActive = (s.id === activeNode.id);
          const start = isSourceActive ? s : t;
          const end = isSourceActive ? t : s;
          
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.lineWidth = 3.5;
          const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
          grad.addColorStop(0, 'rgba(0, 255, 255, 1)');
          grad.addColorStop(0.5, 'rgba(0, 150, 255, 0.8)');
          grad.addColorStop(1, 'rgba(255, 0, 150, 0.1)');
          ctx.strokeStyle = grad;
          ctx.shadowBlur = 12;
          ctx.shadowColor = 'rgba(0, 200, 255, 0.9)';
          ctx.stroke();
          ctx.shadowBlur = 0;
        });
      }

      const now = Date.now();
      nodes.forEach(n => {
        const ent = ENTITY[n.type] || ENTITY.case;
        const isSelected = sel && sel.id === n.id;
        const isHovered = hoveredRef.current && hoveredRef.current.id === n.id;
        
        let dimmed = false;
        if (activeNode) {
          if (n.id !== activeNode.id) {
            dimmed = cSet ? !cSet.has(n.id) : false;
          }
        }
        
        if (dimmed) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fill();
          return; 
        }
        
        const nodeDeg = deg[n.id] || 0;
        const largeGraph = nodes.length > 500;
        const r = largeGraph ? Math.max(3.0, n.radius * 0.45 + Math.min(nodeDeg * 0.18, 3.5)) : n.radius + Math.min(nodeDeg * 1.2, 10);

        if (isSelected || isHovered) {
          const radarWave = (now % 2000) / 2000; 
          const waveRadius = r + (radarWave * 30);
          ctx.beginPath();
          ctx.arc(n.x, n.y, waveRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${1 - radarWave})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          const crossR = r + 12;
          ctx.beginPath();
          ctx.moveTo(n.x - crossR - 6, n.y); ctx.lineTo(n.x - crossR, n.y);
          ctx.moveTo(n.x + crossR, n.y); ctx.lineTo(n.x + crossR + 6, n.y);
          ctx.moveTo(n.x, n.y - crossR - 6); ctx.lineTo(n.x, n.y - crossR);
          ctx.moveTo(n.x, n.y + crossR); ctx.lineTo(n.x, n.y + crossR + 6);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        const sprite = nodeSprites[n.type] || nodeSprites['case'];
        const scale = r / 24;
        const sW = 64 * scale;
        const sH = 64 * scale;
        
        ctx.drawImage(sprite, n.x - sW/2, n.y - sH/2, sW, sH);
      });

      ctx.restore();
    };

    frame();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [hasQueried, visNodes, visEdges]);

  const screenToSim = useCallback((cx, cy) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { x: tx, y: ty, zoom: tz } = transformRef.current;
    return { x: (cx - rect.left - tx) / tz, y: (cy - rect.top - ty) / tz };
  }, []);

  const nodeAt = useCallback((sx, sy) =>
    visNodes.find(n => {
      if (connectedSet && !connectedSet.has(n.id)) return false;
      const dx = n.x - sx, dy = n.y - sy;
      return dx * dx + dy * dy <= (n.radius + 10) * (n.radius + 10);
    }) || null,
  [visNodes, connectedSet]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const sim = screenToSim(e.clientX, e.clientY);
    const node = nodeAt(sim.x, sim.y);
    if (node) {
      dragRef.current.node = node;
      setSelectedNode(node);
    } else {
      dragRef.current.node = null;
      panRef.current = { active: true, ox: e.clientX - transformRef.current.x, oy: e.clientY - transformRef.current.y };
    }
  }, [screenToSim, nodeAt]);

  const onMouseMove = useCallback((e) => {
    const sim = screenToSim(e.clientX, e.clientY);
    const hNode = nodeAt(sim.x, sim.y);
    setHoveredNode(hNode);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = hNode ? 'pointer' : (dragRef.current.node ? 'grabbing' : 'grab');
    }
    if (dragRef.current.node && e.buttons === 1) {
      dragRef.current.node.x = sim.x;
      dragRef.current.node.y = sim.y;
    } else if (!dragRef.current.node && panRef.current.active && e.buttons === 1) {
      transformRef.current = { ...transformRef.current, x: e.clientX - panRef.current.ox, y: e.clientY - panRef.current.oy };
    }
  }, [screenToSim, nodeAt]);

  const onMouseUp = useCallback(() => {
    dragRef.current.node = null;
    panRef.current.active = false;
  }, []);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const { x: tx, y: ty, zoom: tz } = transformRef.current;
    const newZoom = Math.max(0.12, Math.min(tz * factor, 6));
    transformRef.current = {
      x: mx - (mx - tx) * (newZoom / tz),
      y: my - (my - ty) * (newZoom / tz),
      zoom: newZoom,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [onWheel, hasQueried]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // UI Components
  if (!hasQueried) {
    const activeFilters = (qSearch ? 1 : 0) + (qCategory !== 'all' ? 1 : 0) + (qStation !== 'all' ? 1 : 0);
    const canRun = activeFilters >= 1; 

    return (
      <div className="page-content animate-fade-in text-inverse" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '600px', width: '100%', background: 'var(--bg-panel)', borderRadius: '16px', padding: '40px', border: '1px solid var(--border-color)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #ff4d6d, #7b2ff7, #4fc3f7)' }} />

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(123,47,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', border: '1px solid rgba(123,47,247,0.3)' }}>
              <MdSecurity size={32} color="#7b2ff7" />
            </div>
            <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', color: '#fff' }}>Intelligence Sandbox</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              The database contains millions of records. To prevent intelligence overload, 
              construct a focused query to generate a specific target network.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.05em' }}>TARGET IDENTIFIER (FIR / NAME)</label>
              <input 
                type="text" 
                value={qSearch}
                onChange={e => setQSearch(e.target.value)}
                placeholder="e.g. FIR-1234, John Doe..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.05em' }}>CRIME CATEGORY</label>
                <select 
                  value={qCategory}
                  onChange={e => setQCategory(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '14px', cursor: 'pointer' }}
                >
                  {crimeTypesList.map(t => <option key={t} value={t}>{t === 'all' ? 'Any Category' : t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.05em' }}>DISTRICT</label>
                <select 
                  value={qDistrict}
                  onChange={e => { setQDistrict(e.target.value); setQStation('all'); }}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '14px', cursor: 'pointer' }}
                >
                  {districtList.map(t => <option key={t} value={t}>{t === 'all' ? 'Any District' : t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.05em' }}>POLICE STATION</label>
                <select 
                  value={qStation}
                  onChange={e => setQStation(e.target.value)}
                  disabled={qDistrict === 'all'}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px', background: qDistrict === 'all' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: qDistrict === 'all' ? 'rgba(255,255,255,0.3)' : '#fff', outline: 'none', fontSize: '14px', cursor: qDistrict === 'all' ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                >
                  {stationList.map(t => <option key={t} value={t}>{t === 'all' ? (qDistrict === 'all' ? 'Select District First' : 'Any Station') : t}</option>)}
                </select>
              </div>
            </div>

            <button 
              disabled={!canRun}
              onClick={() => setHasQueried(true)}
              style={{
                marginTop: '16px', width: '100%', padding: '14px', borderRadius: '8px',
                background: canRun ? 'linear-gradient(135deg, #7b2ff7, #512da8)' : 'rgba(255,255,255,0.05)',
                color: canRun ? '#fff' : 'rgba(255,255,255,0.3)',
                border: 'none', fontSize: '15px', fontWeight: 700, cursor: canRun ? 'pointer' : 'not-allowed',
                boxShadow: canRun ? '0 8px 20px rgba(123,47,247,0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {canRun ? 'Initialize Network Graph' : 'Select at least 1 filter to query'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Graph View (Full Screen immersive) ──
  return (
    <div className="page-content animate-fade-in text-inverse" style={{ 
      display: 'flex', flexDirection: 'column', 
      height: 'calc(100vh - 64px)', 
      padding: 0, 
      margin: '-24px', // Override global page padding
      position: 'relative', // Contain the absolute floating panels
      background: '#050a12' 
    }}>
      
      {/* Absolute Header Overlay */}
      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => { setHasQueried(false); setSelectedNode(null); }}
          style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(7,16,28,0.85)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: '13px', backdropFilter: 'blur(10px)' }}
        >
          ← New Query
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'Nodes', value: visNodes.length, c: '#4fc3f7' },
            { label: 'Edges', value: visEdges.length, c: '#ce93d8' }
          ].map(s => (
            <div key={s.label} style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(7,16,28,0.85)', border: `1px solid ${s.c}30`, fontSize: '12px', backdropFilter: 'blur(10px)' }}>
              <span style={{ color: s.c, fontWeight: 700 }}>{s.value}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 100, display: 'flex', gap: '8px', background: 'rgba(7,16,28,0.85)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
        {FILTER_CHIPS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            style={{
              padding: '4px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px',
              border: `1px solid ${filterType === f.key ? (ENTITY[f.key]?.color || '#4fc3f7') : 'transparent'}`,
              background: filterType === f.key ? `${ENTITY[f.key]?.color || '#4fc3f7'}20` : 'transparent',
              color: filterType === f.key ? (ENTITY[f.key]?.color || '#fff') : 'var(--text-muted)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, background: '#050a12', position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* Hover Tooltip */}
        {hoveredNode && (
          <div style={{
            position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(7,16,28,0.95)', border: `1px solid ${ENTITY[hoveredNode.type]?.color || '#fff'}40`,
            borderRadius: '10px', padding: '8px 16px', zIndex: 20, pointerEvents: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '13px', color: '#fff' }}>{hoveredNode.label}</strong>
              <span style={{ fontSize: '11px', color: ENTITY[hoveredNode.type]?.color, textTransform: 'uppercase' }}>
                {ENTITY[hoveredNode.type]?.label}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
              Click to view intelligence dossier
            </div>
          </div>
        )}

        {/* Selected Dossier Panel (Floating Palantir Style) */}
        {selectedNode && (
          <div style={{
            position: 'absolute', right: '24px', top: '80px', width: '320px',
            background: 'rgba(7,16,28,0.95)', border: `1px solid ${ENTITY[selectedNode.type]?.color || 'rgba(255,255,255,0.1)'}`,
            borderRadius: '16px', padding: '20px', backdropFilter: 'blur(20px)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            zIndex: 30, animation: 'fadeInRight 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', color: ENTITY[selectedNode.type]?.color, fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>
                  {ENTITY[selectedNode.type]?.label || selectedNode.type.toUpperCase()}
                </div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>{selectedNode.label}</h3>
              </div>
              <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.6 }}>
                <MdClose size={20} />
              </button>
            </div>
            
            {selectedNode.type === 'case' && selectedNode.data && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                {selectedNode.data.BriefFacts || 'No brief facts available.'}
              </div>
            )}
            
            {(() => {
              const breakdown = { case: 0, criminal: 0, victim: 0, station: 0, district: 0 };
              if (connectedSet) {
                connectedSet.forEach(id => {
                  if (id === selectedNode.id) return;
                  const n = nodeMap.get(id);
                  if (n) breakdown[n.type] = (breakdown[n.type] || 0) + 1;
                });
              }
              return (
                <>
                  <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '12px' }}>
                    NETWORK IMPACT ({connectedSet ? connectedSet.size - 1 : 0} CONNECTIONS)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { key: 'case', label: 'Linked FIRs' },
                      { key: 'criminal', label: 'Accused / Linked' },
                      { key: 'victim', label: 'Victims' },
                      { key: 'station', label: 'Stations' },
                      { key: 'district', label: 'Districts' }
                    ].map(b => breakdown[b.key] > 0 ? (
                      <div key={b.key} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: `1px solid ${ENTITY[b.key]?.color}30` }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: ENTITY[b.key]?.color }}>{breakdown[b.key]}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{b.label.toUpperCase()}</div>
                      </div>
                    ) : null)}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
