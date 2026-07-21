import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  MdSecurity, MdSearch, MdCloudUpload, MdWarning, MdLock,
  MdPhoto, MdVideocam, MdSettingsVoice, MdInsertDriveFile,
  MdAdd, MdContentCopy, MdAssignment
} from 'react-icons/md';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { caseViews } from '../data/schemaSelectors';
import { playAlertSound } from '../utils/audioAlert';
import { useSecurity } from '../context/SecurityContext';

// Deterministic locality reverse geocoding
const getLocality = (c) => {
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
  if (!c.latitude || !c.longitude) return 'Unknown Locality';
  const hash = Math.abs(Math.round((c.latitude + c.longitude) * 10000) + Number(c.CaseMasterID || 0)) % localities.length;
  return localities[hash];
};

// Dynamic evidence generator based on Case and Crime head
const generateEvidenceList = (c) => {
  const caseId = c ? c.CaseMasterID : 1;
  const isHeinous = c ? c.isHeinous : false;
  const officerName = c ? c.officerName : 'IO R. Gowda';
  const registeredDateStr = c ? c.CrimeRegisteredDate?.split(' ')[0] : '2026-07-10';
  const lat = c ? c.latitude : 12.9716;
  const lng = c ? c.longitude : 77.5946;

  const list = [];
  const offset = (val, mult) => val + (mult * 0.003);

  // Item 1: Forensic Report
  list.push({
    id: `EV-${caseId}-F01`,
    name: isHeinous ? `forensic_autopsy_log_${caseId}.pdf` : `chemical_analysis_report_${caseId}.pdf`,
    type: 'Forensic Reports',
    date: `${registeredDateStr} 10:15`,
    collectedBy: 'Forensic Unit #3',
    size: '1.4 MB',
    status: 'Ready',
    hash: '8A5D3F' + Math.sin(caseId + 1).toString(16).slice(2, 8).toUpperCase(),
    tags: ['autopsy', 'laboratory-log'],
    gps: { lat: offset(lat, 1), lng: offset(lng, -1) },
    device: 'NIST Spectrometer V4',
    isRestricted: false,
    isIntegrityFlagged: false,
    aiDetails: {
      ocr: 'FORENSIC TOXICOLOGY REPORT / AUTOPSY SCREENING\nCase Master ID: Ref-2026\nAnalysis results indicate trace concentrations of volatile compounds. Internal organs shows signs of acute trauma.',
      crossReference: null
    },
    chainOfCustody: [
      { date: `${registeredDateStr} 10:15`, operator: 'Forensics Specialist S. Sen', action: 'Digital file ingested & cryptographically signed', hash: 'SHA256: 8A5D3F...' },
      { date: `${registeredDateStr} 11:20`, operator: 'Integrity Daemon', action: 'SHA-256 validation check passed', hash: 'SHA256: 8A5D3F...' }
    ]
  });

  // Item 2: CCTV Video
  list.push({
    id: `EV-${caseId}-V02`,
    name: `cctv_intersection_capture_${caseId}.mp4`,
    type: 'Video',
    date: `${registeredDateStr} 14:30`,
    collectedBy: officerName,
    size: '48.1 MB',
    status: 'Under Review',
    hash: 'C5A2D8' + Math.sin(caseId + 2).toString(16).slice(2, 8).toUpperCase(),
    tags: ['cctv', 'traffic-intersection'],
    gps: { lat: offset(lat, -1), lng: offset(lng, 1) },
    device: 'Dahua Speed Dome Cam #03',
    isRestricted: false,
    isIntegrityFlagged: caseId % 13 === 0, // 13 is deterministic alert
    aiDetails: {
      detections: [
        { label: 'RED MOTORCYCLE', confidence: 91, box: { x: 140, y: 80, w: 120, h: 100 } },
        { label: 'SUSPECT LICENSE KA-03-MJ', confidence: 96, box: { x: 300, y: 120, w: 90, h: 110 } }
      ],
      crossReference: caseId % 5 === 0 ? 'Plate also matches Case #341' : null
    },
    chainOfCustody: [
      { date: `${registeredDateStr} 14:30`, operator: officerName, action: 'Ingested from junction digital feed node', hash: 'SHA256: C5A2D8...' }
    ]
  });

  // Item 3: Audio intercept/Emergency call
  list.push({
    id: `EV-${caseId}-A03`,
    name: `emergency_dispatch_112_${caseId}.wav`,
    type: 'Audio',
    date: `${registeredDateStr} 09:12`,
    collectedBy: '112 dispatch server',
    size: '3.8 MB',
    status: 'Ready',
    hash: 'F92B38' + Math.sin(caseId + 3).toString(16).slice(2, 8).toUpperCase(),
    tags: ['dispatch', '112-call'],
    gps: null,
    device: 'Telephony Voice Recording Engine',
    isRestricted: false,
    isIntegrityFlagged: false,
    aiDetails: {
      transcript: '[00:02] Caller: Send help immediately near the main junction!\n[00:07] Dispatcher: Copy that, patrol Unit-12 has been dispatched. Hold your position...',
      crossReference: null
    },
    chainOfCustody: [
      { date: `${registeredDateStr} 09:12`, operator: '112 Core System', action: 'Automated VoIP file ingestion', hash: 'SHA256: F92B38...' }
    ]
  });

  // Item 4: Call Record CSV
  list.push({
    id: `EV-${caseId}-D04`,
    name: `cdr_triangulation_log_${caseId}.csv`,
    type: 'Call Records',
    date: `${registeredDateStr} 11:45`,
    collectedBy: 'Technical Intelligence Cell',
    size: '18.4 KB',
    status: 'Pending Analysis',
    hash: 'D74B2E' + Math.sin(caseId + 4).toString(16).slice(2, 8).toUpperCase(),
    tags: ['cdr', 'cell-tower'],
    gps: null,
    device: 'CDR Parser Tool v2',
    isRestricted: false,
    isIntegrityFlagged: false,
    aiDetails: {
      ocr: 'CALL DETAIL RECORD TRANSCRIPT\nOperator: Airtel Karnataka\nTarget: IMEI-4482018820\nLinked Cells: Jayanagar-Tower-04, Koramangala-Tower-01',
      crossReference: null
    },
    chainOfCustody: [
      { date: `${registeredDateStr} 11:45`, operator: 'Inspector A. Kumar', action: 'Cellular log file imported', hash: 'SHA256: D74B2E...' }
    ]
  });

  // Item 5: Physical Evidence Image
  list.push({
    id: `EV-${caseId}-I05`,
    name: `crime_scene_exhibit_05_${caseId}.jpg`,
    type: 'Images',
    date: `${registeredDateStr} 11:00`,
    collectedBy: officerName,
    size: '3.1 MB',
    status: 'Ready',
    hash: 'E8A2F9' + Math.sin(caseId + 5).toString(16).slice(2, 8).toUpperCase(),
    tags: ['exhibit', 'crime-scene'],
    gps: { lat: lat, lng: lng },
    device: 'Nikon D7500 DSLR',
    isRestricted: false,
    isIntegrityFlagged: false,
    aiDetails: {
      detections: [
        { label: 'HANDGUN WEAPON', confidence: 94, box: { x: 180, y: 100, w: 200, h: 120 } }
      ],
      crossReference: null
    },
    chainOfCustody: [
      { date: `${registeredDateStr} 11:00`, operator: officerName, action: 'Captured and cryptographically signed', hash: 'SHA256: E8A2F9...' }
    ]
  });

  // Item 6: Restricted Juvenile statement
  list.push({
    id: `EV-${caseId}-R06`,
    name: `juvenile_complainant_statement_${caseId}.pdf`,
    type: 'Forensic Reports',
    date: `${registeredDateStr} 16:30`,
    collectedBy: 'Juvenile Justice Board Liaison',
    size: '950 KB',
    status: 'Under Review',
    hash: 'B3E8F2' + Math.sin(caseId + 6).toString(16).slice(2, 8).toUpperCase(),
    tags: ['juvenile', 'protected-identity'],
    gps: null,
    device: 'Precinct Office Document Scanner',
    isRestricted: true,
    isIntegrityFlagged: false,
    aiDetails: {
      ocr: 'RESTRICTED COMPLAINANT STATEMENT DATA. CREDENTIAL ELEVATION REQUIRED.',
      crossReference: null
    },
    chainOfCustody: [
      { date: `${registeredDateStr} 16:30`, operator: 'Liaison Officer L. Rao', action: 'Ingested under Juvenile Protection Act constraints', hash: 'SHA256: B3E8F2...' }
    ]
  });

  return list;
};

function EvidenceWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { caseId: routeCaseId } = useParams();
  const [searchParams] = useSearchParams();
  const caseId = routeCaseId || searchParams.get('caseId');
  const isWorkspaceRoute = location.pathname.startsWith('/evidence-workspace');

  const { session, isCommandMode } = useSecurity();

  // Find active case
  const activeCase = useMemo(() => {
    if (!caseId) return null;
    return caseViews.find(c => String(c.CaseMasterID) === String(caseId));
  }, [caseId]);

  // Scoped list of evidence
  const [evidenceList, setEvidenceList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  // Search/filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState('All');
  const [activeStatusFilter, setActiveStatusFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Simulated upload queue state
  const [uploadQueue, setUploadQueue] = useState([]);

  // Step-up authentication states
  const [showStepUp, setShowStepUp] = useState(false);
  const [stepUpAction, setStepUpAction] = useState(null);
  const [stepUpBadge, setStepUpBadge] = useState('');
  const [stepUpError, setStepUpError] = useState('');

  // Canvas drawing state
  const canvasRef = useRef(null);
  const [activeTool, setActiveTool] = useState('box');
  const [drawnBoxes, setDrawnBoxes] = useState({}); // mapped by evidence ID

  // Load initial dynamic evidence list
  useEffect(() => {
    if (activeCase) {
      setEvidenceList(generateEvidenceList(activeCase));
      setSelectedItem(null);
      setSelectedIds(new Set());
    }
  }, [activeCase]);

  // Check if role is authorized to perform changes
  const isAuthorized = useMemo(() => {
    if (session.accessLevel !== 'command') return false;
    if (session.role === 'State DGP Command' || session.unitName === 'State Control Room') return true;
    return activeCase && String(session.unitName).toLowerCase() === String(activeCase.policeStationName).toLowerCase();
  }, [session, activeCase]);

  // Determine if a particular item is restricted for this user
  const isItemRestricted = (item) => {
    if (!item.isRestricted) return false;
    // Gated from support roles/redacted modes
    return session.accessLevel !== 'command' || session.role === 'Support Staff';
  };

  // Filter & sort evidence
  const filteredEvidence = useMemo(() => {
    let result = [...evidenceList];

    // Search query
    if (searchQuery.trim().length >= 2) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Type filter
    if (activeTypeFilter !== 'All') {
      result = result.filter(item => item.type === activeTypeFilter);
    }

    // Status filter
    if (activeStatusFilter !== 'All') {
      result = result.filter(item => item.status === activeStatusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [evidenceList, searchQuery, activeTypeFilter, activeStatusFilter, sortField, sortDirection]);

  // Sidebar count aggregates
  const typeCounts = useMemo(() => {
    const counts = { All: evidenceList.length };
    evidenceList.forEach(item => {
      counts[item.type] = (counts[item.type] || 0) + 1;
    });
    return counts;
  }, [evidenceList]);

  // Trigger step-up modal
  const requestStepUp = (actionName, onVerified) => {
    setStepUpAction({ name: actionName, execute: onVerified });
    setStepUpBadge('');
    setStepUpError('');
    setShowStepUp(true);
  };

  const handleVerifyStepUp = (e) => {
    e.preventDefault();
    if (session.accessLevel === 'command' && stepUpBadge.trim() === session.badgeId) {
      playAlertSound(600, 0.05);
      stepUpAction.execute();
      setShowStepUp(false);
    } else if (session.accessLevel !== 'command' && stepUpBadge.trim().length >= 4) {
      // Allow simulation in redacted mode for testing
      playAlertSound(600, 0.05);
      stepUpAction.execute();
      setShowStepUp(false);
    } else {
      playAlertSound(300, 0.15);
      setStepUpError('Re-authentication failed. Incorrect Badge ID.');
    }
  };

  // Log audit event to a specific item
  const logCustodyEvent = (itemId, action) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const operator = session.officerName || 'Guest Analyst';
    const newLog = {
      date: timestamp,
      operator: operator,
      action: action,
      hash: 'SHA256: ' + Math.random().toString(16).slice(2, 8).toUpperCase() + '...'
    };

    setEvidenceList(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          chainOfCustody: [newLog, ...item.chainOfCustody]
        };
      }
      return item;
    }));

    // Update active selection to show updated logs instantly
    setSelectedItem(prev => {
      if (prev && prev.id === itemId) {
        return {
          ...prev,
          chainOfCustody: [newLog, ...prev.chainOfCustody]
        };
      }
      return prev;
    });
  };

  // Upload simulation queue
  const triggerMockUpload = () => {
    if (!isAuthorized) return;
    playAlertSound(600, 0.05);
    const fileName = prompt('Enter filename to ingest into evidence room:', 'dashboard_cctv_capture.png');
    if (!fileName) return;

    const fileType = fileName.endsWith('.pdf') || fileName.endsWith('.docx') ? 'Forensic Reports' : 
                     fileName.endsWith('.mp3') || fileName.endsWith('.wav') ? 'Audio' :
                     fileName.endsWith('.mp4') ? 'Video' : 'Images';

    const uploadId = `UP-${Date.now()}`;
    const newQueueRow = { id: uploadId, name: fileName, progress: 0, failed: false, type: fileType };

    setUploadQueue(prev => [...prev, newQueueRow]);

    // Tick progress simulation
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setUploadQueue(prev => prev.map(q => {
        if (q.id === uploadId) return { ...q, progress };
        return q;
      }));

      if (progress >= 100) {
        clearInterval(interval);
        // Append item to primary list
        const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 10);
        const newItem = {
          id: `EV-${activeCase.CaseMasterID}-U${Date.now().toString().slice(-3)}`,
          name: fileName,
          type: fileType,
          date: `${dateStr} ${new Date().toLocaleTimeString('en-IN', { hour12: false }).slice(0, 5)}`,
          collectedBy: session.officerName || 'Duty Officer',
          size: '3.4 MB',
          status: 'Pending Analysis',
          hash: 'SHA256: ' + Math.random().toString(16).slice(2, 8).toUpperCase(),
          tags: ['uploaded', 'ingested'],
          gps: { lat: activeCase.latitude, lng: activeCase.longitude },
          device: 'System Upload Portal',
          isRestricted: false,
          isIntegrityFlagged: false,
          aiDetails: { ocr: 'UPLOADED EXHBIT OCR LOGS', crossReference: null },
          chainOfCustody: [
            { date: `${dateStr} ${new Date().toLocaleTimeString('en-IN', { hour12: false }).slice(0, 5)}`, operator: session.officerName || 'Duty Officer', action: 'Ingested and registered via Portal upload', hash: 'SHA256: ...' }
          ]
        };

        setEvidenceList(prev => [newItem, ...prev]);
        setUploadQueue(prev => prev.filter(q => q.id !== uploadId));
        playAlertSound(600, 0.05);
      }
    }, 600);
  };

  // Row selection
  const handleSelectItem = (item) => {
    if (isItemRestricted(item)) {
      playAlertSound(300, 0.15);
      return;
    }
    playAlertSound(600, 0.05);
    setSelectedItem(item);
    logCustodyEvent(item.id, 'Metadata log accessed');
  };

  // Add notes audit trigger
  const handleAddNote = () => {
    if (!isAuthorized) return;
    const note = prompt('Enter investigator custody note:');
    if (note) {
      logCustodyEvent(selectedItem.id, `Investigator Note added: "${note}"`);
    }
  };

  // Tag edit trigger
  const handleAddTag = () => {
    if (!isAuthorized) return;
    const tag = prompt('Enter tag category to apply:');
    if (tag) {
      const formatted = tag.toLowerCase().trim();
      setEvidenceList(prev => prev.map(item => {
        if (item.id === selectedItem.id) {
          return { ...item, tags: [...item.tags, formatted] };
        }
        return item;
      }));
      setSelectedItem(prev => ({ ...prev, tags: [...prev.tags, formatted] }));
      logCustodyEvent(selectedItem.id, `Added metadata tag: "${formatted}"`);
    }
  };

  // Court Approval
  const handleApproveCourt = () => {
    if (!isAuthorized) return;
    requestStepUp('Approve evidence for court presentation', () => {
      setEvidenceList(prev => prev.map(item => {
        if (item.id === selectedItem.id) {
          return { ...item, status: 'Ready' };
        }
        return item;
      }));
      setSelectedItem(prev => ({ ...prev, status: 'Ready' }));
      logCustodyEvent(selectedItem.id, 'Evidence approved for court registry');
    });
  };

  // Release to Prosecutor
  const handleReleaseProsecutor = () => {
    if (!isAuthorized) return;
    requestStepUp('Release evidence package to Prosecutor portal', () => {
      setEvidenceList(prev => prev.map(item => {
        if (item.id === selectedItem.id) {
          return { ...item, status: 'Ready' }; // updates status
        }
        return item;
      }));
      setSelectedItem(prev => ({ ...prev, status: 'Ready' }));
      logCustodyEvent(selectedItem.id, 'Released and transferred to Prosecutor Portal (AES-256 handshake)');
    });
  };

  // Download trigger with immediate log
  const handleDownloadFile = (item) => {
    playAlertSound(800, 0.05);
    logCustodyEvent(item.id, 'Asset copy downloaded (Audit logs updated)');
    alert(`Audit entry recorded. Tamper-evident download package generated:\nFile: ${item.name}\nHash: ${item.hash}`);
  };

  // Deletion trigger with step up re-auth
  const handleDeleteFile = (item) => {
    if (!isAuthorized) return;
    const reason = prompt('Specify operational reason for purging this file from CCTNS catalog (this action is irreversible):');
    if (!reason) return;

    requestStepUp('Purge and delete case evidence file', () => {
      playAlertSound(300, 0.2);
      setEvidenceList(prev => prev.filter(f => f.id !== item.id));
      if (selectedItem && selectedItem.id === item.id) {
        setSelectedItem(null);
      }
      alert(`Purged log entry committed to audit registry. File catalog records updated.`);
    });
  };

  // Export Bundle with Custody
  const handleExportChainOfCustody = () => {
    playAlertSound(800, 0.05);
    if (selectedIds.size === 0) {
      alert('Please check one or more files in the table to export.');
      return;
    }
    const items = evidenceList.filter(f => selectedIds.has(f.id));
    items.forEach(item => {
      logCustodyEvent(item.id, 'Exported to external Court Evidence Package');
    });
    alert(`Generated Court Package containing ${items.length} files. Monospace chain-of-custody transfer records compiled.`);
  };

  // Canvas drawing annotations handler
  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !selectedItem) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (activeTool === 'box') {
      playAlertSound(700, 0.05);
      const labelText = prompt('Enter annotation target name:');
      if (labelText) {
        const newBox = {
          id: Date.now(),
          x: clickX - 40,
          y: clickY - 40,
          w: 80,
          h: 80,
          label: labelText.toUpperCase()
        };

        setDrawnBoxes(prev => {
          const caseBoxes = prev[selectedItem.id] || [];
          return {
            ...prev,
            [selectedItem.id]: [...caseBoxes, newBox]
          };
        });

        logCustodyEvent(selectedItem.id, `Created target canvas vector box: "${labelText.toUpperCase()}"`);
      }
    }
  };

  // Draw overlay canvas loop
  useEffect(() => {
    if (!canvasRef.current || !selectedItem || selectedItem.type !== 'Images') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear and redraw background placeholder image
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'rgba(77, 163, 214, 0.15)';
    ctx.strokeStyle = '#4da3d6';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Draw active bounding box annotations
    const currentBoxes = drawnBoxes[selectedItem.id] || [];
    currentBoxes.forEach(box => {
      ctx.strokeStyle = '#ff4d4d'; // warning red
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.w, box.h);

      ctx.fillStyle = '#ff4d4d';
      ctx.font = '10px Consolas, monospace';
      ctx.fillRect(box.x, box.y - 16, ctx.measureText(box.label).width + 10, 16);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(box.label, box.x + 5, box.y - 5);
    });

    // Draw static preset AI detections if image is item 2 (CCTV)
    if (selectedItem.id.endsWith('V02') && selectedItem.aiDetails.detections) {
      selectedItem.aiDetails.detections.forEach(det => {
        ctx.strokeStyle = '#39e639'; // success green
        ctx.lineWidth = 2;
        ctx.strokeRect(det.box.x, det.box.y, det.box.w, det.box.h);

        ctx.fillStyle = '#39e639';
        ctx.font = '10px Consolas, monospace';
        ctx.fillRect(det.box.x, det.box.y - 16, ctx.measureText(det.label).width + 20, 16);

        ctx.fillStyle = '#0a0e17';
        ctx.fillText(`${det.label} (${det.confidence}%)`, det.box.x + 5, det.box.y - 5);
      });
    }
  }, [selectedItem, drawnBoxes, activeTool]);

  return (
    <div className="page-content evidence-workspace text-inverse">
      <style>{`
        .evidence-workspace {
          font-family: 'Public Sans', sans-serif !important;
        }
        .evidence-workspace input,
        .evidence-workspace button,
        .evidence-workspace select,
        .evidence-workspace strong,
        .evidence-workspace span,
        .evidence-workspace div,
        .evidence-workspace th,
        .evidence-workspace td {
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
          border-radius: 99px !important; /* badges can remain round pills */
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-badge.ready { background: rgba(57, 230, 57, 0.15); color: var(--accent-success); }
        .status-badge.under-review { background: rgba(77, 163, 214, 0.15); color: var(--accent-primary); }
        .status-badge.pending-analysis { background: rgba(255, 167, 38, 0.15); color: var(--accent-warning); }
        
        /* Table styles */
        .flat-table {
          width: 100%;
          border-collapse: collapse;
        }
        .flat-table th {
          text-transform: uppercase;
          font-size: 11px;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-color);
          padding: 10px 8px;
          text-align: left;
          letter-spacing: 0.05em;
        }
        .flat-table td {
          padding: 12px 8px;
          border-bottom: 1px solid var(--border-color);
          font-size: 13px;
          color: var(--text-secondary);
        }
        .flat-table tr:hover td {
          background-color: var(--bg-panel-alt) !important;
        }
        .flat-table tr.selected td {
          background-color: rgba(77, 163, 214, 0.08) !important;
          color: var(--text-primary);
        }
        .flat-table tr.restricted td {
          opacity: 0.5;
        }

        /* Sidebar navigation */
        .filter-btn {
          width: 100%;
          text-align: left;
          padding: 8px 12px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 13px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .filter-btn:hover, .filter-btn.active {
          background: var(--bg-panel-alt);
          color: var(--text-primary);
        }

        /* Waveform layout */
        .waveform-container {
          display: flex;
          align-items: center;
          gap: 2px;
          height: 60px;
          background: #0B0E11;
          padding: 10px;
          border: 1px solid var(--border-color);
        }
        .waveform-bar {
          flex: 1;
          background: var(--accent-primary);
          opacity: 0.5;
          transition: height 0.1s ease;
        }
        .waveform-bar.active {
          background: var(--accent-success);
        }

        /* Split panes */
        .viewer-split {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
          border-top: 1px solid var(--border-color);
          padding-top: 24px;
          margin-top: 24px;
        }

        /* Stats metrics grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid var(--border-color);
          margin-bottom: 24px;
        }
        .metric-block {
          padding: 14px 16px;
          background: transparent;
        }
        .metric-block:not(:last-child) {
          border-right: 1px solid var(--border-color);
        }
        .metric-val {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          display: block;
        }
        .metric-lbl {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          display: block;
          margin-top: 4px;
        }
      `}</style>

      {/* TOP STRIP (BREADCRUMB & SEARCH & ACTIONS) */}
      <div className="flat-section" style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          {/* breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate(caseId ? (isWorkspaceRoute ? `/case-overview/${caseId}` : `/cases/${caseId}`) : '/cases')}>
              Case Overview
            </span>
            <span>/</span>
            {activeCase ? (
              <span style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => navigate(isWorkspaceRoute ? `/case-overview/${caseId}` : `/cases/${caseId}`)}>
                {activeCase.displayCrimeNo || `FIR-${activeCase.CaseMasterID}`} : {activeCase.minorHeadName || activeCase.majorHeadName}
              </span>
            ) : (
              <span>FIR-REDATED</span>
            )}
            <span>/</span>
            <span style={{ color: 'var(--text-primary)' }}>Evidence Workspace</span>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Search within this case files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '13px'
            }}
          />
          <MdSearch size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
        </div>

        {/* TOP ACTIONS */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            disabled={!isAuthorized}
            onClick={triggerMockUpload}
            style={{
              padding: '0 16px',
              fontSize: '13px',
              fontWeight: '600',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-strong)',
              color: isAuthorized ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: isAuthorized ? 'pointer' : 'not-allowed',
              opacity: isAuthorized ? 1 : 0.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '40px'
            }}
          >
            <MdCloudUpload size={16} /> Upload Evidence
          </button>

          <button
            onClick={handleExportChainOfCustody}
            style={{
              padding: '0 16px',
              fontSize: '13px',
              fontWeight: '600',
              background: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '40px'
            }}
          >
            <MdAssignment size={16} /> Export with Custody
          </button>
        </div>
      </div>

      {/* METRICS & UPLOAD QUEUE STRIP */}
      {uploadQueue.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border-color)', padding: '12px 0' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>ACTIVE FILE INGESTION QUEUE</span>
          {uploadQueue.map(q => (
            <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🗄️ {q.name}</span>
              <div style={{ flex: 1, background: 'var(--bg-panel-alt)', height: '4px', position: 'relative' }}>
                <div style={{ background: 'var(--accent-success)', width: `${q.progress}%`, height: '100%' }} />
              </div>
              <span>{q.progress}% Ingested</span>
            </div>
          ))}
        </div>
      )}

      {/* STAT TILES */}
      <div className="metrics-grid" style={{ marginTop: '20px' }}>
        <div className="metric-block">
          <strong className="metric-val">{evidenceList.length}</strong>
          <span className="metric-lbl">Total Mapped Exhibits</span>
        </div>
        <div className="metric-block">
          <strong className="metric-val">{evidenceList.filter(e => e.status === 'Ready').length}</strong>
          <span className="metric-lbl">Approved For Trial</span>
        </div>
        <div className="metric-block">
          <strong className="metric-val">{evidenceList.filter(e => e.status === 'Pending Analysis').length}</strong>
          <span className="metric-lbl">Pending Forensic Analysis</span>
        </div>
        <div className="metric-block">
          <strong className="metric-val" style={{ color: 'var(--accent-danger)' }}>
            {evidenceList.filter(e => e.isIntegrityFlagged).length}
          </strong>
          <span className="metric-lbl">Integrity Warnings Flagged</span>
        </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div style={{ display: 'flex', gap: '30px', minHeight: '500px' }}>
        
        {/* LEFT COLUMN: FILTERS SIDEBAR */}
        <div style={{ width: '220px', borderRight: '1px solid var(--border-color)', paddingRight: '20px' }}>
          
          {/* EVIDENCE TYPE FILTERS */}
          <div style={{ marginBottom: '24px' }}>
            <span className="section-label">Evidence Categories</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {['All', 'Images', 'Video', 'Audio', 'Call Records', 'Forensic Reports'].map(type => (
                <button
                  key={type}
                  className={`filter-btn ${activeTypeFilter === type ? 'active' : ''}`}
                  onClick={() => {
                    playAlertSound(600, 0.05);
                    setActiveTypeFilter(type);
                  }}
                >
                  <span>{type}</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>({typeCounts[type] || 0})</span>
                </button>
              ))}
            </div>
          </div>

          {/* STATUS FILTERS */}
          <div style={{ marginBottom: '24px' }}>
            <span className="section-label">Locker Status</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {['All', 'Pending Analysis', 'Under Review', 'Ready'].map(status => (
                <button
                  key={status}
                  className={`filter-btn ${activeStatusFilter === status ? 'active' : ''}`}
                  onClick={() => {
                    playAlertSound(600, 0.05);
                    setActiveStatusFilter(status);
                  }}
                >
                  <span>{status}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ACCESS CREDENTIALS SUMMARY */}
          <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>OPERATIONAL AUDIT SESSION</span>
            <div style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>
              Officer: <strong>{session.officerName || 'Guest Analyst'}</strong><br/>
              Unit: <strong>{session.unitName || 'State Control Room'}</strong>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: MAIN TABLE & TWO-PANE PREVIEW */}
        <div style={{ flex: 1 }}>
          
          {/* EVIDENCE LIST TABLE */}
          {filteredEvidence.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
              No digital evidence items registered matching active filters.
            </div>
          ) : (
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
              <table className="flat-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredEvidence.length && filteredEvidence.length > 0}
                        onChange={() => {
                          playAlertSound(600, 0.05);
                          if (selectedIds.size === filteredEvidence.length) {
                            setSelectedIds(new Set());
                          } else {
                            setSelectedIds(new Set(filteredEvidence.map(item => item.id)));
                          }
                        }}
                      />
                    </th>
                    <th style={{ width: '40px' }}></th>
                    <th style={{ cursor: 'pointer' }} onClick={() => { setSortField('name'); setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); }}>File Name</th>
                    <th>Type</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => { setSortField('date'); setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); }}>Date Collected</th>
                    <th>Collected By</th>
                    <th>Tags</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Chain of Custody</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvidence.map(item => {
                    const isRestricted = isItemRestricted(item);
                    const isSelected = selectedItem && selectedItem.id === item.id;
                    const isChecked = selectedIds.has(item.id);

                    // Type icon helper
                    const getTypeIcon = (type) => {
                      switch (type) {
                        case 'Images': return <MdPhoto size={16} style={{ color: 'var(--accent-success)' }} />;
                        case 'Video': return <MdVideocam size={16} style={{ color: 'var(--accent-primary)' }} />;
                        case 'Audio': return <MdSettingsVoice size={16} style={{ color: 'var(--accent-warning)' }} />;
                        default: return <MdInsertDriveFile size={16} style={{ color: 'var(--text-muted)' }} />;
                      }
                    };

                    return (
                      <tr
                        key={item.id}
                        className={`${isSelected ? 'selected' : ''} ${isRestricted ? 'restricted' : ''}`}
                        style={{ cursor: isRestricted ? 'not-allowed' : 'pointer' }}
                        onClick={() => handleSelectItem(item)}
                      >
                        <td onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isRestricted}
                            onChange={() => {
                              playAlertSound(600, 0.05);
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                if (next.has(item.id)) {
                                  next.delete(item.id);
                                } else {
                                  next.add(item.id);
                                }
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td>{getTypeIcon(item.type)}</td>
                        <td style={{ fontWeight: 'bold' }}>
                          {isRestricted ? 'Access restricted — Contact SP/SCRB' : item.name}
                        </td>
                        <td>{item.type}</td>
                        <td>{item.date}</td>
                        <td>{item.collectedBy}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {item.tags.slice(0, 2).map((t, i) => (
                              <span key={i} style={{ fontSize: '9px', background: 'var(--bg-panel-alt)', border: '1px solid var(--border-color)', padding: '1px 4px' }}>{t}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${item.status.toLowerCase().replace(/ /g, '-')}`}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {item.isIntegrityFlagged ? (
                            <MdWarning size={18} style={{ color: 'var(--accent-danger)' }} title="Tamper Anomaly Detected" />
                          ) : (
                            <MdSecurity size={18} style={{ color: 'var(--accent-success)' }} title="SHA-256 Verified" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TWO-PANE EXPANSION VIEW (ON ROW CLICK) */}
          {selectedItem && (
            <div className="viewer-split">
              
              {/* LEFT PANE: INTERACTIVE PLAYER & ANNOTATIONS */}
              <div>
                <span className="section-label">EXHIBIT INTERACTIVE VIEWER</span>
                
                {/* Annotations bar */}
                <div style={{ display: 'flex', gap: '10px', background: 'var(--bg-panel-alt)', padding: '8px 12px', border: '1px solid var(--border-color)', borderBottom: 'none' }}>
                  <button
                    onClick={() => setActiveTool('box')}
                    className={`session-btn ${activeTool === 'box' ? 'primary' : ''}`}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      background: activeTool === 'box' ? 'var(--accent-primary)' : 'transparent',
                      color: activeTool === 'box' ? '#fff' : 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      minHeight: '30px',
                      minWidth: 'auto'
                    }}
                  >
                    Target Box Tool
                  </button>
                  <button
                    onClick={() => {
                      playAlertSound(300, 0.1);
                      setDrawnBoxes(prev => ({ ...prev, [selectedItem.id]: [] }));
                    }}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      background: 'transparent',
                      color: 'var(--accent-danger)',
                      border: '1px solid var(--accent-danger)',
                      minHeight: '30px',
                      minWidth: 'auto'
                    }}
                  >
                    Reset Overlays
                  </button>
                </div>

                {/* Media preview render by type */}
                {selectedItem.type === 'Images' && (
                  <div style={{ background: '#09121d', padding: '20px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
                    <canvas
                      ref={canvasRef}
                      width={480}
                      height={280}
                      onClick={handleCanvasClick}
                      style={{ background: '#02070e', cursor: 'crosshair', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                    />
                  </div>
                )}

                {selectedItem.type === 'Video' && (
                  <div style={{ background: '#0a0e17', padding: '20px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ width: '100%', height: '240px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', position: 'relative' }}>
                      <span>🎬 Mapped Video Playback Stream [{selectedItem.name}]</span>
                      <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', padding: '6px', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>⏱️ SECURE TIME: 14:32:01.04</span>
                        <span>0:00 / 2:40</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedItem.type === 'Audio' && (
                  <div style={{ background: '#0a0e17', padding: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="waveform-container">
                      {[15, 25, 45, 12, 48, 30, 22, 10, 52, 60, 40, 28, 12, 45, 30, 20, 15, 5, 20, 35, 50, 60, 30, 22, 10].map((h, idx) => (
                        <div key={idx} className="waveform-bar" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span>Dispatch Audio Recording</span>
                      <span>00:15 / 01:24</span>
                    </div>
                  </div>
                )}

                {(selectedItem.type === 'Forensic Reports' || selectedItem.type === 'Call Records') && (
                  <div style={{ background: '#0a0e17', padding: '16px', border: '1px solid var(--border-color)', maxHeight: '280px', overflowY: 'auto' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      {selectedItem.aiDetails.ocr || selectedItem.aiDetails.ocr}
                    </pre>
                  </div>
                )}

                {/* AI TRANSCRIPT OR DETECTIONS */}
                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(77, 163, 214, 0.05)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: '6px' }}>AI-ASSIST ANALYSIS</div>
                  {selectedItem.aiDetails.ocr && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong>OCR Extracted Text:</strong>
                      <p style={{ margin: '4px 0 0', fontStyle: 'italic' }}>"{selectedItem.aiDetails.ocr.slice(0, 150)}..."</p>
                    </div>
                  )}
                  {selectedItem.aiDetails.transcript && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong>Clickable Transcript Sync:</strong>
                      <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>{selectedItem.aiDetails.transcript}</pre>
                    </div>
                  )}
                  {selectedItem.aiDetails.detections && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong>Object Detections Overlay:</strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
                        {selectedItem.aiDetails.detections.map((det, i) => (
                          <li key={i}>{det.label} — Confidence {det.confidence}%</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedItem.aiDetails.crossReference && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--accent-danger)', fontWeight: 'bold' }}>
                      ⚠️ CROSS REFERENCE: {selectedItem.aiDetails.crossReference}
                    </div>
                  )}
                </div>

              </div>

              {/* RIGHT PANE: METADATA & CHAIN OF CUSTODY LOG */}
              <div>
                <span className="section-label">METADATA & CUSTODY LOG</span>
                
                {/* Core Properties */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Evidence ID</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedItem.id}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>SHA-256 Integrity Hash</span>
                    <strong style={{ color: 'var(--accent-success)', fontSize: '11px' }}>
                      {selectedItem.hash} 
                      <button
                        onClick={() => { playAlertSound(600, 0.05); navigator.clipboard.writeText(selectedItem.hash); alert('Hash copied'); }}
                        style={{ border: 'none', background: 'transparent', color: 'var(--accent-primary)', marginLeft: '6px', cursor: 'pointer', minHeight: 'auto', minWidth: 'auto' }}
                      >
                        <MdContentCopy size={12} />
                      </button>
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>File size / Device</span>
                    <strong>{selectedItem.size} / {selectedItem.device}</strong>
                  </div>
                  {selectedItem.isIntegrityFlagged && (
                    <div style={{ color: 'var(--accent-danger)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <MdWarning />
                      <span>Tamper Signal: Hash timestamp inconsistency flagged in file header!</span>
                    </div>
                  )}
                </div>

                {/* GEOTAG MINI MAP */}
                {selectedItem.gps && (
                  <div style={{ margin: '16px 0' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Incident Geotag scene mapping</span>
                    <div className="map-panel" style={{ height: '140px', width: '100%', position: 'relative', background: '#09121d' }}>
                      <MapContainer
                        key={selectedItem.id}
                        center={[selectedItem.gps.lat, selectedItem.gps.lng]}
                        zoom={14}
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
                        <CircleMarker
                          center={[selectedItem.gps.lat, selectedItem.gps.lng]}
                          radius={6}
                          fillColor="var(--accent-primary)"
                          color="#fff"
                          weight={2}
                          fillOpacity={0.8}
                        >
                          <Tooltip permanent direction="top" offset={[0, -6]}>
                            <strong>Locality: {activeCase ? getLocality(activeCase) : 'Collected Spot'}</strong>
                          </Tooltip>
                        </CircleMarker>
                      </MapContainer>
                    </div>
                  </div>
                )}

                {/* CHAIN OF CUSTODY LOG */}
                <div style={{ marginTop: '16px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Chain-Of-Custody Transfer Trail</span>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', background: 'var(--bg-panel-alt)', padding: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedItem.chainOfCustody.map((log, idx) => (
                        <div key={idx} style={{ fontSize: '11px', borderBottom: idx < selectedItem.chainOfCustody.length - 1 ? '1px dashed var(--border-color)' : 'none', paddingBottom: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                            <span>{log.operator}</span>
                            <span>{log.date}</span>
                          </div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>{log.action}</span>
                          <span style={{ color: 'var(--accent-primary)', fontSize: '9px', display: 'block', marginTop: '2px' }}>🔑 {log.hash}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* METADATA TAGS */}
                <div style={{ marginTop: '16px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Metadata Tags</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    {selectedItem.tags.map((t, idx) => (
                      <span key={idx} className="badge" style={{ background: 'var(--bg-panel-alt)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '10px', padding: '2px 8px', borderRadius: '99px' }}>
                        {t}
                      </span>
                    ))}
                    {isAuthorized && (
                      <button
                        onClick={handleAddTag}
                        style={{ border: 'none', background: 'transparent', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '2px', cursor: 'pointer', fontSize: '11px', minHeight: 'auto', minWidth: 'auto' }}
                      >
                        <MdAdd /> Tag
                      </button>
                    )}
                  </div>
                </div>

                {/* PREVIEW PANEL ACTIONS ROW */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                  <button
                    disabled={!isAuthorized}
                    onClick={handleApproveCourt}
                    className="session-btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border-color)',
                      color: isAuthorized ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: isAuthorized ? 'pointer' : 'not-allowed',
                      opacity: isAuthorized ? 1 : 0.5,
                      minHeight: '32px',
                      minWidth: 'auto'
                    }}
                  >
                    Court Approval
                  </button>

                  <button
                    disabled={!isAuthorized}
                    onClick={handleReleaseProsecutor}
                    className="session-btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border-color)',
                      color: isAuthorized ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: isAuthorized ? 'pointer' : 'not-allowed',
                      opacity: isAuthorized ? 1 : 0.5,
                      minHeight: '32px',
                      minWidth: 'auto'
                    }}
                  >
                    Release to Prosecutor
                  </button>

                  <button
                    disabled={!isAuthorized}
                    onClick={handleAddNote}
                    className="session-btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border-color)',
                      color: isAuthorized ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: isAuthorized ? 'pointer' : 'not-allowed',
                      opacity: isAuthorized ? 1 : 0.5,
                      minHeight: '32px',
                      minWidth: 'auto'
                    }}
                  >
                    Add Notes
                  </button>

                  <button
                    onClick={() => handleDownloadFile(selectedItem)}
                    className="session-btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      minHeight: '32px',
                      minWidth: 'auto'
                    }}
                  >
                    Download
                  </button>

                  <button
                    disabled={!isAuthorized}
                    onClick={() => handleDeleteFile(selectedItem)}
                    className="session-btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      background: 'transparent',
                      border: '1px solid var(--accent-danger)',
                      color: 'var(--accent-danger)',
                      cursor: isAuthorized ? 'pointer' : 'not-allowed',
                      opacity: isAuthorized ? 1 : 0.5,
                      minHeight: '32px',
                      minWidth: 'auto'
                    }}
                  >
                    Purge Exhibit
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>

      {/* STEP-UP AUTHENTICATION DIALOG MODAL */}
      {showStepUp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-strong)', padding: '24px', width: '340px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-danger)', marginBottom: '14px' }}>
              <MdLock size={20} />
              <strong style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step-Up Authorization Required</strong>
            </div>
            
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Action: <strong style={{ color: 'var(--text-primary)' }}>{stepUpAction?.name}</strong><br/>
              Enter your secure Badge ID to commit this transaction to CCTNS audit trail.
            </p>

            <form onSubmit={handleVerifyStepUp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="password"
                placeholder="Enter Badge ID"
                value={stepUpBadge}
                onChange={e => setStepUpBadge(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--bg-panel-alt)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                  fontSize: '13px'
                }}
                autoFocus
              />
              
              {stepUpError && (
                <span style={{ fontSize: '11px', color: 'var(--accent-danger)' }}>{stepUpError}</span>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowStepUp(false)}
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
                  Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default EvidenceWorkspace;
