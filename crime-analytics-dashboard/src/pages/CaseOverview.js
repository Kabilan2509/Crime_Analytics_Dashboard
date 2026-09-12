import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  MdFolder, MdInsertDriveFile, MdLaunch, MdSearch, MdLock,
  MdLocationOn, MdArrowBack, MdPerson, MdPeople, MdHistory,
  MdDescription, MdRefresh, MdShare, MdCloudUpload, MdAssignment,
  MdCheckCircle, MdChevronRight, MdSupervisorAccount
} from 'react-icons/md';
import { MapContainer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ThemeAwareTileLayer from '../components/ui/ThemeAwareTileLayer';

import { caseViews } from '../data/schemaSelectors';
import { playAlertSound } from '../utils/audioAlert';
import { accused, victims, complainantDetails } from '../data/sampleData';
import { useSecurity } from '../context/SecurityContext';
import { getSecureCaseViews } from '../security/securityUtils';
import { findSimilarCases } from '../utils/similarityEngine';

// Helper function to check if a case is restricted for the current officer session
const checkIsCaseRestricted = (c, session) => {
  if (session.accessLevel !== 'command') {
    return false; // Under redacted analyst mode, see cases but with masked values (handled by getSecureCaseViews)
  }
  
  const officerUnit = session.unitName ? session.unitName.toLowerCase().trim() : '';
  if (!officerUnit || officerUnit === 'state control room' || officerUnit === 'command center') {
    return false; // DGP/State Command has access to all districts/units
  }

  const caseStation = c.policeStationName ? c.policeStationName.toLowerCase().trim() : '';
  const caseDistrict = c.districtName ? c.districtName.toLowerCase().trim() : '';

  // Check matches
  const matchStation = caseStation.includes(officerUnit) || officerUnit.includes(caseStation);
  const matchDistrict = caseDistrict.includes(officerUnit) || officerUnit.includes(caseDistrict);
  
  return !(matchStation || matchDistrict);
};

// Deterministic locality reverse geocoding function
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
  
  if (!c.latitude || !c.longitude) return '';

  const facts = (c.briefFacts || c.BriefFacts || '').toLowerCase();
  const matchedLocality = localities.find(loc => facts.includes(loc.toLowerCase()));
  if (matchedLocality) return matchedLocality;

  // Deterministic hash based on coords + Case ID
  const hash = Math.abs(Math.round((c.latitude + c.longitude) * 10000) + Number(c.CaseMasterID)) % localities.length;
  return localities[hash];
};

function CaseOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { caseId: routeCaseId } = useParams();
  const [searchParams] = useSearchParams();
  const caseIdParam = routeCaseId || searchParams.get('caseId');
  const isCaseOverviewRoute = location.pathname.startsWith('/case-overview') || location.pathname.includes('case-overview');

  const { session, isCommandMode } = useSecurity();
  const secureCases = useMemo(
    () => getSecureCaseViews(caseViews, session.accessLevel),
    [session.accessLevel]
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Active case state
  const [activeCase, setActiveCase] = useState(null);
  const [isRestrictedDirect, setIsRestrictedDirect] = useState(false);

  // Status updating state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [tempStatus, setTempStatus] = useState('');
  const [caseStatuses, setCaseStatuses] = useState({});

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const focusQuickLookup = () => {
      window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setShowDropdown(true);
      });
    };

    if (searchParams.get('quickLookup') === '1') focusQuickLookup();
    window.addEventListener('open-quick-lookup', focusQuickLookup);
    return () => window.removeEventListener('open-quick-lookup', focusQuickLookup);
  }, [searchParams]);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch recent cases list helper
  const recentCasesList = useMemo(() => {
    const key = `ksp-recent-cases-${session.badgeId || 'guest'}`;
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }, [session.badgeId, activeCase]);

  // Add to recent cases list helper
  const addToRecentCases = (c) => {
    const key = `ksp-recent-cases-${session.badgeId || 'guest'}`;
    try {
      const saved = localStorage.getItem(key);
      let list = saved ? JSON.parse(saved) : [];
      list = list.filter(item => String(item.CaseMasterID) !== String(c.CaseMasterID));
      list.unshift({
        CaseMasterID: c.CaseMasterID,
        displayCrimeNo: c.displayCrimeNo || `FIR-${c.CaseMasterID}`,
        CrimeNo: c.CrimeNo,
        minorHeadName: c.minorHeadName || c.majorHeadName || 'Crime Case'
      });
      list = list.slice(0, 5);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      // ignore
    }
  };

  // Perform search with tiers
  const performSearch = (qStr) => {
    const q = qStr.toLowerCase().trim();
    if (q.length < 2) return [];

    const matched = [];

    secureCases.forEach((c) => {
      const caseIdStr = String(c.CaseMasterID);
      const crimeNoStr = String(c.CrimeNo).toLowerCase();
      const caseNoStr = c.CaseNo ? String(c.CaseNo).toLowerCase() : '';
      const displayCrimeNo = (c.displayCrimeNo || `FIR-${c.CaseMasterID}`).toLowerCase();
      
      // Tier 1: Exact Case ID or exact FIR match
      const isExactId = caseIdStr === q;
      const isExactFir = crimeNoStr === q || caseNoStr === q || displayCrimeNo === q;
      if (isExactId || isExactFir) {
        matched.push({ case: c, tier: 1 });
        return;
      }

      // Tier 2: Partial ID or FIR match
      const isPartialId = caseIdStr.includes(q);
      const isPartialFir = crimeNoStr.includes(q) || caseNoStr.includes(q) || displayCrimeNo.includes(q);
      if (isPartialId || isPartialFir) {
        matched.push({ case: c, tier: 2 });
        return;
      }

      // Tier 3: Suspect or victim name match
      const hasSuspectName = c.accused && c.accused.some(
        a => a.AccusedName && a.AccusedName.toLowerCase().includes(q)
      );
      const hasVictimName = c.victims && c.victims.some(
        v => v.VictimName && v.VictimName.toLowerCase().includes(q)
      );
      if (hasSuspectName || hasVictimName) {
        matched.push({ case: c, tier: 3 });
        return;
      }

      // Tier 4: Case title keyword match
      const titleStr = `${c.minorHeadName || ''} ${c.majorHeadName || ''}`.toLowerCase();
      const summaryStr = (c.briefFacts || c.BriefFacts || '').toLowerCase();
      if (titleStr.includes(q) || summaryStr.includes(q)) {
        matched.push({ case: c, tier: 4 });
      }
    });

    // Sort: tier ascending, registered date descending
    matched.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      
      const timeA = a.case.registeredDateObj ? a.case.registeredDateObj.getTime() : 0;
      const timeB = b.case.registeredDateObj ? b.case.registeredDateObj.getTime() : 0;
      return timeB - timeA;
    });

    return matched.map(m => m.case);
  };

  // Run mock search API request with latency and failure chance
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSearchResults([]);
      setHighlightedIndex(-1);
      return;
    }

    setIsSearching(true);
    setApiError(null);
    setHighlightedIndex(-1);

    const timer = setTimeout(() => {
      // 5% chance of mock API failure for demonstration
      const shouldFail = Math.random() < 0.05;
      if (shouldFail) {
        setApiError('Search service timeout');
        setIsSearching(false);
      } else {
        const results = performSearch(debouncedQuery);
        setSearchResults(results);
        setIsSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [debouncedQuery]);

  // Run initial case lookup when caseIdParam changes in URL
  useEffect(() => {
    if (caseIdParam) {
      const foundCase = secureCases.find(c => String(c.CaseMasterID) === String(caseIdParam));
      if (foundCase) {
        const restricted = checkIsCaseRestricted(foundCase, session);
        setIsRestrictedDirect(restricted);
        if (!restricted) {
          setActiveCase(foundCase);
          addToRecentCases(foundCase);
          setTempStatus(caseStatuses[foundCase.CaseMasterID] || foundCase.statusName || 'Under Investigation');
        } else {
          setActiveCase(foundCase);
        }
      } else {
        setActiveCase(null);
        setIsRestrictedDirect(false);
      }
    } else {
      setActiveCase(null);
      setIsRestrictedDirect(false);
    }
  }, [caseIdParam, session.unitName, session.accessLevel, secureCases]);

  const triggerRetry = () => {
    playAlertSound(700, 0.05);
    setApiError(null);
    setIsSearching(true);
    setTimeout(() => {
      const results = performSearch(debouncedQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 450);
  };

  const handleSelectCase = (c) => {
    if (checkIsCaseRestricted(c, session)) {
      playAlertSound(300, 0.15);
      return;
    }
    playAlertSound(600, 0.05);
    setShowDropdown(false);
    setSearchQuery('');
    navigate(isCaseOverviewRoute ? `/case-overview/${c.CaseMasterID}` : `/cases/${c.CaseMasterID}`);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setShowDropdown(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
        handleSelectCase(searchResults[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      searchInputRef.current?.blur();
    }
  };

  // Resolve active locality
  const locality = useMemo(() => {
    if (!activeCase) return '';
    return getLocality(activeCase) || activeCase.policeStationName;
  }, [activeCase]);

  // Mock Evidence snapshot categories
  const evidenceSnapshot = useMemo(() => {
    if (!activeCase) return null;
    return {
      photos: activeCase.isHeinous ? 5 : 2,
      videos: activeCase.isHeinous ? 2 : 1,
      audio: activeCase.isHeinous ? 1 : 0,
      documents: activeCase.isHeinous ? 4 : 2,
      forensics: activeCase.isHeinous ? 3 : 1
    };
  }, [activeCase]);

  // Mock Timeline events
  const timelinePreview = useMemo(() => {
    if (!activeCase) return [];
    const dateStr = activeCase.registeredDateObj ? activeCase.registeredDateObj.toISOString().split('T')[0] : '2026-07-10';
    return [
      { date: dateStr, desc: 'FIR registered at police station', icon: <MdCheckCircle style={{ color: 'var(--accent-success)' }} /> },
      { date: dateStr, desc: 'Investigating Officer assigned', icon: <MdPerson style={{ color: 'var(--accent-primary)' }} /> },
      { date: dateStr, desc: 'Crime scene mapped & inspected', icon: <MdLocationOn style={{ color: 'var(--accent-warning)' }} /> },
      { date: dateStr, desc: 'Evidence cataloged in digital locker', icon: <MdInsertDriveFile style={{ color: 'var(--accent-secondary)' }} /> }
    ];
  }, [activeCase]);

  // Milestone Progression calculations
  const milestones = useMemo(() => {
    if (!activeCase) return [];
    
    const activeStatus = caseStatuses[activeCase.CaseMasterID] || activeCase.statusName || 'Under Investigation';
    
    const steps = [
      { label: 'FIR Filed', completed: true, date: activeCase.CrimeRegisteredDate?.split(' ')[0] || 'N/A' },
      { label: 'Investigation Opened', completed: true, date: activeCase.registeredDateObj ? new Date(activeCase.registeredDateObj.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 'N/A' },
      { label: 'Arrest Made', completed: activeCase.arrests?.length > 0 || activeStatus === 'Convicted' || activeStatus === 'Closed' || activeStatus === 'Pending Trial', date: activeCase.arrests?.length > 0 ? activeCase.arrests[0].ArrestDate?.split(' ')[0] : 'Pending' },
      { label: 'Chargesheet Filed', completed: activeCase.chargesheets?.length > 0 || activeStatus === 'Charge Sheeted' || activeStatus === 'Convicted' || activeStatus === 'Closed' || activeStatus === 'Pending Trial', date: activeCase.chargesheets?.length > 0 ? activeCase.chargesheets[0].ChargeSheetDate?.split(' ')[0] : 'Pending' },
      { label: 'Closure / Verdict', completed: activeStatus === 'Closed' || activeStatus === 'Convicted' || activeStatus === 'Acquitted', date: activeStatus === 'Closed' || activeStatus === 'Convicted' || activeStatus === 'Acquitted' ? 'Concluded' : 'Pending' }
    ];
    return steps;
  }, [activeCase, caseStatuses]);

  // Active case suspect dossiers mapping
  const suspectsList = useMemo(() => {
    if (!activeCase) return [];
    if (activeCase.accused && activeCase.accused.length > 0) {
      return activeCase.accused.map((a, idx) => ({
        id: a.AccusedMasterID || `s_${idx + 1}`,
        name: a.AccusedName || `Suspect ACC-${idx + 101}`,
        age: a.AgeYear || 32,
        gender: a.GenderID || 'M',
        role: idx === 0 ? 'Primary Suspect' : 'Associate'
      }));
    }
    return [
      { id: 's_101', name: 'ACCUSED-101', age: 34, gender: 'M', role: 'Primary Suspect' }
    ];
  }, [activeCase]);

  // Compute case overlaps with forensic accuracy (score >= 60)
  const hiddenAssociations = useMemo(() => {
    if (!activeCase) return [];
    return findSimilarCases(activeCase, secureCases, { maxResults: 4, minScore: 60 });
  }, [activeCase, secureCases]);

  // Action bars permissions checks
  const canUpdateStatus = useMemo(() => {
    if (session.accessLevel !== 'command') return false;
    if (session.role === 'State DGP Command' || session.unitName === 'State Control Room') return true;
    return activeCase && String(session.unitName).toLowerCase() === String(activeCase.policeStationName).toLowerCase();
  }, [session, activeCase]);

  const canAddEvidence = useMemo(() => {
    if (session.accessLevel !== 'command') return false;
    if (session.role === 'State DGP Command' || session.unitName === 'State Control Room') return true;
    return activeCase && String(session.unitName).toLowerCase() === String(activeCase.policeStationName).toLowerCase();
  }, [session, activeCase]);

  const handleUpdateStatusSubmit = () => {
    playAlertSound(600, 0.05);
    setCaseStatuses(prev => ({
      ...prev,
      [activeCase.CaseMasterID]: tempStatus
    }));
    setShowStatusModal(false);
  };

  const handleShareCase = () => {
    playAlertSound(800, 0.05);
    const link = `${window.location.origin}/app/cases/${activeCase.CaseMasterID}`;
    navigator.clipboard.writeText(link).then(() => {
      alert(`Case reference link copied to clipboard:\n${link}`);
    });
  };

  return (
    <div className="page-content case-overview-page text-inverse">
      <style>{`
        /* Global typography & structure layout matching Command Center */
        .case-overview-page {
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
        }
        .case-overview-page input,
        .case-overview-page button,
        .case-overview-page select,
        .case-overview-page strong,
        .case-overview-page span,
        .case-overview-page div {
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
        }
        .search-container-sticky {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: var(--bg-app);
          padding: 12px 24px;
          margin: -24px -24px 20px -24px;
          border-bottom: 1px solid var(--border-color);
        }
        .search-container-normal {
          padding: 12px 0;
          margin-bottom: 20px;
        }
        .suggestions-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--bg-panel);
          border: 1px solid var(--border-strong);
          z-index: 1010;
          max-height: 400px;
          overflow-y: auto;
          margin-top: 4px;
          border-radius: 0px !important;
        }
        .suggestion-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          transition: background var(--transition);
        }
        .suggestion-row:hover, .suggestion-row.highlighted {
          background: var(--bg-panel-alt);
        }
        .suggestion-row.restricted {
          opacity: 0.6;
          cursor: not-allowed;
          background: rgba(0,0,0,0.03);
        }
        .suggestion-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        
        /* Badges: round pills are allowed for active accent details */
        .status-badge {
          padding: 2px 8px;
          border-radius: 99px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-badge.under-investigation { background: rgba(255, 140, 0, 0.15); color: var(--accent-warning); }
        .status-badge.charge-sheeted { background: rgba(0, 91, 150, 0.15); color: var(--accent-primary); }
        .status-badge.closed { background: rgba(0, 128, 0, 0.15); color: var(--accent-success); }
        .status-badge.convicted { background: rgba(0, 128, 0, 0.25); color: var(--accent-success); }
        .status-badge.acquitted { background: rgba(112, 130, 154, 0.2); color: var(--text-secondary); }
        
        /* Recent chips: pill shape accents */
        .recent-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: 99px;
          cursor: pointer;
          font-size: 12px;
          color: var(--text-secondary);
          transition: all var(--transition);
        }
        .recent-chip:hover {
          border-color: var(--accent-primary);
          color: var(--text-primary);
          background: var(--bg-panel-alt);
        }

        /* Command Center visual style: Flat panels with hairline dividers */
        .flat-section {
          background: var(--bg-panel) !important;
          border: 1px solid var(--border-color) !important;
          border-bottom: 1px solid var(--border-color) !important;
          padding: 20px !important;
          border-radius: 12px !important;
          box-shadow: var(--shadow-card) !important;
          margin-bottom: 18px !important;
        }
        .section-label {
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.15em !important;
          color: var(--text-muted) !important;
          font-weight: 700 !important;
          display: block !important;
          margin-bottom: 16px !important;
        }

        /* Stepper Progression Strip */
        .milestone-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px !important;
          background: var(--bg-panel) !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 12px !important;
          box-shadow: var(--shadow-card) !important;
          margin-bottom: 24px !important;
          overflow-x: auto;
        }
        .milestone-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          flex: 1;
          position: relative;
          min-width: 120px;
        }
        .milestone-item:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 14px;
          left: 50%;
          width: 100%;
          height: 2px;
          background: var(--border-color);
          z-index: 1;
        }
        .milestone-item.completed:not(:last-child)::after {
          background: var(--accent-success);
        }
        .milestone-dot {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--bg-panel-alt);
          border: 2px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          font-size: 14px;
          color: var(--text-muted);
          transition: all var(--transition);
        }
        .milestone-item.completed .milestone-dot {
          background: var(--accent-success);
          border-color: var(--accent-success);
          color: #fff;
        }
        .milestone-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-top: 8px;
        }
        .milestone-date {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* Stat tiles grid inside Evidence Snapshot */
        .evidence-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border: 1px solid var(--border-color);
          background: transparent;
          border-radius: 0px !important;
          margin-bottom: 14px;
        }
        .evidence-tile {
          padding: 16px 12px;
          text-align: center;
          background: transparent;
          border-radius: 0px !important;
        }
        .evidence-tile:not(:last-child) {
          border-right: 1px solid var(--border-color);
        }
        .evidence-tile-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          display: block;
        }
        .evidence-tile-val {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          display: block;
          margin-top: 4px;
        }

        /* Maps panel sits flush */
        .map-panel {
          border: 1px solid var(--border-color) !important;
          border-radius: 0px !important;
          overflow: hidden !important;
        }

        .case-action-card-highlight {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #002147;
          color: #ffffff !important;
          border: 1px solid rgba(218, 165, 32, 0.4);
          border-left: 4px solid #DAA520;
          border-radius: 6px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 33, 71, 0.25);
          transition: all 0.2s ease;
          margin-top: 10px;
        }
        .case-action-card-highlight:hover {
          background: #001733;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0, 33, 71, 0.35);
          border-left-color: #ffd700;
        }
        .case-action-card-highlight-timeline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #002147;
          color: #ffffff !important;
          border: 1px solid rgba(56, 189, 248, 0.4);
          border-left: 4px solid #38bdf8;
          border-radius: 6px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 33, 71, 0.25);
          transition: all 0.2s ease;
          margin-top: 10px;
        }
        .case-action-card-highlight-timeline:hover {
          background: #001733;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0, 33, 71, 0.35);
          border-left-color: #7dd3fc;
        }

        .case-content-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 40px; margin-bottom: 20px; }
        .case-subject-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 900px) {
          .search-container-sticky { padding: 10px 16px; margin: -20px -16px 16px; }
          .case-content-grid, .case-subject-grid { grid-template-columns: 1fr !important; gap: 20px; }
          .milestone-strip { justify-content: flex-start; padding-inline: 8px !important; }
          .evidence-grid { grid-template-columns: 1fr !important; }
          .evidence-tile { border-right: none !important; border-bottom: 1px solid var(--border-color); }
          .evidence-tile:last-child { border-bottom: none; }
        }
        @media (max-width: 560px) {
          .suggestion-row { align-items: flex-start; flex-direction: column; gap: 6px; }
          .milestone-item { min-width: 104px; }
          .flat-section { padding-block: 16px !important; }
        }

        .skeleton-row {
          height: 50px;
          background: linear-gradient(90deg, var(--bg-panel-alt) 25%, var(--bg-panel) 50%, var(--bg-panel-alt) 75%);
          background-size: 200% 100%;
          animation: loading-pulse 1.5s infinite;
          border-radius: 0px !important;
          margin-bottom: 8px;
        }
        @keyframes loading-pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        .action-bar-persistent {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding: 24px 0px 0px 0px !important;
          background: var(--bg-app) !important;
          border-top: 1px solid var(--border-color) !important;
          margin-top: 24px;
        }
      `}</style>

      {/* HEADER SECTION */}
      <div className={activeCase ? "search-container-sticky" : "search-container-normal"}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* SEARCH COMPONENT */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative' }}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by Case ID, FIR No., or Suspect/Victim Name"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowDropdown(true)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 42px',
                  borderRadius: '0px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px',
                  boxShadow: 'none'
                }}
              />
              <MdSearch size={20} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
            </div>

            {/* SUGGESTIONS DROPDOWN */}
            {showDropdown && searchQuery.trim().length >= 2 && (
              <div ref={dropdownRef} className="suggestions-dropdown">
                {isSearching ? (
                  <div style={{ padding: '16px' }}>
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                  </div>
                ) : apiError ? (
                  <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--accent-danger)', fontSize: '13px' }}>
                    <span>⚠️ {apiError}.</span>
                    <button
                      onClick={triggerRetry}
                      style={{
                        padding: '4px 10px',
                        background: 'var(--accent-danger)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        minHeight: '28px',
                        minWidth: 'auto'
                      }}
                    >
                      <MdRefresh size={14} /> Retry
                    </button>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No case found for '<strong>{searchQuery}</strong>'. Check the Case ID/FIR number, or try a name search.
                  </div>
                ) : (
                  <div>
                    {searchResults.slice(0, 8).map((c, idx) => {
                      const isRestricted = checkIsCaseRestricted(c, session);
                      const isHighlighted = idx === highlightedIndex;
                      
                      return (
                        <div
                          key={c.CaseMasterID}
                          className={`suggestion-row ${isRestricted ? 'restricted' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                          onClick={() => !isRestricted && handleSelectCase(c)}
                        >
                          <div>
                            <strong style={{ fontSize: '14px', color: isRestricted ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                              {isRestricted ? "Access restricted — contact SP/SCRB" : `${c.displayCrimeNo || `FIR-${c.CaseMasterID}`} : ${c.minorHeadName || c.majorHeadName}`}
                            </strong>
                            <div className="suggestion-meta">
                              <span>📍 {c.policeStationName}</span>
                              <span>•</span>
                              <span>Filed: {c.registeredDateObj ? c.registeredDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isRestricted ? (
                              <MdLock size={16} style={{ color: 'var(--accent-danger)' }} />
                            ) : (
                              <>
                                <span className={`status-badge ${String(caseStatuses[c.CaseMasterID] || c.statusName).toLowerCase().replace(/ /g, '-')}`}>
                                  {caseStatuses[c.CaseMasterID] || c.statusName}
                                </span>
                                <span className="badge" style={{
                                  background: c.isHeinous ? 'rgba(200, 0, 0, 0.1)' : 'rgba(255, 140, 0, 0.1)',
                                  color: c.isHeinous ? 'var(--accent-danger)' : 'var(--accent-warning)',
                                  fontSize: '9px',
                                  padding: '2px 6px',
                                  textTransform: 'uppercase',
                                  fontWeight: '600',
                                  borderRadius: '99px'
                                }}>
                                  {c.isHeinous ? 'High' : 'Standard'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {searchResults.length > 8 && (
                      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-panel-alt)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                        Refine your search — showing 8 of {searchResults.length} matches.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACTIVE CASE COMPACT CHANGE BUTTON */}
          {activeCase && (
            <button
              onClick={() => {
                playAlertSound(600, 0.05);
                navigate('/cases');
              }}
              style={{
                padding: '0 16px',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-strong)',
                borderRadius: '0px',
                color: 'var(--accent-primary)',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                minHeight: '42px',
                minWidth: 'auto'
              }}
            >
              <MdArrowBack size={16} /> Change Case
            </button>
          )}

        </div>
      </div>

      {/* BEFORE A CASE IS SELECTED (PRE-SELECTION STATE) */}
      {!activeCase && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center', justifyContent: 'center', minHeight: '400px', textAlign: 'center', padding: '40px 20px' }}>
          
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '0px',
            background: 'var(--bg-panel-alt)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)',
            boxShadow: 'none'
          }}>
            <MdFolder size={40} />
          </div>

          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Operational Investigation Directories</h3>
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Enter a Case ID, CCTNS FIR Number, or Suspect/Victim name above to open files.
            </p>
          </div>

          {/* RECENT CASES QUICK CHIPS */}
          {recentCasesList.length > 0 && (
            <div style={{ width: '100%', maxWidth: '600px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', display: 'block', marginBottom: '12px' }}>
                RECENTLY ACCESSED DOSSIERS
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                {recentCasesList.map(rc => (
                  <div key={rc.CaseMasterID} className="recent-chip" onClick={() => handleSelectCase(rc)}>
                    <MdHistory size={14} style={{ color: 'var(--accent-primary)' }} />
                    <strong>{rc.displayCrimeNo}</strong>
                    <span style={{ opacity: 0.7 }}>({rc.minorHeadName})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* LOADER CASE DETAILS VIEW */}
      {activeCase && (
        <div>
          {isRestrictedDirect ? (
            /* ACCESS RESTRICTED SCREEN (IF LOADED FROM SHAREABLE ROUTE DIRECTLY) */
            <div className="flat-section" style={{ padding: '40px 0px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '20px', minHeight: '360px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(200,0,0,0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', color: 'var(--accent-danger)', justifyContent: 'center' }}>
                <MdLock size={32} />
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Access Restricted — contact SP/SCRB</h3>
              <p style={{ margin: 0, maxWidth: '460px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                You do not hold permissions to view details of Case Master ID: <strong>{activeCase.CaseMasterID}</strong>. Secure sessions are gated based on operational district and precinct rules.
              </p>
              <button
                onClick={() => navigate('/cases')}
                className="session-btn"
                style={{
                  minHeight: '36px',
                  padding: '0 16px',
                  fontSize: '13px',
                  background: 'var(--bg-panel-alt)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  borderRadius: '0px'
                }}
              >
                Back to Case Directories
              </button>
            </div>
          ) : (
            /* NORMAL LOADED CASE LAYOUT */
            <div>
              {/* CASE HEADER */}
              <div className="flat-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="badge" style={{
                        background: activeCase.isHeinous ? 'var(--accent-danger)' : 'var(--accent-warning)',
                        color: '#fff',
                        fontSize: '9px',
                        padding: '2px 8px',
                        textTransform: 'uppercase',
                        fontWeight: '700',
                        borderRadius: '99px'
                      }}>
                        {activeCase.isHeinous ? 'Heinous Offence' : 'Standard Case'}
                      </span>
                      <span className={`status-badge ${String(caseStatuses[activeCase.CaseMasterID] || activeCase.statusName).toLowerCase().replace(/ /g, '-')}`}>
                        {caseStatuses[activeCase.CaseMasterID] || activeCase.statusName}
                      </span>
                    </div>

                    <h2 style={{ margin: '8px 0 0', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {activeCase.displayCrimeNo || `FIR-${activeCase.CaseMasterID}`} : {activeCase.minorHeadName || activeCase.majorHeadName}
                    </h2>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      <span>🗓️ Registered: <strong>{activeCase.CrimeRegisteredDate}</strong></span>
                      <span>📍 Station: <strong>{activeCase.policeStationName} ({activeCase.districtName})</strong></span>
                      <span>⚖️ Section: <strong>{activeCase.actSections && activeCase.actSections.length > 0 ? activeCase.actSections.map(as => `${as.ActID} Sec ${as.SectionID}`).join(', ') : 'N/A'}</strong></span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>INVESTIGATING OFFICER</span>
                    <strong style={{ fontSize: '15px', color: 'var(--accent-primary)', display: 'block', marginTop: '4px' }}>
                          {activeCase.displayOfficerName || activeCase.officerName}
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>KGID: {activeCase.officerKGID || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              {/* PROGRESS STATUS & MILESTONE STRIP */}
              <div className="milestone-strip">
                {milestones.map((ms, idx) => (
                  <div key={idx} className={`milestone-item ${ms.completed ? 'completed' : ''}`}>
                    <div className="milestone-dot">
                      {ms.completed ? '✓' : idx + 1}
                    </div>
                    <span className="milestone-label">{ms.label}</span>
                    <span className="milestone-date">{ms.date}</span>
                  </div>
                ))}
              </div>

              {/* TWO-COLUMN LAYOUT */}
              <div className="case-content-grid">
                
                {/* LEFT COLUMN: DETAIL PANELS */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  
                  {/* ASSIGNMENTS PANEL */}
                  <div className="flat-section" style={{ paddingTop: '0px' }}>
                    <span className="section-label">Investigation Team & Deadlines</span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '0px', background: 'var(--bg-panel-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--accent-primary)', border: '1px solid var(--border-color)' }}>
                          {activeCase.officerName ? activeCase.officerName.charAt(0) : 'I'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>{activeCase.displayOfficerName || activeCase.officerName}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Lead Investigating Officer (Lead IO)</span>
                        </div>
                        <span className="badge" style={{ background: 'rgba(0, 91, 150, 0.1)', color: 'var(--accent-primary)', fontSize: '10px', padding: '2px 8px', borderRadius: '99px' }}>Assignee</span>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '0px', background: 'var(--bg-panel-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                          S
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>Inspector Suresh Nayak</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Supporting Officer · {activeCase.policeStationName}</span>
                        </div>
                        <span className="badge" style={{ background: 'rgba(0, 0, 0, 0.05)', color: 'var(--text-secondary)', fontSize: '10px', padding: '2px 8px', borderRadius: '99px' }}>Support</span>
                      </div>

                      <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Chargesheet due date (90d standard):</span>
                        <strong style={{ color: activeCase.isHeinous ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                          {activeCase.registeredDateObj ? new Date(activeCase.registeredDateObj.getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN') : 'N/A'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* VICTIM / SUSPECT SUMMARY */}
                  <div className="flat-section">
                    <span className="section-label">Subjects Involved ({victims.filter(v => v.CaseMasterID === activeCase.CaseMasterID).length} Victims, {suspectsList.length} Suspects)</span>

                    <div className="case-subject-grid">
                      {/* Suspects column */}
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Suspect Dossiers</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {suspectsList.map(s => (
                            <div
                              key={s.id}
                              onClick={() => {
                                playAlertSound(600, 0.05);
                                navigate(`/suspect-timeline/${activeCase.CaseMasterID}?suspectId=${s.id}`);
                              }}
                              style={{
                                padding: '8px 10px',
                                background: 'var(--bg-panel-alt)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'border var(--transition)'
                              }}
                              title="Click to view Suspect Timeline"
                            >
                              <div>
                                <strong style={{ fontSize: '12px', display: 'block', color: 'var(--text-primary)' }}>{s.name}</strong>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{s.gender === 'F' ? 'Female' : 'Male'} · Age {s.age}</span>
                              </div>
                              <MdChevronRight size={16} style={{ color: 'var(--accent-primary)' }} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Victims column */}
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Victim Details</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {victims.filter(v => v.CaseMasterID === activeCase.CaseMasterID).slice(0, 3).map((v, idx) => (
                            <div key={v.VictimID || idx} style={{ padding: '8px 10px', background: 'var(--bg-panel-alt)', border: '1px solid var(--border-color)', borderRadius: '0px' }}>
                              <strong style={{ fontSize: '12px', display: 'block', color: 'var(--text-primary)' }}>
                                {session.accessLevel === 'command' ? v.VictimName : 'Protected Victim'}
                              </strong>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{v.GenderID === 'F' ? 'Female' : 'Male'} · Age {v.AgeYear || 'N/A'}</span>
                            </div>
                          ))}
                          {victims.filter(v => v.CaseMasterID === activeCase.CaseMasterID).length === 0 && (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No victims cataloged.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LINKED CASES */}
                  <div className="flat-section">
                    <span className="section-label">AI Pattern Linkages ({hiddenAssociations.length} Matches)</span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {hiddenAssociations.map((assoc, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            playAlertSound(600, 0.05);
                            navigate(isCaseOverviewRoute ? `/case-overview/${assoc.caseId}` : `/cases/${assoc.caseId}`);
                          }}
                          style={{
                            padding: '10px 14px',
                            background: 'var(--bg-panel-alt)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{assoc.crimeNo}</strong>
                              <span className="badge" style={{ background: 'rgba(155, 93, 229, 0.1)', color: '#9b5de5', fontSize: '9px', padding: '1px 6px', borderRadius: '99px' }}>
                                {assoc.type}
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>{assoc.reason}</span>
                          </div>
                          <MdChevronRight size={18} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                      ))}
                      {hiddenAssociations.length === 0 && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No linked patterns or shared attributes detected.</span>
                      )}
                    </div>
                  </div>

                  {/* DOCUMENTS & NOTES */}
                  <div className="flat-section" style={{ borderBottom: 'none' }}>
                    <span className="section-label">Narrative & Investigator Notes</span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      
                      {/* Case Narrative */}
                      <div style={{ background: 'var(--bg-panel-alt)', padding: '12px 16px', borderRadius: '0px', borderLeft: '4px solid var(--accent-primary)' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Primary Case Facts</span>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          {session.accessLevel === 'command' ? (activeCase.briefFacts || activeCase.BriefFacts || 'No brief facts registered.') : 'Narrative restricted. Open a secure police session to view operational case facts.'}
                        </p>
                      </div>

                      {/* Notes list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ borderBottom: '1px dashed var(--border-color)', paddingBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                            <strong>IO {activeCase.displayOfficerName || activeCase.officerName}</strong>
                            <span>24h after filing</span>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Crime scene inspected. Witness depositions and sketches compiled. Digital assets registered in vault.</span>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                            <strong>Forensics Unit-12</strong>
                            <span>48h after filing</span>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Lifted latent prints mapped to primary databases. Bounding box coordinates submitted for network matching.</span>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

                {/* RIGHT COLUMN: VISUAL PANELS */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  
                  {/* GEOSPATIAL MINI-MAP */}
                  <div className="flat-section" style={{ paddingTop: '0px' }}>
                    <span className="section-label" style={{ marginBottom: '4px' }}>Geospatial Incident Scene</span>
                    
                    {/* Locality breadcrumb */}
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      District: <strong style={{ color: 'var(--text-primary)' }}>{activeCase.districtName}</strong> → Locality: <strong style={{ color: 'var(--accent-primary)' }}>{locality}</strong>
                    </div>

                    <div className="map-panel" style={{ height: '240px', width: '100%', position: 'relative', background: '#09121d' }}>
                      {activeCase.latitude && activeCase.longitude ? (
                        <MapContainer
                          key={activeCase.CaseMasterID}
                          center={[activeCase.latitude, activeCase.longitude]}
                          zoom={13}
                          style={{ height: '100%', width: '100%' }}
                          zoomControl={false}
                          attributionControl={false}
                        >
                          <ThemeAwareTileLayer />
                          <CircleMarker
                            center={[activeCase.latitude, activeCase.longitude]}
                            radius={8}
                            fillColor={activeCase.isHeinous ? 'var(--accent-danger)' : 'var(--accent-warning)'}
                            color="#fff"
                            weight={2}
                            opacity={1}
                            fillOpacity={0.8}
                          >
                            <Tooltip permanent direction="top" offset={[0, -8]}>
                              <strong>Locality: {locality}</strong><br/>
                              {activeCase.minorHeadName || activeCase.majorHeadName}
                            </Tooltip>
                          </CircleMarker>
                        </MapContainer>
                      ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
                          ⚠️ Geographic coordinates unavailable for this case.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* EVIDENCE SNAPSHOT */}
                  <div className="flat-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span className="section-label" style={{ margin: 0 }}>Evidence Assets</span>
                      <span className="badge badge-ai" style={{ fontSize: '10px', borderRadius: '99px', padding: '2px 8px' }}>Secure Locker</span>
                    </div>

                    {/* Stat tiles in a flat grid with hairline separators */}
                    <div className="evidence-grid">
                      <div className="evidence-tile">
                        <span className="evidence-tile-label">Photos</span>
                        <strong className="evidence-tile-val">{evidenceSnapshot?.photos}</strong>
                      </div>
                      <div className="evidence-tile">
                        <span className="evidence-tile-label">Videos</span>
                        <strong className="evidence-tile-val">{evidenceSnapshot?.videos}</strong>
                      </div>
                      <div className="evidence-tile">
                        <span className="evidence-tile-label">Docs</span>
                        <strong className="evidence-tile-val">{evidenceSnapshot?.documents}</strong>
                      </div>
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        playAlertSound(600, 0.05);
                        navigate(isCaseOverviewRoute ? `/evidence-workspace/${activeCase.CaseMasterID}` : `/evidence/${activeCase.CaseMasterID}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          playAlertSound(600, 0.05);
                          navigate(isCaseOverviewRoute ? `/evidence-workspace/${activeCase.CaseMasterID}` : `/evidence/${activeCase.CaseMasterID}`);
                        }
                      }}
                      className="case-action-card-highlight"
                      title="Open full Evidence Locker and forensic repository"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '4px',
                          background: 'rgba(218, 165, 32, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#DAA520',
                          flexShrink: 0
                        }}>
                          <MdInsertDriveFile size={20} />
                        </div>
                        <div>
                          <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em' }}>
                            OPEN EVIDENCE WORKSPACE
                          </div>
                          <div style={{ color: '#cbd5e1', fontSize: '10.5px', marginTop: '1px' }}>
                            Digital custody, CCTV footage, CDRs & forensic reports
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DAA520', fontWeight: 700, fontSize: '12px' }}>
                        <span>LAUNCH</span>
                        <MdLaunch size={16} />
                      </div>
                    </div>
                  </div>

                  {/* TIMELINE PREVIEW */}
                  <div className="flat-section" style={{ borderBottom: 'none' }}>
                    <span className="section-label">Timeline Milestones</span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '11px', top: '10px', bottom: '10px', width: '2px', background: 'var(--border-color)' }} />
                      {timelinePreview.map((ev, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-panel)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, flexShrink: 0 }}>
                            {ev.icon}
                          </div>
                          <div>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ev.date}</span>
                            <span style={{ fontSize: '12px', display: 'block', color: 'var(--text-secondary)', fontWeight: '600' }}>{ev.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        playAlertSound(600, 0.05);
                        navigate(`/suspect-timeline/${activeCase.CaseMasterID}?suspectId=${suspectsList[0]?.id || ''}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          playAlertSound(600, 0.05);
                          navigate(`/suspect-timeline/${activeCase.CaseMasterID}?suspectId=${suspectsList[0]?.id || ''}`);
                        }
                      }}
                      className="case-action-card-highlight-timeline"
                      title="Open complete Suspect Timeline tracking"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '4px',
                          background: 'rgba(56, 189, 248, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#38bdf8',
                          flexShrink: 0
                        }}>
                          <MdHistory size={20} />
                        </div>
                        <div>
                          <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em' }}>
                            OPEN SUSPECT TIMELINE
                          </div>
                          <div style={{ color: '#cbd5e1', fontSize: '10.5px', marginTop: '1px' }}>
                            Spatiotemporal movement trail, geofence pings & alibis
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontWeight: 700, fontSize: '12px' }}>
                        <span>LAUNCH</span>
                        <MdLaunch size={16} />
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* PERSISTENT BOTTOM ACTION BAR */}
              <div className="action-bar-persistent">
                <button
                  disabled={!canUpdateStatus}
                  onClick={() => {
                    playAlertSound(600, 0.05);
                    setShowStatusModal(true);
                  }}
                  className="session-btn"
                  style={{
                    padding: '0 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-strong)',
                    color: canUpdateStatus ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: canUpdateStatus ? 'pointer' : 'not-allowed',
                    opacity: canUpdateStatus ? 1 : 0.5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    minHeight: '40px',
                    minWidth: 'auto',
                    borderRadius: '0px'
                  }}
                  title={canUpdateStatus ? "Update case status" : "Unauthorized to update case status"}
                >
                  <MdHistory size={16} /> Update Status
                </button>

                <button
                  disabled={!canAddEvidence}
                  onClick={() => {
                    playAlertSound(600, 0.05);
                    navigate(isCaseOverviewRoute ? `/evidence-workspace/${activeCase.CaseMasterID}` : `/evidence/${activeCase.CaseMasterID}`);
                  }}
                  className="session-btn"
                  style={{
                    padding: '0 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-strong)',
                    color: canAddEvidence ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: canAddEvidence ? 'pointer' : 'not-allowed',
                    opacity: canAddEvidence ? 1 : 0.5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    minHeight: '40px',
                    minWidth: 'auto',
                    borderRadius: '0px'
                  }}
                  title={canAddEvidence ? "Add evidence to workspace" : "Unauthorized to add evidence"}
                >
                  <MdCloudUpload size={16} /> Add Evidence
                </button>

                <button
                  onClick={handleShareCase}
                  className="session-btn"
                  style={{
                    padding: '0 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    minHeight: '40px',
                    minWidth: 'auto',
                    borderRadius: '0px'
                  }}
                >
                  <MdShare size={16} /> Share Case
                </button>

                <button
                  onClick={() => {
                    playAlertSound(600, 0.05);
                    navigate('/briefing');
                  }}
                  className="session-btn primary"
                  style={{
                    padding: '0 16px',
                    fontSize: '13px',
                    fontWeight: '700',
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    minHeight: '40px',
                    minWidth: 'auto',
                    borderRadius: '0px'
                  }}
                >
                  <MdAssignment size={16} /> Generate Briefing
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      {/* STATUS MODAL DIALOG */}
      {showStatusModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="card" style={{ width: '320px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '0px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Update Case Status</h3>
            
            <select
              value={tempStatus}
              onChange={e => setTempStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '0px',
                background: 'var(--bg-panel-alt)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-strong)',
                minHeight: '40px'
              }}
            >
              <option value="Under Investigation">Under Investigation</option>
              <option value="Charge Sheeted">Charge Sheeted</option>
              <option value="Pending Trial">Pending Trial</option>
              <option value="Closed">Closed</option>
              <option value="Convicted">Convicted</option>
              <option value="Acquitted">Acquitted</option>
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowStatusModal(false)}
                className="session-btn"
                style={{ minHeight: '36px', minWidth: 'auto', padding: '0 12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '0px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatusSubmit}
                className="session-btn primary"
                style={{ minHeight: '36px', minWidth: 'auto', padding: '0 12px', background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '0px' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default CaseOverview;
