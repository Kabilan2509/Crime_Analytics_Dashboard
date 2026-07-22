import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  MdLock, MdWarning, MdLocationOn, MdInsertDriveFile,
  MdPhoneInTalk, MdAccountBalance, MdDirectionsCar, MdAdd, MdHistory,
  MdChevronRight, MdPeople
} from 'react-icons/md';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { caseViews } from '../data/schemaSelectors';
import { playAlertSound } from '../utils/audioAlert';
import { useSecurity } from '../context/SecurityContext';
import { downloadPdf } from '../utils/fileExports';

// Deterministic locality reverse geocoding
const getLocality = (lat, lng, caseId) => {
  const localities = [
    'MG Road', 'Brigade Road', 'Jayanagar 4th Block', 'Koramangala 5th Block',
    'Whitefield Main Road', 'HSR Layout Sector 2', 'Indiranagar 100 Feet Road',
    'Electronic City Phase 1', 'Marathahalli Bridge', 'Yelahanka New Town',
    'Rajajinagar 1st Block', 'Basavanagudi Bull Temple Road', 'BTM Layout 2nd Stage',
    'Peenya Industrial Area', 'Yeshwanthpur Circle', 'KR Market',
    'Mysuru Devaraja Market', 'Mangaluru Hampankatta', 'Hubli Lamington Road',
    'Belagavi Khanapur Road', 'Kalaburagi Super Market', 'Tumakuru Bus Stand area',
    'Davanagere PJ Extension', 'Shivamogga JC Road', 'Ballari Cowl Bazaar'
  ];
  if (!lat || !lng) return 'Unknown Locality';
  const hash = Math.abs(Math.round((lat + lng) * 10000) + Number(caseId || 0)) % localities.length;
  return localities[hash];
};

// Category details
const CATEGORY_COLORS = {
  'Criminal Justice': 'var(--accent-danger)', // Red
  'Communications': 'var(--accent-primary)',  // Blue
  'Location': 'var(--accent-success)',      // Green
  'Financial': 'var(--accent-warning)',      // Amber
  'Travel': '#9b5de5',                       // Purple
  'Forensic': '#00f5d4',                     // Teal
  'Manual': '#70829a'                        // Muted grey
};

const CATEGORY_ICONS = {
  'Criminal Justice': <MdWarning />,
  'Communications': <MdPhoneInTalk />,
  'Location': <MdLocationOn />,
  'Financial': <MdAccountBalance />,
  'Travel': <MdDirectionsCar />,
  'Forensic': <MdInsertDriveFile />,
  'Manual': <MdHistory />
};

// Dynamic chronological event generator
const generateTimelineEvents = (c, suspectId, suspectName) => {
  const caseId = c ? c.CaseMasterID : 1;
  const registeredDateStr = c ? c.CrimeRegisteredDate?.split(' ')[0] : '2026-07-10';
  const lat = c ? c.latitude : 12.9716;
  const lng = c ? c.longitude : 77.5946;
  const name = suspectName || 'Suspect ACC-101';
  
  const offset = (val, mult) => val + (mult * 0.003);

  return [
    {
      id: `EV-T-${caseId}-01`,
      timestamp: `${registeredDateStr} 08:30`,
      type: 'Criminal Justice',
      title: 'Incident Occurrence Reported',
      desc: `FIR filed for crime head ${c.minorHeadName || 'exhibit'}. Primary accused named: ${name}.`,
      location: { lat, lng },
      source: 'CCTNS National Registry',
      evidenceId: `EV-${caseId}-F01`,
      isManual: false,
      isRestricted: false
    },
    {
      id: `EV-T-${caseId}-02`,
      timestamp: `${registeredDateStr} 09:12`,
      type: 'Communications',
      title: 'Emergency 112 Dispatch Sighting',
      desc: 'Automated dispatcher triangulates suspect speech signature from phone intercept.',
      location: null,
      source: 'State Call Routing Server',
      evidenceId: `EV-${caseId}-A03`,
      isManual: false,
      isRestricted: false
    },
    {
      id: `EV-T-${caseId}-03`,
      timestamp: `${registeredDateStr} 10:45`,
      type: 'Location',
      title: 'ANPR Camera Sighting',
      desc: 'Speed-trap camera capture matched suspect registered motorcycle license plate.',
      location: { lat: offset(lat, 1.2), lng: offset(lng, -0.8) },
      source: 'Highway Patrol ANPR Camera Node #12',
      evidenceId: `EV-${caseId}-V02`,
      isManual: false,
      isRestricted: false
    },
    {
      id: `EV-T-${caseId}-04`,
      timestamp: `${registeredDateStr} 11:30`,
      type: 'Financial',
      title: 'ATM Cash Withdrawal',
      desc: 'SBI ATM transaction of INR 10,000 using suspect debit card.',
      location: { lat: offset(lat, -0.5), lng: offset(lng, 0.4) },
      source: 'SBI Bank Audit API',
      evidenceId: null,
      isManual: false,
      isRestricted: false
    },
    {
      id: `EV-T-${caseId}-05`,
      timestamp: `${registeredDateStr} 13:10`,
      type: 'Forensic',
      title: 'Exhibit Fingerprint Match',
      desc: 'Crime scene fingerprint exhibit matched to suspect right thumb database file.',
      location: { lat, lng },
      source: 'State Forensics Laboratory',
      evidenceId: `EV-${caseId}-I05`,
      isManual: false,
      isRestricted: false
    },
    {
      id: `EV-T-${caseId}-06`,
      timestamp: `${registeredDateStr} 16:30`,
      type: 'Travel',
      title: 'Highway Fastag Gate Crossing',
      desc: 'Toll plaza verification matched registered vehicle transponder signal.',
      location: { lat: offset(lat, 2.5), lng: offset(lng, -1.8) },
      source: 'NHAI Gateway API',
      evidenceId: null,
      isManual: false,
      isRestricted: false
    },
    {
      id: `EV-T-${caseId}-07`,
      timestamp: `${registeredDateStr} 18:00`,
      type: 'Criminal Justice',
      title: 'Suspect Custody & Arrest',
      desc: `Arrest warrant executed on suspect ${name} at location scene.`,
      location: { lat: offset(lat, 0.2), lng: offset(lng, 0.2) },
      source: 'Police Station Duty Log',
      evidenceId: null,
      isManual: false,
      isRestricted: false
    },
    {
      id: `EV-T-${caseId}-08`,
      timestamp: `${registeredDateStr} 20:30`,
      type: 'Communications',
      title: 'Restricted Mobile Call Log',
      desc: 'Classified cellular trace log showing encrypted communication.',
      location: null,
      source: 'Intelligence Bureau Intercept Node',
      evidenceId: null,
      isManual: false,
      isRestricted: true // Gated for security demo
    }
  ];
};

function SuspectTimeline() {
  const navigate = useNavigate();
  const location = useLocation();
  const { caseId: routeCaseId, suspectId: routeSuspectId } = useParams();
  const [searchParams] = useSearchParams();
  const caseId = routeCaseId || searchParams.get('caseId');
  const suspectId = routeSuspectId || searchParams.get('suspectId');
  const isCaseOverviewRoute = location.pathname.includes('case-overview');

  const { session, isCommandMode } = useSecurity();

  // Find active case
  const activeCase = useMemo(() => {
    if (!caseId) return null;
    return caseViews.find(c => String(c.CaseMasterID) === String(caseId));
  }, [caseId]);

  // Suspects list inside active case
  const suspectsList = useMemo(() => {
    if (!activeCase) return [];
    if (activeCase.accused && activeCase.accused.length > 0) {
      return activeCase.accused.map((a, idx) => ({
        id: String(a.AccusedMasterID || `s_${idx + 1}`),
        name: a.AccusedName || `Suspect ACC-${idx + 101}`,
        role: idx === 0 ? 'Primary Suspect' : 'Associate'
      }));
    }
    return [
      { id: 's_101', name: 'ACCUSED-101', role: 'Primary Suspect' }
    ];
  }, [activeCase]);

  // Determine active suspect details
  const activeSuspect = useMemo(() => {
    if (suspectsList.length === 0) return null;
    if (suspectId) {
      return suspectsList.find(s => s.id === String(suspectId)) || suspectsList[0];
    }
    return suspectsList[0];
  }, [suspectsList, suspectId]);

  // Master timeline events state
  const [eventsList, setEventsList] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Filters state
  const [activeCategories, setActiveCategories] = useState(new Set(Object.keys(CATEGORY_COLORS)));
  const [dateRangePreset, setDateRangePreset] = useState('full'); // 7d, 30d, full
  const [selectedNodeFilter, setSelectedNodeFilter] = useState(null); // click link node to filter

  // Overlay co-suspect modes
  const [compareMode, setCompareMode] = useState(false);
  const [compareOverlayEvents, setCompareOverlayEvents] = useState([]);

  // Manual event modal creation state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState('Manual');
  const [manualDesc, setManualDesc] = useState('');
  const [manualDate, setManualDate] = useState('');

  // Initial event loader
  useEffect(() => {
    if (activeCase && activeSuspect) {
      setEventsList(generateTimelineEvents(activeCase, activeSuspect.id, activeSuspect.name));
      setSelectedEvent(null);
    }
  }, [activeCase, activeSuspect]);

  // Load comparative overlay events
  useEffect(() => {
    if (compareMode && activeCase) {
      // Load first victim's logs as comparative swimlane
      const victimEvents = [
        {
          id: `EV-CO-01`,
          timestamp: `${activeCase.CrimeRegisteredDate?.split(' ')[0] || '2026-07-10'} 09:15`,
          type: 'Criminal Justice',
          title: 'Victim statement recorded',
          desc: 'Victim submitted deposition logs at station.',
          location: null,
          source: 'Victim Registry',
          isManual: false,
          isRestricted: false,
          isCompareOverlay: true,
          owner: 'Victim Dossier'
        },
        {
          id: `EV-CO-02`,
          timestamp: `${activeCase.CrimeRegisteredDate?.split(' ')[0] || '2026-07-10'} 12:45`,
          type: 'Location',
          title: 'Victim medical screening check',
          desc: 'Screening entry committed at City Hospital.',
          location: null,
          source: 'Hospital Database',
          isManual: false,
          isRestricted: false,
          isCompareOverlay: true,
          owner: 'Victim Dossier'
        }
      ];
      setCompareOverlayEvents(victimEvents);
    } else {
      setCompareOverlayEvents([]);
    }
  }, [compareMode, activeCase]);

  // Check role authorization for write access
  const isAuthorized = useMemo(() => {
    if (session.accessLevel !== 'command') return false;
    if (session.role === 'State DGP Command' || session.unitName === 'State Control Room') return true;
    return activeCase && String(session.unitName).toLowerCase() === String(activeCase.policeStationName).toLowerCase();
  }, [session, activeCase]);

  // Determine if a particular event is restricted for this user
  const isEventRestricted = (ev) => {
    if (!ev.isRestricted) return false;
    return session.accessLevel !== 'command' || session.role === 'Support Staff';
  };

  // Filter events based on active configurations
  const filteredEvents = useMemo(() => {
    let result = [...eventsList];

    // Filter by category
    result = result.filter(ev => activeCategories.has(ev.type));

    // Filter by Date Range preset
    if (dateRangePreset === '7d' && activeCase?.registeredDateObj) {
      const minTime = activeCase.registeredDateObj.getTime();
      const maxTime = minTime + 7 * 24 * 60 * 60 * 1000;
      result = result.filter(ev => {
        const t = new Date(ev.timestamp).getTime();
        return t >= minTime && t <= maxTime;
      });
    } else if (dateRangePreset === '30d' && activeCase?.registeredDateObj) {
      const minTime = activeCase.registeredDateObj.getTime();
      const maxTime = minTime + 30 * 24 * 60 * 60 * 1000;
      result = result.filter(ev => {
        const t = new Date(ev.timestamp).getTime();
        return t >= minTime && t <= maxTime;
      });
    }

    // Filter by graph node click (e.g. location or phone number matches)
    if (selectedNodeFilter) {
      result = result.filter(ev => {
        if (selectedNodeFilter.type === 'Location' && ev.location) {
          const locLocality = getLocality(ev.location.lat, ev.location.lng, activeCase?.CaseMasterID);
          return locLocality.toLowerCase().includes(selectedNodeFilter.name.toLowerCase());
        }
        if (selectedNodeFilter.type === 'Device' && ev.device) {
          return ev.device.toLowerCase().includes(selectedNodeFilter.name.toLowerCase());
        }
        if (selectedNodeFilter.type === 'Source' && ev.source) {
          return ev.source.toLowerCase().includes(selectedNodeFilter.name.toLowerCase());
        }
        return true;
      });
    }

    // Sort chronologically
    result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return result;
  }, [eventsList, activeCategories, dateRangePreset, selectedNodeFilter, activeCase]);

  // Dynamic aggregates for filters
  const categoryCounts = useMemo(() => {
    const counts = {};
    eventsList.forEach(ev => {
      counts[ev.type] = (counts[ev.type] || 0) + 1;
    });
    return counts;
  }, [eventsList]);

  // Network link graph nodes calculation
  const networkNodes = useMemo(() => {
    if (!activeSuspect) return [];
    
    // Suspect as central node
    const nodes = [
      { id: 'suspect', name: activeSuspect.name, type: 'Suspect', connected: true }
    ];

    // Connect locations and associates present in filtered events
    const processedLocs = new Set();
    const processedSources = new Set();

    filteredEvents.forEach(ev => {
      if (ev.location) {
        const name = getLocality(ev.location.lat, ev.location.lng, activeCase?.CaseMasterID);
        if (!processedLocs.has(name)) {
          processedLocs.add(name);
          nodes.push({ id: `loc_${name}`, name, type: 'Location', connected: true });
        }
      }
      if (ev.source && !processedSources.has(ev.source)) {
        processedSources.add(ev.source);
        nodes.push({ id: `src_${ev.source}`, name: ev.source, type: 'Source', connected: true });
      }
    });

    return nodes;
  }, [activeSuspect, filteredEvents, activeCase]);

  // Synced path mapping coordinates
  const pathCoordinates = useMemo(() => {
    return filteredEvents
      .filter(ev => ev.location && !isEventRestricted(ev))
      .map(ev => [ev.location.lat, ev.location.lng]);
  }, [filteredEvents]);

  // Toggle Category
  const toggleCategory = (cat) => {
    playAlertSound(600, 0.05);
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  // Add Manual event handler
  const handleAddManualEventSubmit = (e) => {
    e.preventDefault();
    if (!isAuthorized) return;
    playAlertSound(600, 0.05);

    const timeStr = manualDate ? manualDate.replace('T', ' ') : new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newEvent = {
      id: `EV-M-${Date.now()}`,
      timestamp: timeStr,
      type: 'Manual',
      title: manualTitle || 'Investigator note addition',
      desc: manualDesc || 'No details provided.',
      location: activeCase ? { lat: activeCase.latitude, lng: activeCase.longitude } : null,
      source: `Manual Entry: IO ${session.officerName || 'Duty Officer'}`,
      evidenceId: null,
      isManual: true,
      isRestricted: false,
      operator: session.officerName || 'Duty Officer'
    };

    setEventsList(prev => [...prev, newEvent]);
    setShowManualModal(false);
    setManualTitle('');
    setManualDesc('');
    setManualDate('');
  };

  const handleExportTimeline = () => {
    playAlertSound(800, 0.05);
    const suspectName = activeSuspect?.name || 'Unknown suspect';
    downloadPdf(`suspect-timeline-${suspectName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`,
      `KSP Suspect Reconstruction Timeline - ${suspectName}`,
      [
        `Total verified logs: ${filteredEvents.length}`,
        `Generated: ${new Date().toLocaleString()}`,
        '',
        ...filteredEvents.map(event => `${event.timestamp} | ${event.type} | ${event.title} | ${event.desc || ''} | ${event.source || ''}`)
      ]);
  };

  // Select timeline marker
  const handleSelectEvent = (ev) => {
    if (isEventRestricted(ev)) {
      playAlertSound(300, 0.15);
      return;
    }
    playAlertSound(600, 0.05);
    setSelectedEvent(ev);
  };

  return (
    <div className="page-content suspect-timeline-page text-inverse">
      <style>{`
        .suspect-timeline-page {
          font-family: 'Public Sans', sans-serif !important;
        }
        .suspect-timeline-page input,
        .suspect-timeline-page button,
        .suspect-timeline-page select,
        .suspect-timeline-page strong,
        .suspect-timeline-page span,
        .suspect-timeline-page div {
          font-family: 'Public Sans', sans-serif !important;
          border-radius: 4px !important;
        }
        .flat-section {
          background: var(--bg-app) !important;
          border: none !important;
          border-bottom: 1px solid var(--border-color) !important;
          padding: 16px 0px !important;
        }
        .section-label {
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.15em !important;
          color: var(--text-muted) !important;
          font-weight: 700 !important;
          display: block !important;
          margin-bottom: 12px !important;
        }
        .status-badge {
          padding: 2px 8px;
          border-radius: 99px !important; /* accent rounded pills */
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-badge.heinous { background: rgba(200,0,0,0.15); color: var(--accent-danger); }
        .status-badge.standard { background: rgba(255,140,0,0.15); color: var(--accent-warning); }

        /* Stepper-style chronological lollipop list */
        .lollipop-list {
          position: relative;
          padding-left: 20px;
          margin-top: 14px;
        }
        .lollipop-axis {
          position: absolute;
          left: 5px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background: var(--border-color);
        }
        .lollipop-item {
          position: relative;
          margin-bottom: 20px;
          cursor: pointer;
          transition: transform var(--transition);
        }
        .lollipop-item:hover {
          transform: translateX(4px);
        }
        .lollipop-dot {
          position: absolute;
          left: -20px;
          top: 3px;
          width: 12px;
          height: 12px;
          border-radius: 50% !important; /* Lollipop nodes stay circular */
          border: 2px solid var(--border-color);
          background: var(--bg-panel-alt);
          z-index: 10;
        }
        .lollipop-item.selected .lollipop-dot {
          border-color: #fff !important;
          box-shadow: 0 0 8px rgba(255,255,255,0.8);
        }
        
        /* Filter chips */
        .filter-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--bg-panel);
          border: 1px solid var(--border-color);
          cursor: pointer;
          font-size: 11px;
          color: var(--text-secondary);
          transition: all var(--transition);
          text-transform: uppercase;
        }
        .filter-chip:hover, .filter-chip.active {
          color: var(--text-primary);
          background: var(--bg-panel-alt);
        }

        /* Network Graph visuals */
        .network-graph-container {
          height: 200px;
          border: 1px solid var(--border-color);
          background: #090e17;
          position: relative;
          overflow: hidden;
        }
        .node-bubble {
          position: absolute;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: bold;
          border: 1px solid var(--border-color);
          background: var(--bg-panel-alt);
          color: var(--text-primary);
          cursor: pointer;
          transform: translate(-50%, -50%);
        }
        .node-bubble:hover, .node-bubble.active {
          border-color: var(--accent-primary);
          background: rgba(77, 163, 214, 0.15);
        }

        .map-panel {
          border: 1px solid var(--border-color) !important;
        }

        /* Slide-in drawer container layout */
        .detail-drawer {
          border: 1px solid var(--border-color);
          background: var(--bg-panel-alt);
          padding: 16px;
          margin-top: 14px;
        }
      `}</style>

      {/* TOP HEADER STRIP (BREADCRUMB & SELECTOR & ACTIONS) */}
      <div className="flat-section" style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate(caseId ? (isCaseOverviewRoute ? `/case-overview/${caseId}` : `/cases/${caseId}`) : '/cases')}>
              Case Overview
            </span>
            <span>/</span>
            {activeCase ? (
              <span style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => navigate(isCaseOverviewRoute ? `/case-overview/${caseId}` : `/cases/${caseId}`)}>
                {activeCase.displayCrimeNo || `FIR-${activeCase.CaseMasterID}`} : {activeCase.minorHeadName || activeCase.majorHeadName}
              </span>
            ) : (
              <span>FIR-REDATED</span>
            )}
            <span>/</span>
            <span style={{ color: 'var(--text-primary)' }}>Suspect Timeline</span>
          </div>
        </div>

        {/* ENTITY SELECTOR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subject dossier</span>
          <select
            value={activeSuspect ? activeSuspect.id : ''}
            onChange={e => {
              playAlertSound(600, 0.05);
              navigate(`/suspect-timeline/${caseId}/${e.target.value}${isCaseOverviewRoute ? '?case-overview=true' : ''}`);
            }}
            style={{
              padding: '6px 12px',
              background: 'var(--bg-panel)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-strong)',
              fontSize: '13px',
              minHeight: '34px'
            }}
          >
            {suspectsList.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
            ))}
          </select>
        </div>

        {/* TOP ACTIONS */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            disabled={!isAuthorized}
            onClick={() => { playAlertSound(600, 0.05); setShowManualModal(true); }}
            style={{
              padding: '0 16px',
              fontSize: '13px',
              fontWeight: '600',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-strong)',
              color: isAuthorized ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: isAuthorized ? 'pointer' : 'not-allowed',
              opacity: isAuthorized ? 1 : 0.5,
              minHeight: '40px'
            }}
          >
            <MdAdd size={16} /> Add Manual Event
          </button>

          <button
            onClick={() => { playAlertSound(600, 0.05); setCompareMode(!compareMode); }}
            className={`session-btn ${compareMode ? 'primary' : ''}`}
            style={{
              padding: '0 16px',
              fontSize: '13px',
              fontWeight: '600',
              background: compareMode ? 'var(--accent-primary)' : 'var(--bg-panel)',
              color: compareMode ? '#fff' : 'var(--text-primary)',
              border: '1px solid var(--border-strong)',
              cursor: 'pointer',
              minHeight: '40px'
            }}
          >
            <MdPeople size={16} style={{ marginRight: '6px' }} /> Compare Swimlanes
          </button>

          <button
            onClick={handleExportTimeline}
            style={{
              padding: '0 16px',
              fontSize: '13px',
              fontWeight: '600',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              minHeight: '40px'
            }}
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* FILTER PANEL BAR */}
      <div className="flat-section" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
          {Object.keys(CATEGORY_COLORS).map(cat => {
            const isActive = activeCategories.has(cat);
            return (
              <div
                key={cat}
                className={`filter-chip ${isActive ? 'active' : ''}`}
                onClick={() => toggleCategory(cat)}
                style={{ borderLeft: `3px solid ${CATEGORY_COLORS[cat]}` }}
              >
                <span>{cat}</span>
                <span style={{ opacity: 0.6 }}>({categoryCounts[cat] || 0})</span>
              </div>
            );
          })}
        </div>

        {/* Date presets */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['7d', '30d', 'full'].map(preset => (
            <button
              key={preset}
              onClick={() => { playAlertSound(600, 0.05); setDateRangePreset(preset); }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: dateRangePreset === preset ? 'var(--accent-primary)' : 'var(--bg-panel)',
                color: dateRangePreset === preset ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-strong)',
                cursor: 'pointer'
              }}
            >
              {preset.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* COMPARATIVE OVERLAY swimlanes legend */}
      {compareMode && (
        <div style={{ padding: '8px 12px', background: 'rgba(155, 93, 229, 0.08)', border: '1px solid var(--border-color)', margin: '14px 0', fontSize: '12px', display: 'flex', gap: '20px' }}>
          <span>📊 COMPARE SWIMLANES ACTIVE:</span>
          <span style={{ color: 'var(--accent-primary)' }}>● Suspect: {activeSuspect?.name}</span>
          <span style={{ color: '#9b5de5' }}>▲ Co-Dossier Swimlane: Victim Deposition logs</span>
        </div>
      )}

      {/* TWO COLUMN MAIN CONTENT SCREEN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginTop: '14px' }}>
        
        {/* LEFT COLUMN: TIMELINE AXIS & AI INSIGHTS */}
        <div>
          
          {/* AI NARRATIVE PREVIEW SUMMARY */}
          <div style={{ background: 'rgba(77, 163, 214, 0.05)', padding: '12px 16px', borderLeft: '4px solid var(--accent-primary)', marginBottom: '20px' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>AI-ASSIST SUMMARY CASE TIMELINE</span>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Subject <strong>{activeSuspect?.name}</strong> exhibits spatial proximity cluster near Brigade Road within 1 hour of registered complaint incident occurrence. Sighting captured on ANPR camera node #12 confirms active fastag transponder signals.
            </p>
          </div>

          <span className="section-label">Investigation Timeline Lollipop Stream</span>

          {filteredEvents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
              No timeline events mapped to active filters.
            </div>
          ) : (
            <div className="lollipop-list">
              <div className="lollipop-axis" />
              
              {filteredEvents.map(ev => {
                const isRestricted = isEventRestricted(ev);
                const isSelected = selectedEvent && selectedEvent.id === ev.id;
                
                return (
                  <div
                    key={ev.id}
                    className={`lollipop-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => !isRestricted && handleSelectEvent(ev)}
                    style={{ opacity: isRestricted ? 0.5 : 1 }}
                  >
                    <div className="lollipop-dot" style={{ borderColor: CATEGORY_COLORS[ev.type] }} />
                    <div style={{ paddingLeft: '10px' }}>
                      <div style={{ display: 'flex', justifyItems: 'center', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>{ev.timestamp}</span>
                        <span className="badge" style={{
                          background: 'var(--bg-panel-alt)',
                          border: `1px solid ${CATEGORY_COLORS[ev.type]}`,
                          color: CATEGORY_COLORS[ev.type],
                          fontSize: '9px',
                          padding: '1px 6px',
                          borderRadius: '99px'
                        }}>
                          {ev.type}
                        </span>
                        {ev.isManual && (
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '9px', padding: '1px 6px', borderRadius: '99px' }}>Manual</span>
                        )}
                        {isRestricted && (
                          <MdLock size={12} style={{ color: 'var(--accent-danger)' }} />
                        )}
                      </div>
                      <strong style={{ fontSize: '13px', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)', display: 'block', marginTop: '4px' }}>
                        {isRestricted ? 'Restricted timeline node — credentials gate' : ev.title}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                        {isRestricted ? 'Detailed logs are locked based on secure session district rules.' : ev.desc}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* COMPARATIVE SWIMLANE EVENT RENDERERS */}
              {compareOverlayEvents.map(ev => (
                <div
                  key={ev.id}
                  className="lollipop-item"
                  style={{ borderLeft: '3px solid #9b5de5', background: 'rgba(155, 93, 229, 0.04)', paddingLeft: '10px', marginTop: '8px' }}
                >
                  <div style={{ display: 'flex', gap: '10px', fontSize: '11px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{ev.timestamp}</span>
                    <span style={{ color: '#9b5de5', fontWeight: 'bold' }}>▲ {ev.owner}</span>
                  </div>
                  <strong style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block', marginTop: '2px' }}>{ev.title}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{ev.desc}</span>
                </div>
              ))}

            </div>
          )}

          {/* AI ASSISTED GAP ANNOTATION WARNING */}
          {filteredEvents.length > 0 && (
            <div style={{ border: '1px dashed var(--accent-warning)', background: 'rgba(255,167,38,0.05)', padding: '10px 14px', marginTop: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MdWarning style={{ color: 'var(--accent-warning)', flexShrink: 0 }} />
              <div>
                <strong>AI SUGGESTED ANOMALY SIGHTING GAP:</strong>
                <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)' }}>
                  No recorded location/device activity mapped 18 hours prior to case incident registry.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: LINK ANALYSIS GRAPH & MAP & DETAILS */}
        <div>
          
          {/* LINK ANALYSIS GRAPH */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="section-label" style={{ margin: 0 }}>Subject Relationship Explorer</span>
              {selectedNodeFilter && (
                <button
                  onClick={() => setSelectedNodeFilter(null)}
                  style={{ border: 'none', background: 'transparent', color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '11px', minHeight: 'auto', minWidth: 'auto' }}
                >
                  Clear Filter
                </button>
              )}
            </div>

            <div className="network-graph-container">
              {networkNodes.map((node, idx) => {
                // Layout nodes deterministically in circle around center
                const total = networkNodes.length;
                const angle = idx === 0 ? 0 : (2 * Math.PI * idx) / (total - 1);
                const radiusX = 110;
                const radiusY = 60;
                const posX = idx === 0 ? 150 : 150 + Math.cos(angle) * radiusX;
                const posY = idx === 0 ? 100 : 100 + Math.sin(angle) * radiusY;

                return (
                  <div
                    key={node.id}
                    className={`node-bubble ${selectedNodeFilter?.id === node.id ? 'active' : ''}`}
                    onClick={() => {
                      playAlertSound(600, 0.05);
                      setSelectedNodeFilter(node.type === 'Suspect' ? null : node);
                    }}
                    style={{ left: `${posX}px`, top: `${posY}px` }}
                  >
                    {node.name.slice(0, 15)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SYNCED MAP SEQUENCE PATH */}
          <div style={{ marginBottom: '24px' }}>
            <span className="section-label">Geospatial Travel Trail Path</span>
            <div className="map-panel" style={{ height: '200px', width: '100%', position: 'relative', background: '#09121d' }}>
              {activeCase && pathCoordinates.length > 0 ? (
                <MapContainer
                  key={activeSuspect?.id}
                  center={pathCoordinates[0]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                  attributionControl={false}
                >
                  <TileLayer
                    url={document.documentElement.getAttribute('data-theme') === 'dark'
                      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    }
                  />
                  {/* Draw markers */}
                  {filteredEvents.filter(ev => ev.location && !isEventRestricted(ev)).map((ev, i) => (
                    <CircleMarker
                      key={ev.id}
                      center={[ev.location.lat, ev.location.lng]}
                      radius={5}
                      fillColor={CATEGORY_COLORS[ev.type]}
                      color="#fff"
                      weight={2}
                      fillOpacity={0.8}
                    >
                      <Tooltip permanent direction="top" offset={[0, -5]}>
                        <strong>[{i+1}] Locality: {getLocality(ev.location.lat, ev.location.lng, caseId)}</strong><br/>
                        {ev.title}
                      </Tooltip>
                    </CircleMarker>
                  ))}
                  {/* Connect path with Polyline */}
                  {pathCoordinates.length > 1 && (
                    <Polyline positions={pathCoordinates} color="var(--accent-primary)" weight={3} dashArray="5, 5" />
                  )}
                </MapContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
                  ⚠️ Mapped travel logs unavailable for this subject.
                </div>
              )}
            </div>
          </div>

          {/* SELECTED EVENT DETAILS DRAWER */}
          {selectedEvent && (
            <div className="detail-drawer">
              <span className="section-label" style={{ marginBottom: '8px' }}>Timeline Log details</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div>
                  <span>Event ID</span>
                  <strong style={{ color: 'var(--text-primary)', float: 'right' }}>{selectedEvent.id}</strong>
                </div>
                <div>
                  <span>Category</span>
                  <strong style={{ color: CATEGORY_COLORS[selectedEvent.type], float: 'right' }}>{selectedEvent.type}</strong>
                </div>
                <div>
                  <span>Time</span>
                  <strong style={{ color: 'var(--text-primary)', float: 'right' }}>{selectedEvent.timestamp}</strong>
                </div>
                <div>
                  <span>Source Core</span>
                  <strong style={{ color: 'var(--text-primary)', float: 'right' }}>{selectedEvent.source}</strong>
                </div>
                {selectedEvent.location && (
                  <div>
                    <span>Resolved Locality</span>
                    <strong style={{ color: 'var(--accent-primary)', float: 'right' }}>
                      {getLocality(selectedEvent.location.lat, selectedEvent.location.lng, caseId)}
                    </strong>
                  </div>
                )}
                
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Case Notes Context</span>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedEvent.desc}</p>
                </div>

                {/* Direct Jump to evidence in Workspace */}
                {selectedEvent.evidenceId && (
                  <button
                    onClick={() => {
                      playAlertSound(600, 0.05);
                      navigate(isCaseOverviewRoute ? `/evidence-workspace/${caseId}` : `/evidence/${caseId}`);
                    }}
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--accent-primary)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>Jump to Evidence Vault</span>
                    <MdChevronRight size={16} />
                  </button>
                )}

              </div>
            </div>
          )}

        </div>

      </div>

      {/* MANUAL EVENT CREATION MODAL */}
      {showManualModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-strong)', padding: '24px', width: '360px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>Record Manual Log Entry</h3>
            
            <form onSubmit={handleAddManualEventSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Event title</label>
                <input
                  type="text"
                  placeholder="e.g. Associate interview completed"
                  value={manualTitle}
                  required
                  onChange={e => setManualTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--bg-panel-alt)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Description details</label>
                <textarea
                  placeholder="Investigator notes context..."
                  value={manualDesc}
                  required
                  onChange={e => setManualDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--bg-panel-alt)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '13px',
                    minHeight: '60px',
                    resize: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Log Date / Time</label>
                <input
                  type="datetime-local"
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--bg-panel-alt)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    minHeight: '34px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    minHeight: '34px'
                  }}
                >
                  Commit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default SuspectTimeline;
